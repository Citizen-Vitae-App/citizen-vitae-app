-- Create a function to link pending invitations to organization members when user is created
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
    SELECT id, organization_id, status
    FROM public.organization_invitations 
    WHERE email = NEW.email 
      AND status = 'pending'
  LOOP
    -- Add user as member of the organization with default 'member' role
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (invitation_record.organization_id, NEW.id, 'member')
    ON CONFLICT DO NOTHING;
    
    -- Update invitation status to accepted
    UPDATE public.organization_invitations 
    SET status = 'accepted', responded_at = now()
    WHERE id = invitation_record.id;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger to check for pending invitations after user profile is created
CREATE TRIGGER on_profile_created_check_invitations
  AFTER INSERT ON public.profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_pending_invitation();