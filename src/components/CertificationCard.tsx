import { useState, useEffect } from 'react';
import { Shield, MapPin, Clock, Loader2, AlertCircle, CheckCircle2, QrCode, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCertificationEligibility } from '@/hooks/useCertificationEligibility';
import { FaceMatchVerification } from './FaceMatchVerification';
import { SelfCertificationFlow } from './SelfCertificationFlow';
import { CertificationQRCode } from './CertificationQRCode';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '@/lib/logger';

interface CertificationCardProps {
  eventStartDate: string;
  eventEndDate: string;
  eventLatitude: number | null;
  eventLongitude: number | null;
  eventName: string;
  eventId: string;
  userId: string;
  registrationId: string;
  organizationId: string;
  faceMatchPassed?: boolean;
  qrToken?: string | null;
  attendedAt?: string | null;
  allowSelfCertification?: boolean | null;
  registrationStatus?: string | null;
  certificationStartAt?: string | null;
  certificationEndAt?: string | null;
}

type ScanPhase = 'idle' | 'waiting_first_scan' | 'first_scan_done' | 'fully_certified';

export const CertificationCard = ({
  eventStartDate,
  eventEndDate,
  eventLatitude,
  eventLongitude,
  eventName,
  eventId,
  userId,
  registrationId,
  organizationId,
  faceMatchPassed = false,
  qrToken = null,
  attendedAt = null,
  allowSelfCertification = false,
  registrationStatus = null,
  certificationStartAt = null,
  certificationEndAt = null,
}: CertificationCardProps) => {
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);
  const [showFaceMatch, setShowFaceMatch] = useState(false);
  const [showSelfCertification, setShowSelfCertification] = useState(false);
  const [localFaceMatchPassed, setLocalFaceMatchPassed] = useState(faceMatchPassed);
  const [localQrToken, setLocalQrToken] = useState(qrToken);
  const [localStatus, setLocalStatus] = useState(registrationStatus);
  const [localCertStartAt, setLocalCertStartAt] = useState(certificationStartAt);
  const [localCertEndAt, setLocalCertEndAt] = useState(certificationEndAt);
  const [localAttendedAt, setLocalAttendedAt] = useState(attendedAt);
  const [scanAnimating, setScanAnimating] = useState(false);
  
  const {
    latitude: userLatitude,
    longitude: userLongitude,
    isLoading: isLoadingLocation,
    error: locationError,
    permissionDenied,
    requestLocation,
  } = useGeolocation();

  const {
    isEligible,
    isWithinTimeWindow,
    isWithinLocationRadius,
    timeMessage,
    locationMessage,
    isAfterEvent,
  } = useCertificationEligibility({
    eventStartDate,
    eventEndDate,
    eventLatitude,
    eventLongitude,
    userLatitude,
    userLongitude,
    isLoadingLocation,
  });

  useEffect(() => {
    if (!hasRequestedLocation) {
      setHasRequestedLocation(true);
      requestLocation();
    }
  }, [hasRequestedLocation, requestLocation]);

  useEffect(() => {
    setLocalFaceMatchPassed(faceMatchPassed);
    setLocalQrToken(qrToken);
    setLocalStatus(registrationStatus);
    setLocalCertStartAt(certificationStartAt);
    setLocalCertEndAt(certificationEndAt);
    setLocalAttendedAt(attendedAt);
  }, [faceMatchPassed, qrToken, registrationStatus, certificationStartAt, certificationEndAt, attendedAt]);

  // Realtime subscription for scan updates
  useEffect(() => {
    if (!registrationId || !localFaceMatchPassed || !localQrToken) return;

    const channel = supabase
      .channel(`scan-updates-${registrationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_registrations',
          filter: `id=eq.${registrationId}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          logger.debug('[CertificationCard] Realtime update:', updated);

          if (updated.certification_start_at && !localCertStartAt) {
            setLocalCertStartAt(updated.certification_start_at as string);
            setScanAnimating(true);
            setTimeout(() => setScanAnimating(false), 3000);
          }

          if (updated.certification_end_at && !localCertEndAt) {
            setLocalCertEndAt(updated.certification_end_at as string);
            setLocalAttendedAt(updated.attended_at as string || updated.certification_end_at as string);
            setScanAnimating(true);
            setTimeout(() => setScanAnimating(false), 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [registrationId, localFaceMatchPassed, localQrToken, localCertStartAt, localCertEndAt]);

  const handleStartCertification = () => {
    if (allowSelfCertification) {
      setShowSelfCertification(true);
    } else {
      setShowFaceMatch(true);
    }
  };

  const handleSelfCertificationSuccess = () => {
    setLocalStatus('self_certified');
  };

  const handleFaceMatchSuccess = () => {
    setLocalFaceMatchPassed(true);
  };

  const handleRetryLocation = () => {
    requestLocation();
  };

  const formatEventDate = () => {
    const start = new Date(eventStartDate);
    const end = new Date(eventEndDate);
    return `${format(start, "d MMMM yyyy 'à' HH:mm", { locale: fr })} - ${format(end, "HH:mm", { locale: fr })}`;
  };

  const getScanPhase = (): ScanPhase => {
    if (localCertEndAt || localAttendedAt) return 'fully_certified';
    if (localCertStartAt) return 'first_scan_done';
    if (localFaceMatchPassed && localQrToken) return 'waiting_first_scan';
    return 'idle';
  };

  if (isAfterEvent && !localAttendedAt && localStatus !== 'self_certified') {
    return null;
  }

  if (eventLatitude === null || eventLongitude === null) {
    return null;
  }

  // Self-certified state
  if (localStatus === 'self_certified') {
    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-foreground">Présence auto-certifiée</h3>
        </div>
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm">
            Votre présence a été auto-certifiée avec succès
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Aucun QR code n'est nécessaire pour les missions en auto-certification.
        </p>
      </div>
    );
  }

  const scanPhase = getScanPhase();

  // Fully certified via scan
  if (scanPhase === 'fully_certified') {
    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-foreground">Présence certifiée</h3>
        </div>
        
        {/* Animated completion */}
        {scanAnimating ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative w-20 h-20 flex items-center justify-center animate-in zoom-in-50 duration-700">
              <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30" />
              <div className="absolute inset-1 rounded-full bg-green-200/50" />
              <div className="relative w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-200">
                <CheckCircle2 className="h-7 w-7 text-white" />
              </div>
            </div>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
              <span className="text-sm font-semibold text-green-700">2/2 scans validés</span>
            </div>
            
            <p className="text-sm font-medium text-green-700 text-center animate-in fade-in-0 duration-500 delay-300">
              Certification complète !
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Vous recevrez votre certification une fois la mission terminée.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">
                Certifié le {format(new Date(localAttendedAt || localCertEndAt!), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Vous recevrez votre certification une fois la mission terminée.
            </p>
          </>
        )}
      </div>
    );
  }

  // First scan done - show progress
  if (scanPhase === 'first_scan_done') {
    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Certification en cours</h3>
        </div>

        {/* Animated first scan acknowledgement */}
        {scanAnimating ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative w-20 h-20 flex items-center justify-center animate-in zoom-in-50 duration-500">
              <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-30" />
              <div className="relative w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-blue-600" />
              </div>
            </div>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 animate-in slide-in-from-bottom-4 duration-500 delay-150">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
              </div>
              <span className="text-sm font-semibold text-blue-700">1/2 scans validés</span>
            </div>
            
            <p className="text-sm font-medium text-blue-700 text-center animate-in fade-in-0 duration-500 delay-300">
              Arrivée enregistrée !
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Progress indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
              </div>
              <span className="text-xs font-semibold text-blue-700">1/2 scans validés</span>
            </div>

            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Arrivée enregistrée à {format(new Date(localCertStartAt!), "HH:mm", { locale: fr })}</span>
            </div>
          </div>
        )}

        <CertificationQRCode
          qrToken={localQrToken!}
          registrationId={registrationId}
          eventName={eventName}
          eventDate={formatEventDate()}
          scanPhase="first_scan_done"
        />

        <p className="text-xs text-muted-foreground text-center">
          L'organisateur rescannera votre QR code à votre départ pour finaliser la certification.
        </p>
      </div>
    );
  }

  // QR code shown, waiting for first scan
  if (scanPhase === 'waiting_first_scan' && !allowSelfCertification) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">QR Code de certification</h3>
        </div>
        <CertificationQRCode
          qrToken={localQrToken!}
          registrationId={registrationId}
          eventName={eventName}
          eventDate={formatEventDate()}
          scanPhase="waiting_first_scan"
        />
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Certification de présence</h3>
        </div>

        {isEligible ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Vous êtes sur place</span>
            </div>
            <Button
              onClick={handleStartCertification}
              className="w-full"
              style={{ backgroundColor: '#012573' }}
            >
              <Shield className="h-4 w-4 mr-2" />
              Certifier ma présence
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Certification non disponible</span>
            </div>

            {!isWithinTimeWindow && timeMessage && (
              <div className="flex items-start gap-2 text-muted-foreground bg-muted/30 rounded-md p-3">
                <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="text-sm">{timeMessage}</span>
              </div>
            )}

            {isWithinTimeWindow && (
              <>
                {isLoadingLocation ? (
                  <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 rounded-md p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Vérification de votre position...</span>
                  </div>
                ) : permissionDenied ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-destructive bg-destructive/10 rounded-md p-3">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span className="text-sm">{locationError || 'Géolocalisation désactivée. Activez-la dans les paramètres de votre navigateur.'}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRetryLocation} className="w-full">
                      <MapPin className="h-4 w-4 mr-2" />
                      Réactiver la localisation
                    </Button>
                  </div>
                ) : locationError ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-destructive bg-destructive/10 rounded-md p-3">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span className="text-sm">{locationError}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRetryLocation}>
                      Réessayer
                    </Button>
                  </div>
                ) : !isWithinLocationRadius && locationMessage && (
                  <div className="flex items-start gap-2 text-muted-foreground bg-muted/30 rounded-md p-3">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span className="text-sm">{locationMessage}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <FaceMatchVerification
        isOpen={showFaceMatch}
        onClose={() => setShowFaceMatch(false)}
        userId={userId}
        eventId={eventId}
        registrationId={registrationId}
        eventName={eventName}
        eventDate={formatEventDate()}
        existingQrToken={localQrToken}
        onSuccess={handleFaceMatchSuccess}
      />

      <SelfCertificationFlow
        isOpen={showSelfCertification}
        onClose={() => setShowSelfCertification(false)}
        userId={userId}
        eventId={eventId}
        registrationId={registrationId}
        eventName={eventName}
        eventStartDate={eventStartDate}
        eventEndDate={eventEndDate}
        organizationId={organizationId}
        onSuccess={handleSelfCertificationSuccess}
      />
    </>
  );
};
