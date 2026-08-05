import { requireEnv } from './scripts/require-env.mjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfilesDirectly() {
    console.log('--- CHECKING PROFILES DIRECTLY ---');

    // Login as 'brotar' with password '123456'
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

    // Let's try to fetch own profile first to confirm access
    const { data: myProfile, error: myProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (myProfileError) {
        console.error('My profile fetch error:', myProfileError.message);
    } else {
        console.log('My Profile Profile:', JSON.stringify(myProfile, null, 2));
    }

    // Now let's try to fetch all profiles, just in case
    const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('*');

    if (allProfilesError) {
        console.log('All profiles fetch failed (expected if not admin):', allProfilesError.message);
    } else {
        console.log(`Found ${allProfiles.length} profiles.`);
        allProfiles.forEach(p => console.log(`User: ${p.full_name} | Role: ${p.role} | INEP: ${p.school_inep}`));
    }
}

checkProfilesDirectly();
