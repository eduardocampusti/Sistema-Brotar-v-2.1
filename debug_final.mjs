import { requireEnv } from './scripts/require-env.mjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthAndFetch() {
    console.log('--- DEBUGGING FINAL ---');

    // Use the email format found in SupabaseService.ts
    const email = requireEnv('SCRIPT_USER_EMAIL');
    console.log(`Logging in as "${email}"...`);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: requireEnv('SCRIPT_USER_PASSWORD'),
    });

    if (authError) {
        console.error('Login failed:', authError.message);
        return;
    }

    console.log('Login successful!');
    console.log('User ID:', authData.user.id);

    // Fetch profiles
    console.log('Fetching profiles...');
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('*');
    if (profileError) {
        console.error('Profile fetch failed:', profileError.message);
    } else {
        console.log(`Successfully fetched ${profiles.length} profiles.`);
        profiles.forEach(p => {
            console.log(`- ${p.full_name || p.email} (${p.role}) | School INEP: ${p.school_inep} | ID: ${p.id}`);
        });

        // Check if current user is in profiles
        const me = profiles.find(p => p.id === authData.user.id);
        if (me) {
            console.log('--- CURRENT USER PROFILE ---');
            console.log(JSON.stringify(me, null, 2));
        }
    }

    // Fetch schools
    console.log('Fetching schools...');
    const { data: schools, error: schoolsError } = await supabase.from('schools').select('*');
    if (schoolsError) {
        console.error('Schools fetch failed:', schoolsError.message);
    } else {
        console.log(`Found ${schools.length} schools.`);
        if (schools.length > 0) {
            console.log('Example School (full):', JSON.stringify(schools[0], null, 2));
        }
    }
}

testAuthAndFetch();
