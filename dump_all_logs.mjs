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

    console.log('--- LOGS COMPLETOS DE ALUNOS ---');
    const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('module', 'ALUNOS')
        .order('timestamp', { ascending: false });

    if (!logs) {
        console.log('Nenhum log encontrado.');
        return;
    }

    console.log(`Total de logs encontrados: ${logs.length}`);
    
    logs.forEach(l => {
        console.log(`[${l.timestamp}] ${l.action.padEnd(8)} | ${l.user.padEnd(20)} | ${l.affected_record}`);
    });
}

diagnose();
