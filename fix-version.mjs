import { readFileSync, writeFileSync } from 'fs';

const path = 'src/config/version.ts';
let content = readFileSync(path, 'utf8');

// Versão
content = content.replace(/version: 'v2\.4\.109'/g, "version: 'v2.4.110'");
content = content.replace(/display: 'v2\.4\.109/g, "display: 'v2.4.110");

// Changelog
content = content.replace(
  "changelog: [\n    'Melhorias e correções gerais'",
  "changelog: [\n    'Perfil exclusivo da psicóloga com cards premium e foto do aluno',\n    'Tela dedicada do paciente com 6 abas clínicas',\n    'Botão Nova Sessão abre módulo clínico com aluno pré-selecionado',\n    'Barrinhas de complexidade e busca por nome na lista de pacientes',\n    'Correção de crashes por dados null no PatientProfile'"
);

// Release entry - adicionar v2.4.110 antes do v2.4.109
const novaRelease = `    {
      version: 'v2.4.110',
      date: '18 Jun 2026',
      title: 'Release v2.4.110 — Perfil Premium da Psicóloga',
      type: 'feature',
      changes: [
        'Lista de pacientes em cards premium com foto, barrinhas de complexidade e última sessão',
        'Tela dedicada do paciente com 6 abas: Resumo, Sessões, Anamnese, Percepções, Evolução, Documentos',
        'Cabeçalho roxo com foto real do aluno e fallback para inicial colorida',
        'Botão Nova Sessão abre o módulo clínico com aluno já selecionado automaticamente',
        'Busca por nome na lista de pacientes da psicóloga',
        'Correção de crashes por campos null no PatientProfile',
        'Correção de rota inexistente substituída por deep link correto'
      ]
    },\n`;

content = content.replace(
  "    {\n      version: 'v2.4.109'",
  novaRelease + "    {\n      version: 'v2.4.109'"
);

writeFileSync(path, content, 'utf8');
console.log('version.ts atualizado para v2.4.110');
