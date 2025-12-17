import { useState } from 'react';
import { BadgeCheck, IdCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IdentityVerificationCardProps {
  userId: string;
  isVerified: boolean;
  onVerificationStarted?: () => void;
}

export const IdentityVerificationCard = ({ 
  userId, 
  isVerified,
  onVerificationStarted 
}: IdentityVerificationCardProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleStartVerification = async () => {
    setIsLoading(true);
    
    try {
      console.log('[IdentityVerificationCard] Starting verification for user:', userId);
      
      const { data, error } = await supabase.functions.invoke('didit-verification', {
        body: {
          action: 'create-session',
          user_id: userId,
          callback_url: `${window.location.origin}/settings`,
        },
      });

      if (error) {
        console.error('[IdentityVerificationCard] Error:', error);
        toast.error('Erreur lors du démarrage de la vérification');
        return;
      }

      if (data?.verification_url) {
        console.log('[IdentityVerificationCard] Redirecting to:', data.verification_url);
        onVerificationStarted?.();
        // Open Didit verification in new window or redirect
        window.open(data.verification_url, '_blank');
      } else {
        toast.error('Impossible de démarrer la vérification');
      }
    } catch (err) {
      console.error('[IdentityVerificationCard] Error:', err);
      toast.error('Erreur lors de la vérification');
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="relative">
            <IdCard className="h-12 w-12 text-green-600" />
            <BadgeCheck className="h-5 w-5 text-green-600 absolute -bottom-1 -right-1 bg-green-50 rounded-full" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-green-800 mb-1">Identité vérifiée</h3>
        <p className="text-sm text-green-600">
          Votre identité a été vérifiée avec succès
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
      <div className="flex justify-center mb-3">
        <div className="relative">
          <IdCard className="h-12 w-12 text-primary" />
          <BadgeCheck className="h-5 w-5 text-primary absolute -bottom-1 -right-1 bg-blue-50 rounded-full" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2">Vérifier votre identité</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Veuillez vous munir de votre passeport ou carte nationale d'identité pour vérifier votre profil et recevoir vos certificats
      </p>
      <Button
        onClick={handleStartVerification}
        disabled={isLoading}
        className="bg-primary hover:bg-primary/90"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Chargement...
          </>
        ) : (
          'Démarrer'
        )}
      </Button>
    </div>
  );
};
