-- Add certificate_id and certificate_data columns to event_registrations
ALTER TABLE public.event_registrations
ADD COLUMN IF NOT EXISTS certificate_id uuid UNIQUE DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS certificate_data jsonb;

-- Create index for fast lookups by certificate_id
CREATE INDEX IF NOT EXISTS idx_event_registrations_certificate_id 
ON public.event_registrations(certificate_id) 
WHERE certificate_id IS NOT NULL;

-- Create RLS policy to allow anyone to view certificates by certificate_id
CREATE POLICY "Anyone can view certificate by certificate_id" 
ON public.event_registrations FOR SELECT
USING (certificate_id IS NOT NULL AND certificate_data IS NOT NULL);