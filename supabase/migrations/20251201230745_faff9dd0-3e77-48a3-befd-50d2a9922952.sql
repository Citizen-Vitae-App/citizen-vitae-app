-- Add email column to profiles table
ALTER TABLE public.profiles
ADD COLUMN email text;

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, onboarding_completed)
  VALUES (new.id, new.email, false);
  RETURN new;
END;
$$;

-- Create event_registrations table
CREATE TABLE public.event_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'approved', 'attended', 'cancelled', 'waitlist')),
  registered_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_at timestamp with time zone,
  attended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS on event_registrations
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_registrations

-- Users can view their own registrations
CREATE POLICY "Users can view their own registrations"
ON public.event_registrations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can register themselves to events
CREATE POLICY "Users can register to events"
ON public.event_registrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own registrations
CREATE POLICY "Users can update their own registrations"
ON public.event_registrations
FOR UPDATE
USING (auth.uid() = user_id);

-- Organization members can view registrations for their events
CREATE POLICY "Organization members can view their event registrations"
ON public.event_registrations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.organization_members om ON om.organization_id = e.organization_id
    WHERE e.id = event_registrations.event_id
      AND om.user_id = auth.uid()
  )
);

-- Organization admins can manage registrations for their events
CREATE POLICY "Organization admins can manage event registrations"
ON public.event_registrations
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.organization_members om ON om.organization_id = e.organization_id
    WHERE e.id = event_registrations.event_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
  )
);

-- Super admins can view all registrations
CREATE POLICY "Super admins can view all registrations"
ON public.event_registrations
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can manage all registrations
CREATE POLICY "Super admins can manage all registrations"
ON public.event_registrations
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));