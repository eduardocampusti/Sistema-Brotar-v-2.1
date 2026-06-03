import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const VERSION_FILE = path.join(process.cwd(), 'src', 'config', 'version.ts');
const PACKAGE_FILE = path.join(process.cwd(), 'package.json');

// Tipo de bump: patch | minor | major (passado como argumento)
const bumpType = process.argv[2] || 'patch';
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('❌ Tipo inválido. Use: patch | minor | major');
  process.exit(1);
}

const MAPPINGS = [
  { pattern: /^src\/pages\/RelatorioTEAPage\.tsx$/, description: "Painel de Monitoramento TEA" },
  { pattern: /^services\/SupabaseService\.ts$/, description: "Atualização da camada de dados" },
  { pattern: /^components\/Layout\.tsx$/, description: "Ajustes no menu e navegação" },
  { pattern: /^db\/migrations\//, description: "Migração de banco de dados" },
  { pattern: /^utils\/pdfExport\.ts$/, description: "Exportação PDF atualizada" },
  { pattern: /^components\/RelatorioAnualTCM\.tsx$/, description: "Relatório Anual TCM" },
  { pattern: /^components\/DocumentGenerator\.tsx$/, description: "Gerador de documentos" },
  { pattern: /^components\/ClinicalPages\.tsx$/, description: "Módulos clínicos" },
  { pattern: /^services\/geminiService\.ts$/, description: "Serviço de IA atualizado" },
];

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return output.split('\n').map(f => f.trim()).filter(f => f.length > 0);
  } catch { return []; }
}

function generateChanges(files) {
  const descriptions = new Set();
  let hasOther = false;
  for (const file of files) {
    if (file === 'server.mjs') continue;
    let matched = false;
    for (const m of MAPPINGS) {
      if (m.pattern.test(file)) { descriptions.add(m.description); matched = true; break; }
    }
    if (!matched && !['src/config/version.ts','package.json','package-lock.json'].includes(file)) {
      hasOther = true;
    }
  }
  if (hasOther) descriptions.add('Melhorias e correções gerais');
  if (descriptions.size === 0) descriptions.add('Atualização de manutenção');
  return Array.from(descriptions);
}

function bumpSemver(current, type) {
  // Aceita vX.Y.Z ou X.Y.Z
  const clean = current.replace(/^v/, '');
  const parts = clean.split('.').map(Number);
  let [major, minor, patch] = parts;
  if (type === 'major') { major++; minor = 0; patch = 0; }
  else if (type === 'minor') { minor++; patch = 0; }
  else { patch++; }
  return `v${major}.${minor}.${patch}`;
}

async function run() {
  if (!fs.existsSync(VERSION_FILE)) {
    console.error('❌ Arquivo version.ts não encontrado!');
    process.exit(0);
  }

  const content = fs.readFileSync(VERSION_FILE, 'utf8');
  const match = content.match(/version:\s*'(v[\d.]+)'/);
  if (!match) {
    console.error('❌ Não encontrou padrão version: "vX.Y.Z" no arquivo!');
    process.exit(0);
  }

  const currentVersion = match[1];
  const nextVersion = bumpSemver(currentVersion, bumpType);

  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const now = new Date();
  const monthYear = `${months[now.getMonth()]} ${now.getFullYear()}`;
  const dayMonthYear = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  const files = getStagedFiles();
  const changes = generateChanges(files);
  const changesArray = JSON.stringify(changes).replace(/"/g, "'");

  const title = `Release ${nextVersion} — ${dayMonthYear}`;
  const hasFeature = files.some(f => f.includes('db/migrations'));
  const type = hasFeature ? 'feature' : 'improvement';

  const newEntry = `    {
      version: '${nextVersion}',
      date: '${dayMonthYear}',
      title: '${title}',
      type: '${type}',
      changes: ${JSON.stringify(changes, null, 8).replace(/\]$/, '      ]')}\n    },`;

  // Atualizar version.ts
  let updated = content
    .replace(/version:\s*'v[\d.]+'/, `version: '${nextVersion}'`)
    .replace(/date:\s*'.*?'/, `date: '${monthYear}'`)
    .replace(/display:\s*'.*?'/, `display: '${nextVersion} • ${monthYear}'`)
    .replace(/changelog:\s*\[[\s\S]*?\]/, `changelog: [${changesArray.slice(1,-1).split(',').map(c => `\n    ${c}`).join(',')}  \n  ]`);

  updated = updated.replace(/releases:\s*\[/, `releases: [\n${newEntry}`);

  fs.writeFileSync(VERSION_FILE, updated, 'utf8');

  // Atualizar package.json
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_FILE, 'utf8'));
  pkg.version = nextVersion.replace('v', '');
  fs.writeFileSync(PACKAGE_FILE, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  // Adicionar ao stage
  execSync(`git add "${VERSION_FILE}" "${PACKAGE_FILE}"`);

  const labels = { patch: '🔧 PATCH', minor: '✨ MINOR', major: '🚀 MAJOR' };
  console.log(`\n${labels[bumpType]} ${currentVersion} → ${nextVersion}`);
  console.log(`📋 Mudanças: ${changes.join(', ')}`);
  console.log(`📅 Data: ${monthYear}\n`);
}

run().catch(e => { console.error(e); process.exit(0); });
