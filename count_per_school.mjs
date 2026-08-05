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
        .select('id, full_name, school_id, schools(name, inep)');

    const counts = {};
    students?.forEach(s => {
        const schoolKey = s.schools?.name || 'SEM ESCOLA';
        counts[schoolKey] = (counts[schoolKey] || 0) + 1;
    });

    console.log('--- CONTAGEM POR ESCOLA ---');
    console.log(JSON.stringify(counts, null, 2));

    const { data: schools } = await supabase.from('schools').select('id, name, inep');
    console.log('\n--- ESCOLAS NO BANCO ---');
    schools?.forEach(sc => console.log(`- ${sc.name} | INEP: ${sc.inep} | ID: ${sc.id}`));
}

diagnose();
