import { useEffect, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, Circle, OverlayView } from '@react-google-maps/api';
import mapMarkerIcon from '@/assets/map-marker.svg';

interface EventLocationMapProps {
  latitude: number;
  longitude: number;
  locationName: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem',
};

const EventLocationMap = ({ latitude, longitude, locationName }: EventLocationMapProps) => {
  const [apiKey, setApiKey] = useState<string>('');
  const center = { lat: latitude, lng: longitude };

  // Try to get Google Maps API key from the window object (already loaded from GooglePlacesAutocomplete)
  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      setApiKey('already-loaded');
    } else {
      // Get the API key from existing script tag or use a placeholder
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        const src = existingScript.getAttribute('src');
        const keyMatch = src?.match(/key=([^&]+)/);
        if (keyMatch) {
          setApiKey(keyMatch[1]);
        }
      }
    }
  }, []);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey === 'already-loaded' ? '' : apiKey,
  });

  // If Google Maps is already loaded from another component
  const isGoogleMapsAvailable = window.google?.maps || isLoaded;

  if (loadError) {
    return (
      <div className="h-[300px] bg-muted/30 rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Erreur lors du chargement de la carte</p>
      </div>
    );
  }

  if (!isGoogleMapsAvailable) {
    return (
      <div className="h-[300px] bg-muted/30 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={14}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      }}
    >
      {/* Blue transparent circle - 500m radius */}
      <Circle
        center={center}
        radius={500}
        options={{
          fillColor: '#0552B5',
          fillOpacity: 0.15,
          strokeColor: '#0552B5',
          strokeOpacity: 0.3,
          strokeWeight: 1,
        }}
      />

      {/* Custom marker using OverlayView */}
      <OverlayView
        position={center}
        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        getPixelPositionOffset={(width, height) => ({
          x: -(width / 2),
          y: -(height / 2),
        })}
      >
        <div className="relative">
          <img
            src={mapMarkerIcon}
            alt={locationName}
            className="w-16 h-16 drop-shadow-lg"
          />
        </div>
      </OverlayView>
    </GoogleMap>
  );
};

export default EventLocationMap;
