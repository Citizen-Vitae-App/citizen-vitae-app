import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = '@citizenvitae/location_sharing_enabled';

type LocationPreferenceContextValue = {
  /** Autorise l’accès à la position pour la certification (persisté). */
  locationSharingEnabled: boolean;
  setLocationSharingEnabled: (value: boolean) => Promise<void>;
  ready: boolean;
};

const LocationPreferenceContext = createContext<LocationPreferenceContextValue | undefined>(
  undefined
);

export function LocationPreferenceProvider({ children }: { children: ReactNode }) {
  const [locationSharingEnabled, setLocationSharingEnabledState] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw === 'false') setLocationSharingEnabledState(false);
        else if (raw === 'true') setLocationSharingEnabledState(true);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocationSharingEnabled = useCallback(async (value: boolean) => {
    setLocationSharingEnabledState(value);
    await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  }, []);

  const value = useMemo(
    () => ({
      locationSharingEnabled,
      setLocationSharingEnabled,
      ready,
    }),
    [locationSharingEnabled, setLocationSharingEnabled, ready]
  );

  return (
    <LocationPreferenceContext.Provider value={value}>{children}</LocationPreferenceContext.Provider>
  );
}

export function useLocationPreference() {
  const ctx = useContext(LocationPreferenceContext);
  if (!ctx) {
    throw new Error('useLocationPreference must be used within LocationPreferenceProvider');
  }
  return ctx;
}
