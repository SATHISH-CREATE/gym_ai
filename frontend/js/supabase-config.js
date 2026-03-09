// Supabase Configuration
const SUPABASE_URL = "https://bleaekgciwewwyrrtmhj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gndBrArguBapaDo96uf5XQ_aBa9anGY";

// The Supabase CDN UMD bundle exposes itself on window.supabase.
try {
    const sbLib = window.supabase;
    if (sbLib && sbLib.createClient) {
        // Overwrite the global namespace with the initialized client
        window.supabase = sbLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error('Supabase CDN not loaded yet or already initialized.');
    }
} catch (e) {
    console.error('Failed to init Supabase client:', e);
}
