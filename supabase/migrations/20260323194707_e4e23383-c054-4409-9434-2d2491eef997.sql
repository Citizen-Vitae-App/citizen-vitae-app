-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can view profiles by slug" ON public.profiles;

-- Create a security definer function for public CV lookup (only returns minimal data)
CREATE OR REPLACE FUNCTION public.get_profile_by_slug(_slug text)
RETURNS TABLE(id uuid, first_name text, last_name text, avatar_url text, id_verified boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.avatar_url, p.id_verified
  FROM public.profiles p
  WHERE p.slug = _slug
  LIMIT 1;
$$;