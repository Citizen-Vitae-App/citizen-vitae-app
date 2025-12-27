-- Phase 1: Database Schema Changes

-- 1.1 Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 Create team_members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_leader BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- 1.3 Create event_supervisors table
CREATE TABLE public.event_supervisors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- 1.4 Add is_owner column to organization_members
ALTER TABLE public.organization_members 
ADD COLUMN is_owner BOOLEAN DEFAULT false;

-- 1.5 Add team_id column to events
ALTER TABLE public.events 
ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_supervisors ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for teams
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function: Check if user is a team leader
CREATE OR REPLACE FUNCTION public.is_team_leader(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
      AND team_id = _team_id
      AND is_leader = true
  )
$$;

-- Helper function: Get user's team in an organization
CREATE OR REPLACE FUNCTION public.get_user_team_in_org(_user_id uuid, _org_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tm.team_id
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.user_id = _user_id
    AND t.organization_id = _org_id
  LIMIT 1
$$;

-- RLS Policies for teams table
CREATE POLICY "Organization members can view their org teams"
ON public.teams FOR SELECT
USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization admins can create teams"
ON public.teams FOR INSERT
WITH CHECK (is_organization_admin(auth.uid(), organization_id));

CREATE POLICY "Organization admins can update teams"
ON public.teams FOR UPDATE
USING (is_organization_admin(auth.uid(), organization_id));

CREATE POLICY "Organization admins can delete teams"
ON public.teams FOR DELETE
USING (is_organization_admin(auth.uid(), organization_id));

CREATE POLICY "Super admins can manage all teams"
ON public.teams FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for team_members table
CREATE POLICY "Organization members can view team members"
ON public.team_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.organization_members om ON om.organization_id = t.organization_id
    WHERE t.id = team_members.team_id AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage team members"
ON public.team_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_members.team_id 
    AND is_organization_admin(auth.uid(), t.organization_id)
  )
);

CREATE POLICY "Super admins can manage all team members"
ON public.team_members FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for event_supervisors table
CREATE POLICY "Event supervisors can view their assignments"
ON public.event_supervisors FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Organization members can view event supervisors"
ON public.event_supervisors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organization_members om ON om.organization_id = e.organization_id
    WHERE e.id = event_supervisors.event_id AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage event supervisors"
ON public.event_supervisors FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_supervisors.event_id 
    AND is_organization_admin(auth.uid(), e.organization_id)
  )
);

CREATE POLICY "Team leaders can manage supervisors for their team events"
ON public.event_supervisors FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.teams t ON t.id = e.team_id
    WHERE e.id = event_supervisors.event_id 
    AND is_team_leader(auth.uid(), t.id)
  )
);

CREATE POLICY "Super admins can manage all event supervisors"
ON public.event_supervisors FOR ALL
USING (has_role(auth.uid(), 'super_admin'));