-- Add face match and QR code columns to event_registrations
ALTER TABLE public.event_registrations
ADD COLUMN IF NOT EXISTS face_match_passed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS face_match_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS qr_token TEXT NULL;

-- Add reference selfie URL to profiles for Face Match comparison
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reference_selfie_url TEXT NULL;

-- Create unique index on qr_token for fast lookups during admin scan
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_registrations_qr_token 
ON public.event_registrations(qr_token) WHERE qr_token IS NOT NULL;

-- Create private storage bucket for verification selfies
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-selfies', 'verification-selfies', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for verification-selfies bucket
-- Users can only view their own verification selfie
CREATE POLICY "Users can view their own verification selfie"
ON storage.objects FOR SELECT
USING (bucket_id = 'verification-selfies' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service role can insert verification selfies (from Edge Function)
CREATE POLICY "Service role can insert verification selfies"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'verification-selfies');

-- Service role can update verification selfies
CREATE POLICY "Service role can update verification selfies"
ON storage.objects FOR UPDATE
USING (bucket_id = 'verification-selfies');

-- Service role can delete verification selfies
CREATE POLICY "Service role can delete verification selfies"
ON storage.objects FOR DELETE
USING (bucket_id = 'verification-selfies');