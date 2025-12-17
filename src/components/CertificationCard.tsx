import { useState, useEffect } from 'react';
import { Shield, MapPin, Clock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCertificationEligibility } from '@/hooks/useCertificationEligibility';
import { toast } from 'sonner';

interface CertificationCardProps {
  eventStartDate: string;
  eventEndDate: string;
  eventLatitude: number | null;
  eventLongitude: number | null;
  eventName: string;
}

export const CertificationCard = ({
  eventStartDate,
  eventEndDate,
  eventLatitude,
  eventLongitude,
  eventName,
}: CertificationCardProps) => {
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);
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
    distanceFromEvent,
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

  const handleStartCertification = () => {
    // TODO: Integrate with Didit Face Match flow
    toast.info('Face Match à venir', {
      description: 'La certification par reconnaissance faciale sera bientôt disponible.',
    });
  };

  const handleRetryLocation = () => {
    requestLocation();
  };

  // Don't show if event is over
  if (isAfterEvent) {
    return null;
  }

  // If event has no coordinates, don't show certification
  if (eventLatitude === null || eventLongitude === null) {
    return null;
  }

  return (
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
            Démarrer la certification
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
  );
};
