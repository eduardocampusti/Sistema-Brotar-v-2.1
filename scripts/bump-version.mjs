import fs from 'fs';
import path from 'path';
import readline from 'readline';

const VERSION_FILE = path.join(process.cwd(), 'src', 'config', 'version.ts');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function bumpVersion() {
  try {
    if (!fs.existsSync(VERSION_FILE)) {
      console.error('Arquivo de versão não encontrado!');
      process.exit(1);
    }

    const content = fs.readFileSync(VERSION_FILE, 'utf8');
    
    // Extrair versão atual (ex: v2.1.0)
    const versionMatch = content.match(/version:\s*'v2\.1\.(\d+)'/);
    if (!versionMatch) {
      console.error('Não foi possível encontrar a versão v2.1.X no arquivo!');
      process.exit(1);
    }

    const currentPatch = parseInt(versionMatch[1], 10);
    const nextPatch = currentPatch + 1;
    const nextVersion = `v2.1.${nextPatch}`;

    // Gerar data atual em português
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const monthYear = `${months[now.getMonth()]} ${now.getFullYear()}`;
    const dayMonthYear = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

    console.log(`\n--- Incrementando versão: ${versionMatch[0].split("'")[1]} -> ${nextVersion} ---`);

    const title = await question('Título da versão: ');
    
    console.log('O que foi alterado? (uma por linha, enter vazio para finalizar):');
    const changes = [];
    while (true) {
      const change = await question('- ');
      if (!change.trim()) break;
      changes.push(change.trim());
    }

    if (changes.length === 0) {
      console.log('Nenhuma alteração registrada. Abortando.');
      process.exit(0);
    }

    const type = await question('Tipo (feature|fix|improvement|security) [feature]: ') || 'feature';

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

    console.log(`\n✅ Versão ${nextVersion} registrada com sucesso em version.ts!`);
    process.exit(0);
  } catch (error) {
    console.error('Erro ao processar versão:', error);
    process.exit(0); // Exit 0 para não bloquear git se solicitado
  } finally {
    rl.close();
  }
}

bumpVersion();
