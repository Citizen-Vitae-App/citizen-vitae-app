import { useState, useEffect } from 'react';
import { Info, CheckCircle2, Loader2, QrCode, Shield, MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCertificationEligibility } from '@/hooks/useCertificationEligibility';

interface MissionCertificationButtonProps {
  eventStartDate: string;
  eventEndDate: string;
  eventLatitude: number | null;
  eventLongitude: number | null;
  allowSelfCertification?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const MissionCertificationButton = ({
  eventStartDate,
  eventEndDate,
  eventLatitude,
  eventLongitude,
  allowSelfCertification = false,
  onClick,
  disabled = false,
}: MissionCertificationButtonProps) => {
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
    timeMessage,
    locationMessage,
    isAfterEvent,
    needsGeolocation,
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

  // If event is over, don't show button
  if (isAfterEvent) {
    return null;
  }

  const handleGeolocationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    requestLocation();
  };

  // Render info message with clickable geolocation link
  const renderInfoMessage = () => {
    if (!isWithinTimeWindow) {
      return <p className="text-muted-foreground">{timeMessage}</p>;
    }
    
    // Geolocation denied or error - show detailed message
    if (permissionDenied || locationError) {
      return (
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">
              {locationError || 'Géolocalisation désactivée'}
            </p>
          </div>
          <Button
            onClick={handleGeolocationClick}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      );
    }
    
    if (needsGeolocation) {
      return (
        <div className="space-y-3">
          <p className="text-muted-foreground">
            Position non disponible. Activez la géolocalisation pour certifier votre présence.
          </p>
          <Button
            onClick={handleGeolocationClick}
            size="sm"
            className="w-full"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Activer la géolocalisation
          </Button>
        </div>
      );
    }
    
    return <p className="text-muted-foreground">{locationMessage}</p>;
  };

  if (isLoadingLocation) {
    return (
      <Button
        disabled
        className="w-full h-12 font-semibold bg-muted text-muted-foreground"
      >
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        Vérification...
      </Button>
    );
  }

  // Button label and icon based on self-certification mode
  const buttonLabel = allowSelfCertification ? 'Certifier ma présence' : 'Démarrer la mission';
  const ButtonIcon = allowSelfCertification ? Shield : QrCode;

  if (isEligible) {
    return (
      <Button
        onClick={onClick}
        disabled={disabled}
        className="w-full h-12 font-semibold"
        style={{ backgroundColor: '#012573' }}
      >
        <ButtonIcon className="h-5 w-5 mr-2" />
        {buttonLabel}
        <CheckCircle2 className="h-5 w-5 ml-2 text-green-400" />
      </Button>
    );
  }

  return (
    <div className="relative w-full">
      <Button
        disabled
        className="w-full h-12 font-semibold bg-muted text-muted-foreground pr-12"
      >
        <ButtonIcon className="h-5 w-5 mr-2" />
        {buttonLabel}
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <button 
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/5 transition-colors"
            type="button"
          >
            <Info className="h-5 w-5 text-orange-500" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 text-sm" side="top">
          {renderInfoMessage()}
        </PopoverContent>
      </Popover>
    </div>
  );
};