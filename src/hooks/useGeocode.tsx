import { useState, useEffect } from 'react';

interface GeocodeResult {
  latitude: number;
  longitude: number;
}

/**
 * Geocode an address using Google Maps Geocoder API.
 * Only triggers when lat/lng are null but address is provided.
 */
export function useGeocode(address?: string, existingLat?: number | null, existingLng?: number | null) {
  const [coords, setCoords] = useState<GeocodeResult | null>(
    existingLat != null && existingLng != null
      ? { latitude: existingLat, longitude: existingLng }
      : null
  );
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    // Already have coordinates
    if (existingLat != null && existingLng != null) {
      setCoords({ latitude: existingLat, longitude: existingLng });
      return;
    }

    if (!address) return;

    // Need to geocode - wait for Google Maps
    const tryGeocode = () => {
      if (!window.google?.maps) return false;

      setIsGeocoding(true);
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        setIsGeocoding(false);
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          setCoords({ latitude: location.lat(), longitude: location.lng() });
        }
      });
      return true;
    };

    if (tryGeocode()) return;

    // Poll for Google Maps to load
    const interval = setInterval(() => {
      if (tryGeocode()) clearInterval(interval);
    }, 200);

    const timeout = setTimeout(() => clearInterval(interval), 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [address, existingLat, existingLng]);

  return { coords, isGeocoding };
}
