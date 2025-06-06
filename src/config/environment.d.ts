interface Environment {
    supabase: {
        url: string;
        anonKey: string;
    };
    api: {
        url: string;
    };
}
declare const environment: Environment;
export default environment;
