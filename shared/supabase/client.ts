import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Client Supabase typé avec le schéma {@link Database} partagé entre web et mobile.
 * Chaque plateforme fournit URL, clé anon et options d’auth (storage, etc.).
 */
export function createSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  options?: Parameters<typeof createClient<Database>>[2]
) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, options);
}
