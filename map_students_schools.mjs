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

    const { data: students } = await supabase
        .from('students')
        .select('id, full_name, school_id, schools(name)');

    console.log('--- MAPA DE ALUNOS POR ESCOLA ---');
    students?.forEach(s => {
        const schoolName = s.schools?.name || 'SEM ESCOLA';
        console.log(`- ${s.full_name} | Escola: ${schoolName} | ID Escola: ${s.school_id}`);
    });

    const { data: schools } = await supabase.from('schools').select('id, name');
    console.log('\n--- ESCOLAS CADASTRADAS ---');
    schools?.forEach(sc => console.log(`- ${sc.name} | ID: ${sc.id}`));
}

diagnose();
