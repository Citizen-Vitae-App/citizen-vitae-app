-- Fiche organisation consultable en app mobile sans session (rôle anon), comme sur le web public.
-- Sans cette politique, les SELECT sur public.organizations renvoient 0 ligne pour anon et la bottom sheet reste vide.
CREATE POLICY "Anon can view verified organizations"
ON public.organizations
FOR SELECT
TO anon
USING (is_verified = true);
