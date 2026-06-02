import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log('--- TESTANDO LOGIN E INSERT RLS COMO LOISEANE ---');
    const email = 'amorim.loiseane@uni9.edu.br';
    
    // Tenta fazer login com a senha padrão '123456'
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: '123456'
    });

    if (authError) {
        console.error('Falha ao logar como Loiseane com a senha padrão 123456:', authError.message);
        return;
    }

    console.log('Login com sucesso! User ID:', authData.user.id);

    // Tenta ler o próprio perfil
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

    if (profileError) {
        console.error('Erro ao ler perfil:', profileError.message);
    } else {
        console.log('Perfil retornado:', JSON.stringify(profile, null, 2));
    }

    // Vamos tentar fazer o insert que a Loiseane está tentando fazer!
    // Buscaremos o primeiro estudante disponível
    const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, full_name')
        .limit(1);

    if (studentsError) {
        console.error('Erro ao buscar estudantes:', studentsError.message);
        return;
    }

    if (!students || students.length === 0) {
        console.log('Nenhum estudante encontrado no banco.');
        return;
    }

    const targetStudent = students[0];
    console.log(`Estudante alvo para teste: ${targetStudent.full_name} (${targetStudent.id})`);

    // Inserindo a sessão clínica como Loiseane
    const testPayload = {
        student_id: targetStudent.id,
        professional_id: authData.user.id,
        specialty: 'SERVICO_SOCIAL', // Valor exato que a RLS deve aceitar
        date: new Date().toISOString().split('T')[0],
        content: { summary: 'Evolução teste Serviço Social' },
        private_notes: 'Notas privadas teste RLS'
    };

    console.log('Enviando payload:', JSON.stringify(testPayload, null, 2));

    const { data: insertResult, error: insertError } = await supabase
        .from('clinical_sessions')
        .insert(testPayload)
        .select();

    if (insertError) {
        console.error('FALHA DE RLS NO INSERT:', insertError.message);
        console.error(insertError);
    } else {
        console.log('INSERT REALIZADO COM SUCESSO ABSOLUTO!', insertResult);
        
        // Deleta o registro para limpar
        const { error: deleteError } = await supabase
            .from('clinical_sessions')
            .delete()
            .eq('id', insertResult[0].id);
            
        if (deleteError) {
            console.error('Erro ao deletar registro de teste:', deleteError.message);
        } else {
            console.log('Limpeza efetuada com sucesso!');
        }
    }

    await supabase.auth.signOut();
}

run().catch(console.error);
