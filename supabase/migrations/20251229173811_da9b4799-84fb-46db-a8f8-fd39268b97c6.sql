-- 1. Attribuer le rôle super_admin à harry@citizenvitae.com (multi-tenant: il garde ses rôles org séparément)
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'super_admin'
FROM public.profiles p
WHERE p.email = 'harry@citizenvitae.com'
ON CONFLICT DO NOTHING;

-- 2. Ajouter le type 'owner' aux invitations d'organisation
ALTER TABLE public.organization_invitations 
DROP CONSTRAINT IF EXISTS organization_invitations_invitation_type_check;

ALTER TABLE public.organization_invitations
ADD CONSTRAINT organization_invitations_invitation_type_check 
CHECK (invitation_type IN ('member', 'contributor', 'owner'));

-- 3. RLS policy pour que super_admin puisse voir tous les profils
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'));

-- 4. RLS policy pour que super_admin puisse gérer toutes les organisations
CREATE POLICY "Super admins can update all organizations" 
ON public.organizations FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'));

-- 5. RLS policy pour que super_admin puisse insérer des organisations
CREATE POLICY "Super admins can insert organizations via onboarding" 
ON public.organizations FOR INSERT 
WITH CHECK (true);

-- 6. RLS policy pour que super_admin puisse gérer les membres d'organisation
CREATE POLICY "Super admins can manage all organization members" 
ON public.organization_members FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));