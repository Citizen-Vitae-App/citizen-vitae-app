---
name: react-native-mobile-app
description: >-
  Bootstraps and implements the Citizen Vitae mobile app with Expo, TypeScript, React Navigation,
  and Supabase aligned with the existing Vite web app. Use when creating or extending the React
  Native app, adding Expo screens, mobile auth, native navigation, or wiring Supabase on iOS/Android.
---

# Citizen Vitae — mobile app (React Native / Expo)

## Goal

Ship a **native** Expo app that uses the **same Supabase project and business rules** as the web repo. Reuse **types and Zod** via a shared package when the repo is structured that way; **do not** port Radix/shadcn UI—rebuild screens with React Native primitives.

## Default stack

- **Expo** (SDK current stable), **TypeScript strict**, **React Navigation** (native stack + tabs as needed).
- **Supabase**: `@supabase/supabase-js` with auth storage suitable for native (see [Supabase React Native auth](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)).
- **Data**: Prefer **TanStack Query** if the web app uses it—keep query keys and hooks consistent when shared code exists.

## Bootstrap checklist (new app or new feature area)

1. **Env**: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (never service role in the client).
2. **Supabase client**: singleton module; `persistSession`, storage adapter (e.g. AsyncStorage / SecureStore per product choice).
3. **Deep links**: Expo scheme + Supabase redirect URLs for magic link / OAuth if used.
4. **Navigation**: mirror main web areas (auth, profile, org, events) with native stacks—same route **names/params** as web paths where it helps (`eventId`, `orgId`).
5. **First vertical slice**: one flow end-to-end (e.g. login → home list) before polishing UI everywhere.

## Implementation rules

- **Screens**: functional components; keep files under project limits (split hooks / sub-screens if a file grows large).
- **Forms**: `react-hook-form` + **Zod**—reuse schemas from shared package when available.
- **Lists**: `FlatList` with stable `keyExtractor`; avoid heavy work inside `renderItem`.
- **Images**: `expo-image` with explicit dimensions or aspect ratio.
- **Errors**: `try/catch` on async Supabase calls; user-visible messages; no silent failures.

## Mobile essentials

- **Safe area**: `SafeAreaProvider` / insets for headers and bottom tabs.
- **Keyboard**: avoid covered inputs (`KeyboardAvoidingView` or keyboard-aware scrollers).
- **Touch**: minimum ~44pt targets; enough spacing between actions.

## Accessibility (minimum)

- `accessibilityLabel` / `accessibilityRole` on tappable elements and primary inputs.
- Do not rely on color alone for state; support dynamic type where reasonable (`allowFontScaling` policy per design).

## Out of scope unless explicitly requested

- WebView as the main shell for the app.
- Duplicating server-only logic that belongs in Supabase Edge Functions or RLS.

## Project context

Web app: Vite + React + React Router + Supabase (`src/integrations/supabase/`). Mobile should **consume the same backend**, not fork business rules.
