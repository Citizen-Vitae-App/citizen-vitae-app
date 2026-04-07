# Citizen Vitae — app mobile (Expo)

Application React Native consommant le **même projet Supabase** que le site Vite (`../`).

Ce projet est calé sur **Expo SDK 54** (version **stable**), aligné avec **Expo Go** actuel sur iPhone (l’App Store ne distribue qu’une seule version d’Expo Go, liée au dernier SDK supporté).  
Éviter les SDK **canary** npm (`expo@55-canary`, etc.) : ils dépassent souvent ce qu’Expo Go peut charger.

## Prérequis

- Node.js **≥ 20** (LTS recommandé)
- **Expo Go** à jour (SDK 54)

## Configuration

1. Copier `.env.example` vers `.env` et renseigner `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` (clé **anon** uniquement).
2. Dans Supabase → **Authentication** → **URL Configuration**, ajouter les URL de redirection utilisées par Expo (scheme `citizenvitae`, URL Expo Go si besoin).

## Commandes

```bash
cd mobile
npm install
npm run start
```

- `npm run ios` / `npm run android` : lancer sur simulateur / appareil.

## Auth : erreur « Network request failed » (email OTP)

Souvent lié à l’**appareil** qui n’a pas les bonnes variables au moment du bundle :

1. Vérifier **`mobile/.env`** : `EXPO_PUBLIC_SUPABASE_URL` = URL `https://xxx.supabase.co` (même projet que le web), `EXPO_PUBLIC_SUPABASE_ANON_KEY` = clé **anon** (pas service role).
2. **Redémarrer Metro** après tout changement de `.env` : `Ctrl+C` puis `npx expo start -c` (le `-c` vide le cache).
3. Wi‑Fi / données : l’iPhone doit joindre Internet et l’URL Supabase (pas de proxy bloquant).

## Google Sign-In (Supabase + Google Cloud)

Sur **Expo Go**, Google passe par un **navigateur système** (Safari en feuille modale sur iOS, Chrome Custom Tabs sur Android), pas par une WebView embarquée dans l’écran Expo : c’est le comportement attendu pour OAuth.  
L’app utilise une session **non éphémère** (cookies partagés) et un **warm-up** des Custom Tabs sur Android pour que ton compte Google déjà connecté sur l’appareil soit repris plus souvent sans resaisie.

Pour un bouton Google **100 % natif** (SDK Google), il faut un **development build** (`expo-dev-client` + `@react-native-google-signin/google-signin`) : ce flux n’est pas disponible dans Expo Go.

Le parcours réseau reste **app → Supabase → Google → retour** (`citizenvitae://` ou URL Expo).

### Supabase Dashboard

- **Authentication → Providers → Google** : activé, **Client ID** et **Client secret** issus de Google Cloud (type *Web application* pour le flux serveur Supabase).
- **Authentication → URL Configuration → Redirect URLs** : ajouter les URLs renvoyées par `Linking.createURL('/')` (souvent `citizenvitae://` et variantes Expo Go `exp://…`). Sans ça, le retour après Google peut échouer.

### Google Cloud Console

1. **APIs & Services → Credentials →** OAuth 2.0 Client ID de type **Web application** (celui dont Supabase utilise l’ID / secret).
2. **Authorized redirect URIs** : ajouter **exactement** :

   `https://<TON_PROJECT_REF>.supabase.co/auth/v1/callback`

   Remplace `<TON_PROJECT_REF>` par l’identifiant de ton projet (même sous-domaine que dans l’URL Supabase).  
   Sans cette URI, Google refuse souvent la redirection après le login (« redirect_uri_mismatch ») ou la page reste bloquée avant Google.

3. **OAuth consent screen** : application en mode test ou production, avec ton compte testeur si besoin.

Si tu vois la page Supabase mais pas Google, ouvre la même URL dans Safari sur Mac et regarde l’erreur affichée par Google (souvent **redirect_uri_mismatch** → corriger l’URI ci‑dessus).

## Types partagés

Le schéma Supabase (`Database`, etc.) vit dans `../shared/supabase/types.ts` ; le client mobile utilise `createSupabaseClient` depuis `../shared/supabase/client.ts`. Metro surveille la racine du monorepo et `shared/` (`metro.config.js`).
