import { requireEnv } from './scripts/require-env.mjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Logging in as school user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: requireEnv('SCRIPT_USER_EMAIL'),
        password: requireEnv('SCRIPT_USER_PASSWORD')
    });

    if (authError) {
        console.error('Login error:', authError);
        return;
    }

    console.log('Login successful! User ID:', authData.user.id);

    console.log('Fetching profile for this user...');
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id);

    if (profileError) {
        console.error('Profile fetch error:', profileError);
    } else {
        console.log('Profile found:', JSON.stringify(profiles, null, 2));
    }

    await supabase.auth.signOut();
}

run();
