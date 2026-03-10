
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://indshiztdvjgvgnzigqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUserMetadata() {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@brotar.com',
        password: '123456'
    });

    if (authError) {
        console.error('Erro no login:', authError.message);
        return;
    }

    const report = {
        auth_metadata: authData.user.user_metadata,
        app_metadata: authData.user.app_metadata,
        user_id: authData.user.id
    };
    
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
    
    report.profile = profileData || { error: profileError?.message };

    fs.writeFileSync('user_meta_report.json', JSON.stringify(report, null, 2));
    console.log('Relatório salvo em user_meta_report.json');

    await supabase.auth.signOut();
}

checkUserMetadata().catch(console.error);
