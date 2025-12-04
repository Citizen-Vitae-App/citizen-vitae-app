import { useEffect, useRef, useState } from 'react';
import mapMarkerIcon from '@/assets/map-marker.svg';

interface EventLocationMapProps {
  latitude: number;
  longitude: number;
  locationName: string;
}

const EventLocationMap = ({ latitude, longitude, locationName }: EventLocationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    // Wait for Google Maps to be loaded by GooglePlacesAutocomplete
    const checkGoogleMaps = setInterval(() => {
      if (window.google?.maps) {
        setIsLoaded(true);
        clearInterval(checkGoogleMaps);
      }
    }, 100);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkGoogleMaps);
      if (!window.google?.maps) {
        setError(true);
      }
    }, 10000);

    return () => {
      clearInterval(checkGoogleMaps);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google?.maps) return;

    const center = { lat: latitude, lng: longitude };

    // Create the map
    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 14,
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
    });

    // Add blue transparent circle - 500m radius
    new window.google.maps.Circle({
      map,
      center,
      radius: 500,
      fillColor: '#0552B5',
      fillOpacity: 0.15,
      strokeColor: '#0552B5',
      strokeOpacity: 0.3,
      strokeWeight: 1,
    });

    // Create custom marker using OverlayView
    class CustomMarker extends window.google.maps.OverlayView {
      private position: google.maps.LatLng;
      private div: HTMLDivElement | null = null;

      constructor(position: google.maps.LatLngLiteral) {
        super();
        this.position = new window.google.maps.LatLng(position.lat, position.lng);
      }

      onAdd() {
        this.div = document.createElement('div');
        this.div.style.position = 'absolute';
        this.div.style.transform = 'translate(-50%, -50%)';
        this.div.innerHTML = `<img src="${mapMarkerIcon}" alt="${locationName}" style="width: 64px; height: 64px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));" />`;
        
        const panes = this.getPanes();
        panes?.overlayMouseTarget.appendChild(this.div);
      }

      draw() {
        if (!this.div) return;
        const overlayProjection = this.getProjection();
        const pos = overlayProjection.fromLatLngToDivPixel(this.position);
        if (pos) {
          this.div.style.left = pos.x + 'px';
          this.div.style.top = pos.y + 'px';
        }
      }

      onRemove() {
        if (this.div) {
          this.div.parentNode?.removeChild(this.div);
          this.div = null;
        }
      }
    }

    const marker = new CustomMarker(center);
    marker.setMap(map);

  }, [isLoaded, latitude, longitude, locationName]);

  if (error) {
    return (
      <div className="h-[300px] bg-muted/30 rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Carte non disponible</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-[300px] bg-muted/30 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      className="h-[300px] rounded-lg"
      style={{ width: '100%' }}
    />
  );
};

export default EventLocationMap;
