import { useEffect, useState } from 'react';
import { getGoogleMapsApiKey } from '@/lib/googleMapsConfig';

export function useGeocodeAddress(
  address: string | undefined,
  existingLat: number | null | undefined,
  existingLng: number | null | undefined
) {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(() =>
    existingLat != null && existingLng != null ? { latitude: existingLat, longitude: existingLng } : null
  );
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    if (existingLat != null && existingLng != null) {
      setCoords({ latitude: existingLat, longitude: existingLng });
      return;
    }

    const addr = address?.trim();
    if (!addr) {
      setCoords(null);
      return;
    }

    const key = getGoogleMapsApiKey();
    if (!key) {
      setCoords(null);
      return;
    }

    let cancelled = false;
    setIsGeocoding(true);

    (async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${encodeURIComponent(key)}`;
        const res = await fetch(url);
        const json = (await res.json()) as {
          status: string;
          results?: { geometry: { location: { lat: number; lng: number } } }[];
        };
        if (cancelled || json.status !== 'OK' || !json.results?.[0]) {
          if (!cancelled) setCoords(null);
          return;
        }
        const loc = json.results[0].geometry.location;
        if (!cancelled) setCoords({ latitude: loc.lat, longitude: loc.lng });
      } catch {
        if (!cancelled) setCoords(null);
      } finally {
        if (!cancelled) setIsGeocoding(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, existingLat, existingLng]);

  return { coords, isGeocoding };
}
