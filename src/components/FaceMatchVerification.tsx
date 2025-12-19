import { useState, useEffect } from 'react';
import { Shield, Loader2, XCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CameraCapture } from './CameraCapture';
import { CertificationQRCode } from './CertificationQRCode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type VerificationStage = 'instructions' | 'camera' | 'processing' | 'success' | 'qr-code' | 'error';

interface FaceMatchVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  eventId: string;
  registrationId: string;
  eventName: string;
  eventDate: string;
  existingQrToken?: string | null;
  onSuccess: () => void;
}

export const FaceMatchVerification = ({
  isOpen,
  onClose,
  userId,
  eventId,
  registrationId,
  eventName,
  eventDate,
  existingQrToken,
  onSuccess,
}: FaceMatchVerificationProps) => {
  // If we already have a QR token, go directly to qr-code stage
  const initialStage: VerificationStage = existingQrToken ? 'qr-code' : 'instructions';
  const [stage, setStage] = useState<VerificationStage>(initialStage);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [qrToken, setQrToken] = useState<string>(existingQrToken || '');

  // Auto-transition from success to qr-code
  useEffect(() => {
    if (stage === 'success' && qrToken) {
      const timer = setTimeout(() => {
        setStage('qr-code');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [stage, qrToken]);

  const handleStartCapture = () => {
    setStage('camera');
  };

  const handleCapture = async (imageBase64: string) => {
    setStage('processing');

    try {
      // Call Edge Function for face match
      const { data, error } = await supabase.functions.invoke('didit-verification', {
        body: {
          action: 'face-match',
          user_id: userId,
          event_id: eventId,
          registration_id: registrationId,
          live_selfie_base64: imageBase64,
        },
      });

      if (error) {
        console.error('Face match error:', error);
        setErrorMessage('Une erreur est survenue lors de la vérification.');
        setStage('error');
        return;
      }

      if (!data.success) {
        console.error('Face match failed:', data.error);
        
        // Handle needs_reverification case
        if (data.needs_reverification) {
          setErrorMessage('Votre vérification d\'identité a expiré. Veuillez retourner dans les paramètres pour re-vérifier votre identité.');
        } else {
          setErrorMessage(data.error || 'La vérification a échoué.');
        }
        setStage('error');
        return;
      }

      if (!data.passed) {
        setErrorMessage(`Le score de correspondance est insuffisant (${Math.round(data.score)}%). Veuillez réessayer.`);
        setStage('error');
        return;
      }

      // Face match passed
      const token = data.qr_token;
      console.log('[FaceMatch] Success! qr_token received:', token, 'cached:', data.cached);

      if (!token) {
        console.error('[FaceMatch] No QR token received from server');
        setErrorMessage('Erreur: aucun QR code généré. Veuillez réessayer.');
        setStage('error');
        return;
      }

      setQrToken(token);
      onSuccess();

      // If cached result, skip animation and go directly to QR code
      if (data.cached) {
        setStage('qr-code');
        toast.success('Face Match déjà validé !');
      } else {
        // Show success animation then transition to QR code
        setStage('success');
        toast.success('Face Match validé !');
      }
    } catch (err) {
      console.error('Face match error:', err);
      setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
      setStage('error');
    }
  };

  const handleRetry = () => {
    setErrorMessage('');
    setStage('instructions');
  };

  const handleClose = () => {
    // Reset to initial stage based on whether we have an existing token
    setStage(existingQrToken ? 'qr-code' : 'instructions');
    setErrorMessage('');
    setQrToken(existingQrToken || '');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">Certification de présence</DialogTitle>
        
        {stage === 'instructions' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground text-center">
              Certification de présence
            </h2>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Pour certifier votre présence, nous allons comparer votre visage avec votre photo d'identité vérifiée.
              </p>
              <p className="text-sm text-muted-foreground">
                Assurez-vous d'être dans un endroit bien éclairé.
              </p>
            </div>
            <Button
              onClick={handleStartCapture}
              className="w-full mt-4"
              style={{ backgroundColor: '#012573' }}
            >
              Commencer
            </Button>
          </div>
        )}

        {stage === 'camera' && (
          <CameraCapture
            onCapture={handleCapture}
            onCancel={handleClose}
          />
        )}

        {stage === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center">
              Vérification en cours...
            </p>
          </div>
        )}

        {stage === 'success' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-scale-in">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400 text-center animate-fade-in">
              Identité vérifiée !
            </p>
            <p className="text-sm text-muted-foreground text-center animate-fade-in">
              Génération du QR code...
            </p>
          </div>
        )}

        {stage === 'qr-code' && (
          qrToken ? (
            <CertificationQRCode
              qrToken={qrToken}
              registrationId={registrationId}
              eventName={eventName}
              eventDate={eventDate}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground text-center">
                Génération du QR code...
              </p>
            </div>
          )
        )}

        {stage === 'error' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground text-center">
              Échec de la vérification
            </h2>
            <div className="flex items-start gap-2 text-muted-foreground bg-muted/30 rounded-md p-3 w-full">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
              <span className="text-sm">{errorMessage}</span>
            </div>
            <div className="flex gap-2 w-full mt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Annuler
              </Button>
              <Button
                onClick={handleRetry}
                className="flex-1"
                style={{ backgroundColor: '#012573' }}
              >
                Réessayer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
