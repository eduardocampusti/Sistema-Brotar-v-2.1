import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, FileText, Users, School, Building2,
  ShieldCheck, Download, User, Heart, ClipboardList,
  AlertTriangle, BarChart2, Calendar, Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseService } from '../services/SupabaseService';
import type { NutritionAssessment, NutritionNAE, NutritionDashboardStats } from '../types';

type ReportType = 'individual' | 'familia' | 'escola' | 'secretaria' | 'pnae';

interface ReportOption {
  id: ReportType;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bg: string;
  border: string;
  iconBg: string;
  shadow: string;
}

const REPORT_OPTIONS: ReportOption[] = [
  { id: 'individual', title: 'Relatório Individual', subtitle: 'Avaliação completa do aluno com diagnóstico, antropometria e orientações', icon: <User size={22} />, bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-white text-blue-600', shadow: 'rgba(59,130,246,0.12)' },
  { id: 'familia', title: 'Relatório para Família', subtitle: 'Linguagem acessível com orientações práticas para os responsáveis', icon: <Heart size={22} />, bg: 'bg-pink-50', border: 'border-pink-200', iconBg: 'bg-white text-pink-600', shadow: 'rgba(236,72,153,0.12)' },
  { id: 'escola', title: 'Relatório para Escola', subtitle: 'Indicadores coletivos, alunos com NAE e alertas nutricionais', icon: <School size={22} />, bg: 'bg-emerald-50', border: 'border-emerald-200', iconBg: 'bg-white text-emerald-600', shadow: 'rgba(16,185,129,0.12)' },
  { id: 'secretaria', title: 'Relatório para Secretaria', subtitle: 'Dados consolidados da rede municipal com gráficos e estatísticas', icon: <Building2 size={22} />, bg: 'bg-purple-50', border: 'border-purple-200', iconBg: 'bg-white text-purple-600', shadow: 'rgba(139,92,246,0.12)' },
  { id: 'pnae', title: 'Relatório PNAE', subtitle: 'Conforme exigências legais do Programa Nacional de Alimentação Escolar', icon: <ShieldCheck size={22} />, bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-white text-amber-600', shadow: 'rgba(245,158,11,0.12)' },
];

// ─── PDF Generation helpers ──────────────────────────────────────────────────
async function generateIndividualPDF(assessment: NutritionAssessment, studentName: string, professionalName: string) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  // Header
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, w, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE AVALIAÇÃO NUTRICIONAL', w / 2, 11, { align: 'center' });
  doc.setTextColor(30, 41, 59);
  y = 30;

  // Dados do aluno
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO ALUNO', margin, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Nome: ${studentName}`, margin, y); y += 5;
  doc.text(`Data da avaliação: ${assessment.assessment_date ? new Date(assessment.assessment_date).toLocaleDateString('pt-BR') : '-'}`, margin, y); y += 5;
  doc.text(`Turno: ${assessment.turno ?? '-'}`, margin, y); y += 8;

  // Antropometria
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('AVALIAÇÃO ANTROPOMÉTRICA', margin, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Peso: ${assessment.peso_kg ?? '-'} kg`, margin, y);
  doc.text(`Altura: ${assessment.altura_m ?? '-'} m`, margin + 60, y); y += 5;
  doc.text(`IMC: ${assessment.imc ?? '-'}`, margin, y);
  doc.text(`Classificação: ${assessment.imc_classificacao ?? '-'}`, margin + 60, y); y += 5;
  doc.text(`Circ. cintura: ${assessment.circunferencia_cintura_cm ?? '-'} cm`, margin, y);
  doc.text(`Circ. braço: ${assessment.circunferencia_braco_cm ?? '-'} cm`, margin + 60, y); y += 8;

  // Condições de saúde
  if (assessment.condicoes_saude?.length) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CONDIÇÕES DE SAÚDE', margin, y); y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(assessment.condicoes_saude.join(', '), margin, y, { maxWidth: w - margin * 2 }); y += 5;
    if (assessment.medicamentos) { doc.text(`Medicamentos: ${assessment.medicamentos}`, margin, y, { maxWidth: w - margin * 2 }); y += 5; }
    y += 3;
  }

  // Hábitos alimentares
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('HÁBITOS ALIMENTARES', margin, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (assessment.r24h_cafe) { doc.text(`Café da manhã: ${assessment.r24h_cafe}`, margin, y, { maxWidth: w - margin * 2 }); y += 5; }
  if (assessment.r24h_almoco) { doc.text(`Almoço: ${assessment.r24h_almoco}`, margin, y, { maxWidth: w - margin * 2 }); y += 5; }
  if (assessment.r24h_jantar) { doc.text(`Jantar: ${assessment.r24h_jantar}`, margin, y, { maxWidth: w - margin * 2 }); y += 5; }
  y += 3;

  // Comportamento alimentar
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPORTAMENTO ALIMENTAR', margin, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (assessment.seletividade_alimentar) { doc.text(`Seletividade: ${assessment.seletividade_alimentar}`, margin, y); y += 5; }
  if (assessment.avaliacao_comportamento) { doc.text(`Avaliação geral: ${assessment.avaliacao_comportamento}`, margin, y); y += 5; }
  if (assessment.consome_pnae) { doc.text(`Consumo PNAE: ${assessment.consome_pnae}`, margin, y); y += 5; }
  y += 3;

  // Segurança alimentar
  if (assessment.classificacao_ebia) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SEGURANÇA ALIMENTAR (EBIA)', margin, y); y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Classificação: ${assessment.classificacao_ebia}`, margin, y); y += 8;
  }

  // Perfil TEA
  if (assessment.tem_tea) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PERFIL SENSORIAL — TEA', margin, y); y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (assessment.tea_texturas_aceitas?.length) { doc.text(`Texturas aceitas: ${assessment.tea_texturas_aceitas.join(', ')}`, margin, y, { maxWidth: w - margin * 2 }); y += 5; }
    if (assessment.tea_temperatura_preferida) { doc.text(`Temperatura preferida: ${assessment.tea_temperatura_preferida}`, margin, y); y += 5; }
    if (assessment.tea_neofobia) { doc.text(`Neofobia: ${assessment.tea_neofobia}`, margin, y); y += 5; }
    if (assessment.tea_rituais?.length) { doc.text(`Rituais: ${assessment.tea_rituais.join(', ')}`, margin, y, { maxWidth: w - margin * 2 }); y += 5; }
    y += 3;
  }

  // Conduta
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DIAGNÓSTICO E CONDUTA', margin, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (assessment.diagnostico_nutricional) { doc.text(`Diagnóstico: ${assessment.diagnostico_nutricional}`, margin, y); y += 5; }
  if (assessment.condutas?.length) { doc.text(`Condutas: ${assessment.condutas.join(', ')}`, margin, y, { maxWidth: w - margin * 2 }); y += 5; }
  if (assessment.orientacoes) {
    y += 2;
    doc.text('Orientações:', margin, y); y += 5;
    const lines = doc.splitTextToSize(assessment.orientacoes, w - margin * 2);
    doc.text(lines, margin, y); y += lines.length * 4 + 3;
  }
  if (assessment.proxima_avaliacao) {
    doc.text(`Próxima avaliação: ${new Date(assessment.proxima_avaliacao).toLocaleDateString('pt-BR')}`, margin, y); y += 8;
  }

  // Assinatura
  y = Math.max(y, 240);
  doc.setDrawColor(200);
  doc.line(margin, y, margin + 80, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(professionalName, margin, y); y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text('Nutricionista — SEMED Brotas de Macaúbas', margin, y);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Gerado pelo Sistema Brotar em ${new Date().toLocaleString('pt-BR')}`, w / 2, 290, { align: 'center' });

  doc.save(`relatorio_nutricional_${studentName.replace(/\s+/g, '_')}.pdf`);
}

// Relatório para família (linguagem simples)
async function generateFamiliaPDF(assessment: NutritionAssessment, studentName: string, professionalName: string) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  doc.setFillColor(236, 72, 153);
  doc.rect(0, 0, w, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ORIENTAÇÕES NUTRICIONAIS PARA A FAMÍLIA', w / 2, 11, { align: 'center' });
  doc.setTextColor(30, 41, 59);
  y = 28;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Olá, família de ${studentName}!`, margin, y); y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Este documento contém informações importantes sobre a avaliação', margin, y); y += 4;
  doc.text('nutricional realizada na escola. Leia com atenção.', margin, y); y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('COMO ESTÁ O PESO E ALTURA', margin, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Peso atual: ${assessment.peso_kg ?? '-'} kg    |    Altura: ${assessment.altura_m ?? '-'} m`, margin, y); y += 5;
  const classMsg = assessment.imc_classificacao === 'Eutrofia'
    ? 'O peso está adequado para a idade. Continue assim!'
    : assessment.imc_classificacao === 'Sobrepeso' || assessment.imc_classificacao === 'Obesidade'
    ? 'O peso está acima do esperado. Vamos trabalhar juntos para melhorar.'
    : assessment.imc_classificacao === 'Magreza' || assessment.imc_classificacao === 'Magreza acentuada'
    ? 'O peso está abaixo do esperado. Precisamos de atenção especial na alimentação.'
    : 'Avaliação em andamento.';
  doc.text(classMsg, margin, y, { maxWidth: w - margin * 2 }); y += 10;

  if (assessment.orientacoes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ORIENTAÇÕES DA NUTRICIONISTA', margin, y); y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(assessment.orientacoes, w - margin * 2);
    doc.text(lines, margin, y); y += lines.length * 4 + 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DICAS PARA O DIA A DIA', margin, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const dicas = [
    '• Ofereça frutas e verduras todos os dias, de formas diferentes.',
    '• Evite refrigerantes, salgadinhos e doces em excesso.',
    '• A criança deve fazer pelo menos 5 refeições por dia.',
    '• Incentive beber água ao longo do dia.',
    '• Desligue as telas durante as refeições.',
    '• Não force a criança a comer — ofereça com paciência.',
  ];
  dicas.forEach((d) => { doc.text(d, margin, y, { maxWidth: w - margin * 2 }); y += 5; });
  y += 5;

  if (assessment.proxima_avaliacao) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Próxima avaliação: ${new Date(assessment.proxima_avaliacao).toLocaleDateString('pt-BR')}`, margin, y); y += 10;
  }

  y = Math.max(y, 240);
  doc.setDrawColor(200);
  doc.line(margin, y, margin + 80, y); y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(professionalName, margin, y); y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text('Nutricionista — SEMED Brotas de Macaúbas', margin, y);
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Gerado pelo Sistema Brotar em ${new Date().toLocaleString('pt-BR')}`, w / 2, 290, { align: 'center' });
  doc.save(`orientacao_familiar_${studentName.replace(/\s+/g, '_')}.pdf`);
}

// Relatório consolidado (Escola / Secretaria / PNAE)
async function generateConsolidadoPDF(type: 'escola' | 'secretaria' | 'pnae', stats: NutritionDashboardStats, naes: NutritionNAE[], professionalName: string) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  const titles: Record<string, { title: string; color: number[] }> = {
    escola: { title: 'RELATÓRIO NUTRICIONAL — ESCOLA', color: [16, 185, 129] },
    secretaria: { title: 'RELATÓRIO CONSOLIDADO — SECRETARIA DE EDUCAÇÃO', color: [139, 92, 246] },
    pnae: { title: 'RELATÓRIO PNAE — PROGRAMA NACIONAL DE ALIMENTAÇÃO ESCOLAR', color: [245, 158, 11] },
  };
  const cfg = titles[type];
  doc.setFillColor(cfg.color[0], cfg.color[1], cfg.color[2]);
  doc.rect(0, 0, w, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(cfg.title, w / 2, 11, { align: 'center' });
  doc.setTextColor(30, 41, 59);
  y = 28;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Município: Brotas de Macaúbas — BA`, margin, y);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, w - margin - 40, y); y += 5;
  doc.text(`Responsável técnica: ${professionalName}`, margin, y); y += 10;

  // Indicadores gerais
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INDICADORES GERAIS', margin, y); y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const pn = stats.perfilNutricional;
  doc.text(`Total de alunos na rede: ${stats.totalAlunos}`, margin, y); y += 5;
  doc.text(`Alunos avaliados: ${stats.avaliados} (${stats.totalAlunos > 0 ? Math.round((stats.avaliados / stats.totalAlunos) * 100) : 0}%)`, margin, y); y += 5;
  doc.text(`Alunos pendentes: ${stats.pendentes}`, margin, y); y += 5;
  doc.text(`NAE ativos: ${stats.naeAtivos}`, margin, y); y += 5;
  doc.text(`Laudos vencendo (30 dias): ${stats.laudosVencendo}`, margin, y); y += 10;

  // Perfil nutricional
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PERFIL NUTRICIONAL DA REDE', margin, y); y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const total = pn.baixoPeso + pn.eutrofia + pn.sobrepeso + pn.obesidade + pn.obesidadeGrave;
  const pct = (v: number) => total > 0 ? `(${Math.round((v / total) * 100)}%)` : '';
  doc.text(`Baixo peso: ${pn.baixoPeso} ${pct(pn.baixoPeso)}`, margin, y); y += 5;
  doc.text(`Eutrofia: ${pn.eutrofia} ${pct(pn.eutrofia)}`, margin, y); y += 5;
  doc.text(`Sobrepeso: ${pn.sobrepeso} ${pct(pn.sobrepeso)}`, margin, y); y += 5;
  doc.text(`Obesidade: ${pn.obesidade} ${pct(pn.obesidade)}`, margin, y); y += 5;
  doc.text(`Obesidade grave: ${pn.obesidadeGrave} ${pct(pn.obesidadeGrave)}`, margin, y); y += 10;

  // NAE
  if (naes.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`NECESSIDADES ALIMENTARES ESPECIAIS (${naes.length} ativos)`, margin, y); y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    naes.slice(0, 15).forEach((nae) => {
      if (y > 260) { doc.addPage(); y = 25; }
      const nome = (nae as any).students?.nome_completo ?? nae.student_id;
      const vencido = nae.laudo_validade && new Date(nae.laudo_validade) < new Date() ? ' [LAUDO VENCIDO]' : '';
      doc.text(`• ${nome} — ${nae.tipo} (${nae.gravidade})${vencido}`, margin, y, { maxWidth: w - margin * 2 });
      y += 5;
    });
    y += 5;
  }

  // Assinatura
  y = Math.max(y, 240);
  doc.setDrawColor(200);
  doc.line(margin, y, margin + 80, y); y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(professionalName, margin, y); y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text('Nutricionista RT — PNAE', margin, y); y += 4;
  doc.text('SEMED — Brotas de Macaúbas, BA', margin, y);
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Gerado pelo Sistema Brotar em ${new Date().toLocaleString('pt-BR')}`, w / 2, 290, { align: 'center' });

  const fname = type === 'escola' ? 'relatorio_nutricional_escola' : type === 'pnae' ? 'relatorio_PNAE' : 'relatorio_consolidado_secretaria';
  doc.save(`${fname}_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ─── Main Component ──────────────────────────────────────────────────────────
const NutritionReportsModule: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<NutritionDashboardStats | null>(null);
  const [naes, setNaes] = useState<NutritionNAE[]>([]);
  const [assessments, setAssessments] = useState<NutritionAssessment[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [students, setStudents] = useState<{id: string; nome_completo: string}[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const professionalName = user?.name ?? 'Nutricionista';

  useEffect(() => {
    const load = async () => {
      try {
        const [s, n] = await Promise.all([
          SupabaseService.getNutritionDashboardStats(),
          SupabaseService.getAllActiveNAE(),
        ]);
        setStats(s);
        setNaes(n);
      } catch (err) {
        console.error('Erro ao carregar dados relatórios:', err);
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, []);

  const handleGenerate = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      if ((selected === 'individual' || selected === 'familia') && selectedStudentId) {
        const ass = await SupabaseService.getNutritionAssessments(selectedStudentId);
        if (ass.length === 0) { alert('Nenhuma avaliação encontrada para este aluno.'); return; }
        const latest = ass[0];
        // buscar nome do aluno
        const allStudents = await SupabaseService.getStudents();
        const st = allStudents.find((s: any) => s.id === selectedStudentId);
        const studentName = st?.nome_completo ?? 'Aluno';
        if (selected === 'individual') {
          await generateIndividualPDF(latest, studentName, professionalName);
        } else {
          await generateFamiliaPDF(latest, studentName, professionalName);
        }
      } else if (selected === 'escola' || selected === 'secretaria' || selected === 'pnae') {
        if (!stats) { alert('Dados ainda carregando.'); return; }
        await generateConsolidadoPDF(selected, stats, naes, professionalName);
      }
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      alert('Erro ao gerar relatório. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

  // Carregar lista de alunos quando selecionar relatório individual ou família
  useEffect(() => {
    if (selected === 'individual' || selected === 'familia') {
      SupabaseService.getStudents().then((s: any[]) => {
        setStudents(s.map((st: any) => ({ id: st.id, nome_completo: st.nome_completo })));
      }).catch(console.error);
    }
  }, [selected]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app/nutricion/dashboard')} className="p-2 rounded-xl hover:bg-gray-100 text-slate-500 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-medium text-slate-800">Relatórios Nutricionais</h1>
            <p className="text-sm text-slate-500">Selecione o tipo de relatório para gerar</p>
          </div>
        </div>

        {/* Cards de tipos de relatório */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id === selected ? null : opt.id)}
              className={`text-left ${opt.bg} rounded-2xl border-2 p-4 transition-all ${selected === opt.id ? `${opt.border} ring-2 ring-offset-1` : `${opt.border} hover:shadow-md`}`}
              style={{ boxShadow: `0 4px 16px ${opt.shadow}`, ...(selected === opt.id ? { ringColor: opt.shadow } : {}) }}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${opt.iconBg}`} style={{boxShadow: '0 2px 6px rgba(0,0,0,0.08)'}}>
                {opt.icon}
              </div>
              <p className="text-sm font-bold text-slate-800 mb-1">{opt.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{opt.subtitle}</p>
            </button>
          ))}
        </div>

        {/* Painel de opções do relatório selecionado */}
        {selected && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4" style={{boxShadow: '0 4px 20px rgba(0,0,0,0.06)'}}>
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-slate-500" />
              <h2 className="text-sm font-bold text-slate-700">
                {REPORT_OPTIONS.find((o) => o.id === selected)?.title}
              </h2>
            </div>

            {/* Seleção de aluno para relatórios individuais */}
            {(selected === 'individual' || selected === 'familia') && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Selecione o aluno</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">Selecione um aluno...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome_completo}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Info para relatórios consolidados */}
            {(selected === 'escola' || selected === 'secretaria' || selected === 'pnae') && stats && (
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-slate-600 space-y-1">
                <p><span className="font-medium">Total de alunos:</span> {stats.totalAlunos}</p>
                <p><span className="font-medium">Avaliados:</span> {stats.avaliados}</p>
                <p><span className="font-medium">NAE ativos:</span> {stats.naeAtivos}</p>
                <p className="text-xs text-slate-400 mt-2">O relatório incluirá todos os dados consolidados da rede.</p>
              </div>
            )}

            {/* Botão gerar */}
            <button
              onClick={handleGenerate}
              disabled={loading || ((selected === 'individual' || selected === 'familia') && !selectedStudentId)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{boxShadow: '0 4px 12px rgba(249,115,22,0.25)'}}
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Gerando PDF...</> : <><Download size={16} /> Gerar e baixar PDF</>}
            </button>
          </div>
        )}

        {/* Estatísticas rápidas */}
        {!selected && stats && !dataLoading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5" style={{boxShadow: '0 4px 20px rgba(0,0,0,0.06)'}}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={16} className="text-slate-500" />
              <h2 className="text-sm font-bold text-slate-700">Resumo dos dados disponíveis</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xl font-medium text-blue-800">{stats.totalAlunos}</p>
                <p className="text-[10px] text-blue-600 font-medium">Total alunos</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-xl font-medium text-emerald-800">{stats.avaliados}</p>
                <p className="text-[10px] text-emerald-600 font-medium">Avaliados</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-xl font-medium text-red-800">{stats.naeAtivos}</p>
                <p className="text-[10px] text-red-600 font-medium">NAE ativos</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xl font-medium text-amber-800">{stats.laudosVencendo}</p>
                <p className="text-[10px] text-amber-600 font-medium">Laudos vencendo</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default NutritionReportsModule;
