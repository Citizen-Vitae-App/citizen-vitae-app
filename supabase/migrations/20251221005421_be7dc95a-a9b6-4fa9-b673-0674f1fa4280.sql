-- Add type column to organizations table for multi-tenant organization categorization
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'association';

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.type IS 'Organization type: company | association | foundation | institution';