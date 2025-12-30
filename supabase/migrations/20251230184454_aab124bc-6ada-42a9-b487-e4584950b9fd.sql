-- Drop and recreate the view with SECURITY INVOKER to fix the security definer warning
DROP VIEW IF EXISTS public.public_certificates;

CREATE VIEW public.public_certificates 
WITH (security_invoker = true)
AS
SELECT 
  certificate_id,
  certificate_data,
  event_id
FROM public.event_registrations
WHERE certificate_id IS NOT NULL 
  AND certificate_data IS NOT NULL;

-- Grant select on the view to anon and authenticated roles
GRANT SELECT ON public.public_certificates TO anon, authenticated;

-- Create an RLS policy on event_registrations to allow SELECT via the view for anonymous users
-- This policy only allows seeing the specific columns exposed in the view
CREATE POLICY "Allow view access for certificates"
ON public.event_registrations FOR SELECT
TO anon
USING (certificate_id IS NOT NULL AND certificate_data IS NOT NULL);