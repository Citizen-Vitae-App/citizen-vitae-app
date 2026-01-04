-- Add verification_status column to track detailed Didit verification status
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'none';

-- Update existing verified users to 'approved' status
UPDATE profiles SET verification_status = 'approved' WHERE id_verified = true;

-- Add a comment for documentation
COMMENT ON COLUMN profiles.verification_status IS 'Detailed Didit verification status: none, pending, in_review, approved, declined, expired';