-- Add latitude and longitude columns to events table
ALTER TABLE public.events
ADD COLUMN latitude NUMERIC,
ADD COLUMN longitude NUMERIC;