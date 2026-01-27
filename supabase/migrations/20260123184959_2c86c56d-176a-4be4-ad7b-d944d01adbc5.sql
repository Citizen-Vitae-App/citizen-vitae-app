-- Add volunteer_count column for associations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS volunteer_count integer;