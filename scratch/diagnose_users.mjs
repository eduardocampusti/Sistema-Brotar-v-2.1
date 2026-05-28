import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Carrega as variáveis do .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'] || 'https://indshiztdvjgvgnzigqd.supabase.co';
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY não encontrada no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
  console.log('=== DIAGNÓSTICO DE USUÁRIOS E PERFIS ===');
  
  // 1. Busca todos os perfis com a especialidade SERVICO_SOCIAL ou que tenham "social" no cargo/username
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*');
    
  if (error) {
    console.error('Erro ao buscar perfis:', error.message);
    return;
  }
  
  console.log(`Total de perfis cadastrados: ${profiles.length}`);
  
  const socialWorkers = profiles.filter(p => {
    const spec = String(p.specialty || '').toUpperCase();
    const name = String(p.full_name || '').toLowerCase();
    const email = String(p.email || '').toLowerCase();
    const job = String(p.job_title || '').toLowerCase();
    return spec.includes('SOCIAL') || name.includes('social') || email.includes('social') || job.includes('social') || name.includes('assistente') || job.includes('assistente');
  });
  
  console.log('\n--- Usuários Relacionados ao Serviço Social / Assistente ---');
  if (socialWorkers.length === 0) {
    console.log('Nenhum usuário encontrado com critérios de serviço social.');
  } else {
    socialWorkers.forEach(p => {
      console.log({
        id: p.id,
        full_name: p.full_name,
        username: p.username,
        email: p.email,
        role: p.role,
        specialty: p.specialty,
        job_title: p.job_title,
        is_active: p.is_active,
        scope: p.scope,
        school_id: p.school_id
      });
    });
  }
}

diagnose().catch(console.error);
