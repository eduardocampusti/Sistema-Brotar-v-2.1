import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔗 Conectando ao banco:', supabaseUrl);

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkAndApplyV39() {
  console.log('\n== PASSO 1: Verificar política atual ==');
  
  // Lê a política atual via raw SQL usando o REST da API
  const checkResp = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rls_policy`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ table_name: 'clinical_sessions' })
  });

  // Como não temos a RPC, vamos testar diretamente:
  // Fazemos um INSERT com professional_id = UUID aleatório e verificamos se o erro é RLS ou FK
  
  console.log('\n== PASSO 2: Teste de inserção com service_role ==');
  const testId = crypto.randomUUID();
  
  // Primeiro pega um student_id válido
  const { data: students } = await admin.from('students').select('id').limit(1);
  const { data: profiles } = await admin.from('profiles').select('id, full_name, specialty, role').limit(5);
  
  console.log('\n📋 Primeiros 5 perfis no banco:');
  profiles?.forEach(p => console.log(`  - [${p.role}] ${p.full_name} (specialty: ${p.specialty})`));
  
  console.log('\n📋 Student ID para teste:', students?.[0]?.id ?? 'NENHUM');
  
  if (!students?.[0]?.id) {
    console.log('❌ Sem alunos no banco para testar. Abortando.');
    return;
  }

  // Busca um profissional de serviço social
  const { data: socialProf } = await admin
    .from('profiles')
    .select('id, full_name, specialty')
    .eq('specialty', 'SERVICO_SOCIAL')
    .limit(1);

  console.log('\n👤 Profissional de Serviço Social:', socialProf?.[0] ?? 'NENHUM ENCONTRADO');

  console.log('\n== PASSO 3: Verificar políticas RLS via SQL direto ==');
  
  // Usa o endpoint de SQL do Supabase Management API  
  const sqlResp = await fetch(`https://api.supabase.com/v1/projects/indshiztdvjgvgnzigqd/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`
    },
    body: JSON.stringify({
      query: `SELECT policyname, cmd, with_check FROM pg_policies WHERE tablename = 'clinical_sessions' ORDER BY cmd, policyname;`
    })
  });

  if (sqlResp.ok) {
    const result = await sqlResp.json();
    console.log('\n📋 Políticas RLS atuais:');
    console.table(result);
  } else {
    console.log('⚠️  Management API não disponível. Status:', sqlResp.status);
    
    // Alternativa: testar se a V39 foi aplicada fazendo um INSERT simulado
    console.log('\n== PASSO 4: Teste de inserção com autenticação de usuário real ==');
    console.log('Para verificar se a V39 funciona, precisamos do login da Loiseane.');
    console.log('\n📌 AÇÃO NECESSÁRIA: Execute o SQL no Supabase Dashboard:');
    console.log('👉 https://supabase.com/dashboard/project/indshiztdvjgvgnzigqd/sql/new');
    console.log('\n--- SQL PARA COPIAR E COLAR ---');
    
    const sqlV39 = readFileSync('./db/migrations/V39_fix_clinical_sessions_rls.sql', 'utf8');
    console.log(sqlV39);
    console.log('--- FIM DO SQL ---');
  }
}

checkAndApplyV39().catch(console.error);
