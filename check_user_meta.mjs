import { requireEnv } from './scripts/require-env.mjs';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://indshiztdvjgvgnzigqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUserMetadata() {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: requireEnv('SCRIPT_USER_EMAIL'),
        password: requireEnv('SCRIPT_USER_PASSWORD')
    });

    if (authError) {
        console.error('Erro no login:', authError.message);
        return;
    }

    console.log('--- Auth User Metadata ---');
    console.log(JSON.stringify(authData.user.user_metadata, null, 2));
    
    console.log('\n--- Profile Table Data ---');
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
    
    if (profileError) {
        console.error('Erro ao buscar perfil:', profileError.message);
    } else {
        console.log(JSON.stringify(profileData, null, 2));
    }

    await supabase.auth.signOut();
}

checkUserMetadata().catch(console.error);
