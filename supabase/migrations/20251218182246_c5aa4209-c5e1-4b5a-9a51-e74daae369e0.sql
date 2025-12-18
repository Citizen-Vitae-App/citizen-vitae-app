-- Add geolocation_enabled field to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN geolocation_enabled boolean NOT NULL DEFAULT false;

-- Update the handle_new_user function to include geolocation_enabled
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Créer le profil avec les données extraites
  INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url, onboarding_completed)
  VALUES (
    new.id,
    new.email,
    first_name_value,
    last_name_value,
    avatar_value,
    false
  );
  
  -- Créer les préférences utilisateur par défaut
  INSERT INTO public.user_preferences (user_id, language, email_opt_in, sms_opt_in, geolocation_enabled)
  VALUES (new.id, 'fr', true, false, false);
  
  RETURN new;
END;
$function$;