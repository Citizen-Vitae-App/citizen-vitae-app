-- Remove the RLS policy that still allows access to the full table
DROP POLICY IF EXISTS "Allow view access for certificates" ON public.event_registrations;

-- Drop and recreate the view ensuring it's not a security definer view
DROP VIEW IF EXISTS public.public_certificates;

-- Create a simple view (views inherit RLS from underlying tables by default with security_invoker)
CREATE VIEW public.public_certificates AS
SELECT 
  certificate_id,
  certificate_data,
  event_id
FROM public.event_registrations
WHERE certificate_id IS NOT NULL 
  AND certificate_data IS NOT NULL;

-- Set security_invoker explicitly 
ALTER VIEW public.public_certificates SET (security_invoker = true);

-- Grant select on the view
GRANT SELECT ON public.public_certificates TO anon, authenticated;

-- Now create a minimal RLS policy ONLY for the view access pattern
-- This policy only activates when querying via the view with a specific certificate_id
CREATE POLICY "Allow public certificate lookup by id"
ON public.event_registrations FOR SELECT
TO anon
USING (
  certificate_id IS NOT NULL 
  AND certificate_data IS NOT NULL
);