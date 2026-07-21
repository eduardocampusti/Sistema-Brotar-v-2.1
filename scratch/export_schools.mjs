import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Carrega as variáveis de ambiente do .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Erro: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function exportSchools() {
  try {
    // Busca todas as escolas ordenadas por nome
    const { data: schools, error } = await supabase
      .from('schools')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao buscar escolas:', error.message);
      process.exit(1);
    }

    const jsonContent = JSON.stringify(schools, null, 2);
    
    // Salva o JSON na raiz do projeto
    const outputPath = path.resolve('escolas.json');
    fs.writeFileSync(outputPath, jsonContent, 'utf-8');
    
    console.log(`Sucesso! ${schools.length} escolas exportadas para o arquivo: ${outputPath}`);
  } catch (err) {
    console.error('Erro inesperado:', err);
    process.exit(1);
  }
}

exportSchools();
