
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const { data, error } = await supabase.from('schools').select('*').limit(1);
    if (error) {
        fs.writeFileSync('inspection_result.txt', 'ERRO: ' + error.message);
    } else if (data && data.length > 0) {
        fs.writeFileSync('inspection_result.txt', JSON.stringify(data[0], null, 2));
    } else {
        fs.writeFileSync('inspection_result.txt', 'Nenhum registro encontrado em "schools".');
    }
}

inspect();
