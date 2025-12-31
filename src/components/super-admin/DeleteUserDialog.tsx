import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface DeleteUserDialogProps {
  user: { id: string; full_name: string; email: string | null } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteUserDialog({ user, open, onOpenChange }: DeleteUserDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const expectedText = 'SUPPRIMER';

  const handleClose = () => {
    setStep(1);
    setConfirmText('');
    onOpenChange(false);
  };

  const handleFirstConfirm = () => {
    setStep(2);
  };

  const handleDelete = async () => {
    if (!user || confirmText !== expectedText) return;

    setIsDeleting(true);
    try {
      // 1. Remove from organization_members
      const { error: orgMembersError } = await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', user.id);

      if (orgMembersError) {
        console.error('Error deleting org members:', orgMembersError);
      }

      // 2. Remove from team_members
      const { error: teamMembersError } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', user.id);

      if (teamMembersError) {
        console.error('Error deleting team members:', teamMembersError);
      }

      // 3. Remove from event_supervisors
      const { error: supervisorsError } = await supabase
        .from('event_supervisors')
        .delete()
        .eq('user_id', user.id);

      if (supervisorsError) {
        console.error('Error deleting supervisors:', supervisorsError);
      }

      // 4. Remove from user_roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);

      if (rolesError) {
        console.error('Error deleting roles:', rolesError);
      }

      // 5. Remove user_cause_themes
      const { error: causesError } = await supabase
        .from('user_cause_themes')
        .delete()
        .eq('user_id', user.id);

      if (causesError) {
        console.error('Error deleting cause themes:', causesError);
      }

      // 6. Remove user_favorites
      const { error: favoritesError } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id);

      if (favoritesError) {
        console.error('Error deleting favorites:', favoritesError);
      }

      // 7. Remove user_preferences
      const { error: prefsError } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', user.id);

      if (prefsError) {
        console.error('Error deleting preferences:', prefsError);
      }

      // 8. Remove notifications
      const { error: notifError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (notifError) {
        console.error('Error deleting notifications:', notifError);
      }

      // 9. Update event_registrations to anonymize but keep certification data
      // We set user_id to null or keep it but clear personal references
      // Since user_id is required, we'll just leave registrations as-is
      // The profile will be deleted, so the FK reference becomes orphaned
      // This preserves certification history

      // 10. Finally delete the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      toast.success('Utilisateur supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
      handleClose();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erreur lors de la suppression de l\'utilisateur');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,25%)]">
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <AlertDialogTitle className="text-[hsl(210,40%,98%)]">
                  Supprimer l'utilisateur
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-[hsl(215,20.2%,65.1%)]">
                Êtes-vous sûr de vouloir supprimer <strong className="text-[hsl(210,40%,98%)]">{user.full_name}</strong> ?
                <br /><br />
                Cette action va :
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Supprimer le profil de l'utilisateur</li>
                  <li>Retirer l'utilisateur de toutes les organisations</li>
                  <li>Retirer l'utilisateur de toutes les équipes</li>
                  <li>Supprimer tous ses rôles et permissions</li>
                </ul>
                <br />
                <strong className="text-amber-400">Les certifications passées seront conservées</strong> pour préserver l'historique.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent border-[hsl(217.2,32.6%,25%)] text-[hsl(210,40%,98%)] hover:bg-[hsl(217.2,32.6%,25%)]">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleFirstConfirm();
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Continuer
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <div className="flex items-center gap-2 text-red-400">
                <Trash2 className="w-5 h-5" />
                <AlertDialogTitle className="text-[hsl(210,40%,98%)]">
                  Confirmation finale
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-[hsl(215,20.2%,65.1%)]">
                Pour confirmer la suppression de <strong className="text-[hsl(210,40%,98%)]">{user.full_name}</strong>, 
                tapez <strong className="text-red-400">{expectedText}</strong> ci-dessous.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="confirm" className="text-[hsl(215,20.2%,65.1%)]">
                Confirmation
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Tapez ${expectedText} pour confirmer`}
                className="mt-2 bg-[hsl(222.2,84%,4.9%)] border-[hsl(217.2,32.6%,25%)] text-[hsl(210,40%,98%)]"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={() => setStep(1)}
                className="bg-transparent border-[hsl(217.2,32.6%,25%)] text-[hsl(210,40%,98%)] hover:bg-[hsl(217.2,32.6%,25%)]"
              >
                Retour
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={confirmText !== expectedText || isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
