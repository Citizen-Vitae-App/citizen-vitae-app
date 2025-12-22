-- Add allow_self_certification column to events table
ALTER TABLE public.events 
ADD COLUMN allow_self_certification boolean DEFAULT false;