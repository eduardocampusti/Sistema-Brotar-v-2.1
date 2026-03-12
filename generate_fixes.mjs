
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('--- MAPEAMENTO DE RECUPERAÇÃO ---');

    await supabase.auth.signInWithPassword({
        email: 'admin@brotar.com',
        password: '123456'
    });

    const { data: students } = await supabase
        .from('students')
        .select('id, full_name, school_id, educational_info');

    const { data: schools } = await supabase.from('schools').select('id, name, inep');

    const schoolMapByName = new Map();
    const schoolMapByInep = new Map();
    schools?.forEach(s => {
        schoolMapByName.set(s.name?.toLowerCase(), s.id);
        if (s.inep) schoolMapByInep.set(s.inep.toString(), s.id);
    });

    console.log('\nAlunos que precisam de correção:');
    let count = 0;
    students?.forEach(s => {
        if (!s.school_id) {
            const edu = s.educational_info || {};
            const inep = edu.schoolInep;
            const name = edu.schoolName;
            
            let targetId = null;
            if (inep) targetId = schoolMapByInep.get(inep.toString());
            if (!targetId && name) targetId = schoolMapByName.get(name.toLowerCase());

            if (targetId) {
                console.log(`UPDATE students SET school_id = '${targetId}' WHERE id = '${s.id}'; -- ${s.full_name} (${name || inep})`);
                count++;
            } else {
                console.log(`-- NÃO MAPEADO: ${s.full_name} (Inep: ${inep}, Nome: ${name})`);
            }
        }
    });
    console.log(`\nTotal mapeável: ${count}`);
}

diagnose();
