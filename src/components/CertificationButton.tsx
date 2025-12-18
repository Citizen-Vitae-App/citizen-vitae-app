import { useState, useEffect } from 'react';
import { Shield, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCertificationEligibility } from '@/hooks/useCertificationEligibility';

interface CertificationButtonProps {
  eventStartDate: string;
  eventEndDate: string;
  eventLatitude: number | null;
  eventLongitude: number | null;
  onClick: () => void;
  disabled?: boolean;
}

export const CertificationButton = ({
  eventStartDate,
  eventEndDate,
  eventLatitude,
  eventLongitude,
  onClick,
  disabled = false,
}: CertificationButtonProps) => {
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);
  
  const {
    latitude: userLatitude,
    longitude: userLongitude,
    isLoading: isLoadingLocation,
    requestLocation,
  } = useGeolocation();

  const {
    isEligible,
    isWithinTimeWindow,
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

  // If event has no coordinates or is over, don't show button
  if (eventLatitude === null || eventLongitude === null || isAfterEvent) {
    return null;
  }

  const infoMessage = !isWithinTimeWindow ? timeMessage : locationMessage;

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

  if (isEligible) {
    return (
      <Button
        onClick={onClick}
        disabled={disabled}
        className="w-full h-12 font-semibold"
        style={{ backgroundColor: '#012573' }}
      >
        <Shield className="h-5 w-5 mr-2" />
        Certifier ma présence
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
        <Shield className="h-5 w-5 mr-2" />
        Certifier ma présence
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
        <PopoverContent className="w-72 text-sm" side="top">
          <p className="text-muted-foreground">{infoMessage}</p>
        </PopoverContent>
      </Popover>
    </div>
  );
};
