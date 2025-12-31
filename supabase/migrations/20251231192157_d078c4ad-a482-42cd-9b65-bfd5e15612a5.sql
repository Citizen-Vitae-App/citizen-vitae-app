-- Supprimer les invitations owner en attente pour harrybenso@hotmail.fr
DELETE FROM organization_invitations 
WHERE email = 'harrybenso@hotmail.fr' 
  AND status = 'pending' 
  AND invitation_type = 'owner';

-- Supprimer les organisations orphelines créées pour ces invitations
DELETE FROM organizations 
WHERE id IN ('dadd73f4-2d08-4b34-acf9-a3fb66642f98', '7a7b19e7-e68c-4fb6-bb80-e27fb1658726')
  AND id NOT IN (SELECT DISTINCT organization_id FROM organization_members);