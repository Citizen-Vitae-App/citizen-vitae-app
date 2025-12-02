-- Mettre à jour la fonction handle_new_user pour extraire les données Google OAuth
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
  
  RETURN new;
END;
$$;

-- Mettre à jour les profils existants avec les données Google
UPDATE public.profiles p
SET 
  first_name = COALESCE(
    p.first_name,
    split_part(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), ' ', 1)
  ),
  last_name = COALESCE(
    p.last_name,
    NULLIF(trim(substring(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '') 
      from position(' ' in COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')) + 1)), '')
  ),
  avatar_url = COALESCE(
    p.avatar_url,
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  )
FROM auth.users u
WHERE p.id = u.id
  AND (p.first_name IS NULL OR p.last_name IS NULL OR p.avatar_url IS NULL);