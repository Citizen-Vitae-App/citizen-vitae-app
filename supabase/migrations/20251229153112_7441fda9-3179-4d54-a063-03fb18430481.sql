-- Politique pour permettre aux Team Leaders de créer des events pour leur team
CREATE POLICY "Team leaders can create events for their team" 
ON public.events 
FOR INSERT 
WITH CHECK (
  team_id IS NOT NULL
  AND is_team_leader(auth.uid(), team_id)
  AND is_organization_member(auth.uid(), organization_id)
);

-- Politique pour permettre aux Team Leaders de modifier les events de leur team
CREATE POLICY "Team leaders can update events for their team"
ON public.events
FOR UPDATE
USING (
  team_id IS NOT NULL AND is_team_leader(auth.uid(), team_id)
);

-- Politique pour permettre aux Team Leaders de supprimer les events de leur team
CREATE POLICY "Team leaders can delete events for their team"
ON public.events
FOR DELETE
USING (
  team_id IS NOT NULL AND is_team_leader(auth.uid(), team_id)
);