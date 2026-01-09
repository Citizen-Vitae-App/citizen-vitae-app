-- Add recurrence_group_id column to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS recurrence_group_id uuid;

-- Create index for optimized queries on series
CREATE INDEX IF NOT EXISTS idx_events_recurrence_group_id 
ON public.events(recurrence_group_id) 
WHERE recurrence_group_id IS NOT NULL;