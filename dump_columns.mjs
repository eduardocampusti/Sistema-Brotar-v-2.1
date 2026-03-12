
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    await supabase.auth.signInWithPassword({
        email: 'admin@brotar.com',
        password: '123456'
    });

    // 1. Pegar todos os nomes de colunas
    // (Infelizmente via Select * o Supabase retorna tudo, mas vamos ver o que vem)
    const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .limit(5);

    if (error) {
        console.error(error);
        return;
    }

    if (students && students.length > 0) {
        console.log('Colunas detectadas:', Object.keys(students[0]));
        console.log('\nDados de exemplo (completo):');
        console.log(JSON.stringify(students, null, 2));
    } else {
        console.log('Nenhum aluno encontrado.');
    }
}

diagnose();
