-- Add certification tracking columns to event_registrations
ALTER TABLE public.event_registrations 
ADD COLUMN certification_start_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN certification_end_at TIMESTAMP WITH TIME ZONE NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.event_registrations.certification_start_at IS 'First QR scan timestamp (arrival)';
COMMENT ON COLUMN public.event_registrations.certification_end_at IS 'Second QR scan timestamp (departure)';