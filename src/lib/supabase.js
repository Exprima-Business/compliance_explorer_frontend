import { createClient } from '@supabase/supabase-js';
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
// Create the Supabase client with error handling
var supabase;
try {
    supabase = createClient(environment.supabase.url, environment.supabase.anonKey, {
        auth: {
            autoRefreshToken: true, // Enable auto-refresh - AuthContext will handle session state
            persistSession: true,
            detectSessionInUrl: true
        }
    });
    // Simple connection test - session management is handled by AuthContext
    dlog('Supabase client initialized successfully');
}
catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    throw error;
}
export { supabase };
