
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
        .select('id, full_name, school_id');

    console.log(`Total: ${students?.length}`);
    students?.forEach(s => {
        console.log(`- ${s.full_name} | school_id: ${s.school_id}`);
    });
}

diagnose();
