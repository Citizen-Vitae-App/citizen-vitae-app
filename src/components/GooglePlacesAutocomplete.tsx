import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, LocateFixed, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PlaceResult {
  address: string;
  latitude: number;
  longitude: number;
}

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceResult) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  hasError?: boolean;
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Ajouter un lieu",
  className,
  inputClassName,
  hasError,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    
    if (win.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    const checkGoogleMaps = setInterval(() => {
      if (win.google?.maps?.places) {
        setIsLoaded(true);
        clearInterval(checkGoogleMaps);
      }
    }, 100);

    return () => clearInterval(checkGoogleMaps);
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;

    autocompleteRef.current = new win.google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      fields: ['formatted_address', 'geometry', 'name'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      
      if (place?.geometry?.location) {
        const result: PlaceResult = {
          address: place.formatted_address || place.name || '',
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
        };
        
        onChange(result.address);
        onPlaceSelect(result);
      }
    });
  }, [isLoaded, onChange, onPlaceSelect]);

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation || isLocating) return;

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        if (win.google?.maps) {
          const geocoder = new win.google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (results: any, status: string) => {
              setIsLocating(false);
              if (status === 'OK' && results?.[0]) {
                const address = results[0].formatted_address;
                onChange(address);
                onPlaceSelect({ address, latitude, longitude });
              }
            }
          );
        } else {
          setIsLocating(false);
          onPlaceSelect({ address: `${latitude}, ${longitude}`, latitude, longitude });
        }
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [isLocating, onChange, onPlaceSelect]);

  return (
    <div className={cn("relative", className)}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("pl-10 pr-10", hasError && "border-destructive focus-visible:ring-destructive", inputClassName)}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-black/5 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Utiliser ma position actuelle</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
