import { requireEnv } from './scripts/require-env.mjs';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    await supabase.auth.signInWithPassword({
        email: requireEnv('SCRIPT_USER_EMAIL'),
        password: requireEnv('SCRIPT_USER_PASSWORD')
    });

    // Em Supabase não podemos fazer SELECT na information_schema via API REST facilmente
    // Mas podemos tentar inferir ou usar RPC se existir.
    // Como não sei se há um RPC, vamos tentar ver as tabelas que o SupabaseService usa
    // ou se há algo na documentação/logs do sistema.
    
    console.log('--- TESTANDO TABELAS PROVÁVEIS ---');
    const tables = ['students', 'profiles', 'schools', 'support_professionals', 'clinical_sessions', 'student_documents', 'audit_logs', 'system_settings', 'appointments', 'portage_assessments'];
    
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (!error) {
            console.log(`- ${table}: ${count} registros`);
        } else {
            console.log(`- ${table}: Erro ou não existe (${error.message})`);
        }
    }
}

diagnose();
