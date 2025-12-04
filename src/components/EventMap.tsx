import { useEffect, useRef, useState } from 'react';

interface EventMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  iconUrl?: string;
}

const EventMap = ({ lat, lng, zoom = 15, iconUrl }: EventMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Check if Google Maps is loaded
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google?.maps?.Map && window.google?.maps?.marker?.AdvancedMarkerElement) {
        setIsLoaded(true);
        return true;
      }
      return false;
    };

    if (checkGoogleMaps()) return;

    // Poll for Google Maps to be ready
    const interval = setInterval(() => {
      if (checkGoogleMaps()) {
        clearInterval(interval);
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!window.google?.maps) {
        setError(true);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const center = { lat, lng };

    // Create map
    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapId: 'DEMO_MAP_ID',
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true,
      gestureHandling: 'greedy',
    });

    mapInstanceRef.current = map;

    // Add blue circle (500m radius)
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

    // Create marker content
    const markerContent = document.createElement('div');
    markerContent.style.width = '64px';
    markerContent.style.height = '64px';

    if (iconUrl) {
      const img = document.createElement('img');
      img.src = iconUrl;
      img.alt = 'Event location';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))';
      markerContent.appendChild(img);
    } else {
      // Default pin SVG
      markerContent.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 157 157" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="78.5" cy="78.5" r="78.5" fill="#0552B5" fill-opacity="0.25"/>
          <circle cx="79" cy="79" r="24" fill="#FFFDF8"/>
          <path d="M90.0528 68.3069L77.3104 60.8667L61.6719 69.9554V88.0222L77.444 97.1334L91.1888 89.0691L87.4687 86.8859L77.3104 92.8116L65.3699 85.8836V72.1164L77.444 65.1881L88.07 71.3811L90.0528 68.3069Z" fill="#012573"/>
          <path d="M67.5898 79.1336L73.3373 70.468L76.0327 72.2277L80.2208 82.8316L93.3642 63.072L96.082 64.8763L80.4435 88.49L78.1937 87.0197L73.8274 75.7699L70.3747 80.9382L67.5898 79.1336Z" fill="#E23428"/>
        </svg>
      `;
    }

    // Create Advanced Marker
    const marker = new window.google.maps.marker.AdvancedMarkerElement({
      map,
      position: center,
      content: markerContent,
    });

    markerRef.current = marker;

    // Cleanup
    return () => {
      if (markerRef.current) {
        markerRef.current.map = null;
      }
      mapInstanceRef.current = null;
    };
  }, [isLoaded, lat, lng, zoom, iconUrl]);

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
      className="h-[300px] w-full rounded-lg"
    />
  );
};

export default EventMap;
