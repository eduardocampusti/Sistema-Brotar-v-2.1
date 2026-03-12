
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    await supabase.auth.signInWithPassword({
        email: 'admin@brotar.com',
        password: '123456'
    });

    const { data: students, error } = await supabase
        .from('students')
        .select('id, school_id');

    if (error) {
        console.error('ERRO:', error.message);
        return;
    }

    const total = students.length;
    const withSchool = students.filter(s => s.school_id).length;
    const withoutSchool = students.filter(s => !s.school_id).length;

    console.log('--- RESUMO RÁPIDO ---');
    console.log(`TOTAL DE ALUNOS: ${total}`);
    console.log(`COM SCHOOL_ID: ${withSchool}`);
    console.log(`SEM SCHOOL_ID: ${withoutSchool}`);
    
    if (total > 0) {
        // Mostrar os IDs dos primeiros 5 estudantes com school_id para ver se batem com o que o usuário vê
        const sampleWith = students.filter(s => s.school_id).slice(0, 5);
        console.log('\nExemplos COM school_id:', sampleWith);
    }
}

diagnose();
