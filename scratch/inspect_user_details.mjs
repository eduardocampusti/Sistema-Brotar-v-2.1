import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: rows, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('full_name', 'Rosineide da Silva Pereira');

    if (error) {
        console.error('Error fetching Rosineide:', error);
        return;
    }

    console.log('Rosineide profile in DB:', JSON.stringify(rows, null, 2));
}

run();
