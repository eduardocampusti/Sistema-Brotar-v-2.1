import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🔍 Verificando políticas RLS em clinical_sessions...\n');

  const { data, error } = await admin.rpc('query_rls_policies', {}).catch(() => ({ data: null, error: 'rpc not found' }));

  // Fallback: query direta via SQL raw
  const { data: policies, error: polErr } = await admin
    .from('pg_policies')
    .select('policyname, cmd, qual, with_check')
    .eq('tablename', 'clinical_sessions')
    .catch(() => ({ data: null, error: 'table not accessible' }));

  if (polErr) {
    // Tenta via execute_sql equivalente usando REST
    console.log('⚠️  Acesso a pg_policies negado via cliente. Tentando via RPC...\n');
    
    // Verifica se a policy V39 existe testando inserção com service_role (deve funcionar sempre)
    const testPayload = {
      professional_id: '00000000-0000-0000-0000-000000000001',
      student_id: '00000000-0000-0000-0000-000000000001',
      specialty: 'SERVICO_SOCIAL',
      session_date: new Date().toISOString().split('T')[0],
      session_type: 'Evolução',
      notes: '__TESTE_RLS_V39__',
      status: 'completed'
    };

    const { data: insertData, error: insertError } = await admin
      .from('clinical_sessions')
      .insert(testPayload)
      .select('id');

    if (insertError) {
      console.log('❌ Inserção com service_role falhou:', insertError.message);
    } else {
      console.log('✅ Inserção com service_role OK. Limpando registro de teste...');
      if (insertData?.[0]?.id) {
        await admin.from('clinical_sessions').delete().eq('id', insertData[0].id);
        console.log('🧹 Registro de teste removido.');
      }
    }
  } else {
    console.log('Políticas encontradas:');
    console.table(policies);
  }

  // Testa com usuário anon (deve falhar por RLS)
  const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: anonData, error: anonErr } = await anonClient
    .from('clinical_sessions')
    .select('id')
    .limit(1);

  console.log('\n📋 Acesso anon a clinical_sessions:');
  if (anonErr) {
    console.log('  → Bloqueado pelo RLS (esperado):', anonErr.message);
  } else {
    console.log('  → AVISO: Acesso liberado sem autenticação!', anonData);
  }

  console.log('\n✅ Diagnóstico concluído.');
  console.log('\n💡 Para aplicar a V39 no banco, execute o SQL abaixo no Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/indshiztdvjgvgnzigqd/sql\n');
  console.log(`
DROP POLICY IF EXISTS "Especialista só cria na sua área" ON public.clinical_sessions;
DROP POLICY IF EXISTS "Permitir inserção de novas sessões" ON public.clinical_sessions;

CREATE POLICY "Permitir inserção de novas sessões"
  ON public.clinical_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK ( professional_id = auth.uid() );

NOTIFY pgrst, 'reload config';
  `);
}

main().catch(console.error);
