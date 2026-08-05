import { requireEnv } from './scripts/require-env.mjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserProfiles() {
    console.log('--- CHECKING USER PROFILES ---');

    // Login as 'brotar'
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: requireEnv('SCRIPT_USER_EMAIL'),
        password: requireEnv('SCRIPT_USER_PASSWORD'),
    });

    if (authError) {
        console.error('Login failed:', authError.message);
        return;
    }

    console.log('Login successful!');
    const userId = authData.user.id;
    console.log('User ID:', userId);

    // Fetch profiles for common users
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('full_name', ['Bruno', 'Brotar', 'EDUARDO']); // Try to find by name if INEP/Email is unknown

    if (profileError) {
        console.error('Profile fetch error:', profileError.message);
    } else {
        console.log(`Found ${profiles.length} relevant profiles.`);
        profiles.forEach(p => {
            console.log(`User: ${p.full_name} | Role: ${p.role} | School ID: ${p.school_id} | School INEP: ${p.school_inep}`);
        });
    }

    // Also check the profile of the CURRENTLY logged in user
    const { data: myProfile, error: myProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (myProfileError) {
        console.error('My profile fetch error:', myProfileError.message);
    } else {
        console.log('--- MY PROFILE ---');
        console.log(`User: ${myProfile.full_name} | Role: ${myProfile.role} | School ID: ${myProfile.school_id} | School INEP: ${myProfile.school_inep}`);
    }
}

checkUserProfiles();
