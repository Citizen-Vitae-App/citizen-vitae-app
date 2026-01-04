
-- Fix missing profile for frank@citizenvitae.com
INSERT INTO public.profiles (id, email, first_name, last_name, onboarding_completed)
VALUES ('a28fac5d-7e8f-4e02-8a56-b7703385f9cd', 'frank@citizenvitae.com', NULL, NULL, false)
ON CONFLICT (id) DO NOTHING;

-- Create user preferences if missing
INSERT INTO public.user_preferences (user_id, language, email_opt_in, sms_opt_in, geolocation_enabled)
VALUES ('a28fac5d-7e8f-4e02-8a56-b7703385f9cd', 'fr', true, false, false)
ON CONFLICT (user_id) DO NOTHING;

-- Add frank to organization EEIF as member
INSERT INTO public.organization_members (organization_id, user_id, role, custom_role_title)
VALUES ('566b81a9-e81f-4a3e-a870-23fba5dc77ba', 'a28fac5d-7e8f-4e02-8a56-b7703385f9cd', 'member', 'RGL 17e')
ON CONFLICT DO NOTHING;

-- Add frank to team
INSERT INTO public.team_members (team_id, user_id, is_leader)
VALUES ('f19f267e-1a4c-435f-a6c6-56090a98e651', 'a28fac5d-7e8f-4e02-8a56-b7703385f9cd', false)
ON CONFLICT DO NOTHING;

-- Mark invitation as accepted
UPDATE public.organization_invitations 
SET status = 'accepted', responded_at = now()
WHERE id = 'eb9e3362-4433-43c3-be28-3b82a0027327';

-- Improve the handle_new_user trigger to be more robust
-- It should not fail silently if there's an issue
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
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
