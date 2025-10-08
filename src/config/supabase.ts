import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Supabase Configuration
 * Creates and exports the Supabase client instance
 */

const supabaseUrl = process.env['SUPABASE_URL'] || '';
console.log("🚀 ~ supabaseUrl:", supabaseUrl)
const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'] || '';
console.log("🚀 ~ supabaseAnonKey:", supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
}

// Create Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

/**
 * Test Supabase connection
 * @returns {Promise<boolean>} True if connection is successful
 */
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('_supabase_migrations').select('*').limit(1);
    return !error;
  } catch {
    return false;
  }
};

/**
 * Get Supabase client instance
 * @returns {SupabaseClient} Supabase client
 */
export const getSupabaseClient = (): SupabaseClient => {
  return supabase;
};
