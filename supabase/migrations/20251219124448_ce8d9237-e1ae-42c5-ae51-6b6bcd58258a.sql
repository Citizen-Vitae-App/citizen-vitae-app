-- Reset id_verified for Harry Benkemoun to allow re-verification
UPDATE public.profiles 
SET id_verified = false 
WHERE email = 'harrybenkemoun@gmail.com'
AND reference_selfie_url IS NULL;