-- Add id_verified column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN id_verified boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.id_verified IS 'KYC identity verification status via Didit';