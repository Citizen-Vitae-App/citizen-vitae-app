-- Fix the handle_pending_invitation trigger to exclude owner invitations
-- Owner invitations should ONLY be handled by accept_owner_invitation RPC

CREATE OR REPLACE FUNCTION public.handle_pending_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Find any pending invitations for this user's email
  -- EXCLUDE 'owner' type - those are handled by accept_owner_invitation RPC
  FOR invitation_record IN 
    SELECT id, organization_id, status, role, custom_role_title, team_id, invitation_type
    FROM public.organization_invitations 
    WHERE email = NEW.email 
      AND status = 'pending'
      AND invitation_type != 'owner'
  LOOP
    -- Only add to organization_members if it's a member invitation
    IF invitation_record.invitation_type = 'member' THEN
      INSERT INTO public.organization_members (organization_id, user_id, role, custom_role_title)
      VALUES (
        invitation_record.organization_id, 
        NEW.id, 
        COALESCE(invitation_record.role, 'member'),
        invitation_record.custom_role_title
      )
      ON CONFLICT DO NOTHING;
      
      -- Add to team if team_id is specified
      IF invitation_record.team_id IS NOT NULL THEN
        INSERT INTO public.team_members (team_id, user_id, is_leader)
        VALUES (invitation_record.team_id, NEW.id, false)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
    
    -- Update invitation status to accepted (but NOT for owner type)
    UPDATE public.organization_invitations 
    SET status = 'accepted', responded_at = now()
    WHERE id = invitation_record.id;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Fix existing broken invitation for frank@citizenvitae.com
UPDATE public.organization_invitations 
SET status = 'pending', responded_at = NULL
WHERE email = 'frank@citizenvitae.com' 
  AND invitation_type = 'owner' 
  AND status = 'accepted';