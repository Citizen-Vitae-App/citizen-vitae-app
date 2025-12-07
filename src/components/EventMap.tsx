import { useEffect, useRef, useState, useCallback } from 'react';
import mapMarkerIcon from '@/assets/map-marker.svg';

interface EventMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  iconUrl?: string;
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyDxIu4kXGdomUkhgAdalCzHB_b41IXzGkA';

const EventMap = ({ lat, lng, zoom = 14, iconUrl }: EventMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const markerRef = useRef<google.maps.OverlayView | null>(null);
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const markerIcon = iconUrl || mapMarkerIcon;

  // Cleanup function
  const cleanupOverlays = useCallback(() => {
    if (listenerRef.current) {
      google.maps.event.removeListener(listenerRef.current);
      listenerRef.current = null;
    }
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  }, []);

  // Load Google Maps API
  useEffect(() => {
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already loading
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      
      const timeout = setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.google?.maps) setError(true);
      }, 10000);

      return () => {
        clearInterval(checkLoaded);
        clearTimeout(timeout);
      };
    }

    // Load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setError(true);
    document.head.appendChild(script);
  }, []);

  // Initialize map and overlays
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google?.maps) return;

    // Clean up existing overlays FIRST
    cleanupOverlays();

    const position = { lat, lng };

    // Create or reuse the map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: position,
        zoom: zoom,
        gestureHandling: 'cooperative',
        scrollwheel: false,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
    } else {
      mapInstanceRef.current.setCenter(position);
      mapInstanceRef.current.setZoom(zoom);
    }

    const map = mapInstanceRef.current;

    // Create circle - always visible, scales naturally with zoom (500m real distance)
    const circle = new google.maps.Circle({
      map,
      center: position,
      radius: 500,
      fillColor: '#0552B5',
      fillOpacity: 0.15,
      strokeColor: '#0552B5',
      strokeOpacity: 0.3,
      strokeWeight: 1,
    });
    circleRef.current = circle;

    // Custom Marker using OverlayView for pixel-perfect positioning
    class CustomMarker extends google.maps.OverlayView {
      private position: google.maps.LatLng;
      private div: HTMLDivElement | null = null;
      private iconUrl: string;

      constructor(position: google.maps.LatLngLiteral, iconUrl: string) {
        super();
        this.position = new google.maps.LatLng(position.lat, position.lng);
        this.iconUrl = iconUrl;
      }

      onAdd() {
        this.div = document.createElement('div');
        this.div.style.position = 'absolute';
        this.div.style.cursor = 'pointer';
        this.div.style.width = '100px';
        this.div.style.height = '100px';
        this.div.style.transform = 'translate(-50%, -50%)';

        const img = document.createElement('img');
        img.src = this.iconUrl;
        img.alt = 'Event location';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))';
        this.div.appendChild(img);

        const panes = this.getPanes();
        panes?.overlayMouseTarget.appendChild(this.div);
      }

      draw() {
        if (!this.div) return;
        const projection = this.getProjection();
        if (!projection) return;
        
        const pos = projection.fromLatLngToDivPixel(this.position);
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

    const marker = new CustomMarker(position, markerIcon);
    marker.setMap(map);
    markerRef.current = marker;

    // Return cleanup function
    return cleanupOverlays;
  }, [isLoaded, lat, lng, zoom, markerIcon, cleanupOverlays]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupOverlays();
      mapInstanceRef.current = null;
    };
  }, [cleanupOverlays]);

  if (error) {
    return (
      <div className="h-[450px] w-full rounded-lg bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Impossible de charger la carte</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-[450px] w-full rounded-lg bg-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <div ref={mapRef} className="h-[450px] w-full rounded-lg overflow-hidden" />;
};

export default EventMap;
