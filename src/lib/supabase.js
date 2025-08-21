var _a, _b, _c, _d, _e;
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
// Debug environment variable loading
dlog('Supabase client config:', {
    url: environment.supabase.url,
    anonKeyPrefix: ((_a = environment.supabase.anonKey) === null || _a === void 0 ? void 0 : _a.substring(0, 10)) + '...',
    anonKeyLength: ((_b = environment.supabase.anonKey) === null || _b === void 0 ? void 0 : _b.length) || 0,
    isNewFormat: (_c = environment.supabase.anonKey) === null || _c === void 0 ? void 0 : _c.startsWith('sb_'),
    envVars: {
        VITE_SUPABASE_URL: ((_d = import.meta.env.VITE_SUPABASE_URL) === null || _d === void 0 ? void 0 : _d.substring(0, 20)) + '...',
        VITE_SUPABASE_ANON_KEY: ((_e = import.meta.env.VITE_SUPABASE_ANON_KEY) === null || _e === void 0 ? void 0 : _e.substring(0, 10)) + '...',
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
    }
});
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
