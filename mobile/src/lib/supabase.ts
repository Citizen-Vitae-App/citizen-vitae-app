import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createSupabaseClient } from '@shared/supabase/client';

function stripEnv(raw: string | undefined): string {
  return (raw ?? '').replace(/^\uFEFF/, '').trim();
}

type SupabaseExtra = { supabaseUrl?: string; supabaseAnonKey?: string };

const extra = Constants.expoConfig?.extra as SupabaseExtra | undefined;

/** VITE_* n’est pas inliné par Metro : `app.config.js` les met dans `extra`. */
const supabaseUrl = stripEnv(
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra?.supabaseUrl
);
const supabaseAnonKey = stripEnv(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra?.supabaseAnonKey
);

/** False if .env missing or Metro was started before filling env (restart + `expo start -c`). */
export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 30;

if (!isSupabaseConfigured && __DEV__) {
  console.warn(
    '[Supabase] URL / clé anon invalides ou absents. Utilise EXPO_PUBLIC_SUPABASE_* dans mobile/.env, ou les mêmes noms que le web (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY). Puis npx expo start -c.'
  );
}

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
