import { useState, useEffect } from 'react';
import { Shield, MapPin, Clock, Loader2, AlertCircle, CheckCircle2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCertificationEligibility } from '@/hooks/useCertificationEligibility';
import { FaceMatchVerification } from './FaceMatchVerification';
import { CertificationQRCode } from './CertificationQRCode';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CertificationCardProps {
  eventStartDate: string;
  eventEndDate: string;
  eventLatitude: number | null;
  eventLongitude: number | null;
  eventName: string;
  eventId: string;
  userId: string;
  registrationId: string;
  faceMatchPassed?: boolean;
  qrToken?: string | null;
  attendedAt?: string | null;
}

export const CertificationCard = ({
  eventStartDate,
  eventEndDate,
  eventLatitude,
  eventLongitude,
  eventName,
  eventId,
  userId,
  registrationId,
  faceMatchPassed = false,
  qrToken = null,
  attendedAt = null,
}: CertificationCardProps) => {
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);
  const [showFaceMatch, setShowFaceMatch] = useState(false);
  const [localFaceMatchPassed, setLocalFaceMatchPassed] = useState(faceMatchPassed);
  const [localQrToken, setLocalQrToken] = useState(qrToken);
  
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

  // Auto-request location on mount
  useEffect(() => {
    if (!hasRequestedLocation) {
      setHasRequestedLocation(true);
      requestLocation();
    }
  }, [hasRequestedLocation, requestLocation]);

  // Update local state when props change
  useEffect(() => {
    setLocalFaceMatchPassed(faceMatchPassed);
    setLocalQrToken(qrToken);
  }, [faceMatchPassed, qrToken]);

  const handleStartCertification = () => {
    setShowFaceMatch(true);
  };

  const handleFaceMatchSuccess = () => {
    setLocalFaceMatchPassed(true);
  };

  const handleRetryLocation = () => {
    requestLocation();
  };

  // Format event date for display
  const formatEventDate = () => {
    const start = new Date(eventStartDate);
    const end = new Date(eventEndDate);
    return `${format(start, "d MMMM yyyy 'à' HH:mm", { locale: fr })} - ${format(end, "HH:mm", { locale: fr })}`;
  };

  // If event is over and user didn't certify, show nothing
  if (isAfterEvent && !attendedAt) {
    return null;
  }

  // If event has no coordinates, don't show certification
  if (eventLatitude === null || eventLongitude === null) {
    return null;
  }

  // If already fully certified (attended)
  if (attendedAt) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-foreground">Présence certifiée</h3>
        </div>
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm">
            Certifié le {format(new Date(attendedAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
          </span>
        </div>
      </div>
    );
  }

  // If Face Match passed but not yet scanned by admin - show QR code
  if (localFaceMatchPassed && localQrToken) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">QR Code de certification</h3>
        </div>
        <CertificationQRCode
          qrToken={localQrToken}
          registrationId={registrationId}
          eventName={eventName}
          eventDate={formatEventDate()}
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

            {/* Time status */}
            {!isWithinTimeWindow && timeMessage && (
              <div className="flex items-start gap-2 text-muted-foreground bg-muted/30 rounded-md p-3">
                <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="text-sm">{timeMessage}</span>
              </div>
            )}

            {/* Location status */}
            {isWithinTimeWindow && (
              <>
                {isLoadingLocation ? (
                  <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 rounded-md p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Vérification de votre position...</span>
                  </div>
                ) : permissionDenied ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-destructive bg-destructive/10 rounded-md p-3">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span className="text-sm">Accès à la position refusé. Autorisez la géolocalisation dans les paramètres de votre navigateur.</span>
                    </div>
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

      {/* Face Match Dialog */}
      <FaceMatchVerification
        isOpen={showFaceMatch}
        onClose={() => setShowFaceMatch(false)}
        userId={userId}
        eventId={eventId}
        registrationId={registrationId}
        eventName={eventName}
        eventDate={formatEventDate()}
        onSuccess={handleFaceMatchSuccess}
      />
    </>
  );
};
