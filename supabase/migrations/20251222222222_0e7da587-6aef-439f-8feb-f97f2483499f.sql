-- Add 'self_certified' to the allowed status values for event_registrations
ALTER TABLE event_registrations 
DROP CONSTRAINT IF EXISTS event_registrations_status_check;

ALTER TABLE event_registrations 
ADD CONSTRAINT event_registrations_status_check 
CHECK (status = ANY (ARRAY['registered', 'approved', 'attended', 'cancelled', 'waitlist', 'self_certified']));