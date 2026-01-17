


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'super_admin',
    'organization',
    'participant'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."notification_status" AS ENUM (
    'pending',
    'sent',
    'error'
);


ALTER TYPE "public"."notification_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_owner_invitation"("_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_email text;
  invitation_record RECORD;
  result jsonb;
BEGIN
  -- Require authentication
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Get caller's email from auth.users (using JWT claims)
  SELECT email INTO caller_email FROM auth.users WHERE id = caller_id;
  
  IF caller_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Could not retrieve user email');
  END IF;
  
  -- Find a pending owner invitation for this org and email
  SELECT id, organization_id, role, custom_role_title
  INTO invitation_record
  FROM public.organization_invitations
  WHERE organization_id = _org_id
    AND LOWER(email) = LOWER(caller_email)
    AND invitation_type = 'owner'
    AND status = 'pending'
  LIMIT 1;
  
  IF invitation_record.id IS NULL THEN
    -- Check if user is already a member (maybe they already accepted)
    IF EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = _org_id AND user_id = caller_id
    ) THEN
      RETURN jsonb_build_object('success', true, 'message', 'Already a member of this organization');
    END IF;
    
    RETURN jsonb_build_object('success', false, 'error', 'No valid owner invitation found for this organization');
  END IF;
  
  -- Create the organization membership with owner/admin privileges
  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    custom_role_title,
    is_owner
  ) VALUES (
    _org_id,
    caller_id,
    'admin',
    invitation_record.custom_role_title,
    true
  )
  ON CONFLICT (organization_id, user_id) 
  DO UPDATE SET 
    role = 'admin',
    is_owner = true;
  
  -- Update invitation status to accepted
  UPDATE public.organization_invitations
  SET status = 'accepted', responded_at = now()
  WHERE id = invitation_record.id;
  
  -- Also add organization role to user_roles if not present
  INSERT INTO public.user_roles (user_id, role)
  VALUES (caller_id, 'organization')
  ON CONFLICT DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Owner invitation accepted successfully',
    'organization_id', _org_id
  );
END;
$$;


ALTER FUNCTION "public"."accept_owner_invitation"("_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_id_by_email"("_email" "text") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT id FROM public.profiles WHERE email = _email LIMIT 1
$$;


ALTER FUNCTION "public"."get_user_id_by_email"("_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_id_by_email"("_email" "text", "_org_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  caller_id uuid := auth.uid();
  is_admin boolean := false;
  is_leader boolean := false;
BEGIN
  -- Require authentication
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- If org_id is provided, verify the caller has appropriate permissions
  IF _org_id IS NOT NULL THEN
    -- Check if caller is an admin of that organization
    is_admin := is_organization_admin(caller_id, _org_id);
    
    -- Check if caller is a team leader in that organization
    IF NOT is_admin THEN
      SELECT EXISTS (
        SELECT 1 FROM public.team_members tm
        JOIN public.teams t ON tm.team_id = t.id
        WHERE tm.user_id = caller_id 
          AND tm.is_leader = true
          AND t.organization_id = _org_id
      ) INTO is_leader;
    END IF;
    
    IF NOT is_admin AND NOT is_leader THEN
      RAISE EXCEPTION 'Unauthorized: must be organization admin or team leader';
    END IF;
  ELSE
    -- If no org_id provided, verify caller is admin of at least one organization
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = caller_id AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Unauthorized: must be organization admin';
    END IF;
  END IF;
  
  -- Return user ID if email exists
  RETURN (SELECT id FROM public.profiles WHERE email = _email LIMIT 1);
END;
$$;


ALTER FUNCTION "public"."get_user_id_by_email"("_email" "text", "_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_team_in_org"("_user_id" "uuid", "_org_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT tm.team_id
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.user_id = _user_id
    AND t.organization_id = _org_id
  LIMIT 1
$$;


ALTER FUNCTION "public"."get_user_team_in_org"("_user_id" "uuid", "_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  full_name_value TEXT;
  first_name_value TEXT;
  last_name_value TEXT;
  avatar_value TEXT;
BEGIN
  -- Récupérer le nom complet (Google: full_name ou name)
  full_name_value := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name'
  );
  
  -- Parser le prénom et nom depuis le full_name
  IF full_name_value IS NOT NULL AND full_name_value != '' THEN
    first_name_value := split_part(full_name_value, ' ', 1);
    last_name_value := NULLIF(
      trim(substring(full_name_value from position(' ' in full_name_value) + 1)),
      ''
    );
  END IF;
  
  -- Récupérer l'avatar (Google: avatar_url ou picture)
  avatar_value := COALESCE(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );
  
  -- Créer le profil avec les données extraites (avec ON CONFLICT pour éviter les doublons)
  INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url, onboarding_completed)
  VALUES (
    new.id,
    new.email,
    first_name_value,
    last_name_value,
    avatar_value,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);
  
  -- Créer les préférences utilisateur par défaut (avec ON CONFLICT)
  INSERT INTO public.user_preferences (user_id, language, email_opt_in, sms_opt_in, geolocation_enabled)
  VALUES (new.id, 'fr', true, false, false)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the user creation
  RAISE WARNING 'handle_new_user failed for user %: %', new.id, SQLERRM;
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_pending_invitation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Find any pending invitations for this user's email
  -- EXCLUDE 'owner' type - those are handled by accept_owner_invitation RPC
  FOR invitation_record IN 
    SELECT id, organization_id, status, role, custom_role_title, team_id, invitation_type
    FROM public.organization_invitations 
    WHERE email = NEW.email 
      AND status = 'pending'
      AND invitation_type != 'owner'
  LOOP
    -- Only add to organization_members if it's a member invitation
    IF invitation_record.invitation_type = 'member' THEN
      INSERT INTO public.organization_members (organization_id, user_id, role, custom_role_title)
      VALUES (
        invitation_record.organization_id, 
        NEW.id, 
        COALESCE(invitation_record.role, 'member'),
        invitation_record.custom_role_title
      )
      ON CONFLICT DO NOTHING;
      
      -- Add to team if team_id is specified
      IF invitation_record.team_id IS NOT NULL THEN
        INSERT INTO public.team_members (team_id, user_id, is_leader)
        VALUES (invitation_record.team_id, NEW.id, false)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
    
    -- Update invitation status to accepted (but NOT for owner type)
    UPDATE public.organization_invitations 
    SET status = 'accepted', responded_at = now()
    WHERE id = invitation_record.id;
  END LOOP;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_pending_invitation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_organization_admin"("_user_id" "uuid", "_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'admin'
  )
$$;


ALTER FUNCTION "public"."is_organization_admin"("_user_id" "uuid", "_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_organization_member"("_user_id" "uuid", "_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;


ALTER FUNCTION "public"."is_organization_member"("_user_id" "uuid", "_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_team_leader"("_user_id" "uuid", "_team_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
      AND team_id = _team_id
      AND is_leader = true
  )
$$;


ALTER FUNCTION "public"."is_team_leader"("_user_id" "uuid", "_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_registration_certification"("_registration_id" "uuid", "_status" "text" DEFAULT NULL::"text", "_attended_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "_certification_start_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "_certification_end_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "_face_match_passed" boolean DEFAULT NULL::boolean, "_face_match_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "_validated_by" "uuid" DEFAULT NULL::"uuid", "_certificate_id" "uuid" DEFAULT NULL::"uuid", "_certificate_data" "jsonb" DEFAULT NULL::"jsonb", "_certificate_url" "text" DEFAULT NULL::"text", "_qr_token" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.event_registrations
  SET
    status = COALESCE(_status, status),
    attended_at = COALESCE(_attended_at, attended_at),
    certification_start_at = COALESCE(_certification_start_at, certification_start_at),
    certification_end_at = COALESCE(_certification_end_at, certification_end_at),
    face_match_passed = COALESCE(_face_match_passed, face_match_passed),
    face_match_at = COALESCE(_face_match_at, face_match_at),
    validated_by = COALESCE(_validated_by, validated_by),
    certificate_id = COALESCE(_certificate_id, certificate_id),
    certificate_data = COALESCE(_certificate_data, certificate_data),
    certificate_url = COALESCE(_certificate_url, certificate_url),
    qr_token = COALESCE(_qr_token, qr_token)
  WHERE id = _registration_id;
END;
$$;


ALTER FUNCTION "public"."update_registration_certification"("_registration_id" "uuid", "_status" "text", "_attended_at" timestamp with time zone, "_certification_start_at" timestamp with time zone, "_certification_end_at" timestamp with time zone, "_face_match_passed" boolean, "_face_match_at" timestamp with time zone, "_validated_by" "uuid", "_certificate_id" "uuid", "_certificate_data" "jsonb", "_certificate_url" "text", "_qr_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."cause_themes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "color" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cause_themes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_cause_themes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "cause_theme_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_cause_themes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'registered'::"text" NOT NULL,
    "registered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "attended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "face_match_passed" boolean DEFAULT false,
    "face_match_at" timestamp with time zone,
    "qr_token" "text",
    "certification_start_at" timestamp with time zone,
    "certification_end_at" timestamp with time zone,
    "validated_by" "uuid",
    "certificate_url" "text",
    "certificate_id" "uuid" DEFAULT "gen_random_uuid"(),
    "certificate_data" "jsonb",
    CONSTRAINT "event_registrations_status_check" CHECK (("status" = ANY (ARRAY['registered'::"text", 'approved'::"text", 'attended'::"text", 'cancelled'::"text", 'waitlist'::"text", 'self_certified'::"text"])))
);


ALTER TABLE "public"."event_registrations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."event_registrations"."certification_start_at" IS 'First QR scan timestamp (arrival)';



COMMENT ON COLUMN "public"."event_registrations"."certification_end_at" IS 'Second QR scan timestamp (departure)';



CREATE TABLE IF NOT EXISTS "public"."event_supervisors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_supervisors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "location" "text" NOT NULL,
    "description" "text",
    "capacity" integer,
    "has_waitlist" boolean DEFAULT false,
    "require_approval" boolean DEFAULT false,
    "is_public" boolean DEFAULT true,
    "cover_image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "latitude" numeric,
    "longitude" numeric,
    "allow_self_certification" boolean DEFAULT false,
    "team_id" "uuid",
    "is_recurring" boolean DEFAULT false,
    "recurrence_frequency" "text",
    "recurrence_interval" integer DEFAULT 1,
    "recurrence_days" "text"[],
    "recurrence_end_type" "text",
    "recurrence_end_date" "date",
    "recurrence_occurrences" integer,
    "parent_event_id" "uuid",
    "recurrence_group_id" "uuid",
    CONSTRAINT "valid_recurrence_end_type" CHECK ((("recurrence_end_type" IS NULL) OR ("recurrence_end_type" = ANY (ARRAY['never'::"text", 'on_date'::"text", 'after_occurrences'::"text"])))),
    CONSTRAINT "valid_recurrence_frequency" CHECK ((("recurrence_frequency" IS NULL) OR ("recurrence_frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text", 'yearly'::"text"]))))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."events"."is_recurring" IS 'Whether this event repeats on a schedule';



COMMENT ON COLUMN "public"."events"."recurrence_frequency" IS 'Frequency: daily, weekly, monthly, yearly';



COMMENT ON COLUMN "public"."events"."recurrence_interval" IS 'Repeat every N frequency units (e.g., every 2 weeks)';



COMMENT ON COLUMN "public"."events"."recurrence_days" IS 'Days of week for weekly recurrence: mon, tue, wed, thu, fri, sat, sun';



COMMENT ON COLUMN "public"."events"."recurrence_end_type" IS 'How recurrence ends: never, on_date, after_occurrences';



COMMENT ON COLUMN "public"."events"."recurrence_end_date" IS 'End date if end_type is on_date';



COMMENT ON COLUMN "public"."events"."recurrence_occurrences" IS 'Number of occurrences if end_type is after_occurrences';



COMMENT ON COLUMN "public"."events"."parent_event_id" IS 'Reference to parent event for generated occurrences';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_id" "uuid",
    "type" "text" NOT NULL,
    "message_fr" "text" NOT NULL,
    "message_en" "text" NOT NULL,
    "action_url" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "status" "public"."notification_status" DEFAULT 'pending'::"public"."notification_status" NOT NULL,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_cause_themes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "cause_theme_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_cause_themes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_by" "uuid",
    "custom_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    "role" "text" DEFAULT 'member'::"text",
    "custom_role_title" "text",
    "team_id" "uuid",
    "invitation_type" "text" DEFAULT 'member'::"text" NOT NULL,
    CONSTRAINT "organization_invitations_invitation_type_check" CHECK (("invitation_type" = ANY (ARRAY['member'::"text", 'contributor'::"text", 'owner'::"text"])))
);


ALTER TABLE "public"."organization_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "custom_role_title" "text",
    "is_owner" boolean DEFAULT false,
    CONSTRAINT "organization_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "siret" "text",
    "description" "text",
    "logo_url" "text",
    "website" "text",
    "address" "text",
    "phone" "text",
    "email" "text",
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" DEFAULT 'association'::"text",
    "cover_image_url" "text",
    "bio" "text",
    "slug" "text",
    "visibility" "text" DEFAULT 'public'::"text",
    "linkedin_url" "text",
    "instagram_url" "text",
    "twitter_url" "text",
    "sector" "text",
    "latitude" numeric,
    "longitude" numeric,
    "employee_count" integer,
    CONSTRAINT "organizations_visibility_check" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'private'::"text", 'invite_only'::"text"])))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organizations"."type" IS 'Organization type: company | association | foundation | institution';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "date_of_birth" "date",
    "onboarding_completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "id_verified" boolean DEFAULT false NOT NULL,
    "reference_selfie_url" "text",
    "didit_session_id" "text",
    "bio" "text",
    "is_suspended" boolean DEFAULT false NOT NULL,
    "suspended_at" timestamp with time zone,
    "suspended_by" "uuid",
    "verification_status" "text" DEFAULT 'none'::"text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."id_verified" IS 'KYC identity verification status via Didit';



COMMENT ON COLUMN "public"."profiles"."verification_status" IS 'Detailed Didit verification status: none, pending, in_review, approved, declined, expired';



CREATE OR REPLACE VIEW "public"."public_certificates" WITH ("security_invoker"='true') AS
 SELECT "certificate_id",
    "certificate_data",
    "event_id"
   FROM "public"."event_registrations"
  WHERE (("certificate_id" IS NOT NULL) AND ("certificate_data" IS NOT NULL));


ALTER VIEW "public"."public_certificates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_leader" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_cause_themes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "cause_theme_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_cause_themes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."user_favorites" REPLICA IDENTITY FULL;


ALTER TABLE "public"."user_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "user_id" "uuid" NOT NULL,
    "language" "text" DEFAULT 'fr'::"text" NOT NULL,
    "email_opt_in" boolean DEFAULT true NOT NULL,
    "sms_opt_in" boolean DEFAULT false NOT NULL,
    "phone_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "geolocation_enabled" boolean DEFAULT false NOT NULL,
    CONSTRAINT "user_preferences_language_check" CHECK (("language" = ANY (ARRAY['fr'::"text", 'en'::"text"])))
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['participant'::"text", 'organization'::"text", 'super_admin'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."cause_themes"
    ADD CONSTRAINT "cause_themes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_cause_themes"
    ADD CONSTRAINT "event_cause_themes_event_id_cause_theme_id_key" UNIQUE ("event_id", "cause_theme_id");



ALTER TABLE ONLY "public"."event_cause_themes"
    ADD CONSTRAINT "event_cause_themes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_certificate_id_key" UNIQUE ("certificate_id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_event_id_user_id_key" UNIQUE ("event_id", "user_id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_supervisors"
    ADD CONSTRAINT "event_supervisors_event_id_user_id_key" UNIQUE ("event_id", "user_id");



ALTER TABLE ONLY "public"."event_supervisors"
    ADD CONSTRAINT "event_supervisors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_cause_themes"
    ADD CONSTRAINT "organization_cause_themes_organization_id_cause_theme_id_key" UNIQUE ("organization_id", "cause_theme_id");



ALTER TABLE ONLY "public"."organization_cause_themes"
    ADD CONSTRAINT "organization_cause_themes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_org_email_unique" UNIQUE ("organization_id", "email");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_organization_id_email_key" UNIQUE ("organization_id", "email");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_org_user_unique" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_cause_themes"
    ADD CONSTRAINT "user_cause_themes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_cause_themes"
    ADD CONSTRAINT "user_cause_themes_user_id_cause_theme_id_key" UNIQUE ("user_id", "cause_theme_id");



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_user_id_event_id_key" UNIQUE ("user_id", "event_id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



CREATE INDEX "idx_event_registrations_certificate_id" ON "public"."event_registrations" USING "btree" ("certificate_id") WHERE ("certificate_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_event_registrations_qr_token" ON "public"."event_registrations" USING "btree" ("qr_token") WHERE ("qr_token" IS NOT NULL);



CREATE INDEX "idx_events_parent_event_id" ON "public"."events" USING "btree" ("parent_event_id");



CREATE INDEX "idx_events_recurrence_group_id" ON "public"."events" USING "btree" ("recurrence_group_id") WHERE ("recurrence_group_id" IS NOT NULL);



CREATE INDEX "idx_notifications_user_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_org_invitations_owner_lookup" ON "public"."organization_invitations" USING "btree" ("organization_id", "email", "invitation_type", "status");



CREATE INDEX "idx_organization_invitations_email" ON "public"."organization_invitations" USING "btree" ("email");



CREATE INDEX "idx_organization_invitations_org_id" ON "public"."organization_invitations" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_invitations_status" ON "public"."organization_invitations" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "on_profile_created_check_invitations" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_pending_invitation"();



CREATE OR REPLACE TRIGGER "update_events_updated_at" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_teams_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."event_cause_themes"
    ADD CONSTRAINT "event_cause_themes_cause_theme_id_fkey" FOREIGN KEY ("cause_theme_id") REFERENCES "public"."cause_themes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_cause_themes"
    ADD CONSTRAINT "event_cause_themes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."event_supervisors"
    ADD CONSTRAINT "event_supervisors_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."event_supervisors"
    ADD CONSTRAINT "event_supervisors_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_supervisors"
    ADD CONSTRAINT "event_supervisors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_parent_event_id_fkey" FOREIGN KEY ("parent_event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_cause_themes"
    ADD CONSTRAINT "organization_cause_themes_cause_theme_id_fkey" FOREIGN KEY ("cause_theme_id") REFERENCES "public"."cause_themes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_cause_themes"
    ADD CONSTRAINT "organization_cause_themes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_cause_themes"
    ADD CONSTRAINT "user_cause_themes_cause_theme_id_fkey" FOREIGN KEY ("cause_theme_id") REFERENCES "public"."cause_themes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_cause_themes"
    ADD CONSTRAINT "user_cause_themes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Event supervisors can view their assignments" ON "public"."event_supervisors" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Everyone can view cause themes" ON "public"."cause_themes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Everyone can view cause themes for public organizations" ON "public"."organization_cause_themes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organizations"
  WHERE (("organizations"."id" = "organization_cause_themes"."organization_id") AND ("organizations"."visibility" = 'public'::"text")))));



CREATE POLICY "Everyone can view event cause themes for public events" ON "public"."event_cause_themes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "event_cause_themes"."event_id") AND ("events"."is_public" = true)))));



CREATE POLICY "Everyone can view public events" ON "public"."events" FOR SELECT USING (("is_public" = true));



CREATE POLICY "Everyone can view verified organizations" ON "public"."organizations" FOR SELECT TO "authenticated" USING (("is_verified" = true));



CREATE POLICY "Organization admins can add members to their org" ON "public"."organization_members" FOR INSERT WITH CHECK ("public"."is_organization_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "Organization admins can create events" ON "public"."events" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "events"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"text")))));



CREATE POLICY "Organization admins can create teams" ON "public"."teams" FOR INSERT WITH CHECK ("public"."is_organization_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "Organization admins can delete cause themes" ON "public"."organization_cause_themes" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "organization_cause_themes"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"text")))));



CREATE POLICY "Organization admins can delete event cause themes" ON "public"."event_cause_themes" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."events"
     JOIN "public"."organization_members" ON (("organization_members"."organization_id" = "events"."organization_id")))
  WHERE (("events"."id" = "event_cause_themes"."event_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"text")))));



CREATE POLICY "Organization admins can delete events" ON "public"."events" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "events"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"text")))));



CREATE POLICY "Organization admins can delete invitations" ON "public"."organization_invitations" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "organization_invitations"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"text")))));



CREATE POLICY "Organization admins can delete members" ON "public"."organization_members" FOR DELETE TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_members"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'admin'::"text"))))));



CREATE POLICY "Organization admins can delete teams" ON "public"."teams" FOR DELETE USING ("public"."is_organization_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "Organization admins can insert cause themes" ON "public"."organization_cause_themes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "organization_cause_themes"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"text")))));



CREATE POLICY "Organization admins can insert event cause themes" ON "public"."event_cause_themes" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."events"
     JOIN "public"."organization_members" ON (("organization_members"."organization_id" = "events"."organization_id")))
  WHERE (("events"."id" = "event_cause_themes"."event_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"text")))));



CREATE POLICY "Organization admins can insert invitations" ON "public"."organization_invitations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "organization_invitations"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"text")))));



CREATE POLICY "Organization admins can manage event registrations" ON "public"."event_registrations" USING ((EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "e"."organization_id")))
  WHERE (("e"."id" = "event_registrations"."event_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'admin'::"text")))));



CREATE POLICY "Organization admins can manage event supervisors" ON "public"."event_supervisors" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_supervisors"."event_id") AND "public"."is_organization_admin"("auth"."uid"(), "e"."organization_id")))));



CREATE POLICY "Organization admins can manage team members" ON "public"."team_members" USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND "public"."is_organization_admin"("auth"."uid"(), "t"."organization_id")))));



CREATE POLICY "Organization admins can update events" ON "public"."events" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "events"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"text")))));



CREATE POLICY "Organization admins can update invitations" ON "public"."organization_invitations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "organization_invitations"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"text")))));



CREATE POLICY "Organization admins can update members" ON "public"."organization_members" FOR UPDATE TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_members"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'admin'::"text"))))));



CREATE POLICY "Organization admins can update teams" ON "public"."teams" FOR UPDATE USING ("public"."is_organization_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "Organization admins can update their organization" ON "public"."organizations" FOR UPDATE TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "organizations"."id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"text"))))));



CREATE POLICY "Organization admins can view invitations" ON "public"."organization_invitations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "organization_invitations"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"text")))));



CREATE POLICY "Organization members can view event supervisors" ON "public"."event_supervisors" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "e"."organization_id")))
  WHERE (("e"."id" = "event_supervisors"."event_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "Organization members can view org member list" ON "public"."organization_members" FOR SELECT USING ("public"."is_organization_member"("auth"."uid"(), "organization_id"));



CREATE POLICY "Organization members can view team members" ON "public"."team_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "t"."organization_id")))
  WHERE (("t"."id" = "team_members"."team_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "Organization members can view their event cause themes" ON "public"."event_cause_themes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."events"
     JOIN "public"."organization_members" ON (("organization_members"."organization_id" = "events"."organization_id")))
  WHERE (("events"."id" = "event_cause_themes"."event_id") AND ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Organization members can view their event registrations" ON "public"."event_registrations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "e"."organization_id")))
  WHERE (("e"."id" = "event_registrations"."event_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "Organization members can view their events" ON "public"."events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "events"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Organization members can view their org cause themes" ON "public"."organization_cause_themes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "organization_cause_themes"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Organization members can view their org teams" ON "public"."teams" FOR SELECT USING ("public"."is_organization_member"("auth"."uid"(), "organization_id"));



CREATE POLICY "Organization members can view their organization" ON "public"."organizations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "organizations"."id") AND ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Service role can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Super admins can delete cause themes" ON "public"."cause_themes" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can delete event cause themes" ON "public"."event_cause_themes" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can delete events" ON "public"."events" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can delete notifications" ON "public"."notifications" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can delete organizations" ON "public"."organizations" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can delete profiles" ON "public"."profiles" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can delete roles" ON "public"."user_roles" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can delete user cause themes" ON "public"."user_cause_themes" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can delete user favorites" ON "public"."user_favorites" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can delete user preferences" ON "public"."user_preferences" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can insert cause themes" ON "public"."cause_themes" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can insert organization members" ON "public"."organization_members" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can insert organizations" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can insert organizations via onboarding" ON "public"."organizations" FOR INSERT WITH CHECK (true);



CREATE POLICY "Super admins can insert roles" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can manage all event supervisors" ON "public"."event_supervisors" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can manage all invitations" ON "public"."organization_invitations" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can manage all org cause themes" ON "public"."organization_cause_themes" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can manage all organization members" ON "public"."organization_members" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can manage all registrations" ON "public"."event_registrations" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can manage all team members" ON "public"."team_members" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can manage all teams" ON "public"."teams" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can update all organizations" ON "public"."organizations" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can update cause themes" ON "public"."cause_themes" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can update roles" ON "public"."user_roles" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can view all event cause themes" ON "public"."event_cause_themes" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can view all events" ON "public"."events" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can view all organization members" ON "public"."organization_members" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can view all organizations" ON "public"."organizations" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can view all profiles" ON "public"."profiles" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can view all registrations" ON "public"."event_registrations" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Super admins can view all roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"text"));



CREATE POLICY "Team leaders can create events for their team" ON "public"."events" FOR INSERT WITH CHECK ((("team_id" IS NOT NULL) AND "public"."is_team_leader"("auth"."uid"(), "team_id") AND "public"."is_organization_member"("auth"."uid"(), "organization_id")));



CREATE POLICY "Team leaders can delete events for their team" ON "public"."events" FOR DELETE USING ((("team_id" IS NOT NULL) AND "public"."is_team_leader"("auth"."uid"(), "team_id")));



CREATE POLICY "Team leaders can delete invitations for their team" ON "public"."organization_invitations" FOR DELETE USING ((("team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = "auth"."uid"()) AND ("tm"."team_id" = "organization_invitations"."team_id") AND ("tm"."is_leader" = true))))));



CREATE POLICY "Team leaders can insert invitations for their team" ON "public"."organization_invitations" FOR INSERT WITH CHECK ((("team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = "auth"."uid"()) AND ("tm"."team_id" = "organization_invitations"."team_id") AND ("tm"."is_leader" = true)))) AND (EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."organization_id" = "organization_invitations"."organization_id"))))));



CREATE POLICY "Team leaders can manage supervisors for their team events" ON "public"."event_supervisors" USING ((EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."teams" "t" ON (("t"."id" = "e"."team_id")))
  WHERE (("e"."id" = "event_supervisors"."event_id") AND "public"."is_team_leader"("auth"."uid"(), "t"."id")))));



CREATE POLICY "Team leaders can update events for their team" ON "public"."events" FOR UPDATE USING ((("team_id" IS NOT NULL) AND "public"."is_team_leader"("auth"."uid"(), "team_id")));



CREATE POLICY "Team leaders can update invitations for their team" ON "public"."organization_invitations" FOR UPDATE USING ((("team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = "auth"."uid"()) AND ("tm"."team_id" = "organization_invitations"."team_id") AND ("tm"."is_leader" = true))))));



CREATE POLICY "Team leaders can view invitations for their team" ON "public"."organization_invitations" FOR SELECT USING ((("team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = "auth"."uid"()) AND ("tm"."team_id" = "organization_invitations"."team_id") AND ("tm"."is_leader" = true))))));



CREATE POLICY "Users can delete their own cause themes" ON "public"."user_cause_themes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own favorites" ON "public"."user_favorites" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own registrations" ON "public"."event_registrations" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own cause themes" ON "public"."user_cause_themes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own favorites" ON "public"."user_favorites" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can register to events" ON "public"."event_registrations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can self-certify their registrations" ON "public"."event_registrations" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = ANY (ARRAY['self_certified'::"text", 'registered'::"text", 'cancelled'::"text"]))));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own preferences" ON "public"."user_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own cause themes" ON "public"."user_cause_themes" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own favorites" ON "public"."user_favorites" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own organization memberships" ON "public"."organization_members" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own preferences" ON "public"."user_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own registrations" ON "public"."event_registrations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Verified org members can view event participant profiles" ON "public"."profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((("public"."event_registrations" "er"
     JOIN "public"."events" "e" ON (("e"."id" = "er"."event_id")))
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "e"."organization_id")))
     JOIN "public"."organizations" "o" ON (("o"."id" = "e"."organization_id")))
  WHERE (("er"."user_id" = "profiles"."id") AND ("om"."user_id" = "auth"."uid"()) AND ("o"."is_verified" = true)))));



CREATE POLICY "Verified org members can view profiles of org members" ON "public"."profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."organization_members" "om1"
     JOIN "public"."organization_members" "om2" ON (("om1"."organization_id" = "om2"."organization_id")))
     JOIN "public"."organizations" "o" ON (("o"."id" = "om1"."organization_id")))
  WHERE (("om1"."user_id" = "auth"."uid"()) AND ("om2"."user_id" = "profiles"."id") AND ("o"."is_verified" = true)))));



ALTER TABLE "public"."cause_themes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_cause_themes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_supervisors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_cause_themes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_cause_themes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_favorites";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."accept_owner_invitation"("_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_owner_invitation"("_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_owner_invitation"("_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("_email" "text", "_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("_email" "text", "_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("_email" "text", "_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_team_in_org"("_user_id" "uuid", "_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_team_in_org"("_user_id" "uuid", "_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_team_in_org"("_user_id" "uuid", "_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_pending_invitation"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_pending_invitation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_pending_invitation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_organization_admin"("_user_id" "uuid", "_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_organization_admin"("_user_id" "uuid", "_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_organization_admin"("_user_id" "uuid", "_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_organization_member"("_user_id" "uuid", "_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_organization_member"("_user_id" "uuid", "_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_organization_member"("_user_id" "uuid", "_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_team_leader"("_user_id" "uuid", "_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_team_leader"("_user_id" "uuid", "_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_team_leader"("_user_id" "uuid", "_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_registration_certification"("_registration_id" "uuid", "_status" "text", "_attended_at" timestamp with time zone, "_certification_start_at" timestamp with time zone, "_certification_end_at" timestamp with time zone, "_face_match_passed" boolean, "_face_match_at" timestamp with time zone, "_validated_by" "uuid", "_certificate_id" "uuid", "_certificate_data" "jsonb", "_certificate_url" "text", "_qr_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_registration_certification"("_registration_id" "uuid", "_status" "text", "_attended_at" timestamp with time zone, "_certification_start_at" timestamp with time zone, "_certification_end_at" timestamp with time zone, "_face_match_passed" boolean, "_face_match_at" timestamp with time zone, "_validated_by" "uuid", "_certificate_id" "uuid", "_certificate_data" "jsonb", "_certificate_url" "text", "_qr_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_registration_certification"("_registration_id" "uuid", "_status" "text", "_attended_at" timestamp with time zone, "_certification_start_at" timestamp with time zone, "_certification_end_at" timestamp with time zone, "_face_match_passed" boolean, "_face_match_at" timestamp with time zone, "_validated_by" "uuid", "_certificate_id" "uuid", "_certificate_data" "jsonb", "_certificate_url" "text", "_qr_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."cause_themes" TO "anon";
GRANT ALL ON TABLE "public"."cause_themes" TO "authenticated";
GRANT ALL ON TABLE "public"."cause_themes" TO "service_role";



GRANT ALL ON TABLE "public"."event_cause_themes" TO "anon";
GRANT ALL ON TABLE "public"."event_cause_themes" TO "authenticated";
GRANT ALL ON TABLE "public"."event_cause_themes" TO "service_role";



GRANT ALL ON TABLE "public"."event_registrations" TO "anon";
GRANT ALL ON TABLE "public"."event_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."event_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."event_supervisors" TO "anon";
GRANT ALL ON TABLE "public"."event_supervisors" TO "authenticated";
GRANT ALL ON TABLE "public"."event_supervisors" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."organization_cause_themes" TO "anon";
GRANT ALL ON TABLE "public"."organization_cause_themes" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_cause_themes" TO "service_role";



GRANT ALL ON TABLE "public"."organization_invitations" TO "anon";
GRANT ALL ON TABLE "public"."organization_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."public_certificates" TO "anon";
GRANT ALL ON TABLE "public"."public_certificates" TO "authenticated";
GRANT ALL ON TABLE "public"."public_certificates" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."user_cause_themes" TO "anon";
GRANT ALL ON TABLE "public"."user_cause_themes" TO "authenticated";
GRANT ALL ON TABLE "public"."user_cause_themes" TO "service_role";



GRANT ALL ON TABLE "public"."user_favorites" TO "anon";
GRANT ALL ON TABLE "public"."user_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."user_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































