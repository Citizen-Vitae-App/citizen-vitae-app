
-- Add RLS policy to allow organization members to view profiles of other members in their organization
CREATE POLICY "Organization members can view profiles of org members"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM organization_members om1
    JOIN organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid()
    AND om2.user_id = profiles.id
  )
);
