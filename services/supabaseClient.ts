
import { createClient } from '@supabase/supabase-js';

// Debug log for environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log essencial para diagnóstico em produção (Hostinger)
console.log('URL do Supabase:', supabaseUrl ? 'Ok' : 'Faltando');
console.log('Anon Key do Supabase:', supabaseAnonKey ? 'Ok' : 'Faltando');

if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = '[SupabaseClient] Erro: Configuração de Banco de Dados ausente no Servidor';
    console.error(errorMsg);
    console.log('[SupabaseClient] Environment check:', {
        url_present: !!supabaseUrl,
        key_present: !!supabaseAnonKey,
        mode: import.meta.env.MODE
    });
} else {
    try {
        const projectName = supabaseUrl.includes('.') ? supabaseUrl.split('//')[1].split('.')[0] : 'unknown';
        console.log('[SupabaseClient] Initialized for project:', projectName);
    } catch (e) {
        console.log('[SupabaseClient] Supabase URL found');
    }
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
