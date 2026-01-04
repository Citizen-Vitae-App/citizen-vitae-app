import { useState, useEffect, useCallback } from 'react';
import { BadgeCheck, IdCard, Loader2, RefreshCw, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IdentityVerificationCardProps {
  userId: string;
  isVerified: boolean;
  verificationStatus?: 'none' | 'pending' | 'in_review' | 'approved' | 'declined' | 'expired';
  sessionId?: string | null;
  onVerificationComplete?: () => void;
}

const STORAGE_KEY = 'didit_verification_session';

export const IdentityVerificationCard = ({ 
  userId, 
  isVerified,
  verificationStatus = 'none',
  sessionId,
  onVerificationComplete 
}: IdentityVerificationCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [verificationStarted, setVerificationStarted] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Validate and parse session data with security checks
  const getValidSession = useCallback(() => {
    try {
      const savedSession = sessionStorage.getItem(STORAGE_KEY);
      if (!savedSession) return null;
      
      const parsed = JSON.parse(savedSession);
      
      // Validate required fields exist
      if (!parsed.sessionId || !parsed.userId || !parsed.startedAt) {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }
      
      // Validate userId matches current user to prevent session hijacking
      if (parsed.userId !== userId) {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }
      
      // Check session expiration (1 hour max)
      const startedAt = new Date(parsed.startedAt);
      if (isNaN(startedAt.getTime()) || Date.now() - startedAt.getTime() > 60 * 60 * 1000) {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }
      
      return parsed;
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }, [userId]);

  // Check if there's a pending verification session
  useEffect(() => {
    const validSession = getValidSession();
    if (validSession && !isVerified) {
      setVerificationStarted(true);
    } else if (!validSession) {
      setVerificationStarted(false);
    }
  }, [isVerified, getValidSession]);

  // Check verification status
  const checkVerificationStatus = useCallback(async () => {
    const validSession = getValidSession();
    const sessionToCheck = validSession?.sessionId || sessionId;
    
    if (!sessionToCheck || isVerified) return;
    
    setIsCheckingStatus(true);
    
    try {
      console.log('[IdentityVerificationCard] Checking verification status for session:', sessionToCheck);
      
      const { data, error } = await supabase.functions.invoke('didit-verification', {
        body: {
          action: 'check-status',
          session_id: sessionToCheck,
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
        sessionStorage.removeItem(STORAGE_KEY);
        
        toast.success('Identité vérifiée avec succès !', {
          description: 'Vous pouvez maintenant vous inscrire aux missions.',
          duration: 5000,
        });

        // Trigger refresh after animation
        setTimeout(() => {
          onVerificationComplete?.();
        }, 1500);
      } else if (data?.status === 'In Review' || data?.status === 'Pending') {
        toast.info('Vérification en cours de revue', {
          description: 'Votre demande est traitée manuellement.',
        });
        onVerificationComplete?.(); // Refresh to get updated status
      } else if (data?.status === 'Declined' || data?.status === 'Expired') {
        sessionStorage.removeItem(STORAGE_KEY);
        setVerificationStarted(false);
        toast.error('La vérification a échoué', {
          description: 'Veuillez réessayer.',
        });
        onVerificationComplete?.();
      }
    } catch (err) {
      console.error('[IdentityVerificationCard] Error checking status:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [getValidSession, sessionId, isVerified, userId, onVerificationComplete]);

  // Listen for window focus to check status when user returns from Didit
  useEffect(() => {
    if ((!verificationStarted && verificationStatus !== 'in_review' && verificationStatus !== 'pending') || isVerified) return;

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
  }, [verificationStarted, verificationStatus, isVerified, checkVerificationStatus]);

  // Handle session deletion to restart verification
  const handleRestartVerification = async () => {
    const sessionToDelete = sessionId || getValidSession()?.sessionId;
    
    if (!sessionToDelete) {
      // No session to delete, just reset local state
      sessionStorage.removeItem(STORAGE_KEY);
      setVerificationStarted(false);
      onVerificationComplete?.();
      return;
    }
    
    setIsDeletingSession(true);
    
    try {
      console.log('[IdentityVerificationCard] Deleting session:', sessionToDelete);
      
      const { data, error } = await supabase.functions.invoke('didit-verification', {
        body: {
          action: 'delete-session',
          session_id: sessionToDelete,
          user_id: userId,
        },
      });
      
      if (error) {
        console.error('[IdentityVerificationCard] Delete session error:', error);
        toast.error('Impossible de supprimer la session');
        return;
      }
      
      if (!data?.success) {
        console.error('[IdentityVerificationCard] Delete session failed:', data);
        toast.error(data?.error || 'Impossible de supprimer la session');
        return;
      }
      
      console.log('[IdentityVerificationCard] Session deleted successfully');
      toast.success('Session supprimée', {
        description: 'Vous pouvez recommencer la vérification.',
      });
      
      sessionStorage.removeItem(STORAGE_KEY);
      setVerificationStarted(false);
      onVerificationComplete?.(); // Refresh profile data
    } catch (err) {
      console.error('[IdentityVerificationCard] Error deleting session:', err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeletingSession(false);
    }
  };

  const handleStartVerification = async () => {
    setIsLoading(true);
    
    // Open a blank window IMMEDIATELY on user click to avoid popup blockers
    // The window must be opened synchronously during the click event
    const verificationWindow = window.open('about:blank', '_blank');
    
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
        verificationWindow?.close();
        return;
      }

      console.log('[IdentityVerificationCard] Response data:', data);

      if (data?.verification_url && data?.session_id) {
        console.log('[IdentityVerificationCard] Session created:', data.session_id);
        console.log('[IdentityVerificationCard] Verification URL:', data.verification_url);
        
        // Store session for later status check (using sessionStorage for better security)
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          sessionId: data.session_id,
          userId,
          startedAt: new Date().toISOString(),
        }));
        
        setVerificationStarted(true);
        
        // Navigate the already-opened window to the verification URL
        if (verificationWindow) {
          verificationWindow.location.href = data.verification_url;
        } else {
          // Fallback: redirect current page if popup was blocked
          console.log('[IdentityVerificationCard] Popup blocked, redirecting...');
          window.location.href = data.verification_url;
        }
      } else {
        console.error('[IdentityVerificationCard] Missing verification_url or session_id in response:', data);
        toast.error('Impossible de démarrer la vérification');
        verificationWindow?.close();
      }
    } catch (err) {
      console.error('[IdentityVerificationCard] Error:', err);
      toast.error('Erreur lors de la vérification');
      verificationWindow?.close();
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
  if (isVerified && verificationStatus === 'approved') {
    return (
      <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
        <BadgeCheck className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-700">Identité vérifiée</span>
      </div>
    );
  }

  // Show manual review state (in_review or pending status)
  if (verificationStatus === 'in_review' || verificationStatus === 'pending') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="relative">
            <Clock className="h-12 w-12 text-amber-600" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-amber-800 mb-1">
          Vérification en cours de revue
        </h3>
        <p className="text-sm text-amber-600 mb-4">
          Votre vérification d'identité est en cours de revue manuelle 
          et sera traitée dans un délai maximum d'une heure.
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
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
                Actualiser le statut
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRestartVerification}
            disabled={isDeletingSession}
            className="text-muted-foreground"
          >
            {isDeletingSession ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Recommencer la vérification
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Show declined state
  if (verificationStatus === 'declined') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="relative">
            <IdCard className="h-12 w-12 text-red-600" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-red-800 mb-1">
          Vérification refusée
        </h3>
        <p className="text-sm text-red-600 mb-4">
          Votre vérification d'identité a été refusée. Veuillez réessayer avec un document valide.
        </p>
        <Button
          onClick={handleRestartVerification}
          disabled={isDeletingSession}
          className="bg-red-600 hover:bg-red-700"
        >
          {isDeletingSession ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Préparation...
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4 mr-2" />
              Réessayer la vérification
            </>
          )}
        </Button>
      </div>
    );
  }

  // Show verification in progress state (local session storage)
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
              sessionStorage.removeItem(STORAGE_KEY);
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