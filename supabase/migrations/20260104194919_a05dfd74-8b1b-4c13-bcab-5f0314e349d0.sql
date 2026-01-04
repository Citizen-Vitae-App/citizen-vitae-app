-- Migrate existing reference_selfie_url from signed URLs to file paths
-- Signed URLs contain '/storage/v1/object/sign/' in the path
-- We need to extract just the file path: "{user_id}/reference.jpg"

UPDATE profiles
SET reference_selfie_url = id || '/reference.jpg'
WHERE reference_selfie_url IS NOT NULL
  AND (
    reference_selfie_url LIKE '%/storage/v1/object/sign/%'
    OR reference_selfie_url LIKE 'http%'
  );