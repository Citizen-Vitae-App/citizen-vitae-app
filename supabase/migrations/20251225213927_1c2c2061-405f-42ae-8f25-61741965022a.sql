-- Create table for pending invitations/contributors
CREATE TABLE public.organization_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id),
  custom_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(organization_id, email)
);

-- Enable RLS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Organization admins can view invitations
CREATE POLICY "Organization admins can view invitations"
ON public.organization_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organization_invitations.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role = 'admin'
  )
);

-- Organization admins can insert invitations
CREATE POLICY "Organization admins can insert invitations"
ON public.organization_invitations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organization_invitations.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role = 'admin'
  )
);

-- Organization admins can update invitations
CREATE POLICY "Organization admins can update invitations"
ON public.organization_invitations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organization_invitations.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role = 'admin'
  )
);

-- Organization admins can delete invitations
CREATE POLICY "Organization admins can delete invitations"
ON public.organization_invitations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organization_invitations.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role = 'admin'
  )
);

-- Super admins can manage all invitations
CREATE POLICY "Super admins can manage all invitations"
ON public.organization_invitations
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- Create index for faster lookups
CREATE INDEX idx_organization_invitations_org_id ON public.organization_invitations(organization_id);
CREATE INDEX idx_organization_invitations_email ON public.organization_invitations(email);
CREATE INDEX idx_organization_invitations_status ON public.organization_invitations(status);