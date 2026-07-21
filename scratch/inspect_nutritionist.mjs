import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching all profiles from', supabaseUrl);
    const { data: profiles, error } = await supabase.from('profiles').select('*');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${profiles.length} profiles.`);
    const specialists = profiles.filter(p => p.role === 'SPECIALIST');
    console.log(`Found ${specialists.length} specialists:`);
    specialists.forEach(p => {
        console.log(`- Name: ${p.full_name} | Specialty: ${p.specialty} | Active: ${p.is_active} | Role: ${p.role}`);
    });
}

run();
