import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://lqjnwjowbcptkucnpptb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxam53am93YmNwdGt1Y25wcHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1ODU0MDEsImV4cCI6MjA4MDE2MTQwMX0.0rOhgp5LWeIJSYA81PRZQmftd084kw4onQQayZ8Ff8c";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});