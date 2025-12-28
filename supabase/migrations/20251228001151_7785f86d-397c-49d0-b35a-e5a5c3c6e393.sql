-- Add role and custom_role_title columns to organization_invitations
ALTER TABLE public.organization_invitations 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'member',
ADD COLUMN IF NOT EXISTS custom_role_title text;

-- Update the trigger function to use the role from the invitation
CREATE OR REPLACE FUNCTION public.handle_pending_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Find any pending invitations for this user's email
  FOR invitation_record IN 
    SELECT id, organization_id, status, role, custom_role_title
    FROM public.organization_invitations 
    WHERE email = NEW.email 
      AND status = 'pending'
  LOOP
    -- Add user as member of the organization with the role from invitation
    INSERT INTO public.organization_members (organization_id, user_id, role, custom_role_title)
    VALUES (
      invitation_record.organization_id, 
      NEW.id, 
      COALESCE(invitation_record.role, 'member'),
      invitation_record.custom_role_title
    )
    ON CONFLICT DO NOTHING;
    
    -- Update invitation status to accepted
    UPDATE public.organization_invitations 
    SET status = 'accepted', responded_at = now()
    WHERE id = invitation_record.id;
  END LOOP;
  
  RETURN NEW;
END;
$$;