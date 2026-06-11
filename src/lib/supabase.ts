import { createClient, SupabaseClient } from '@supabase/supabase-js';
import environment from '../config/environment';
import { dlog } from '../utils/debugLog';

// Enhanced error checking with detailed messages
if (!environment.supabase.url) {
  console.error('Supabase URL is missing. Current value:', environment.supabase.url);
  throw new Error('Missing Supabase URL environment variable');
}

if (!environment.supabase.anonKey) {
  console.error('Supabase anon key is missing. Current value:', environment.supabase.anonKey ? '***' : 'undefined');
  throw new Error('Missing Supabase anon key environment variable');
}

// Log successful initialization (without sensitive data) in dev mode
dlog('Supabase client initializing with URL:', environment.supabase.url);

// Debug environment variable loading
dlog('Supabase client config:', {
  url: environment.supabase.url,
  anonKeyPrefix: environment.supabase.anonKey?.substring(0, 10) + '...',
  anonKeyLength: environment.supabase.anonKey?.length || 0,
  isNewFormat: environment.supabase.anonKey?.startsWith('sb_'),
  envVars: {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL?.substring(0, 20) + '...',
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 10) + '...',
    hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
  }
});

// Create the Supabase client with error handling
let supabase: SupabaseClient;
try {
  supabase = createClient(
    environment.supabase.url,
    environment.supabase.anonKey,
    {
      auth: {
        autoRefreshToken: true, // in-memory refresh during the page session (login/MFA)
        // Cookie auth Phase 4b: do NOT persist the supabase session (JWT +
        // refresh token) to localStorage. The HttpOnly ca_session cookie is the
        // only durable credential, so an XSS payload can no longer read the
        // token from storage. The session lives in memory for the current page
        // (enough to log in, pass MFA, and establish the cookie); on reload it
        // is gone and AuthContext rehydrates auth state from the cookie.
        persistSession: false,
        detectSessionInUrl: true
      }
    }
  );

  // Simple connection test - session management is handled by AuthContext
  dlog('Supabase client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  throw error;
}

export { supabase }; 