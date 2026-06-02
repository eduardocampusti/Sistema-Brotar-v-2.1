/**
 * Aplica a migração V39 diretamente via Supabase pg_net / exec_sql
 * Usa o endpoint REST nativo para executar SQL como service_role
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = 'indshiztdvjgvgnzigqd';

const SQL_V39 = `
-- V39: Correção de RLS para clinical_sessions
DROP POLICY IF EXISTS "Especialista só cria na sua área" ON public.clinical_sessions;
DROP POLICY IF EXISTS "Permitir inserção de novas sessões" ON public.clinical_sessions;

CREATE POLICY "Permitir inserção de novas sessões"
  ON public.clinical_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK ( professional_id = auth.uid() );

NOTIFY pgrst, 'reload config';
`;

async function applyMigration() {
  console.log('🚀 Aplicando migração V39 via Supabase Management API...\n');
  console.log('📋 SQL:');
  console.log(SQL_V39);

  // Endpoint da Management API do Supabase
  const resp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`
    },
    body: JSON.stringify({ query: SQL_V39 })
  });

  const body = await resp.text();
  
  if (resp.ok) {
    console.log('✅ Migração aplicada com sucesso!');
    console.log('Resposta:', body);
  } else {
    console.log(`❌ Falha ao aplicar via Management API (${resp.status}): ${body}`);
    console.log('\n⚠️  A Management API exige um Personal Access Token (PAT) do Supabase,');
    console.log('   não a service_role_key. Por isso retorna 401.\n');
    console.log('🔧 SOLUÇÃO ALTERNATIVA: Tentando via pg_net RPC...\n');
    
    // Tenta via supabase-js rpc exec_sql (se existir)
    const { createClient } = await import('@supabase/supabase-js');
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Tenta exec_sql RPC nativo do Supabase
    const { data: rpcData, error: rpcErr } = await admin.rpc('exec_sql', { sql: SQL_V39 });
    
    if (rpcErr) {
      console.log('❌ RPC exec_sql também falhou:', rpcErr.message);
      console.log('\n📌 AÇÃO MANUAL NECESSÁRIA:');
      console.log('1. Acesse: https://supabase.com/dashboard/project/indshiztdvjgvgnzigqd/sql/new');
      console.log('2. Cole e execute o SQL abaixo:');
      console.log('\n' + SQL_V39);
    } else {
      console.log('✅ SQL executado com sucesso via RPC!');
      console.log(rpcData);
    }
  }
}

applyMigration().catch(console.error);
