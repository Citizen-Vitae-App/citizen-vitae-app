import { useState, useEffect } from 'react';
import { Shield, Loader2, XCircle, AlertTriangle, CheckCircle, MapPin, Calendar, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CameraCapture } from './CameraCapture';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useGeolocation } from '@/hooks/useGeolocation';

type CertificationStage = 'instructions' | 'camera' | 'processing' | 'recap' | 'confirming' | 'success' | 'error';

interface SelfCertificationFlowProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  eventId: string;
  registrationId: string;
  eventName: string;
  eventStartDate: string;
  eventEndDate: string;
  onSuccess: () => void;
}

export const SelfCertificationFlow = ({
  isOpen,
  onClose,
  userId,
  eventId,
  registrationId,
  eventName,
  eventStartDate,
  eventEndDate,
  onSuccess,
}: SelfCertificationFlowProps) => {
  const [stage, setStage] = useState<CertificationStage>('instructions');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [honorDeclaration, setHonorDeclaration] = useState(false);
  const [certificationTime, setCertificationTime] = useState<Date | null>(null);
  
  const {
    latitude: userLatitude,
    longitude: userLongitude,
    requestLocation,
  } = useGeolocation();

  // Request location when dialog opens
  useEffect(() => {
    if (isOpen) {
      requestLocation();
    }
  }, [isOpen, requestLocation]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStage('instructions');
      setErrorMessage('');
      setComment('');
      setHonorDeclaration(false);
      setCertificationTime(null);
    }
  }, [isOpen]);

  const handleStartCapture = () => {
    setStage('camera');
  };

  const handleCapture = async (imageBase64: string) => {
    setStage('processing');
    setCertificationTime(new Date());

    try {
      // Call Edge Function for face match (same as regular flow)
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

      // Face match passed, go to recap stage
      setStage('recap');
    } catch (err) {
      console.error('Face match error:', err);
      setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
      setStage('error');
    }
  };

  const handleConfirmCertification = async () => {
    if (!honorDeclaration) {
      toast.error('Veuillez confirmer la déclaration sur l\'honneur.');
      return;
    }

    setStage('confirming');

    try {
      // Update the registration with self-certification data
      const updateData: Record<string, unknown> = {
        status: 'self_certified',
        certification_start_at: certificationTime?.toISOString(),
        attended_at: new Date().toISOString(),
      };

      // Add geolocation if available (we could store it in a JSON field or as comments)
      // For now, include location info in a structured way if needed
      
      const { error } = await supabase
        .from('event_registrations')
        .update(updateData)
        .eq('id', registrationId);

      if (error) {
        console.error('Error updating registration:', error);
        setErrorMessage('Une erreur est survenue lors de l\'enregistrement.');
        setStage('error');
        return;
      }

      // Show success
      setStage('success');
      toast.success('Présence auto-certifiée avec succès !');
      
      // Wait then close
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Certification error:', err);
      setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
      setStage('error');
    }
  };

  const handleRetry = () => {
    setErrorMessage('');
    setStage('instructions');
  };

  const handleClose = () => {
    onClose();
  };

  const formatEventDate = () => {
    const start = parseISO(eventStartDate);
    const end = parseISO(eventEndDate);
    return `${format(start, "EEEE d MMMM yyyy", { locale: fr })}`;
  };

  const formatEventTime = () => {
    const start = parseISO(eventStartDate);
    const end = parseISO(eventEndDate);
    return `${format(start, "HH'h'mm", { locale: fr })} - ${format(end, "HH'h'mm", { locale: fr })}`;
  };

  const formatCurrentTime = () => {
    if (!certificationTime) return '';
    return format(certificationTime, "HH'h'mm'min'ss's'", { locale: fr });
  };

  const formatCurrentLocation = () => {
    if (userLatitude && userLongitude) {
      return `${userLatitude.toFixed(6)}, ${userLongitude.toFixed(6)}`;
    }
    return 'Non disponible';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Auto-certification de présence</DialogTitle>
        
        {stage === 'instructions' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground text-center">
              Auto-certification de présence
            </h2>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Vous allez auto-certifier votre présence à cette mission citoyenne.
              </p>
              <p className="text-sm text-muted-foreground">
                Pour vérifier votre identité, nous allons vous demander de prendre un selfie qui sera comparé à votre photo de référence.
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
              Prendre un selfie
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
              Vérification de votre identité...
            </p>
          </div>
        )}

        {stage === 'recap' && (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-semibold text-foreground">
                Identité vérifiée
              </h2>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Veuillez confirmer les informations de votre certification :
            </p>

            {/* Event recap */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-foreground">{eventName}</h3>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="capitalize">{formatEventDate()}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Horaires : {formatEventTime()}</span>
              </div>
            </div>

            {/* Current time and location */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-foreground text-sm">Certification en cours</h4>
              
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>Heure actuelle : <strong>{formatCurrentTime()}</strong></span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Position : <strong className="font-mono text-xs">{formatCurrentLocation()}</strong></span>
              </div>
            </div>

            {/* Optional comment */}
            <div className="space-y-2">
              <Label htmlFor="comment" className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Commentaire (optionnel)
              </Label>
              <Textarea
                id="comment"
                placeholder="Ajoutez un commentaire sur votre mission..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>

            {/* Honor declaration */}
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <Checkbox
                id="honor-declaration"
                checked={honorDeclaration}
                onCheckedChange={(checked) => setHonorDeclaration(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="honor-declaration" className="text-sm text-foreground leading-tight cursor-pointer">
                Je déclare sur l'honneur que je suis actuellement sur les lieux pour démarrer ma mission citoyenne.
              </Label>
            </div>

            {/* Confirm button */}
            <Button
              onClick={handleConfirmCertification}
              disabled={!honorDeclaration}
              className="w-full mt-2"
              style={{ backgroundColor: honorDeclaration ? '#012573' : undefined }}
            >
              <Shield className="h-4 w-4 mr-2" />
              Confirmer ma présence
            </Button>
          </div>
        )}

        {stage === 'confirming' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center">
              Enregistrement de votre certification...
            </p>
          </div>
        )}

        {stage === 'success' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-scale-in">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-green-600 dark:text-green-400 text-center animate-fade-in">
              Présence certifiée !
            </h2>
            <p className="text-sm text-muted-foreground text-center animate-fade-in">
              Votre auto-certification a été enregistrée avec succès.
            </p>
          </div>
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
