-- Remove the policy that still exposes all columns to anon users
DROP POLICY IF EXISTS "Allow public certificate lookup by id" ON public.event_registrations;