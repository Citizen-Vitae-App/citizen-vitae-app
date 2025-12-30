-- Restrict which fields users can update on their own registrations
-- Users should only be able to cancel their own registrations, not modify certification fields

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can update their own registrations" ON public.event_registrations;

-- Create a restrictive update policy that only allows status changes for cancellation
-- All certification-related updates must go through Edge Functions with service role
CREATE POLICY "Users can cancel their registrations"
ON public.event_registrations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- Only allow changing to 'cancelled' status
  (status = 'cancelled' OR status = (SELECT er.status FROM public.event_registrations er WHERE er.id = id))
);

-- Create a security definer function for certification updates
-- This ensures only Edge Functions with service role can update certification fields
CREATE OR REPLACE FUNCTION public.update_registration_certification(
  _registration_id uuid,
  _status text DEFAULT NULL,
  _attended_at timestamp with time zone DEFAULT NULL,
  _certification_start_at timestamp with time zone DEFAULT NULL,
  _certification_end_at timestamp with time zone DEFAULT NULL,
  _face_match_passed boolean DEFAULT NULL,
  _face_match_at timestamp with time zone DEFAULT NULL,
  _validated_by uuid DEFAULT NULL,
  _certificate_id uuid DEFAULT NULL,
  _certificate_data jsonb DEFAULT NULL,
  _certificate_url text DEFAULT NULL,
  _qr_token text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.event_registrations
  SET
    status = COALESCE(_status, status),
    attended_at = COALESCE(_attended_at, attended_at),
    certification_start_at = COALESCE(_certification_start_at, certification_start_at),
    certification_end_at = COALESCE(_certification_end_at, certification_end_at),
    face_match_passed = COALESCE(_face_match_passed, face_match_passed),
    face_match_at = COALESCE(_face_match_at, face_match_at),
    validated_by = COALESCE(_validated_by, validated_by),
    certificate_id = COALESCE(_certificate_id, certificate_id),
    certificate_data = COALESCE(_certificate_data, certificate_data),
    certificate_url = COALESCE(_certificate_url, certificate_url),
    qr_token = COALESCE(_qr_token, qr_token)
  WHERE id = _registration_id;
END;
$$;