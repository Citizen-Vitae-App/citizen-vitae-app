-- Add unique constraint on organization_id and email for upsert to work
ALTER TABLE public.organization_invitations 
ADD CONSTRAINT organization_invitations_org_email_unique 
UNIQUE (organization_id, email);