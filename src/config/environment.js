import { dlog } from '../utils/debugLog';
var environment = {
    supabase: {
        url: import.meta.env.VITE_SUPABASE_URL,
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
    },
    api: {
        url: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api.clauseatlas.com' : 'http://localhost:3001')
    }
};
// Log environment configuration for debugging
dlog('Environment:', {
    isProd: import.meta.env.PROD,
    apiUrl: environment.api.url,
    supabaseUrl: environment.supabase.url,
    env: {
        VITE_API_URL: import.meta.env.VITE_API_URL,
        VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
        NODE_ENV: import.meta.env.NODE_ENV,
        MODE: import.meta.env.MODE
    }
});
export default environment;
