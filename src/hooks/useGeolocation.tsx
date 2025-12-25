import { useState, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  isLoading: boolean;
  permissionDenied: boolean;
}

// Detect platform for better error messages
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isChrome = /Chrome/.test(ua) && !/(Edge|Edg)/.test(ua);
  
  return { isIOS, isAndroid, isSafari, isChrome };
};

const getPermissionDeniedMessage = (): string => {
  const { isIOS, isAndroid, isChrome } = getDeviceInfo();
  
  if (isIOS) {
    return 'Géolocalisation refusée. Pour l\'activer : Réglages > Confidentialité > Service de localisation > Safari > "Lors de l\'utilisation"';
  }
  
  if (isAndroid && isChrome) {
    return 'Géolocalisation refusée. Appuyez sur le cadenas 🔒 à côté de l\'URL, puis sur "Autorisations" et activez "Position"';
  }
  
  if (isAndroid) {
    return 'Géolocalisation refusée. Allez dans les paramètres de votre navigateur pour autoriser la position';
  }
  
  // Desktop Chrome/Firefox/Edge
  return 'Géolocalisation refusée. Cliquez sur le cadenas 🔒 dans la barre d\'adresse, puis activez "Position"';
};

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

    const { isIOS } = getDeviceInfo();
    
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: isIOS ? 15000 : 10000,
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
            errorMessage = getPermissionDeniedMessage();
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position non disponible. Vérifiez que le GPS est activé sur votre appareil.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Délai d\'attente dépassé. Réessayez dans un endroit avec une meilleure réception.';
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
