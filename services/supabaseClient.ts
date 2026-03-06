
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

// Wrapper seguro para o LocalStorage (evita quebra em modo incógnito/Safari)
const getSafeStorage = () => {
    try {
        const testKey = '__test__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
        return window.localStorage;
    } catch (e) {
        console.warn('[SupabaseClient] LocalStorage bloqueado ou indisponível. Usando fallback em memória.');
        return undefined; // Deixa o Supabase usar fallback interno (in-memory)
    }
};

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: getSafeStorage()
    },
    global: {
        headers: { 'x-application-name': 'brotar-web' }
    }
});
