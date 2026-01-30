
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
        console.error('Error fetching profiles:', error);
    } else {
        console.log('--- USER PROFILES ---');
        data.forEach(p => {
            console.log(`User: ${p.username} | Role: ${p.role} | Specialty: ${p.specialty} | Active: ${p.is_active}`);
        });
    }
}

listUsers();
