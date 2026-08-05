import { requireEnv } from './scripts/require-env.mjs';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('--- DIAGNÓSTICO PROFUNDO DE ALUNOS ---');

    await supabase.auth.signInWithPassword({
        email: requireEnv('SCRIPT_USER_EMAIL'),
        password: requireEnv('SCRIPT_USER_PASSWORD')
    });

    const { data: students, error: sError } = await supabase
        .from('students')
        .select('id, full_name, school_id, created_at, educational_info, family_info')
        .order('created_at', { ascending: false });

    if (sError) {
        console.error('Erro ao buscar alunos:', sError.message);
        return;
    }

    const withoutSchool = students.filter(s => !s.school_id);
    console.log(`\nAlunos SEM school_id: ${withoutSchool.length}`);

    console.log('\nAnálise dos dados educacionais dos órfãos:');
    withoutSchool.slice(0, 20).forEach(s => {
        const edu = s.educational_info || {};
        const schoolName = edu.schoolName || 'N/A';
        const inep = edu.schoolInep || 'N/A';
        console.log(`- ${s.full_name} | Inep no JSON: ${inep} | Nome Escola no JSON: ${schoolName}`);
    });

    // 2. Tentar ver se as escolas no banco batem com esses nomes/ineps
    const { data: schools } = await supabase.from('schools').select('id, name, inep');
    console.log('\n--- TABELA DE ESCOLAS NO BANCO ---');
    schools?.forEach(sc => console.log(`- ${sc.name} | INEP: ${sc.inep} | ID: ${sc.id}`));
}

diagnose();
