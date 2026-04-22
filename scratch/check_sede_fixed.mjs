import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSede() {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%SEDE%');

    if (error) {
        console.error('Erro:', error.message);
    } else {
        console.log('Perfis encontrados:', JSON.stringify(profiles, null, 2));
    }
}

checkSede();
