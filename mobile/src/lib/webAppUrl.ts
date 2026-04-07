import Constants from 'expo-constants';

type Extra = { webAppOrigin?: string };

function stripOrigin(raw: string | undefined): string {
  return (raw ?? '').replace(/^\uFEFF/, '').trim().replace(/\/$/, '');
}

/**
 * URL du site Vite (sans slash final), ex. `https://app.citizenvitae.fr`.
 * Utilisée pour ouvrir fiche événement / page org depuis l’app.
 */
export function getWebAppOrigin(): string | null {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  const fromEnv = stripOrigin(process.env.EXPO_PUBLIC_WEB_APP_ORIGIN);
  const fromExtra = stripOrigin(extra?.webAppOrigin);
  const s = fromEnv || fromExtra;
  return s.length > 0 ? s : null;
}

export function buildWebAppPath(path: string): string | null {
  const origin = getWebAppOrigin();
  if (!origin) return null;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${p}`;
}
