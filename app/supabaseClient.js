import { createClient } from "@supabase/supabase-js";

let _client;

export function getSupabase() {
    if (_client) return _client;

    // Vite/React Router injects these on both client & server.
    const { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_OR_ANON_KEY } = import.meta.env;

    if (!VITE_SUPABASE_URL) {
        // Helpful one-time console hint without crashing the whole app
        console.error("VITE_SUPABASE_URL is missing. Check your .env and restart dev server.");
        throw new Error("VITE_SUPABASE_URL not loaded");
    }
    if (!VITE_SUPABASE_PUBLISHABLE_OR_ANON_KEY) {
        console.error("VITE_SUPABASE_PUBLISHABLE_OR_ANON_KEY is missing. Check your .env and restart dev server.");
        throw new Error("VITE_SUPABASE_PUBLISHABLE_OR_ANON_KEY not loaded");
    }

    _client = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_OR_ANON_KEY);
    return _client;
}
