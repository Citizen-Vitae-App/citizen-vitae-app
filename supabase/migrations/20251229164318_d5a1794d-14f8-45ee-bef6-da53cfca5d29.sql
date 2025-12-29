-- Add RLS policy for team leaders to view invitations for their team
CREATE POLICY "Team leaders can view invitations for their team" 
ON public.organization_invitations 
FOR SELECT 
USING (
  team_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.team_id = organization_invitations.team_id
    AND tm.is_leader = true
  )
);

-- Add RLS policy for team leaders to update invitations for their team
CREATE POLICY "Team leaders can update invitations for their team" 
ON public.organization_invitations 
FOR UPDATE 
USING (
  team_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.team_id = organization_invitations.team_id
    AND tm.is_leader = true
  )
);

-- Add RLS policy for team leaders to delete invitations for their team
CREATE POLICY "Team leaders can delete invitations for their team" 
ON public.organization_invitations 
FOR DELETE 
USING (
  team_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.team_id = organization_invitations.team_id
    AND tm.is_leader = true
  )
);

-- Add RLS policy for team leaders to insert invitations for their team
CREATE POLICY "Team leaders can insert invitations for their team" 
ON public.organization_invitations 
FOR INSERT 
WITH CHECK (
  team_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.team_id = organization_invitations.team_id
    AND tm.is_leader = true
  )
  AND EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = organization_invitations.organization_id
  )
);