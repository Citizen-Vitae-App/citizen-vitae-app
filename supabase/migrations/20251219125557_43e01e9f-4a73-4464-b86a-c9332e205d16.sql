-- Add didit_session_id column to track the verification session
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS didit_session_id TEXT;

-- Reset id_verified for users without reference_selfie_url (they don't have valid sessions)
UPDATE public.profiles 
SET id_verified = false 
WHERE id_verified = true 
AND reference_selfie_url IS NULL;