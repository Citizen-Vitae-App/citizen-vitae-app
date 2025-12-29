-- Allow organization members to view all members in their organization
-- This is required for the Members tab to show the complete member list
CREATE POLICY "Organization members can view org member list"
ON public.organization_members
FOR SELECT
USING (
  is_organization_member(auth.uid(), organization_id)
);