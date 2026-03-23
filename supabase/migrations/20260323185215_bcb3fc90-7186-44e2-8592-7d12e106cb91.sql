ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- RLS: Anyone can view public registrations for public citizen CV
CREATE POLICY "Anyone can view public registrations for citizen CV"
ON public.event_registrations
FOR SELECT
TO public
USING (is_public = true AND face_match_passed = true AND attended_at IS NOT NULL);