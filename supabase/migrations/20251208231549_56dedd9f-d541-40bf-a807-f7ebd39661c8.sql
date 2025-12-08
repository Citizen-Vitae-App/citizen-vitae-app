-- Allow organization members to view profiles of users registered to their events
CREATE POLICY "Organization members can view profiles of event participants"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM event_registrations er
    JOIN events e ON e.id = er.event_id
    JOIN organization_members om ON om.organization_id = e.organization_id
    WHERE er.user_id = profiles.id
      AND om.user_id = auth.uid()
  )
);