import type { User } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';

export type { User };

/** Ligne `profiles` (schéma public). */
export type Profile = Database['public']['Tables']['profiles']['Row'];

/** Ligne `events` (schéma public). */
export type Event = Database['public']['Tables']['events']['Row'];
