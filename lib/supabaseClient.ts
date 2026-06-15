import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseClientInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL and Anon Key must be defined in environment variables.');
    }
    
    supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClientInstance;
}
