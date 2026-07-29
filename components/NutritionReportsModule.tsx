import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, FileText, User, Heart, School,
  Building2, ShieldCheck, Activity, Apple,
  Download, Printer, Eye, RefreshCw, Loader2,
  CheckCircle, AlertTriangle, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseService } from '../services/SupabaseService';
import {
  calcularIdadeCompleta,
} from '../utils/omsCalculations';
import type {
  NutritionAssessment, NutritionNAE,
  NutritionDashboardStats, NutritionAnthropometryHistory,
} from '../types';

// ─── tipos ────────────────────────────────────────────────────────────────────
type ReportType =
  | 'antropometria'
  | 'individual'
  | 'evolucao'
  | 'familia'
  | 'nae'
  | 'plano'
  | 'escola'
  | 'secretaria'
  | 'pnae';

interface StudentOption { id: string; nome_completo: string; date_of_birth?: string; }

// ─── config dos 6 relatórios por aluno + 3 consolidados ───────────────────────
const REPORTS_POR_ALUNO: { id: ReportType; title: string; sub: string; icon: string; color: string; badge?: string }[] = [
  { id: 'antropometria', title: 'Relatório de antropometria', sub: 'Curvas OMS, dobras cutâneas e % gordura', icon: 'ti-chart-line', color: 'accent', badge: 'novo' },
  { id: 'individual',   title: 'Relatório individual',       sub: 'Avaliação completa com diagnóstico e conduta', icon: 'ti-user',       color: 'success', badge: 'melhorado' },
  { id: 'evolucao',     title: 'Evolução nutricional',       sub: 'Histórico de peso, altura e IMC', icon: 'ti-trending-up', color: 'pro',     badge: 'novo' },
  { id: 'familia',      title: 'Relatório para família',     sub: 'Linguagem acessível com orientações', icon: 'ti-heart',      color: 'warning' },
  { id: 'nae',          title: 'Relatório NAE',              sub: 'Necessidades alimentares especiais', icon: 'ti-alert-triangle', color: 'danger' },
  { id: 'plano',        title: 'Plano alimentar',            sub: 'Condutas e orientações nutricionais', icon: 'ti-apple',      color: 'neutral' },
];
const REPORTS_CONSOLIDADOS: { id: ReportType; title: string; sub: string; icon: string; color: string }[] = [
  { id: 'escola',     title: 'Relatório para escola',     sub: 'Indicadores coletivos e alertas', icon: 'ti-school',   color: 'success' },
  { id: 'secretaria', title: 'Relatório para secretaria', sub: 'Dados consolidados da rede',      icon: 'ti-building', color: 'pro' },
  { id: 'pnae',       title: 'Relatório PNAE',            sub: 'Conforme exigências legais',      icon: 'ti-shield-check', color: 'warning' },
];

// ─── helper de cores ──────────────────────────────────────────────────────────
const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  accent:  { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200' },
  success: { bg: 'bg-emerald-50',text: 'text-emerald-600',border: 'border-emerald-200' },
  pro:     { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  warning: { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-200' },
  danger:  { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-200' },
  neutral: { bg: 'bg-slate-50',  text: 'text-slate-600',  border: 'border-slate-200' },
};

// ─── classificação badge color ────────────────────────────────────────────────
function badgeClass(val?: string): string {
  if (!val) return 'bg-gray-100 text-gray-600';
  if (val.includes('grave') || val.includes('elevado') || val.includes('Muito alto') || val.includes('Muito baixo') || val.includes('severa'))
    return 'bg-red-100 text-red-700';
  if (val.includes('adequad') || val.includes('Eutrofia') || val.includes('Adequado'))
    return 'bg-emerald-100 text-emerald-700';
  return 'bg-amber-100 text-amber-700';
}

// ─── PDF: Relatório de Antropometria ──────────────────────────────────────────
async function generateAntropometriaPDF(
  assessment: NutritionAssessment,
  student: StudentOption,
  professionalName: string,
  crn: string,
  papelTimbrado: any,
) {
  const [{ default: jsPDF }, { drawLetterhead, drawFooter }] = await Promise.all([
    import('jspdf'),
    import('../utils/pdfExport'),
  ]);
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const margin = 20;

  await drawLetterhead(doc, papelTimbrado);
  let y = 52;

  // Título
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(margin, y, w - margin * 2, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE ANTROPOMETRIA', w / 2, y + 6.5, { align: 'center' });
  y += 16;

  // Dados do paciente
  const idade = student.date_of_birth ? calcularIdadeCompleta(student.date_of_birth) : null;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO PACIENTE', margin, y); y += 5;
  doc.setDrawColor(16, 185, 129); doc.line(margin, y, w - margin, y); y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${student.nome_completo}`, margin, y);
  doc.text(`Data: ${assessment.assessment_date ? new Date(assessment.assessment_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}`, margin + 110, y); y += 5;
  doc.text(`Idade: ${idade ? idade.formatado : '-'}  (${idade ? idade.totalMeses + ' meses' : '-'})`, margin, y);
  doc.text(`Sexo: ${assessment.sexo === 'M' ? 'Masculino' : assessment.sexo === 'F' ? 'Feminino' : '-'}`, margin + 110, y); y += 10;

  // DOIS BLOCOS LADO A LADO — Dados antropométricos | Resultados analíticos
  const col1 = margin;
  const col2 = margin + 88;
  const colW = 80;

  // Bloco 1: Medidas
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text('DADOS ANTROPOMÉTRICOS', col1, y); y += 4;
  doc.setDrawColor(200); doc.line(col1, y, col1 + colW, y); y += 4;
  const alturaDisplay = assessment.altura_m
    ? (assessment.altura_m < 3 ? (assessment.altura_m * 100).toFixed(0) : assessment.altura_m.toFixed(0)) + ' cm'
    : '-';
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  const dadosAntro = [
    [`Peso corporal`, `${assessment.peso_kg ?? '-'} kg`],
    [`Altura`, alturaDisplay],
    [`Dobra triciptal`, `${assessment.dobra_triciptal_mm ?? '-'} mm`],
    [`Dobra subescapular`, `${assessment.dobra_subescapular_mm ?? '-'} mm`],
    [`Dobra panturrilha`, `${assessment.dobra_panturrilha_mm ?? '-'} mm`],
    [`Circ. cintura`, `${assessment.circunferencia_cintura_cm ?? '-'} cm`],
    [`Circ. braço`, `${assessment.circunferencia_braco_cm ?? '-'} cm`],
  ];
  let yAntro = y;
  dadosAntro.forEach(([label, val]) => {
    doc.setTextColor(100); doc.text(label, col1, yAntro);
    doc.setTextColor(30, 41, 59); doc.text(val, col1 + colW - 2, yAntro, { align: 'right' });
    yAntro += 5;
  });

  // Bloco 2: Resultados
  let yRes = y;
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
  doc.text('RESULTADOS ANALÍTICOS', col2, yRes); yRes += 4;
  doc.setDrawColor(200); doc.line(col2, yRes, col2 + colW, yRes); yRes += 4;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  const resultados = [
    ['IMC', `${assessment.imc ?? '-'} kg/m²`],
    ['Relação Peso/Idade', assessment.relacao_peso_idade ?? assessment.imc_classificacao ?? '-'],
    ['Relação Altura/Idade', assessment.relacao_altura_idade ?? '-'],
    ['Relação IMC/Idade', assessment.relacao_imc_idade ?? '-'],
    ['% Gordura (Slaughter)', assessment.percentual_gordura ? assessment.percentual_gordura + '%' : '-'],
    ['Classif. %GC (Lohman)', assessment.classificacao_gordura ?? '-'],
  ];
  resultados.forEach(([label, val]) => {
    doc.setTextColor(100); doc.text(label, col2, yRes);
    doc.setTextColor(30, 41, 59); doc.text(val, col2 + colW - 2, yRes, { align: 'right' });
    yRes += 5;
  });
  y = Math.max(yAntro, yRes) + 8;

  // Legenda das curvas
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
  doc.text('LEGENDAS DOS GRÁFICOS', margin, y); y += 4;
  doc.setDrawColor(16, 185, 129); doc.line(margin, y, w - margin, y); y += 5;

  const legendas = [
    { titulo: 'Para o gráfico de Peso/Idade:', itens: ['Zona vermelha superior → Peso elevado', 'Zona amarela superior → Eutrófico', 'Zona verde → Peso adequado', 'Zona amarela inferior → Eutrófico', 'Zonas vermelhas → Baixo peso / Muito baixo peso'] },
    { titulo: 'Para o gráfico de Altura/Idade:', itens: ['Zona verde e acima → Estatura adequada', 'Zona vermelha → Baixa estatura', 'Zona vermelha escura → Muito baixa estatura'] },
    { titulo: 'Para o gráfico de IMC/Idade:', itens: ['Zona vermelha superior → Obesidade grave / Obesidade', 'Zona amarela → Sobrepeso / Eutrófico', 'Zona verde → Eutrófico', 'Zona vermelha inferior → Magreza / Magreza severa'] },
  ];

  const col3 = margin;
  const colLegW = (w - margin * 2) / 3 - 3;
  let yLeg = y;
  legendas.forEach((leg, i) => {
    const cx = col3 + i * (colLegW + 3);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(30, 41, 59);
    doc.text(leg.titulo, cx, yLeg);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    leg.itens.forEach((item, j) => {
      doc.setTextColor(80);
      doc.text(item, cx, yLeg + 5 + j * 4.2, { maxWidth: colLegW });
    });
  });
  y = yLeg + 30;

  // Nota OMS e assinatura
  doc.setFontSize(6.5); doc.setTextColor(130); doc.setFont('helvetica', 'italic');
  doc.text('A linha/ponto preto representa o estado do paciente para aquela determinada idade (em meses). Curvas OMS 2007.', margin, y, { maxWidth: w - margin * 2 }); y += 8;

  // Assinatura
  doc.setDrawColor(180); doc.line(margin, y, margin + 80, y); y += 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 41, 59);
  doc.text(professionalName, margin, y); y += 4;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(`Nutricionista${crn ? ' — ' + crn : ''}`, margin, y);

  drawFooter(doc, papelTimbrado);
  doc.save(`relatorio_antropometria_${student.nome_completo.replace(/\s+/g, '_')}_${assessment.assessment_date ?? ''}.pdf`);
}

// ─── PDF: Evolução Nutricional ────────────────────────────────────────────────
async function generateEvolucaoPDF(
  history: NutritionAnthropometryHistory[],
  student: StudentOption,
  professionalName: string,
  papelTimbrado: any,
) {
  const [{ default: jsPDF }, { drawLetterhead, drawFooter }] = await Promise.all([
    import('jspdf'),
    import('../utils/pdfExport'),
  ]);
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const margin = 20;
  await drawLetterhead(doc, papelTimbrado);
  let y = 52;

  doc.setFillColor(139, 92, 246);
  doc.roundedRect(margin, y, w - margin * 2, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('EVOLUÇÃO NUTRICIONAL', w / 2, y + 6.5, { align: 'center' });
  y += 16;

  doc.setTextColor(30, 41, 59); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text(`Aluno: ${student.nome_completo}`, margin, y); y += 8;

  // Tabela de histórico
  const headers = ['Data', 'Peso (kg)', 'Altura (cm)', 'IMC', 'Classif. IMC/Idade', '% Gordura'];
  const colWidths = [28, 22, 24, 18, 42, 24];
  let x = margin;
  doc.setFillColor(139, 92, 246);
  doc.rect(margin, y - 4, w - margin * 2, 8, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => { doc.text(h, x + 2, y + 0.5); x += colWidths[i]; });
  y += 7;

  const sorted = [...history].sort((a, b) => a.data_medicao.localeCompare(b.data_medicao));
  sorted.forEach((row, idx) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFillColor(idx % 2 === 0 ? 250 : 245, 245, 250);
    doc.rect(margin, y - 4, w - margin * 2, 6.5, 'F');
    doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    x = margin;
    const altCm = row.altura_m ? (row.altura_m < 3 ? (row.altura_m * 100).toFixed(0) : row.altura_m.toFixed(0)) : '-';
    const vals = [
      row.data_medicao ? new Date(row.data_medicao + 'T12:00:00').toLocaleDateString('pt-BR') : '-',
      row.peso_kg?.toString() ?? '-',
      altCm,
      row.imc?.toString() ?? '-',
      row.relacao_imc_idade ?? row.imc_classificacao ?? '-',
      row.percentual_gordura ? row.percentual_gordura + '%' : '-',
    ];
    vals.forEach((v, i) => { doc.text(v, x + 2, y + 0.5, { maxWidth: colWidths[i] - 4 }); x += colWidths[i]; });
    y += 7;
  });
  if (sorted.length === 0) { doc.setTextColor(130); doc.text('Nenhum registro de histórico encontrado.', margin, y); y += 8; }
  drawFooter(doc, papelTimbrado);
  doc.save(`evolucao_nutricional_${student.nome_completo.replace(/\s+/g, '_')}.pdf`);
}

// ─── PDF: Individual (atualizado com novos campos) ────────────────────────────
async function generateIndividualPDF(
  assessment: NutritionAssessment, student: StudentOption,
  professionalName: string, papelTimbrado: any,
) {
  const [{ default: jsPDF }, { drawLetterhead, drawFooter }] = await Promise.all([
    import('jspdf'), import('../utils/pdfExport'),
  ]);
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth(); const margin = 20;
  await drawLetterhead(doc, papelTimbrado);
  let y = 52;
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(margin, y, w - margin * 2, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE AVALIAÇÃO NUTRICIONAL INDIVIDUAL', w / 2, y + 6.5, { align: 'center' });
  y += 16;
  const idade = student.date_of_birth ? calcularIdadeCompleta(student.date_of_birth) : null;
  doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text(`Aluno: ${student.nome_completo}`, margin, y);
  doc.text(`Data avaliação: ${assessment.assessment_date ? new Date(assessment.assessment_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}`, margin + 100, y); y += 5;
  if (idade) { doc.text(`Idade: ${idade.formatado}`, margin, y); y += 5; }
  y += 3;
  const sections = [
    { title: 'ANTROPOMETRIA', items: [
      `Peso: ${assessment.peso_kg ?? '-'} kg  |  Altura: ${assessment.altura_m ? (assessment.altura_m < 3 ? (assessment.altura_m * 100).toFixed(0) : assessment.altura_m) + ' cm' : '-'}  |  IMC: ${assessment.imc ?? '-'} kg/m²`,
      `Classif. IMC/Idade: ${assessment.relacao_imc_idade ?? assessment.imc_classificacao ?? '-'}`,
      `Peso/Idade: ${assessment.relacao_peso_idade ?? '-'}  |  Altura/Idade: ${assessment.relacao_altura_idade ?? '-'}`,
      ...(assessment.percentual_gordura ? [`% Gordura: ${assessment.percentual_gordura}%  |  Classif. (Lohman): ${assessment.classificacao_gordura ?? '-'}`] : []),
    ]},
    { title: 'DIAGNÓSTICO NUTRICIONAL', items: [ assessment.diagnostico_nutricional ?? 'Não informado' ] },
    ...(assessment.condutas?.length ? [{ title: 'CONDUTAS', items: assessment.condutas }] : []),
    ...(assessment.orientacoes ? [{ title: 'ORIENTAÇÕES', items: [assessment.orientacoes] }] : []),
    ...(assessment.condicoes_saude?.length ? [{ title: 'CONDIÇÕES DE SAÚDE', items: [assessment.condicoes_saude.join(', ')] }] : []),
    ...(assessment.classificacao_ebia ? [{ title: 'SEGURANÇA ALIMENTAR (EBIA)', items: [`Classificação: ${assessment.classificacao_ebia}`] }] : []),
  ];
  sections.forEach(sec => {
    if (y > 255) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 41, 59);
    doc.text(sec.title, margin, y); y += 3;
    doc.setDrawColor(16, 185, 129); doc.line(margin, y, w - margin, y); y += 4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(60);
    sec.items.forEach(item => {
      const lines = doc.splitTextToSize(item, w - margin * 2);
      doc.text(lines, margin, y); y += lines.length * 4.5 + 1;
    });
    y += 4;
  });
  if (assessment.proxima_avaliacao) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(30, 41, 59);
    doc.text(`Próxima avaliação: ${new Date(assessment.proxima_avaliacao + 'T12:00:00').toLocaleDateString('pt-BR')}`, margin, y); y += 8;
  }
  y = Math.max(y, 240);
  doc.setDrawColor(180); doc.line(margin, y, margin + 80, y); y += 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 41, 59);
  doc.text(professionalName, margin, y); y += 4;
  doc.setFont('helvetica', 'normal'); doc.text('Nutricionista — SEMED Brotas de Macaúbas', margin, y);
  drawFooter(doc, papelTimbrado);
  doc.save(`relatorio_individual_${student.nome_completo.replace(/\s+/g, '_')}.pdf`);
}

// ─── PDF: Família ─────────────────────────────────────────────────────────────
async function generateFamiliaPDF(assessment: NutritionAssessment, student: StudentOption, professionalName: string, papelTimbrado: any) {
  const [{ default: jsPDF }, { drawLetterhead, drawFooter }] = await Promise.all([import('jspdf'), import('../utils/pdfExport')]);
  const doc = new jsPDF('p', 'mm', 'a4'); const w = doc.internal.pageSize.getWidth(); const margin = 20;
  await drawLetterhead(doc, papelTimbrado); let y = 52;
  doc.setFillColor(236, 72, 153); doc.roundedRect(margin, y, w - margin * 2, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('ORIENTAÇÕES NUTRICIONAIS — FAMÍLIA', w / 2, y + 6.5, { align: 'center' }); y += 16;
  doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`Aluno(a): ${student.nome_completo}`, margin, y); y += 5;
  const imcClass = assessment.relacao_imc_idade ?? assessment.imc_classificacao ?? '';
  const imcMsg = imcClass.includes('grave') || imcClass.includes('Obesidade') ? 'O peso do seu filho(a) está acima do recomendado para a idade.' :
    imcClass.includes('adequad') || imcClass.includes('Eutrofia') ? 'O peso do seu filho(a) está adequado para a idade. Continue assim!' :
    imcClass.includes('Sobrepeso') ? 'O peso do seu filho(a) está um pouco acima do ideal.' : 'Situação nutricional requer atenção.';
  doc.setFont('helvetica', 'bold'); doc.text('COMO ESTÁ O ESTADO NUTRICIONAL:', margin, y); y += 5;
  doc.setFont('helvetica', 'normal'); const msgLines = doc.splitTextToSize(imcMsg, w - margin * 2); doc.text(msgLines, margin, y); y += msgLines.length * 4.5 + 5;
  if (assessment.orientacoes) {
    doc.setFont('helvetica', 'bold'); doc.text('ORIENTAÇÕES DA NUTRICIONISTA:', margin, y); y += 5;
    doc.setFont('helvetica', 'normal'); const oLines = doc.splitTextToSize(assessment.orientacoes, w - margin * 2); doc.text(oLines, margin, y); y += oLines.length * 4.5 + 5;
  }
  if (assessment.condutas?.length) {
    doc.setFont('helvetica', 'bold'); doc.text('CONDUTAS RECOMENDADAS:', margin, y); y += 5;
    doc.setFont('helvetica', 'normal'); assessment.condutas.forEach(c => { const l = doc.splitTextToSize(`• ${c}`, w - margin * 2); doc.text(l, margin, y); y += l.length * 4.5 + 1; }); y += 4;
  }
  if (assessment.proxima_avaliacao) { doc.setFont('helvetica', 'bold'); doc.text(`Próxima consulta: ${new Date(assessment.proxima_avaliacao + 'T12:00:00').toLocaleDateString('pt-BR')}`, margin, y); y += 8; }
  y = Math.max(y, 240); doc.setDrawColor(180); doc.line(margin, y, margin + 80, y); y += 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(professionalName, margin, y); y += 4;
  doc.setFont('helvetica', 'normal'); doc.text('Nutricionista — SEMED Brotas de Macaúbas', margin, y);
  drawFooter(doc, papelTimbrado);
  doc.save(`orientacoes_familia_${student.nome_completo.replace(/\s+/g, '_')}.pdf`);
}

// ─── PDF: NAE por aluno ───────────────────────────────────────────────────────
async function generateNaePDF(naes: NutritionNAE[], student: StudentOption, professionalName: string, papelTimbrado: any) {
  const [{ default: jsPDF }, { drawLetterhead, drawFooter }] = await Promise.all([import('jspdf'), import('../utils/pdfExport')]);
  const doc = new jsPDF('p', 'mm', 'a4'); const w = doc.internal.pageSize.getWidth(); const margin = 20;
  await drawLetterhead(doc, papelTimbrado); let y = 52;
  doc.setFillColor(239, 68, 68); doc.roundedRect(margin, y, w - margin * 2, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('NECESSIDADES ALIMENTARES ESPECIAIS (NAE)', w / 2, y + 6.5, { align: 'center' }); y += 16;
  doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`Aluno(a): ${student.nome_completo}`, margin, y); y += 8;
  if (!naes.length) { doc.text('Nenhuma NAE registrada para este aluno.', margin, y); }
  naes.forEach((nae, i) => {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(`${i + 1}. ${nae.tipo} — Gravidade: ${nae.gravidade}`, margin, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    if (nae.alimentos_proibidos) { doc.text(`Alimentos proibidos: ${nae.alimentos_proibidos}`, margin, y, { maxWidth: w - margin * 2 }); y += 5; }
    if (nae.alimentos_permitidos) { doc.text(`Alimentos permitidos: ${nae.alimentos_permitidos}`, margin, y, { maxWidth: w - margin * 2 }); y += 5; }
    const flags = [nae.contaminacao_cruzada && 'Risco contaminação cruzada', nae.utensilios_exclusivos && 'Utensílios exclusivos', nae.alimentacao_de_casa && 'Alimentação de casa', nae.monitoramento_individual && 'Monitoramento individual'].filter(Boolean);
    if (flags.length) { doc.text(`Atenção: ${flags.join(' | ')}`, margin, y, { maxWidth: w - margin * 2 }); y += 5; }
    if (nae.laudo_validade) { doc.text(`Validade do laudo: ${new Date(nae.laudo_validade + 'T12:00:00').toLocaleDateString('pt-BR')}`, margin, y); y += 5; }
    y += 4;
  });
  y = Math.max(y, 240); doc.setDrawColor(180); doc.line(margin, y, margin + 80, y); y += 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(professionalName, margin, y);
  drawFooter(doc, papelTimbrado);
  doc.save(`nae_${student.nome_completo.replace(/\s+/g, '_')}.pdf`);
}

// ─── PDF: Plano Alimentar ─────────────────────────────────────────────────────
async function generatePlanoPDF(assessment: NutritionAssessment, student: StudentOption, professionalName: string, crn: string, papelTimbrado: any) {
  const [{ default: jsPDF }, { drawLetterhead, drawFooter }] = await Promise.all([import('jspdf'), import('../utils/pdfExport')]);
  const doc = new jsPDF('p', 'mm', 'a4'); const w = doc.internal.pageSize.getWidth(); const margin = 20;
  await drawLetterhead(doc, papelTimbrado); let y = 52;
  doc.setFillColor(71, 85, 105); doc.roundedRect(margin, y, w - margin * 2, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('PLANO ALIMENTAR E CONDUTA NUTRICIONAL', w / 2, y + 6.5, { align: 'center' }); y += 16;
  doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`Aluno(a): ${student.nome_completo}`, margin, y);
  doc.text(`Data: ${assessment.assessment_date ? new Date(assessment.assessment_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}`, margin + 100, y); y += 8;
  if (assessment.diagnostico_nutricional) {
    doc.setFont('helvetica', 'bold'); doc.text('DIAGNÓSTICO:', margin, y); y += 4;
    doc.setFont('helvetica', 'normal'); const l = doc.splitTextToSize(assessment.diagnostico_nutricional, w - margin * 2); doc.text(l, margin, y); y += l.length * 4.5 + 5;
  }
  if (assessment.condutas?.length) {
    doc.setFont('helvetica', 'bold'); doc.text('CONDUTAS PRESCRITAS:', margin, y); y += 4;
    doc.setFont('helvetica', 'normal'); assessment.condutas.forEach(c => { const l = doc.splitTextToSize(`• ${c}`, w - margin * 2); doc.text(l, margin, y); y += l.length * 4.5 + 1; }); y += 5;
  }
  if (assessment.orientacoes) {
    doc.setFont('helvetica', 'bold'); doc.text('ORIENTAÇÕES NUTRICIONAIS:', margin, y); y += 4;
    doc.setFont('helvetica', 'normal'); const l = doc.splitTextToSize(assessment.orientacoes, w - margin * 2); doc.text(l, margin, y); y += l.length * 4.5 + 5;
  }
  if (assessment.gemini_orientacao) {
    doc.setFont('helvetica', 'bold'); doc.text('ORIENTAÇÕES IA (GEMINI):', margin, y); y += 4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); const l = doc.splitTextToSize(assessment.gemini_orientacao, w - margin * 2); doc.text(l, margin, y); y += l.length * 4 + 5;
  }
  if (assessment.proxima_avaliacao) { doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(`Retorno previsto: ${new Date(assessment.proxima_avaliacao + 'T12:00:00').toLocaleDateString('pt-BR')}`, margin, y); y += 8; }
  y = Math.max(y, 240); doc.setDrawColor(180); doc.line(margin, y, margin + 80, y); y += 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(professionalName, margin, y); y += 4;
  doc.setFont('helvetica', 'normal'); doc.text(`Nutricionista${crn ? ' — ' + crn : ''}`, margin, y);
  drawFooter(doc, papelTimbrado);
  doc.save(`plano_alimentar_${student.nome_completo.replace(/\s+/g, '_')}.pdf`);
}

// ─── PDF consolidados (escola/secretaria/pnae) — mantém lógica existente ──────
async function generateConsolidadoPDF(
  type: 'escola' | 'secretaria' | 'pnae',
  stats: NutritionDashboardStats,
  naes: NutritionNAE[],
  professionalName: string,
) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth(); const margin = 20; let y = 25;
  const colors: Record<string, [number, number, number]> = { escola: [16, 185, 129], secretaria: [139, 92, 246], pnae: [245, 158, 11] };
  const titles = { escola: 'RELATÓRIO NUTRICIONAL — ESCOLA', secretaria: 'RELATÓRIO CONSOLIDADO — SECRETARIA', pnae: 'RELATÓRIO PNAE — PROGRAMA NACIONAL ALIMENTAÇÃO ESCOLAR' };
  const [r, g, b] = colors[type];
  doc.setFillColor(r, g, b); doc.rect(0, 0, w, 18, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(titles[type], w / 2, 11, { align: 'center' }); y = 28;
  doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('PERFIL NUTRICIONAL DA REDE', margin, y); y += 6;
  const pn = stats.perfilNutricional; const total = pn.baixoPeso + pn.eutrofia + pn.sobrepeso + pn.obesidade + pn.obesidadeGrave;
  const pct = (v: number) => total > 0 ? ` (${Math.round((v / total) * 100)}%)` : '';
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  [`Baixo peso: ${pn.baixoPeso}${pct(pn.baixoPeso)}`, `Eutrofia: ${pn.eutrofia}${pct(pn.eutrofia)}`, `Sobrepeso: ${pn.sobrepeso}${pct(pn.sobrepeso)}`, `Obesidade: ${pn.obesidade}${pct(pn.obesidade)}`, `Obesidade grave: ${pn.obesidadeGrave}${pct(pn.obesidadeGrave)}`]
    .forEach(t => { doc.text(t, margin, y); y += 5; });
  y += 5;
  if (naes.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(`NECESSIDADES ALIMENTARES ESPECIAIS (${naes.length})`, margin, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    naes.slice(0, 20).forEach(nae => {
      if (y > 260) { doc.addPage(); y = 20; }
      const nome = (nae as any).students?.nome_completo ?? nae.student_id;
      const v = nae.laudo_validade && new Date(nae.laudo_validade) < new Date() ? ' [LAUDO VENCIDO]' : '';
      doc.text(`• ${nome} — ${nae.tipo} (${nae.gravidade})${v}`, margin, y, { maxWidth: w - margin * 2 }); y += 5;
    });
  }
  y = Math.max(y, 240); doc.setDrawColor(180); doc.line(margin, y, margin + 80, y); y += 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(professionalName, margin, y); y += 4;
  doc.setFont('helvetica', 'normal'); doc.text('Nutricionista RT — PNAE | SEMED Brotas de Macaúbas', margin, y);
  doc.setFontSize(7); doc.setTextColor(150); doc.text(`Gerado pelo Sistema Brotar em ${new Date().toLocaleString('pt-BR')}`, w / 2, 290, { align: 'center' });
  doc.save(`${type === 'escola' ? 'relatorio_escola' : type === 'pnae' ? 'relatorio_PNAE' : 'relatorio_secretaria'}_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ─── Componente principal ─────────────────────────────────────────────────────
const NutritionReportsModule: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [stats, setStats] = useState<NutritionDashboardStats | null>(null);
  const [naes, setNaes] = useState<NutritionNAE[]>([]);
  const [latestAssessment, setLatestAssessment] = useState<NutritionAssessment | null>(null);
  const [history, setHistory] = useState<NutritionAnthropometryHistory[]>([]);
  const [studentNaes, setStudentNaes] = useState<NutritionNAE[]>([]);
  const [papelTimbrado, setPapelTimbrado] = useState<any>(null);
  const [showStudentList, setShowStudentList] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const professionalName = user?.name ?? 'Nutricionista';
  const crn = (user as any)?.crn ?? '';

  // Carga inicial
  useEffect(() => {
    const load = async () => {
      try {
        const [s, n, pt, sts] = await Promise.all([
          SupabaseService.getNutritionDashboardStats(),
          SupabaseService.getAllActiveNAE(),
          SupabaseService.getPapelTimbradoConfig(1),
          SupabaseService.getAlunosPorPerfil(user!, user!.id, { listScope: 'todos' }),
        ]);
        setStats(s); setNaes(n); setPapelTimbrado(pt);
        setStudents(sts.map((st: any) => ({
          id: st.id,
          nome_completo: st.nomeCompleto ?? st.nome_completo ?? '',
          date_of_birth: st.birthDate ?? st.date_of_birth,
        })));
      } catch (err) { console.error(err); }
      finally { setDataLoading(false); }
    };
    load();
  }, []);

  // Ao selecionar aluno: carregar avaliação e histórico
  useEffect(() => {
    if (!selectedStudent) { setLatestAssessment(null); setHistory([]); setStudentNaes([]); return; }
    const load = async () => {
      const [ass, hist, sNaes] = await Promise.all([
        SupabaseService.getNutritionAssessments(selectedStudent.id),
        SupabaseService.getAnthropometryHistory(selectedStudent.id),
        SupabaseService.getNAEByStudent(selectedStudent.id).catch(() => []),
      ]);
      setLatestAssessment(ass[0] ?? null);
      setHistory(hist ?? []);
      setStudentNaes(sNaes ?? []);
    };
    load().catch(console.error);
  }, [selectedStudent]);

  const filteredStudents = students.filter(s =>
    s.nome_completo.toLowerCase().includes(search.toLowerCase())
  );

  const isPorAluno = selectedReport
    ? REPORTS_POR_ALUNO.some(r => r.id === selectedReport) : false;

  const handleGenerate = async () => {
    if (!selectedReport || loading) return;
    setLoading(true);
    try {
      if (isPorAluno) {
        if (!selectedStudent) { alert('Selecione um aluno.'); return; }
        if (!latestAssessment && selectedReport !== 'evolucao' && selectedReport !== 'nae') {
          alert('Nenhuma avaliação encontrada para este aluno.'); return;
        }
        if (selectedReport === 'antropometria')
          await generateAntropometriaPDF(latestAssessment!, selectedStudent, professionalName, crn, papelTimbrado);
        else if (selectedReport === 'individual')
          await generateIndividualPDF(latestAssessment!, selectedStudent, professionalName, papelTimbrado);
        else if (selectedReport === 'evolucao')
          await generateEvolucaoPDF(history, selectedStudent, professionalName, papelTimbrado);
        else if (selectedReport === 'familia')
          await generateFamiliaPDF(latestAssessment!, selectedStudent, professionalName, papelTimbrado);
        else if (selectedReport === 'nae')
          await generateNaePDF(studentNaes, selectedStudent, professionalName, papelTimbrado);
        else if (selectedReport === 'plano')
          await generatePlanoPDF(latestAssessment!, selectedStudent, professionalName, crn, papelTimbrado);
      } else {
        if (!stats) { alert('Dados ainda carregando.'); return; }
        await generateConsolidadoPDF(selectedReport as 'escola' | 'secretaria' | 'pnae', stats, naes, professionalName);
      }
    } catch (err) {
      console.error(err); alert('Erro ao gerar relatório. Verifique o console.');
    } finally { setLoading(false); }
  };

  // Preview dados do aluno selecionado
  const idade = selectedStudent?.date_of_birth ? calcularIdadeCompleta(selectedStudent.date_of_birth) : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app/nutricion/dashboard')} className="p-2 rounded-xl hover:bg-gray-100 text-slate-500 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-medium text-slate-800">Relatórios nutricionais</h1>
            <p className="text-sm text-slate-500">Selecione o aluno e o tipo de relatório</p>
          </div>
        </div>

        {/* ── PASSO 1: Selecionar aluno ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5" style={{boxShadow:'0 2px 12px rgba(0,0,0,0.04)'}}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Passo 1 — selecionar aluno</p>

          {selectedStudent ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                {selectedStudent.nome_completo.split(' ').slice(0,2).map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{selectedStudent.nome_completo}</p>
                <p className="text-xs text-slate-400">{idade ? idade.formatado : 'Idade não informada'}{latestAssessment ? ` · Última avaliação: ${new Date(latestAssessment.assessment_date + 'T12:00:00').toLocaleDateString('pt-BR')}` : ' · Sem avaliação registrada'}</p>
              </div>
              <button onClick={() => { setSelectedStudent(null); setSelectedReport(null); setShowStudentList(true); }}
                className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                <RefreshCw size={12} /> Trocar
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar aluno pelo nome..."
                value={search}
                onChange={e => { setSearch(e.target.value); setShowStudentList(true); }}
                onFocus={() => setShowStudentList(true)}
                className="w-full h-10 rounded-xl border border-gray-200 px-4 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
              />
              {showStudentList && filteredStudents.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                  {filteredStudents.slice(0, 20).map(s => (
                    <button key={s.id} onClick={() => { setSelectedStudent(s); setShowStudentList(false); setSearch(''); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center gap-2 border-b border-gray-100 last:border-0">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs flex-shrink-0">
                        {s.nome_completo.split(' ').slice(0,2).map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm text-slate-700">{s.nome_completo}</span>
                    </button>
                  ))}
                </div>
              )}
              {dataLoading && <p className="text-xs text-slate-400 animate-pulse">Carregando alunos...</p>}
            </div>
          )}
        </div>

        {/* ── PASSO 2: Relatórios por aluno ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5" style={{boxShadow:'0 2px 12px rgba(0,0,0,0.04)'}}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Passo 2 — relatórios por aluno</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {REPORTS_POR_ALUNO.map(r => {
              const c = colorMap[r.color] ?? colorMap.neutral;
              const isActive = selectedReport === r.id;
              return (
                <button key={r.id} onClick={() => setSelectedReport(isActive ? null : r.id)}
                  className={`relative text-left rounded-2xl border-2 p-4 transition-all ${isActive ? `${c.border} ${c.bg} ring-2 ring-offset-1 ring-blue-200` : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'}`}>
                  {r.badge && (
                    <span className={`absolute top-2 right-2 text-[9px] font-semibold px-1.5 py-0.5 rounded ${r.badge === 'novo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.badge}
                    </span>
                  )}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${isActive ? c.bg : 'bg-white'}`}>
                    <i className={`ti ${r.icon} ${c.text}`} style={{fontSize:18}} aria-hidden="true" />
                  </div>
                  <p className={`text-[13px] font-semibold mb-0.5 ${isActive ? c.text : 'text-slate-700'}`}>{r.title}</p>
                  <p className="text-[11px] text-slate-400 leading-snug">{r.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Relatórios consolidados ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5" style={{boxShadow:'0 2px 12px rgba(0,0,0,0.04)'}}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Relatórios consolidados (rede)</p>
          <div className="grid grid-cols-3 gap-3">
            {REPORTS_CONSOLIDADOS.map(r => {
              const c = colorMap[r.color] ?? colorMap.neutral;
              const isActive = selectedReport === r.id;
              return (
                <button key={r.id} onClick={() => { setSelectedReport(isActive ? null : r.id); setSelectedStudent(null); }}
                  className={`relative text-left rounded-2xl border-2 p-4 transition-all ${isActive ? `${c.border} ${c.bg}` : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${isActive ? c.bg : 'bg-white'}`}>
                    <i className={`ti ${r.icon} ${c.text}`} style={{fontSize:18}} aria-hidden="true" />
                  </div>
                  <p className={`text-[13px] font-semibold mb-0.5 ${isActive ? c.text : 'text-slate-700'}`}>{r.title}</p>
                  <p className="text-[11px] text-slate-400 leading-snug">{r.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── PASSO 3: Preview + Gerar ── */}
        {selectedReport && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 space-y-4" style={{boxShadow:'0 2px 12px rgba(59,130,246,0.08)'}}>
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-blue-600" />
              <p className="text-sm font-semibold text-blue-700">
                Prévia — {[...REPORTS_POR_ALUNO, ...REPORTS_CONSOLIDADOS].find(r => r.id === selectedReport)?.title}
              </p>
            </div>

            {/* Preview do aluno + avaliação */}
            {isPorAluno && selectedStudent && latestAssessment && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: 'Idade', val: idade?.formatado ?? '-' },
                  { label: 'IMC', val: latestAssessment.imc ? `${latestAssessment.imc} kg/m²` : '-' },
                  { label: 'Peso/Idade', val: latestAssessment.relacao_peso_idade ?? '-' },
                  { label: 'Altura/Idade', val: latestAssessment.relacao_altura_idade ?? '-' },
                  { label: 'IMC/Idade', val: latestAssessment.relacao_imc_idade ?? latestAssessment.imc_classificacao ?? '-' },
                  { label: '% Gordura', val: latestAssessment.percentual_gordura ? `${latestAssessment.percentual_gordura}%` : '-' },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-xl p-2.5">
                    <p className="text-[10px] text-slate-400 mb-0.5">{item.label}</p>
                    <p className={`text-xs font-semibold px-1.5 py-0.5 rounded inline-block ${badgeClass(item.val)}`}>{item.val}</p>
                  </div>
                ))}
              </div>
            )}

            {isPorAluno && selectedStudent && !latestAssessment && selectedReport !== 'evolucao' && selectedReport !== 'nae' && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-xl px-4 py-3">
                <AlertTriangle size={16} /> <span className="text-sm">Nenhuma avaliação registrada para este aluno ainda.</span>
              </div>
            )}

            {isPorAluno && selectedReport === 'evolucao' && history.length > 0 && (
              <p className="text-sm text-blue-700"><TrendingUp size={14} className="inline mr-1" />{history.length} registro{history.length > 1 ? 's' : ''} de histórico encontrado{history.length > 1 ? 's' : ''}.</p>
            )}

            {!isPorAluno && stats && (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-xl p-2.5"><p className="text-[10px] text-slate-400">Total alunos</p><p className="text-sm font-semibold text-slate-700">{stats.totalAlunos}</p></div>
                <div className="bg-white rounded-xl p-2.5"><p className="text-[10px] text-slate-400">Avaliados</p><p className="text-sm font-semibold text-slate-700">{stats.avaliados}</p></div>
                <div className="bg-white rounded-xl p-2.5"><p className="text-[10px] text-slate-400">NAE ativos</p><p className="text-sm font-semibold text-slate-700">{stats.naeAtivos}</p></div>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-2 pt-1">
              <button onClick={handleGenerate} disabled={loading || (isPorAluno && !selectedStudent)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {loading ? 'Gerando PDF...' : 'Gerar PDF'}
              </button>
              <button onClick={() => window.print()}
                className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-slate-700 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                <Printer size={16} /> Imprimir
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default NutritionReportsModule;
