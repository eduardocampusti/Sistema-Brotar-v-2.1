import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const VERSION_FILE = path.join(process.cwd(), 'src', 'config', 'version.ts');

/**
 * Mapeamento de arquivos para descrições amigáveis
 */
const MAPPINGS = [
  { pattern: /^src\/pages\/RelatorioTEAPage\.tsx$/, description: "Painel de Monitoramento TEA" },
  { pattern: /^services\/SupabaseService\.ts$/, description: "Atualização da camada de dados" },
  { pattern: /^components\/Layout\.tsx$/, description: "Ajustes no menu e navegação" },
  { pattern: /^src\/config\/version\.ts$/, description: "Atualização de versão do sistema" },
  { pattern: /^db\/migrations\//, description: "Migração de banco de dados" },
  { pattern: /^utils\/pdfExport\.ts$/, description: "Exportação PDF atualizada" },
  { pattern: /^src\/pages\/Sobre/, description: "Página Sobre atualizada" }
];

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return output.split('\n').map(f => f.trim()).filter(f => f.length > 0);
  } catch (e) {
    return [];
  }
}

function generateChanges(files) {
  const descriptions = new Set();
  let hasOtherChanges = false;

  for (const file of files) {
    // Ignorar explicitamente
    if (file === 'server.mjs') continue;
    
    let matched = false;
    for (const mapping of MAPPINGS) {
      if (mapping.pattern.test(file)) {
        descriptions.add(mapping.description);
        matched = true;
        break;
      }
    }
    
    // Se não bateu em nenhum mapeamento e não é o próprio arquivo de versão (que será alterado)
    if (!matched && file !== 'src/config/version.ts' && file !== 'package.json' && file !== 'package-lock.json') {
      hasOtherChanges = true;
    }
  }

  if (hasOtherChanges) {
    descriptions.add("Melhorias e correções gerais");
  }

  // Se por algum motivo o set estiver vazio (ex: só mudou server.mjs), adiciona o padrão
  if (descriptions.size === 0) {
    descriptions.add("Atualizações de manutenção");
  }

  return Array.from(descriptions);
}

async function bumpVersion() {
  try {
    if (!fs.existsSync(VERSION_FILE)) {
      console.error('Arquivo de versão não encontrado!');
      process.exit(0); // Exit 0 para não travar o commit
    }

    const content = fs.readFileSync(VERSION_FILE, 'utf8');
    
    // Extrair versão atual (ex: v2.1.0)
    const versionMatch = content.match(/version:\s*'v2\.1\.(\d+)'/);
    if (!versionMatch) {
      console.error('Não foi possível encontrar a versão v2.1.X no arquivo!');
      process.exit(0);
    }

    const currentPatch = parseInt(versionMatch[1], 10);
    const nextPatch = currentPatch + 1;
    const nextVersion = `v2.1.${nextPatch}`;

    // Gerar data atual em português
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const monthYear = `${months[now.getMonth()]} ${now.getFullYear()}`;
    const dayMonthYear = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

    // Detectar alterações automaticamente
    const stagedFiles = getStagedFiles();
    const changes = generateChanges(stagedFiles);
    
    // Título automático
    const title = `Release ${nextVersion} — ${dayMonthYear}`;
    
    // Determinar tipo (se houver migração ou TEA, é feature, senão improvement)
    const hasFeature = stagedFiles.some(f => f.includes('RelatorioTEA') || f.includes('db/migrations'));
    const type = hasFeature ? 'feature' : 'improvement';

    console.log(`--- Automação: Gerando ${nextVersion} ---`);
    console.log(`Título: ${title}`);
    console.log(`Arquivos detectados: ${stagedFiles.length}`);

    // Construir novo objeto de changelog
    const newEntry = `    {
      version: '${nextVersion}',
      date: '${dayMonthYear}',
      title: '${title}',
      type: '${type}',
      changes: ${JSON.stringify(changes, null, 8).replace(/\]$/, '      ]')}\n    },`;

    // Atualizar campos globais
    let newContent = content
      .replace(/version:\s*'v2\.1\.\d+'/, `version: '${nextVersion}'`)
      .replace(/date:\s*'.*?'/, `date: '${monthYear}'`)
      .replace(/display:\s*'.*?'/, `display: '${nextVersion} • ${monthYear}'`);

    // Inserir novo changelog no topo do array
    newContent = newContent.replace(/changelog:\s*\[/, `changelog: [\n${newEntry}`);

    fs.writeFileSync(VERSION_FILE, newContent, 'utf8');

    console.log(`✅ Versão ${nextVersion} incrementada automaticamente.`);
    process.exit(0);
  } catch (error) {
    console.error('Erro na automação de versão:', error);
    process.exit(0);
  }
}

bumpVersion();
