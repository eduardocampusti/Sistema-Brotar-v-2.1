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

    console.log('--- RELATÓRIO DE VISIBILIDADE DE ALUNOS ---');
    console.log(`Total encontrado: ${students?.length}`);
    
    const bySchool = {};
    students?.forEach(s => {
        const schoolName = s.schools?.name || 'SEM ESCOLA (ÓRFÃO)';
        if (!bySchool[schoolName]) bySchool[schoolName] = [];
        bySchool[schoolName].push(s.full_name);
    });

    Object.entries(bySchool).forEach(([school, names]) => {
        console.log(`\n${school} (${names.length} alunos):`);
        names.forEach(name => console.log(`  - ${name}`));
    });
}

diagnose();
