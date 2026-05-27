import React, { useState } from 'react';
import { User } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { GeminiService } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';
import { FileText, Sparkles, Loader2, AlertCircle, Printer, Building2, Calendar } from 'lucide-react';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [docCode, setDocCode] = useState('');

  // Especialidade vem do usuário logado — não é selecionável
  const especialidadeProfissional = currentUser.specialty || 'Não informada';
  const isSecretaria = currentUser.role === 'EDUCATION_SECRETARY' || currentUser.role === 'ADMIN';

  const handleGerar = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedContent('');
    try {
      const from = `${ano}-01-01`;
      const to = `${ano}-12-31`;

      // SEMPRE filtra pelo profissional logado, a menos que seja secretaria/admin
      const queryParams: any = { fromDate: from, toDate: to };
      if (!isSecretaria) {
        queryParams.professionalId = currentUser.id;
      }

      const allAppointments = await SupabaseService.getAppointments(queryParams);

      if (allAppointments.length === 0) {
        setError(`Nenhum atendimento encontrado para ${currentUser.name} no ano ${ano}.`);
        setIsGenerating(false);
        return;
      }

      const filtered = allAppointments;
      const totalAtendimentos = filtered.length;
      const atendidosEncerrados = filtered.filter((a: any) => ['ATENDIDO', 'ENCERRADO', 'EM_ATENDIMENTO'].includes(a.status)).length;
      const faltas = filtered.filter((a: any) => a.status === 'FALTOU').length;
      const cancelados = filtered.filter((a: any) => a.status === 'CANCELADO').length;
      const retroativos = filtered.filter((a: any) => a.status === 'RETROATIVO').length;
      const alunosUnicos = new Set(filtered.map((a: any) => a.studentId)).size;

      // Atendimentos por mês
      const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const porMes: Record<number, number> = {};
      filtered.forEach((a: any) => {
        if (a.date) {
          const mes = parseInt(a.date.split('-')[1]) - 1;
          porMes[mes] = (porMes[mes] || 0) + 1;
        }
      });

      // Buscar dados de escolas via alunos
      const estudantesIds = Array.from(new Set(filtered.map((a: any) => a.studentId)));
      let todosAlunos: any[] = [];
      try { todosAlunos = await SupabaseService.getStudents(); } catch {}
      const alunosAtendidos = todosAlunos.filter((s: any) => estudantesIds.includes(s.id));

      // Debug: logar estrutura do primeiro aluno para identificar campo correto
      if (alunosAtendidos.length > 0) {
        const primeiro = alunosAtendidos[0];
        console.log('[TCM DEBUG] Campos escola do aluno:', {
          school: primeiro.school,
          schoolName: primeiro.schoolName,
          school_name: primeiro.school_name,
          schoolInfo: primeiro.schoolInfo,
        });
      }

      // Escolas atendidas com contagem de alunos
      const porEscola: Record<string, { alunos: Set<string>; atendimentos: number }> = {};
      filtered.forEach((a: any) => {
        const aluno = alunosAtendidos.find((s: any) => s.id === a.studentId);
        const escola = aluno?.school?.schoolName
          || aluno?.schoolName
          || aluno?.school_name
          || aluno?.schoolInfo?.schoolName
          || (typeof aluno?.school === 'string' ? aluno.school : null)
          || 'Escola não informada';
        if (!porEscola[escola]) porEscola[escola] = { alunos: new Set(), atendimentos: 0 };
        porEscola[escola].alunos.add(a.studentId);
        porEscola[escola].atendimentos++;
      });

      // Últimos atendimentos (10 mais recentes)
      const ultimosAtendimentos = [...filtered]
        .filter((a: any) => ['ATENDIDO','ENCERRADO'].includes(a.status))
        .sort((a: any, b: any) => b.date?.localeCompare(a.date))
        .slice(0, 10);

      const porEspecialidade: Record<string, { total: number; atendidos: number; alunos: Set<string> }> = {};
      filtered.forEach((a: any) => {
        const sp = a.specialty || especialidadeProfissional;
        if (!porEspecialidade[sp]) porEspecialidade[sp] = { total: 0, atendidos: 0, alunos: new Set() };
        porEspecialidade[sp].total++;
        if (['ATENDIDO', 'ENCERRADO'].includes(a.status)) porEspecialidade[sp].atendidos++;
        porEspecialidade[sp].alunos.add(a.studentId);
      });
      const porUnidade: Record<string, number> = {};
      filtered.forEach((a: any) => { const u = a.unit || 'Não informada'; porUnidade[u] = (porUnidade[u] || 0) + 1; });
      // Para relatório individual, profissional é só o usuário logado
      const profissionais = isSecretaria
        ? Array.from(new Set(filtered.map((a: any) => a.professionalName))).filter(Boolean) as string[]
        : [currentUser.name];
      const taxaComparecimento = totalAtendimentos > 0 ? Math.round((atendidosEncerrados / totalAtendimentos) * 100) : 0;

      const dadosIA = `
DADOS REAIS DO SISTEMA BROTAR — ANO ${ano}
Profissional: ${currentUser.name}
Especialidade: ${especialidadeProfissional}
Total de agendamentos: ${totalAtendimentos}
Atendimentos realizados: ${atendidosEncerrados}
Faltas: ${faltas} | Cancelamentos: ${cancelados} | Retroativos: ${retroativos}
Alunos únicos atendidos: ${alunosUnicos}
Taxa de comparecimento: ${taxaComparecimento}%
Profissionais: ${profissionais.join(', ')}
Por especialidade: ${Object.entries(porEspecialidade).map(([sp,d])=>`${sp}: ${d.total} agend., ${d.atendidos} realizados, ${d.alunos.size} alunos`).join(' | ')}
Por unidade: ${Object.entries(porUnidade).map(([u,n])=>`${u}: ${n}`).join(' | ')}
      `.trim();

      let content: string;
      try {
        const prompt = `Você é redator oficial do Programa BROTAR de Brotas de Macaúbas/BA. Com base nos dados reais abaixo, complemente e enriqueça o relatório anual institucional para prestação de contas ao TCM/BA referente ao ano ${ano}. Use linguagem técnica, formal e institucional. Para cada seção, escreva parágrafos completos e detalhados baseados nos dados fornecidos. NÃO deixe campos em branco — substitua todos os "XXXX" pelos valores reais. ${dadosIA}`;
        content = await GeminiService.generateOfficialDocument('Relatório Anual TCM', { fullName: 'Rede Municipal', school: { schoolName: 'Brotas de Macaúbas' } } as any, currentUser.name, 'Secretária de Educação', prompt);
      } catch {
        content = gerarTemplateCompleto(ano, especialidadeProfissional, currentUser.name, profissionais, atendidosEncerrados, alunosUnicos, faltas, cancelados, retroativos, totalAtendimentos, taxaComparecimento, porEspecialidade, porUnidade, porMes, mesesNomes, porEscola, ultimosAtendimentos);
      }
      const code = `TCM-${ano}-${Math.floor(Math.random() * 90000) + 10000}`;
      setDocCode(code);
      setGeneratedContent(content);
      addToast('Relatório anual gerado com sucesso!', 'success');
    } catch (err: any) {
      setError('Erro ao gerar relatório. Verifique a conexão e tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=1000,height=900');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Relatório Anual TCM ${ano}</title>
    <style>
      @page { size: A4; margin: 0; }
      body { margin: 0; padding: 0; font-family: 'Times New Roman', serif; }
      @media print { .no-print { display: none; } }
    </style></head><body>${generatedContent}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 800);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="rounded-3xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #8B1A3A, #6B1230)' }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Relatório Anual — TCM</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.70)' }}>Tribunal de Contas dos Municípios da Bahia</p>
          </div>
        </div>
        <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.60)' }}>
          Gera automaticamente o relatório institucional anual seguindo o modelo oficial do Programa BROTAR, com dados reais do sistema preenchidos pela IA.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5 sticky top-6">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Configurar Relatório</h2>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Ano de Referência</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-700 font-semibold appearance-none text-sm" value={ano} onChange={e => setAno(Number(e.target.value))}>
                  {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Profissional</label>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{especialidadeProfissional}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  <span className="text-[10px] font-semibold text-emerald-700">Relatório individual</span>
                </div>
              </div>
            </div>
            <button onClick={handleGerar} disabled={isGenerating} className="w-full py-4 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95" style={{ background: 'linear-gradient(135deg, #8B1A3A, #6B1230)' }}>
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isGenerating ? 'Gerando com IA...' : 'Gerar Relatório TCM'}
            </button>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2 items-start">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-600 text-xs">{error}</p>
              </div>
            )}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[10px] text-slate-400 font-medium">📄 Modelo baseado no PDF oficial do Programa BROTAR com 13 seções, tabela de indicadores e página de assinaturas.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {generatedContent ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-500 bg-slate-200 px-2 py-1 rounded-lg">#{docCode}</span>
                  <span className="text-xs text-slate-500 font-medium">Relatório Anual {ano}</span>
                </div>
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-xs font-bold transition-all" style={{ background: '#8B1A3A' }}>
                  <Printer size={14} /> Imprimir PDF
                </button>
              </div>
              <div className="overflow-y-auto max-h-[700px]" dangerouslySetInnerHTML={{ __html: generatedContent }} />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[400px] text-center p-8">
              {isGenerating ? (
                <>
                  <Loader2 size={48} className="animate-spin mb-4" style={{ color: '#8B1A3A' }} />
                  <p className="font-bold text-slate-700">Coletando dados e gerando relatório...</p>
                  <p className="text-slate-400 text-sm mt-2">A IA está preenchendo todas as 13 seções</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
                    <Building2 size={32} className="text-slate-300" />
                  </div>
                  <p className="font-bold text-slate-500">Configure e gere o relatório</p>
                  <p className="text-slate-400 text-sm mt-1">O modelo seguirá o padrão oficial do PDF do BROTAR</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function gerarTemplateCompleto(
  ano: number, especialidade: string, nomeProfissional: string, profissionais: string[],
  atendidos: number, alunos: number, faltas: number, cancelados: number,
  retroativos: number, total: number, taxa: number,
  porEsp: Record<string, { total: number; atendidos: number; alunos: Set<string> }>,
  porUnidade: Record<string, number>,
  porMes: Record<number, number>,
  mesesNomes: string[],
  porEscola: Record<string, { alunos: Set<string>; atendimentos: number }>,
  ultimosAtendimentos: any[]
): string {
  const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const espLabel = especialidade === 'TODAS' ? 'Todas as especialidades' : especialidade;

  const rowsEsp = Object.entries(porEsp).map(([sp, d]) => `
    <tr>
      <td style="border:1px solid #ccc;padding:6px 10px">${sp}</td>
      <td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${d.total}</td>
      <td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${d.atendidos}</td>
      <td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${d.alunos.size}</td>
    </tr>`).join('');

  return `
<div style="font-family:'Times New Roman',serif;color:#000;line-height:1.6;max-width:800px;margin:0 auto">

  <!-- CAPA OFICIAL -->
  <div style="page-break-after:always;position:relative;width:100%;background:#fff">
    <img src="/capa_brotar3.jpg" style="width:100%;display:block" alt="Capa Relatório BROTAR" />
    <div style="position:absolute;top:31%;left:3%;width:47%;text-align:center;font-size:16pt;font-weight:900;color:#1a7a3a;letter-spacing:3px;font-family:Arial,sans-serif;padding:6px 0">
      EXERCÍCIO ${ano}
    </div>
  </div>

  <!-- CONTEÚDO -->
  <div style="padding:40px;box-sizing:border-box">

    <div style="text-align:center;border-bottom:2px solid #003d7a;padding-bottom:16px;margin-bottom:30px">
      <div style="font-size:14pt;font-weight:bold;color:#003d7a;text-transform:uppercase">PROGRAMA BROTAR</div>
      <div style="font-size:11pt;color:#555">Relatório Anual de Atividades — Exercício ${ano}</div>
      <div style="font-size:10pt;color:#555;margin-top:4px">Profissional: <strong>${nomeProfissional}</strong></div>
      <div style="font-size:10pt;color:#555">Especialidade: <strong>${espLabel}</strong></div>
    </div>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">1. APRESENTAÇÃO INSTITUCIONAL</h2>
    <p style="text-align:justify;margin:8px 0">O Programa BROTAR constitui uma política pública municipal voltada ao acompanhamento especializado de estudantes com necessidades educacionais específicas da rede municipal de ensino de Brotas de Macaúbas/BA. No exercício de ${ano}, o programa consolidou suas ações multidisciplinares, atendendo a ${alunos} aluno(s) únicos por meio de ${total} agendamentos, com taxa de comparecimento de ${taxa}%.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">2. OBJETIVOS DO PROGRAMA</h2>
    <p style="text-align:justify;margin:8px 0">Promover suporte multidisciplinar especializado aos estudantes da rede municipal, fortalecendo a inclusão escolar, o acompanhamento familiar e o apoio pedagógico. O programa tem como metas: garantir o acesso de todos os alunos com necessidades específicas ao atendimento especializado; promover a articulação entre escola, família e equipe técnica; e produzir documentos técnicos que subsidiem as práticas pedagógicas inclusivas.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">3. ESTRUTURA ORGANIZACIONAL</h2>
    <p style="text-align:justify;margin:8px 0">A equipe técnica do Programa BROTAR atuou de forma integrada no exercício de ${ano}, promovendo atendimento multidisciplinar, visitas escolares e acompanhamento contínuo. Compõem a equipe os seguintes profissionais:</p>
    <ul style="margin:8px 0 8px 20px">
      ${profissionais.length > 0 ? profissionais.map(p => `<li>${p}</li>`).join('') : '<li>Equipe multiprofissional conforme quadro funcional vigente</li>'}
    </ul>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">4. ABRANGÊNCIA TERRITORIAL</h2>
    <p style="text-align:justify;margin:8px 0">Os atendimentos foram realizados nas seguintes unidades: ${Object.keys(porUnidade).join(', ') || 'SEDE e COCAL'}. O programa manteve ações itinerantes em comunidades rurais, assegurando o atendimento educacional especializado aos estudantes com dificuldade de acesso à sede municipal, ampliando assim a abrangência territorial do serviço.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">5. METODOLOGIA DE ATENDIMENTO</h2>
    <p style="text-align:justify;margin:8px 0">Os atendimentos seguem fluxo técnico composto pelas seguintes etapas: (1) encaminhamento pela escola ou família; (2) triagem e acolhimento inicial; (3) avaliação multidisciplinar; (4) elaboração de plano de acompanhamento individualizado; (5) atendimento especializado sistemático; e (6) monitoramento contínuo com registro no Sistema BROTAR. No exercício de ${ano}, foram realizados ${atendidos} atendimentos efetivos, representando ${taxa}% de aproveitamento dos agendamentos.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">6. AÇÕES DESENVOLVIDAS</h2>
    <p style="text-align:justify;margin:8px 0">Durante o exercício de ${ano} foram realizadas as seguintes ações: atendimentos especializados individuais e em grupo; visitas técnicas às unidades escolares da rede municipal; reuniões de orientação familiar; produção de relatórios técnicos, pareceres e encaminhamentos; ações de formação e orientação para professores; e lançamento de ${retroativos} registro(s) histórico(s) de atendimentos realizados em períodos anteriores.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">7. INDICADORES QUANTITATIVOS</h2>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:10pt">
      <tr style="background:#003d7a;color:#fff">
        <th style="border:1px solid #ccc;padding:8px 10px;text-align:left">Indicador</th>
        <th style="border:1px solid #ccc;padding:8px 10px;text-align:center">Quantidade</th>
      </tr>
      <tr style="background:#f5f5f5"><td style="border:1px solid #ccc;padding:6px 10px">Total de agendamentos realizados</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center"><strong>${total}</strong></td></tr>
      <tr><td style="border:1px solid #ccc;padding:6px 10px">Atendimentos efetivamente realizados</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center"><strong>${atendidos}</strong></td></tr>
      <tr style="background:#f5f5f5"><td style="border:1px solid #ccc;padding:6px 10px">Alunos/pacientes únicos atendidos</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center"><strong>${alunos}</strong></td></tr>
      <tr><td style="border:1px solid #ccc;padding:6px 10px">Faltas registradas</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${faltas}</td></tr>
      <tr style="background:#f5f5f5"><td style="border:1px solid #ccc;padding:6px 10px">Cancelamentos</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${cancelados}</td></tr>
      <tr><td style="border:1px solid #ccc;padding:6px 10px">Lançamentos históricos (retroativos)</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${retroativos}</td></tr>
      <tr style="background:#e8f5e9"><td style="border:1px solid #ccc;padding:6px 10px"><strong>Taxa de comparecimento</strong></td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center"><strong>${taxa}%</strong></td></tr>
      <tr><td style="border:1px solid #ccc;padding:6px 10px">Profissionais atuantes</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${profissionais.length}</td></tr>
    </table>

    <p style="font-size:10pt;font-weight:bold;color:#003d7a;margin:16px 0 8px">Distribuição por Especialidade:</p>
    <table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:10pt">
      <tr style="background:#003d7a;color:#fff">
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:left">Especialidade</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">Agendamentos</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">Realizados</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">Alunos</th>
      </tr>
      ${rowsEsp}
    </table>

    <p style="font-size:10pt;font-weight:bold;color:#003d7a;margin:16px 0 8px">Atendimentos por Mês — ${ano}:</p>
    <table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:10pt">
      <tr style="background:#003d7a;color:#fff">
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:left">Mês</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">Atendimentos</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">% do Total</th>
      </tr>
      ${Array.from({length:12},(_,i)=>i).filter(i=>porMes[i]>0).map((i,idx)=>`
      <tr style="${idx%2===0?'background:#f5f5f5':''}">
        <td style="border:1px solid #ccc;padding:6px 10px">${mesesNomes[i]}</td>
        <td style="border:1px solid #ccc;padding:6px 10px;text-align:center"><strong>${porMes[i]}</strong></td>
        <td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${total>0?Math.round((porMes[i]/total)*100):0}%</td>
      </tr>`).join('')}
    </table>

    <p style="font-size:10pt;font-weight:bold;color:#003d7a;margin:16px 0 8px">Escolas Atendidas:</p>
    <table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:10pt">
      <tr style="background:#003d7a;color:#fff">
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:left">Escola</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">Alunos</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">Atendimentos</th>
      </tr>
      ${Object.entries(porEscola).sort((a,b)=>b[1].atendimentos-a[1].atendimentos).map(([escola,d],idx)=>`
      <tr style="${idx%2===0?'background:#f5f5f5':''}">
        <td style="border:1px solid #ccc;padding:6px 10px">${escola}</td>
        <td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${d.alunos.size}</td>
        <td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${d.atendimentos}</td>
      </tr>`).join('')}
    </table>

    ${ultimosAtendimentos.length > 0 ? `
    <p style="font-size:10pt;font-weight:bold;color:#003d7a;margin:16px 0 8px">Últimos Atendimentos Realizados:</p>
    <table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:9pt">
      <tr style="background:#003d7a;color:#fff">
        <th style="border:1px solid #ccc;padding:6px 8px;text-align:left">Data</th>
        <th style="border:1px solid #ccc;padding:6px 8px;text-align:left">Aluno</th>
        <th style="border:1px solid #ccc;padding:6px 8px;text-align:center">Horário</th>
        <th style="border:1px solid #ccc;padding:6px 8px;text-align:center">Unidade</th>
        <th style="border:1px solid #ccc;padding:6px 8px;text-align:center">Status</th>
      </tr>
      ${ultimosAtendimentos.map((a,idx)=>`
      <tr style="${idx%2===0?'background:#f5f5f5':''}">
        <td style="border:1px solid #ccc;padding:5px 8px">${a.date ? new Date(a.date+'T12:00').toLocaleDateString('pt-BR') : '—'}</td>
        <td style="border:1px solid #ccc;padding:5px 8px">${a.studentName || '—'}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;text-align:center">${a.startTime || '—'} – ${a.endTime || '—'}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;text-align:center">${a.unit || '—'}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;text-align:center">${a.status || '—'}</td>
      </tr>`).join('')}
    </table>` : ''}

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">8. ATENDIMENTO ITINERANTE – ZONA RURAL</h2>
    <p style="text-align:justify;margin:8px 0">As equipes do Programa BROTAR realizaram deslocamentos periódicos para comunidades rurais do município de Brotas de Macaúbas/BA, assegurando o atendimento educacional especializado aos estudantes com dificuldade de acesso à sede. Esta ação representa o compromisso do programa com a equidade no acesso aos serviços especializados, independentemente da localização geográfica do aluno.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">9. VISITAS TÉCNICAS ESCOLARES</h2>
    <p style="text-align:justify;margin:8px 0">As visitas técnicas às unidades escolares da rede municipal possibilitaram a observação pedagógica direta, a orientação aos professores regentes sobre estratégias inclusivas, e o acompanhamento da inclusão escolar dos alunos atendidos pelo programa. Estas visitas constituem elo fundamental entre o atendimento especializado e a prática pedagógica cotidiana.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">10. PRODUÇÃO TÉCNICA</h2>
    <p style="text-align:justify;margin:8px 0">No exercício de ${ano}, a equipe técnica produziu relatórios técnicos individualizados, pareceres especializados, encaminhamentos para outros serviços da rede de proteção social e educacional, planos de acompanhamento individual, e documentos institucionais. Toda a produção técnica foi registrada no Sistema BROTAR, garantindo rastreabilidade e transparência nos registros.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">11. DESAFIOS INSTITUCIONAIS</h2>
    <p style="text-align:justify;margin:8px 0">A crescente demanda por atendimentos especializados, as distâncias territoriais do município, a necessidade de ampliação da estrutura física e de recursos humanos, e o desafio de garantir continuidade dos atendimentos durante períodos de recesso escolar constituem os principais desafios permanentes do programa. A equipe tem buscado soluções criativas e eficientes para superar essas limitações.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">12. RESULTADOS E IMPACTOS</h2>
    <p style="text-align:justify;margin:8px 0">O Programa BROTAR contribuiu significativamente no exercício de ${ano} para o fortalecimento da inclusão escolar, o apoio qualificado às famílias, e o acompanhamento multidisciplinar de ${alunos} estudantes com necessidades educacionais específicas. Os resultados demonstram o impacto positivo das ações na qualidade de vida e no desempenho escolar dos alunos atendidos, refletindo o compromisso da Secretaria Municipal de Educação com a educação inclusiva e de qualidade.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">13. CONSIDERAÇÕES FINAIS</h2>
    <p style="text-align:justify;margin:8px 0">O Programa BROTAR consolidou-se como importante instrumento de apoio à educação inclusiva no município de Brotas de Macaúbas/BA no exercício de ${ano}. Com ${atendidos} atendimentos realizados, ${alunos} alunos beneficiados e equipe de ${profissionais.length} profissional(is) dedicado(s), o programa reafirma seu papel estratégico na garantia do direito à educação de qualidade para todos os estudantes da rede municipal, em consonância com os princípios da Lei Brasileira de Inclusão (Lei nº 13.146/2015) e da Política Nacional de Educação Especial na Perspectiva da Educação Inclusiva.</p>

    <!-- ASSINATURAS -->
    <div style="margin-top:60px;page-break-inside:avoid">
      <p style="margin-bottom:40px">Brotas de Macaúbas/BA, ${dataAtual}.</p>
      <div style="display:flex;justify-content:space-around;margin-top:20px">
        <div style="text-align:center;width:280px">
          <div style="border-top:1px solid #000;padding-top:8px">
            <div style="font-weight:bold">Coordenação do Programa BROTAR</div>
          </div>
        </div>
        <div style="text-align:center;width:280px">
          <div style="border-top:1px solid #000;padding-top:8px">
            <div style="font-weight:bold">Secretária Municipal de Educação</div>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>
  `.trim();
}
