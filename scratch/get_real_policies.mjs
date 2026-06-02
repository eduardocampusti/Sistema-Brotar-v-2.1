import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('--- POLÍTICAS ATIVAS DE RLS NA CLINICAL_SESSIONS ---');
    
    // Como a service_role key ignora RLS e tem privilégios totais, podemos usar a API REST
    // do PostgREST para fazer queries em tabelas de sistema se elas forem expostas?
    // Não, o PostgREST do Supabase geralmente não expõe tabelas do schema pg_catalog (como pg_policies).
    // Mas podemos criar temporariamente uma função SQL no schema public para ler pg_policies
    // e executá-la, ou simplesmente tentar entender o que há de errado nas regras do RLS.
    // Vamos tentar criar um RPC temporário que retorna as políticas RLS de clinical_sessions.
    
    console.log('Testando se conseguimos criar uma RPC para ver as políticas de RLS...');
    // Opa! Para criar uma função, teríamos que rodar SQL, mas não temos o execute_sql com permissão.
    // Espere, o client do Supabase (com a service_role key) tem privilégios de banco para criar funções?
    // Não via RPC se a RPC para rodar SQL não existir.
    
    // Vamos fazer uma verificação manual das políticas no arquivo update_psychology_security.sql:
    // O arquivo supabase_schema.sql tem a policy "Especialista só cria na sua área":
    // specialty = (select specialty from public.profiles where id = auth.uid()) AND professional_id = auth.uid()
    
    // Se a Loiseane está logada (auth.uid() = '42ebf32a-6b7c-4318-b3c8-059a3251b495'):
    // O que é retornado por (select specialty from public.profiles where id = auth.uid()) ?
    const { data: profile } = await supabase
        .from('profiles')
        .select('specialty')
        .eq('id', '42ebf32a-6b7c-4318-b3c8-059a3251b495')
        .single();
        
    console.log('Loiseane profile specialty:', profile?.specialty); // Deve ser 'SERVICO_SOCIAL'
    
    // E o que a clínica envia no payload ao salvar a evolução?
    // Vamos simular a gravação de uma evolução como faria o front-end, mas usando a service_role para ver se há erros de integridade (como FK).
    // Se passar com a service_role mas falhar com o Anon, é RLS. Se falhar com a service_role também, é restrição de integridade (tipo FK ou check constraint)!
    console.log('Tentando inserção com service_role (ignora RLS)...');
    
    const { data: students } = await supabase.from('students').select('id').limit(1);
    if (students && students.length > 0) {
        const studentId = students[0].id;
        
        // Vamos testar o payload idêntico ao do frontend
        const payload = {
            student_id: studentId,
            professional_id: '42ebf32a-6b7c-4318-b3c8-059a3251b495',
            specialty: 'SERVICO_SOCIAL',
            date: new Date().toISOString().split('T')[0],
            content: { summary: 'Sessão teste diagnóstico' },
            private_notes: 'Notas privadas teste'
        };
        
        const { data: inserted, error } = await supabase
            .from('clinical_sessions')
            .insert(payload)
            .select();
            
        if (error) {
            console.error('ERRO DE INTEGRIDADE (Mesmo ignorando RLS):', error);
        } else {
            console.log('Inserção com service_role funcionou! ID inserido:', inserted[0].id);
            // Deleta para limpar
            await supabase.from('clinical_sessions').delete().eq('id', inserted[0].id);
            console.log('Limpeza concluída.');
        }
    } else {
        console.log('Nenhum estudante para testar.');
    }
}

run().catch(console.error);
