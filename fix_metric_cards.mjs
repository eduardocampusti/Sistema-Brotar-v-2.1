import { readFileSync, writeFileSync } from 'fs';

const path = './components/SupportProfessionalManagement.tsx';
let content = readFileSync(path, 'utf8');

// 1. Adicionar 'sem_vinculo' ao tipo de filtro
content = content.replace(
  `type SupportProfessionalListStatusFilter = 'all' | 'ativo' | 'desvinculado';`,
  `type SupportProfessionalListStatusFilter = 'all' | 'ativo' | 'desvinculado' | 'sem_vinculo';`
);

// 2. Adicionar lógica de filtro sem_vinculo após o bloco de statusListFilter
content = content.replace(
  `        if (statusListFilter === 'ativo') {
            result = result.filter(p => isSupportProfessionalActive(p));
        } else if (statusListFilter === 'desvinculado') {
            result = result.filter(p => !isSupportProfessionalActive(p));
        }`,
  `        if (statusListFilter === 'ativo') {
            result = result.filter(p => isSupportProfessionalActive(p) && p.studentId);
        } else if (statusListFilter === 'sem_vinculo') {
            result = result.filter(p => isSupportProfessionalActive(p) && !p.studentId);
        } else if (statusListFilter === 'desvinculado') {
            result = result.filter(p => !isSupportProfessionalActive(p));
        }`
);

// 3. Substituir bloco dos cards de métricas
const oldCards = `                {/* ══════════ CARDS DE MÉTRICAS ══════════ */}
                <div className="grid gap-3 mt-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-none flex flex-col justify-between min-h-[100px]">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                                <Users size={16} className="text-green-700" />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-tight">Total cadastrados</span>
                        </div>
                        <div>
                            <div className="text-3xl font-semibold text-slate-800">{metrics.total}</div>
                            <div className="text-xs text-slate-400 mt-1">profissionais no sistema</div>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-none flex flex-col justify-between min-h-[100px]">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <UserCheck size={16} className="text-blue-700" />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-tight">Ativos com vínculo</span>
                        </div>
                        <div>
                            <div className="text-3xl font-semibold text-slate-800">{metrics.ativosVinculados}</div>
                            <div className="text-xs text-slate-400 mt-1">vinculados a um aluno</div>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-none flex flex-col justify-between min-h-[100px]">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                                <UserX size={16} className="text-amber-700" />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-tight">Sem vínculo de aluno</span>
                        </div>
                        <div>
                            <div className="text-3xl font-semibold text-slate-800">{metrics.ativosSemVinculo}</div>
                            <div className="text-xs text-slate-400 mt-1">só vinculados à escola</div>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-none flex flex-col justify-between min-h-[100px]">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                                <UserMinus size={16} className="text-red-700" />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-tight">Desvinculados</span>
                        </div>
                        <div>
                            <div className="text-3xl font-semibold text-slate-800">{metrics.desvinculados}</div>
                            <div className="text-xs text-slate-400 mt-1">inativos no sistema</div>
                        </div>
                    </div>
                </div>`;

const newCards = `                {/* ══════════ CARDS DE MÉTRICAS CLICÁVEIS ══════════ */}
                <div className="grid gap-3 mt-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                    {/* Card Total */}
                    <button
                        onClick={() => { setStatusListFilter('all'); setMainListTab('lista'); }}
                        className="group text-left bg-[#EAF3DE] border border-[#C0DD97] rounded-2xl p-4 flex flex-col justify-between min-h-[100px] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(59,109,17,0.18)] hover:border-[#97C459] focus-visible:ring-2 focus-visible:ring-green-500"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center flex-shrink-0 group-hover:bg-white/80 transition-colors">
                                <Users size={16} className="text-[#3B6D11]" />
                            </div>
                            <span className="text-xs font-semibold text-[#3B6D11] uppercase tracking-wider leading-tight">Total cadastrados</span>
                        </div>
                        <div>
                            <div className="text-3xl font-semibold text-[#27500A]">{metrics.total}</div>
                            <div className="text-xs text-[#3B6D11] mt-1">profissionais no sistema</div>
                        </div>
                    </button>
                    {/* Card Ativos com vínculo */}
                    <button
                        onClick={() => { setStatusListFilter('ativo'); setMainListTab('lista'); }}
                        className="group text-left bg-[#E6F1FB] border border-[#B5D4F4] rounded-2xl p-4 flex flex-col justify-between min-h-[100px] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(24,95,165,0.18)] hover:border-[#85B7EB] focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center flex-shrink-0 group-hover:bg-white/80 transition-colors">
                                <UserCheck size={16} className="text-[#185FA5]" />
                            </div>
                            <span className="text-xs font-semibold text-[#185FA5] uppercase tracking-wider leading-tight">Ativos com vínculo</span>
                        </div>
                        <div>
                            <div className="text-3xl font-semibold text-[#0C447C]">{metrics.ativosVinculados}</div>
                            <div className="text-xs text-[#185FA5] mt-1">vinculados a um aluno</div>
                        </div>
                    </button>
                    {/* Card Sem vínculo */}
                    <button
                        onClick={() => { setStatusListFilter('sem_vinculo'); setMainListTab('lista'); }}
                        className="group text-left bg-[#FAEEDA] border border-[#FAC775] rounded-2xl p-4 flex flex-col justify-between min-h-[100px] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(133,79,11,0.18)] hover:border-[#EF9F27] focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center flex-shrink-0 group-hover:bg-white/80 transition-colors">
                                <UserX size={16} className="text-[#854F0B]" />
                            </div>
                            <span className="text-xs font-semibold text-[#854F0B] uppercase tracking-wider leading-tight">Sem vínculo de aluno</span>
                        </div>
                        <div>
                            <div className="text-3xl font-semibold text-[#633806]">{metrics.ativosSemVinculo}</div>
                            <div className="text-xs text-[#854F0B] mt-1">só vinculados à escola</div>
                        </div>
                    </button>
                    {/* Card Desvinculados */}
                    <button
                        onClick={() => { setStatusListFilter('desvinculado'); setMainListTab('lista'); }}
                        className="group text-left bg-[#FCEBEB] border border-[#F7C1C1] rounded-2xl p-4 flex flex-col justify-between min-h-[100px] cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(163,45,45,0.18)] hover:border-[#F09595] focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center flex-shrink-0 group-hover:bg-white/80 transition-colors">
                                <UserMinus size={16} className="text-[#A32D2D]" />
                            </div>
                            <span className="text-xs font-semibold text-[#A32D2D] uppercase tracking-wider leading-tight">Desvinculados</span>
                        </div>
                        <div>
                            <div className="text-3xl font-semibold text-[#791F1F]">{metrics.desvinculados}</div>
                            <div className="text-xs text-[#A32D2D] mt-1">inativos no sistema</div>
                        </div>
                    </button>
                </div>`;

if (!content.includes(oldCards)) {
    console.error('BLOCO DOS CARDS NAO ENCONTRADO — verificar espaçamento');
    process.exit(1);
}

content = content.replace(oldCards, newCards);
writeFileSync(path, content, 'utf8');
console.log('OK — cards de métricas atualizados com sucesso');
