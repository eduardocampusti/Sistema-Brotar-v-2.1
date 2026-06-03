import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(supabaseUrl, serviceKey);

async function run() {
    console.log('Cant list tables directly, but checking if professionals table exists...');
    const { data: p, error: pe } = await admin.from('professionals').select('*').limit(1);
    console.log('professionals table error:', pe);
    const { data: p2, error: pe2 } = await admin.from('professional_units').select('*').limit(1);
    console.log('professional_units table error:', pe2);
}

run();
