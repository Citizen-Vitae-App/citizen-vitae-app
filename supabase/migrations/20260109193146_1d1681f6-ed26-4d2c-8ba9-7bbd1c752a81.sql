-- Add recurrence columns to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_frequency text,
ADD COLUMN IF NOT EXISTS recurrence_interval integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_days text[],
ADD COLUMN IF NOT EXISTS recurrence_end_type text,
ADD COLUMN IF NOT EXISTS recurrence_end_date date,
ADD COLUMN IF NOT EXISTS recurrence_occurrences integer,
ADD COLUMN IF NOT EXISTS parent_event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;

-- Add constraint for valid frequency values
ALTER TABLE public.events
ADD CONSTRAINT valid_recurrence_frequency 
CHECK (recurrence_frequency IS NULL OR recurrence_frequency IN ('daily', 'weekly', 'monthly', 'yearly'));

-- Add constraint for valid end type values
ALTER TABLE public.events
ADD CONSTRAINT valid_recurrence_end_type 
CHECK (recurrence_end_type IS NULL OR recurrence_end_type IN ('never', 'on_date', 'after_occurrences'));

-- Add index for parent_event_id for faster queries on recurring event series
CREATE INDEX IF NOT EXISTS idx_events_parent_event_id ON public.events(parent_event_id);

-- Add comment for documentation
COMMENT ON COLUMN public.events.is_recurring IS 'Whether this event repeats on a schedule';
COMMENT ON COLUMN public.events.recurrence_frequency IS 'Frequency: daily, weekly, monthly, yearly';
COMMENT ON COLUMN public.events.recurrence_interval IS 'Repeat every N frequency units (e.g., every 2 weeks)';
COMMENT ON COLUMN public.events.recurrence_days IS 'Days of week for weekly recurrence: mon, tue, wed, thu, fri, sat, sun';
COMMENT ON COLUMN public.events.recurrence_end_type IS 'How recurrence ends: never, on_date, after_occurrences';
COMMENT ON COLUMN public.events.recurrence_end_date IS 'End date if end_type is on_date';
COMMENT ON COLUMN public.events.recurrence_occurrences IS 'Number of occurrences if end_type is after_occurrences';
COMMENT ON COLUMN public.events.parent_event_id IS 'Reference to parent event for generated occurrences';