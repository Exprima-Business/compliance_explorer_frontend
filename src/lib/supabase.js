import { createClient } from '@supabase/supabase-js';
import environment from '../config/environment';
// Enhanced error checking with detailed messages
if (!environment.supabase.url) {
    console.error('Supabase URL is missing. Current value:', environment.supabase.url);
    throw new Error('Missing Supabase URL environment variable');
}
if (!environment.supabase.anonKey) {
    console.error('Supabase anon key is missing. Current value:', environment.supabase.anonKey ? '***' : 'undefined');
    throw new Error('Missing Supabase anon key environment variable');
}
// Log successful initialization (without sensitive data)
console.log('Supabase client initializing with URL:', environment.supabase.url);
// Create the Supabase client with error handling
var supabase;
try {
    supabase = createClient(environment.supabase.url, environment.supabase.anonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });
    // Test the connection
    supabase.auth.getSession().then(function (_a) {
        var session = _a.data.session, error = _a.error;
        if (error) {
            console.error('Supabase connection test failed:', error.message);
        }
        else {
            console.log('Supabase connection test successful');
        }
    });
}
catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    throw error;
}
export { supabase };
