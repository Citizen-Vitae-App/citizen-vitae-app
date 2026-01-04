-- Add policy to allow users to self-certify their own registrations
CREATE POLICY "Users can self-certify their registrations"
ON public.event_registrations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND status IN ('self_certified', 'registered', 'cancelled')
);

-- Drop the old restrictive update policy
DROP POLICY IF EXISTS "Users can cancel their registrations" ON public.event_registrations;