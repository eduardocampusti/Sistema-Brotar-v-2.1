
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    await supabase.auth.signInWithPassword({
        email: 'admin@brotar.com',
        password: '123456'
    });

    const schoolId = 'f1eea056-b076-43f1-bd6b-871d37446738'; // Escola Mun. Timoteo Lo
    const studentId = '8a0dbed6-fabc-435c-ba07-1ad00ea35c6d'; // João Miguel Souza Oliveira

    const { error } = await supabase
        .from('students')
        .update({ school_id: schoolId })
        .eq('id', studentId);

    if (error) {
        console.error('Erro ao corrigir:', error.message);
    } else {
        console.log('Aluno João Miguel vinculado com sucesso à Escola Timoteo Lo!');
    }
}

fix();
