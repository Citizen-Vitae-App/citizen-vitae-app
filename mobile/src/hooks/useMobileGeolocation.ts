import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

export function useMobileGeolocation() {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const requestLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setPermissionDenied(false);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setPermissionDenied(true);
        setLatitude(null);
        setLongitude(null);
        setError(
          'Localisation refusée. Active la position pour Citizen Vitae dans les réglages de ton téléphone.'
        );
        setIsLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
    } catch (e) {
      setLatitude(null);
      setLongitude(null);
      setError(e instanceof Error ? e.message : 'Impossible d’obtenir ta position.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    latitude,
    longitude,
    error,
    isLoading,
    permissionDenied,
    requestLocation,
  };
}
