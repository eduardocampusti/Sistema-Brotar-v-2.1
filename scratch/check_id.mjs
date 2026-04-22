import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkById() {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', '0b0b464c-ad3c-4886-9b55-d282250c0000')
        .single();

    if (error) {
        console.error('Erro:', error.message);
    } else {
        console.log('Perfil encontrado:', JSON.stringify(profile, null, 2));
    }
}

checkById();
