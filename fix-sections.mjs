import { readFileSync, writeFileSync } from 'fs';
const path = 'components/ClinicalPages.tsx';
let c = readFileSync(path, 'utf8');

const replacements = [
  ['{/* Seção 3 - Queixa Principal */}\n                            <div className="bg-white border border-slate-100 rounded-2xl p-5">', '{/* Seção 3 - Queixa Principal */}\n                            <div id="psych-sec-3" data-psych-section="psych-sec-3" className="bg-white border border-slate-100 rounded-2xl p-5 scroll-mt-28">'],
  ['{/* Seção 4 - Histórico Desenvolvimento */}\n                            <div className="bg-white border border-slate-100 rounded-2xl p-5">', '{/* Seção 4 - Histórico Desenvolvimento */}\n                            <div id="psych-sec-4" data-psych-section="psych-sec-4" className="bg-white border border-slate-100 rounded-2xl p-5 scroll-mt-28">'],
  ['{/* Seção 5 - Contexto Familiar */}\n                            <div className="bg-white border border-slate-100 rounded-2xl p-5">', '{/* Seção 5 - Contexto Familiar */}\n                            <div id="psych-sec-5" data-psych-section="psych-sec-5" className="bg-white border border-slate-100 rounded-2xl p-5 scroll-mt-28">'],
  ['{/* Seção 6 - Funcionamento Escolar */}\n                            <div className="bg-white border border-slate-100 rounded-2xl p-5">', '{/* Seção 6 - Funcionamento Escolar */}\n                            <div id="psych-sec-6" data-psych-section="psych-sec-6" className="bg-white border border-slate-100 rounded-2xl p-5 scroll-mt-28">'],
  ['{/* Seção 7 - Comportamentos Observados */}\n                            <div className="bg-white border border-slate-100 rounded-2xl p-5">', '{/* Seção 7 - Comportamentos Observados */}\n                            <div id="psych-sec-7" data-psych-section="psych-sec-7" className="bg-white border border-slate-100 rounded-2xl p-5 scroll-mt-28">'],
  ['{/* Seção 8 - Intervenções */}\n                            <div className="bg-white border border-slate-100 rounded-2xl p-5">', '{/* Seção 8 - Intervenções */}\n                            <div id="psych-sec-8" data-psych-section="psych-sec-8" className="bg-white border border-slate-100 rounded-2xl p-5 scroll-mt-28">'],
];

let count = 0;
for (const [from, to] of replacements) {
  if (c.includes(from)) { c = c.replace(from, to); count++; }
}

// Seções 9 e 10 são renderizadas dinamicamente em um .map — adicionar id ao wrapper
c = c.replace(
  'return (\n                              <div key={key} className="bg-white border border-slate-100 rounded-2xl p-5">',
  'const secId = key === \'observacoesPsicologa\' ? \'psych-sec-9\' : \'psych-sec-10\';\n                              return (\n                              <div key={key} id={secId} data-psych-section={secId} className="bg-white border border-slate-100 rounded-2xl p-5 scroll-mt-28">'
);

writeFileSync(path, c, 'utf8');
console.log(`OK — ${count} seções substituídas`);
