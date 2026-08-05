import { requireEnv } from './scripts/require-env.mjs';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSchoolLogin() {
    console.log('--- TESTE DE LOGIN DE ESCOLA ---');

    // Usando o INEP da primeira escola no script de restauração
    const inep = '29204410';
    const email = `${inep}@escola.brotar`;
    const password = requireEnv('SCRIPT_USER_PASSWORD');

    console.log(`Tentando login para: ${email}`);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        console.error('❌ Erro no login:', authError.message);
        return;
    }

    console.log('✅ Login SUCESSO! User ID:', authData.user.id);

    console.log('\nTentando buscar escolas AGORA QUE ESTOU AUTENTICADO:');
    const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('name, inep');

    if (schoolsError) {
        console.error('❌ Erro ao buscar escolas:', schoolsError.message);
    } else {
        console.log(`✅ Sucesso! Escolas visíveis: ${schools.length}`);
        schools.slice(0, 5).forEach(s => console.log(` - ${s.name} (${s.inep})`));

        if (schools.length === 0) {
            console.log('⚠️ A tabela está REALMENTE vazIA para este usuário (ou RLS ainda bloqueia).');
        }
    }

    await supabase.auth.signOut();
}

testSchoolLogin();
