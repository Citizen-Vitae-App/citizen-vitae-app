-- Add team_id column to organization_invitations
ALTER TABLE public.organization_invitations 
ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- Fix existing pending invitations for users who already have accounts
-- This will add them to organization_members and mark invitations as accepted
DO $$
DECLARE
  inv RECORD;
  user_uuid uuid;
BEGIN
  FOR inv IN 
    SELECT oi.id, oi.organization_id, oi.email, oi.role, oi.custom_role_title, oi.team_id
    FROM public.organization_invitations oi
    WHERE oi.status = 'pending'
  LOOP
    -- Find user by email
    SELECT p.id INTO user_uuid
    FROM public.profiles p
    WHERE p.email = inv.email
    LIMIT 1;
    
    -- If user exists, add to organization and update invitation
    IF user_uuid IS NOT NULL THEN
      -- Add to organization_members (if not already)
      INSERT INTO public.organization_members (organization_id, user_id, role, custom_role_title)
      VALUES (
        inv.organization_id, 
        user_uuid, 
        COALESCE(inv.role, 'member'),
        inv.custom_role_title
      )
      ON CONFLICT DO NOTHING;
      
      -- Add to team if team_id specified
      IF inv.team_id IS NOT NULL THEN
        INSERT INTO public.team_members (team_id, user_id, is_leader)
        VALUES (inv.team_id, user_uuid, false)
        ON CONFLICT DO NOTHING;
      END IF;
      
      -- Update invitation status
      UPDATE public.organization_invitations 
      SET status = 'accepted', responded_at = now()
      WHERE id = inv.id;
      
      RAISE NOTICE 'Processed invitation for % - added to org', inv.email;
    END IF;
  END LOOP;
END;
$$;

-- Update the trigger function to handle team_id
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
    SELECT id, organization_id, status, role, custom_role_title, team_id
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
    
    -- Add to team if team_id is specified
    IF invitation_record.team_id IS NOT NULL THEN
      INSERT INTO public.team_members (team_id, user_id, is_leader)
      VALUES (invitation_record.team_id, NEW.id, false)
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Update invitation status to accepted
    UPDATE public.organization_invitations 
    SET status = 'accepted', responded_at = now()
    WHERE id = invitation_record.id;
  END LOOP;
  
  RETURN NEW;
END;
$$;