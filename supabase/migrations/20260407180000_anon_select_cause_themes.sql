-- Référentiel des causes : nécessaire pour les jointures (organization_cause_themes, event_cause_themes)
-- quand le client Supabase est en rôle anon (app mobile sans session).
CREATE POLICY "Anon can view cause themes"
ON public.cause_themes
FOR SELECT
TO anon
USING (true);
