-- Drop problematic recursive RLS policies
DROP POLICY IF EXISTS "Users can view their organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can add members" ON public.organization_members;

-- Create a security definer function to check organization membership
CREATE OR REPLACE FUNCTION public.is_organization_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

-- Create a security definer function to check if user is admin of an organization
CREATE OR REPLACE FUNCTION public.is_organization_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'admin'
  )
$$;

-- Recreate SELECT policy: Users can view their own memberships
CREATE POLICY "Users can view their own organization memberships"
ON public.organization_members
FOR SELECT
USING (user_id = auth.uid());

-- Recreate INSERT policy: Organization admins can add members
CREATE POLICY "Organization admins can add members to their org"
ON public.organization_members
FOR INSERT
WITH CHECK (public.is_organization_admin(auth.uid(), organization_id));