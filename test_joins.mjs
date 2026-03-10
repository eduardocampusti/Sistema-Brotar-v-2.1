
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://indshiztdvjgvgnzigqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRelationships() {
    await supabase.auth.signInWithPassword({
        email: 'admin@brotar.com',
        password: '123456'
    });

    // Tenta uma consulta com join para ver se falha
    const { data: joinData, error: joinError } = await supabase
        .from('students')
        .select('id, full_name, schools(id, name)')
        .limit(1);

    const report = {
        join_test: {
            success: !joinError,
            error: joinError?.message,
            hint: joinError?.hint,
            data: joinData
        }
    };

    fs.writeFileSync('relationship_test.json', JSON.stringify(report, null, 2));
    console.log('Relatório de relacionamentos salvo.');

    await supabase.auth.signOut();
}

checkRelationships().catch(console.error);
