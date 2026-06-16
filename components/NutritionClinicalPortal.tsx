import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft, Search, ClipboardList, Activity, FileText,
  ShieldCheck, Brain, AlertTriangle, CheckCircle, Check,
  Scale, Clock, Download, Plus, ChevronRight, User as UserIcon,
  Loader2, UserPlus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseService } from '../services/SupabaseService';
import NutritionEvolutionModal from './NutritionEvolutionModal';
import CadastroRapidoModal from './CadastroRapidoModal';
import type { User, Student, NutritionAssessment, NutritionEvolution, NutritionNAE } from '../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function calcIMC(peso: number, altura: number): number | null {
  if (!peso || !altura || altura <= 0) return null;
  return Math.round((peso / (altura * altura)) * 10) / 10;
}

function classifyIMC(imc: number | null): string {
  if (imc === null) return '';
  if (imc < 17) return 'Magreza acentuada';
  if (imc < 18.5) return 'Magreza';
  if (imc < 25) return 'Eutrofia';
  if (imc < 30) return 'Sobrepeso';
  if (imc < 35) return 'Obesidade';
  return 'Obesidade grave';
}

const IMC_COLOR: Record<string, string> = {
  'Magreza acentuada': 'bg-blue-100 text-blue-800 border-blue-200',
  Magreza: 'bg-blue-50 text-blue-700 border-blue-200',
  Eutrofia: 'bg-green-50 text-green-800 border-green-200',
  Sobrepeso: 'bg-amber-50 text-amber-800 border-amber-200',
  Obesidade: 'bg-orange-50 text-orange-800 border-orange-200',
  'Obesidade grave': 'bg-red-50 text-red-800 border-red-200',
};

function getIMCPosition(imc: number): number {
  if (imc <= 15) return 2;
  if (imc <= 17) return 5 + ((imc - 15) / 2) * 10;
  if (imc <= 18.5) return 15 + ((imc - 17) / 1.5) * 10;
  if (imc <= 25) return 25 + ((imc - 18.5) / 6.5) * 25;
  if (imc <= 30) return 50 + ((imc - 25) / 5) * 20;
  if (imc <= 35) return 70 + ((imc - 30) / 5) * 15;
  return Math.min(98, 85 + ((imc - 35) / 10) * 13);
}

function calcAge(birthDate: string | undefined): number | null {
  if (!birthDate) return null;
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / 31557600000);
}

function fmtDate(d: string | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return d;
  }
}

function monthsAgo(d: string | undefined): number {
  if (!d) return 999;
  return Math.floor((Date.now() - new Date(d).getTime()) / (30.44 * 86400000));
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const EBIA_BADGE: Record<string, string> = {
  'Segurança alimentar': 'bg-green-50 text-green-700 border-green-200',
  'Insegurança leve': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Insegurança moderada': 'bg-orange-50 text-orange-700 border-orange-200',
  'Insegurança grave': 'bg-red-50 text-red-700 border-red-200',
};

const SELETIVIDADE_COLOR: Record<string, string> = {
  Ausente: 'bg-green-50 text-green-700',
  Leve: 'bg-yellow-50 text-yellow-700',
  Moderada: 'bg-orange-50 text-orange-700',
  Severa: 'bg-red-50 text-red-700',
};

// ─── SCORE BAR ────────────────────────────────────────────────────────────────

const ScoreBar: React.FC<{ label: string; value?: number }> = ({ label, value = 0 }) => {
  const pct = (value / 10) * 100;
  const color = value <= 3 ? '#EF4444' : value <= 6 ? '#F59E0B' : '#10B981';
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[11px] text-slate-500 w-16 truncate shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-bold w-4 text-right" style={{ color }}>{value}</span>
    </div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────

interface PortalProps {
  currentUser: User;
  onNavigate: (page: string) => void;
}

const NutritionClinicalPortal: React.FC<PortalProps> = ({ currentUser, onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Student selection
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Clinical data
  const [assessment, setAssessment] = useState<NutritionAssessment | null>(null);
  const [naeList, setNaeList] = useState<NutritionNAE[]>([]);
  const [evolutions, setEvolutions] = useState<NutritionEvolution[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Modal
  const [showEvolution, setShowEvolution] = useState(false);
  const [confirmDischarge, setConfirmDischarge] = useState(false);
  const [showCadastroRapido, setShowCadastroRapido] = useState(false);

  // Load students
  useEffect(() => {
    setLoadingStudents(true);
    SupabaseService.getStudentsForUser(currentUser)
      .then(setStudents)
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, [currentUser]);

  // Auto-select student from location state (coming from PatientProfile)
  useEffect(() => {
    const openId = (location.state as any)?.openStudentId;
    if (openId && students.length > 0) {
      const found = students.find((s) => s.id === openId);
      if (found) setSelectedStudent(found);
    }
  }, [location.state, students]);

  // Load clinical data when student is selected
  const loadClinicalData = useCallback(async (studentId: string) => {
    setLoadingData(true);
    try {
      const [assessments, nae, evos] = await Promise.all([
        SupabaseService.getNutritionAssessments(studentId),
        SupabaseService.getNAEByStudent(studentId),
        SupabaseService.getNutritionEvolutions(studentId),
      ]);
      setAssessment(assessments[0] ?? null);
      setNaeList(nae);
      setEvolutions(evos);
    } catch {
      // silenciar
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      loadClinicalData(selectedStudent.id);
    }
  }, [selectedStudent, loadClinicalData]);

  const handleSelectStudent = (s: Student) => {
    setSelectedStudent(s);
    setAssessment(null);
    setNaeList([]);
    setEvolutions([]);
  };

  const handleBack = () => {
    setSelectedStudent(null);
    setAssessment(null);
    setNaeList([]);
    setEvolutions([]);
    setSearch('');
  };

  const filteredStudents = students.filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  // Computed
  const imc = assessment ? calcIMC(assessment.peso_kg ?? 0, assessment.altura_m ?? 0) : null;
  const imcClass = classifyIMC(imc);
  const age = selectedStudent ? calcAge(selectedStudent.birthDate) : null;
  const assessmentOld = assessment ? monthsAgo(assessment.assessment_date) > 6 : true;

  // ─── STUDENT SELECTION ────────────────────────────────────────────────────

  if (!selectedStudent) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-xl hover:bg-gray-100 text-slate-400 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-slate-800">Portal Clínico — Nutrição</h1>
              <p className="text-sm text-slate-400">Selecione o aluno para acessar o prontuário nutricional</p>
            </div>
            <button
              onClick={() => setShowCadastroRapido(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-xs transition-colors"
            >
              <UserPlus size={14} /> Cadastro Rápido
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar aluno por nome…"
              className="w-full h-12 pl-11 pr-4 rounded-2xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-medium outline-none transition bg-white"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
            />
          </div>

          {/* List */}
          {loadingStudents ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-16">
              <UserIcon size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="font-semibold text-slate-500">Nenhum aluno encontrado</p>
              <p className="text-sm text-slate-400 mt-1">Tente buscar por outro nome</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectStudent(s)}
                  className="w-full flex items-center gap-3.5 bg-white rounded-2xl border border-gray-100 p-4 text-left hover:border-blue-200 hover:shadow-md transition-all group"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0 border border-gray-100">
                    {getInitials(s.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{s.fullName}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {s.school?.grade ?? ''}{s.school?.grade && s.school?.schoolName ? ' · ' : ''}{s.school?.schoolName ?? ''}
                      {s.birthDate ? ` · ${calcAge(s.birthDate)} anos` : ''}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── CLINICAL PORTAL ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* SEÇÃO 1 — HEADER DO ALUNO                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div
          className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-5"
          style={{ boxShadow: '0 4px 20px rgba(16,185,129,0.12)' }}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Left — avatar + info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button onClick={handleBack} className="p-1.5 rounded-lg hover:bg-green-100 text-slate-400 transition-colors shrink-0 md:hidden">
                <ChevronLeft size={18} />
              </button>
              <button onClick={handleBack} className="hidden md:block p-1.5 rounded-lg hover:bg-green-100 text-slate-400 transition-colors shrink-0">
                <ChevronLeft size={18} />
              </button>
              <div
                className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-lg font-bold text-slate-700 shrink-0"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                {getInitials(selectedStudent.fullName)}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-medium text-slate-800 truncate">{selectedStudent.fullName}</h2>
                <p className="text-sm text-slate-500 truncate">
                  {selectedStudent.school?.grade ?? ''}{selectedStudent.school?.grade ? ' · ' : ''}
                  {selectedStudent.school?.schoolName ?? ''}{age !== null ? ` · ${age} anos` : ''}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {assessment?.tem_tea && (
                    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-medium px-2.5 py-0.5 rounded-full border border-purple-200">
                      <Brain size={12} /> TEA
                    </span>
                  )}
                  {naeList.length > 0 && (
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-200">
                      <ShieldCheck size={12} /> NAE ativo
                    </span>
                  )}
                  {assessmentOld && (
                    <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-medium px-2.5 py-0.5 rounded-full border border-yellow-200">
                      <AlertTriangle size={12} /> Avaliação pendente
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right — actions */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setShowEvolution(true)}
                className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Plus size={14} /> Nova evolução
              </button>
              <button
                onClick={() => navigate(`/app/nutricion/avaliacao?studentId=${selectedStudent.id}`)}
                className="px-4 py-2.5 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <ClipboardList size={14} /> Avaliação completa
              </button>
            </div>
          </div>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        ) : (
          <>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SEÇÃO 2 — RESUMO (2 colunas)                                */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* ── Col esquerda: Última avaliação ── */}
              <div
                className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <ClipboardList size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-800">Última avaliação</h3>
                    {assessment && (
                      <p className="text-xs text-slate-400">{fmtDate(assessment.assessment_date)}</p>
                    )}
                  </div>
                </div>

                {!assessment ? (
                  <div className="text-center py-8">
                    <ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-semibold text-slate-500 text-sm">Nenhuma avaliação registrada</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Inicie a primeira avaliação nutricional deste aluno</p>
                    <button
                      onClick={() => navigate(`/app/nutricion/avaliacao?studentId=${selectedStudent.id}`)}
                      className="px-5 py-2.5 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Iniciar primeira avaliação
                    </button>
                  </div>
                ) : (
                  <>
                    {/* IMC card */}
                    {imc !== null && (
                      <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Scale size={16} className="text-blue-500" />
                            <span className="text-xs font-semibold text-slate-500">IMC</span>
                          </div>
                          <span className="text-2xl font-black text-slate-800">{imc}</span>
                        </div>
                        <div className="relative">
                          <div className="flex h-2.5 rounded-full overflow-hidden">
                            <div style={{ width: '15%', backgroundColor: '#3B82F6' }} />
                            <div style={{ width: '25%', backgroundColor: '#10B981' }} />
                            <div style={{ width: '20%', backgroundColor: '#F59E0B' }} />
                            <div style={{ width: '20%', backgroundColor: '#F97316' }} />
                            <div style={{ width: '20%', backgroundColor: '#EF4444' }} />
                          </div>
                          <div
                            className="absolute top-[-2px] transition-all duration-500"
                            style={{ left: `${getIMCPosition(imc)}%`, transform: 'translateX(-50%)' }}
                          >
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-white shadow" />
                          </div>
                        </div>
                        {imcClass && (
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${IMC_COLOR[imcClass] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            <CheckCircle size={12} />
                            {imcClass}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Mini-cards 2x2 */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className={`rounded-xl p-3 ${SELETIVIDADE_COLOR[assessment.seletividade_alimentar ?? ''] ?? 'bg-gray-50 text-gray-600'}`}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">Seletividade</p>
                        <p className="text-sm font-bold mt-0.5">{assessment.seletividade_alimentar ?? '—'}</p>
                      </div>
                      <div className={`rounded-xl p-3 ${assessment.sono_classificacao === 'ADEQUADO' ? 'bg-green-50 text-green-700' : assessment.sono_classificacao === 'INADEQUADO' ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-600'}`}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">Sono</p>
                        <p className="text-sm font-bold mt-0.5">{assessment.sono_classificacao ?? '—'}</p>
                      </div>
                      <div className={`rounded-xl p-3 ${EBIA_BADGE[assessment.classificacao_ebia ?? ''] ?? 'bg-gray-50 text-gray-600'}`} style={{ border: 'none' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">EBIA</p>
                        <p className="text-sm font-bold mt-0.5">{assessment.classificacao_ebia ?? '—'}</p>
                      </div>
                      <div className="rounded-xl p-3 bg-blue-50 text-blue-700">
                        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">PNAE</p>
                        <p className="text-sm font-bold mt-0.5">{assessment.consome_pnae ?? '—'}</p>
                      </div>
                    </div>

                    {/* Condutas */}
                    {(assessment.condutas ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {(assessment.condutas as string[]).map((c) => (
                          <span key={c} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-lg border border-blue-100">
                            <Check size={10} /> {c}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => navigate(`/app/nutricion/avaliacao?id=${assessment.id}`)}
                      className="w-full text-center text-sm font-semibold text-blue-600 hover:text-blue-700 py-2 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                    >
                      Ver avaliação completa <ChevronRight size={14} />
                    </button>
                  </>
                )}
              </div>

              {/* ── Col direita: NAE e alertas ── */}
              <div
                className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                    <ShieldCheck size={16} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">NAE e alertas</h3>
                </div>

                {naeList.length === 0 ? (
                  <div className="text-center py-8">
                    <ShieldCheck size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-semibold text-slate-500 text-sm">Sem NAE cadastrado</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Este aluno não possui necessidade alimentar especial ativa</p>
                    <button
                      onClick={() => navigate('/app/nutricion/nae')}
                      className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Cadastrar NAE
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2.5">
                      {naeList.map((nae) => {
                        const laudoValid = nae.laudo_validade ? new Date(nae.laudo_validade) > new Date() : false;
                        return (
                          <div key={nae.id} className="rounded-xl border border-gray-100 p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-800">{nae.tipo}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                nae.gravidade === 'GRAVE' ? 'bg-red-100 text-red-700' :
                                nae.gravidade === 'MODERADA' ? 'bg-orange-100 text-orange-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {nae.gravidade}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {nae.laudo_presente ? (
                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                                  laudoValid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                  {laudoValid ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                                  {laudoValid ? `Laudo válido até ${fmtDate(nae.laudo_validade)}` : 'Laudo vencido'}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">Sem laudo anexado</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => navigate('/app/nutricion/nae')}
                      className="w-full text-center text-sm font-semibold text-green-600 hover:text-green-700 py-2 rounded-xl hover:bg-green-50 transition-colors flex items-center justify-center gap-1"
                    >
                      Gerenciar NAE <ChevronRight size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SEÇÃO 3 — TIMELINE DE EVOLUÇÕES                             */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <div
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <Activity size={16} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Histórico de atendimentos</h3>
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {evolutions.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowEvolution(true)}
                  className="px-3.5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Plus size={12} /> Nova evolução
                </button>
              </div>

              {evolutions.length === 0 ? (
                <div className="text-center py-12 px-5">
                  <Activity size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="font-semibold text-slate-500 text-sm">Nenhum retorno registrado</p>
                  <p className="text-xs text-slate-400 mt-1">Registre a primeira evolução nutricional</p>
                </div>
              ) : (
                <div className="px-5 pb-5 space-y-0">
                  {evolutions.map((evo, idx) => (
                    <div key={evo.id} className="flex gap-4 py-4 border-t border-gray-50 first:border-t-0">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-slate-500'
                        }`}>
                          {fmtDate(evo.data_retorno).slice(0, 5)}
                        </div>
                        {idx < evolutions.length - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-100 mt-1" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-400">{fmtDate(evo.data_retorno)}</p>
                        </div>

                        {/* Scores — hidden on mobile */}
                        <div className="hidden sm:grid sm:grid-cols-1 gap-1">
                          <ScoreBar label="Aceitação" value={evo.aceitacao_alimentar} />
                          <ScoreBar label="Frutas" value={evo.consumo_frutas_score} />
                          <ScoreBar label="Verduras" value={evo.consumo_verduras_score} />
                          <ScoreBar label="Hidratação" value={evo.hidratacao_score} />
                          <ScoreBar label="PNAE" value={evo.participacao_pnae_score} />
                        </div>

                        {/* Mobile: compact summary */}
                        <div className="sm:hidden flex gap-2 flex-wrap">
                          {[
                            { l: 'Aceitação', v: evo.aceitacao_alimentar },
                            { l: 'Frutas', v: evo.consumo_frutas_score },
                            { l: 'Verduras', v: evo.consumo_verduras_score },
                            { l: 'Hidrat.', v: evo.hidratacao_score },
                            { l: 'PNAE', v: evo.participacao_pnae_score },
                          ].map(({ l, v }) => {
                            const val = v ?? 0;
                            const color = val <= 3 ? 'text-red-600' : val <= 6 ? 'text-amber-600' : 'text-green-600';
                            return (
                              <span key={l} className="text-[10px] text-slate-500">
                                {l}: <span className={`font-bold ${color}`}>{val}</span>
                              </span>
                            );
                          })}
                        </div>

                        {evo.orientacoes_realizadas && (
                          <p className="text-xs text-slate-500 line-clamp-2">{evo.orientacoes_realizadas}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SEÇÃO 4 — AÇÕES RÁPIDAS                                     */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: 'Avaliação completa',
                  sub: 'Anamnese de 12 seções',
                  icon: <ClipboardList size={20} />,
                  color: 'from-orange-50 to-amber-50 border-orange-200 hover:border-orange-300',
                  iconBg: 'bg-orange-100 text-orange-600',
                  shadow: 'rgba(249,115,22,0.08)',
                  onClick: () => navigate(`/app/nutricion/avaliacao?studentId=${selectedStudent.id}`),
                },
                {
                  label: 'Nova evolução',
                  sub: 'Registrar retorno',
                  icon: <Activity size={20} />,
                  color: 'from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300',
                  iconBg: 'bg-blue-100 text-blue-600',
                  shadow: 'rgba(59,130,246,0.08)',
                  onClick: () => setShowEvolution(true),
                },
                {
                  label: 'Relatórios',
                  sub: 'Gerar PDFs',
                  icon: <FileText size={20} />,
                  color: 'from-slate-50 to-gray-50 border-gray-200 hover:border-gray-300',
                  iconBg: 'bg-gray-100 text-slate-600',
                  shadow: 'rgba(0,0,0,0.04)',
                  onClick: () => navigate('/app/nutricion/relatorios'),
                },
                {
                  label: 'Módulo NAE',
                  sub: 'Necessidades especiais',
                  icon: <ShieldCheck size={20} />,
                  color: 'from-green-50 to-emerald-50 border-green-200 hover:border-green-300',
                  iconBg: 'bg-green-100 text-green-600',
                  shadow: 'rgba(16,185,129,0.08)',
                  onClick: () => navigate('/app/nutricion/nae'),
                },
              ].map(({ label, sub, icon, color, iconBg, shadow, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className={`bg-gradient-to-br ${color} rounded-2xl border p-4 text-left transition-all hover:shadow-lg group`}
                  style={{ boxShadow: `0 2px 12px ${shadow}` }}
                >
                  <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                    {icon}
                  </div>
                  <p className="text-sm font-bold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </button>
              ))}
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SEÇÃO 5 — ENCERRAMENTO                                      */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <div
              className="bg-white rounded-2xl border border-gray-200 p-5"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <CheckCircle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-800">Encerramento do acompanhamento</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Gerar relatório final e oficializar a alta nutricional</p>
                  <p className="text-xs text-slate-500 mt-3">
                    Ao encerrar, será gerado o relatório final com todo o histórico de avaliações e evoluções do aluno.
                  </p>
                  <button
                    onClick={() => setConfirmDischarge(true)}
                    className="mt-4 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm inline-flex items-center gap-1.5"
                  >
                    <Download size={14} /> Gerar relatório final e encerrar
                  </button>
                </div>
              </div>
            </div>

            {/* ── Modal de confirmação ── */}
            {confirmDischarge && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                onClick={(e) => { if (e.target === e.currentTarget) setConfirmDischarge(false); }}
              >
                <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <CheckCircle size={20} />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">Confirmar encerramento</h3>
                  </div>
                  <p className="text-sm text-slate-500">
                    Tem certeza que deseja encerrar o acompanhamento nutricional de <strong>{selectedStudent.fullName}</strong>?
                    O relatório final será gerado automaticamente.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmDischarge(false)}
                      className="flex-1 py-2.5 bg-gray-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDischarge(false);
                        navigate(`/app/nutricion/relatorios?studentId=${selectedStudent.id}&type=final`);
                      }}
                      className="flex-[2] py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <Download size={14} /> Confirmar e gerar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Evolution Modal ── */}
      <NutritionEvolutionModal
        isOpen={showEvolution}
        onClose={() => setShowEvolution(false)}
        studentId={selectedStudent.id}
        studentName={selectedStudent.fullName}
        assessmentId={assessment?.id}
        onSaved={() => loadClinicalData(selectedStudent.id)}
      />

      {/* ── Cadastro Rápido Modal ── */}
      <CadastroRapidoModal
        isOpen={showCadastroRapido}
        onClose={() => setShowCadastroRapido(false)}
        currentUserId={currentUser.id}
        currentUserName={currentUser.name}
        currentUserRole={currentUser.role}
        currentUserSpecialty={currentUser.specialty}
        onCreated={() => { SupabaseService.getStudentsForUser(currentUser).then(setStudents).catch(() => {}); }}
      />
    </div>
  );
};

export default NutritionClinicalPortal;
