import { requireEnv } from '../scripts/require-env.mjs';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // Login
    await supabase.auth.signInWithPassword({
        email: requireEnv('SCRIPT_USER_EMAIL'),
        password: requireEnv('SCRIPT_USER_PASSWORD')
    });

    console.log('\n--- VERIFICAÇÃO PÓS-MIGRAÇÃO ---');

    // Query 1: Agrupamento por Unidade
    const { data: report, error: err1 } = await supabase
        .from('students')
        .select('unit');
    
    if (err1) {
        console.error('Erro na Query 1:', err1.message);
        return;
    }

    const counts = report.reduce((acc, curr) => {
        const unit = curr.unit || 'NULL';
        acc[unit] = (acc[unit] || 0) + 1;
        return acc;
    }, {});

    console.log('\nQuery 1: Total por Unidade');
    console.table(counts);

    // Query 2: Contagem de NULLs
    const nulls = report.filter(s => s.unit === null).length;
    console.log('\nQuery 2: Registros ainda NULL');
    console.log(`Total: ${nulls}`);
}

run();
