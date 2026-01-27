-- Migration pour ajouter une fonction de suppression de compte utilisateur
-- Cette fonction supprime toutes les données de l'utilisateur et son compte auth

CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Exécuté avec les privilèges du propriétaire (nécessaire pour supprimer de auth.users)
SET search_path = public
AS $$
DECLARE
  result_message TEXT;
  deleted_count INT := 0;
BEGIN
  -- Vérifier que l'utilisateur qui appelle est bien celui qui veut supprimer son compte
  IF auth.uid() != user_id_to_delete THEN
    RAISE EXCEPTION 'Vous ne pouvez supprimer que votre propre compte';
  END IF;

  -- Supprimer les données dans l'ordre (en respectant les contraintes de clés étrangères)
  
  -- 1. Supprimer les préférences utilisateur
  DELETE FROM user_preferences WHERE user_id = user_id_to_delete;
  
  -- 2. Supprimer les thèmes de causes
  DELETE FROM user_cause_themes WHERE user_id = user_id_to_delete;
  
  -- 3. Supprimer les favoris (la table s'appelle user_favorites)
  DELETE FROM user_favorites WHERE user_id = user_id_to_delete;
  
  -- 4. Supprimer les notifications
  DELETE FROM notifications WHERE user_id = user_id_to_delete;
  
  -- 5. Supprimer les superviseurs d'événements
  DELETE FROM event_supervisors WHERE user_id = user_id_to_delete;
  
  -- 6. Supprimer les inscriptions aux événements (inclut les certificats)
  -- Note: Les certificats sont stockés dans event_registrations (certificate_id, certificate_data)
  DELETE FROM event_registrations WHERE user_id = user_id_to_delete;
  
  -- 7. Supprimer des équipes
  DELETE FROM team_members WHERE user_id = user_id_to_delete;
  
  -- 8. Supprimer des organisations (en tant que membre)
  DELETE FROM organization_members WHERE user_id = user_id_to_delete;
  
  -- 9. Supprimer les invitations (envoyées ou reçues)
  DELETE FROM organization_invitations WHERE invited_by = user_id_to_delete OR email = (
    SELECT email FROM auth.users WHERE id = user_id_to_delete
  );
  
  -- 10. Supprimer les rôles
  DELETE FROM user_roles WHERE user_id = user_id_to_delete;
  
  -- 11. Supprimer le profil
  DELETE FROM profiles WHERE id = user_id_to_delete;
  
  -- 12. Supprimer l'utilisateur de auth.users (nécessite SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    result_message := 'Compte utilisateur supprimé avec succès';
  ELSE
    result_message := 'Aucun compte trouvé pour cet utilisateur';
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', result_message
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Erreur lors de la suppression: ' || SQLERRM
    );
END;
$$;

-- Ajouter un commentaire pour documenter la fonction
COMMENT ON FUNCTION delete_user_account IS 'Supprime définitivement un compte utilisateur et toutes ses données associées. Peut uniquement être appelée par l''utilisateur lui-même.';
