import { requireEnv } from './scripts/require-env.mjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserProfiles() {
    console.log('--- CHECKING USER PROFILES AS BROTAR ---');

    // Login as 'brotar'
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: requireEnv('SCRIPT_USER_EMAIL'),
        password: requireEnv('SCRIPT_USER_PASSWORD'),
    });

    if (authError) {
        console.error('Login failed for "brotar":', authError.message);
        return;
    }

    console.log('Login successful for "brotar"!');
    const user = authData.user;
    console.log('User ID:', user.id);
    console.log('User Metadata:', JSON.stringify(user.user_metadata, null, 2));

    // Fetch MY profile
    const { data: myProfile, error: myProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (myProfileError) {
        console.error('My profile fetch error:', myProfileError.message);
    } else {
        console.log('--- MY PROFILE ---');
        console.log(JSON.stringify(myProfile, null, 2));
    }

    // Attempt to fetch ALL profiles (testing if I am ADMIN)
    const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('*');

    if (allProfilesError) {
        console.warn('Could not fetch all profiles (not admin?):', allProfilesError.message);
    } else {
        console.log(`Successfully fetched ${allProfiles.length} profiles!`);
        allProfiles.forEach(p => {
            console.log(`- ${p.full_name || p.email} (${p.role}) | School: ${p.school_inep}`);
        });
    }

    // Check schools visibility for this user
    const { data: schools, error: schoolsError } = await supabase.from('schools').select('name, inep, is_active');
    if (schoolsError) {
        console.error('Schools fetch error:', schoolsError.message);
    } else {
        console.log(`Visible schools for this user: ${schools.length}`);
    }
}

checkUserProfiles();
