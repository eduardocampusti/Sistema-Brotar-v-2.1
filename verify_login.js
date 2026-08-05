import { requireEnv } from './scripts/require-env.mjs';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseKey = 'sb_publishable_oAH4fnuFeQQhJe_IVwUiSA_z5lVt99q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Tentando login com admin@brotar.com...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: requireEnv('SCRIPT_USER_EMAIL'),
    password: requireEnv('SCRIPT_USER_PASSWORD')
  });

  if (error) {
    console.log("RESULTADO: ERRO - " + error.message);
  } else {
    console.log("RESULTADO: SUCESSO - Usuário encontrado com ID: " + data.user.id);
  }
}

check();
