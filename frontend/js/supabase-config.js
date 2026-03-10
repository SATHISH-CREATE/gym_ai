// Supabase Configuration
const SUPABASE_URL = "https://bleaekgciwewwyrrtmhj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsZWFla2djaXdld3d5cnJ0bWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjg5MzIsImV4cCI6MjA4ODYwNDkzMn0.A-rVRYx5XxrLrVCTEFztjvXkwOhrmNB0BusReP39F4Q";

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
