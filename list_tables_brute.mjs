import { requireEnv } from './scripts/require-env.mjs';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://indshiztdvjgvgnzigqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listAllTables() {
    console.log('=== LISTAGEM DE TODAS AS TABELAS ===');
    
    // Tentativa via RPC se existir um custom RPC para isso, 
    // ou via query direta na information_schema.tables se tiver permissão.
    // Como somos anon/admin via roles, podemos tentar:
    
    // Tenta primeiro via login admin
    await supabase.auth.signInWithPassword({
        email: requireEnv('SCRIPT_USER_EMAIL'),
        password: requireEnv('SCRIPT_USER_PASSWORD')
    });

    // Infelizmente, o supabase-js não permite query direta em information_schema facilmente via .from()
    // Mas podemos tentar verificar a existência de nomes comuns:
    const possibleTables = [
        'escolas', 'alunos', 'profissionais_apoio', 'usuarios', 'perfis',
        'schools', 'students', 'support_professionals', 'users', 'profiles',
        'audit_logs', 'logs_auditoria'
    ];

    for (const table of possibleTables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (!error) {
            console.log(`✅ Tabela encontrada: ${table} | Registros: ${count}`);
        } else {
            if (error.code !== '42P01') { // 42P01 is "relation does not exist"
                console.log(`⚠️ Tabela ${table} erro: ${error.message} (${error.code})`);
            }
        }
    }

    await supabase.auth.signOut();
}

listAllTables().catch(console.error);
