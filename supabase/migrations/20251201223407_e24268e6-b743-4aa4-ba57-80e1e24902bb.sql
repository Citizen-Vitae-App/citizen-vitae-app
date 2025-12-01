-- Create event_cause_themes junction table
CREATE TABLE public.event_cause_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  cause_theme_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT event_cause_themes_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT event_cause_themes_cause_theme_id_fkey FOREIGN KEY (cause_theme_id) REFERENCES public.cause_themes(id) ON DELETE CASCADE,
  UNIQUE(event_id, cause_theme_id)
);

-- Enable Row Level Security
ALTER TABLE public.event_cause_themes ENABLE ROW LEVEL SECURITY;

-- Everyone can view cause themes for public events
CREATE POLICY "Everyone can view event cause themes for public events"
ON public.event_cause_themes
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_cause_themes.event_id
    AND events.is_public = true
  )
);

-- Organization members can view their event cause themes
CREATE POLICY "Organization members can view their event cause themes"
ON public.event_cause_themes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events
    JOIN public.organization_members ON organization_members.organization_id = events.organization_id
    WHERE events.id = event_cause_themes.event_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Organization admins can insert event cause themes
CREATE POLICY "Organization admins can insert event cause themes"
ON public.event_cause_themes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events
    JOIN public.organization_members ON organization_members.organization_id = events.organization_id
    WHERE events.id = event_cause_themes.event_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role = 'admin'
  )
);

-- Organization admins can delete event cause themes
CREATE POLICY "Organization admins can delete event cause themes"
ON public.event_cause_themes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events
    JOIN public.organization_members ON organization_members.organization_id = events.organization_id
    WHERE events.id = event_cause_themes.event_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role = 'admin'
  )
);

-- Super admins can view all event cause themes
CREATE POLICY "Super admins can view all event cause themes"
ON public.event_cause_themes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- Super admins can delete event cause themes
CREATE POLICY "Super admins can delete event cause themes"
ON public.event_cause_themes
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));