-- Add is_suspended column to profiles table for user suspension
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

-- Add suspended_at timestamp to track when the user was suspended
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone;

-- Add suspended_by to track who suspended the user
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_by uuid;