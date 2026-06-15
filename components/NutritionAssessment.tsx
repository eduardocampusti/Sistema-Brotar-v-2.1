import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Check, AlertCircle, AlertTriangle,
  Scale, Sparkles, Save, CheckCircle, Upload, Clock,
  User, Users, Heart, FileText, BarChart2, ClipboardList,
  Info, Shield, Activity, Monitor, Thermometer, Repeat,
  Calendar, Ruler,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseService } from '../services/SupabaseService';
import { GeminiService } from '../services/geminiService';
import type { NutritionAssessment as NAssessment, Student } from '../types';

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
  Magreza: 'bg-blue-50 text-blue-800 border-blue-200',
  Eutrofia: 'bg-green-50 text-green-800 border-green-200',
  Sobrepeso: 'bg-amber-50 text-amber-800 border-amber-200',
  Obesidade: 'bg-orange-50 text-orange-800 border-orange-200',
  'Obesidade grave': 'bg-red-50 text-red-800 border-red-200',
};

function calcEBIA(data: Partial<NAssessment>): string {
  const count = [
    data.dificuldade_aquisicao_alimentos,
    data.recebe_beneficio_social,
    data.faltou_alimento_em_casa,
    data.crianca_deixa_refeicoes,
  ].filter(Boolean).length;
  if (count === 0) return 'Segurança alimentar';
  if (count === 1) return 'Insegurança leve';
  if (count === 2) return 'Insegurança moderada';
  return 'Insegurança grave';
}

function classifySono(data: Partial<NAssessment>): string {
  if (
    data.sono_qualidade !== 'Dorme bem' ||
    data.sono_acorda_noite === 'Frequentemente'
  ) {
    return 'INADEQUADO';
  }
  return 'ADEQUADO';
}

function getIMCPosition(imc: number): number {
  if (imc <= 15) return 2;
  if (imc <= 17) return 5 + ((imc - 15) / 2) * 10;
  if (imc <= 18.5) return 15 + ((imc - 17) / 1.5) * 10;
  if (imc <= 25) return 25 + ((imc - 18.5) / 6.5) * 25;
  if (imc <= 30) return 50 + ((imc - 25) / 5) * 20;
  if (imc <= 35) return 70 + ((imc - 30) / 5) * 15;
  return Math.min(98, 85 + ((imc - 35) / 10) * 13);
}

// ─── SCROLLSPY SECTIONS ───────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'sec-identificacao', label: 'Identificação' },
  { id: 'sec-familia', label: 'Família' },
  { id: 'sec-antropometria', label: 'Antropometria' },
  { id: 'sec-saude', label: 'Saúde' },
  { id: 'sec-sono', label: 'Sono' },
  { id: 'sec-habitos', label: 'Hábitos' },
  { id: 'sec-comportamento', label: 'Comportamento' },
  { id: 'sec-pnae', label: 'PNAE' },
  { id: 'sec-vida', label: 'Estilo de vida' },
  { id: 'sec-seguranca', label: 'Seg. alimentar' },
  { id: 'sec-tea', label: 'Perfil TEA' },
  { id: 'sec-conduta', label: 'Conduta' },
];

// ─── PREMIUM UI PRIMITIVES ────────────────────────────────────────────────────

const SectionCard: React.FC<{
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  highlight?: boolean;
}> = ({ title, icon, subtitle, children, highlight }) => (
  <div
    className={`bg-white rounded-2xl border p-5 space-y-4 ${highlight ? 'border-blue-200' : 'border-gray-100'}`}
    style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
  >
    <div className="flex items-center gap-2.5">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const SegBtn: React.FC<{
  options: string[];
  value?: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(opt)}
        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2 flex items-center gap-1.5 ${
          value === opt
            ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
            : 'bg-white text-slate-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
        }`}
      >
        {value === opt && <Check size={14} />}
        {opt}
      </button>
    ))}
  </div>
);

const Toggle: React.FC<{
  value?: boolean;
  onChange: (v: boolean) => void;
  labelOn?: string;
  labelOff?: string;
}> = ({ value, onChange, labelOn = 'Sim', labelOff = 'Não' }) => (
  <div className="flex gap-2">
    <button
      type="button"
      onClick={() => onChange(true)}
      className={`px-6 py-2.5 rounded-xl text-sm font-bold border-2 transition-all flex items-center gap-1.5 ${
        value === true
          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
          : 'bg-white text-slate-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
      }`}
    >
      {value === true && <Check size={14} />}
      {labelOn}
    </button>
    <button
      type="button"
      onClick={() => onChange(false)}
      className={`px-6 py-2.5 rounded-xl text-sm font-bold border-2 transition-all flex items-center gap-1.5 ${
        value === false
          ? 'bg-red-400 text-white border-red-400 shadow-sm'
          : 'bg-white text-slate-600 border-gray-200 hover:border-red-300 hover:bg-red-50'
      }`}
    >
      {value === false && <Check size={14} />}
      {labelOff}
    </button>
  </div>
);

const Pills: React.FC<{
  options: string[];
  value?: string[];
  onChange: (v: string[]) => void;
}> = ({ options, value = [], onChange }) => {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all flex items-center gap-1.5 ${
            value.includes(opt)
              ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
              : 'bg-white text-slate-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
          }`}
        >
          {value.includes(opt) && <Check size={14} />}
          {opt}
        </button>
      ))}
    </div>
  );
};

const FieldGroup: React.FC<{ label: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div className="space-y-2">
    <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
      {icon && <span className="text-slate-400">{icon}</span>}
      {label}
    </p>
    {children}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full h-11 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 px-4 text-sm font-medium outline-none transition ${props.className ?? ''}`}
  />
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ rows = 3, ...props }) => (
  <textarea
    rows={rows}
    {...props}
    className={`w-full rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 px-4 py-3 text-sm font-medium outline-none resize-none transition ${props.className ?? ''}`}
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { options: string[] }> = ({
  options,
  ...props
}) => (
  <select
    {...props}
    className={`w-full h-11 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 px-4 text-sm font-medium outline-none transition bg-white ${props.className ?? ''}`}
  >
    <option value="">Selecione…</option>
    {options.map((o) => (
      <option key={o} value={o}>{o}</option>
    ))}
  </select>
);

const Banner: React.FC<{ color: 'blue' | 'orange' | 'purple' | 'yellow' | 'gray'; icon?: React.ReactNode; children: React.ReactNode }> = ({
  color, icon, children,
}) => {
  const cls = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-600',
  }[color];
  return (
    <div className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold flex items-start gap-3 ${cls}`}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <span>{children}</span>
    </div>
  );
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CONDICOES_OPTIONS = [
  'Diabetes', 'Hipertensão', 'Obesidade', 'Desnutrição', 'Anemia',
  'Dislipidemia', 'Doença celíaca', 'Intolerância à lactose',
  'Alergia alimentar', 'TEA', 'TDAH', 'Outra',
];

const FREQ_OPTIONS = ['Nunca', 'Raramente', '1-2x/semana', '3-4x/semana', 'Diário'];

const EBIA_BADGE: Record<string, string> = {
  'Segurança alimentar': 'bg-green-50 text-green-800 border-green-200',
  'Insegurança leve': 'bg-yellow-50 text-yellow-800 border-yellow-200',
  'Insegurança moderada': 'bg-orange-50 text-orange-800 border-orange-200',
  'Insegurança grave': 'bg-red-50 text-red-800 border-red-200',
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const NutritionAssessmentPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const studentIdParam = searchParams.get('studentId') ?? undefined;
  const assessmentIdParam = searchParams.get('id') ?? undefined;

  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [assessmentId, setAssessmentId] = useState<string | null>(assessmentIdParam ?? null);
  const [formData, setFormData] = useState<Partial<NAssessment>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstSave = useRef(true);

  const handleChange = useCallback((delta: Partial<NAssessment>) => {
    setFormData((prev) => ({ ...prev, ...delta }));
  }, []);

  // Carregar student
  useEffect(() => {
    if (studentIdParam) {
      SupabaseService.getStudentById?.(studentIdParam)
        .then((s) => { if (s) setStudent(s); })
        .catch(() => {});
    }
  }, [studentIdParam]);

  // Carregar assessment existente
  useEffect(() => {
    if (assessmentIdParam) {
      SupabaseService.getNutritionAssessmentById(assessmentIdParam).then((a) => {
        if (a) {
          setFormData(a);
          isFirstSave.current = false;
        }
      }).catch(() => {});
    }
  }, [assessmentIdParam]);

  // IntersectionObserver — scrollspy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // calcIMC -> imc_classificacao
  useEffect(() => {
    const imc = calcIMC(formData.peso_kg ?? 0, formData.altura_m ?? 0);
    if (imc !== null) {
      const cls = classifyIMC(imc);
      if (cls !== formData.imc_classificacao) {
        handleChange({ imc_classificacao: cls });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.peso_kg, formData.altura_m]);

  // classifySono -> sono_classificacao
  useEffect(() => {
    const cls = classifySono(formData);
    if (cls !== formData.sono_classificacao) {
      handleChange({ sono_classificacao: cls });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.sono_qualidade, formData.sono_acorda_noite]);

  // calcEBIA -> classificacao_ebia
  useEffect(() => {
    const cls = calcEBIA(formData);
    if (cls !== formData.classificacao_ebia) {
      handleChange({ classificacao_ebia: cls });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.dificuldade_aquisicao_alimentos,
    formData.recebe_beneficio_social,
    formData.faltou_alimento_em_casa,
    formData.crianca_deixa_refeicoes,
  ]);

  // Auto-save com debounce 2s
  useEffect(() => {
    if (!user?.id) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (isSaving) return;
      try {
        if (isFirstSave.current || !assessmentId) {
          const payload: Partial<NAssessment> = {
            ...formData,
            professional_id: user.id,
            student_id: studentIdParam ?? formData.student_id,
            status: 'RASCUNHO',
          };
          if (!payload.student_id) return;
          setIsSaving(true);
          const created = await SupabaseService.createNutritionAssessment(payload);
          setAssessmentId(created.id);
          isFirstSave.current = false;
        } else {
          setIsSaving(true);
          await SupabaseService.updateNutritionAssessment(assessmentId, formData);
        }
      } catch {
        // silenciar auto-save errors
      } finally {
        setIsSaving(false);
      }
    }, 2000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  const handleFinalize = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const finalData: Partial<NAssessment> = {
        ...formData,
        status: 'FINALIZADA',
        professional_id: user.id,
        student_id: studentIdParam ?? formData.student_id,
      };
      if (assessmentId) {
        await SupabaseService.updateNutritionAssessment(assessmentId, finalData);
      } else if (finalData.student_id) {
        await SupabaseService.createNutritionAssessment(finalData);
      }
      if (formData.peso_kg && formData.altura_m && (studentIdParam ?? formData.student_id)) {
        await SupabaseService.addAnthropometryRecord({
          student_id: studentIdParam ?? formData.student_id!,
          professional_id: user.id,
          peso_kg: formData.peso_kg,
          altura_m: formData.altura_m,
          imc_classificacao: formData.imc_classificacao,
          circunferencia_cintura_cm: formData.circunferencia_cintura_cm,
          circunferencia_braco_cm: formData.circunferencia_braco_cm,
        });
      }
      navigate('/app/nutricion/dashboard');
    } catch {
      // erro silenciado
    } finally {
      setIsSaving(false);
    }
  };

  const handleGemini = async () => {
    if (!student) return;
    setGeminiLoading(true);
    try {
      const prompt = [
        `Aluno: ${student.nome_completo}`,
        `IMC: ${(formData as any).imc ?? 'N/D'} — ${formData.imc_classificacao ?? ''}`,
        `Diagnóstico nutricional: ${formData.diagnostico_nutricional ?? 'N/D'}`,
        `Condições de saúde: ${(formData.condicoes_saude ?? []).join(', ') || 'Nenhuma'}`,
        `TEA: ${formData.tem_tea ? 'Sim' : 'Não'}`,
        `EBIA: ${formData.classificacao_ebia ?? 'N/D'}`,
        `Sono: ${formData.sono_classificacao ?? 'N/D'}`,
        `Atividade física: ${formData.pratica_atividade_fisica ? `Sim — ${formData.atividade_fisica_tipo ?? ''}` : 'Não'}`,
        `Condutas selecionadas: ${(formData.condutas ?? []).join(', ') || 'Nenhuma'}`,
        '',
        'Gere orientações nutricionais objetivas e práticas para a família deste aluno, considerando o contexto escolar e as políticas do PNAE.',
      ].join('\n');
      const result = await GeminiService.generateOfficialDocument(
        'orientacao_nutricional', student, 'Nutricionista', 'SPECIALIST', prompt,
      );
      handleChange({ gemini_orientacao: result });
    } catch {
      // silenciar — usuário pode digitar manualmente
    } finally {
      setGeminiLoading(false);
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isSectionFilled = (id: string): boolean => {
    switch (id) {
      case 'sec-identificacao': return !!(formData.turma || formData.turno);
      case 'sec-familia': return (formData.historico_familiar ?? []).length > 0;
      case 'sec-antropometria': return !!(formData.peso_kg && formData.altura_m);
      case 'sec-saude': return (formData.condicoes_saude ?? []).length > 0;
      case 'sec-sono': return !!formData.sono_qualidade;
      case 'sec-habitos': return !!(formData.r24h_cafe || formData.r24h_almoco);
      case 'sec-comportamento': return !!formData.come_sozinho;
      case 'sec-pnae': return !!formData.consome_pnae;
      case 'sec-vida': return formData.pratica_atividade_fisica !== undefined;
      case 'sec-seguranca': return formData.dificuldade_aquisicao_alimentos !== undefined;
      case 'sec-tea': return !formData.tem_tea || (formData.tea_texturas_aceitas ?? []).length > 0;
      case 'sec-conduta': return !!formData.diagnostico_nutricional;
      default: return false;
    }
  };

  const handleCondicoes = (v: string[]) => {
    handleChange({ condicoes_saude: v, tem_tea: v.includes('TEA') });
  };

  // Computed
  const currentIMC = calcIMC(formData.peso_kg ?? 0, formData.altura_m ?? 0);
  const currentIMCClass = classifyIMC(currentIMC);
  const filledCount = SECTIONS.filter(({ id }) => isSectionFilled(id)).length;
  const progressPercent = Math.round((filledCount / SECTIONS.length) * 100);

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ═══ MOBILE — header + circle nav ═══ */}
      <div className="md:hidden sticky top-0 z-30 bg-white shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
          <button onClick={() => navigate('/app/nutricion/dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100 text-slate-400">
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 truncate">{student?.nome_completo ?? 'Avaliação nutricional'}</p>
          </div>
          {isSaving && (
            <div className="flex items-center gap-1 text-[10px] text-blue-500 font-semibold bg-blue-50 px-2 py-0.5 rounded">
              <Save size={10} className="animate-pulse" /> Salvando
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <div className="flex items-center gap-1.5 px-3 py-2 min-w-max">
            {SECTIONS.map((sec, i) => {
              const isAct = activeSection === sec.id;
              const filled = isSectionFilled(sec.id);
              return (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                    isAct
                      ? 'bg-blue-500 text-white shadow-sm'
                      : filled
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-gray-100 text-slate-400'
                  }`}
                >
                  {filled && !isAct ? <Check size={10} /> : i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ LAYOUT PRINCIPAL ═══ */}
      <div className="max-w-5xl mx-auto flex">

        {/* ═══ SIDEBAR FIXA — desktop ═══ */}
        <nav className="hidden md:flex flex-col w-[220px] shrink-0 sticky top-0 h-screen overflow-y-auto bg-white border-r border-gray-100 py-4">

          {/* Voltar */}
          <div className="px-4 pb-2 flex items-center gap-2">
            <button onClick={() => navigate('/app/nutricion/dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100 text-slate-400 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avaliação</span>
            {isSaving && (
              <div className="ml-auto flex items-center gap-1 text-[10px] text-blue-500 font-semibold">
                <Save size={10} className="animate-pulse" />
              </div>
            )}
          </div>

          {/* Aluno */}
          <div className="px-4 pb-3 border-b border-gray-100 mb-3">
            <p className="text-sm font-medium text-slate-800 truncate">{student?.nome_completo ?? '—'}</p>
            <p className="text-xs text-slate-400 truncate">{(student as any)?.schools?.name ?? ''}</p>
          </div>

          {/* Barra de progresso */}
          <div className="px-4 mb-3">
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 text-right">{progressPercent}%</p>
          </div>

          {/* Links das seções */}
          {SECTIONS.map((sec, i) => {
            const isAct = activeSection === sec.id;
            const filled = isSectionFilled(sec.id);
            return (
              <React.Fragment key={sec.id}>
                {i === 10 && <div className="mx-4 my-1.5 border-t border-gray-100" />}
                <button
                  onClick={() => scrollToSection(sec.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[12px] border-l-2 transition-all ${
                    isAct
                      ? 'bg-blue-50 text-blue-700 border-blue-500 font-medium'
                      : filled
                      ? 'text-green-700 border-transparent hover:bg-gray-50'
                      : 'text-slate-500 border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-medium ${
                    isAct
                      ? 'bg-blue-500 text-white'
                      : filled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-slate-400'
                  }`}>
                    {filled && !isAct ? <Check size={11} /> : i + 1}
                  </div>
                  {sec.label}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* ═══ CONTEÚDO SCROLLÁVEL ═══ */}
        <main className="flex-1 p-4 md:p-6 space-y-5 min-w-0">

          {/* ── 1. IDENTIFICAÇÃO ── */}
          <div id="sec-identificacao" className="scroll-mt-20 md:scroll-mt-4">
            <SectionCard title="Dados do aluno" icon={<User size={16} />} subtitle="Pré-preenchidos do prontuário">
              <Banner color="blue" icon={<Info size={18} />}>
                Dados pré-preenchidos do prontuário — revise e complemente se necessário.
              </Banner>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="Nome completo" icon={<User size={14} />}>
                  <Input value={student?.nome_completo ?? ''} readOnly className="bg-gray-50 text-gray-500 cursor-not-allowed" />
                </FieldGroup>
                <FieldGroup label="Data de nascimento">
                  <div className="flex gap-2 items-center">
                    <Input value={student?.date_of_birth ?? ''} readOnly className="bg-gray-50 text-gray-500 cursor-not-allowed flex-1" />
                    {student?.date_of_birth && (
                      <span className="shrink-0 text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg">
                        {Math.floor((Date.now() - new Date(student.date_of_birth).getTime()) / 31557600000)} anos
                      </span>
                    )}
                  </div>
                </FieldGroup>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FieldGroup label="Escola">
                  <Input value={(student as any)?.schools?.name ?? ''} readOnly className="bg-gray-50 text-gray-500 cursor-not-allowed" />
                </FieldGroup>
                <FieldGroup label="Turma / Série">
                  <Input value={formData.turma ?? ''} onChange={(e) => handleChange({ turma: e.target.value })} placeholder="Ex: 3º ano B" />
                </FieldGroup>
                <FieldGroup label="Turno">
                  <Select options={['Matutino', 'Vespertino', 'Integral', 'EJA']} value={formData.turno ?? ''} onChange={(e) => handleChange({ turno: e.target.value })} />
                </FieldGroup>
              </div>
            </SectionCard>

            <div className="mt-4">
              <SectionCard title="Responsável" icon={<Users size={16} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldGroup label="Nome do responsável">
                    <Input value={student?.guardian_name ?? ''} readOnly className="bg-gray-50 text-gray-500 cursor-not-allowed" />
                  </FieldGroup>
                  <FieldGroup label="Telefone">
                    <Input value={student?.guardian_phone ?? ''} readOnly className="bg-gray-50 text-gray-500 cursor-not-allowed" />
                  </FieldGroup>
                </div>
                <FieldGroup label="E-mail do responsável">
                  <Input type="email" value={formData.email_responsavel ?? ''} onChange={(e) => handleChange({ email_responsavel: e.target.value })} placeholder="email@exemplo.com" />
                </FieldGroup>
              </SectionCard>
            </div>
          </div>

          {/* ── 2. FAMÍLIA ── */}
          <div id="sec-familia" className="scroll-mt-20 md:scroll-mt-4">
            <SectionCard title="Histórico familiar" icon={<Heart size={16} />} subtitle="Marque condições presentes na família do aluno">
              <Pills
                options={['Obesidade', 'Diabetes', 'Hipertensão', 'Dislipidemia', 'Doença celíaca', 'Intolerância à lactose', 'Alergias alimentares']}
                value={formData.historico_familiar ?? []}
                onChange={(v) => handleChange({ historico_familiar: v })}
              />
              {(formData.historico_familiar ?? []).length > 0 && (
                <p className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg inline-block">
                  {(formData.historico_familiar ?? []).length} condição(ões) marcada(s)
                </p>
              )}
            </SectionCard>
            <div className="mt-4">
              <SectionCard title="Observações" icon={<FileText size={16} />}>
                <Textarea value={formData.historico_familiar_obs ?? ''} onChange={(e) => handleChange({ historico_familiar_obs: e.target.value })} placeholder="Detalhes adicionais sobre o histórico familiar…" />
              </SectionCard>
            </div>
          </div>

          {/* ── 3. ANTROPOMETRIA ── */}
          <div id="sec-antropometria" className="scroll-mt-20 md:scroll-mt-4">
            <SectionCard title="Medidas atuais" icon={<Scale size={16} />} subtitle="Preencha para calcular o IMC automaticamente">
              <div className="grid grid-cols-2 gap-4">
                <FieldGroup label="Peso (kg)" icon={<Scale size={14} />}>
                  <Input type="number" step="0.01" min="0" value={formData.peso_kg ?? ''} onChange={(e) => handleChange({ peso_kg: parseFloat(e.target.value) || undefined })} placeholder="Ex: 32.5" />
                </FieldGroup>
                <FieldGroup label="Altura (m)" icon={<Ruler size={14} />}>
                  <Input type="number" step="0.01" min="0" value={formData.altura_m ?? ''} onChange={(e) => handleChange({ altura_m: parseFloat(e.target.value) || undefined })} placeholder="Ex: 1.42" />
                </FieldGroup>
              </div>
            </SectionCard>

            {currentIMC !== null && (
              <div className="mt-4 bg-white rounded-2xl border-2 border-blue-200 p-5 space-y-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale size={18} className="text-blue-500" />
                    <span className="text-sm font-bold text-slate-700">IMC calculado</span>
                  </div>
                  <span className="text-3xl font-black text-slate-800">{currentIMC}</span>
                </div>
                <div className="relative">
                  <div className="flex h-4 rounded-full overflow-hidden">
                    <div style={{ width: '15%', backgroundColor: '#3B82F6' }} />
                    <div style={{ width: '25%', backgroundColor: '#10B981' }} />
                    <div style={{ width: '20%', backgroundColor: '#F59E0B' }} />
                    <div style={{ width: '20%', backgroundColor: '#F97316' }} />
                    <div style={{ width: '20%', backgroundColor: '#EF4444' }} />
                  </div>
                  <div className="absolute top-[-4px] transition-all duration-500" style={{ left: `${getIMCPosition(currentIMC)}%`, transform: 'translateX(-50%)' }}>
                    <div className="w-3 h-3 rounded-full bg-slate-800 border-2 border-white shadow-md" />
                  </div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-1.5 px-0.5">
                    <span>Magreza</span><span>Eutrofia</span><span>Sobrepeso</span><span>Obesidade</span><span>Ob. grave</span>
                  </div>
                </div>
                {currentIMCClass && (
                  <div className={`inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border ${IMC_COLOR[currentIMCClass] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    <CheckCircle size={14} />
                    {currentIMCClass}{currentIMCClass === 'Eutrofia' && ' — peso adequado'}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <SectionCard title="Circunferências" icon={<Ruler size={16} />}>
                <div className="grid grid-cols-2 gap-4">
                  <FieldGroup label="Cintura (cm)">
                    <Input type="number" step="0.1" value={formData.circunferencia_cintura_cm ?? ''} onChange={(e) => handleChange({ circunferencia_cintura_cm: parseFloat(e.target.value) || undefined })} placeholder="Ex: 58" />
                  </FieldGroup>
                  <FieldGroup label="Braço (cm)">
                    <Input type="number" step="0.1" value={formData.circunferencia_braco_cm ?? ''} onChange={(e) => handleChange({ circunferencia_braco_cm: parseFloat(e.target.value) || undefined })} placeholder="Ex: 22" />
                  </FieldGroup>
                </div>
              </SectionCard>
            </div>
          </div>

          {/* ── 4. SAÚDE ── */}
          <div id="sec-saude" className="scroll-mt-20 md:scroll-mt-4">
            <SectionCard title="Diagnósticos médicos" icon={<Heart size={16} />} subtitle="Marque todas as condições confirmadas">
              <Pills options={CONDICOES_OPTIONS} value={formData.condicoes_saude ?? []} onChange={handleCondicoes} />
            </SectionCard>

            {(formData.condicoes_saude ?? []).includes('TEA') && (
              <div className="mt-4">
                <Banner color="purple" icon={<AlertCircle size={18} />}>
                  🧠 TEA identificado — a seção 11 (Perfil sensorial) foi habilitada.
                </Banner>
              </div>
            )}

            <div className="mt-4">
              <SectionCard title="Medicamentos em uso" icon={<Heart size={16} />}>
                <Textarea value={formData.medicamentos ?? ''} onChange={(e) => handleChange({ medicamentos: e.target.value })} placeholder="Liste os medicamentos, doses e periodicidade (ex: Ritalina 10mg 1x/dia pela manhã)…" />
              </SectionCard>
            </div>

            <div className="mt-4">
              <SectionCard title="Laudos médicos" icon={<Upload size={16} />}>
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center gap-3 text-gray-400 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center"><Upload size={24} /></div>
                  <span className="text-sm font-semibold text-slate-500">Toque para anexar laudo (PDF ou imagem)</span>
                  <span className="text-xs text-slate-400">Funcionalidade disponível em breve</span>
                </div>
              </SectionCard>
            </div>
          </div>

          {/* ── 5. SONO ── */}
          <div id="sec-sono" className="scroll-mt-20 md:scroll-mt-4">
            <SectionCard title="Padrão de sono" icon={<Clock size={16} />} subtitle="Avalie a qualidade do sono do aluno">
              <div className="grid grid-cols-2 gap-4">
                <FieldGroup label="Horário que dorme" icon={<Clock size={14} />}>
                  <Input type="time" value={formData.sono_horario_dorme ?? ''} onChange={(e) => handleChange({ sono_horario_dorme: e.target.value })} />
                </FieldGroup>
                <FieldGroup label="Horário que acorda" icon={<Clock size={14} />}>
                  <Input type="time" value={formData.sono_horario_acorda ?? ''} onChange={(e) => handleChange({ sono_horario_acorda: e.target.value })} />
                </FieldGroup>
              </div>
              <FieldGroup label="Qualidade do sono">
                <SegBtn options={['Dorme bem', 'Irregular', 'Não dorme bem']} value={formData.sono_qualidade} onChange={(v) => handleChange({ sono_qualidade: v })} />
              </FieldGroup>
              <FieldGroup label="Ronca?">
                <Toggle value={formData.sono_ronca} onChange={(v) => handleChange({ sono_ronca: v })} />
              </FieldGroup>
              <FieldGroup label="Acorda à noite?">
                <SegBtn options={['Frequentemente', 'Às vezes', 'Não']} value={formData.sono_acorda_noite} onChange={(v) => handleChange({ sono_acorda_noite: v })} />
              </FieldGroup>
            </SectionCard>
            {formData.sono_classificacao === 'INADEQUADO' && (
              <div className="mt-4">
                <Banner color="orange" icon={<AlertTriangle size={18} />}>
                  Padrão de sono inadequado — pode impactar peso, comportamento alimentar e desempenho escolar.
                </Banner>
              </div>
            )}
          </div>

          {/* ── 6. HÁBITOS ── */}
          <div id="sec-habitos" className="scroll-mt-20 md:scroll-mt-4">
            <SectionCard title="Recordatório 24h" icon={<Clock size={16} />} subtitle="O que o aluno comeu ontem?">
              {[
                { label: '☀️ Café da manhã', field: 'r24h_cafe' as keyof NAssessment, placeholder: 'Ex: pão com manteiga, leite com achocolatado' },
                { label: '🍎 Lanche da manhã', field: 'r24h_lanche_manha' as keyof NAssessment, placeholder: 'Ex: fruta, biscoito, suco' },
                { label: '🍽️ Almoço', field: 'r24h_almoco' as keyof NAssessment, placeholder: 'Ex: arroz, feijão, carne, salada' },
                { label: '🏫 Lanche da tarde', field: 'r24h_lanche_tarde' as keyof NAssessment, placeholder: 'Ex: lanche da escola ou levado de casa' },
                { label: '🌙 Jantar / Ceia', field: 'r24h_jantar' as keyof NAssessment, placeholder: 'Ex: sopa, pão, leite' },
              ].map(({ label, field, placeholder }) => (
                <FieldGroup key={field} label={label}>
                  <Textarea rows={2} value={(formData[field] as string) ?? ''} onChange={(e) => handleChange({ [field]: e.target.value })} placeholder={placeholder} />
                </FieldGroup>
              ))}
            </SectionCard>

            <div className="mt-4">
              <SectionCard title="Frequência semanal — Alimentos saudáveis" icon={<BarChart2 size={16} />} subtitle="Com que frequência consome cada grupo">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Frutas', field: 'consumo_frutas' },
                    { label: 'Verduras', field: 'consumo_verduras' },
                    { label: 'Legumes', field: 'consumo_legumes' },
                    { label: 'Feijão', field: 'consumo_feijao' },
                    { label: 'Leite / Derivados', field: 'consumo_leite' },
                  ].map(({ label, field }) => (
                    <FieldGroup key={field} label={label}>
                      <Select options={FREQ_OPTIONS} value={(formData as any)[field] ?? ''} onChange={(e) => handleChange({ [field]: e.target.value })} />
                    </FieldGroup>
                  ))}
                  <FieldGroup label="Água (litros/dia)">
                    <Input type="number" step="0.1" min="0" max="10" value={formData.consumo_agua_litros ?? ''} onChange={(e) => handleChange({ consumo_agua_litros: parseFloat(e.target.value) || undefined })} placeholder="Ex: 1.5" />
                  </FieldGroup>
                </div>
              </SectionCard>
            </div>

            <div className="mt-4">
              <SectionCard title="Frequência semanal — Ultraprocessados" icon={<AlertTriangle size={16} />} subtitle="Alto teor de açúcar, gordura e sódio">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Refrigerante', field: 'consumo_refrigerante' },
                    { label: 'Salgadinho', field: 'consumo_salgadinho' },
                    { label: 'Bolacha recheada', field: 'consumo_bolacha' },
                    { label: 'Fast food', field: 'consumo_fastfood' },
                    { label: 'Doces', field: 'consumo_doces' },
                  ].map(({ label, field }) => (
                    <FieldGroup key={field} label={label}>
                      <Select options={FREQ_OPTIONS} value={(formData as any)[field] ?? ''} onChange={(e) => handleChange({ [field]: e.target.value })} />
                    </FieldGroup>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>

          {/* ── 7. COMPORTAMENTO ── */}
          <div id="sec-comportamento" className="scroll-mt-20 md:scroll-mt-4">
            <SectionCard title="Autonomia alimentar" icon={<User size={16} />}>
              <FieldGroup label="Come sozinho">
                <SegBtn options={['Sim', 'Com ajuda parcial', 'Ajuda total']} value={formData.come_sozinho} onChange={(v) => handleChange({ come_sozinho: v })} />
              </FieldGroup>
              <FieldGroup label="Aceita novos alimentos">
                <SegBtn options={['Sim', 'Às vezes', 'Não']} value={formData.aceita_novos_alimentos} onChange={(v) => handleChange({ aceita_novos_alimentos: v })} />
              </FieldGroup>
            </SectionCard>

            <div className="mt-4">
              <SectionCard title="Dificuldades" icon={<AlertCircle size={16} />}>
                <FieldGroup label="Seletividade alimentar">
                  <SegBtn options={['Ausente', 'Leve', 'Moderada', 'Severa']} value={formData.seletividade_alimentar} onChange={(v) => handleChange({ seletividade_alimentar: v })} />
                </FieldGroup>
                <FieldGroup label="Mastigação">
                  <SegBtn
                    options={['Normal', 'Com dificuldade']}
                    value={formData.dificuldade_mastigacao === true ? 'Com dificuldade' : formData.dificuldade_mastigacao === false ? 'Normal' : undefined}
                    onChange={(v) => handleChange({ dificuldade_mastigacao: v === 'Com dificuldade' })}
                  />
                </FieldGroup>
                <FieldGroup label="Deglutição">
                  <SegBtn
                    options={['Normal', 'Com dificuldade']}
                    value={formData.dificuldade_degluticao === true ? 'Com dificuldade' : formData.dificuldade_degluticao === false ? 'Normal' : undefined}
                    onChange={(v) => handleChange({ dificuldade_degluticao: v === 'Com dificuldade' })}
                  />
                </FieldGroup>
              </SectionCard>
            </div>

            <div className="mt-4">
              <SectionCard title="Avaliação geral" icon={<ClipboardList size={16} />}>
                <FieldGroup label="Comportamento alimentar">
                  <Select options={['Excelente', 'Boa', 'Regular', 'Ruim']} value={formData.avaliacao_comportamento ?? ''} onChange={(e) => handleChange({ avaliacao_comportamento: e.target.value })} />
                </FieldGroup>
              </SectionCard>
            </div>
          </div>

          {/* ── 8. PNAE ── */}
          <div id="sec-pnae" className="scroll-mt-20 md:scroll-mt-4">
            {formData.tem_nae && (
              <div className="mb-4">
                <Banner color="orange" icon={<AlertTriangle size={18} />}>
                  Este aluno possui Necessidade Alimentar Especial (NAE) ativa. Verifique o Módulo NAE.
                </Banner>
              </div>
            )}

            <SectionCard title="Alimentação na escola" icon={<ClipboardList size={16} />} subtitle="Consumo do PNAE">
              <FieldGroup label="Frequência de consumo PNAE">
                <SegBtn options={['Sempre', 'Frequentemente', 'Às vezes', 'Nunca']} value={formData.consome_pnae} onChange={(v) => handleChange({ consome_pnae: v })} />
              </FieldGroup>
              {formData.consome_pnae && formData.consome_pnae !== 'Sempre' && (
                <FieldGroup label="Motivo de não consumir sempre">
                  <Select options={['Não gosta', 'Leva lanche de casa', 'Restrição alimentar', 'Falta de apetite', 'Outro']} value={formData.motivo_nao_consome_pnae ?? ''} onChange={(e) => handleChange({ motivo_nao_consome_pnae: e.target.value })} />
                </FieldGroup>
              )}
            </SectionCard>

            <div className="mt-4">
              <SectionCard title="Preferências" icon={<Heart size={16} />}>
                <FieldGroup label="Preparações favoritas na escola">
                  <Textarea value={formData.preparacoes_favoritas ?? ''} onChange={(e) => handleChange({ preparacoes_favoritas: e.target.value })} placeholder="Ex: arroz com feijão, macarronada, suco de laranja…" />
                </FieldGroup>
                <FieldGroup label="Preparações que rejeita">
                  <Textarea value={formData.preparacoes_rejeitadas ?? ''} onChange={(e) => handleChange({ preparacoes_rejeitadas: e.target.value })} placeholder="Ex: sopa, salada, chuchu…" />
                </FieldGroup>
              </SectionCard>
            </div>
          </div>

          {/* ── 9. ESTILO DE VIDA ── */}
          <div id="sec-vida" className="scroll-mt-20 md:scroll-mt-4">
            <SectionCard title="Atividade física" icon={<Activity size={16} />}>
              <FieldGroup label="Pratica atividade física?">
                <Toggle value={formData.pratica_atividade_fisica} onChange={(v) => handleChange({ pratica_atividade_fisica: v })} />
              </FieldGroup>
              {formData.pratica_atividade_fisica && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldGroup label="Qual atividade?">
                    <Input value={formData.atividade_fisica_tipo ?? ''} onChange={(e) => handleChange({ atividade_fisica_tipo: e.target.value })} placeholder="Ex: Futebol, natação, dança…" />
                  </FieldGroup>
                  <FieldGroup label="Frequência">
                    <Select options={['1x/semana', '2-3x/semana', '4+x/semana']} value={formData.atividade_fisica_frequencia ?? ''} onChange={(e) => handleChange({ atividade_fisica_frequencia: e.target.value })} />
                  </FieldGroup>
                </div>
              )}
            </SectionCard>

            <div className="mt-4">
              <SectionCard title="Tempo de tela" icon={<Monitor size={16} />}>
                <FieldGroup label="Tempo diário em telas (TV, tablet, celular)">
                  <SegBtn options={['Menos de 2h', '2 a 4h', 'Mais de 4h']} value={formData.tempo_tela} onChange={(v) => handleChange({ tempo_tela: v })} />
                </FieldGroup>
              </SectionCard>
            </div>
          </div>

          {/* ── 10. SEGURANÇA ALIMENTAR ── */}
          <div id="sec-seguranca" className="scroll-mt-20 md:scroll-mt-4">
            <Banner color="yellow" icon={<Shield size={18} />}>
              As respostas são confidenciais e usadas apenas para avaliação nutricional e políticas públicas de segurança alimentar.
            </Banner>

            <div className="mt-4">
              <SectionCard title="Escala EBIA" icon={<Shield size={16} />} subtitle="Escala Brasileira de Insegurança Alimentar">
                <div className="space-y-4">
                  {[
                    { label: 'Existe dificuldade para aquisição de alimentos?', field: 'dificuldade_aquisicao_alimentos' as keyof NAssessment },
                    { label: 'Recebe benefícios sociais (Bolsa Família / BPC)?', field: 'recebe_beneficio_social' as keyof NAssessment },
                    { label: 'Já faltou alimento em casa?', field: 'faltou_alimento_em_casa' as keyof NAssessment },
                    { label: 'A criança deixa de realizar refeições por falta de alimento?', field: 'crianca_deixa_refeicoes' as keyof NAssessment },
                  ].map(({ label, field }, idx, arr) => (
                    <div key={field}>
                      <FieldGroup label={label}>
                        <Toggle value={formData[field] as boolean | undefined} onChange={(v) => handleChange({ [field]: v })} />
                      </FieldGroup>
                      {idx < arr.length - 1 && <div className="border-b border-gray-100 mt-4" />}
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            {formData.classificacao_ebia && (
              <div className={`mt-4 rounded-2xl border-2 p-5 flex items-center gap-3 ${EBIA_BADGE[formData.classificacao_ebia] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                <Shield size={20} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Classificação EBIA</p>
                  <p className="text-base font-black">{formData.classificacao_ebia}</p>
                </div>
              </div>
            )}
          </div>

          {/* ── 11. PERFIL TEA ── */}
          <div id="sec-tea" className="scroll-mt-20 md:scroll-mt-4">
            {!formData.tem_tea ? (
              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={32} className="text-gray-400" />
                </div>
                <p className="font-bold text-gray-700 text-base mb-2">Esta seção não se aplica a este aluno</p>
                <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">O perfil sensorial TEA é habilitado quando o diagnóstico de TEA está marcado na seção 4.</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors shadow-sm"
                  onClick={() => handleChange({ condicoes_saude: [...(formData.condicoes_saude ?? []), 'TEA'], tem_tea: true })}
                >
                  <Check size={14} />
                  Marcar TEA e habilitar esta seção
                </button>
              </div>
            ) : (
              <>
                <Banner color="purple" icon={<AlertCircle size={18} />}>
                  🧠 Perfil sensorial habilitado — informações essenciais para o plano alimentar escolar.
                </Banner>

                <div className="mt-4">
                  <SectionCard title="Sensibilidade a texturas" icon={<AlertCircle size={16} />}>
                    <Pills
                      options={['Pastosa', 'Mole', 'Crocante', 'Firme', 'Pegajosa', 'Grumosa', 'Líquida']}
                      value={formData.tea_texturas_aceitas ?? []}
                      onChange={(v) => handleChange({ tea_texturas_aceitas: v })}
                    />
                  </SectionCard>
                </div>

                <div className="mt-4">
                  <SectionCard title="Temperatura e neofobia" icon={<Thermometer size={16} />}>
                    <FieldGroup label="Temperatura preferida">
                      <SegBtn options={['Frios', 'Temperatura ambiente', 'Quentes', 'Indiferente']} value={formData.tea_temperatura_preferida} onChange={(v) => handleChange({ tea_temperatura_preferida: v })} />
                    </FieldGroup>
                    <FieldGroup label="Neofobia alimentar">
                      <SegBtn options={['Ausente', 'Leve', 'Moderada', 'Severa']} value={formData.tea_neofobia} onChange={(v) => handleChange({ tea_neofobia: v })} />
                    </FieldGroup>
                  </SectionCard>
                </div>

                <div className="mt-4">
                  <SectionCard title="Rituais alimentares" icon={<Repeat size={16} />}>
                    <Pills
                      options={['Alimentos não podem se tocar', 'Cor específica', 'Utensílio fixo', 'Mesma sequência', 'Local fixo', 'Tempo fixo']}
                      value={formData.tea_rituais ?? []}
                      onChange={(v) => handleChange({ tea_rituais: v })}
                    />
                  </SectionCard>
                </div>

                <div className="mt-4">
                  <SectionCard title="Observações TEA" icon={<FileText size={16} />}>
                    <Textarea value={formData.tea_obs ?? ''} onChange={(e) => handleChange({ tea_obs: e.target.value })} placeholder="Observações adicionais sobre o perfil sensorial…" />
                  </SectionCard>
                </div>
              </>
            )}
          </div>

          {/* ── 12. CONDUTA ── */}
          <div id="sec-conduta" className="scroll-mt-20 md:scroll-mt-4">
            <SectionCard title="Diagnóstico nutricional" icon={<ClipboardList size={16} />}>
              <Select
                options={['Magreza acentuada', 'Magreza', 'Eutrofia', 'Sobrepeso', 'Obesidade', 'Obesidade grave']}
                value={formData.diagnostico_nutricional ?? ''}
                onChange={(e) => handleChange({ diagnostico_nutricional: e.target.value })}
              />
            </SectionCard>

            <div className="mt-4">
              <SectionCard title="Condutas recomendadas" icon={<CheckCircle size={16} />}>
                <Pills
                  options={[
                    'Educação alimentar', 'Orientação à família',
                    'Encaminhamento para unidade de saúde', 'Solicitação de laudo',
                    'Inclusão em dieta especial PNAE', 'Monitoramento antropométrico',
                  ]}
                  value={formData.condutas ?? []}
                  onChange={(v) => handleChange({ condutas: v })}
                />
              </SectionCard>
            </div>

            <div className="mt-4">
              <SectionCard title="Orientações" icon={<FileText size={16} />}>
                <Textarea rows={5} value={formData.orientacoes ?? ''} onChange={(e) => handleChange({ orientacoes: e.target.value })} placeholder="Descreva as orientações nutricionais para o aluno e família…" />
              </SectionCard>
            </div>

            <div className="mt-4">
              <SectionCard title="Próxima avaliação" icon={<Calendar size={16} />}>
                <Input type="date" value={formData.proxima_avaliacao ?? ''} onChange={(e) => handleChange({ proxima_avaliacao: e.target.value })} />
              </SectionCard>
            </div>

            {/* Card Gemini — destaque */}
            <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-blue-800">Gerar orientação com IA</p>
                  <p className="text-xs text-blue-600 mt-0.5">Orientação nutricional personalizada baseada nos dados desta anamnese</p>
                </div>
                <button
                  type="button"
                  onClick={handleGemini}
                  disabled={geminiLoading || !student}
                  className="shrink-0 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {geminiLoading ? 'Gerando…' : 'Gerar'}
                </button>
              </div>
            </div>
            {formData.gemini_orientacao && (
              <div className="mt-4">
                <Textarea rows={5} value={formData.gemini_orientacao} onChange={(e) => handleChange({ gemini_orientacao: e.target.value })} className="bg-blue-50 border-blue-200" />
              </div>
            )}

            {/* Finalizar */}
            <button
              type="button"
              onClick={handleFinalize}
              disabled={isSaving}
              className="mt-6 w-full py-4 bg-[#F97316] hover:bg-orange-600 text-white rounded-2xl font-black text-base transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? <><Clock size={18} className="animate-spin" /> Salvando…</> : <><CheckCircle size={18} /> Finalizar e salvar avaliação</>}
            </button>
          </div>

        </main>
      </div>
    </div>
  );
};

export default NutritionAssessmentPage;
