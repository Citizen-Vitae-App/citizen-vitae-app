-- Extend organizations table with new columns
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public',
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS twitter_url text,
ADD COLUMN IF NOT EXISTS sector text,
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS employee_count integer;

-- Add check constraint for visibility
ALTER TABLE public.organizations 
ADD CONSTRAINT organizations_visibility_check 
CHECK (visibility IN ('public', 'private', 'invite_only'));

-- Create organization_cause_themes junction table
CREATE TABLE IF NOT EXISTS public.organization_cause_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cause_theme_id uuid NOT NULL REFERENCES public.cause_themes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, cause_theme_id)
);

-- Enable RLS on organization_cause_themes
ALTER TABLE public.organization_cause_themes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_cause_themes
CREATE POLICY "Everyone can view cause themes for public organizations"
ON public.organization_cause_themes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE organizations.id = organization_cause_themes.organization_id 
    AND organizations.visibility = 'public'
  )
);

CREATE POLICY "Organization members can view their org cause themes"
ON public.organization_cause_themes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.organization_id = organization_cause_themes.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can insert cause themes"
ON public.organization_cause_themes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.organization_id = organization_cause_themes.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role = 'admin'
  )
);

CREATE POLICY "Organization admins can delete cause themes"
ON public.organization_cause_themes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.organization_id = organization_cause_themes.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role = 'admin'
  )
);

CREATE POLICY "Super admins can manage all org cause themes"
ON public.organization_cause_themes
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::text));

-- Create storage bucket for organization assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-assets', 'organization-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for organization-assets bucket
CREATE POLICY "Anyone can view organization assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'organization-assets');

CREATE POLICY "Organization admins can upload assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'organization-assets' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Organization admins can update their assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'organization-assets'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Organization admins can delete their assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'organization-assets'
  AND auth.uid() IS NOT NULL
);