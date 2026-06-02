import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🔍 Verificando estrutura real da tabela clinical_sessions...\n');

  // Lê um registro existente para ver os campos reais
  const { data: sample, error } = await admin
    .from('clinical_sessions')
    .select('*')
    .limit(3);

  if (error) {
    console.error('❌ Erro ao ler tabela:', error.message);
    return;
  }

  if (!sample || sample.length === 0) {
    console.log('⚠️  Tabela vazia. Verificando via information_schema...');
    
    // Insere um registro de teste para ver quais campos existem
    const testPayload = {
      professional_id: '42ebf32a-6b7c-4318-b3c8-059a3251b495', // Loiseane
      student_id: '0233fd64-b31c-4d13-9e21-e1597a32910e',
      specialty: 'SERVICO_SOCIAL',
      date: new Date().toISOString().split('T')[0],
      notes: '__TESTE__',
      content: { summary: 'Teste de diagnóstico' }
    };

    const { data: inserted, error: insertErr } = await admin
      .from('clinical_sessions')
      .insert(testPayload)
      .select('*');

    if (insertErr) {
      console.log('❌ Inserção com payload "date" falhou:', insertErr.message);
      
      // Tenta com session_date
      const testPayload2 = {
        professional_id: '42ebf32a-6b7c-4318-b3c8-059a3251b495',
        student_id: '0233fd64-b31c-4d13-9e21-e1597a32910e',
        specialty: 'SERVICO_SOCIAL',
        session_date: new Date().toISOString().split('T')[0],
        notes: '__TESTE__'
      };

      const { data: inserted2, error: insertErr2 } = await admin
        .from('clinical_sessions')
        .insert(testPayload2)
        .select('*');

      if (insertErr2) {
        console.log('❌ Inserção com payload "session_date" também falhou:', insertErr2.message);
      } else {
        console.log('✅ Inserção com "session_date" FUNCIONOU!');
        console.log('📋 Registro inserido:', JSON.stringify(inserted2[0], null, 2));
        
        // Remove o registro de teste
        if (inserted2[0]?.id) {
          await admin.from('clinical_sessions').delete().eq('id', inserted2[0].id);
          console.log('🧹 Registro de teste removido.');
        }
      }
    } else {
      console.log('✅ Inserção com "date" funcionou!');
      console.log('📋 Colunas disponíveis:', Object.keys(inserted[0]).join(', '));
      console.log('📋 Registro inserido:', JSON.stringify(inserted[0], null, 2));
      
      if (inserted[0]?.id) {
        await admin.from('clinical_sessions').delete().eq('id', inserted[0].id);
        console.log('🧹 Registro de teste removido.');
      }
    }
  } else {
    console.log('📋 Estrutura real da tabela (baseada em dados existentes):');
    console.log('Colunas:', Object.keys(sample[0]).join(', '));
    console.log('\nExemplo de registro:');
    console.log(JSON.stringify(sample[0], null, 2));
  }
}

main().catch(console.error);
