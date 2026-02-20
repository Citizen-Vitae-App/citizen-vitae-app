
-- Create certification_logs table
CREATE TABLE public.certification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  registration_id uuid REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  method text NOT NULL,
  ip_address text,
  latitude numeric,
  longitude numeric,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certification_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admins can read logs
CREATE POLICY "Super admins can view all certification logs"
ON public.certification_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- Allow service_role and triggers to insert (no restrictive policy on INSERT means only service_role/triggers can insert)
-- We add a permissive policy for insert that is always false for anon/authenticated to block client inserts
-- Actually, with RLS enabled and NO insert policy, inserts from authenticated users are blocked by default.
-- Triggers run as SECURITY DEFINER so they bypass RLS.

-- Index for performance
CREATE INDEX idx_certification_logs_created_at ON public.certification_logs (created_at DESC);
CREATE INDEX idx_certification_logs_user_id ON public.certification_logs (user_id);
CREATE INDEX idx_certification_logs_status ON public.certification_logs (status);

-- Trigger function to auto-log certification changes on event_registrations
CREATE OR REPLACE FUNCTION public.log_certification_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Face match passed (false -> true)
  IF (OLD.face_match_passed IS DISTINCT FROM NEW.face_match_passed) AND NEW.face_match_passed = true THEN
    INSERT INTO public.certification_logs (user_id, event_id, registration_id, action, status, method, metadata)
    VALUES (NEW.user_id, NEW.event_id, NEW.id, 'face_match_success', 'success', 'face_match',
      jsonb_build_object('face_match_at', NEW.face_match_at));
  END IF;

  -- Face match failed (was null/false, set face_match_at but passed still false)
  IF (OLD.face_match_at IS DISTINCT FROM NEW.face_match_at) AND NEW.face_match_at IS NOT NULL AND (NEW.face_match_passed = false OR NEW.face_match_passed IS NULL) THEN
    INSERT INTO public.certification_logs (user_id, event_id, registration_id, action, status, method)
    VALUES (NEW.user_id, NEW.event_id, NEW.id, 'face_match_failure', 'failure', 'face_match');
  END IF;

  -- QR scan arrival (certification_start_at set)
  IF (OLD.certification_start_at IS NULL AND NEW.certification_start_at IS NOT NULL) THEN
    INSERT INTO public.certification_logs (user_id, event_id, registration_id, action, status, method)
    VALUES (NEW.user_id, NEW.event_id, NEW.id, 'qr_scan_arrival', 'success', 'qr_code');
  END IF;

  -- QR scan departure (certification_end_at set)
  IF (OLD.certification_end_at IS NULL AND NEW.certification_end_at IS NOT NULL) THEN
    INSERT INTO public.certification_logs (user_id, event_id, registration_id, action, status, method)
    VALUES (NEW.user_id, NEW.event_id, NEW.id, 'qr_scan_departure', 'success', 'qr_code');
  END IF;

  -- Self certification (status changed to self_certified)
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'self_certified' THEN
    INSERT INTO public.certification_logs (user_id, event_id, registration_id, action, status, method)
    VALUES (NEW.user_id, NEW.event_id, NEW.id, 'self_certification', 'success', 'self_certification');
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trg_log_certification_changes
AFTER UPDATE ON public.event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.log_certification_changes();
