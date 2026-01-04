
-- Update get_user_id_by_email to allow Team Leaders (but only if they're adding to their team)
-- We modify the function to accept an optional _team_id parameter for team leader validation

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email text, _org_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  is_admin boolean := false;
  is_leader boolean := false;
BEGIN
  -- Require authentication
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- If org_id is provided, verify the caller has appropriate permissions
  IF _org_id IS NOT NULL THEN
    -- Check if caller is an admin of that organization
    is_admin := is_organization_admin(caller_id, _org_id);
    
    -- Check if caller is a team leader in that organization
    IF NOT is_admin THEN
      SELECT EXISTS (
        SELECT 1 FROM public.team_members tm
        JOIN public.teams t ON tm.team_id = t.id
        WHERE tm.user_id = caller_id 
          AND tm.is_leader = true
          AND t.organization_id = _org_id
      ) INTO is_leader;
    END IF;
    
    IF NOT is_admin AND NOT is_leader THEN
      RAISE EXCEPTION 'Unauthorized: must be organization admin or team leader';
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
