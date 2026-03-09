
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyData() {
    console.log('--- VERIFICAÇÃO DE DADOS REAIS: indshiztdvjgvgnzigqd ---');

    console.log('\n1. Verificando escolas (select * sem count):');
    const { data: schools, error: sError } = await supabase.from('schools').select('name').limit(50);
    if (sError) {
        console.error('Erro ao buscar schools:', sError.message);
    } else {
        console.log(`Encontradas ${schools.length} escolas.`);
        schools.forEach((s, idx) => console.log(`  [${idx + 1}] ${s.name}`));
    }

    console.log('\n2. Verificando perfis (profiles):');
    const { data: profiles, error: pError } = await supabase.from('profiles').select('full_name, role').limit(10);
    if (pError) {
        console.error('Erro ao buscar profiles:', pError.message);
    } else {
        console.log(`Encontrados ${profiles.length} perfis.`);
        profiles.forEach((p, idx) => console.log(`  [${idx + 1}] ${p.full_name} (${p.role})`));
    }
}

verifyData();
