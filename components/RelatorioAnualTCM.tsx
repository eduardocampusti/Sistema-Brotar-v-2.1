import React, { useState } from 'react';
import { User, Specialty } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { GeminiService } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';
import { FileText, Sparkles, Loader2, AlertCircle, Printer, ChevronDown, Building2, Calendar } from 'lucide-react';

interface RelatorioAnualTCMProps {
  currentUser: User;
}

const ESPECIALIDADES = [
  { label: 'Psicopedagogia', value: 'Psicopedagogia' },
  { label: 'Psicologia', value: 'Psicologia' },
  { label: 'Fonoaudiologia', value: 'Fonoaudiologia' },
  { label: 'Terapia Ocupacional', value: 'Terapia Ocupacional' },
  { label: 'Fisioterapia', value: 'Fisioterapia' },
  { label: 'Nutrição', value: 'Nutrição' },
  { label: 'Serviço Social', value: 'Serviço Social' },
  { label: 'Todas as Especialidades', value: 'TODAS' },
];

const currentYear = new Date().getFullYear();
const ANOS = Array.from({ length: 5 }, (_, i) => currentYear - i);
export const RelatorioAnualTCM: React.FC<RelatorioAnualTCMProps> = ({ currentUser }) => {
  const { addToast } = useToast();
  const [ano, setAno] = useState(currentYear);
  const [especialidade, setEspecialidade] = useState('TODAS');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [docCode, setDocCode] = useState('');

  const handleGerar = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedContent('');

    try {
      // Buscar todos os agendamentos do ano selecionado
      const from = `${ano}-01-01`;
      const to = `${ano}-12-31`;
      const allAppointments = await SupabaseService.getAppointments({ fromDate: from, toDate: to });

      // Filtrar por especialidade se necessário
      const filtered = especialidade === 'TODAS'
        ? allAppointments
        : allAppointments.filter((a: any) => a.specialty === especialidade);

      if (filtered.length === 0) {
        setError(`Nenhum atendimento encontrado para ${especialidade === 'TODAS' ? 'nenhuma especialidade' : especialidade} no ano ${ano}.`);
        setIsGenerating(false);
        return;
      }

      // Calcular estatísticas
      const totalAtendimentos = filtered.length;
      const atendidosEncerrados = filtered.filter((a: any) => ['ATENDIDO', 'ENCERRADO', 'EM_ATENDIMENTO'].includes(a.status)).length;
      const faltas = filtered.filter((a: any) => a.status === 'FALTOU').length;
      const cancelados = filtered.filter((a: any) => a.status === 'CANCELADO').length;
      const retroativos = filtered.filter((a: any) => a.status === 'RETROATIVO').length;
      const alunosUnicos = new Set(filtered.map((a: any) => a.studentId)).size;

      // Estatísticas por especialidade
      const porEspecialidade: Record<string, { total: number; atendidos: number; alunos: Set<string> }> = {};
      filtered.forEach((a: any) => {
        const sp = a.specialty || 'Não informada';
        if (!porEspecialidade[sp]) porEspecialidade[sp] = { total: 0, atendidos: 0, alunos: new Set() };
        porEspecialidade[sp].total++;
        if (['ATENDIDO', 'ENCERRADO'].includes(a.status)) porEspecialidade[sp].atendidos++;
        porEspecialidade[sp].alunos.add(a.studentId);
      });

      // Estatísticas por unidade
      const porUnidade: Record<string, number> = {};
      filtered.forEach((a: any) => {
        const u = a.unit || 'Não informada';
        porUnidade[u] = (porUnidade[u] || 0) + 1;
      });

      // Profissionais envolvidos
      const profissionais = Array.from(new Set(filtered.map((a: any) => a.professionalName))).filter(Boolean);

      // Montar dados para o prompt da IA
      const dadosEstatisticos = `
MUNICÍPIO: Brotas de Macaúbas - Bahia
ANO DE REFERÊNCIA: ${ano}
ESPECIALIDADE(S): ${especialidade === 'TODAS' ? 'Todas as especialidades do BROTAR' : especialidade}

RESUMO QUANTITATIVO:
- Total de agendamentos no período: ${totalAtendimentos}
- Atendimentos realizados (Atendido + Encerrado): ${atendidosEncerrados}
- Faltas registradas: ${faltas}
- Cancelamentos: ${cancelados}
- Lançamentos históricos (retroativos): ${retroativos}
- Alunos/pacientes únicos atendidos: ${alunosUnicos}
- Taxa de comparecimento: ${totalAtendimentos > 0 ? Math.round((atendidosEncerrados / totalAtendimentos) * 100) : 0}%

DISTRIBUIÇÃO POR ESPECIALIDADE:
${Object.entries(porEspecialidade).map(([sp, d]) =>
  `  • ${sp}: ${d.total} agendamentos, ${d.atendidos} realizados, ${d.alunos.size} alunos`
).join('\n')}

DISTRIBUIÇÃO POR UNIDADE:
${Object.entries(porUnidade).map(([u, n]) => `  • ${u}: ${n} agendamentos`).join('\n')}

PROFISSIONAIS ENVOLVIDOS:
${profissionais.map(p => `  • ${p}`).join('\n')}
      `.trim();

      const prompt = `
Você é o redator oficial do SISTEMA BROTAR — Centro Multidisciplinar em Educação Especial e Inclusiva da Secretaria Municipal de Educação de Brotas de Macaúbas/BA.

Gere um RELATÓRIO ANUAL INSTITUCIONAL completo, formal e detalhado para prestação de contas ao TRIBUNAL DE CONTAS DOS MUNICÍPIOS (TCM) da Bahia, referente ao ano ${ano}.

DADOS REAIS DO SISTEMA:
${dadosEstatisticos}

O relatório deve conter obrigatoriamente:
1. IDENTIFICAÇÃO DO PROGRAMA (nome, município, secretaria, ano)
2. APRESENTAÇÃO (contextualização da Educação Especial/Inclusiva no município)
3. EQUIPE TÉCNICA (profissionais envolvidos)
4. RESUMO EXECUTIVO DAS AÇÕES (síntese do trabalho realizado)
5. RESULTADOS QUANTITATIVOS (tabelas com os dados fornecidos)
6. RESULTADOS QUALITATIVOS (impacto na vida dos alunos e na rede escolar)
7. CONSIDERAÇÕES FINAIS E PERSPECTIVAS
8. Espaço para assinatura da Secretária de Educação

Use linguagem técnica, formal e institucional. O relatório deve demonstrar responsabilidade na aplicação dos recursos públicos e o impacto social do programa na rede municipal de ensino.
      `.trim();

      let content: string;
      try {
        content = await GeminiService.generateOfficialDocument(
          'Relatório Anual TCM', 
          { fullName: 'Rede Municipal', school: { schoolName: 'Brotas de Macaúbas' } } as any,
          currentUser.name,
          'Secretária de Educação',
          prompt
        );
      } catch {
        // Fallback manual se IA falhar
        content = gerarRelatorioFallback(dadosEstatisticos, ano, especialidade, profissionais, atendidosEncerrados, alunosUnicos, faltas, totalAtendimentos);
      }

      const code = `TCM-${ano}-${Math.floor(Math.random() * 90000) + 10000}`;
      setDocCode(code);
      setGeneratedContent(content);
      addToast('Relatório anual gerado com sucesso!', 'success');
    } catch (err: any) {
      setError('Erro ao gerar relatório. Verifique a conexão e tente novamente.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Relatório Anual TCM ${ano}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #000; }
        h1,h2,h3 { color: #000; }
        table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        td,th { border: 1px solid #000; padding: 6px 10px; text-align: left; }
        th { background: #f0f0f0; font-weight: bold; }
      </style></head>
      <body>${generatedContent}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#8B1A3A] to-[#6B1230] rounded-3xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/15 rounded-xl">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Relatório Anual — TCM</h1>
            <p className="text-white/70 text-sm">Tribunal de Contas dos Municípios da Bahia</p>
          </div>
        </div>
        <p className="text-white/60 text-xs mt-3">
          Gera automaticamente o relatório institucional anual com dados reais do sistema para prestação de contas ao TCM/BA.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de configuração */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5 sticky top-6">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Configurar Relatório</h2>

            {/* Ano */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                Ano de Referência
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-700 font-semibold appearance-none text-sm"
                  value={ano}
                  onChange={e => setAno(Number(e.target.value))}
                >
                  {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* Especialidade */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                Especialidade
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-700 font-semibold appearance-none text-sm"
                  value={especialidade}
                  onChange={e => setEspecialidade(e.target.value)}
                >
                  {ESPECIALIDADES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
            </div>

            {/* Botão gerar */}
            <button
              onClick={handleGerar}
              disabled={isGenerating}
              className="w-full py-4 bg-gradient-to-r from-[#8B1A3A] to-[#6B1230] text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isGenerating ? 'Gerando com IA...' : 'Gerar Relatório TCM'}
            </button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2 items-start">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-600 text-xs">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Área do documento */}
        <div className="lg:col-span-2">
          {generatedContent ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-500 bg-slate-200 px-2 py-1 rounded-lg">#{docCode}</span>
                  <span className="text-xs text-slate-500 font-medium">Relatório Anual {ano}</span>
                </div>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-[#8B1A3A] text-white rounded-xl text-xs font-bold hover:bg-[#72142E] transition-all"
                >
                  <Printer size={14} /> Imprimir PDF
                </button>
              </div>
              <div
                className="p-8 prose prose-sm max-w-none min-h-[500px] overflow-y-auto"
                style={{ fontFamily: "'Times New Roman', serif" }}
                dangerouslySetInnerHTML={{ __html: generatedContent }}
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[400px] text-center p-8">
              {isGenerating ? (
                <>
                  <Loader2 size={48} className="animate-spin text-[#8B1A3A] mb-4" />
                  <p className="font-bold text-slate-700">Coletando dados e gerando relatório...</p>
                  <p className="text-slate-400 text-sm mt-2">Isso pode levar alguns segundos</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
                    <Building2 size={32} className="text-slate-300" />
                  </div>
                  <p className="font-bold text-slate-500">Configure e gere o relatório</p>
                  <p className="text-slate-400 text-sm mt-1">Selecione o ano e especialidade ao lado</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function gerarRelatorioFallback(dados: string, ano: number, especialidade: string, profissionais: string[], atendidos: number, alunos: number, faltas: number, total: number): string {
  return `
<div style="font-family: 'Times New Roman', serif; color: #000; line-height: 1.6;">
  <div style="text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #000; padding-bottom: 1rem;">
    <h1 style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 0;">RELATÓRIO ANUAL DE ATIVIDADES</h1>
    <h2 style="font-size: 12pt; font-weight: bold; margin: 0.5rem 0;">PROGRAMA BROTAR — EDUCAÇÃO ESPECIAL E INCLUSIVA</h2>
    <p style="margin: 0;">Secretaria Municipal de Educação de Brotas de Macaúbas/BA</p>
    <p style="margin: 0;">Ano de Referência: <strong>${ano}</strong></p>
  </div>

  <h2 style="font-size: 12pt; font-weight: bold; margin-top: 1.5rem;">1. IDENTIFICAÇÃO</h2>
  <p>Programa: BROTAR — Centro Multidisciplinar em Educação Especial e Inclusiva<br/>
  Município: Brotas de Macaúbas — Bahia<br/>
  Órgão: Secretaria Municipal de Educação<br/>
  Período: Janeiro a Dezembro de ${ano}<br/>
  Especialidade(s): ${especialidade === 'TODAS' ? 'Todas as especialidades' : especialidade}</p>

  <h2 style="font-size: 12pt; font-weight: bold; margin-top: 1.5rem;">2. EQUIPE TÉCNICA</h2>
  <p>Profissionais atuantes no período:</p>
  <ul>${profissionais.map(p => `<li>${p}</li>`).join('')}</ul>

  <h2 style="font-size: 12pt; font-weight: bold; margin-top: 1.5rem;">3. RESULTADOS QUANTITATIVOS</h2>
  <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
    <tr style="background: #f0f0f0;"><th style="border: 1px solid #000; padding: 6px;">Indicador</th><th style="border: 1px solid #000; padding: 6px;">Valor</th></tr>
    <tr><td style="border: 1px solid #000; padding: 6px;">Total de agendamentos</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">${total}</td></tr>
    <tr><td style="border: 1px solid #000; padding: 6px;">Atendimentos realizados</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">${atendidos}</td></tr>
    <tr><td style="border: 1px solid #000; padding: 6px;">Faltas registradas</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">${faltas}</td></tr>
    <tr><td style="border: 1px solid #000; padding: 6px;">Alunos atendidos (únicos)</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">${alunos}</td></tr>
    <tr><td style="border: 1px solid #000; padding: 6px;">Taxa de comparecimento</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">${total > 0 ? Math.round((atendidos / total) * 100) : 0}%</td></tr>
  </table>

  <h2 style="font-size: 12pt; font-weight: bold; margin-top: 1.5rem;">4. CONSIDERAÇÕES FINAIS</h2>
  <p>O Programa BROTAR cumpriu sua missão institucional no ano de ${ano}, oferecendo suporte especializado a alunos com necessidades educacionais especiais da rede municipal de Brotas de Macaúbas/BA, contribuindo para a inclusão escolar e o desenvolvimento integral dos estudantes.</p>

  <div style="margin-top: 4rem; text-align: center;">
    <p>Brotas de Macaúbas/BA, ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.</p>
    <div style="margin-top: 3rem; display: inline-block;">
      <div style="border-top: 1px solid #000; width: 300px; padding-top: 0.5rem; text-align: center;">
        Secretária Municipal de Educação
      </div>
    </div>
  </div>
</div>
  `.trim();
}
`;
