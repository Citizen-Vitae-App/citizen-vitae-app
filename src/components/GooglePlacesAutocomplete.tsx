import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Ajouter un lieu",
  className,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    
    // Check if Google Maps is already loaded
    if (win.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    // Wait for Google Maps to load
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

    // Initialize autocomplete
    autocompleteRef.current = new win.google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      fields: ['formatted_address', 'geometry', 'name'],
    });

    // Listen for place selection
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

  return (
    <div className={cn("relative", className)}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 bg-transparent border-0 outline-none text-lg placeholder:text-muted-foreground/50"
      />
    </div>
  );
}
