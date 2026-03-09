import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching profiles...');
    const { data: profiles, error } = await supabase.from('profiles').select('*');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${profiles.length} profiles.`);
    profiles.forEach(p => {
        console.log(`- User: ${p.username} | Role: ${p.role} | Name: ${p.full_name} | Active: ${p.is_active}`);
    });
}

run();
