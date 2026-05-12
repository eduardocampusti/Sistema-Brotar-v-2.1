
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
        .select(`
            id, 
            full_name, 
            unit, 
            school_id,
            schools (
                name,
                district
            )
        `)
        .limit(50);

    if (error) {
        console.error('Erro ao buscar alunos:', error);
        return;
    }

    console.log(`--- ANALISANDO ${students?.length} ALUNOS ---`);

    students?.forEach(s => {
        console.log(`\nID: ${s.id}`);
        console.log(`Aluno: ${s.full_name}`);
        console.log(`Unit Atual: ${s.unit}`);
        console.log(`Escola ID: ${s.school_id}`);
        console.log(`Escola Nome: ${s.schools?.name}`);
        console.log(`Escola Distrito: ${s.schools?.district}`);
    });
}

diagnose();
