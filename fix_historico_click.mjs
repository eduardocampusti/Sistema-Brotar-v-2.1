import { readFileSync, writeFileSync } from 'fs';

const path = './components/SupportProfessionalManagement.tsx';
const lines = readFileSync(path, 'utf8').split('\n');

// Encontrar a linha da tr do histórico e adicionar onClick + cursor-pointer
let found = 0;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('historyFilteredRows.map(prof => (') && lines[i+1]) {
        // Próxima linha é o <tr>
        for (let j = i+1; j < i+5; j++) {
            if (lines[j].includes('<tr key={prof.id}') && lines[j].includes('hover:bg-slate-50/80')) {
                lines[j] = lines[j]
                    .replace('hover:bg-slate-50/80', 'hover:bg-slate-100 cursor-pointer')
                    .replace('<tr key={prof.id}', '<tr key={prof.id} onClick={() => navigate(`${SUPPORT_PROF_LIST_PATH}/${prof.id}`)} title="Clique para ver a ficha"');
                found++;
                console.log('TR do historico atualizado na linha', j+1);
                break;
            }
        }
        break;
    }
}

if (found === 0) {
    console.error('TR DO HISTORICO NAO ENCONTRADO');
    process.exit(1);
}

writeFileSync(path, lines.join('\n'), 'utf8');
console.log('OK — clique na linha do historico adicionado');
