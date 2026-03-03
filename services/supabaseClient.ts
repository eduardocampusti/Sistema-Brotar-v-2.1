
import { createClient } from '@supabase/supabase-js';

// Debug log for environment variables in development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SupabaseClient] CRITICAL: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing!');
    console.log('[SupabaseClient] Environment check:', {
        url_present: !!supabaseUrl,
        key_present: !!supabaseAnonKey,
        mode: import.meta.env.MODE
    });
} else {
    console.log('[SupabaseClient] Initialized for project:', supabaseUrl.split('//')[1].split('.')[0]);
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
    },
    global: {
        headers: { 'x-application-name': 'brotar-web' }
    }
});
