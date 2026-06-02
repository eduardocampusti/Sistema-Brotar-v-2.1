import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log('--- TESTANDO LEITURA DE PERFIL COMO USUÁRIO AUTENTICADO ---');
    
    // Tenta fazer login com a conta 'admin@brotar.com'
    const email = 'admin@brotar.com';
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: '123456'
    });

    if (authError) {
        console.error('Falha ao logar:', authError.message);
        return;
    }

    console.log('Login com sucesso! User ID:', authData.user.id);

    // Tenta ler o próprio perfil
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id);

    if (profileError) {
        console.error('Erro na query de profiles:', profileError.message);
    } else {
        console.log('Resultado da busca de profiles (deve retornar 1 registro):', profile);
    }

    // Tenta ler a especialidade do perfil de forma idêntica à RLS
    const { data: specData, error: specError } = await supabase
        .from('profiles')
        .select('specialty')
        .eq('id', authData.user.id)
        .single();
        
    if (specError) {
        console.error('Erro ao ler especialidade:', specError.message);
    } else {
        console.log('Especialidade lida com sucesso:', specData);
    }

    await supabase.auth.signOut();
}

run().catch(console.error);
