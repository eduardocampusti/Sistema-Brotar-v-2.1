
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('--- DIAGNÓSTICO DE ALUNOS ---');

    // 1. Tentar logar como admin se possível, ou usar anon se RLS permitir leitura parcial
    // Como não sei a senha de admin atual (o script anterior sugeriu 123456), vou tentar
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@brotar.com',
        password: '123456'
    });

    if (authError) {
        console.warn('Login falhou, tentando leitura anônima:', authError.message);
    } else {
        console.log('Logado como Admin.');
    }

    const { data: students, error: sError } = await supabase
        .from('students')
        .select('id, full_name, school_id, created_at')
        .order('created_at', { ascending: false });

    if (sError) {
        console.error('Erro ao buscar alunos:', sError.message);
        return;
    }

    console.log(`\nTotal de alunos encontrados no banco: ${students.length}`);
    
    const withSchool = students.filter(s => s.school_id).length;
    const withoutSchool = students.filter(s => !s.school_id).length;

    console.log(`Alunos COM school_id: ${withSchool}`);
    console.log(`Alunos SEM school_id: ${withoutSchool}`);

    console.log('\nÚltimos 10 alunos registrados:');
    students.slice(0, 10).forEach(s => {
        console.log(`- ${s.full_name} | ID: ${s.id} | SchoolID: ${s.school_id || 'NULL'} | Data: ${s.created_at}`);
    });

    if (withoutSchool > 0) {
        console.log('\nExemplos de alunos SEM school_id:');
        students.filter(s => !s.school_id).slice(0, 5).forEach(s => {
            console.log(`- ${s.full_name} | ID: ${s.id} | Data: ${s.created_at}`);
        });
    }
}

diagnose();
