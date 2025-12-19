-- Réinitialiser id_verified pour les utilisateurs qui ont été vérifiés mais sans selfie de référence
-- Cela leur permettra de refaire le processus de vérification complet
UPDATE public.profiles 
SET id_verified = false 
WHERE id_verified = true 
AND reference_selfie_url IS NULL;