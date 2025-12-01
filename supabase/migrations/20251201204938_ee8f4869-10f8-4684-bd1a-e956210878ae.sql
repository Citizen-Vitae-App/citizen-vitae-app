-- Assigner le rôle "organization" à david.ghouzi@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('47c28011-9484-488a-80f1-5184b68a0f86', 'organization')
ON CONFLICT (user_id, role) DO NOTHING;

-- Lier l'utilisateur à EcoAction France en tant qu'admin
INSERT INTO public.organization_members (user_id, organization_id, role)
VALUES (
  '47c28011-9484-488a-80f1-5184b68a0f86',
  '67a26ade-deec-4098-95dc-16f215f5e5dc',
  'admin'
)
ON CONFLICT DO NOTHING;