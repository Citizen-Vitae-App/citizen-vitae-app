import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  isLoading: boolean;
  permissionDenied: boolean;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    isLoading: false,
    permissionDenied: false,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'La géolocalisation n\'est pas supportée par votre navigateur',
        isLoading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, permissionDenied: false }));

    // Detect iOS/Safari for adjusted timeout
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: isIOS ? 15000 : 10000, // More time for iOS
      maximumAge: 60000,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          isLoading: false,
          permissionDenied: false,
        });
      },
      (error) => {
        let errorMessage = 'Erreur de géolocalisation';
        let permissionDenied = false;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            permissionDenied = true;
            // Different message for iOS Safari (settings guidance)
            if (isIOS) {
              errorMessage = 'Accès refusé. Allez dans Réglages > Safari > Localisation pour réactiver.';
            } else {
              errorMessage = 'Accès refusé. Cliquez sur le cadenas dans la barre d\'adresse pour réactiver.';
            }
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position non disponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'Délai d\'attente dépassé. Réessayez.';
            break;
        }

        setState({
          latitude: null,
          longitude: null,
          error: errorMessage,
          isLoading: false,
          permissionDenied,
        });
      },
      options
    );
  }, []);

  return {
    ...state,
    requestLocation,
  };
};
