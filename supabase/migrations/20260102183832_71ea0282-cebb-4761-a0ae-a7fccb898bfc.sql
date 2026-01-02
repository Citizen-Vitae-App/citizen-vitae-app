-- Fix PUBLIC_DATA_EXPOSURE: Restrict profile access to verified organizations only
-- This prevents fake organizations from harvesting personal data

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Organization members can view profiles of org members" ON public.profiles;
DROP POLICY IF EXISTS "Organization members can view profiles of event participants" ON public.profiles;

-- Only allow profile viewing for members of VERIFIED organizations
CREATE POLICY "Verified org members can view profiles of org members" 
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.organization_members om1
    JOIN public.organization_members om2 ON om1.organization_id = om2.organization_id
    JOIN public.organizations o ON o.id = om1.organization_id
    WHERE om1.user_id = auth.uid()
      AND om2.user_id = profiles.id
      AND o.is_verified = true
  )
);

-- Only allow profile viewing for event participants in VERIFIED organizations
CREATE POLICY "Verified org members can view event participant profiles" 
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.event_registrations er
    JOIN public.events e ON e.id = er.event_id
    JOIN public.organization_members om ON om.organization_id = e.organization_id
    JOIN public.organizations o ON o.id = e.organization_id
    WHERE er.user_id = profiles.id 
      AND om.user_id = auth.uid()
      AND o.is_verified = true
  )
);