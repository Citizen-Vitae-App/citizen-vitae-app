-- Create enum for roles if not exists
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'organization', 'participant');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Super admins can view all roles
CREATE POLICY "Super admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Policy: Super admins can insert roles
CREATE POLICY "Super admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Policy: Super admins can update roles
CREATE POLICY "Super admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Policy: Super admins can delete roles
CREATE POLICY "Super admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Enable RLS on organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view verified organizations
CREATE POLICY "Everyone can view verified organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (is_verified = true);

-- Policy: Organization members can view their organization
CREATE POLICY "Organization members can view their organization"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.organization_id = organizations.id
    AND organization_members.user_id = auth.uid()
  )
);

-- Policy: Super admins can view all organizations
CREATE POLICY "Super admins can view all organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Policy: Super admins can insert organizations
CREATE POLICY "Super admins can insert organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Policy: Super admins and organization admins can update their organizations
CREATE POLICY "Organization admins can update their organization"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.organization_id = organizations.id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role = 'admin'
  )
);

-- Policy: Super admins can delete organizations
CREATE POLICY "Super admins can delete organizations"
ON public.organizations
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Enable RLS on organization_members table
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view members of their organizations
CREATE POLICY "Users can view their organization members"
ON public.organization_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
  )
);

-- Policy: Super admins can view all organization members
CREATE POLICY "Super admins can view all organization members"
ON public.organization_members
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Policy: Super admins can insert organization members
CREATE POLICY "Super admins can insert organization members"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Policy: Organization admins can insert members to their organization
CREATE POLICY "Organization admins can add members"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = organization_members.organization_id
    AND user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Super admins and organization admins can update members
CREATE POLICY "Organization admins can update members"
ON public.organization_members
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role = 'admin'
  )
);

-- Policy: Super admins and organization admins can delete members
CREATE POLICY "Organization admins can delete members"
ON public.organization_members
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role = 'admin'
  )
);

-- Enable RLS on user_cause_themes table
ALTER TABLE public.user_cause_themes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own cause themes
CREATE POLICY "Users can view their own cause themes"
ON public.user_cause_themes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own cause themes
CREATE POLICY "Users can insert their own cause themes"
ON public.user_cause_themes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own cause themes
CREATE POLICY "Users can delete their own cause themes"
ON public.user_cause_themes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable RLS on cause_themes table
ALTER TABLE public.cause_themes ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view cause themes
CREATE POLICY "Everyone can view cause themes"
ON public.cause_themes
FOR SELECT
TO authenticated
USING (true);

-- Policy: Super admins can manage cause themes
CREATE POLICY "Super admins can insert cause themes"
ON public.cause_themes
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update cause themes"
ON public.cause_themes
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete cause themes"
ON public.cause_themes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));