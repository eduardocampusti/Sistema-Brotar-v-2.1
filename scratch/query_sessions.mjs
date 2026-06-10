import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://indshiztdvjgvgnzigqd.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZHNoaXp0ZHZqZ3ZnbnppZ3FkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODkxNDk0MiwiZXhwIjoyMDg0NDkwOTQyfQ.15-gfyCZ3eF5kmbnW47hRRqkHlPr5XOPgQkYMcQrup8';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
    console.log('Buscando as 10 últimas sessões...');
    const { data, error } = await supabase
        .from('clinical_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Erro:', error);
        return;
    }

    data.forEach((session, i) => {
        console.log(`\n--- Sessão [${i+1}] ID: ${session.id} | Data: ${session.date} | Especialidade: ${session.specialty} ---`);
        console.log('Chaves no content:', Object.keys(session.content || {}));
        console.log('Content completo:', JSON.stringify(session.content));
    });
}

main().catch(console.error);
