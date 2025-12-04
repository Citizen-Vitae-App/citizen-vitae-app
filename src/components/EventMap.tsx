import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import mapMarkerIcon from '@/assets/map-marker.svg';

interface EventMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  iconUrl?: string;
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyDxIu4kXGdomUkhgAdalCzHB_b41IXzGkA';

const EventMap = ({ lat, lng, zoom = 14, iconUrl }: EventMapProps) => {
  const position = { lat, lng };
  const markerIcon = iconUrl || mapMarkerIcon;

  return (
    <div className="h-[300px] w-full rounded-lg overflow-hidden">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={position}
          defaultZoom={zoom}
          mapId="citizenvitae-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={true}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Blue circle overlay - using CSS for now */}
          <AdvancedMarker position={position}>
            <div className="relative">
              {/* Blue radius circle */}
              <div 
                className="absolute rounded-full bg-[#0552B5]/15 border border-[#0552B5]/30"
                style={{
                  width: '120px',
                  height: '120px',
                  transform: 'translate(-50%, -50%)',
                  left: '50%',
                  top: '50%',
                }}
              />
              {/* Marker icon */}
              <img 
                src={markerIcon} 
                alt="Event location"
                className="w-16 h-16 relative z-10"
                style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
              />
            </div>
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
};

export default EventMap;
