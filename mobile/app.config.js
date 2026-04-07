/**
 * Lit le .env à l’évaluation de la config (comme le web avec Vite).
 * Les clés VITE_* du projet racine ne sont pas injectées dans le bundle Expo :
 * on les recopie dans `extra` pour que `src/lib/supabase.ts` puisse les lire.
 * Expériences déclaratives (manual_experiences) : même URL + anon key, pas de clé Expo dédiée.
 */
function stripEnv(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .trim();
}

module.exports = ({ config }) => {
  const supabaseUrl = stripEnv(
    process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  );
  const supabaseAnonKey = stripEnv(
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );
  const webAppOrigin = stripEnv(
    process.env.EXPO_PUBLIC_WEB_APP_ORIGIN || process.env.VITE_APP_URL || process.env.VITE_WEB_APP_ORIGIN
  );
  const googleMapsApiKey = stripEnv(
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY
  );

  return {
    ...config,
    ios: {
      ...(config.ios || {}),
      config: {
        ...((config.ios && config.ios.config) || {}),
        ...(googleMapsApiKey ? { googleMapsApiKey } : {}),
      },
    },
    android: {
      ...(config.android || {}),
      config: {
        ...((config.android && config.android.config) || {}),
        googleMaps: {
          ...((config.android && config.android.config && config.android.config.googleMaps) || {}),
          ...(googleMapsApiKey ? { apiKey: googleMapsApiKey } : {}),
        },
      },
    },
    extra: {
      ...config.extra,
      supabaseUrl,
      supabaseAnonKey,
      webAppOrigin,
      googleMapsApiKey,
    },
  };
};
