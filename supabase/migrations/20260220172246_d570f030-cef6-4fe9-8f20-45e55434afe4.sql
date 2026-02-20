
-- Backfill certification_logs from existing event_registrations data
INSERT INTO public.certification_logs (user_id, event_id, registration_id, action, status, method, metadata, created_at)
SELECT 
  er.user_id, er.event_id, er.id,
  'face_match_success', 'success', 'face_match',
  jsonb_build_object('face_match_at', er.face_match_at, 'source', 'backfill'),
  er.face_match_at
FROM public.event_registrations er
WHERE er.face_match_passed = true AND er.face_match_at IS NOT NULL;

INSERT INTO public.certification_logs (user_id, event_id, registration_id, action, status, method, metadata, created_at)
SELECT 
  er.user_id, er.event_id, er.id,
  'qr_scan_arrival', 'success', 'qr_code',
  jsonb_build_object('source', 'backfill'),
  er.certification_start_at
FROM public.event_registrations er
WHERE er.certification_start_at IS NOT NULL;

INSERT INTO public.certification_logs (user_id, event_id, registration_id, action, status, method, metadata, created_at)
SELECT 
  er.user_id, er.event_id, er.id,
  'qr_scan_departure', 'success', 'qr_code',
  jsonb_build_object('source', 'backfill'),
  er.certification_end_at
FROM public.event_registrations er
WHERE er.certification_end_at IS NOT NULL;

INSERT INTO public.certification_logs (user_id, event_id, registration_id, action, status, method, metadata, created_at)
SELECT 
  er.user_id, er.event_id, er.id,
  'self_certification', 'success', 'self_certification',
  jsonb_build_object('source', 'backfill'),
  er.certification_start_at
FROM public.event_registrations er
WHERE er.status = 'self_certified' AND er.certification_start_at IS NOT NULL;
