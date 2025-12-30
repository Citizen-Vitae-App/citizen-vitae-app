-- Create a secure view for public certificate access that only exposes safe data
CREATE VIEW public.public_certificates AS
SELECT 
  certificate_id,
  certificate_data,
  event_id
FROM public.event_registrations
WHERE certificate_id IS NOT NULL 
  AND certificate_data IS NOT NULL;

-- Grant select on the view to anon and authenticated roles
GRANT SELECT ON public.public_certificates TO anon, authenticated;

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view certificate by certificate_id" ON public.event_registrations;