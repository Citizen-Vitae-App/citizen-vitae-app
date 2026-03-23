-- Allow anyone (even unauthenticated) to read basic profile info by slug for public CV pages
CREATE POLICY "Public can view profiles by slug"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (slug IS NOT NULL);