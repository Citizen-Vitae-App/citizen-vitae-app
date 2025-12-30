-- Update get_user_id_by_email function to add authorization check
-- Only organization admins can look up users by email

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email text, _org_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  -- Require authentication
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- If org_id is provided, verify the caller is an admin of that organization
  IF _org_id IS NOT NULL THEN
    IF NOT is_organization_admin(caller_id, _org_id) THEN
      RAISE EXCEPTION 'Unauthorized: must be organization admin';
    END IF;
  ELSE
    -- If no org_id provided, verify caller is admin of at least one organization
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = caller_id AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Unauthorized: must be organization admin';
    END IF;
  END IF;
  
  -- Return user ID if email exists
  RETURN (SELECT id FROM public.profiles WHERE email = _email LIMIT 1);
END;
$$;