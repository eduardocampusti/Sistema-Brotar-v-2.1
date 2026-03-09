
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectToSafeFile() {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: '29204410@escola.brotar',
        password: '123456'
    });

    if (authError) {
        fs.writeFileSync('column_inspection.txt', `ERRO NO LOGIN: ${authError.message}`);
        return;
    }

    const { data: schools, error: fetchError } = await supabase.from('schools').select('id, name, inep, is_active');

    if (fetchError) {
        console.error('Error fetching schools:', fetchError);
        return;
    }

    console.log(`Found ${schools.length} schools.`);
    schools.forEach(s => {
        console.log(`- ${s.name} (INEP: ${s.inep}) | Active: ${s.is_active}`);
    });

    await supabase.auth.signOut();
}

inspectToSafeFile();
