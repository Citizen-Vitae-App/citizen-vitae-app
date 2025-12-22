-- Add validated_by and certificate_url columns to event_registrations
ALTER TABLE public.event_registrations 
ADD COLUMN validated_by uuid REFERENCES public.profiles(id),
ADD COLUMN certificate_url text;

-- Add custom_role_title column to organization_members
ALTER TABLE public.organization_members 
ADD COLUMN custom_role_title text;

-- Create certificates storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for certificates bucket
CREATE POLICY "Authenticated users can view certificates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'certificates');

CREATE POLICY "Service role can insert certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'certificates');

CREATE POLICY "Public can view certificates"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'certificates');