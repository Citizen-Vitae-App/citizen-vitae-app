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
import { Ban, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

interface SuspendUserDialogProps {
  user: { id: string; full_name: string; is_suspended?: boolean } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuspendUserDialog({ user, open, onOpenChange }: SuspendUserDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const isSuspended = user?.is_suspended ?? false;

  const handleToggleSuspension = async () => {
    if (!user || !currentUser) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_suspended: !isSuspended,
          suspended_at: !isSuspended ? new Date().toISOString() : null,
          suspended_by: !isSuspended ? currentUser.id : null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(
        isSuspended 
          ? `${user.full_name} a été réactivé` 
          : `${user.full_name} a été suspendu`
      );
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error toggling suspension:', error);
      toast.error('Erreur lors de la modification du statut');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,25%)]">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            {isSuspended ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <Ban className="w-5 h-5 text-amber-400" />
            )}
            <AlertDialogTitle className="text-[hsl(210,40%,98%)]">
              {isSuspended ? 'Réactiver l\'utilisateur' : 'Suspendre l\'utilisateur'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-[hsl(215,20.2%,65.1%)]">
            {isSuspended ? (
              <>
                Voulez-vous réactiver <strong className="text-[hsl(210,40%,98%)]">{user.full_name}</strong> ?
                <br /><br />
                L'utilisateur pourra à nouveau accéder à l'application.
              </>
            ) : (
              <>
                Voulez-vous suspendre <strong className="text-[hsl(210,40%,98%)]">{user.full_name}</strong> ?
                <br /><br />
                L'utilisateur ne pourra plus accéder à l'application jusqu'à sa réactivation par un Super Admin.
                <br /><br />
                <strong className="text-amber-400">Ses données et certifications seront conservées.</strong>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-[hsl(217.2,32.6%,25%)] text-[hsl(210,40%,98%)] hover:bg-[hsl(217.2,32.6%,25%)]">
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleToggleSuspension();
            }}
            disabled={isProcessing}
            className={isSuspended 
              ? "bg-green-600 hover:bg-green-700 text-white" 
              : "bg-amber-600 hover:bg-amber-700 text-white"
            }
          >
            {isProcessing 
              ? 'Traitement...' 
              : isSuspended 
                ? 'Réactiver' 
                : 'Suspendre'
            }
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
