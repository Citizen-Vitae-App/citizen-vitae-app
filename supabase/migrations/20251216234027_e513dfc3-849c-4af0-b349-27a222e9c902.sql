-- Update profile avatar_url from Google auth metadata for existing user
UPDATE public.profiles p
SET avatar_url = COALESCE(
  u.raw_user_meta_data->>'avatar_url',
  u.raw_user_meta_data->>'picture'
)
FROM auth.users u
WHERE p.id = u.id
AND p.email = 'harrybenkemoun@gmail.com'
AND p.avatar_url IS NULL
AND (u.raw_user_meta_data->>'avatar_url' IS NOT NULL OR u.raw_user_meta_data->>'picture' IS NOT NULL);