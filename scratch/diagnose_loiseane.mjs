import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('--- BUSCANDO PERFIS COM ESPECIALIDADE SERVICO_SOCIAL OU NOME LOISEANE ---');
    
    // Busca perfis
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');
        
    if (error) {
        console.error('Erro ao buscar perfis:', error);
        return;
    }
    
    const loiseaneProfile = profiles.find(p => 
        (p.full_name && p.full_name.toLowerCase().includes('loiseane')) || 
        p.specialty === 'SERVICO_SOCIAL'
    );
    
    if (loiseaneProfile) {
        console.log('Perfil encontrado no DB:', JSON.stringify(loiseaneProfile, null, 2));
        
        // Agora buscamos o usuário no Auth usando a service role pelo ID do perfil!
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(loiseaneProfile.id);
        if (userError) {
            console.error('Erro ao buscar usuário no auth por ID:', userError);
        } else if (user) {
            console.log('Usuário do Auth correspondente encontrado:', {
                id: user.id,
                email: user.email,
                user_metadata: user.user_metadata,
                app_metadata: user.app_metadata
            });
        } else {
            console.log('Nenhum usuário correspondente no Auth para o ID do perfil.');
        }
    } else {
        console.log('Nenhum perfil de Assistente Social ou contendo Loiseane no banco de dados.');
    }
}

run().catch(console.error);
