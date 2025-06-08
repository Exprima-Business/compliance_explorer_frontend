var environment = {
    supabase: {
        url: import.meta.env.VITE_SUPABASE_URL,
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
    },
    api: {
        url: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://www.clauseatlas.com' : 'http://localhost:3001')
    }
};
export default environment;
