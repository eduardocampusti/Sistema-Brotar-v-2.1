import { createClient } from '@supabase/supabase-js';

function requirePublicEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
    const value = import.meta.env[name]?.trim();
    if (!value) {
        throw new Error(`[SupabaseClient] Missing required frontend environment variable: ${name}`);
    }
    return value;
}

const supabaseUrl = requirePublicEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = requirePublicEnv('VITE_SUPABASE_ANON_KEY');

// Wrapper seguro para o LocalStorage (evita quebra em modo incógnito/Safari)
const getSafeStorage = () => {
    try {
        const testKey = '__test__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
        return window.localStorage;
    } catch {
        console.warn('[SupabaseClient] LocalStorage bloqueado ou indisponível. Usando fallback em memória.');
        return undefined;
    }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
