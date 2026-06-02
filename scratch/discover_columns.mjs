import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const LOISEANE_ID = '42ebf32a-6b7c-4318-b3c8-059a3251b495';
const STUDENT_ID = '0233fd64-b31c-4d13-9e21-e1597a32910e';

async function tryInsert(label, payload) {
  const { data, error } = await admin
    .from('clinical_sessions')
    .insert(payload)
    .select('*');
  
  if (error) {
    console.log(`❌ [${label}] FALHOU: ${error.message}`);
    return null;
  }
  
  console.log(`✅ [${label}] SUCESSO!`);
  console.log('   Colunas:', Object.keys(data[0]).join(', '));
  
  // Limpa o registro de teste
  if (data[0]?.id) {
    await admin.from('clinical_sessions').delete().eq('id', data[0].id);
    console.log('   🧹 Registro removido.');
  }
  return data[0];
}

async function main() {
  console.log('🔍 Descobrindo colunas reais da tabela clinical_sessions...\n');
  
  // Payload mínimo - apenas os obrigatórios mais prováveis
  const base = {
    professional_id: LOISEANE_ID,
    student_id: STUDENT_ID,
    specialty: 'SERVICO_SOCIAL',
  };

  // Testa diferentes combinações de campos de data e conteúdo
  await tryInsert('session_date + content (json)', { ...base, session_date: '2026-05-28', content: { summary: 'teste' } });
  await tryInsert('date + content (json)', { ...base, date: '2026-05-28', content: { summary: 'teste' } });
  await tryInsert('session_date sem conteúdo', { ...base, session_date: '2026-05-28' });
  await tryInsert('date sem conteúdo', { ...base, date: '2026-05-28' });
  await tryInsert('session_date + notes_text', { ...base, session_date: '2026-05-28', notes_text: 'teste' });
  await tryInsert('session_date + observations', { ...base, session_date: '2026-05-28', observations: 'teste' });
  await tryInsert('session_date + description', { ...base, session_date: '2026-05-28', description: 'teste' });
  await tryInsert('session_date + session_notes', { ...base, session_date: '2026-05-28', session_notes: 'teste' });
  
  // Testa com session_type (campo presente no supabase_schema.sql)
  await tryInsert('session_date + session_type + content', { 
    ...base, 
    session_date: '2026-05-28', 
    session_type: 'Evolução',
    content: { summary: 'teste' }
  });
  
  console.log('\n📌 Verificando schema pelo arquivo supabase_schema.sql local...');
}

main().catch(console.error);
