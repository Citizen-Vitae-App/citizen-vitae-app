-- Reset Harry's verification status so he can re-verify and get his reference selfie stored properly
UPDATE profiles 
SET id_verified = false, 
    didit_session_id = null,
    reference_selfie_url = null
WHERE email = 'harry@citizenvitae.com';