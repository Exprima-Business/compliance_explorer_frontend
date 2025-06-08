var environment = {
    supabase: {
        url: import.meta.env.VITE_SUPABASE_URL,
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
    },
    api: {
        url: import.meta.env.VITE_API_URL || 'https://api.clauseatlas.com'
    }
};
export default environment;
