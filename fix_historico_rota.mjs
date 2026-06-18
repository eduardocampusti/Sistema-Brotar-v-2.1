import { readFileSync, writeFileSync } from 'fs';

const path = './components/SupportProfessionalManagement.tsx';
const lines = readFileSync(path, 'utf8').split('\n');

let found = 0;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('onClick={() => navigate(`${SUPPORT_PROF_LIST_PATH}/${prof.id}`)')) {
        lines[i] = lines[i].replace(
            'onClick={() => navigate(`${SUPPORT_PROF_LIST_PATH}/${prof.id}`)}',
            'onClick={() => navigate(`${SUPPORT_PROF_LIST_PATH}/edit/${prof.id}`)}'
        );
        found++;
        console.log('Rota corrigida para /edit/:profId na linha', i+1);
        break;
    }
}

if (found === 0) {
    console.error('ONCLICK NAO ENCONTRADO');
    process.exit(1);
}

writeFileSync(path, lines.join('\n'), 'utf8');
console.log('OK — rota do historico corrigida');
