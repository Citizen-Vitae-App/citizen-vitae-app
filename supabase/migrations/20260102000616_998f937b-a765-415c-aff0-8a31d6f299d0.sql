-- Create RPC function to accept owner invitation (bypasses RLS via SECURITY DEFINER)
-- This function allows an invited owner to "claim" their organization

CREATE OR REPLACE FUNCTION public.accept_owner_invitation(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_email text;
  invitation_record RECORD;
  result jsonb;
BEGIN
  -- Require authentication
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Get caller's email from auth.users (using JWT claims)
  SELECT email INTO caller_email FROM auth.users WHERE id = caller_id;
  
  IF caller_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Could not retrieve user email');
  END IF;
  
  -- Find a pending owner invitation for this org and email
  SELECT id, organization_id, role, custom_role_title
  INTO invitation_record
  FROM public.organization_invitations
  WHERE organization_id = _org_id
    AND LOWER(email) = LOWER(caller_email)
    AND invitation_type = 'owner'
    AND status = 'pending'
  LIMIT 1;
  
  IF invitation_record.id IS NULL THEN
    -- Check if user is already a member (maybe they already accepted)
    IF EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = _org_id AND user_id = caller_id
    ) THEN
      RETURN jsonb_build_object('success', true, 'message', 'Already a member of this organization');
    END IF;
    
    RETURN jsonb_build_object('success', false, 'error', 'No valid owner invitation found for this organization');
  END IF;
  
  -- Create the organization membership with owner/admin privileges
  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    custom_role_title,
    is_owner
  ) VALUES (
    _org_id,
    caller_id,
    'admin',
    invitation_record.custom_role_title,
    true
  )
  ON CONFLICT (organization_id, user_id) 
  DO UPDATE SET 
    role = 'admin',
    is_owner = true;
  
  -- Update invitation status to accepted
  UPDATE public.organization_invitations
  SET status = 'accepted', responded_at = now()
  WHERE id = invitation_record.id;
  
  -- Also add organization role to user_roles if not present
  INSERT INTO public.user_roles (user_id, role)
  VALUES (caller_id, 'organization')
  ON CONFLICT DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Owner invitation accepted successfully',
    'organization_id', _org_id
  );
END;
$$;

-- Add index to speed up invitation lookups
CREATE INDEX IF NOT EXISTS idx_org_invitations_owner_lookup 
ON public.organization_invitations (organization_id, email, invitation_type, status);

-- Add unique constraint on organization_members if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organization_members_org_user_unique'
  ) THEN
    ALTER TABLE public.organization_members 
    ADD CONSTRAINT organization_members_org_user_unique 
    UNIQUE (organization_id, user_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;