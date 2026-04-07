import Constants from 'expo-constants';

type Extra = { googleMapsApiKey?: string };

export function getGoogleMapsApiKey(): string {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  return (
    strip(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) ||
    strip(extra?.googleMapsApiKey)
  );
}

function strip(v: string | undefined): string {
  return (v ?? '').replace(/^\uFEFF/, '').trim();
}
