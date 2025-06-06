import type { Environment } from './types';

const environment: Environment = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
  },
  api: {
    url: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api.clauseatlas.com' : 'http://localhost:3001')
  }
};

export default environment; 