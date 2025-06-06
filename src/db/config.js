export var config = {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
};
