import { readFileSync, writeFileSync } from 'fs';

const path = './components/SupportProfessionalManagement.tsx';
const lines = readFileSync(path, 'utf8').split('\n');

// Encontrar linha de início e fim do bloco das abas
let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('bg-white border border-slate-200 rounded-2xl shadow-sm px-4 pt-2 pb-0 mt-6')) {
        startLine = i;
    }
    if (startLine > -1 && i > startLine && lines[i].trim() === '</div>' && endLine === -1) {
        // Procura o fechamento correto — linha com apenas </div> após o bloco
        let depth = 0;
        for (let j = startLine; j <= i; j++) {
            const l = lines[j];
            depth += (l.match(/<div/g) || []).length;
            depth -= (l.match(/<\/div>/g) || []).length;
        }
        if (depth === 0) {
            endLine = i;
            break;
        }
    }
}

console.log(`Bloco encontrado: linha ${startLine + 1} até ${endLine + 1}`);

if (startLine === -1 || endLine === -1) {
    console.error('BLOCO NAO ENCONTRADO');
    process.exit(1);
}

// Verificar se Calendar e Download já estão importados
const importLine = lines.findIndex(l => l.includes('Save, UserCog') || l.includes('Download'));
console.log(`Linha de imports: ${importLine + 1}`);
const hasCalendar = lines.some(l => l.includes('Calendar'));
const hasDownload = lines.some(l => l.includes('Download'));
console.log(`Calendar importado: ${hasCalendar}, Download importado: ${hasDownload}`);

// Novo bloco das abas
const newBlock = [
`                {/* ══════════ SEGMENTED CONTROL ABAS ══════════ */}`,
`                <div className="flex items-center justify-between gap-3 flex-wrap mt-6">`,
`                    <div`,
`                        className="bg-slate-100 rounded-xl p-[5px] inline-flex gap-0.5 overflow-x-auto"`,
`                        role="tablist"`,
`                        aria-label="Lista, histórico de desvinculações ou relatórios"`,
`                    >`,
`                        <button`,
`                            type="button"`,
`                            role="tab"`,
`                            aria-selected={mainListTab === 'lista'}`,
`                            className={\`flex items-center gap-2 px-4 text-sm whitespace-nowrap min-h-[44px] rounded-[9px] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 \${mainListTab === 'lista'`,
`                                ? 'bg-white shadow-md text-[#2563EB] font-medium'`,
`                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}\`}`,
`                            onClick={() => setMainListTab('lista')}`,
`                        >`,
`                            <LayoutList size={16} />`,
`                            Lista`,
`                            <span className={\`text-[11px] font-medium px-2 py-0.5 rounded-full ml-0.5 \${mainListTab === 'lista' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'}\`}>`,
`                                {filteredProfessionals.length}`,
`                            </span>`,
`                        </button>`,
`                        {seesSupportProfInactive ? (`,
`                            <button`,
`                                type="button"`,
`                                role="tab"`,
`                                aria-selected={mainListTab === 'historico'}`,
`                                className={\`flex items-center gap-2 px-4 text-sm whitespace-nowrap min-h-[44px] rounded-[9px] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 \${mainListTab === 'historico'`,
`                                    ? 'bg-white shadow-md text-[#D97706] font-medium'`,
`                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}\`}`,
`                                onClick={() => setMainListTab('historico')}`,
`                            >`,
`                                <History size={16} />`,
`                                Histórico`,
`                                <span className={\`text-[11px] font-medium px-2 py-0.5 rounded-full ml-0.5 \${mainListTab === 'historico' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}\`}>`,
`                                    {historyFilteredRows.length}`,
`                                </span>`,
`                            </button>`,
`                        ) : null}`,
`                        <button`,
`                            type="button"`,
`                            role="tab"`,
`                            aria-selected={mainListTab === 'relatorios'}`,
`                            className={\`flex items-center gap-2 px-4 text-sm whitespace-nowrap min-h-[44px] rounded-[9px] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 \${mainListTab === 'relatorios'`,
`                                ? 'bg-white shadow-md text-[#059669] font-medium'`,
`                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}\`}`,
`                            onClick={() => setMainListTab('relatorios')}`,
`                        >`,
`                            <FileBarChart size={16} />`,
`                            Relatórios`,
`                        </button>`,
`                    </div>`,
`                    {mainListTab === 'lista' && (`,
`                        <button`,
`                            onClick={handleExportCSV}`,
`                            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-all min-h-[44px]"`,
`                        >`,
`                            <Download size={15} /> Exportar lista`,
`                        </button>`,
`                    )}`,
`                    {mainListTab === 'historico' && (`,
`                        <button`,
`                            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-all min-h-[44px]"`,
`                        >`,
`                            <Calendar size={15} /> Filtrar período`,
`                        </button>`,
`                    )}`,
`                    {mainListTab === 'relatorios' && (`,
`                        <button`,
`                            className="flex items-center gap-2 px-3 py-2 bg-[#F97316] text-white text-sm font-medium rounded-lg shadow-[0_4px_12px_rgba(249,115,22,0.30)] hover:shadow-[0_6px_16px_rgba(249,115,22,0.40)] hover:-translate-y-0.5 transition-all min-h-[44px]"`,
`                        >`,
`                            <FileBarChart size={15} /> Gerar relatório`,
`                        </button>`,
`                    )}`,
`                </div>`,
];

// Substituir linhas
lines.splice(startLine, endLine - startLine + 1, ...newBlock);

// Adicionar Calendar ao import se não existir
if (!hasCalendar) {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('LayoutList') && lines[i].includes('import')) {
            lines[i] = lines[i].replace('LayoutList,', 'LayoutList, Calendar,');
            console.log('Calendar adicionado ao import');
            break;
        }
    }
}

writeFileSync(path, lines.join('\n'), 'utf8');
console.log('OK — segmented control aplicado com sucesso');
