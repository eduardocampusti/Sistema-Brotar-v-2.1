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

    console.log('--- BUSCANDO VÍNCULOS VIA PROFISSIONAIS ---');
    
    const { data: professionals } = await supabase
        .from('support_professionals')
        .select('student_id, school_id');

    if (!professionals || professionals.length === 0) {
        console.log('Nenhum vínculo encontrado em support_professionals.');
        return;
    }

    console.log(`Encontrados ${professionals.length} vínculos.`);
    
    // Contar alunos sem school_id que possuem vínculo via profissionais
    const { data: students } = await supabase
        .from('students')
        .select('id, full_name')
        .is('school_id', null);

    const orphanIds = new Set(students?.map(s => s.id));
    let fixed = 0;
    
    professionals.forEach(p => {
        if (orphanIds.has(p.student_id)) {
            fixed++;
        }
    });

    console.log(`Total de alunos órfãos que PODEM ser recuperados via profissionais: ${fixed}`);
}

diagnose();
