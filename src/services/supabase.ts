import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve environment variables from Vite or process.env
const env = (import.meta as any).env || {};

const supabaseUrl = (env.VITE_SUPABASE_URL || (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL) || '').trim();
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY) || '').trim();

function isValidHttpUrl(urlStr: string): boolean {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'MY_SUPABASE_URL' &&
  !supabaseUrl.includes('placeholder') &&
  isValidHttpUrl(supabaseUrl)
);

if (!isSupabaseConfigured) {
  console.warn(
    '[StudioFlow Supabase] Credentials not configured or invalid URL. Operating in fallback local storage mode. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to connect to production Supabase backend.'
  );
}

// Fallback dummy URL to allow createClient initialization without crashing if keys are missing
const validUrl = isSupabaseConfigured && isValidHttpUrl(supabaseUrl)
  ? supabaseUrl
  : 'https://placeholder-project.supabase.co';
const validKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(validUrl, validKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

