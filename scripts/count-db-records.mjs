/**
 * Conta registros em public.students e public.support_professionals.
 * Carrega .env.local e depois .env (mesma ordem do Vite).
 *
 * Com VITE_SUPABASE_ANON_KEY o RLS pode zerar ou negar leitura sem sessão.
 * Para totais reais no servidor, defina SUPABASE_SERVICE_ROLE_KEY no .env.local
 * (nunca commitar essa chave).
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: join(root, '.env.local') });
dotenv.config({ path: join(root, '.env') });

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const key = serviceKey || anonKey;

if (!url || !key) {
  console.error(
    'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou SUPABASE_SERVICE_ROLE_KEY) em .env.local ou .env.'
  );
  process.exit(1);
}

if (!serviceKey) {
  console.warn(
    '[db:count] Usando chave anon — sem login o RLS pode retornar 0 ou erro. Para totais completos, use SUPABASE_SERVICE_ROLE_KEY no .env.local.\n'
  );
}

const supabase = createClient(url, key);

async function countTable(table) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true });

  if (error) {
    return { table, count: null, error: error.message };
  }
  return { table, count, error: null };
}

async function main() {
  const [students, professionals] = await Promise.all([
    countTable('students'),
    countTable('support_professionals'),
  ]);

  for (const row of [students, professionals]) {
    if (row.error) {
      console.error(`${row.table}: erro — ${row.error}`);
    } else {
      const label =
        row.table === 'students'
          ? 'Alunos cadastrados'
          : 'Profissionais de apoio';
      console.log(`${label}: ${row.count}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
