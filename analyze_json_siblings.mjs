
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    await supabase.auth.signInWithPassword({
        email: 'admin@brotar.com',
        password: '123456'
    });

    const { data: students } = await supabase
        .from('students')
        .select('id, full_name, school_id, social_info, clinical_info, educational_info')
        .is('school_id', null);

    console.log(`--- ANALISANDO ${students?.length} ÓRFÃOS ---`);

    students?.slice(0, 10).forEach(s => {
        console.log(`\nAluno: ${s.full_name}`);
        console.log(`Social: ${JSON.stringify(s.social_info)}`);
        console.log(`Clinical: ${JSON.stringify(s.clinical_info)}`);
        console.log(`Edu: ${JSON.stringify(s.educational_info)}`);
    });
}

diagnose();
