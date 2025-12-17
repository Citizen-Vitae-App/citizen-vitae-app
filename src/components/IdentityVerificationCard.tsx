import { useState, useEffect, useCallback } from 'react';
import { BadgeCheck, IdCard, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface IdentityVerificationCardProps {
  userId: string;
  isVerified: boolean;
  onVerificationComplete?: () => void;
}

const STORAGE_KEY = 'didit_verification_session';

export const IdentityVerificationCard = ({ 
  userId, 
  isVerified,
  onVerificationComplete 
}: IdentityVerificationCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [verificationStarted, setVerificationStarted] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Check if there's a pending verification session
  useEffect(() => {
    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (savedSession && !isVerified) {
      setVerificationStarted(true);
    }
  }, [isVerified]);

  // Check verification status
  const checkVerificationStatus = useCallback(async () => {
    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (!savedSession || isVerified) return;

    const { sessionId } = JSON.parse(savedSession);
    
    setIsCheckingStatus(true);
    
    try {
      console.log('[IdentityVerificationCard] Checking verification status for session:', sessionId);
      
      const { data, error } = await supabase.functions.invoke('didit-verification', {
        body: {
          action: 'check-status',
          session_id: sessionId,
          user_id: userId,
        },
      });

      if (error) {
        console.error('[IdentityVerificationCard] Status check error:', error);
        return;
      }

      console.log('[IdentityVerificationCard] Status check result:', data);

      if (data?.verified) {
        // Success! Show animation and clean up
        setShowSuccessAnimation(true);
        localStorage.removeItem(STORAGE_KEY);
        
        toast.success('Identité vérifiée avec succès !', {
          description: 'Vous pouvez maintenant vous inscrire aux missions.',
          duration: 5000,
        });

        // Trigger refresh after animation
        setTimeout(() => {
          onVerificationComplete?.();
        }, 1500);
      } else if (data?.status === 'Declined' || data?.status === 'Expired') {
        localStorage.removeItem(STORAGE_KEY);
        setVerificationStarted(false);
        toast.error('La vérification a échoué', {
          description: 'Veuillez réessayer.',
        });
      }
    } catch (err) {
      console.error('[IdentityVerificationCard] Error checking status:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [userId, isVerified, onVerificationComplete]);

  // Listen for window focus to check status when user returns from Didit
  useEffect(() => {
    if (!verificationStarted || isVerified) return;

    const handleFocus = () => {
      console.log('[IdentityVerificationCard] Window focused, checking status...');
      checkVerificationStatus();
    };

    window.addEventListener('focus', handleFocus);
    
    // Also check on visibility change (for mobile)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[IdentityVerificationCard] Page visible, checking status...');
        checkVerificationStatus();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [verificationStarted, isVerified, checkVerificationStatus]);

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

      if (data?.verification_url && data?.session_id) {
        console.log('[IdentityVerificationCard] Session created:', data.session_id);
        
        // Store session for later status check
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          sessionId: data.session_id,
          userId,
          startedAt: new Date().toISOString(),
        }));
        
        setVerificationStarted(true);
        
        // Open Didit verification in new tab
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

  // Show success animation state
  if (showSuccessAnimation) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center animate-scale-in">
        <div className="flex justify-center mb-3">
          <div className="relative">
            <CheckCircle2 className="h-14 w-14 text-green-600 animate-[pulse_1s_ease-in-out]" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-green-800 mb-1">Vérification réussie !</h3>
        <p className="text-sm text-green-600">
          Votre identité a été confirmée
        </p>
      </div>
    );
  }

  // Show verified state - miniature version
  if (isVerified) {
    return (
      <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
        <BadgeCheck className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-700">Identité vérifiée</span>
      </div>
    );
  }

  // Show verification in progress state
  if (verificationStarted) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="relative">
            <IdCard className="h-12 w-12 text-amber-600" />
            <div className="absolute -bottom-1 -right-1 bg-amber-50 rounded-full p-0.5">
              <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
            </div>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-amber-800 mb-1">Vérification en cours</h3>
        <p className="text-sm text-amber-600 mb-4">
          Complétez la vérification dans l'onglet Didit puis revenez ici
        </p>
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkVerificationStatus}
            disabled={isCheckingStatus}
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            {isCheckingStatus ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vérification...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Vérifier le statut
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              setVerificationStarted(false);
            }}
            className="text-muted-foreground"
          >
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  // Default: show start verification button
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
