import { requireEnv } from './scripts/require-env.mjs';

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://indshiztdvjgvgnzigqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkPolicies() {
    // Para listar políticas, precisamos de acesso ao pg_policies. 
    // Isso geralmente requer service_role ou uma query que o anon/auth não pode fazer.
    // Mas podemos TESTAR as políticas tentando ler sem filtro e com filtros.
    
    await supabase.auth.signInWithPassword({
        email: requireEnv('SCRIPT_USER_EMAIL'),
        password: requireEnv('SCRIPT_USER_PASSWORD')
    });

    const tables = ['schools', 'students', 'support_professionals', 'profiles'];
    const results = {};

    for (const table of tables) {
        // Tenta ler tudo
        const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' });
        results[table] = {
            accessible_count: count,
            error: error ? error.message : null
        };
    }

    fs.writeFileSync('policy_test_result.json', JSON.stringify(results, null, 2));
    console.log('Teste de políticas salvo em policy_test_result.json');

    await supabase.auth.signOut();
}

checkPolicies().catch(console.error);
