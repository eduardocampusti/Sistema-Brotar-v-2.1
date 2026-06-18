import { useToast } from '../contexts/ToastContext';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { agendaClinicalDeepLinkPreserveTabRef, useAgendaClinicalDeepLink } from '@/src/hooks/useAgendaClinicalDeepLink';
import { ClipboardList, RefreshCw, Map } from 'lucide-react';

import type { Student, Session, User, PapelTimbradoConfig, School, Appointment } from '../types';
import { Specialty } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { Plus, Search, Calendar, Clock, User as UserIcon, Save, X, FileText, CheckCircle, CheckCircle2, Brain, Activity, Lock, StickyNote, Smile, Meh, Frown, Zap, AlertCircle, Edit2, Trash2, ChevronDown, ChevronUp, ChevronRight, EyeOff, ShieldAlert, History, AlertTriangle, Layout, AlignLeft, TrendingUp, Users, Flag, Heart, MapPin, Home, Briefcase, GraduationCap, DollarSign, Globe, School as SchoolIcon, Printer, BarChart2, PieChart as PieIcon, Layers, Baby, Puzzle, ClipboardCheck, Eye, Volume2, Smartphone, PlusCircle, MessageCircle, Shield, Moon, XCircle, ChevronLeft, BookOpen, Send } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell, CartesianGrid, PieChart, Pie } from 'recharts';
import { PortageCalculator } from './PortageCalculator';
import SearchableSelect from './SearchableSelect';
import {
    PPAnamnesisV3Form,
    buildPPAnamnesisV3PrintHtml,
    createInitialPPAnamnesisV3,
    hasPPAnamnesisV3PartialShape,
    hydratePsychopedagogyAnamnesisV3IfNoPersistedJson,
    looksLikePPAnamnesisV1Plain,
    mergePsychopedagogyAnamnesisV3,
    mergePsychopedagogyAnamnesisV3WithStudentCadastro,
    migratePPAnamnesisV1ToV3,
    migratePPAnamnesisV2ToV3,
} from '@/src/features/psychopedagogy/anamnesisV3';
import type { PPAnamnesisV3 } from '@/src/features/psychopedagogy/anamnesisV3';


const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

const WelcomeHeader = ({ name, subtitle }: { name: string, subtitle?: string }) => (
    <div className="mb-8 animate-fadeIn">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            Olá, <span className="text-purple-600">{name}</span>
        </h1>
        <p className="text-xl text-slate-500 mt-2 font-medium">
            {subtitle || "Gestão Clínica e Acompanhamento Psicológico"}
        </p>
    </div>
);

const ActionCard = ({ title, description, icon: Icon, onClick, colorClass = "bg-purple-50 text-purple-600" }: any) => (
    <button
        onClick={onClick}
        className="flex flex-row items-center gap-4 p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-purple-200 transition-all text-left group w-full h-full"
    >
        <div className={`p-4 rounded-2xl ${colorClass} group-hover:scale-110 transition-transform`}>
            <Icon size={32} />
        </div>
        <div>
            <h3 className="font-bold text-slate-800 text-lg group-hover:text-purple-700 transition-colors">{title}</h3>
            <p className="text-sm text-slate-500 mt-1 leading-snug">{description}</p>
        </div>
    </button>
);

const StatCard = ({ title, value, icon: Icon, gradient, subtext, trend }: any) => (
    <div className={`relative overflow-hidden p-6 rounded-2xl shadow-card border border-white/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group bg-white`}>
        <div className="relative z-10 flex justify-between items-start">
            <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
                <h3 className="text-3xl font-extrabold text-slate-800 mt-2 tracking-tight">{value}</h3>
                {subtext && (
                    <div className="flex items-center gap-1 mt-2">
                        {trend === 'up' && <TrendingUp size={14} className="text-green-500" />}
                        <p className="text-xs font-medium text-slate-400">{subtext}</p>
                    </div>
                )}
            </div>
            <div className={`p-3 rounded-xl shadow-lg text-white bg-gradient-to-br ${gradient}`}>
                <Icon size={20} />
            </div>
        </div>
    </div>
);

// --- COMPONENTE REUTILIZÁVEL: Seleção de Paciente por Escola ---
const StudentPickerBySchool: React.FC<{
  students: Student[];
  accentColor?: string;
  onSelect: (student: Student) => void;
}> = ({ students, accentColor = '#0891b2', onSelect }) => {
  const [search, setSearch] = React.useState('');
  const [schoolFilter, setSchoolFilter] = React.useState('');
  const totalEscolas = new Set(students.map(s => s.school?.schoolName).filter(Boolean)).size;
  const escolas = Array.from(new Set(students.map(s => s.school?.schoolName).filter(Boolean))).sort() as string[];
  const filtered = students.filter(s =>
    (!search || s.fullName.toLowerCase().includes(search.toLowerCase())) &&
    (!schoolFilter || s.school?.schoolName === schoolFilter)
  );
  const bySchool: Record<string, Student[]> = {};
  filtered.forEach(s => {
    const escola = s.school?.schoolName || 'Escola não informada';
    if (!bySchool[escola]) bySchool[escola] = [];
    bySchool[escola].push(s);
  });
  return (
    <div className="p-6 min-h-[400px]">
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{students.length}</p>
          <p className="text-xs text-slate-400 mt-1">meus pacientes</p>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{totalEscolas || '—'}</p>
          <p className="text-xs text-slate-400 mt-1">escolas</p>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{filtered.length}</p>
          <p className="text-xs text-slate-400 mt-1">encontrados</p>
        </div>
      </div>
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input type="text" placeholder="Buscar por nome..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none transition-all" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="rounded-xl border border-slate-200 bg-white text-sm px-3 py-2.5 focus:outline-none min-w-[170px]" value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}>
          <option value="">Todas as escolas</option>
          {escolas.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <UserIcon size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum paciente encontrado</p>
        </div>
      ) : Object.entries(bySchool).map(([escola, alunos]) => (
        <div key={escola} className="mb-5">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-semibold pl-1">{escola} · {alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'}</p>
          <div className="flex flex-col gap-2">
            {alunos.map(s => {
              const initials = s.fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
              const age = s.birthDate ? new Date().getFullYear() - new Date(s.birthDate).getFullYear() : null;
              return (
                <button key={s.id} onClick={() => onSelect(s)} className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 hover:border-slate-300 hover:shadow-sm px-4 py-3 text-left transition-all group w-full">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: accentColor }}>{initials}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{s.fullName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{age ? `${age} anos` : 'Idade não informada'}</p>
                  </div>
                  <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// --- PRIVACY & STORAGE HELPERS FOR PSYCHOLOGY ---
const PSYCH_STORAGE_KEY = 'brotar_psychology_private';

// Helper for age
const calculateAge = (birthDate?: string) => {
    if (!birthDate) return '-';
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return '-';
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

interface PsychSession {
    id: string;
    numero: number;
    dataHoraISO: string;
    duracaoMin: number;
    titulo: string;
    humor: 'feliz' | 'neutro' | 'triste' | 'ansioso' | 'irritado';
    status: 'Realizado' | 'Agendado' | 'Falta' | 'Cancelado';
    resumo: string;
    anotacoes: string;
    indicativoAlta?: boolean;
    motivoAlta?: string;
}

interface PsychFormPrivate {
    comportamentoObservado: {
        estadoEmocional: string;
        contatoVisual: string;
        linguagem: string;
        participacao: string;
        seguirInstrucoes: string;
        socializacao: string;
    };
    triagemPsicologica: {
        comportamentosObservados: string;
        hipotesesIniciais: string;
        necessidadeAvaliacaoAprofundada: string;
        encaminhamentosSugeridos: string;
    };
    planoTerapeutico: {
        objetivoPrincipal: string;
        metasEspecificas: string;
    };
    evolucaoGeral: string;
    encerramento: {
        motivoAlta: string;
        resumoGanhos: string;
        recomendacoesFinais: string;
    };
}

interface PsychFormPublic {
    identificacao: {
        encaminhadoPor: string;
        dataTriagem: string;
        especialistaResponsavel: string;
    };
    motivoEncaminhamento: {
        queixa: string;
        haQuantoTempo: string;
        situacoesIntensidade: string;
    };
    historicoFamiliar: {
        comQuemMora: string;
        relacaoFamiliar: string;
        historicoGeral: string;
    };
    historicoEscolar: {
        desempenho: string;
        dificuldades: string;
        comportamentoSala: string;
        faltas: string;
    };
}

interface PsychPrivateData {
    formData: PsychFormPrivate;
    sessions: PsychSession[];
    statusAtendimento: 'Em acompanhamento' | 'Alta psicológica';
}

const initialPrivateForm: PsychFormPrivate = {
    comportamentoObservado: { estadoEmocional: '', contatoVisual: '', linguagem: '', participacao: '', seguirInstrucoes: '', socializacao: '' },
    triagemPsicologica: { comportamentosObservados: '', hipotesesIniciais: '', necessidadeAvaliacaoAprofundada: '', encaminhamentosSugeridos: '' },
    planoTerapeutico: { objetivoPrincipal: '', metasEspecificas: '' },
    evolucaoGeral: '',
    encerramento: { motivoAlta: '', resumoGanhos: '', recomendacoesFinais: '' }
};

const initialPublicForm: PsychFormPublic = {
    identificacao: { encaminhadoPor: '', dataTriagem: new Date().toISOString().split('T')[0], especialistaResponsavel: '' },
    motivoEncaminhamento: { queixa: '', haQuantoTempo: '', situacoesIntensidade: '' },
    historicoFamiliar: { comQuemMora: '', relacaoFamiliar: '', historicoGeral: '' },
    historicoEscolar: { desempenho: '', dificuldades: '', comportamentoSala: '', faltas: '' }
};

const extractPsychData = (student: Student): PsychPrivateData => {
    const raw = student.clinical.psych_data || {};

    // Merge sessions from history
    const mappedSessions: PsychSession[] = (student.history || []).filter((h: any) => h.specialty === Specialty.PSYCHOLOGY).map((h: any) => ({
        id: h.id,
        numero: 0,
        dataHoraISO: h.date,
        duracaoMin: h.content?.duracaoMin || 50,
        titulo: h.content?.titulo || h.notes || 'Atendimento',
        humor: (h.content?.humor || 'neutro') as any,
        status: (h.content?.status || 'Realizado') as any,
        resumo: h.content?.resumo || h.notes || '',
        anotacoes: h.privateNotes || '',
        indicativoAlta: h.content?.indicativoAlta
    }));

    return {
        formData: raw.formData || initialPrivateForm,
        statusAtendimento: raw.statusAtendimento || 'Em acompanhamento',
        sessions: mappedSessions
    };
};

// --- REUSABLE COMPONENTS ---
const StyledInput = ({ label, value, onChange, type = "text", rows, placeholder, icon: Icon }: any) => (
    <div className="mb-6 group">
        <label className="flex items-center gap-2 text-sm font-bold text-[#333333] uppercase tracking-wider mb-2.5 px-1 group-focus-within:text-[#1E7F85] transition-colors">
            {Icon && <Icon size={14} className="text-[#1E7F85]" />}
            {label}
        </label>
        {rows ? (
            <textarea
                className="w-full rounded-[20px] border-[1.5px] border-[#1E7F85] bg-white p-4 text-[#333333] placeholder:text-slate-300 focus:ring-4 focus:ring-[#1E7F85]/5 focus:border-[#1E7F85] outline-none transition-all min-h-[120px] shadow-sm hover:bg-slate-50/30"
                rows={rows}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />
        ) : (
            <input
                type={type}
                className="w-full h-[52px] rounded-full border-[1.5px] border-[#1E7F85] bg-white px-6 text-[#333333] placeholder:text-slate-300 focus:ring-4 focus:ring-[#1E7F85]/5 focus:border-[#1E7F85] outline-none transition-all shadow-sm hover:bg-slate-50/30"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />
        )}
    </div>
);

const TriStateField: React.FC<{ label: string, value: boolean | null, onChange: (val: boolean | null) => void }> = ({ label, value, onChange }) => (
    <div className="flex flex-col gap-3 p-6 bg-white rounded-[20px] border-[1.5px] border-[#1E7F85] hover:shadow-md transition-all duration-300 h-full group">
        <span className="text-sm font-bold text-[#333333] uppercase tracking-wider w-full text-left ml-1 group-focus-within:text-[#1E7F85]">{label}</span>
        <div className="flex w-full bg-[#F7F5F0] p-1.5 rounded-full border border-[#1E7F85]/20 gap-1.5 mt-auto">
            <button
                type="button"
                onClick={() => onChange(true)}
                className={`flex-1 px-3 py-2.5 text-[10px] font-bold rounded-full transition-all uppercase tracking-widest ${value === true ? 'bg-[#1E7F85] text-white shadow-md scale-[1.02]' : 'bg-transparent text-[#1E7F85] hover:bg-white/80'}`}
            >
                SIM
            </button>
            <button
                type="button"
                onClick={() => onChange(false)}
                className={`flex-1 px-3 py-2.5 text-[10px] font-bold rounded-full transition-all uppercase tracking-widest ${value === false ? 'bg-[#1E7F85] text-white shadow-md scale-[1.02]' : 'bg-transparent text-[#1E7F85] hover:bg-white/80'}`}
            >
                NÃO
            </button>
            <button
                type="button"
                onClick={() => onChange(null)}
                className={`flex-1 px-3 py-2.5 text-[10px] font-bold rounded-full transition-all uppercase tracking-widest ${value === null ? 'bg-[#333333] text-white shadow-sm' : 'bg-transparent text-slate-400 hover:bg-white/80'}`}
            >
                -
            </button>
        </div>
    </div>
);

const FormSection = ({ title, icon: Icon, children, color = "text-slate-800" }: any) => (
    <div className="bg-gradient-to-br from-white to-slate-50/30 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200/60 transition-all hover:shadow-2xl hover:shadow-slate-300/50 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
            {Icon && <Icon size={120} />}
        </div>
        <h4 className={`text-base font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-4 ${color}`}>
            <div className="p-3 bg-white rounded-2xl text-cyan-600 shadow-header border border-slate-100/50 group-hover:scale-110 transition-transform">
                {Icon && <Icon size={22} strokeWidth={2.5} />}
            </div>
            {title}
        </h4>
        <div className="space-y-6 relative z-10">
            {children}
        </div>
    </div>
);





// --- FONOAUDIOLOGIA - TYPES & HELPERS ---
interface SpeechSession {
    id: string;
    date: string;
    objetivo: string;
    atividades: string;
    fonemasTrabalhados: string;
    observacoes: string;
    evolucao: 'Melhora Significativa' | 'Melhora Leve' | 'Estável' | 'Regressão';
    participacao: 'Ativo' | 'Passivo' | 'Recusou';
}

interface SpeechSpeechExam {
    data: string;
    protocolo: string;
    resultado: string;
    observacoes: string;
}

interface SpeechPrivateData {
    anamnese: {
        queixaPrincipal: string;
        historicoDesenvolvimentoLinguagem: string;
        comportamentoAuditivo: string;
        alimentacaoMastigacao: string;
        sonoRespiracao: string;
        historicoEscolar: string;
    };
    avaliacao: {
        motricidadeOrofacial: string;
        linguagemOral: string;
        linguagemEscrita: string;
        voz: string;
        audicao: string;
    };
    sessions: SpeechSession[];
    examsHistory: SpeechSpeechExam[];
    statusAtendimento: 'Em Avaliação' | 'Em Acompanhamento' | 'Alta' | 'Desligado';
}

const initialSpeechData: SpeechPrivateData = {
    anamnese: { queixaPrincipal: '', historicoDesenvolvimentoLinguagem: '', comportamentoAuditivo: '', alimentacaoMastigacao: '', sonoRespiracao: '', historicoEscolar: '' },
    avaliacao: { motricidadeOrofacial: '', linguagemOral: '', linguagemEscrita: '', voz: '', audicao: '' },
    sessions: [],
    examsHistory: [],
    statusAtendimento: 'Em Avaliação'
};

const extractSpeechData = (student: Student): SpeechPrivateData => {
    const raw = student.clinical.st_data || {};
    const mappedSessions: SpeechSession[] = (student.history || [])
        .filter(h => h.specialty === Specialty.SPEECH_THERAPY)
        .map(h => ({
            id: h.id,
            date: h.date,
            objetivo: h.content?.objetivo || h.notes,
            atividades: h.content?.atividades || '',
            fonemasTrabalhados: h.content?.fonemasTrabalhados || '',
            observacoes: h.content?.observacoes || h.notes,
            evolucao: h.content?.evolucao || 'Estável',
            participacao: h.content?.participacao || 'Ativo'
        }));

    return {
        anamnese: { ...initialSpeechData.anamnese, ...(raw.anamnese || {}) },
        avaliacao: { ...initialSpeechData.avaliacao, ...(raw.avaliacao || {}) },
        examsHistory: raw.examsHistory || [],
        statusAtendimento: raw.statusAtendimento || 'Em Avaliação',
        sessions: mappedSessions
    };
};

// --- TERAPIA OCUPACIONAL - TYPES & HELPERS ---
interface OTSession {
    id: string;
    date: string;
    objetivos: string;
    atividades: string;
    recursos: string;
    respostaSensorial: string;
    desempenhoMotor: string;
    nivelIndependencia: 'Independente' | 'Supervisão' | 'Ajuda Mínima' | 'Ajuda Moderada' | 'Ajuda Máxima' | 'Dependente';
    evolucao: 'Melhora Significativa' | 'Leve Melhora' | 'Estável' | 'Regressão';
    observacoes: string;
}

interface OTPrivateData {
    anamnese: {
        historicoOcupacional: string;
        rotinaAVDs: string;
        perfilSensorialPrevia: string;
        brincarDesenvolvimento: string;
        comportamentoSocial: string;
    };
    avaliacao: {
        motricidadeFina: string;
        motricidadeGrossa: string;
        processamentoSensorial: string;
        integracaoVisomotora: string;
        autocuidados: string;
    };
    sessions: OTSession[];
    statusAtendimento: 'Avaliação' | 'Intervenção' | 'Monitoramento' | 'Alta';
}

const initialOTData: OTPrivateData = {
    anamnese: { historicoOcupacional: '', rotinaAVDs: '', perfilSensorialPrevia: '', brincarDesenvolvimento: '', comportamentoSocial: '' },
    avaliacao: { motricidadeFina: '', motricidadeGrossa: '', processamentoSensorial: '', integracaoVisomotora: '', autocuidados: '' },
    sessions: [],
    statusAtendimento: 'Avaliação'
};

const extractOTData = (student: Student): OTPrivateData => {
    const raw = student.clinical.ot_data || {};
    const mappedSessions: OTSession[] = (student.history || [])
        .filter(h => h.specialty === Specialty.OCCUPATIONAL_THERAPY)
        .map(h => ({
            id: h.id,
            date: h.date,
            objetivos: h.content?.objetivos || h.content?.objetivo || h.notes,
            atividades: h.content?.atividades || '',
            recursos: h.content?.recursos || h.content?.recursosUtilizados || '',
            respostaSensorial: h.content?.respostaSensorial || '',
            desempenhoMotor: h.content?.desempenhoMotor || '',
            nivelIndependencia: h.content?.nivelIndependencia || 'Supervisão',
            evolucao: h.content?.evolucao || 'Estável',
            observacoes: h.content?.observacoes || h.notes
        }));

    return {
        anamnese: { ...initialOTData.anamnese, ...(raw.anamnese || {}) },
        avaliacao: { ...initialOTData.avaliacao, ...(raw.avaliacao || {}) },
        statusAtendimento: raw.statusAtendimento || 'Avaliação',
        sessions: mappedSessions
    };
};

// --- FISIOTERAPIA - TYPES & HELPERS ---
interface PhysioSession {
    id: string;
    date: string;
    objetivoAtendimento: string;
    atividadesRealizadas: string;
    respostaMotora: string;
    niveisDorPos: string;
    observacoesClinicas: string;
    evolucao: 'Melhora Significativa' | 'Melhora Leve' | 'Estável' | 'Regressão';
}

interface PhysioPrivateData {
    anamnese: {
        queixaPrincipal: string;
        dataInicioQueixa: string;
        historicoFuncional: string;
        historicoSaude: string;
        diagnosticoInformado: string;
        dispositivosApoio: string;
        cirurgiasPrevias: string;
        dor: {
            existe: string; // 'Sim' | 'Não'
            local: string;
            intensidade: string; // 'Leve' | 'Moderada' | 'Intensa'
        };
        rotinaFuncional: string;
        nivelIndependencia: string;
        dificuldadesLocomocao: string;
        fadigaFrequente: string; // 'Sim' | 'Não'
    };
    avaliacao: {
        gmfcs: string; // 'I' | 'II' | 'III' | 'IV' | 'V' | ''
        postura: { emPe: string; sentada: string; assimetrias: string };
        mobilidade: { adm: string; global: string; coordMotorGrossa: string };
        forcaMuscular: { adequadaIdade: string; deficitFuncional: string };
        equilibrio: { estatico: string; dinamico: string };
        marcha: {
            independente: string;
            comApoio: string;
            cadeiraRodas: string;
            observacoes: string;
        };
        funcionalidadeEscolar: {
            deslocamento: string;
            acessoAmbientes: string;
            permanenciaSala: string;
            participacaoAtividades: string;
        };
    };
    conclusao: {
        limitacoes: string;
        potencialidades: string;
        necessidadeApoioEscolar: string;
        recomendacoes: string;
    };
    sessions: PhysioSession[];
    statusAtendimento: 'Avaliação Funcional' | 'Acompanhamento' | 'Monitoramento' | 'Alta';
}

const initialPhysioData: PhysioPrivateData = {
    anamnese: {
        queixaPrincipal: '', dataInicioQueixa: '', historicoFuncional: '', historicoSaude: '', diagnosticoInformado: '', dispositivosApoio: '', cirurgiasPrevias: '',
        dor: { existe: 'Não', local: '', intensidade: 'Leve' },
        rotinaFuncional: '', nivelIndependencia: '', dificuldadesLocomocao: '', fadigaFrequente: 'Não'
    },
    avaliacao: {
        gmfcs: '',
        postura: { emPe: '', sentada: '', assimetrias: '' },
        mobilidade: { adm: 'Normal', global: '', coordMotorGrossa: '' },
        forcaMuscular: { adequadaIdade: 'Sim', deficitFuncional: '' },
        equilibrio: { estatico: '', dinamico: '' },
        marcha: { independente: 'Sim', comApoio: 'Não', cadeiraRodas: 'Não', observacoes: '' },
        funcionalidadeEscolar: { deslocamento: '', acessoAmbientes: '', permanenciaSala: '', participacaoAtividades: '' }
    },
    conclusao: { limitacoes: '', potencialidades: '', necessidadeApoioEscolar: '', recomendacoes: '' },
    sessions: [],
    statusAtendimento: 'Avaliação Funcional'
};

const extractPhysioData = (student: Student): PhysioPrivateData => {
    const raw = student.clinical.pt_data || {};
    const mappedSessions: PhysioSession[] = (student.history || [])
        .filter(h => h.specialty === Specialty.PHYSIOTHERAPY)
        .map(h => ({
            id: h.id,
            date: h.date,
            objetivoAtendimento: h.content?.objetivoAtendimento || h.notes,
            atividadesRealizadas: h.content?.atividadesRealizadas || '',
            respostaMotora: h.content?.respostaMotora || '',
            niveisDorPos: h.content?.niveisDorPos || '',
            observacoesClinicas: h.content?.observacoesClinicas || h.notes,
            evolucao: h.content?.evolucao || 'Estável'
        }));

    return {
        anamnese: { ...initialPhysioData.anamnese, ...(raw.anamnese || {}) },
        avaliacao: { ...initialPhysioData.avaliacao, ...(raw.avaliacao || {}) },
        conclusao: { ...initialPhysioData.conclusao, ...(raw.conclusao || {}) },
        statusAtendimento: raw.statusAtendimento || 'Avaliação Funcional',
        sessions: mappedSessions
    };
};

// --- UTILITY: CLINICAL PRINT HELPER ---
const generateClinicalPrintHTML = (
    student: Student,
    config: PapelTimbradoConfig,
    title: string,
    contentHTML: string,
    professional: { name: string; jobTitle: string; specialty: string; signatureUrl?: string }
) => {
    const emissionDate = new Date().toLocaleDateString('pt-BR');
    const studentAge = new Date().getFullYear() - new Date(student.birthDate).getFullYear();

    return `
        <html>
            <head>
                <title>${title} - ${student.fullName}</title>
                <style>
                    @page {
                        size: A4;
                        margin: 10mm 15mm;
                    }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        color: #1e293b;
                        line-height: 1.5;
                        font-size: 11pt;
                        margin: 0;
                        padding: 0;
                    }
                    
                    /* Table Structure for Repetition */
                    table { width: 100%; border-collapse: collapse; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                    tbody { display: table-row-group; }
                    
                    /* Header Styling */
                    .print-header {
                        text-align: center;
                        border-bottom: 2px solid #e2e8f0;
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                    }
                    .header-logo {
                        max-width: 100%;
                        height: auto;
                        max-height: 160px; /* Increased to allow banners */
                        object-fit: contain;
                    }
                    .header-titles h1 { font-size: 14pt; margin: 0; color: #334155; text-transform: uppercase; font-weight: 800; }
                    .header-titles h2 { font-size: 12pt; margin: 2px 0; color: #475569; }
                    .header-titles h3 { font-size: 10pt; margin: 2px 0; color: #64748b; }
                    .contact-info { font-size: 8pt; color: #94a3b8; margin-top: 5px; }

                    /* Footer Styling */
                    .print-footer {
                        text-align: center;
                        border-top: 1px dashed #e2e8f0;
                        padding-top: 10px;
                        margin-top: 20px;
                    }
                    .footer-image {
                        max-width: 100%;
                        max-height: 60px;
                        object-fit: contain;
                        opacity: 0.8;
                    }
                    .footer-text { font-size: 8pt; color: #cbd5e1; }
                    .emission-tag { font-size: 8pt; color: #cbd5e1; text-align: right; margin-bottom: 5px; }

                    /* Content Styling */
                    h1.doc-title { font-size: 16pt; color: #1e293b; text-align: center; margin-top: 0; text-transform: uppercase; letter-spacing: 1px; width: 100%; }
                    h2.section-title { font-size: 13pt; color: #475569; margin-top: 20px; margin-bottom: 10px; background-color: #f8fafc; padding: 5px 10px; border-left: 4px solid #cbd5e1; page-break-after: avoid; }
                    
                    .student-info-box {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                        margin-bottom: 20px;
                        padding: 15px;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        background-color: #fff;
                        page-break-inside: avoid;
                    }
                    .info-item { margin-bottom: 5px; }
                    .label { font-weight: bold; color: #64748b; font-size: 9pt; text-transform: uppercase; display: block; }
                    .value { color: #1e293b; font-size: 11pt; }

                    .box {
                        border: 1px solid #e2e8f0;
                        padding: 12px;
                        border-radius: 6px;
                        margin-bottom: 10px;
                        background: #fff;
                        page-break-inside: avoid;
                    }
                    .data-row { margin-bottom: 8px; border-bottom: 1px dotted #f1f5f9; padding-bottom: 4px; }
                    .data-row:last-child { border-bottom: none; }
                    
                    .signature-section {
                        margin-top: 40px;
                        text-align: center;
                        page-break-inside: avoid;
                    }
                    .signature-image { max-height: 80px; margin-bottom: -15px; z-index: 10; position: relative; }
                    .signature-line { width: 300px; border-top: 1px solid #94a3b8; margin: 0 auto 10px; }
                    .professional-name { font-weight: bold; font-size: 11pt; color: #1e293b; }
                    .professional-info { font-size: 9pt; color: #64748b; }
                </style>
            </head>
            <body>
                <table>
                    <thead>
                        <tr>
                            <td>
                                <div class="print-header">
                                    ${config.showLogo && config.logoUrl ? `<img src="${config.logoUrl}" class="header-logo" alt="Logo">` : ''}
                                    <div class="header-titles">
                                        ${config.showTitulos ? `
                                        <h1>${config.tituloLinha1}</h1>
                                        <h2>${config.tituloLinha2}</h2>
                                        <h3>${config.tituloLinha3}</h3>
                                        ` : ''}
                                    </div>
                                    ${config.showContato ? `
                                    <div class="contact-info">
                                        ${config.cnpj ? `CNPJ: ${config.cnpj} | ` : ''}
                                        ${config.endereco ? `${config.endereco} | ` : ''}
                                        ${config.telefone ? `Tel/Whats: ${config.telefone}` : ''}
                                    </div>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <div class="main-content">
                                    <div class="emission-tag">Emissão em: ${emissionDate}</div>
                                    <h1 class="doc-title">${title}</h1>

                                    <div class="student-info-box">
                                        <div class="info-item"><span class="label">Paciente</span><span class="value">${student.fullName}</span></div>
                                        <div class="info-item"><span class="label">Nascimento / Idade</span><span class="value">${new Date(student.birthDate).toLocaleDateString()} (${studentAge} anos)</span></div>
                                        <div class="info-item"><span class="label">Responsável</span><span class="value">${student.guardians[0]?.name || 'Não informado'}</span></div>
                                        <div class="info-item"><span class="label">Escola</span><span class="value">${student.school.schoolName || 'Não vinculada'}</span></div>
                                    </div>

                                    ${contentHTML}

                                    <div class="signature-section">
                                        ${professional.signatureUrl ? `<img src="${professional.signatureUrl}" class="signature-image" alt="Assinatura">` : ''}
                                        <div class="signature-line"></div>
                                        <div class="professional-name">${professional.name}</div>
                                        <div class="professional-info">${professional.jobTitle || professional.specialty}</div>
                                        ${professional.specialty && professional.jobTitle !== professional.specialty ? `<div class="professional-info">${professional.specialty}</div>` : ''}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>
                                <div class="print-footer">
                                    ${config.rodapeTexto ? `<div class="footer-text">${config.rodapeTexto}</div>` : ''}
                                    ${config.rodapeImg ? `<img src="${config.rodapeImg}" class="footer-image" alt="Rodapé">` : ''}
                                </div>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </body>
        </html>
    `;
};

// --- PSICOPEDAGOGIA - STORAGE KEYS & TYPES ---
const PP_STORAGE_KEY = 'brotar_pp_private';

interface PPDiagnosisForm {
    queixaPrincipal: string;
    queixaSecundaria: string;
    contextoDemanda: string;
    instrumentosUtilizados: string;
    hipoteseDiagnostica: string;
    parecerInicial: string;
    encaminhamentos: string;
    nivelComprometimento?: 'Leve' | 'Moderado' | 'Severo' | '';
    cidSuspeitos?: string;
}

interface PPAnamnesisForm {
    historicoGestacional: string;
    historicoEscolar: string;
    rotinaEstudos: string;
    sono: string;
    alimentacaoSaude: string;
    emocionalComportamental: string;
    psicossexual: string;
    relacaoFamiliaEscola: string;
    observacoesGerais: string;
}

interface IPODomain {
    name: string;
    realiza: number;
    comAjuda: number;
    naoRealiza: number;
    totalItensAplicados: number;
}

interface IPOAssessment {
    id: string;
    date: string;
    domains: IPODomain[];
    totalScore: number;
    totalPossible: number;
    percentage: number;
    autoReport: string;
    professionalName: string;
}

interface PPSession {
    id: string;
    appointmentId?: string;
    date: string;
    objetivo: string;
    estrategias: string;
    observacoes: string;
    evolucao: string;
    recomendacoes: string;
    startTime?: string;
    endTime?: string;
    status: 'Realizado' | 'Agendado' | 'Falta' | 'Justificada';
    humor: 'Feliz' | 'Triste' | 'Agitado' | 'Cansado' | 'Neutro';
}

// --- PSICOPEDAGOGIA - SCHEMA V2 ---

interface FamilyMemberV2 {
    nome: string;
    idade: string;
    parentesco: string;
    escolaridade: string;
    ocupacao: string;
    saudeObs: string;
    problemaAprendizagem: boolean | null;
    problemaAprendizagemObs: string;
}

interface SchoolHistoryV2 {
    escola: string;
    serieAno: string;
    anoLetivo: string;
}

interface PPAnamnesisV2 {
    schemaVersion: "2";
    templateId: "psicoped_anamnese_v2";

    identificacao: {
        responsavel: string;
        telefones: string;
        endereco: string;
    };

    composicaoFamiliar: FamilyMemberV2[];
    queixaPrincipal: string; // Motivo do encaminhamento

    sono: {
        dormeBem: boolean | null;
        acordaNoite: boolean | null;
        dificuldadeDormir: boolean | null;
        horario: string;
        obs: string;
    };

    desenvolvimentoPsicomotor: {
        engatinhou: { valor: boolean | null, idade: string };
        andou: { valor: boolean | null, idade: string };
        esfincter: { valor: boolean | null, idade: string };
        coordMotoraFina: string;
        coordMotoraGrossa: string;
        obs: string;
    };

    linguagem: {
        fala: string;
        compreensao: string;
        expressao: string;
        trocasOuGagueira: string;
        obs: string;
    };

    escolaridade: {
        historico: SchoolHistoryV2[];
        repetencia: { valor: boolean | null, qual: string };
        dificuldadesEscola: string;
        relacaoSocialEscolar: string;
        estudoEmCasa: string;
    };

    dificuldadesAprendizagem: {
        leitura: boolean | null;
        escrita: boolean | null;
        matematica: boolean | null;
        atencao: boolean | null;
        memoria: boolean | null;
        organizacao: boolean | null;
        outros: string;
    };

    conhecimentosBasicos: {
        letras: boolean | null;
        numeros: boolean | null;
        cores: boolean | null;
        formas: boolean | null;
        lateralidade: boolean | null;
        espacoTempo: boolean | null;
        outros: string;
    };

    comportamento: {
        descricao: string;
        obs: string;
    };

    sexualidade: {
        obs: string;
    };

    visao: {
        usaOculos: boolean | null;
        consultaOftalmo: boolean | null;
        dificuldades: boolean | null;
        obs: string;
    };

    audicao: {
        pareceNaoOuvir: boolean | null;
        audiometria: boolean | null;
        dificuldades: boolean | null;
        obs: string;
    };

    habitosRotina: string;
    relacionamento: string;

    estimulacaoTelas: {
        celular: boolean | null;
        tablet: boolean | null;
        computador: boolean | null;
        tv: boolean | null;
        tempoDiario: string;
        conteudo: string;
        obs: string;
    };

    assinatura: {
        data: string;
        profissional: string;
    };

    legacy: {
        v1Snapshot?: PPAnamnesisForm;
        legacyNotes: string;
    };
}

interface PPPrivateData {
    diagnosis: PPDiagnosisForm;
    /** v1 texto livre | v2 ficha intermediária | v3 ficha estruturada atual (somente psicopedagogia) */
    anamnesis: PPAnamnesisForm | PPAnamnesisV2 | PPAnamnesisV3;
    sessions: PPSession[];
    ipoHistory: IPOAssessment[];
    statusAtendimento: 'Em Avaliação' | 'Em Acompanhamento' | 'Alta' | 'Desligado';
}

const initialPPAnamnesisV2: PPAnamnesisV2 = {
    schemaVersion: "2",
    templateId: "psicoped_anamnese_v2",
    identificacao: { responsavel: '', telefones: '', endereco: '' },
    composicaoFamiliar: [],
    queixaPrincipal: '',
    sono: { dormeBem: null, acordaNoite: null, dificuldadeDormir: null, horario: '', obs: '' },
    desenvolvimentoPsicomotor: { engatinhou: { valor: null, idade: '' }, andou: { valor: null, idade: '' }, esfincter: { valor: null, idade: '' }, coordMotoraFina: '', coordMotoraGrossa: '', obs: '' },
    linguagem: { fala: '', compreensao: '', expressao: '', trocasOuGagueira: '', obs: '' },
    escolaridade: { historico: [], repetencia: { valor: null, qual: '' }, dificuldadesEscola: '', relacaoSocialEscolar: '', estudoEmCasa: '' },
    dificuldadesAprendizagem: { leitura: null, escrita: null, matematica: null, atencao: null, memoria: null, organizacao: null, outros: '' },
    conhecimentosBasicos: { letras: null, numeros: null, cores: null, formas: null, lateralidade: null, espacoTempo: null, outros: '' },
    comportamento: { descricao: '', obs: '' },
    sexualidade: { obs: '' },
    visao: { usaOculos: null, consultaOftalmo: null, dificuldades: null, obs: '' },
    audicao: { pareceNaoOuvir: null, audiometria: null, dificuldades: null, obs: '' },
    habitosRotina: '',
    relacionamento: '',
    estimulacaoTelas: { celular: null, tablet: null, computador: null, tv: null, tempoDiario: '', conteudo: '', obs: '' },
    assinatura: { data: '', profissional: '' },
    legacy: { legacyNotes: '' }
};

const initialPPData: PPPrivateData = {
    diagnosis: { queixaPrincipal: '', queixaSecundaria: '', contextoDemanda: '', instrumentosUtilizados: '', hipoteseDiagnostica: '', parecerInicial: '', encaminhamentos: '', nivelComprometimento: '', cidSuspeitos: '' },
    anamnesis: createInitialPPAnamnesisV3(),
    sessions: [],
    ipoHistory: [],
    statusAtendimento: 'Em Avaliação'
};

const migrateV1toV2 = (v1: PPAnamnesisForm): PPAnamnesisV2 => {
    return {
        ...initialPPAnamnesisV2,
        queixaPrincipal: v1.historicoEscolar ? `[Migrado do Histórico V1] ${v1.historicoEscolar}` : '',
        sono: { ...initialPPAnamnesisV2.sono, obs: v1.sono || '' },
        escolaridade: { ...initialPPAnamnesisV2.escolaridade, dificuldadesEscola: v1.historicoEscolar || '', estudoEmCasa: v1.rotinaEstudos || '' },
        comportamento: { ...initialPPAnamnesisV2.comportamento, descricao: v1.emocionalComportamental || '' },
        sexualidade: { obs: v1.psicossexual || '' },
        habitosRotina: v1.alimentacaoSaude || '',
        relacionamento: v1.relacaoFamiliaEscola || '',
        legacy: {
            v1Snapshot: v1,
            legacyNotes: `Dados migrados da versão 1 em ${new Date().toLocaleDateString()}. Pela ambiguidade histórica em Visão/Audição, os textos originais foram preservados no snapshot abaixo.`
        }
    };
};


// --- PSICOPEDAGOGIA - UI COMPONENTS V2 ---

const PremiumNotification = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
    const icons = {
        success: <CheckCircle className="text-green-500" size={24} />,
        error: <AlertCircle className="text-red-500" size={24} />,
        info: <Brain className="text-pink-500" size={24} />
    };

    const colors = {
        success: 'border-green-100 bg-white shadow-xl shadow-green-100/50',
        error: 'border-red-100 bg-white shadow-xl shadow-red-100/50',
        info: 'border-pink-100 bg-white shadow-xl shadow-pink-100/50'
    };

    return (
        <div className={`fixed top-6 right-6 z-[9999] p-4 rounded-2xl border animate-slideRight flex items-center gap-4 max-w-sm ${colors[type]}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${type === 'success' ? 'bg-green-50' : type === 'error' ? 'bg-red-50' : 'bg-pink-50'}`}>
                {icons[type]}
            </div>
            <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm leading-tight">{message}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-tighter mt-0.5">Notificação do Sistema</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-300 transition-all">
                <X size={18} />
            </button>
        </div>
    );
};

const PremiumConfirmModal = ({ title, message, onConfirm, onCancel }: { title: string, message: string, onConfirm: () => void, onCancel: () => void }) => (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fadeIn" onClick={onCancel} />
        <div className="relative bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-scaleUp">
            <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-600 mb-6 mx-auto">
                <Zap size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 text-center mb-2 tracking-tight">{title}</h3>
            <p className="text-slate-500 text-center leading-relaxed mb-8">{message}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={onCancel} className="p-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancelar</button>
                <button onClick={onConfirm} className="p-4 rounded-2xl font-bold bg-pink-600 text-white shadow-lg shadow-pink-200 hover:bg-pink-700 transition-all">Confirmar</button>
            </div>
        </div>
    </div>
);

const PremiumFormSection = ({ title, icon: Icon, children, color = "text-slate-800", isPrivate = false }: any) => (
    <div className={`bg-slate-200 rounded-[1.5rem] shadow-md border-2 border-slate-400/60 overflow-hidden mb-8 animate-fadeIn`}>
        <div className={`px-6 py-5 flex items-center gap-4 border-b-2 border-slate-300 ${isPrivate ? 'bg-indigo-200' : 'bg-slate-300'}`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm border-2 border-slate-400 bg-slate-100 ${isPrivate ? 'text-indigo-800' : 'text-slate-800'}`}>
                {Icon && <Icon size={20} />}
            </div>
            <h3 className={`font-black text-sm uppercase tracking-widest ${color}`}>{title}</h3>
            {isPrivate && (
                <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-white/50 border border-indigo-300 text-indigo-900 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    <Lock size={12} /> Confidencial
                </div>
            )}
        </div>
        <div className="p-6 md:p-8">
            {children}
        </div>
    </div>
);

const PremiumStyledInput = ({ label, value, onChange, type = "text", placeholder = "", rows = 1 }: any) => (
    <div className="mb-6 group relative">
        <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-2.5 ml-1">{label}</label>
        <div className="relative">
            {rows > 1 ? (
                <textarea
                    className="w-full rounded-xl bg-slate-300 border-2 border-slate-400 p-4 text-sm font-black text-slate-900 placeholder:text-slate-600 placeholder:font-bold transition-all outline-none resize-y min-h-[100px] focus:bg-slate-100 focus:border-slate-600 focus:ring-0 focus:shadow-[0_0_0_4px_rgba(30,41,59,0.2)] hover:border-slate-500 hover:bg-slate-300"
                    rows={rows}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                />
            ) : (
                <input
                    type={type}
                    className="w-full rounded-xl bg-slate-300 border-2 border-slate-400 p-4 text-sm font-black text-slate-900 placeholder:text-slate-600 placeholder:font-bold transition-all outline-none focus:bg-slate-100 focus:border-slate-600 focus:ring-0 focus:shadow-[0_0_0_4px_rgba(30,41,59,0.2)] hover:border-slate-500 hover:bg-slate-300"
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                />
            )}
        </div>
    </div>
);

const PremiumTriStateField: React.FC<{ label: string, value: boolean | null, onChange: (val: boolean | null) => void }> = ({ label, value, onChange }) => (
    <div className="flex flex-col gap-3 p-5 bg-slate-200 rounded-2xl border-2 border-slate-400/80 hover:border-slate-500 transition-all duration-200 h-full">
        <span className="text-sm font-black text-slate-800 uppercase tracking-wider w-full text-left ml-1">{label}</span>
        <div className="flex w-full bg-slate-300 p-2 rounded-xl border-2 border-slate-400 gap-2 mt-auto">
            <button
                type="button"
                onClick={() => onChange(true)}
                className={`flex-1 px-3 py-2.5 text-xs font-black rounded-lg transition-all uppercase ${value === true ? 'bg-slate-800 text-white shadow-lg ring-2 ring-slate-800 transform scale-[1.02]' : 'bg-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-2 border-transparent'}`}
            >
                SIM
            </button>
            <button
                type="button"
                onClick={() => onChange(false)}
                className={`flex-1 px-3 py-2.5 text-xs font-black rounded-lg transition-all uppercase ${value === false ? 'bg-slate-500 text-white shadow-lg ring-2 ring-slate-500 transform scale-[1.02]' : 'bg-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-2 border-transparent'}`}
            >
                NÃO
            </button>
            <button
                type="button"
                onClick={() => onChange(null)}
                className={`flex-1 px-3 py-2.5 text-xs font-black rounded-lg transition-all uppercase ${value === null ? 'bg-slate-100 text-slate-500 border-2 border-slate-400 shadow-inner' : 'bg-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-2 border-transparent'}`}
            >
                -
            </button>
        </div>
    </div>
);



const PPAnamnesisV1LegacyView: React.FC<{ data: PPAnamnesisForm, onMigrate: () => void }> = ({ data, onMigrate }) => (
    <div className="space-y-6 animate-fadeIn pb-20">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4 text-amber-800">
                <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-600">
                    <AlertCircle size={28} />
                </div>
                <div>
                    <h3 className="font-bold text-lg">Modo de Visualização Legado (V1)</h3>
                    <p className="text-sm opacity-80">Esta ficha foi criada no formato antigo (texto livre). Migre para a ficha estruturada atual (v3) para os campos clínicos completos; os dados originais serão preservados em snapshot.</p>
                </div>
            </div>
            <button
                onClick={onMigrate}
                className="w-full md:w-auto px-8 py-3 bg-amber-600 text-white rounded-2xl font-black hover:bg-amber-700 shadow-xl shadow-amber-200 transition-all flex items-center justify-center gap-2 group active:scale-95"
            >
                <Zap size={18} className="group-hover:animate-pulse" />
                Migrar para ficha atual (v3)
            </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Object.entries(data).map(([key, value]) => (
                <div key={key} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{value || '-'}</p>
                </div>
            ))}
        </div>
    </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: any, title: string, subtitle?: string }) => (
    <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
        <div className="p-2.5 bg-pink-100 text-pink-600 rounded-xl">
            <Icon size={20} />
        </div>
        <div>
            <h3 className="font-bold text-slate-800 tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
        </div>
    </div>
);

const TableRowHeader = ({ labels }: { labels: string[] }) => (
    <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
        {labels.map((label, idx) => (
            <div key={idx} className={`text-[10px] font-black text-slate-400 uppercase tracking-wider ${idx === labels.length - 1 ? 'col-span-1 text-center' : 'col-span-2'}`}>
                {label}
            </div>
        ))}
    </div>
);

const PPAnamnesisV2Form: React.FC<{
    data: PPAnamnesisV2,
    onChange: (val: PPAnamnesisV2) => void,
    student: Student
}> = ({ data, onChange, student }) => {
    // Stepper State
    const [activeStep, setActiveStep] = useState(1);

    const updatePath = (path: string, value: any) => {
        const newData = JSON.parse(JSON.stringify(data));
        const parts = path.split('.');
        let current = newData;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) current[part] = {};
            current = current[part];
        }
        current[parts[parts.length - 1]] = value;
        onChange(newData);
    };

    // Scroll top when changing steps
    useEffect(() => {
        const contentContainer = document.querySelector('.anamnesis-content-container');
        if (contentContainer) contentContainer.scrollTop = 0;
    }, [activeStep]);

    const steps = [
        { id: 1, title: 'Dinâmica Familiar' },
        { id: 2, title: 'Desenvolvimento' },
        { id: 3, title: 'Histórico Escolar' },
        { id: 4, title: 'Saúde' }
    ];

    return (
        <div className="space-y-8 pb-32 animate-fadeIn">

            {/* HEADER MINIMALISTA & ELEGANTE */}
            <div className="flex flex-col gap-3 mb-8">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span className="text-slate-400 hover:text-slate-600 transition-colors cursor-default">Pacientes</span>
                    <ChevronRight size={10} className="text-slate-300" />
                    <span className="text-slate-500 hover:text-slate-800 transition-colors cursor-default">{student.fullName.split(' ')[0]}</span>
                    <ChevronRight size={10} className="text-slate-300" />
                    <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">Anamnese Psico</span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight truncate max-w-full sm:max-w-xl">
                            {student.fullName}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1 font-medium">Ficha de Acompanhamento Integrado</p>
                    </div>
                </div>
            </div>

            {/* STEPPER NAVIGATION REFINADO */}
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 sm:flex w-full bg-white/80 backdrop-blur-md rounded-2xl p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-10 sticky top-2 z-40 gap-1 sm:gap-0">
                {steps.map((step, idx) => {
                    const isActive = activeStep === step.id;
                    const isCompleted = activeStep > step.id;
                    return (
                        <button
                            key={step.id}
                            onClick={() => setActiveStep(step.id)}
                            className={`min-h-[44px] flex-1 flex items-center justify-center gap-3 py-3 px-4 rounded-xl transition-all duration-500 relative group overflow-hidden ${isActive
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10 scale-[1.03] border-0'
                                : 'bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-transparent hover:border-slate-200'
                                }`}
                        >
                            {/* Linha de conexão sutil */}
                            {idx < steps.length - 1 && !isActive && (
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-4 bg-slate-200" />
                            )}

                            <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 z-10`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] border ${isActive ? 'border-white/30 bg-white/10' : 'border-slate-200 bg-slate-50'}`}>
                                    {isCompleted ? <CheckCircle size={10} /> : step.id}
                                </span>
                                {step.title}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="anamnesis-content-container">

                {/* STEP 1: DINÂMICA FAMILIAR */}
                {activeStep === 1 && (
                    <div className="animate-fadeIn">
                        <PremiumFormSection title="I. Dinâmica e Composição Familiar" icon={Users} bgColor="bg-white">
                            <SectionHeader icon={Home} title="Núcleo Familiar" subtitle="Pessoas que residem com o aluno e dinâmica de parentesco." />

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                                {data.composicaoFamiliar.map((parent, idx) => (
                                    <div key={idx} className="bg-white rounded-[20px] p-6 border-2 border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-teal-300 hover:scale-[1.01] transition-all duration-300 relative group flex flex-col gap-6">
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg border-2 border-slate-200 shadow-inner group-hover:bg-teal-50 group-hover:text-teal-600 group-hover:border-teal-100 transition-colors">
                                                {parent.nome ? parent.nome.charAt(0).toUpperCase() : <UserIcon size={24} />}
                                            </div>
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <input
                                                    type="text"
                                                    value={parent.nome}
                                                    onChange={(e) => {
                                                        const newList = [...data.composicaoFamiliar];
                                                        newList[idx].nome = e.target.value;
                                                        updatePath('composicaoFamiliar', newList);
                                                    }}
                                                    className="w-full font-black text-slate-800 text-lg bg-transparent focus:bg-slate-100 focus:ring-2 focus:ring-teal-200 rounded-lg px-2 -ml-2 py-1 outline-none truncate placeholder:text-slate-300 placeholder:font-bold"
                                                    placeholder="NOME"
                                                />
                                                <input
                                                    type="text"
                                                    value={parent.parentesco}
                                                    onChange={(e) => {
                                                        const newList = [...data.composicaoFamiliar];
                                                        newList[idx].parentesco = e.target.value;
                                                        updatePath('composicaoFamiliar', newList);
                                                    }}
                                                    className="w-full text-xs font-bold text-slate-500 uppercase tracking-widest bg-transparent focus:bg-slate-100 focus:ring-2 focus:ring-teal-200 rounded-lg px-2 -ml-2 py-1 outline-none mt-1 placeholder:text-slate-300"
                                                    placeholder="PARENTESCO (MÃE/PAI)"
                                                />
                                            </div>
                                        </div>

                                        <div className="h-[2px] bg-slate-100 w-full" />

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 ml-1">Idade</label>
                                                <input
                                                    type="text"
                                                    value={parent.idade}
                                                    onChange={(e) => {
                                                        const newList = [...data.composicaoFamiliar];
                                                        newList[idx].idade = e.target.value;
                                                        updatePath('composicaoFamiliar', newList);
                                                    }}
                                                    className="w-full bg-slate-100/80 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 border-2 border-slate-200 focus:border-teal-400 focus:bg-white outline-none transition-all placeholder:text-slate-400 focus:shadow-md"
                                                    placeholder="Ex: 35"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 ml-1">Escolaridade</label>
                                                <input
                                                    type="text"
                                                    value={parent.escolaridade}
                                                    onChange={(e) => {
                                                        const newList = [...data.composicaoFamiliar];
                                                        newList[idx].escolaridade = e.target.value;
                                                        updatePath('composicaoFamiliar', newList);
                                                    }}
                                                    className="w-full bg-slate-100/80 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 border-2 border-slate-200 focus:border-teal-400 focus:bg-white outline-none transition-all placeholder:text-slate-400 focus:shadow-md"
                                                    placeholder="Ex: Superior"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-2 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide leading-tight max-w-[50%]">Dificuldade<br />Aprendizagem?</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        const newList = [...data.composicaoFamiliar];
                                                        newList[idx].problemaAprendizagem = true;
                                                        updatePath('composicaoFamiliar', newList);
                                                    }}
                                                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${parent.problemaAprendizagem === true ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 ring-2 ring-rose-100 transform scale-110' : 'bg-white text-slate-300 hover:text-rose-400 border-2 border-slate-200'}`}
                                                ><CheckCircle size={16} strokeWidth={3} /></button>
                                                <button
                                                    onClick={() => {
                                                        const newList = [...data.composicaoFamiliar];
                                                        newList[idx].problemaAprendizagem = false;
                                                        updatePath('composicaoFamiliar', newList);
                                                    }}
                                                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${parent.problemaAprendizagem === false ? 'bg-teal-500 text-white shadow-lg shadow-teal-200 ring-2 ring-teal-100 transform scale-110' : 'bg-white text-slate-300 hover:text-teal-400 border-2 border-slate-200'}`}
                                                ><X size={16} strokeWidth={3} /></button>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                const newList = [...data.composicaoFamiliar];
                                                newList.splice(idx, 1);
                                                updatePath('composicaoFamiliar', newList);
                                            }}
                                            className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg p-2 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={() => {
                                        const newItem: FamilyMemberV2 = { nome: '', idade: '', parentesco: '', escolaridade: '', ocupacao: '', saudeObs: '', problemaAprendizagem: null, problemaAprendizagemObs: '' };
                                        updatePath('composicaoFamiliar', [...data.composicaoFamiliar, newItem]);
                                    }}
                                    className="min-h-[280px] rounded-[20px] border-3 border-dashed border-slate-300/80 bg-slate-50/50 flex flex-col items-center justify-center gap-4 group hover:border-teal-400 hover:bg-teal-50 transition-all cursor-pointer"
                                >
                                    <div className="w-16 h-16 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-300 group-hover:bg-teal-500 group-hover:text-white group-hover:border-teal-200 transition-all transform group-hover:scale-110 duration-300 shadow-sm">
                                        <PlusCircle size={32} />
                                    </div>
                                    <span className="text-xs font-black text-slate-400 group-hover:text-teal-700 uppercase tracking-widest transition-colors">Adicionar Familiar</span>
                                </button>
                            </div>
                        </PremiumFormSection>
                    </div>
                )}

                {/* STEP 2: DESENVOLVIMENTO (Queixa, Sono, Psicomotor, Linguagem) */}
                {activeStep === 2 && (
                    <div className="animate-fadeIn space-y-8">
                        {/* QUEIXA */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <PremiumFormSection title="II. Queixa Principal" icon={MessageCircle}>
                                <PremiumStyledInput label="Motivo do Encaminhamento" value={data.queixaPrincipal} onChange={(e: any) => updatePath('queixaPrincipal', e.target.value)} rows={4} placeholder="Descreva os motivos relatados pela escola ou família..." />
                            </PremiumFormSection>

                            // FIX REPLACEMENT
                            <FormSection title="III. Sono e Repouso" icon={Moon}>
                                <div className="space-y-4">
                                    <TriStateField label="Dorme Bem?" value={data.sono.dormeBem} onChange={(v: any) => updatePath('sono.dormeBem', v)} />
                                    <TriStateField label="Acorda Durante a Noite?" value={data.sono.acordaNoite} onChange={(v: any) => updatePath('sono.acordaNoite', v)} />
                                    <TriStateField label="Dificuldade p/ Pegar no Sono?" value={data.sono.dificuldadeDormir} onChange={(v: any) => updatePath('sono.dificuldadeDormir', v)} />
                                    <StyledInput label="Horário de Sono e OBS" value={data.sono.obs} onChange={(e: any) => updatePath('sono.obs', e.target.value)} rows={2} />
                                </div>
                            </FormSection>

                        </div>

                        {/* DESENVOLVIMENTO COMPLETO */}
                        <FormSection title="IV. Desenvolvimento Integrado" icon={Activity}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                                {/* Marcos */}
                                <div className="space-y-6">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6 ml-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.5)]" /> Marcos Psicomotores
                                    </h4>
                                    {/* ... Repeat Milestone logic or new compact version ... */}
                                    {/* Compact version needed for better UX in stepper */}
                                    {['engatinhou', 'andou', 'esfincter'].map((key) => {
                                        const item = (data.desenvolvimentoPsicomotor as any)[key];
                                        const labels: any = { engatinhou: 'Engatinhou?', andou: 'Andou?', esfincter: 'Esfíncteres?' };
                                        return (
                                            <div key={key} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                                                <span className="text-sm font-bold text-slate-600">{labels[key]}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex bg-white rounded-lg shadow-sm border border-slate-100 p-0.5">
                                                        <button onClick={() => updatePath(`desenvolvimentoPsicomotor.${key}.valor`, true)} className={`px-3 py-1 rounded text-[10px] font-bold ${item.valor === true ? 'bg-emerald-100 text-emerald-600' : 'text-slate-300'}`}>SIM</button>
                                                        <button onClick={() => updatePath(`desenvolvimentoPsicomotor.${key}.valor`, false)} className={`px-3 py-1 rounded text-[10px] font-bold ${item.valor === false ? 'bg-rose-100 text-rose-600' : 'text-slate-300'}`}>NÃO</button>
                                                    </div>
                                                    {item.valor === true && (
                                                        <input
                                                            type="text"
                                                            value={item.idade}
                                                            onChange={(e) => updatePath(`desenvolvimentoPsicomotor.${key}.idade`, e.target.value)}
                                                            className="w-20 bg-white border border-slate-100 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-1 focus:ring-pink-200"
                                                            placeholder="Idade"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <PremiumStyledInput label="Obs. Motricidade" value={data.desenvolvimentoPsicomotor.obs} onChange={(e: any) => updatePath('desenvolvimentoPsicomotor.obs', e.target.value)} rows={3} />
                                </div>

                                {/* Linguagem */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" /> Linguagem
                                    </h4>
                                    <StyledInput label="Fala" value={data.linguagem.fala} onChange={(e: any) => updatePath('linguagem.fala', e.target.value)} />
                                    <StyledInput label="Compreensão" value={data.linguagem.compreensao} onChange={(e: any) => updatePath('linguagem.compreensao', e.target.value)} />
                                    <StyledInput label="Trocas / Gagueira" value={data.linguagem.trocasOuGagueira} onChange={(e: any) => updatePath('linguagem.trocasOuGagueira', e.target.value)} />
                                </div>
                            </div>
                        </FormSection>
                    </div>
                )}

                {/* STEP 3: HISTÓRICO ESCOLAR */}
                {activeStep === 3 && (
                    <div className="animate-fadeIn space-y-8">
                        <FormSection title="V. Histórico Escolar" icon={SchoolIcon}>
                            <div className="space-y-4">
                                {data.escolaridade.historico.map((h, hIdx) => (
                                    <div key={hIdx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 bg-slate-50/50 border border-slate-100 rounded-2xl relative">
                                        <div className="md:col-span-5">
                                            <PremiumStyledInput label="Escola" value={h.escola} onChange={(e: any) => {
                                                const newList = [...data.escolaridade.historico];
                                                newList[hIdx].escola = e.target.value;
                                                updatePath('escolaridade.historico', newList);
                                            }} />
                                        </div>
                                        <div className="md:col-span-3">
                                            <PremiumStyledInput label="Série" value={h.serieAno} onChange={(e: any) => {
                                                const newList = [...data.escolaridade.historico];
                                                newList[hIdx].serieAno = e.target.value;
                                                updatePath('escolaridade.historico', newList);
                                            }} />
                                        </div>
                                        <div className="md:col-span-3">
                                            <PremiumStyledInput label="Ano Letivo" value={h.anoLetivo} onChange={(e: any) => {
                                                const newList = [...data.escolaridade.historico];
                                                newList[hIdx].anoLetivo = e.target.value;
                                                updatePath('escolaridade.historico', newList);
                                            }} />
                                        </div>
                                        <button
                                            onClick={() => {
                                                const newList = [...data.escolaridade.historico];
                                                newList.splice(hIdx, 1);
                                                updatePath('escolaridade.historico', newList);
                                            }}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 rounded-full flex items-center justify-center shadow-sm"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        const newItem = { escola: '', serieAno: '', anoLetivo: '' };
                                        updatePath('escolaridade.historico', [...data.escolaridade.historico, newItem]);
                                    }}
                                    className="w-full py-3 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <PlusCircle size={14} /> ADICIONAR REGISTRO ESCOLAR
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
                                <StyledInput label="Dificuldades na Escola" value={data.escolaridade.dificuldadesEscola} onChange={(e: any) => updatePath('escolaridade.dificuldadesEscola', e.target.value)} rows={3} />
                                <StyledInput label="Relacionamento Social" value={data.escolaridade.relacaoSocialEscolar} onChange={(e: any) => updatePath('escolaridade.relacaoSocialEscolar', e.target.value)} rows={3} />
                            </div>
                        </FormSection>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <FormSection title="VI. Áreas de Dificuldade" icon={AlertTriangle}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {['leitura', 'escrita', 'matematica', 'atencao', 'memoria', 'organizacao'].map((key) => (
                                        <TriStateField key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={(data.dificuldadesAprendizagem as any)[key]} onChange={(v: any) => updatePath(`dificuldadesAprendizagem.${key}`, v)} />
                                    ))}
                                </div>
                            </FormSection>
                            <FormSection title="VII. Conhecimentos Básicos" icon={Puzzle}>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {['letras', 'numeros', 'cores', 'formas', 'lateralidade', 'espacoTempo'].map((key) => (
                                        <TriStateField key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={(data.conhecimentosBasicos as any)[key]} onChange={(v: any) => updatePath(`conhecimentosBasicos.${key}`, v)} />
                                    ))}
                                </div>
                            </FormSection>
                        </div>
                    </div>
                )}


                {/* STEP 4: SAÚDE (Visão, Audição, Telas, Comportamento, Sensível) */}
                {activeStep === 4 && (
                    <div className="animate-fadeIn space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <FormSection title="VIII. Visão" icon={Eye}>
                                <div className="space-y-4">
                                    <TriStateField label="Usa Óculos?" value={data.visao.usaOculos} onChange={(v: any) => updatePath('visao.usaOculos', v)} />
                                    <TriStateField label="Dificuldades?" value={data.visao.dificuldades} onChange={(v: any) => updatePath('visao.dificuldades', v)} />
                                    <StyledInput label="Obs." value={data.visao.obs} onChange={(e: any) => updatePath('visao.obs', e.target.value)} />
                                </div>
                            </FormSection>

                            <FormSection title="IX. Audição" icon={Volume2}>
                                <div className="space-y-4">
                                    <TriStateField label="Parece não ouvir?" value={data.audicao.pareceNaoOuvir} onChange={(v: any) => updatePath('audicao.pareceNaoOuvir', v)} />
                                    <TriStateField label="Dificuldades?" value={data.audicao.dificuldades} onChange={(v: any) => updatePath('audicao.dificuldades', v)} />
                                    <StyledInput label="Obs." value={data.audicao.obs} onChange={(e: any) => updatePath('audicao.obs', e.target.value)} />
                                </div>
                            </FormSection>
                        </div>

                        <FormSection title="X. Uso de Telas" icon={Smartphone}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <TriStateField label="Celular" value={data.estimulacaoTelas.celular} onChange={(v: any) => updatePath('estimulacaoTelas.celular', v)} />
                                    <TriStateField label="TV" value={data.estimulacaoTelas.tv} onChange={(v: any) => updatePath('estimulacaoTelas.tv', v)} />
                                </div>
                                <div className="space-y-3">
                                    <StyledInput label="Tempo Diário" value={data.estimulacaoTelas.tempoDiario} onChange={(e: any) => updatePath('estimulacaoTelas.tempoDiario', e.target.value)} />
                                    <StyledInput label="O que assiste?" value={data.estimulacaoTelas.conteudo} onChange={(e: any) => updatePath('estimulacaoTelas.conteudo', e.target.value)} />
                                </div>
                            </div>
                        </FormSection>

                        <FormSection title="XI. Dados Sensíveis / Comportamento" icon={Lock} isPrivate={true}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <StyledInput label="Descrição do Comportamento" value={data.comportamento.descricao} onChange={(e: any) => updatePath('comportamento.descricao', e.target.value)} rows={4} />
                                <StyledInput label="Sexualidade / Obs. Sigilosas" value={data.sexualidade.obs} onChange={(e: any) => updatePath('sexualidade.obs', e.target.value)} rows={4} />
                            </div>
                        </FormSection>

                    </div>
                )}

            </div>

            {/* Navigation Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-300 p-4 z-50 flex items-center justify-center md:pl-20 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
                <div className="max-w-4xl w-full flex items-center justify-between">
                    <button
                        onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
                        disabled={activeStep === 1}
                        className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center gap-2"
                    >
                        <ChevronRight size={18} className="rotate-180" /> Anterior
                    </button>

                    <div className="flex gap-2">
                        {steps.map(s => (
                            <div key={s.id} className={`h-2 rounded-full transition-all duration-300 ${activeStep === s.id ? 'bg-slate-800 w-8' : 'bg-slate-200 w-2'}`} />
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            if (activeStep < 4) {
                                setActiveStep(prev => Math.min(4, prev + 1));
                            } else {
                                const contentContainer = document.querySelector('.anamnesis-content-container');
                                if (contentContainer) contentContainer.scrollTop = 0;
                            }
                        }}
                        className={`px-8 py-3 rounded-xl font-black text-white shadow-xl transform hover:-translate-y-1 transition-all flex items-center gap-3 ${activeStep === 4 ? 'bg-teal-600 shadow-teal-200 hover:bg-teal-700' : 'bg-slate-900 shadow-slate-400 hover:bg-slate-800'}`}
                    >
                        {activeStep === 4 ? 'FINALIZAR' : 'PRÓXIMO'} {activeStep !== 4 && <ChevronRight size={18} strokeWidth={3} />}
                    </button>
                </div>
            </div>
        </div>
    );
};
const extractPPData = (student: Student): PPPrivateData => {
    const rawPP = student.clinical.pp_data || {};
    // Merge sessions from history (clinical_sessions table)
    // CRITICAL: Filter by specialty to avoid data leakage from other treatments
    const mappedSessions: PPSession[] = (student.history || [])
        .filter(h => h.specialty === Specialty.PSYCHOPEDAGOGY)
        .map(h => ({
            id: h.id,
            date: h.date,
            objetivo: h.content?.objetivo || h.notes || '',
            estrategias: h.content?.estrategias || '',
            observacoes: h.content?.observacoes || h.notes || '',
            evolucao: h.content?.evolucao || '',
            recomendacoes: h.content?.recomendacoes || '',
            startTime: h.content?.startTime || h.startTime || '',
            status: (h.content?.status || 'Realizado') as any,
            humor: (h.content?.humor || 'Neutro') as any
        }));

    let anamnesisData = rawPP.anamnesis || initialPPData.anamnesis;
    // Sem schemaVersion: só trata como V1 se houver texto típico da ficha legada; senão merge v3 parcial ou v3 limpa.
    if (rawPP.anamnesis && !rawPP.anamnesis.schemaVersion) {
        if (looksLikePPAnamnesisV1Plain(rawPP.anamnesis)) {
            anamnesisData = rawPP.anamnesis as PPAnamnesisForm;
        } else if (hasPPAnamnesisV3PartialShape(rawPP.anamnesis)) {
            anamnesisData = mergePsychopedagogyAnamnesisV3(createInitialPPAnamnesisV3(), rawPP.anamnesis);
        } else {
            anamnesisData = createInitialPPAnamnesisV3();
        }
    } else if (rawPP.anamnesis && rawPP.anamnesis.schemaVersion === "2") {
        // Deep merge simples para V2 (mantendo garantias de novos campos se adicionados no futuro)
        anamnesisData = { ...initialPPAnamnesisV2, ...rawPP.anamnesis };
    } else if (rawPP.anamnesis && rawPP.anamnesis.schemaVersion === "3") {
        anamnesisData = mergePsychopedagogyAnamnesisV3(createInitialPPAnamnesisV3(), rawPP.anamnesis);
    }

    const anamnesisHydrated = hydratePsychopedagogyAnamnesisV3IfNoPersistedJson(student, anamnesisData, rawPP) as
        | PPAnamnesisForm
        | PPAnamnesisV2
        | PPAnamnesisV3;

    return {
        diagnosis: { ...initialPPData.diagnosis, ...(rawPP.diagnosis || {}) },
        anamnesis: anamnesisHydrated,
        ipoHistory: rawPP.ipoHistory || [],
        statusAtendimento: rawPP.statusAtendimento || 'Em Avaliação',
        sessions: mappedSessions,
    };
};


interface BaseDashboardProps {
    title: string;
    specialty: Specialty;
    onNavigateNew: () => void;
    onNavigate?: (page: string, options?: any) => void;
    onNavigateToCase?: (id: string) => void;
    currentUser: User;
    preSelectedStudent?: Student | null;
}

// --- DASHBOARD ESPECÍFICO DE PSICOPEDAGOGIA (NOVO MODO COFRE) ---
const PsychopedagogySpecificDashboard: React.FC<BaseDashboardProps & { autoOpenSession?: boolean }> = ({ title, onNavigateNew, onNavigate, currentUser, preSelectedStudent, autoOpenSession }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(preSelectedStudent || null);
    const [activeTab, setActiveTab] = useState<'diagnostic' | 'anamnesis' | 'sessions' | 'ipo' | 'reports'>('diagnostic');
    const [ppData, setPPData] = useState<PPPrivateData>(initialPPData);
    const [isEditingSession, setIsEditingSession] = useState(false);
    const [currentSession, setCurrentSession] = useState<Partial<PPSession>>({});
    const [loading, setLoading] = useState(false);
    const { success: showToast, error: toastError } = useToast();
    const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
    const [showConfirmDischarge, setShowConfirmDischarge] = useState(false);
    const [recentActivity, setRecentActivity] = useState<{ session: PPSession, studentName: string, studentId: string }[]>([]);
    const [upcomingAgenda, setUpcomingAgenda] = useState<{ session: PPSession, studentName: string, studentId: string }[]>([]);
    const [stats, setStats] = useState({ totalPatients: 0, totalSessions: 0, activeCases: 0, diagnosisData: [] as any[] });
    const [searchTerm, setSearchTerm] = useState('');
    const [schoolFilter, setSchoolFilter] = useState('');

    // P1: Refs e Estado Pós-Salvar
    const evolutionInputRef = React.useRef<HTMLTextAreaElement>(null);
    const [showPostSaveModal, setShowPostSaveModal] = useState(false);

    // Rich Dashboard States
    const [todayCount, setTodayCount] = useState(0);
    const [sessionsInfo, setSessionsInfo] = useState<Record<string, { total: number, lastDate: string | null }>>({});
    const [absencesCount, setAbsencesCount] = useState(0);
    const [pendingLaudosCount, setPendingLaudosCount] = useState(0);
    const [myStudentsCount, setMyStudentsCount] = useState(0);

    // Notification and Modal States
    // Notification state removed in favor of global ToastContext

    // IPO States
    const [ipoEditMode, setIpoEditMode] = useState(false);
    const [currentIpo, setCurrentIpo] = useState<IPODomain[]>([
        { name: 'Comunicação', realiza: 0, comAjuda: 0, naoRealiza: 0, totalItensAplicados: 0 },
        { name: 'Socialização', realiza: 0, comAjuda: 0, naoRealiza: 0, totalItensAplicados: 0 },
        { name: 'Cognição', realiza: 0, comAjuda: 0, naoRealiza: 0, totalItensAplicados: 0 },
        { name: 'Motricidade', realiza: 0, comAjuda: 0, naoRealiza: 0, totalItensAplicados: 0 },
        { name: 'Autonomia', realiza: 0, comAjuda: 0, naoRealiza: 0, totalItensAplicados: 0 }
    ]);

    const isPP = currentUser.specialty === Specialty.PSYCHOPEDAGOGY || currentUser.role === 'ADMIN';

    const loadData = async () => {
        setLoading(true);
        const allStudents = await SupabaseService.getStudentsForUser(currentUser);
        setStudents(allStudents);

        const activity: { session: PPSession, studentName: string, studentId: string }[] = [];
        let upcoming: any[] = [];
        let sessionCount = 0;
        let patientCount = 0;
        let activeCount = 0;

        // Obtém a data local formatada como YYYY-MM-DD
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // Chamadas ao SupabaseService com tratamento de erro
        try {
            // Agendamentos da profissional para calcular alunos vinculados e laudos
            const myAllAppointments = await SupabaseService.getAppointments({
                professionalId: currentUser.id
            });

            // Alunos únicos que a profissional atende
            const myStudentIds = new Set(myAllAppointments.map((a: any) => a.studentId).filter(Boolean));
            const myStudents = allStudents.filter(s => myStudentIds.has(s.id));
            setMyStudentsCount(myStudents.filter(s => s.status === 'Active').length);

            // Laudos pendentes — apenas dos alunos da profissional
            const pendingLaudosVal = myStudents.filter(s =>
                s.status === 'Active' &&
                s.clinical?.laudo !== true &&
                !s.documents?.some(doc => doc.type === 'Laudo Médico')
            ).length;
            setPendingLaudosCount(pendingLaudosVal);

            // Contagem de hoje
            const todayAppointments = myAllAppointments.filter((app: any) =>
                app.date === today && ['AGENDADO','CONFIRMADO','EM_ATENDIMENTO'].includes(app.status)
            );
            setTodayCount(todayAppointments.length);

            // MELHORIA 3: Puxa agendamentos corretos do dia
            upcoming = todayAppointments.map((app: any) => ({
                session: { startTime: app.startTime, date: app.date, objetivo: app.notes || '' },
                studentName: app.studentName,
                studentId: app.studentId
            }));

            // Contagem de faltas do mês
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            const absencesCountVal = myAllAppointments.filter((app: any) =>
                app.status === 'FALTOU' &&
                app.date >= startOfMonth &&
                app.date <= endOfMonth
            ).length;
            setAbsencesCount(absencesCountVal);
        } catch (err) {
            console.error("Erro ao carregar agendamentos do Supabase:", err);
            setTodayCount(0);
            setAbsencesCount(0);
        }

        const diagnosisMap = new Map<string, number>();

        allStudents.forEach(student => {
            const data = extractPPData(student);

            // Diagnosis Logic
            if (data && data.diagnosis) {
                const diag = data.diagnosis.hipoteseDiagnostica?.split(' ')[0] || 'Em Avaliação';
                diagnosisMap.set(diag, (diagnosisMap.get(diag) || 0) + 1);
            }

            if (data && data.sessions && data.sessions.length > 0) {
                patientCount++;
                activeCount++;
                sessionCount += data.sessions.length;

                data.sessions.forEach(session => {
                    const sessionItem = { session, studentName: student.fullName, studentId: student.id };
                    if (session.status === 'Realizado') {
                        activity.push(sessionItem);
                    }
                });
            }
        });

        const diagnosisData = Array.from(diagnosisMap.entries()).map(([name, value]) => ({ name, value }));

        // Ordena atividades recentes por data decrescente
        activity.sort((a, b) => new Date(b.session.date).getTime() - new Date(a.session.date).getTime());

        // Ordena agenda por horário de início
        upcoming.sort((a, b) => (a.session.startTime || '').localeCompare(b.session.startTime || ''));

        setRecentActivity(activity);
        setUpcomingAgenda(upcoming);
        setStats({ totalPatients: patientCount, totalSessions: sessionCount, activeCases: activeCount, diagnosisData });
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    // MELHORIA 1: Buscar sessões
    useEffect(() => {
        const fetchSessionsInfo = async () => {
            const info: Record<string, { total: number, lastDate: string | null }> = {};
            await Promise.all(students.map(async (student) => {
                try {
                    const sessions = await SupabaseService.getStudentSessions(student.id);
                    if (sessions && sessions.length > 0) {
                        const sorted = sessions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        info[student.id] = { total: sessions.length, lastDate: sorted[0].date };
                    } else {
                        info[student.id] = { total: 0, lastDate: null };
                    }
                } catch (e) {
                    info[student.id] = { total: 0, lastDate: null };
                }
            }));
            setSessionsInfo(info);
        };
        if (students.length > 0) fetchSessionsInfo();
    }, [students]);

    useAgendaClinicalDeepLink(setLoading, toastError, (full, openTab) => {
        setSelectedStudent(full);
        const t = openTab;
        if (t === 'anamnesis' || t === 'sessions' || t === 'diagnostic' || t === 'ipo' || t === 'reports') {
            setActiveTab(t);
        } else {
            setActiveTab('anamnesis');
        }
        setIsEditingSession(false);
    });

    const schoolOptions = useMemo(() => {
        const names = new Set(students.map(s => s.school?.schoolName).filter(Boolean));
        return Array.from(names).sort() as string[];
    }, [students]);

    const filteredStudents = useMemo(() => {
        const bySchool = schoolFilter
            ? students.filter(s => s.school?.schoolName === schoolFilter)
            : students;
        if (!searchTerm) return schoolFilter ? bySchool.slice(0, 20) : [];
        return bySchool.filter(s =>
            s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.cpf && s.cpf.includes(searchTerm))
        ).slice(0, 10);
    }, [students, searchTerm, schoolFilter]);

    // Sync com preSelectedStudent se mudar
    useEffect(() => {
        if (preSelectedStudent) {
            setSelectedStudent(preSelectedStudent);
        }
    }, [preSelectedStudent]);

    // Atualiza dados quando aluno muda (sem fetch extra, usa dados já carregados/mapeados)
    useEffect(() => {
        if (selectedStudent && isPP) {
            try {
                setPPData(extractPPData(selectedStudent));
                
                // Recupera dados do agendamento prévio no localStorage (fluxo vindo da agenda clínica)
                const aptDetailsStr = localStorage.getItem('brotar_appointment_details');
                if (aptDetailsStr) {
                    try {
                        const details = JSON.parse(aptDetailsStr);
                        setCurrentSession({
                            appointmentId: details.id || '',
                            date: details.date || new Date().toISOString().split('T')[0],
                            startTime: details.startTime || '',
                            endTime: details.endTime || '',
                            status: 'Realizado',
                            humor: 'Neutro'
                        });
                        setActiveTab('sessions');
                        setIsEditingSession(true);
                    } catch (e) {
                        console.error('Erro ao fazer parse dos detalhes do agendamento:', e);
                    } finally {
                        localStorage.removeItem('brotar_appointment_details');
                        localStorage.removeItem('brotar_auto_open_session');
                    }
                } else if (autoOpenSession) {
                    // Preenche data e hora atual ao abrir nova sessao sem agendamento vinculado
                    const _now = new Date();
                    const _pad = (n: number) => String(n).padStart(2, '0');
                    const _hFim = _now.getHours() < 23 ? _now.getHours() + 1 : 23;
                    setActiveTab('sessions');
                    setIsEditingSession(true);
                    setCurrentSession({
                        date: _now.toISOString().split('T')[0],
                        startTime: `${_pad(_now.getHours())}:${_pad(_now.getMinutes())}`,
                        endTime: `${_pad(_hFim)}:${_pad(_now.getMinutes())}`,
                        status: 'Realizado',
                        humor: 'Neutro'
                    });
                }
            } catch (err) {
                console.error("Erro ao carregar dados de psicopedagogia:", err);
                showToast("Erro ao processar dados deste aluno.", "error");
            }
        }
    }, [selectedStudent, isPP, autoOpenSession]);

    const handleStudentSelect = async (id: string) => {
        setLoading(true);
        // Busca imediata na lista local para transição visual
        const s = students.find(st => st.id === id);
        if (s) setSelectedStudent(s);

        // Busca profunda dos dados para o prontuário (clinical_info, documentos, etc)
        const fullStudent = await SupabaseService.getStudentById(id);
        if (fullStudent) {
            try {
                // Busca o histórico de sessões do aluno no banco de dados para evitar tela vazia
                const sessions = await SupabaseService.getStudentSessions(id);
                fullStudent.history = sessions;
            } catch (err) {
                console.error("Erro ao carregar histórico de sessões no handleStudentSelect:", err);
            }
            setSelectedStudent(fullStudent);
        }
        
        setIpoEditMode(false);
        setLoading(false);
    };

    const handleSaveGeneral = async () => {
        if (!selectedStudent) return;

        try {
            console.log("Tentando salvar dados do aluno:", selectedStudent.id);
            const updatedStudent = {
                ...selectedStudent,
                clinical: {
                    ...selectedStudent.clinical,
                    pp_data: {
                        diagnosis: ppData.diagnosis,
                        anamnesis: ppData.anamnesis,
                        ipoHistory: ppData.ipoHistory,
                        statusAtendimento: ppData.statusAtendimento
                    }
                    // Note: session data is NOT saved in pp_data, but in separate table
                }
            };

            console.log("Payload para Supabase:", updatedStudent);
            await SupabaseService.saveStudent(updatedStudent);

            // Atualiza estado local de students para refletir a mudança sem reload
            setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
            setSelectedStudent(updatedStudent);
            showToast('Dados da ficha salvos com sucesso!');
        } catch (error) {
            console.error("Erro CRITICO ao salvar:", error);
            showToast('Erro ao salvar dados. Verifique a conexão.', 'error');
            // Alert removido a pedido do usuário (UX Premium)
        }
    };


    /** Migração opcional V1 (texto livre) → V3; preserva snapshot em legacy (ver migratePPAnamnesisV1ToV3). */
    const handleMigrateV1ToV3 = () => {
        if (!ppData.anamnesis) return;
        if ('schemaVersion' in ppData.anamnesis && ppData.anamnesis.schemaVersion === "2") return;
        if ('schemaVersion' in ppData.anamnesis && ppData.anamnesis.schemaVersion === "3") return;

        if (confirmModal) return;

        setConfirmModal({
            title: "Migrar ficha legada (V1)",
            message: "Migrar para a ficha estruturada atual (v3)? Os textos da V1 serão preservados em snapshot e copiados de forma conservadora para os novos campos.",
            onConfirm: () => {
                const v3 = migratePPAnamnesisV1ToV3(ppData.anamnesis as PPAnamnesisForm);
                setPPData(prev => ({ ...prev, anamnesis: v3 }));
                showToast("Ficha migrada para o formato atual (v3).", "success");
                setConfirmModal(null);
            }
        });
    };

    const handleMigrateV2ToV3 = () => {
        if (!ppData.anamnesis || !('schemaVersion' in ppData.anamnesis) || ppData.anamnesis.schemaVersion !== "2") return;
        if (confirmModal) return;

        setConfirmModal({
            title: "Migrar ficha V2 → V3",
            message: "A ficha V2 completa será preservada em JSON (legacy). Campos homólogos serão pré-preenchidos na v3. Deseja continuar?",
            onConfirm: () => {
                const v3 = migratePPAnamnesisV2ToV3(ppData.anamnesis as PPAnamnesisV2);
                setPPData(prev => ({ ...prev, anamnesis: v3 }));
                showToast("Ficha migrada para v3.", "success");
                setConfirmModal(null);
            }
        });
    };

    const updateDiagnosis = (field: keyof PPDiagnosisForm, value: string) => {
        setPPData(prev => ({ ...prev, diagnosis: { ...prev.diagnosis, [field]: value } }));
    };

    const updateAnamnesisV2 = (newData: PPAnamnesisV2) => {
        setPPData(prev => ({ ...prev, anamnesis: newData }));
    };

    const updateAnamnesisV3 = (newData: PPAnamnesisV3) => {
        setPPData(prev => ({ ...prev, anamnesis: newData }));
    };

    // --- SESSION LOGIC ---
    const handleSaveSession = async () => {
        if (!selectedStudent) return;

        const newSession: PPSession = {
            id: currentSession.id || crypto.randomUUID(),
            appointmentId: currentSession.appointmentId || '',
            date: currentSession.date || new Date().toISOString().split('T')[0],
            objetivo: currentSession.objetivo || '',
            estrategias: currentSession.estrategias || '',
            observacoes: currentSession.observacoes || '',
            evolucao: currentSession.evolucao || '',
            recomendacoes: currentSession.recomendacoes || '',
            startTime: currentSession.startTime || '',
            endTime: currentSession.endTime || '',
            status: currentSession.status || 'Realizado',
            humor: currentSession.humor || 'Neutro'
        };

        // Salva no Supabase (convertendo para formato genérico Session)
        const genericSession: Session = {
            id: newSession.id,
            date: newSession.date,
            specialty: Specialty.PSYCHOPEDAGOGY,
            professionalName: currentUser.name,
            notes: newSession.objetivo, // Resumo simples
            content: newSession, // JSON completo específico
            privateNotes: newSession.observacoes
        };

        try {
            // Salva sessão no banco
            await SupabaseService.saveSession(genericSession, selectedStudent.id, currentUser.id);

            // Atualiza estado local
            const updatedSessions = currentSession.id
                ? ppData.sessions.map(s => s.id === currentSession.id ? newSession : s)
                : [newSession, ...ppData.sessions];

            const newData = { ...ppData, sessions: updatedSessions };
            setPPData(newData);

            // Também atualiza o objeto student localmente para manter coerência sem reload
            const updatedHistorySession = {
                id: newSession.id,
                date: newSession.date,
                specialty: Specialty.PSYCHOPEDAGOGY,
                professionalName: currentUser.name,
                notes: newSession.objetivo,
                content: newSession,
                privateNotes: newSession.observacoes
            };
            const updatedHistory = currentSession.id
                ? (selectedStudent.history || []).map(h => h.id === currentSession.id ? updatedHistorySession : h)
                : [updatedHistorySession, ...(selectedStudent.history || [])];

            setSelectedStudent(prev => prev ? { ...prev, history: updatedHistory } : null);

            setShowPostSaveModal(true);
        } catch (e) {
            console.error(e);
            toastError('Erro ao salvar sessão.');
        }
    };

    // --- IPO LOGIC ---
    const calculateIPO = () => {
        const domains = currentIpo.map(d => ({
            ...d,
            score: (d.realiza * 2) + (d.comAjuda * 1),
            maxScore: d.totalItensAplicados * 2
        }));

        const totalScore = domains.reduce((acc, d) => acc + d.score, 0);
        const totalPossible = domains.reduce((acc, d) => acc + d.maxScore, 0);
        const percentage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;

        let analysisText = `AVALIAÇÃO PORTAGE:\nO aluno obteve um desempenho global de ${percentage.toFixed(1)}%.\n`;

        domains.forEach(d => {
            const domPerc = d.maxScore > 0 ? (d.score / d.maxScore) * 100 : 0;
            let status = 'Adequado';
            if (domPerc < 50) status = 'Necessita Intervenção Prioritária';
            else if (domPerc < 75) status = 'Em Desenvolvimento';

            analysisText += `- ${d.name}: ${domPerc.toFixed(1)}% (${status})\n`;
        });

        return { domains, totalScore, totalPossible, percentage, analysisText };
    };

    const handleSaveIPO = async () => {
        if (!selectedStudent) return;
        const calc = calculateIPO();

        const newAssessment: IPOAssessment = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            domains: currentIpo,
            totalScore: calc.totalScore,
            totalPossible: calc.totalPossible,
            percentage: calc.percentage,
            autoReport: calc.analysisText,
            professionalName: currentUser.name
        };

        const newData = { ...ppData, ipoHistory: [newAssessment, ...ppData.ipoHistory] };
        setPPData(newData);

        // Salva via saveStudent (mesma lÃ³gica do General)
        const updatedStudent = {
            ...selectedStudent,
            clinical: {
                ...selectedStudent.clinical,
                pp_data: {
                    ...selectedStudent.clinical.pp_data,
                    ipoHistory: newData.ipoHistory
                }
            }
        };

        await SupabaseService.saveStudent(updatedStudent);
        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
        setSelectedStudent(updatedStudent);

        setIpoEditMode(false);
        showToast('Avaliação IPO salva e laudo gerado!');
    };

    const updateIpoDomain = (index: number, field: keyof IPODomain, value: number) => {
        const newIpo = [...currentIpo];
        (newIpo[index] as any)[field] = value;
        setCurrentIpo(newIpo);
    };

    const handlePrintPP = async (targetSession?: PPSession) => {
        if (!selectedStudent || !isPP) return;

        try {
            const config = await SupabaseService.getPapelTimbradoConfig();
            const session = targetSession || (ppData.sessions.length > 0 ? ppData.sessions[0] : null);
            const latestIPO = ppData.ipoHistory.length > 0 ? ppData.ipoHistory[0] : null;

            const isV3 = (ppData.anamnesis as { schemaVersion?: string })?.schemaVersion === "3";
            const isV2 = (ppData.anamnesis as { schemaVersion?: string })?.schemaVersion === "2";
            const v3 = isV3 ? (ppData.anamnesis as PPAnamnesisV3) : null;
            const v2 = isV2 ? (ppData.anamnesis as PPAnamnesisV2) : null;
            const v1 = !isV2 && !isV3 ? (ppData.anamnesis as PPAnamnesisForm) : null;

            const anamneseBloco = v3
                ? buildPPAnamnesisV3PrintHtml(v3, selectedStudent.fullName)
                : `
                <h2 class="section-title">I. ANAMNESE E QUEIXA</h2>
                <div class="box">
                    <div class="data-row"><span class="label">QUEIXA PRINCIPAL:</span> <div class="value">${ppData.diagnosis.queixaPrincipal || v2?.queixaPrincipal || '-'}</div></div>
                    ${v1 ? `
                        <div class="data-row"><span class="label">HISTÓRICO ESCOLAR (V1):</span> <div class="value">${v1.historicoEscolar || '-'}</div></div>
                        <div class="data-row"><span class="label">ROTINA DE ESTUDOS (V1):</span> <div class="value">${v1.rotinaEstudos || '-'}</div></div>
                    ` : `
                        <div class="data-row"><span class="label">ESCOLA ATUAL:</span> <div class="value">${selectedStudent.school.schoolName || '-'}</div></div>
                        <div class="data-row"><span class="label">HÁBITOS / ROTINA:</span> <div class="value">${v2?.habitosRotina || '-'}</div></div>
                        <div class="data-row"><span class="label">RELACIONAMENTO:</span> <div class="value">${v2?.relacionamento || '-'}</div></div>
                    `}
                </div>`;

            const contentHTML = `
                ${anamneseBloco}

                <h2 class="section-title">II. DIAGNÓSTICO PSICOPEDAGÓGICO</h2>
                <div class="box">
                    <div class="data-row"><span class="label">INSTRUMENTOS UTILIZADOS:</span> <div class="value">${ppData.diagnosis.instrumentosUtilizados || '-'}</div></div>
                    <div class="data-row"><span class="label">HIPÓTESE DIAGNÓSTICA:</span> <div class="value">${ppData.diagnosis.hipoteseDiagnostica || '-'}</div></div>
                    <div class="data-row"><span class="label">PARECER INICIAL:</span> <div class="value">${ppData.diagnosis.parecerInicial || '-'}</div></div>
                    <div class="data-row"><span class="label">ENCAMINHAMENTOS:</span> <div class="value">${ppData.diagnosis.encaminhamentos || '-'}</div></div>
                </div>

                ${latestIPO ? `
                <h2 class="section-title">III. ESCALA DE DESENVOLVIMENTO (EXTRATO IPO)</h2>
                <div class="box" style="background: #fdf2f8; border: 1px solid #fbcfe8;">
                    <div class="data-row"><span class="label">DATA DA AVALIAÇÃO:</span> <span class="value">${new Date(latestIPO.date).toLocaleDateString()}</span></div>
                    <div class="data-row"><span class="label">DESEMPENHO GLOBAL:</span> <span class="value" style="color: #db2777; font-weight: bold;">${latestIPO.percentage.toFixed(1)}%</span></div>
                    <div class="data-row"><span class="label">ANÁLISE:</span> <div class="value" style="white-space: pre-wrap;">${latestIPO.autoReport}</div></div>
                </div>
                ` : ''}

                ${session ? `
                <h2 class="section-title">IV. REGISTRO DE ATENDIMENTO / EVOLUÇÃO</h2>
                <div class="box" style="border-left: 4px solid #db2777; background: #fff1f2;">
                    <div class="data-row">
                        <span class="label">DATA:</span> <span class="value">${new Date(session.date).toLocaleDateString()}</span>
                        <span class="label" style="display:inline; margin-left: 20px;">STATUS:</span> <span class="value">${session.status}</span>
                    </div>
                    <div class="data-row"><span class="label">OBJETIVO:</span> <span class="value">${session.objetivo}</span></div>
                    <div class="data-row"><span class="label">ESTRATÉGIAS:</span> <div class="value">${session.estrategias}</div></div>
                    <div class="data-row"><span class="label">EVOLUÇÃO:</span> <span class="value">${session.evolucao}</div></div>
                    <div class="data-row"><span class="label">OBSERVAÇÕES:</span> <div class="value" style="white-space: pre-wrap;">${session.observacoes || '-'}</div></div>
                </div>
                ` : ''}
                `;

            const html = generateClinicalPrintHTML(
                selectedStudent,
                config,
                'Relatório Psicopedagógico',
                contentHTML,
                { name: currentUser.name, jobTitle: currentUser.jobTitle || 'Psicopedagogo(a)', specialty: currentUser.specialty, signatureUrl: currentUser.signatureUrl }
            );

            const printWindow = window.open('', '_blank', 'width=900,height=600');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        } catch (e) {
            console.error(e);
            toastError('Erro ao gerar impressão.');
        }
    };

    const handleDischarge = async () => {
        if (!selectedStudent) return;
        setShowConfirmDischarge(true);
    };

    const confirmDischargeAction = async () => {
        setShowConfirmDischarge(false);

        try {
            // Atualizar status para Alta antes de salvar
            const updatedPpData = { ...ppData, statusAtendimento: 'Alta' as any };
            setPPData(updatedPpData);

            await handleSaveGeneral();
            setTimeout(() => {
                handlePrintPP();
            }, 500);
        } catch (err) {
            console.error('Erro ao processar alta:', err);
            showToast('Falha ao processar alta.', 'error');
        }
    };

    if (!isPP) return <div className="p-8 text-center text-red-600 font-bold">Acesso restrito à Psicopedagogia.</div>;

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn pb-12">

            {/* Header */}
            <div className="rounded-2xl p-8 text-white shadow-xl mb-8 relative overflow-hidden" style={{background:'linear-gradient(to right,#9F5FC0,#D9ABFF)'}}>
                <div className="absolute top-0 right-0 p-8 opacity-10"><Brain size={200} /></div>
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="min-w-0">
                        <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
                            <Brain size={32} /> Psicopedagogia Clínica
                        </h2>
                        <p className="text-pink-100 mt-2">Avaliação, Diagnóstico e Intervenção de Aprendizagem</p>
                    </div>
                    {selectedStudent && (
                        <div className="w-full sm:w-auto max-w-full sm:max-w-xs bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/20">
                            <p className="text-xs uppercase font-bold text-pink-100">Paciente</p>
                            <p className="text-lg sm:text-xl font-bold truncate">{selectedStudent.fullName}</p>
                        </div>
                    )}
                </div>
            </div>

            {!selectedStudent ? (
                <div className="space-y-8 animate-slideUp">
                    {/* Grid de Cards de Resumo */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Card 1: Meus Alunos */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-[#9F5FC0] shrink-0">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Meus Alunos</p>
                                <p className="text-2xl font-extrabold text-slate-800">{myStudentsCount}</p>
                            </div>
                        </div>

                        {/* Card 2: Hoje na Agenda */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-[#7F77DD] shrink-0">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hoje</p>
                                <p className="text-2xl font-extrabold text-slate-800">{todayCount}</p>
                            </div>
                        </div>

                        {/* Card 3: Laudos Pendentes */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                                <FileText size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Laudos Pendentes</p>
                                <p className="text-2xl font-extrabold text-slate-800">{pendingLaudosCount}</p>
                            </div>
                        </div>

                        {/* Card 4: Faltas este Mês */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Faltas no Mês</p>
                                <p className="text-2xl font-extrabold text-slate-800">{absencesCount}</p>
                            </div>
                        </div>
                    </div>

                    {/* Grid de Ações Rápidas */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Ações Rápidas</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button
                                onClick={() => {
                                    const element = document.getElementById('search-central');
                                    if (element) { element.scrollIntoView({ behavior: 'smooth' }); const input = element.querySelector('input'); if (input) input.focus(); }
                                }}
                                className="flex flex-col items-center justify-center p-5 bg-[#EEEDFE]/40 hover:bg-[#EEEDFE] border border-[#EEEDFE] rounded-2xl transition-all duration-300 group text-center shrink-0"
                            >
                                <div className="w-10 h-10 rounded-xl bg-[#EEEDFE] text-[#3C3489] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <FileText size={20} />
                                </div>
                                <span className="text-sm font-bold text-[#3C3489]">Ficha de Anamnese</span>
                                <span className="text-[10px] text-slate-400 mt-1">Buscar e abrir prontuário</span>
                            </button>

                            <button
                                onClick={() => {
                                    const element = document.getElementById('search-central');
                                    if (element) { element.scrollIntoView({ behavior: 'smooth' }); const input = element.querySelector('input'); if (input) input.focus(); }
                                }}
                                className="flex flex-col items-center justify-center p-5 bg-teal-50/40 hover:bg-teal-50 border border-teal-100 rounded-2xl transition-all duration-300 group text-center shrink-0"
                            >
                                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Activity size={20} />
                                </div>
                                <span className="text-sm font-bold text-teal-700">Avaliação Portage</span>
                                <span className="text-[10px] text-slate-400 mt-1">Escala de desenvolvimento</span>
                            </button>

                            <button
                                onClick={() => onNavigate ? onNavigate('scheduling') : (window.location.href = '/app/scheduling')}
                                className="flex flex-col items-center justify-center p-5 bg-emerald-50/40 hover:bg-emerald-50 border border-emerald-100 rounded-2xl transition-all duration-300 group text-center shrink-0"
                            >
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Calendar size={20} />
                                </div>
                                <span className="text-sm font-bold text-emerald-700">Minha Agenda</span>
                                <span className="text-[10px] text-slate-400 mt-1">Ver atendimentos</span>
                            </button>

                            <button
                                onClick={() => onNavigate ? onNavigate('documents') : (window.location.href = '/app/documents')}
                                className="flex flex-col items-center justify-center p-5 bg-amber-50/40 hover:bg-amber-50 border border-amber-100 rounded-2xl transition-all duration-300 group text-center shrink-0"
                            >
                                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Printer size={20} />
                                </div>
                                <span className="text-sm font-bold text-amber-700">Gerar Relatório</span>
                                <span className="text-[10px] text-slate-400 mt-1">Laudos e documentos</span>
                            </button>
                        </div>
                    </div>

                    {/* Layout de Duas Colunas Paralelas */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Coluna da Esquerda: Agenda do Dia */}
                        <div className="lg:col-span-7 space-y-6">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between mb-2">
                                <span className="flex items-center gap-2">
                                    <Calendar size={16} className="text-[#9F5FC0]" /> Hoje na Agenda
                                </span>
                                {upcomingAgenda.length > 0 && (
                                    <span className="text-[10px] bg-[#EEEDFE] text-[#3C3489] px-2.5 py-1 rounded-full font-bold">
                                        {upcomingAgenda.length} agendamentos
                                    </span>
                                )}
                            </h4>

                            {upcomingAgenda.length > 0 ? (
                                <div className="space-y-4">
                                    {upcomingAgenda.map((item, idx) => {
                                        const student = students.find(s => s.id === item.studentId);
                                        if (!student) return null;
                                        const isNext = idx === 0;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleStudentSelect(student.id)}
                                                className={`w-full relative overflow-hidden p-5 rounded-2xl border transition-all duration-300 text-left flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-md ${
                                                    isNext
                                                        ? 'bg-gradient-to-br from-white to-[#EEEDFE]/20 border-[#7F77DD]/30 shadow-sm shadow-[#7F77DD]/5 ring-2 ring-[#7F77DD]/10'
                                                        : 'bg-white border-slate-100 shadow-sm'
                                                }`}
                                            >
                                                <div
                                                    className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold shadow-sm shrink-0 ${
                                                        isNext ? 'bg-[#9F5FC0] text-white' : 'bg-slate-100 text-slate-500'
                                                    }`}
                                                >
                                                    <Clock size={16} className="mb-0.5" />
                                                    <span className="text-xs">{item.session.startTime || '--:--'}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {isNext && (
                                                            <span className="text-[9px] font-black uppercase tracking-tighter text-[#3C3489] py-0.5 px-1.5 bg-[#EEEDFE] rounded leading-none">
                                                                Próximo
                                                            </span>
                                                        )}
                                                        <p className="font-extrabold text-slate-800 truncate">{student.fullName}</p>
                                                    </div>
                                                    <p className="text-xs text-slate-400 truncate">{student.school.schoolName || 'Escola não vinculada'}</p>
                                                </div>
                                                <ChevronRight size={18} className={isNext ? 'text-[#7F77DD]' : 'text-slate-300'} />
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-sm flex flex-col items-center justify-center min-h-[300px] animate-fadeIn">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-4">
                                        <Calendar size={28} />
                                    </div>
                                    <h5 className="text-base font-bold text-slate-700">Agenda livre para hoje</h5>
                                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                        Nenhum atendimento agendado para o dia de hoje. Deseja realizar um novo agendamento na agenda geral?
                                    </p>
                                    <button
                                        onClick={() => onNavigate ? onNavigate('list') : (window.location.href = '/app/list')}
                                        className="mt-6 px-6 py-3 bg-[#9F5FC0] hover:bg-[#8e52ad] text-white rounded-xl font-bold text-sm shadow-md shadow-[#9F5FC0]/20 hover:-translate-y-0.5 transition-all duration-300"
                                    >
                                        Agendar Atendimento
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Coluna da Direita: Central de Busca e Recentes */}
                        <div className="lg:col-span-5 space-y-8">
                            {/* Central de Atendimento */}
                            <div id="search-central" className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 scroll-mt-6">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Search size={14} className="text-[#9F5FC0]" /> Central de Atendimento
                                </h3>

                                {/* FILTRO POR ESCOLA */}
                                <div className="mb-3">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <SchoolIcon size={13} className="text-slate-400" />
                                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Filtrar por escola</span>
                                        {schoolFilter && (
                                            <button onClick={() => setSchoolFilter('')}
                                                className="ml-auto text-[10px] text-[#9F5FC0] hover:underline flex items-center gap-0.5">
                                                <X size={10} /> Limpar
                                            </button>
                                        )}
                                    </div>
                                    <select
                                        value={schoolFilter}
                                        onChange={e => { setSchoolFilter(e.target.value); setSearchTerm(''); }}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:border-[#9F5FC0] focus:ring-2 focus:ring-[#9F5FC0]/10 outline-none">
                                        <option value="">Todas as escolas</option>
                                        {schoolOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                {/* Aviso restrito */}
                                <div className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-[#EEEDFE]/50 rounded-lg border border-[#D9ABFF]/40">
                                    <Lock size={11} className="text-[#534AB7] shrink-0" />
                                    <span className="text-[10px] text-[#534AB7]">Busca restrita aos alunos vinculados pela secretaria</span>
                                </div>

                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#9F5FC0] transition-colors" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Buscar aluno por nome ou CPF..."
                                        className="w-full p-4 pl-12 pr-10 rounded-2xl border border-slate-200 focus:border-[#9F5FC0] focus:ring-4 focus:ring-[#9F5FC0]/5 outline-none transition-all text-sm font-semibold text-slate-700"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>

                                {/* Resultados do filtro por escola sem texto de busca */}
                                {schoolFilter && !searchTerm && filteredStudents.length > 0 && (
                                    <div className="mt-3 space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                                        <p className="text-[11px] text-slate-400 mb-2">{filteredStudents.length} aluno(s) em {schoolFilter}</p>
                                        {filteredStudents.map(student => (
                                            <button key={student.id} onClick={() => handleStudentSelect(student.id)}
                                                className="w-full flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-transparent hover:border-[#D9ABFF] hover:bg-white transition-all text-left group">
                                                <div className="w-8 h-8 rounded-full bg-[#EEEDFE] flex items-center justify-center text-[#3C3489] font-bold text-xs overflow-hidden shrink-0">
                                                    {student.photoUrl ? <img src={student.photoUrl} className="w-full h-full object-cover" alt="" /> : student.fullName.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {(() => {
                                                        const info = sessionsInfo[student.id];
                                                        let urgencyBadge = null;
                                                        if (!info || info.total === 0 || !info.lastDate) {
                                                            urgencyBadge = <span className="bg-[#FCEBEB] text-[#A32D2D] border border-[#F09595] px-1.5 py-0.5 rounded-full text-[9px] font-bold">Sem registro</span>;
                                                        } else {
                                                            const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(info.lastDate).getTime()) / (1000 * 60 * 60 * 24));
                                                            if (diffDays > 30) urgencyBadge = <span className="bg-[#FCEBEB] text-[#A32D2D] border border-[#F09595] px-1.5 py-0.5 rounded-full text-[9px] font-bold">Sem registro há {diffDays} dias</span>;
                                                            else urgencyBadge = <span className="bg-[#EAF3DE] text-[#3B6D11] border border-[#97C459] px-1.5 py-0.5 rounded-full text-[9px] font-bold">Registro recente</span>;
                                                        }
                                                        const sessionsBadge = (info && info.total > 0) ? <span className="bg-[#EEEDFE] text-[#3C3489] border border-[#AFA9EC] px-1.5 py-0.5 rounded-full text-[9px] font-bold">{info.total} sessões</span> : null;
                                                        return (
                                                            <>
                                                                <p className="font-bold text-slate-800 text-xs truncate group-hover:text-[#9F5FC0]">{student.fullName}</p>
                                                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                                    {urgencyBadge}
                                                                    {sessionsBadge}
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{student.school?.schoolName}</p>
                                                </div>
                                                <ChevronRight size={14} className="text-slate-300 group-hover:text-[#7F77DD] shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Resultados da Busca */}
                                {searchTerm && (
                                    <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                        {filteredStudents.length > 0 ? (
                                            filteredStudents.map(student => (
                                                <button
                                                    key={student.id}
                                                    onClick={() => handleStudentSelect(student.id)}
                                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-[#EEEDFE]/30 rounded-xl border border-transparent hover:border-[#7F77DD]/20 transition-all text-left group"
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-[#EEEDFE] text-[#3C3489] flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 shadow-sm">
                                                        {student.photoUrl ? (
                                                            <img src={student.photoUrl} className="w-full h-full object-cover" />
                                                        ) : (
                                                            student.fullName.substring(0, 2).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        {(() => {
                                                            const info = sessionsInfo[student.id];
                                                            let urgencyBadge = null;
                                                            if (!info || info.total === 0 || !info.lastDate) {
                                                                urgencyBadge = <span className="bg-[#FCEBEB] text-[#A32D2D] border border-[#F09595] px-1.5 py-0.5 rounded-full text-[9px] font-bold">Sem registro</span>;
                                                            } else {
                                                                const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(info.lastDate).getTime()) / (1000 * 60 * 60 * 24));
                                                                if (diffDays > 30) urgencyBadge = <span className="bg-[#FCEBEB] text-[#A32D2D] border border-[#F09595] px-1.5 py-0.5 rounded-full text-[9px] font-bold">Sem registro há {diffDays} dias</span>;
                                                                else urgencyBadge = <span className="bg-[#EAF3DE] text-[#3B6D11] border border-[#97C459] px-1.5 py-0.5 rounded-full text-[9px] font-bold">Registro recente</span>;
                                                            }
                                                            const sessionsBadge = (info && info.total > 0) ? <span className="bg-[#EEEDFE] text-[#3C3489] border border-[#AFA9EC] px-1.5 py-0.5 rounded-full text-[9px] font-bold">{info.total} sessões</span> : null;
                                                            return (
                                                                <>
                                                                    <p className="font-bold text-xs text-slate-700 truncate group-hover:text-[#3C3489]">{student.fullName}</p>
                                                                    <div className="flex items-center gap-1 mt-1 mb-0.5 flex-wrap">
                                                                        {urgencyBadge}
                                                                        {sessionsBadge}
                                                                    </div>
                                                                </>
                                                            );
                                                        })()}
                                                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{calculateAge(student.birthDate)} anos • {student.school.schoolName || 'Sem Escola'}</p>
                                                    </div>
                                                    <ChevronRight size={14} className="text-slate-300 group-hover:text-[#7F77DD] transform group-hover:translate-x-0.5 transition-all" />
                                                </button>
                                            ))
                                        ) : (
                                            <div className="py-4 text-center text-xs text-slate-400 font-medium">
                                                Nenhum aluno encontrado para "{searchTerm}"
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Pacientes Recentes */}
                            {!searchTerm && recentActivity.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <History size={14} className="text-[#9F5FC0]" /> Atendimentos Recentes
                                    </h4>
                                    <div className="space-y-3">
                                        {recentActivity.slice(0, 3).map((activity, idx) => {
                                            const student = students.find(s => s.id === activity.studentId);
                                            if (!student) return null;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleStudentSelect(student.id)}
                                                    className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 text-left flex items-start justify-between gap-3"
                                                >
                                                    <div className="flex gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9F5FC0] to-[#7F77DD] flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                                                            {student.fullName.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-xs text-slate-700 truncate">{student.fullName}</p>
                                                            <p className="text-[10px] text-slate-400 mt-0.5 italic line-clamp-1">"{activity.session.objetivo}"</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full shrink-0">
                                                        {new Date(activity.session.date).toLocaleDateString()}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col sm:flex-row">

                    {/* Sidebar Tabs */}
                    <div className="w-full sm:w-64 bg-slate-50 border-b sm:border-b-0 sm:border-r border-slate-200 flex flex-col">
                        <div className="px-3 py-2.5 border-b border-slate-200 flex items-center gap-2">
                            <FileText size={13} className="text-[#8B1A3A]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prontuário clínico</span>
                        </div>
                        <div className="flex flex-col">
                        {(() => {
                            const anamnesisV3 = (ppData.anamnesis as { schemaVersion?: string })?.schemaVersion === '3' ? ppData.anamnesis as any : null;
                            const anamPct = anamnesisV3 ? Math.round(
                                [anamnesisV3.identificacaoCrianca?.nome, anamnesisV3.responsaveisContextoFamiliar?.nomeMae || anamnesisV3.responsaveisContextoFamiliar?.nomePai, anamnesisV3.queixaHistorico?.queixaPrincipal, anamnesisV3.contextoEscolarAprendizagem?.rotinaEscolar || anamnesisV3.contextoEscolarAprendizagem?.areasMaiorDificuldade, anamnesisV3.comunicacaoLinguagemCognitivo?.verbal, anamnesisV3.comportamentoInteracaoRegulacao?.sensibilidadeSensorial, anamnesisV3.autonomiaVidaDiaria?.controleEsfincteres, anamnesisV3.rotinaSonoHabitos?.rotinaDetalhadaSemanaFimSemana, anamnesisV3.gestacaoPartoDesenvolvimento?.partoTipo || anamnesisV3.gestacaoPartoDesenvolvimento?.observacoesGravidez, anamnesisV3.saudeAcompanhamentos?.profissionaisQueAcompanham, anamnesisV3.fechamento?.observacoesFinaisPsicopedagoga || anamnesisV3.fechamento?.realizadaCom]
                                .filter(Boolean).length / 11 * 100
                            ) : null;
                            const diagPct = [ppData.diagnosis?.queixaPrincipal, ppData.diagnosis?.hipoteseDiagnostica].filter(Boolean).length > 0 ? 100 : 0;
                            const sessCount = ppData.sessions?.length || 0;
                            const tabs = [
                                { id: 'anamnesis', label: 'Anamnese', sub: 'Coleta de dados', icon: Users, pct: anamPct },
                                { id: 'diagnostic', label: 'Diagnóstico', sub: 'Hipótese e CID', icon: FileText, pct: diagPct },
                                { id: 'sessions', label: 'Atendimentos', sub: sessCount > 0 ? `${sessCount} sessões registradas` : 'Sessões e evolução', icon: History, pct: sessCount > 0 ? 100 : 0 },
                                { id: 'ipo', label: 'Avaliação Portage', sub: 'Escala de desenvolvimento', icon: BarChart2, pct: null },
                                { id: 'reports', label: 'Relatórios', sub: 'Laudos e documentos', icon: Printer, pct: null },
                            ];
                            return tabs.map(tab => {
                                const isActive = activeTab === tab.id;
                                const isDone = tab.pct === 100;
                                const pctColor = tab.pct === null ? null : tab.pct === 100 ? '#10B981' : tab.pct >= 50 ? '#EF9F27' : '#E24B4A';
                                const pctBg = tab.pct === null ? null : tab.pct === 100 ? '#EAF3DE' : tab.pct >= 50 ? '#FAEEDA' : '#FCEBEB';
                                const pctText = tab.pct === null ? null : tab.pct === 100 ? '#3B6D11' : tab.pct >= 50 ? '#854F0B' : '#A32D2D';
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`min-h-[44px] px-3 py-3 flex items-center gap-3 text-left transition-all border-l-[3px] ${isActive ? 'border-[#8B1A3A] bg-white' : isDone ? 'border-[#97C459] hover:bg-white/60' : 'border-transparent hover:bg-white/60'}`}
                                    >
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${isActive ? 'bg-[#8B1A3A] text-white' : isDone ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-slate-100 text-slate-400'}`}>
                                            {isDone && !isActive ? <CheckCircle size={14} /> : <tab.icon size={14} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-xs font-bold truncate ${isActive ? 'text-[#8B1A3A]' : 'text-slate-700'}`}>{tab.label}</div>
                                            <div className="text-[10px] text-slate-400 truncate">{tab.sub}</div>
                                        </div>
                                        {tab.pct !== null && (
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: pctBg!, color: pctText! }}>{tab.pct}%</span>
                                                <div className="w-8 h-1 rounded-full bg-slate-200 overflow-hidden">
                                                    <div className="h-full rounded-full transition-all" style={{ width: `${tab.pct}%`, background: pctColor! }} />
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                );
                            });
                        })()}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-4 sm:p-8 bg-slate-50/50 min-w-0">

                        {/* TAB 1: DIAGNÓSTICO */}
                        {activeTab === 'diagnostic' && (
                            <div className="space-y-4 animate-fadeIn">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><FileText size={16} className="text-[#8B1A3A]" /> Queixa e Diagnóstico</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">{selectedStudent?.fullName}</p>
                                    </div>
                                    <button onClick={handleSaveGeneral} className="w-full sm:w-auto bg-[#8B1A3A] hover:bg-[#731530] text-white px-5 py-2 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all shadow-sm"><Save size={15} /> Salvar</button>
                                </div>

                                {/* Autosave status */}
                                <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl bg-[#EAF3DE] text-[#3B6D11] border border-[#97C459] font-bold">
                                    <CheckCircle size={12} /> Alterações salvas automaticamente ao clicar em Salvar
                                </div>

                                {/* Bloco 1: Queixa */}
                                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                        <MessageCircle size={13} className="text-[#8B1A3A]" /> Queixa apresentada pela família
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Queixa principal</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Descreva a queixa com as palavras da família..."
                                            className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all resize-none border ${ppData.diagnosis.queixaPrincipal ? 'bg-[#EAF3DE] border-[#97C459] text-[#27500A]' : 'bg-white border-slate-200 text-slate-800'} focus:border-[#8B1A3A] focus:bg-[#fdf8f9] focus:ring-1 focus:ring-[#8B1A3A]/20`}
                                            value={ppData.diagnosis.queixaPrincipal}
                                            onChange={(e) => updateDiagnosis('queixaPrincipal', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Queixa secundária</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: agitação, dificuldade de atenção..."
                                            className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all border ${ppData.diagnosis.queixaSecundaria ? 'bg-[#EAF3DE] border-[#97C459] text-[#27500A]' : 'bg-white border-slate-200 text-slate-800'} focus:border-[#8B1A3A] focus:bg-[#fdf8f9] focus:ring-1 focus:ring-[#8B1A3A]/20`}
                                            value={ppData.diagnosis.queixaSecundaria}
                                            onChange={(e) => updateDiagnosis('queixaSecundaria', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Contexto da demanda</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Ex: encaminhado pela escola, iniciativa da família..."
                                            className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all resize-none border ${ppData.diagnosis.contextoDemanda ? 'bg-[#EAF3DE] border-[#97C459] text-[#27500A]' : 'bg-white border-slate-200 text-slate-800'} focus:border-[#8B1A3A] focus:bg-[#fdf8f9] focus:ring-1 focus:ring-[#8B1A3A]/20`}
                                            value={ppData.diagnosis.contextoDemanda}
                                            onChange={(e) => updateDiagnosis('contextoDemanda', e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Bloco 2: Instrumentos */}
                                <div className="bg-white border border-slate-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                                        <Activity size={13} className="text-[#8B1A3A]" /> Instrumentos e procedimentos
                                    </div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Instrumentos utilizados</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Ex: Anamnese, Escala Portage, provas pedagógicas, observação clínica..."
                                        className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all resize-none border ${ppData.diagnosis.instrumentosUtilizados ? 'bg-[#EAF3DE] border-[#97C459] text-[#27500A]' : 'bg-white border-slate-200 text-slate-800'} focus:border-[#8B1A3A] focus:bg-[#fdf8f9] focus:ring-1 focus:ring-[#8B1A3A]/20`}
                                        value={ppData.diagnosis.instrumentosUtilizados}
                                        onChange={(e) => updateDiagnosis('instrumentosUtilizados', e.target.value)}
                                    />
                                </div>

                                {/* Bloco 3: Hipótese — área crítica */}
                                <div className="bg-[#fdf8f9] border border-[#e8c4ce] rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-[#8B1A3A] uppercase tracking-widest mb-1">
                                        <Brain size={13} /> Hipótese diagnóstica — área crítica
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Hipótese diagnóstica psicopedagógica</label>
                                        <textarea
                                            rows={3}
                                            placeholder="Hipótese baseada nos dados coletados — não é diagnóstico médico..."
                                            className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all resize-none border ${ppData.diagnosis.hipoteseDiagnostica ? 'bg-[#fdf8f9] border-[#e8c4ce] text-[#5a1128]' : 'bg-white border-slate-200 text-slate-800'} focus:border-[#8B1A3A] focus:ring-1 focus:ring-[#8B1A3A]/20`}
                                            value={ppData.diagnosis.hipoteseDiagnostica}
                                            onChange={(e) => updateDiagnosis('hipoteseDiagnostica', e.target.value)}
                                        />
                                    </div>

                                    {/* CID + Nível lado a lado */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">CID-10 / CID-11 suspeito</label>
                                            <input
                                                type="text"
                                                placeholder="Ex: F81.0, F90.0..."
                                                className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all border ${ppData.diagnosis.cidSuspeitos ? 'bg-[#EEEDFE] border-[#AFA9EC] text-[#3C3489]' : 'bg-white border-slate-200 text-slate-800'} focus:border-[#8B1A3A] focus:ring-1 focus:ring-[#8B1A3A]/20`}
                                                value={ppData.diagnosis.cidSuspeitos || ''}
                                                onChange={(e) => updateDiagnosis('cidSuspeitos', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nível de comprometimento</label>
                                            <div className="flex gap-2">
                                                {(['Leve', 'Moderado', 'Severo'] as const).map(nivel => (
                                                    <button
                                                        key={nivel}
                                                        type="button"
                                                        onClick={() => updateDiagnosis('nivelComprometimento', ppData.diagnosis.nivelComprometimento === nivel ? '' : nivel)}
                                                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${ppData.diagnosis.nivelComprometimento === nivel
                                                            ? nivel === 'Leve' ? 'bg-[#EAF3DE] text-[#3B6D11] border border-[#97C459]'
                                                            : nivel === 'Moderado' ? 'bg-[#8B1A3A] text-white'
                                                            : 'bg-[#FCEBEB] text-[#A32D2D] border border-[#F09595]'
                                                            : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                                    >
                                                        {nivel}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Parecer inicial</label>
                                        <textarea
                                            rows={3}
                                            placeholder="Recomendações, encaminhamentos sugeridos, plano inicial..."
                                            className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all resize-none border ${ppData.diagnosis.parecerInicial ? 'bg-[#fdf8f9] border-[#e8c4ce] text-[#5a1128]' : 'bg-white border-slate-200 text-slate-800'} focus:border-[#8B1A3A] focus:ring-1 focus:ring-[#8B1A3A]/20`}
                                            value={ppData.diagnosis.parecerInicial}
                                            onChange={(e) => updateDiagnosis('parecerInicial', e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Bloco 4: Encaminhamentos */}
                                <div className="bg-white border border-slate-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                                        <Send size={13} className="text-[#8B1A3A]" /> Encaminhamentos
                                    </div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Encaminhamentos iniciais</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Neurologista pediátrico, psicólogo escolar..."
                                        className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all border ${ppData.diagnosis.encaminhamentos ? 'bg-[#EAF3DE] border-[#97C459] text-[#27500A]' : 'bg-white border-slate-200 text-slate-800'} focus:border-[#8B1A3A] focus:bg-[#fdf8f9] focus:ring-1 focus:ring-[#8B1A3A]/20`}
                                        value={ppData.diagnosis.encaminhamentos}
                                        onChange={(e) => updateDiagnosis('encaminhamentos', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* TAB 2: ANAMNESE */}
                        {activeTab === 'anamnesis' && (
                            <div className="space-y-6 animate-fadeIn pb-32">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 pr-4">
                                        <Users className="text-pink-600" /> Anamnese Psicopedagógica
                                    </h3>
                                    <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-end w-full sm:w-auto">
                                        {(ppData.anamnesis as { schemaVersion?: string })?.schemaVersion === "2" && (
                                            <button
                                                onClick={handleMigrateV2ToV3}
                                                className="w-full sm:w-auto bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-200 transition-all text-xs"
                                            >
                                                <Zap size={16} /> Migrar V2 → ficha atual (v3)
                                            </button>
                                        )}
                                        {!((ppData.anamnesis as { schemaVersion?: string })?.schemaVersion === "2" || (ppData.anamnesis as { schemaVersion?: string })?.schemaVersion === "3") && (
                                            <button
                                                onClick={handleMigrateV1ToV3}
                                                className="w-full sm:w-auto bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-200 transition-all text-xs"
                                            >
                                                <Zap size={16} /> Migrar legado (V1) → v3
                                            </button>
                                        )}
                                        <button onClick={handleSaveGeneral} className="w-full sm:w-auto bg-pink-600 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-pink-700 shadow-lg shadow-pink-200"><Save size={18} /> Salvar Ficha</button>
                                    </div>
                                </div>

                                {(ppData.anamnesis as { schemaVersion?: string })?.schemaVersion === "3" ? (
                                    <PPAnamnesisV3Form
                                        data={ppData.anamnesis as PPAnamnesisV3}
                                        onChange={updateAnamnesisV3}
                                        onSave={handleSaveGeneral}
                                        student={selectedStudent}
                                        onCadastroSync={(mode) => {
                                            if (!selectedStudent) return;
                                            setPPData((prev) => ({
                                                ...prev,
                                                anamnesis: mergePsychopedagogyAnamnesisV3WithStudentCadastro(
                                                    prev.anamnesis as PPAnamnesisV3,
                                                    selectedStudent,
                                                    mode
                                                ),
                                            }));
                                        }}
                                    />
                                ) : (ppData.anamnesis as { schemaVersion?: string })?.schemaVersion === "2" ? (
                                    <PPAnamnesisV2Form
                                        data={ppData.anamnesis as PPAnamnesisV2}
                                        onChange={updateAnamnesisV2}
                                        student={selectedStudent}
                                    />
                                ) : (
                                    <div className="grid grid-cols-1 gap-6">
                                        <PPAnamnesisV1LegacyView
                                            data={ppData.anamnesis as PPAnamnesisForm}
                                            onMigrate={handleMigrateV1ToV3}
                                        />

                                        {/* Fallback View original caso o profissional prefira editar antes de migrar */}
                                        <div className="mt-8 border-t border-slate-100 pt-8">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Editor de Texto Livre (Modo V1)</p>
                                            <div className="grid grid-cols-1 gap-6 opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all">
                                                <FormSection title="Histórico e Desenvolvimento" icon={Baby} color="text-pink-700">
                                                    <StyledInput label="Histórico Gestacional e Marcos do Desenvolvimento" rows={4} value={(ppData.anamnesis as PPAnamnesisForm).historicoGestacional} onChange={(e: any) => setPPData(prev => ({ ...prev, anamnesis: { ...prev.anamnesis, historicoGestacional: e.target.value } as any }))} />
                                                </FormSection>
                                                {/* Outros campos V1 omitidos para brevidade mas mantive o estado p/ não quebrar */}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: SESSÕES */}
                        {activeTab === 'sessions' && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><History size={16} className="text-[#8B1A3A]" /> Registro de Atendimentos</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">{selectedStudent?.fullName} · {ppData.sessions.length} sessões registradas</p>
                                    </div>
                                    {!isEditingSession && (
                                        <button onClick={() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setIsEditingSession(true);
    setCurrentSession({
        date: now.toISOString().split('T')[0],
        startTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
        endTime: `${pad(now.getHours() + 1)}:${pad(now.getMinutes())}`,
        status: 'Realizado',
        humor: 'Neutro'
    });
}} className="w-full sm:w-auto bg-[#8B1A3A] hover:bg-[#731530] text-white px-5 py-2 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all shadow-sm"><Plus size={15} /> Nova Sessão</button>
                                    )}
                                </div>

                                {isEditingSession ? (
                                    <div className="space-y-3 animate-slideUp">

                                        {/* Header da sessão */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">{currentSession.id ? 'Editar sessão' : `Nova sessão — #${ppData.sessions.length + 1}`}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">{selectedStudent?.fullName}</div>
                                            </div>
                                            {ppData.sessions.length > 0 && (
                                                <span className="text-[10px] bg-[#EEEDFE] text-[#3C3489] border border-[#AFA9EC] px-2.5 py-1 rounded-full font-bold">{ppData.sessions.length} sessões anteriores</span>
                                            )}
                                        </div>

                                        {/* Resumo da última sessão */}
                                        {!currentSession.id && ppData.sessions.length > 0 && (
                                            <div className="bg-[#E6F1FB] border border-[#85B7EB] rounded-xl p-3">
                                                <div className="flex items-center gap-2 text-xs font-bold text-[#185FA5] mb-2">
                                                    <History size={13} /> Última sessão — {new Date(ppData.sessions[0].date).toLocaleDateString('pt-BR')}
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {ppData.sessions[0].objetivo && (
                                                        <div className="text-xs text-[#0C447C]">
                                                            <span className="font-bold">Objetivo:</span> {ppData.sessions[0].objetivo}
                                                        </div>
                                                    )}
                                                    {ppData.sessions[0].evolucao && (
                                                        <div className="text-xs text-[#0C447C]">
                                                            <span className="font-bold">Evolução:</span> {ppData.sessions[0].evolucao}
                                                        </div>
                                                    )}
                                                    {ppData.sessions[0].estrategias && (
                                                        <div className="text-xs text-[#0C447C]">
                                                            <span className="font-bold">Estratégias:</span> {ppData.sessions[0].estrategias}
                                                        </div>
                                                    )}
                                                    {!ppData.sessions[0].objetivo && !ppData.sessions[0].evolucao && (
                                                        <div className="text-xs text-[#185FA5] italic">{ppData.sessions[0].observacoes || 'Sem detalhes registrados'}</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Bloco 1: Detalhes */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                                                <Calendar size={13} className="text-[#8B1A3A]" /> Detalhes da sessão
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Data</label>
                                                    <input type="date" className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all border ${currentSession.date ? 'bg-[#EAF3DE] border-[#97C459] text-[#27500A]' : 'bg-white border-slate-200'} focus:border-[#8B1A3A] focus:bg-[#fdf8f9] focus:ring-1 focus:ring-[#8B1A3A]/20`}
                                                        value={currentSession.date || ''} onChange={(e) => setCurrentSession({ ...currentSession, date: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Hora início</label>
                                                    <input type="time" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all border bg-white border-slate-200 focus:border-[#8B1A3A] focus:bg-[#fdf8f9] focus:ring-1 focus:ring-[#8B1A3A]/20"
                                                        value={currentSession.startTime || ''} onChange={(e) => setCurrentSession({ ...currentSession, startTime: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Hora fim</label>
                                                    <input type="time" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all border bg-white border-slate-200 focus:border-[#8B1A3A] focus:bg-[#fdf8f9] focus:ring-1 focus:ring-[#8B1A3A]/20"
                                                        value={currentSession.endTime || ''} onChange={(e) => setCurrentSession({ ...currentSession, endTime: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Status da sessão</label>
                                                    <div className="flex gap-2">
                                                        {(['Realizado','Falta','Justificada'] as const).map(s => (
                                                            <button key={s} type="button" onClick={() => setCurrentSession({...currentSession, status: s})}
                                                                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all border"
                                                                style={currentSession.status === s
                                                                    ? s==='Realizado' ? {background:'#EAF3DE',color:'#3B6D11',borderColor:'#97C459'}
                                                                    : s==='Falta' ? {background:'#FCEBEB',color:'#A32D2D',borderColor:'#F09595'}
                                                                    : {background:'#FAEEDA',color:'#854F0B',borderColor:'#EF9F27'}
                                                                    : {background:'white',borderColor:'#e2e8f0',color:'#94a3b8'}}>
                                                                {s}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Humor do aluno</label>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {(['Feliz','Neutro','Agitado','Triste','Cansado'] as const).map(h => (
                                                            <button key={h} type="button" onClick={() => setCurrentSession({...currentSession, humor: h})}
                                                                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all border min-w-[60px]"
                                                                style={currentSession.humor === h
                                                                    ? h==='Feliz' ? {background:'#EAF3DE',color:'#3B6D11',borderColor:'#97C459'}
                                                                    : h==='Agitado' ? {background:'#FAEEDA',color:'#854F0B',borderColor:'#EF9F27'}
                                                                    : h==='Triste' ? {background:'#E6F1FB',color:'#185FA5',borderColor:'#85B7EB'}
                                                                    : h==='Cansado' ? {background:'#FCEBEB',color:'#A32D2D',borderColor:'#F09595'}
                                                                    : {background:'#f1f5f9',color:'#64748b',borderColor:'#e2e8f0'}
                                                                    : {background:'white',borderColor:'#e2e8f0',color:'#94a3b8'}}>
                                                                {h}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bloco 2: Conteúdo clínico */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                <FileText size={13} className="text-[#8B1A3A]" /> Conteúdo clínico
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Objetivo da sessão</label>
                                                <input type="text" placeholder="O que você planejou trabalhar nesta sessão?"
                                                    className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all border ${currentSession.objetivo ? 'bg-[#EAF3DE] border-[#97C459] text-[#27500A]' : 'bg-white border-slate-200'} focus:border-[#8B1A3A] focus:bg-[#fdf8f9] focus:ring-1 focus:ring-[#8B1A3A]/20`}
                                                    value={currentSession.objetivo || ''} onChange={(e) => setCurrentSession({...currentSession, objetivo: e.target.value})} />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Estratégias / instrumentos</label>
                                                    <textarea rows={3} placeholder="Materiais e estratégias utilizados..."
                                                        className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all resize-none border ${currentSession.estrategias ? 'bg-[#EAF3DE] border-[#97C459] text-[#27500A]' : 'bg-white border-slate-200'} focus:border-[#8B1A3A] focus:bg-[#fdf8f9] focus:ring-1 focus:ring-[#8B1A3A]/20`}
                                                        value={currentSession.estrategias || ''} onChange={(e) => setCurrentSession({...currentSession, estrategias: e.target.value})} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Observações clínicas</label>
                                                    <textarea rows={3} placeholder="Notas privadas da profissional..."
                                                        className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all resize-none border ${currentSession.observacoes ? 'bg-[#EAF3DE] border-[#97C459] text-[#27500A]' : 'bg-white border-slate-200'} focus:border-[#8B1A3A] focus:bg-[#fdf8f9] focus:ring-1 focus:ring-[#8B1A3A]/20`}
                                                        value={currentSession.observacoes || ''} onChange={(e) => setCurrentSession({...currentSession, observacoes: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bloco 3: Evolução — área crítica */}
                                        <div className="bg-[#fdf8f9] border border-[#e8c4ce] rounded-xl p-4">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-[#8B1A3A] uppercase tracking-widest mb-3">
                                                <TrendingUp size={13} /> Evolução percebida — área crítica
                                            </div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Descrição da evolução</label>
                                            <textarea ref={evolutionInputRef} rows={4}
                                                placeholder="Descreva o que evoluiu, o que ainda precisa de atenção e o encaminhamento para a próxima sessão..."
                                                className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all resize-none border-2 ${currentSession.evolucao ? 'bg-[#fdf8f9] border-[#e8c4ce] text-[#5a1128]' : 'bg-white border-[#e8c4ce]'} focus:border-[#8B1A3A] focus:ring-1 focus:ring-[#8B1A3A]/20`}
                                                value={currentSession.evolucao || ''} onChange={(e) => setCurrentSession({...currentSession, evolucao: e.target.value})} />
                                            <p className="text-[10px] text-slate-400 italic mt-1.5">Campo mais importante — descreva com detalhes para orientar a próxima sessão</p>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex justify-between items-center pt-2">
                                            <button onClick={() => setIsEditingSession(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition-all border border-slate-200">Cancelar</button>
                                            <div className="flex gap-2">

                                                <button onClick={handleSaveSession} className="px-6 py-2.5 bg-[#8B1A3A] hover:bg-[#731530] text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2">
                                                    <Save size={14} /> Salvar sessão
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-[#E6F1FB] p-4 rounded-xl border border-[#85B7EB] text-sm">
                                            <span className="font-bold text-[#185FA5]">Hipótese diagnóstica:</span> <span className="text-[#0C447C]">{ppData.diagnosis.hipoteseDiagnostica || 'Sem hipótese definida.'}</span>
                                        </div>
                                        {ppData.sessions.length === 0 ? (
                                            <p className="text-center text-slate-400 py-10">Nenhum atendimento registrado.</p>
                                        ) : (
                                            ppData.sessions.map((sess, idx) => (
                                                <details key={idx} className="bg-slate-200 p-6 rounded-2xl border-2 border-slate-300 hover:border-slate-500 transition-all shadow-sm group cursor-pointer">
                                                    <summary className="flex justify-between items-start list-none outline-none">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-black text-slate-900 text-lg">{new Date(sess.date).toLocaleDateString()}</span>
                                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide border ${sess.status === 'Realizado' ? 'bg-emerald-200 text-emerald-900 border-emerald-300' : 'bg-rose-200 text-rose-900 border-rose-300'}`}>{sess.status}</span>
                                                            <span className="text-[10px] bg-slate-300 text-slate-800 px-2.5 py-1 rounded-md border border-slate-400 font-bold uppercase">{sess.humor}</span>
                                                        </div>
                                                        <div className="flex gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={(e) => { e.preventDefault(); handlePrintPP(sess); }} className="min-h-[44px] min-w-[44px] text-slate-500 hover:text-slate-800 transition-all p-2 hover:bg-slate-300 rounded-lg" title="Imprimir registro"><Printer size={18} /></button>
                                                            <button onClick={(e) => { e.preventDefault(); setCurrentSession(sess); setIsEditingSession(true); }} className="min-h-[44px] min-w-[44px] text-slate-500 hover:text-slate-800 transition-all p-2 hover:bg-slate-300 rounded-lg"><Edit2 size={18} /></button>
                                                        </div>
                                                    </summary>
                                                    <div className="space-y-3 mt-4 pt-4 border-t border-slate-300/50">
                                                        <p className="text-sm text-slate-800 bg-slate-100 p-3 rounded-lg border border-slate-300 font-medium"><strong>Objetivo:</strong> {sess.objetivo}</p>
                                                        {sess.estrategias && <p className="text-sm text-slate-700 px-1"><strong>Estratégias:</strong> {sess.estrategias}</p>}
                                                        {sess.evolucao && <p className="text-sm text-slate-700 px-1"><strong>Evolução Percebida:</strong> {sess.evolucao}</p>}
                                                        <p className="text-sm text-slate-600 px-1"><strong>Obs:</strong> {sess.observacoes}</p>
                                                    </div>
                                                </details>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 4: IPO - PORTAGE */}
                        {activeTab === 'ipo' && (
                            selectedStudent ? (
                                <PortageCalculator
                                    student={selectedStudent}
                                    currentUser={currentUser}
                                    onSave={(assessment) => {
                                        // Mock de salvamento local para feedback imediato
                                        // Em produção, isso iria para o SupabaseService
                                        showToast("Avaliação salva com sucesso!", "success");
                                    }}
                                />
                            ) : (
                                <div className="h-[500px] flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200 m-8">
                                    <BarChart2 size={64} className="mb-6 opacity-20 text-slate-500" />
                                    <h3 className="text-lg font-bold text-slate-500 mb-2">Calculadora IPO - Portage</h3>
                                    <p className="max-w-xs text-center text-sm text-slate-400">Selecione um aluno na lista lateral para iniciar uma nova avaliação ou visualizar o histórico.</p>
                                </div>
                            )
                        )}

                        {/* TAB 5: RELATÓRIOS (Central Unificada) */}
                        {activeTab === 'reports' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Printer className="text-pink-600" /> Central de Relatórios</h3>
                                </div>
                                <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-slate-200">
                                    <FileText size={48} className="mx-auto text-pink-200 mb-4" />
                                    <h4 className="font-bold text-slate-700 mb-2">Relatório Sintético Psicopedagógico</h4>
                                    <p className="text-slate-500 mb-8 max-w-md mx-auto">Gere um documento oficial contendo dados de anamnese, diagnóstico e o extrato da última avaliação IPO realizada.</p>
                                    <button
                                        onClick={() => handlePrintPP()}
                                        className="px-8 py-3 bg-pink-600 text-white rounded-xl font-bold shadow-lg hover:bg-pink-700 transition-all flex items-center gap-2 mx-auto"
                                    >
                                        <Printer size={20} /> Imprimir Relatório Completo
                                    </button>

                                    <div className="mt-12 pt-8 border-t border-slate-100">
                                        <h4 className="text-rose-600 font-bold mb-2 flex items-center justify-center gap-2">
                                            <CheckCircle size={18} /> Encerramento de Processo
                                        </h4>
                                        <p className="text-slate-500 text-xs mb-6 max-w-xs mx-auto">Clique abaixo para oficializar a alta e gerar o documento de desligamento.</p>
                                        <button
                                            onClick={handleDischarge}
                                            className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-xl hover:bg-rose-700 transition-all flex items-center gap-3 mx-auto uppercase tracking-wider text-xs shadow-rose-200"
                                        >
                                            <CheckCircle size={18} /> Dar Alta e Gerar Relatório Final
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* P1: Modal Pós-Salvamento */}
            {showPostSaveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center animate-slideUp border border-slate-100">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-[#10B981]">
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">Sessão Salva com Sucesso!</h3>
                        <p className="text-sm text-slate-500 mb-8">O que você deseja fazer agora?</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => { setShowPostSaveModal(false); setIsEditingSession(false); setCurrentSession({}); if (onNavigate) { onNavigate('scheduling'); } else if (onNavigateNew) { onNavigateNew(); } }} className="w-full px-5 py-3 font-black text-white bg-[#8B1A3A] hover:bg-[#72142e] rounded-xl shadow-md transition-all">
                                Agendar Próxima Sessão
                            </button>
                            <button onClick={() => { setShowPostSaveModal(false); setIsEditingSession(false); setCurrentSession({}); }} className="w-full px-5 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                                Concluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium UI Overlay Systems */}


            {confirmModal && (
                <PremiumConfirmModal
                    title={confirmModal.title}
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}
        </div>
    );
};

// --- DASHBOARD ESPECIALIZADO DE FONOAUDIOLOGIA ---
const SpeechTherapySpecificDashboard: React.FC<BaseDashboardProps & { preSelectedStudent?: Student; autoOpenSession?: boolean }> = ({ title, onNavigateNew, currentUser, preSelectedStudent, autoOpenSession }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(preSelectedStudent || null);
    const [speechData, setSpeechData] = useState<SpeechPrivateData>(initialSpeechData);
    const [activeTab, setActiveTab] = useState<'anamnese' | 'avaliacao' | 'sessions' | 'history' | 'reports'>('anamnese');
    const [isEditingSession, setIsEditingSession] = useState(false);
    const [currentSession, setCurrentSession] = useState<Partial<SpeechSession>>({});
    const [loading, setLoading] = useState(false);
    const { success: showToast, error: toastError } = useToast();
    const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
    const [showConfirmDischarge, setShowConfirmDischarge] = useState(false);

    useEffect(() => {
        if (preSelectedStudent) setSelectedStudent(preSelectedStudent);
    }, [preSelectedStudent]);

    const isSpeech = currentUser.specialty === Specialty.SPEECH_THERAPY || currentUser.role === 'ADMIN';

    useAgendaClinicalDeepLink(setLoading, toastError, (full, openTab) => {
        setSelectedStudent(full);
        const tabs = ['anamnese', 'avaliacao', 'sessions', 'history', 'reports'] as const;
        const ok = tabs.find((x) => x === openTab);
        setActiveTab(ok ?? 'anamnese');
        setIsEditingSession(false);
    });

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await SupabaseService.getStudentsForUser(currentUser);
            setStudents(data);
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        if (selectedStudent && isSpeech) {
            setSpeechData(extractSpeechData(selectedStudent));
            if (autoOpenSession) {
                setActiveTab('sessions');
                setIsEditingSession(true);
            }
        }
    }, [selectedStudent, isSpeech, autoOpenSession]);

    const handleSaveGeneral = async () => {
        if (!selectedStudent) return;
        try {
            const updatedStudent = {
                ...selectedStudent,
                clinical: {
                    ...selectedStudent.clinical,
                    st_data: {
                        anamnese: speechData.anamnese,
                        avaliacao: speechData.avaliacao,
                        examsHistory: speechData.examsHistory,
                        statusAtendimento: speechData.statusAtendimento
                    }
                }
            };
            await SupabaseService.saveStudent(updatedStudent);
            setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
            setSelectedStudent(updatedStudent);
            showToast('Dados salvos com sucesso!');
        } catch (error) {
            console.error(error);
            toastError('Erro ao salvar dados.');
        }
    };

    const handleSaveSession = async () => {
        if (!selectedStudent) return;
        const newSession: SpeechSession = {
            id: currentSession.id || crypto.randomUUID(),
            date: currentSession.date || new Date().toISOString().split('T')[0],
            objetivo: currentSession.objetivo || '',
            atividades: currentSession.atividades || '',
            fonemasTrabalhados: currentSession.fonemasTrabalhados || '',
            observacoes: currentSession.observacoes || '',
            evolucao: currentSession.evolucao || 'Estável',
            participacao: currentSession.participacao || 'Ativo'
        };

        const genericSession: Session = {
            id: newSession.id,
            date: newSession.date,
            specialty: Specialty.SPEECH_THERAPY,
            professionalName: currentUser.name,
            notes: newSession.objetivo,
            content: newSession,
            privateNotes: newSession.observacoes
        };

        try {
            await SupabaseService.saveSession(genericSession, selectedStudent.id, currentUser.id);
            const updatedSessions = currentSession.id
                ? speechData.sessions.map(s => s.id === currentSession.id ? newSession : s)
                : [newSession, ...speechData.sessions];

            setSpeechData({ ...speechData, sessions: updatedSessions });
            setIsEditingSession(false);
            setCurrentSession({});
            showToast('Sessão salva!', 'success');
        } catch (e) {
            console.error(e);
            toastError('Erro ao salvar sessão.');
        }
    };

    const handleDischarge = async () => {
        if (!selectedStudent) return;
        setShowConfirmDischarge(true);
    };

    const confirmDischargeAction = async () => {
        setShowConfirmDischarge(false);

        try {
            await handleSaveGeneral();
            setTimeout(() => {
                handlePrintSpeech();
            }, 500);
        } catch (err) {
            console.error('Erro ao processar alta:', err);
            toastError('Falha ao processar alta.');
        }
    };

    const handlePrintSpeech = async (targetSession?: SpeechSession) => {
        if (!selectedStudent || !isSpeech) return;

        try {
            const config = await SupabaseService.getPapelTimbradoConfig();
            const session = targetSession || (speechData.sessions.length > 0 ? speechData.sessions[0] : null);

            const contentHTML = `
                        <h2 class="section-title">I. ANAMNESE E QUEIXA</h2>
                        <div class="box">
                            <div class="data-row"><span class="label">QUEIXA PRINCIPAL:</span> <div class="value">${speechData.anamnese.queixaPrincipal || '-'}</div></div>
                            <div class="data-row"><span class="label">HISTÓRICO DE LINGUAGEM:</span> <div class="value">${speechData.anamnese.historicoDesenvolvimentoLinguagem || '-'}</div></div>
                            <div class="data-row"><span class="label">ALIMENTAÇÃO / MASTIGAÇÃO:</span> <div class="value">${speechData.anamnese.alimentacaoMastigacao || '-'}</div></div>
                            <div class="data-row"><span class="label">SONO / RESPIRAÇÃO:</span> <div class="value">${speechData.anamnese.sonoRespiracao || '-'}</div></div>
                        </div>

                        <h2 class="section-title">II. AVALIAÇÃO CLÍNICA</h2>
                        <div class="box">
                            <div class="data-row"><span class="label">MOTRICIDADE OROFACIAL:</span> <div class="value">${speechData.avaliacao.motricidadeOrofacial || '-'}</div></div>
                            <div class="data-row"><span class="label">LINGUAGEM ORAL:</span> <div class="value">${speechData.avaliacao.linguagemOral || '-'}</div></div>
                            <div class="data-row"><span class="label">LINGUAGEM ESCRITA:</span> <div class="value">${speechData.avaliacao.linguagemEscrita || '-'}</div></div>
                            <div class="data-row"><span class="label">VOZ:</span> <div class="value">${speechData.avaliacao.voz || '-'}</div></div>
                            <div class="data-row"><span class="label">AUDIÇÃO:</span> <div class="value">${speechData.avaliacao.audicao || '-'}</div></div>
                        </div>

                        ${session ? `
                <h2 class="section-title">III. REGISTRO DE ATENDIMENTO / EVOLUÇÃO</h2>
                <div class="box" style="border-left: 4px solid #0891b2; background: #f0fdfa;">
                    <div class="data-row">
                        <span class="label">DATA:</span> <span class="value">${new Date(session.date).toLocaleDateString()}</span>
                        <span class="label" style="display:inline; margin-left: 20px;">PARTICIPAÇÃO:</span> <span class="value">${session.participacao}</span>
                    </div>
                    <div class="data-row"><span class="label">OBJETIVO:</span> <span class="value">${session.objetivo}</span></div>
                    <div class="data-row"><span class="label">FONEMAS TRABALHADOS:</span> <span class="value">${session.fonemasTrabalhados || '-'}</span></div>
                    <div class="data-row"><span class="label">EVOLUÇÃO:</span> <span class="value">${session.evolucao}</span></div>
                    <div class="data-row"><span class="label">OBSERVAÇÕES:</span> <div class="value" style="white-space: pre-wrap;">${session.observacoes || '-'}</div></div>
                </div>
                ` : ''}
                        `;

            const html = generateClinicalPrintHTML(
                selectedStudent,
                config,
                'Relatório Fonoaudiológico',
                contentHTML,
                { name: currentUser.name, jobTitle: currentUser.jobTitle || 'Fonoaudiólogo(a)', specialty: currentUser.specialty, signatureUrl: currentUser.signatureUrl }
            );

            const printWindow = window.open('', '_blank', 'width=900,height=600');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        } catch (e) {
            console.error(e);
            toastError('Erro ao gerar impressão.');
        }
    };

    if (!isSpeech) return <div className="p-8 text-center text-red-600 font-bold">Acesso restrito à Fonoaudiologia.</div>;

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn pb-12">
            <div className="bg-gradient-to-r from-cyan-600 to-teal-700 rounded-2xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Activity size={200} /></div>
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h2 className="text-3xl font-extrabold flex items-center gap-3">
                            <Activity size={32} /> Fonoaudiologia Clínica
                        </h2>
                        <p className="text-cyan-100 mt-2">Linguagem, Motricidade Orofacial e Audição</p>
                    </div>
                    {selectedStudent && (
                        <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/20">
                            <p className="text-xs uppercase font-bold text-cyan-100">Paciente</p>
                            <p className="text-xl font-bold">{selectedStudent.fullName}</p>
                        </div>
                    )}
                </div>
            </div>

            {!selectedStudent ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                    <StudentPickerBySchool students={students} accentColor="#0891b2" onSelect={s => setSelectedStudent(s)} />
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col sm:flex-row min-h-[600px]">
                    <div className="w-full sm:w-64 bg-slate-50 border-b sm:border-b-0 sm:border-r border-slate-200 flex flex-col">
                        {[
                            { id: 'anamnese', label: 'Anamnese', icon: Users },
                            { id: 'avaliacao', label: 'Avaliação Clínica', icon: Search },
                            { id: 'sessions', label: 'Atendimentos', icon: History },
                            { id: 'history', label: 'Ficha Histórica', icon: FileText },
                            { id: 'reports', label: 'Relatórios', icon: Printer },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`p-4 flex items-center gap-3 text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white text-cyan-700 border-l-4 border-cyan-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                <tab.icon size={18} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 p-4 sm:p-8 bg-slate-50/50 min-w-0">
                        {activeTab === 'anamnese' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-cyan-600" /> Anamnese Fonoaudiológica</h3>
                                    <button onClick={handleSaveGeneral} className="w-full sm:w-auto bg-cyan-600 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-cyan-700 transition-all shadow-md"><Save size={18} /> Salvar</button>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <StyledInput label="Queixa Principal" rows={2} value={speechData.anamnese.queixaPrincipal} onChange={(e: any) => setSpeechData({ ...speechData, anamnese: { ...speechData.anamnese, queixaPrincipal: e.target.value } })} />
                                    <StyledInput label="Desenvolvimento da Linguagem" rows={3} value={speechData.anamnese.historicoDesenvolvimentoLinguagem} onChange={(e: any) => setSpeechData({ ...speechData, anamnese: { ...speechData.anamnese, historicoDesenvolvimentoLinguagem: e.target.value } })} />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <StyledInput label="Alimentação / Mastigação" rows={2} value={speechData.anamnese.alimentacaoMastigacao} onChange={(e: any) => setSpeechData({ ...speechData, anamnese: { ...speechData.anamnese, alimentacaoMastigacao: e.target.value } })} />
                                        <StyledInput label="Sono / Respiração" rows={2} value={speechData.anamnese.sonoRespiracao} onChange={(e: any) => setSpeechData({ ...speechData, anamnese: { ...speechData.anamnese, sonoRespiracao: e.target.value } })} />
                                    </div>
                                    <StyledInput label="Comportamento Auditivo" value={speechData.anamnese.comportamentoAuditivo} onChange={(e: any) => setSpeechData({ ...speechData, anamnese: { ...speechData.anamnese, comportamentoAuditivo: e.target.value } })} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'avaliacao' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Search className="text-cyan-600" /> Avaliação Clínica</h3>
                                    <button onClick={handleSaveGeneral} className="w-full sm:w-auto bg-cyan-600 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-cyan-700 transition-all shadow-md"><Save size={18} /> Salvar</button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <FormSection title="Sistema Estomatognático" icon={Activity} color="text-cyan-700">
                                        <StyledInput label="Motricidade Orofacial" rows={4} value={speechData.avaliacao.motricidadeOrofacial} onChange={(e: any) => setSpeechData({ ...speechData, avaliacao: { ...speechData.avaliacao, motricidadeOrofacial: e.target.value } })} />
                                    </FormSection>
                                    <FormSection title="Linguagem e Comunicação" icon={Brain} color="text-cyan-700">
                                        <StyledInput label="Linguagem Oral" rows={2} value={speechData.avaliacao.linguagemOral} onChange={(e: any) => setSpeechData({ ...speechData, avaliacao: { ...speechData.avaliacao, linguagemOral: e.target.value } })} />
                                        <StyledInput label="Linguagem Escrita" rows={2} value={speechData.avaliacao.linguagemEscrita} onChange={(e: any) => setSpeechData({ ...speechData, avaliacao: { ...speechData.avaliacao, linguagemEscrita: e.target.value } })} />
                                    </FormSection>
                                    <FormSection title="Voz e Audição" icon={Zap} color="text-cyan-700">
                                        <StyledInput label="Aspectos Vocais" rows={2} value={speechData.avaliacao.voz} onChange={(e: any) => setSpeechData({ ...speechData, avaliacao: { ...speechData.avaliacao, voz: e.target.value } })} />
                                        <StyledInput label="Aspectos Auditivos" rows={2} value={speechData.avaliacao.audicao} onChange={(e: any) => setSpeechData({ ...speechData, avaliacao: { ...speechData.avaliacao, audicao: e.target.value } })} />
                                    </FormSection>
                                </div>
                            </div>
                        )}

                        {activeTab === 'sessions' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/50 p-4 rounded-xl backdrop-blur-sm border border-white/40 shadow-sm">
                                    <h3 className="font-bold text-cyan-900 text-xl">Sessões Realizadas</h3>
                                    {!isEditingSession && (
                                        <button onClick={() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setIsEditingSession(true);
    setCurrentSession({
        date: now.toISOString().split('T')[0],
        startTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
        endTime: `${pad(now.getHours() + 1)}:${pad(now.getMinutes())}`,
        status: 'Realizado',
        humor: 'Neutro'
    });
}} className="w-full sm:w-auto bg-cyan-600 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-cyan-700 transition-all shadow-md"><Plus size={18} /> Nova Sessão</button>
                                    )}
                                </div>

                                {isEditingSession ? (
                                    <div className="bg-white p-6 rounded-xl shadow-lg border border-cyan-200 animate-slideUp">
                                        <h4 className="font-bold text-cyan-700 mb-4 border-b border-cyan-100 pb-2">Registro de Fonoaudiologia</h4>

                                        {!currentSession.id && speechData.sessions.length > 0 && (
                                            <div className="mb-6 p-4 bg-cyan-50 border border-cyan-100 rounded-xl text-sm">
                                                <p className="font-bold text-cyan-800 mb-1 flex items-center gap-2">
                                                    <History size={14} /> Retorno do Último Atendimento ({new Date(speechData.sessions[0].date).toLocaleDateString()}):
                                                </p>
                                                <p className="text-cyan-700 italic">"{speechData.sessions[0].observacoes || 'Sem observações registradas'}"</p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <StyledInput label="Data" type="date" value={currentSession.date} onChange={(e: any) => setCurrentSession({ ...currentSession, date: e.target.value })} />
                                            <StyledInput label="Objetivo" value={currentSession.objetivo} onChange={(e: any) => setCurrentSession({ ...currentSession, objetivo: e.target.value })} />
                                        </div>
                                        <StyledInput label="Fonemas Trabalhados" value={currentSession.fonemasTrabalhados} onChange={(e: any) => setCurrentSession({ ...currentSession, fonemasTrabalhados: e.target.value })} placeholder="Ex: /r/ vibrante, grupos consonantais..." />
                                        <StyledInput label="Atividades / Técnicas" rows={2} value={currentSession.atividades} onChange={(e: any) => setCurrentSession({ ...currentSession, atividades: e.target.value })} />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 ml-1">Evolução</label>
                                                <select className="w-full rounded-lg border-slate-300 bg-slate-50 p-2.5 text-sm" value={currentSession.evolucao} onChange={(e) => setCurrentSession({ ...currentSession, evolucao: e.target.value as any })}>
                                                    <option>Melhora Significativa</option><option>Melhora Leve</option><option>Estável</option><option>Regressão</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 ml-1">Participação</label>
                                                <select className="w-full rounded-lg border-slate-300 bg-slate-50 p-2.5 text-sm" value={currentSession.participacao} onChange={(e) => setCurrentSession({ ...currentSession, participacao: e.target.value as any })}>
                                                    <option>Ativo</option><option>Passivo</option><option>Recusou</option>
                                                </select>
                                            </div>
                                        </div>
                                        <StyledInput label="Observações de Resposta" rows={3} value={currentSession.observacoes} onChange={(e: any) => setCurrentSession({ ...currentSession, observacoes: e.target.value })} />
                                        <div className="flex justify-end gap-3 mt-6">
                                            <button onClick={() => setIsEditingSession(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all">Cancelar</button>
                                            <button onClick={handleSaveSession} className="w-full sm:w-auto px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-bold shadow-md transition-all">Salvar Sessão</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {speechData.sessions.length === 0 ? (
                                            <p className="text-center text-slate-400 py-10">Nenhum atendimento registrado.</p>
                                        ) : (
                                            speechData.sessions.map((sess, idx) => (
                                                <div key={sess.id || idx} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-cyan-300 transition-all shadow-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-700">{new Date(sess.date).toLocaleDateString()}</span>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${sess.evolucao.includes('Melhora') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{sess.evolucao}</span>
                                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">Participação: {sess.participacao}</span>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <button onClick={() => handlePrintSpeech(sess)} className="text-cyan-600/50 hover:text-cyan-600 transition-all" title="Imprimir registro de sessão"><Printer size={16} /></button>
                                                            <button onClick={() => { setCurrentSession(sess); setIsEditingSession(true); }} className="text-cyan-600 hover:text-cyan-800 transition-all"><Edit2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm font-bold text-cyan-800 mb-1">{sess.objetivo}</p>
                                                    {sess.fonemasTrabalhados && <p className="text-xs text-slate-600 mb-1 italic"><strong>Fonemas:</strong> {sess.fonemasTrabalhados}</p>}
                                                    <p className="text-sm text-slate-600 line-clamp-2">{sess.observacoes}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FileText className="text-cyan-600" /> Resumo Histórico</h3>
                                <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400">
                                    Módulo de geração de histórico cronológico automático em desenvolvimento.
                                </div>
                            </div>
                        )}

                        {activeTab === 'reports' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Printer className="text-cyan-600" /> Central de Relatórios</h3>
                                </div>
                                <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-slate-200">
                                    <FileText size={48} className="mx-auto text-cyan-200 mb-4" />
                                    <h4 className="font-bold text-slate-700 mb-2">Gerar Documento Oficial</h4>
                                    <p className="text-slate-500 mb-8 max-w-md mx-auto">Clique no botão abaixo para gerar uma versão para impressão com todos os dados clínicos registrados (Anamnese e Avaliação).</p>
                                    <button
                                        onClick={() => handlePrintSpeech()}
                                        className="px-8 py-3 bg-cyan-600 text-white rounded-xl font-bold shadow-lg hover:bg-cyan-700 transition-all flex items-center gap-2 mx-auto"
                                    >
                                        <Printer size={20} /> Imprimir Relatório Completo
                                    </button>

                                    <div className="mt-12 pt-8 border-t border-slate-100">
                                        <h4 className="text-rose-600 font-bold mb-2 flex items-center justify-center gap-2">
                                            <AlertCircle size={18} /> Encerramento de Processo
                                        </h4>
                                        <p className="text-slate-500 text-sm mb-6">Ao dar alta, o prontuário será salvo permanentemente e o relatório final será gerado para entrega.</p>
                                        <button
                                            onClick={handleDischarge}
                                            className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-xl hover:bg-rose-700 transition-all flex items-center gap-3 mx-auto uppercase tracking-wider text-sm shadow-rose-200"
                                        >
                                            <CheckCircle size={20} /> Dar Alta e Gerar Relatório Final
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- DASHBOARD ESPECIALIZADO DE TERAPIA OCUPACIONAL ---
const OccupationalTherapySpecificDashboard: React.FC<BaseDashboardProps> = ({ title, onNavigateNew, currentUser, preSelectedStudent }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(preSelectedStudent || null);
    const [activeTab, setActiveTab] = useState<'anamnese' | 'avaliacao' | 'sessions' | 'history' | 'reports'>('anamnese');
    const [otData, setOtData] = useState<OTPrivateData>(initialOTData);
    const [isEditingSession, setIsEditingSession] = useState(false);
    const [currentSession, setCurrentSession] = useState<Partial<OTSession>>({});
    const [loading, setLoading] = useState(false);
    const { success: showToast, error: toastError } = useToast();
    const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
    const [showConfirmDischarge, setShowConfirmDischarge] = useState(false);

    const isOT = currentUser.specialty === Specialty.OCCUPATIONAL_THERAPY || currentUser.role === 'ADMIN';

    useAgendaClinicalDeepLink(setLoading, toastError, (full, openTab) => {
        setSelectedStudent(full);
        const tabs = ['anamnese', 'avaliacao', 'sessions', 'history', 'reports'] as const;
        const ok = tabs.find((x) => x === openTab);
        setActiveTab(ok ?? 'anamnese');
        setIsEditingSession(false);
    });

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await SupabaseService.getStudentsForUser(currentUser);
            setStudents(data);
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        if (preSelectedStudent) setSelectedStudent(preSelectedStudent);
    }, [preSelectedStudent]);


    useEffect(() => {
        if (selectedStudent && isOT) {
            setOtData(extractOTData(selectedStudent));
        }
    }, [selectedStudent, isOT]);

    const handleSaveGeneral = async () => {
        if (!selectedStudent) return;
        try {
            const updatedStudent = {
                ...selectedStudent,
                clinical: {
                    ...selectedStudent.clinical,
                    ot_data: {
                        anamnese: otData.anamnese,
                        avaliacao: otData.avaliacao,
                        statusAtendimento: otData.statusAtendimento
                    }
                }
            };
            await SupabaseService.saveStudent(updatedStudent);
            setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
            setSelectedStudent(updatedStudent);
            showToast('Dados salvos com sucesso!');
        } catch (error) {
            console.error(error);
            toastError('Erro ao salvar dados.');
        }
    };

    const handleSaveSession = async () => {
        if (!selectedStudent) return;
        const newOTSession: OTSession = {
            id: currentSession.id || crypto.randomUUID(),
            date: currentSession.date || new Date().toISOString().split('T')[0],
            objetivos: currentSession.objetivos || '',
            atividades: currentSession.atividades || '',
            recursos: currentSession.recursos || '',
            respostaSensorial: currentSession.respostaSensorial || '',
            desempenhoMotor: currentSession.desempenhoMotor || '',
            nivelIndependencia: currentSession.nivelIndependencia || 'Independente',
            evolucao: currentSession.evolucao || 'Estável',
            observacoes: currentSession.observacoes || ''
        };

        const genericSession: Session = {
            id: newOTSession.id,
            date: newOTSession.date,
            specialty: Specialty.OCCUPATIONAL_THERAPY,
            professionalName: currentUser.name,
            notes: newOTSession.objetivos,
            content: newOTSession,
            privateNotes: newOTSession.observacoes
        };

        try {
            await SupabaseService.saveSession(genericSession, selectedStudent.id, currentUser.id);
            const updatedSessions = currentSession.id
                ? otData.sessions.map(s => s.id === currentSession.id ? newOTSession : s)
                : [newOTSession, ...otData.sessions];

            setOtData({ ...otData, sessions: updatedSessions });
            setIsEditingSession(false);
            setCurrentSession({});
            alert('Sessão salva!');
        } catch (e) {
            console.error(e);
            toastError('Erro ao salvar sessão.');
        }
    };

    const handleDischarge = async () => {
        if (!selectedStudent) return;
        setShowConfirmDischarge(true);
    };

    const confirmDischargeAction = async () => {
        setShowConfirmDischarge(false);

        try {
            // Atualizar status para Alta antes de salvar
            const updatedOtData = { ...otData, statusAtendimento: 'Alta' as any };
            setOtData(updatedOtData);

            await handleSaveGeneral();
            setTimeout(() => {
                handlePrintOT();
            }, 500);
        } catch (err) {
            console.error('Erro ao processar alta:', err);
            toastError('Falha ao processar alta.');
        }
    };

    const handlePrintOT = async (targetSession?: OTSession) => {
        if (!selectedStudent || !isOT) return;

        try {
            const config = await SupabaseService.getPapelTimbradoConfig();
            const session = targetSession || (otData.sessions.length > 0 ? otData.sessions[0] : null);

            const contentHTML = `
                                    <h2 class="section-title">I. ANAMNESE E HISTÓRICO</h2>
                                    <div class="box">
                                        <div class="data-row"><span class="label">HISTÓRICO OCUPACIONAL:</span> <div class="value">${otData.anamnese.historicoOcupacional || '-'}</div></div>
                                        <div class="data-row"><span class="label">ROTINA E AVDs:</span> <div class="value">${otData.anamnese.rotinaAVDs || '-'}</div></div>
                                        <div class="data-row"><span class="label">PERFIL SENSORIAL (PRÉVIA):</span> <div class="value">${otData.anamnese.perfilSensorialPrevia || '-'}</div></div>
                                        <div class="data-row"><span class="label">BRINCAR E DESENVOLVIMENTO:</span> <div class="value">${otData.anamnese.brincarDesenvolvimento || '-'}</div></div>
                                        <div class="data-row"><span class="label">COMPORTAMENTO SOCIAL:</span> <div class="value">${otData.anamnese.comportamentoSocial || '-'}</div></div>
                                    </div>

                                    <h2 class="section-title">II. AVALIAÇÃO TERAPÊUTICA OCUPACIONAL</h2>
                                    <div class="box">
                                        <div class="data-row"><span class="label">MOTRICIDADE FINA:</span> <div class="value">${otData.avaliacao.motricidadeFina || '-'}</div></div>
                                        <div class="data-row"><span class="label">MOTRICIDADE GROSSA:</span> <div class="value">${otData.avaliacao.motricidadeGrossa || '-'}</div></div>
                                        <div class="data-row"><span class="label">PROCESSAMENTO SENSORIAL:</span> <div class="value">${otData.avaliacao.processamentoSensorial || '-'}</div></div>
                                        <div class="data-row"><span class="label">INTEGRAÇÃO VISOMOTORA:</span> <div class="value">${otData.avaliacao.integracaoVisomotora || '-'}</div></div>
                                        <div class="data-row"><span class="label">AUTOCUIDADOS:</span> <div class="value">${otData.avaliacao.autocuidados || '-'}</div></div>
                                    </div>

                                    ${session ? `
                <h2 class="section-title">III. REGISTRO DE ATENDIMENTO / EVOLUÇÃO</h2>
                <div class="box" style="border-left: 4px solid #ea580c; background: #fff7ed;">
                    <div class="data-row">
                        <span class="label">DATA:</span> <span class="value">${new Date(session.date).toLocaleDateString()}</span>
                        <span class="label" style="display:inline; margin-left: 20px;">INDEPENDÊNCIA:</span> <span class="value">${session.nivelIndependencia}</span>
                    </div>
                    <div class="data-row"><span class="label">OBJETIVOS:</span> <span class="value">${session.objetivos}</span></div>
                    <div class="data-row"><span class="label">ATIVIDADES / RECURSOS:</span> <div class="value">${session.atividades} / ${session.recursos}</div></div>
                    <div class="data-row"><span class="label">RESPOSTA SENSORIAL:</span> <div class="value">${session.respostaSensorial || '-'}</div></div>
                    <div class="data-row"><span class="label">DESEMPENHO MOTOR:</span> <div class="value">${session.desempenhoMotor || '-'}</div></div>
                    <div class="data-row"><span class="label">EVOLUÇÃO:</span> <span class="value">${session.evolucao}</span></div>
                    <div class="data-row"><span class="label">OBSERVAÇÕES:</span> <div class="value" style="white-space: pre-wrap;">${session.observacoes || '-'}</div></div>
                </div>
                ` : ''}
                                    `;

            const html = generateClinicalPrintHTML(
                selectedStudent,
                config,
                'Relatório de Terapia Ocupacional',
                contentHTML,
                { name: currentUser.name, jobTitle: currentUser.jobTitle || 'Terapeuta Ocupacional', specialty: currentUser.specialty, signatureUrl: currentUser.signatureUrl }
            );

            const printWindow = window.open('', '_blank', 'width=900,height=600');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao gerar impressão.');
        }
    };

    if (!isOT) return <div className="p-8 text-center text-red-600 font-bold">Acesso restrito à Terapia Ocupacional.</div>;

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn pb-12">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-2xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Puzzle size={200} /></div>
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h2 className="text-3xl font-extrabold flex items-center gap-3">
                            <Puzzle size={32} /> Terapia Ocupacional
                        </h2>
                        <p className="text-indigo-100 mt-2">Desempenho Ocupacional, Integração Sensorial e AVDs</p>
                    </div>
                    {selectedStudent && (
                        <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/20">
                            <p className="text-xs uppercase font-bold text-indigo-100">Paciente</p>
                            <p className="text-xl font-bold">{selectedStudent.fullName}</p>
                        </div>
                    )}
                </div>
            </div>

            {!selectedStudent ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                    <StudentPickerBySchool students={students} accentColor="#6366f1" onSelect={s => setSelectedStudent(s)} />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Tabs */}
                    <div className="lg:col-span-1 space-y-2">
                        <button onClick={() => setActiveTab('anamnese')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'anamnese' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-indigo-50'}`}>
                            <FileText size={18} /> Anamnese T.O.
                        </button>
                        <button onClick={() => setActiveTab('avaliacao')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'avaliacao' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-indigo-50'}`}>
                            <ClipboardCheck size={18} /> Avaliação Clínica
                        </button>
                        <button onClick={() => setActiveTab('sessions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'sessions' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-indigo-50'}`}>
                            <History size={18} /> Atendimentos
                        </button>
                        <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-indigo-50'}`}>
                            <Printer size={18} /> Relatórios
                        </button>
                        <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-indigo-50'}`}>
                            <TrendingUp size={18} /> Evolução e Status
                        </button>
                        <button onClick={() => setSelectedStudent(null)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-slate-400 hover:text-red-500 transition-all mt-8">
                            <X size={18} /> Trocar Paciente
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="lg:col-span-3 space-y-6">
                        {activeTab === 'anamnese' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fadeIn">
                                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <FileText className="text-indigo-600" /> Histórico Ocupacional
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Histórico Ocupacional e Queixas</label>
                                        <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[100px]" value={otData.anamnese.historicoOcupacional} onChange={e => setOtData({ ...otData, anamnese: { ...otData.anamnese, historicoOcupacional: e.target.value } })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Rotina e AVDs (Atividades de Vida Diária)</label>
                                        <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[100px]" value={otData.anamnese.rotinaAVDs} onChange={e => setOtData({ ...otData, anamnese: { ...otData.anamnese, rotinaAVDs: e.target.value } })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Perfil Sensorial Prévio</label>
                                        <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[80px]" value={otData.anamnese.perfilSensorialPrevia} onChange={e => setOtData({ ...otData, anamnese: { ...otData.anamnese, perfilSensorialPrevia: e.target.value } })} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">O Brincar (Desenvolvimento)</label>
                                            <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[80px]" value={otData.anamnese.brincarDesenvolvimento} onChange={e => setOtData({ ...otData, anamnese: { ...otData.anamnese, brincarDesenvolvimento: e.target.value } })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Comportamento Social</label>
                                            <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[80px]" value={otData.anamnese.comportamentoSocial} onChange={e => setOtData({ ...otData, anamnese: { ...otData.anamnese, comportamentoSocial: e.target.value } })} />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <button onClick={handleSaveGeneral} className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2">
                                        <Save size={20} /> Salvar Histórico
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'avaliacao' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fadeIn">
                                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <ClipboardCheck className="text-indigo-600" /> Avaliação Clínica Especializada
                                </h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Motricidade Fina</label>
                                            <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[100px]" value={otData.avaliacao.motricidadeFina} onChange={e => setOtData({ ...otData, avaliacao: { ...otData.avaliacao, motricidadeFina: e.target.value } })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Motricidade Grossa</label>
                                            <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[100px]" value={otData.avaliacao.motricidadeGrossa} onChange={e => setOtData({ ...otData, avaliacao: { ...otData.avaliacao, motricidadeGrossa: e.target.value } })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Processamento Sensorial</label>
                                        <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[100px]" value={otData.avaliacao.processamentoSensorial} onChange={e => setOtData({ ...otData, avaliacao: { ...otData.avaliacao, processamentoSensorial: e.target.value } })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Integração Visomotora</label>
                                        <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[100px]" value={otData.avaliacao.integracaoVisomotora} onChange={e => setOtData({ ...otData, avaliacao: { ...otData.avaliacao, integracaoVisomotora: e.target.value } })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Autocuidados e AVDs</label>
                                        <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[100px]" value={otData.avaliacao.autocuidados} onChange={e => setOtData({ ...otData, avaliacao: { ...otData.avaliacao, autocuidados: e.target.value } })} />
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <button onClick={handleSaveGeneral} className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2">
                                        <Save size={20} /> Salvar Avaliação
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'sessions' && (
                            <div className="space-y-6 animate-fadeIn">
                                {isEditingSession ? (
                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                                            <h3 className="text-xl font-bold text-slate-800">Registrar Sessão T.O.</h3>
                                            <button onClick={() => setIsEditingSession(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
                                        </div>

                                        {!currentSession.id && otData.sessions.length > 0 && (
                                            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm">
                                                <p className="font-bold text-indigo-800 mb-1 flex items-center gap-2">
                                                    <History size={14} /> Observações do Último Atendimento ({new Date(otData.sessions[0].date).toLocaleDateString()}):
                                                </p>
                                                <p className="text-indigo-700 italic">"{otData.sessions[0].observacoes || 'Sem observações registradas'}"</p>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Data</label>
                                                <input type="date" className="w-full p-2.5 rounded-lg border border-slate-300" value={currentSession.date} onChange={e => setCurrentSession({ ...currentSession, date: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Nível de Independência</label>
                                                <select className="w-full p-2.5 rounded-lg border border-slate-300" value={currentSession.nivelIndependencia} onChange={e => setCurrentSession({ ...currentSession, nivelIndependencia: e.target.value as any })}>
                                                    <option>Independente</option>
                                                    <option>Supervisão</option>
                                                    <option>Ajuda Mínima</option>
                                                    <option>Ajuda Moderada</option>
                                                    <option>Ajuda Máxima</option>
                                                    <option>Dependente</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-4 mt-6">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Objetivos Terapêuticos da Sessão</label>
                                                <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[80px]" value={currentSession.objetivos} onChange={e => setCurrentSession({ ...currentSession, objetivos: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Atividades Realizadas e Recursos</label>
                                                <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[80px]" value={currentSession.atividades} onChange={e => setCurrentSession({ ...currentSession, atividades: e.target.value })} />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">Resposta Sensorial</label>
                                                    <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[80px]" value={currentSession.respostaSensorial} onChange={e => setCurrentSession({ ...currentSession, respostaSensorial: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">Desempenho Motor/Praxis</label>
                                                    <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[80px]" value={currentSession.desempenhoMotor} onChange={e => setCurrentSession({ ...currentSession, desempenhoMotor: e.target.value })} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Observações e Evolução Ocupacional</label>
                                                <select className="w-full p-2.5 rounded-lg border border-slate-300 mb-2" value={currentSession.evolucao} onChange={e => setCurrentSession({ ...currentSession, evolucao: e.target.value as any })}>
                                                    <option>Melhora Significativa</option>
                                                    <option>Leve Melhora</option>
                                                    <option>Estável</option>
                                                    <option>Regressão</option>
                                                </select>
                                                <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[80px]" value={currentSession.observacoes} onChange={e => setCurrentSession({ ...currentSession, observacoes: e.target.value })} placeholder="Mais detalhes sobre a evolução..." />
                                            </div>
                                        </div>
                                        <div className="mt-8 flex justify-end gap-3">
                                            <button onClick={() => setIsEditingSession(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
                                            <button onClick={handleSaveSession} className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2">
                                                <CheckCircle size={20} /> Salvar Sessão
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                            <h3 className="text-xl font-bold text-slate-800">Histórico de Atendimentos</h3>
                                            <button onClick={() => { setCurrentSession({}); setIsEditingSession(true); }} className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2">
                                                <Plus size={20} /> Novo Registro
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            {otData.sessions.length === 0 ? (
                                                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 border-dashed">
                                                    <p className="text-slate-500">Nenhuma sessão registrada para este aluno.</p>
                                                </div>
                                            ) : (
                                                otData.sessions.map((sess, idx) => (
                                                    <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded mb-2 inline-block">Sessão T.O.</span>
                                                                <h4 className="font-bold text-slate-800 text-lg">{new Date(sess.date).toLocaleDateString('pt-BR')}</h4>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs font-bold text-slate-400">Progresso</span>
                                                                <span className={`text-sm font-bold ${sess.evolucao.includes('Melhora') ? 'text-green-600' : 'text-slate-600'}`}>{sess.evolucao}</span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <p className="font-bold text-slate-600">Objetivo:</p>
                                                                <p className="text-slate-500 line-clamp-2">{sess.objetivos}</p>
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-600">IndependÃªncia:</p>
                                                                <p className="text-slate-700">{sess.nivelIndependencia}</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end gap-6">
                                                            <button onClick={() => handlePrintOT(sess)} className="text-indigo-600/50 hover:text-indigo-600 font-bold text-sm flex items-center gap-1 transition-all">
                                                                <Printer size={14} /> Imprimir Registro
                                                            </button>
                                                            <button onClick={() => { setCurrentSession(sess); setIsEditingSession(true); }} className="text-indigo-600 hover:text-indigo-800 font-bold text-sm flex items-center gap-1">
                                                                <Edit2 size={14} /> Editar Detalhes
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fadeIn">
                                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <TrendingUp className="text-indigo-600" /> Status do Atendimento
                                </h3>
                                <div className="max-w-md">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Fase Atual da Terapia</label>
                                    <select
                                        className="w-full p-4 rounded-xl border border-slate-300 text-lg font-bold text-indigo-700"
                                        value={otData.statusAtendimento}
                                        onChange={e => setOtData({ ...otData, statusAtendimento: e.target.value as any })}
                                    >
                                        <option>Avaliação</option>
                                        <option>Intervenção</option>
                                        <option>Monitoramento</option>
                                        <option>Alta</option>
                                    </select>
                                    <p className="text-sm text-slate-500 mt-2">O status é exibido no painel de gestão para outros profissionais.</p>

                                    <button onClick={handleSaveGeneral} className="mt-8 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md w-full">
                                        Atualizar Status
                                    </button>

                                    <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                                        <h4 className="text-rose-600 font-bold mb-2 flex items-center justify-center gap-2">
                                            <CheckCircle size={18} /> Processo de Alta
                                        </h4>
                                        <p className="text-slate-500 text-sm mb-6">Clique abaixo para encerrar o ciclo de T.O. e gerar o relatório final.</p>
                                        <button
                                            onClick={handleDischarge}
                                            className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-xl hover:bg-rose-700 transition-all flex items-center gap-3 mx-auto uppercase tracking-wider text-sm shadow-rose-200"
                                        >
                                            Dar Alta e Imprimir Relatório Final
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};




// --- DASHBOARD ESPECIALIZADO DE FISIOTERAPIA FUNCIONAL ---
const PhysiotherapySpecificDashboard: React.FC<BaseDashboardProps> = ({ title, onNavigateNew, currentUser, preSelectedStudent }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(preSelectedStudent || null);
    const [activeTab, setActiveTab] = useState<'anamnese' | 'avaliacao' | 'funcionalidade' | 'sessions' | 'conclusao' | 'reports'>('anamnese');
    const [ptData, setPtData] = useState<PhysioPrivateData>(initialPhysioData);
    const [isEditingSession, setIsEditingSession] = useState(false);
    const [currentSession, setCurrentSession] = useState<Partial<PhysioSession>>({});
    const [loading, setLoading] = useState(false);
    const { success: showToast, error: toastError } = useToast();
    const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
    const [showConfirmDischarge, setShowConfirmDischarge] = useState(false);

    const isPT = currentUser.specialty === Specialty.PHYSIOTHERAPY || currentUser.role === 'ADMIN';

    useAgendaClinicalDeepLink(setLoading, toastError, (full, openTab) => {
        setSelectedStudent(full);
        const tabs = ['anamnese', 'avaliacao', 'funcionalidade', 'sessions', 'conclusao', 'reports'] as const;
        const ok = tabs.find((x) => x === openTab);
        setActiveTab(ok ?? 'anamnese');
        setIsEditingSession(false);
    });

    useEffect(() => {
        if (preSelectedStudent) setSelectedStudent(preSelectedStudent);
    }, [preSelectedStudent]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await SupabaseService.getStudentsForUser(currentUser);
            setStudents(data);
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        if (selectedStudent && isPT) {
            setPtData(extractPhysioData(selectedStudent));
        }
    }, [selectedStudent, isPT]);

    const handleSaveGeneral = async () => {
        if (!selectedStudent) return;
        try {
            const updatedStudent = {
                ...selectedStudent,
                clinical: {
                    ...selectedStudent.clinical,
                    pt_data: {
                        anamnese: ptData.anamnese,
                        avaliacao: ptData.avaliacao,
                        conclusao: ptData.conclusao,
                        statusAtendimento: ptData.statusAtendimento
                    }
                }
            };
            await SupabaseService.saveStudent(updatedStudent);
            setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
            setSelectedStudent(updatedStudent);
            showToast('Dados salvos com sucesso!');
        } catch (error) {
            console.error(error);
            toastError('Erro ao salvar dados.');
        }
    };

    const handleSaveSession = async () => {
        if (!selectedStudent) return;
        const newSession: PhysioSession = {
            id: currentSession.id || crypto.randomUUID(),
            date: currentSession.date || new Date().toISOString().split('T')[0],
            objetivoAtendimento: currentSession.objetivoAtendimento || '',
            atividadesRealizadas: currentSession.atividadesRealizadas || '',
            respostaMotora: currentSession.respostaMotora || '',
            niveisDorPos: currentSession.niveisDorPos || '',
            observacoesClinicas: currentSession.observacoesClinicas || '',
            evolucao: currentSession.evolucao || 'Estável'
        };

        const genericSession: Session = {
            id: newSession.id,
            date: newSession.date,
            specialty: Specialty.PHYSIOTHERAPY,
            professionalName: currentUser.name,
            notes: newSession.objetivoAtendimento,
            content: newSession,
            privateNotes: newSession.observacoesClinicas
        };

        try {
            await SupabaseService.saveSession(genericSession, selectedStudent.id, currentUser.id);
            const updatedSessions = currentSession.id
                ? ptData.sessions.map(s => s.id === currentSession.id ? newSession : s)
                : [newSession, ...ptData.sessions];

            setPtData({ ...ptData, sessions: updatedSessions });
            setIsEditingSession(false);
            setCurrentSession({});
            showToast('Sessão salva!', 'success');
        } catch (e) {
            console.error(e);
            toastError('Erro ao salvar sessão.');
        }
    };

    const handleDischarge = async () => {
        if (!selectedStudent) return;
        setShowConfirmDischarge(true);
    };

    const confirmDischargeAction = async () => {
        setShowConfirmDischarge(false);

        try {
            // Atualizar status para Alta antes de salvar
            const updatedPtData = { ...ptData, statusAtendimento: 'Alta' as any };
            setPtData(updatedPtData);

            await handleSaveGeneral();
            setTimeout(() => {
                handlePrintPT();
            }, 500);
        } catch (err) {
            console.error('Erro ao processar alta:', err);
            toastError('Falha ao processar alta.');
        }
    };

    const handlePrintPT = async (targetSession?: PhysioSession) => {
        if (!selectedStudent || !isPT) return;

        try {
            const config = await SupabaseService.getPapelTimbradoConfig();
            const session = targetSession || (ptData.sessions.length > 0 ? ptData.sessions[0] : null);

            const contentHTML = `
                                                <h2 class="section-title">I. ANAMNESE E QUEIXA FUNCIONAL</h2>
                                                <div class="box">
                                                    <div class="data-row"><span class="label">QUEIXA PRINCIPAL:</span> <div class="value">${ptData.anamnese.queixaPrincipal || '-'}</div></div>
                                                    <div class="data-row"><span class="label">DIAGNÓSTICO INFORMADO:</span> <div class="value">${ptData.anamnese.diagnosticoInformado || '-'}</div></div>
                                                    <div class="data-row"><span class="label">HISTÓRICO FUNCIONAL:</span> <div class="value">${ptData.anamnese.historicoFuncional || '-'}</div></div>
                                                    <div class="data-row"><span class="label">DISPOSITIVOS DE APOIO:</span> <div class="value">${ptData.anamnese.dispositivosApoio || '-'}</div></div>
                                                </div>

                                                <h2 class="section-title">II. AVALIAÇÃO MOTORA E POSTURAL</h2>
                                                <div class="box">
                                                    <div class="data-row"><span class="label">CLASSIFICAÇÃO GMFCS:</span> <div class="value"><strong>NÍVEL ${ptData.avaliacao.gmfcs || 'NÃO INFORMADO'}</strong></div></div>
                                                    <div class="data-row"><span class="label">POSTURA (Pé/Sentado):</span> <div class="value">${ptData.avaliacao.postura.emPe} / ${ptData.avaliacao.postura.sentada}</div></div>
                                                    <div class="data-row"><span class="label">MOBILIDADE (ADM):</span> <div class="value">${ptData.avaliacao.mobilidade.adm}</div></div>
                                                    <div class="data-row"><span class="label">EQUILÍBRIO:</span> <div class="value">${ptData.avaliacao.equilibrio.estatico} (Est.) / ${ptData.avaliacao.equilibrio.dinamico} (Din.)</div></div>
                                                    <div class="data-row"><span class="label">MARCHA:</span> <div class="value">${ptData.avaliacao.marcha.observacoes || '-'}</div></div>
                                                </div>

                                                <h2 class="section-title">III. CONCLUSÃO E RECOMENDAÇÕES ESCOLARES</h2>
                                                <div class="box">
                                                    <div class="data-row"><span class="label">LIMITAÇÕES:</span> <div class="value">${ptData.conclusao.limitacoes || '-'}</div></div>
                                                    <div class="data-row"><span class="label">POTENCIALIDADES:</span> <div class="value">${ptData.conclusao.potencialidades || '-'}</div></div>
                                                    <div class="data-row"><span class="label">APOIO ESCOLAR:</span> <div class="value">${ptData.conclusao.necessidadeApoioEscolar || '-'}</div></div>
                                                    <div class="data-row"><span class="label">RECOMENDAÇÕES:</span> <div class="value">${ptData.conclusao.recomendacoes || '-'}</div></div>
                                                </div>

                                                ${session ? `
                <h2 class="section-title">IV. REGISTRO DE ATENDIMENTO / EVOLUÇÃO</h2>
                <div class="box" style="border-left: 4px solid #1d4ed8; background: #eff6ff;">
                    <div class="data-row">
                        <span class="label">DATA:</span> <span class="value">${new Date(session.date).toLocaleDateString()}</span>
                        <span class="label" style="display:inline; margin-left: 20px;">EVOLUÇÃO:</span> <span class="value">${session.evolucao}</span>
                    </div>
                    <div class="data-row"><span class="label">OBJETIVO:</span> <span class="value">${session.objetivoAtendimento}</span></div>
                    <div class="data-row"><span class="label">ATIVIDADES:</span> <div class="value">${session.atividadesRealizadas}</div></div>
                    <div class="data-row"><span class="label">RESPOSTA MOTORA:</span> <span class="value">${session.respostaMotora}</span></div>
                    <div class="data-row"><span class="label">OBSERVAÇÕES:</span> <div class="value" style="white-space: pre-wrap;">${session.observacoesClinicas || '-'}</div></div>
                </div>
                ` : ''}
                                                `;

            const html = generateClinicalPrintHTML(
                selectedStudent,
                config,
                'Relatório de Avaliação Fisioterapêutica Funcional',
                contentHTML,
                { name: currentUser.name, jobTitle: currentUser.jobTitle || 'Fisioterapeuta', specialty: currentUser.specialty, signatureUrl: currentUser.signatureUrl }
            );

            const printWindow = window.open('', '_blank', 'width=900,height=600');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        } catch (e) {
            console.error(e);
            toastError('Erro ao gerar impressão.');
        }
    };

    if (!isPT) return <div className="p-8 text-center text-red-600 font-bold">Acesso restrito à Fisioterapia.</div>;

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn pb-12">
            {/* Institucional Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Activity size={200} /></div>
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h2 className="text-3xl font-extrabold flex items-center gap-3">
                            <Activity size={32} /> Fisioterapia Funcional
                        </h2>
                        <p className="text-blue-100 mt-2">Acompanhamento Motor e Acessibilidade Escolar</p>
                        <div className="mt-4 flex items-center gap-2 bg-blue-900/40 p-3 rounded-lg border border-blue-400/30 text-xs w-fit">
                            <ShieldAlert size={16} className="text-blue-300" />
                            <span>Módulo em conformidade com a LGPD e limites éticos (Sem diagnóstico clínico).</span>
                        </div>
                    </div>
                    {selectedStudent && (
                        <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/20">
                            <p className="text-xs uppercase font-bold text-blue-100">Paciente</p>
                            <p className="text-xl font-bold">{selectedStudent.fullName}</p>
                        </div>
                    )}
                </div>
            </div>

            {!selectedStudent ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                    <StudentPickerBySchool students={students} accentColor="#1d4ed8" onSelect={s => setSelectedStudent(s)} />
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col sm:flex-row">
                    {/* Sidebar Tabs */}
                    <div className="w-full sm:w-64 bg-slate-50 border-b sm:border-b-0 sm:border-r border-slate-200 flex flex-col">
                        {[
                            { id: 'anamnese', label: 'Anamnese', icon: FileText },
                            { id: 'avaliacao', label: 'Avaliação Motora', icon: Activity },
                            { id: 'funcionalidade', label: 'Rotina Escolar', icon: SchoolIcon },
                            { id: 'sessions', label: 'Atendimentos', icon: History },
                            { id: 'conclusao', label: 'Conclusão', icon: ClipboardCheck },
                            { id: 'reports', label: 'Relatórios', icon: Printer },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`p-4 flex items-center gap-3 text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white text-blue-700 border-l-4 border-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                            >
                                <tab.icon size={18} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-4 sm:p-8 bg-slate-50/50 min-w-0">
                        {/* TAB: ANAMNESE */}
                        {activeTab === 'anamnese' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <h3 className="text-xl font-bold text-slate-800">Anamnese Fisioterapêutica Funcional</h3>
                                    <button onClick={handleSaveGeneral} className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700"><Save size={18} /> Salvar</button>
                                </div>
                                <div className="space-y-4">
                                    <StyledInput label="Queixa Principal (impacto na funcionalidade)" rows={2} value={ptData.anamnese.queixaPrincipal} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, queixaPrincipal: e.target.value } })} />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <StyledInput label="Início da Queixa" value={ptData.anamnese.dataInicioQueixa} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, dataInicioQueixa: e.target.value } })} />
                                        <StyledInput label="Diagnóstico Informado (Documentos)" value={ptData.anamnese.diagnosticoInformado} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, diagnosticoInformado: e.target.value } })} />
                                    </div>
                                    <StyledInput label="Histórico Funcional e Saúde Relevante" rows={3} value={ptData.anamnese.historicoFuncional} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, historicoFuncional: e.target.value } })} />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <StyledInput label="Dispositivos de Apoio (Cadeira, Órtese, etc)" value={ptData.anamnese.dispositivosApoio} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, dispositivosApoio: e.target.value } })} />
                                        <StyledInput label="Cirurgias Prévias" value={ptData.anamnese.cirurgiasPrevias} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, cirurgiasPrevias: e.target.value } })} />
                                    </div>

                                    <div className="p-4 bg-white rounded-lg border border-slate-200">
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-3">Registro de Dor</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">Existe Dor?</label>
                                                <select className="w-full p-2 bg-slate-50 border rounded" value={ptData.anamnese.dor.existe} onChange={e => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, dor: { ...ptData.anamnese.dor, existe: e.target.value } } })}>
                                                    <option>Não</option><option>Sim</option>
                                                </select>
                                            </div>
                                            <StyledInput label="Local da Dor" value={ptData.anamnese.dor.local} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, dor: { ...ptData.anamnese.dor, local: e.target.value } } })} />
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">Intensidade</label>
                                                <select className="w-full p-2 bg-slate-50 border rounded" value={ptData.anamnese.dor.intensidade} onChange={e => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, dor: { ...ptData.anamnese.dor, intensidade: e.target.value } } })}>
                                                    <option>Leve</option><option>Moderada</option><option>Intensa</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <StyledInput label="Nível de Independência (AVDs)" value={ptData.anamnese.nivelIndependencia} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, nivelIndependencia: e.target.value } })} />
                                        <StyledInput label="Dificuldades de Locomocao" value={ptData.anamnese.dificuldadesLocomocao} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, dificuldadesLocomocao: e.target.value } })} />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 text-sm font-bold text-slate-700">Apresenta Fadiga Frequente?</div>
                                        <div className="flex gap-2">
                                            {['Sim', 'Não'].map(opt => (
                                                <button key={opt} onClick={() => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, fadigaFrequente: opt } })} className={`px-4 py-1 rounded-full text-xs font-bold ${ptData.anamnese.fadigaFrequente === opt ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: AVALIAÇÃO MOTORA */}
                        {activeTab === 'avaliacao' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <h3 className="text-xl font-bold text-slate-800">Avaliação Fisioterapêutica Funcional</h3>
                                    <button onClick={handleSaveGeneral} className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700"><Save size={18} /> Salvar</button>
                                </div>

                                <FormSection title="Classificação GMFCS" icon={Activity} color="text-blue-700">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Nível GMFCS (Função Motora Grossa)</label>
                                            <div className="flex gap-2 flex-wrap">
                                                {['I', 'II', 'III', 'IV', 'V'].map(level => (
                                                    <button
                                                        key={level}
                                                        onClick={() => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, gmfcs: level } })}
                                                        className={`w-12 h-12 rounded-xl font-black text-lg transition-all ${ptData.avaliacao.gmfcs === level ? 'bg-blue-600 text-white shadow-lg scale-110' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm">
                                            <p className="font-bold text-blue-800 mb-1">
                                                {ptData.avaliacao.gmfcs === 'I' && 'Nível I: Anda sem restrições.'}
                                                {ptData.avaliacao.gmfcs === 'II' && 'Nível II: Anda com limitações.'}
                                                {ptData.avaliacao.gmfcs === 'III' && 'Nível III: Anda com dispositivo manual de mobilidade.'}
                                                {ptData.avaliacao.gmfcs === 'IV' && 'NÃ­vel IV: Mobilidade limitada; pode usar motorizada.'}
                                                {ptData.avaliacao.gmfcs === 'V' && 'NÃ­vel V: Transportado em cadeira de rodas manual.'}
                                                {!ptData.avaliacao.gmfcs && 'Selecione um nível para ver a descrição.'}
                                            </p>
                                            <p className="text-blue-600/80 text-xs mt-1">
                                                {ptData.avaliacao.gmfcs === 'I' && 'Desempenha habilidades motoras grossas como correr e pular, mas velocidade e coordenação são reduzidas.'}
                                                {ptData.avaliacao.gmfcs === 'II' && 'Dificuldade em andar longas distâncias e em terrenos irregulares; necessita de corrimão em escadas.'}
                                                {ptData.avaliacao.gmfcs === 'III' && 'Caminha com dispositivos de auxílio (andadores, muletas) e usa cadeira de rodas para longas distâncias.'}
                                                {ptData.avaliacao.gmfcs === 'IV' && 'Funcionalidade limitada; necessita de assistência física ou mobilidade motorizada na maioria dos ambientes.'}
                                                {ptData.avaliacao.gmfcs === 'V' && 'Grave limitação no controle postural e movimento; dependência total para mobilidade.'}
                                            </p>
                                        </div>
                                    </div>
                                </FormSection>

                                <FormSection title="I. Postura" icon={AlignLeft}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <StyledInput label="Postura em Pé" value={ptData.avaliacao.postura.emPe} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, postura: { ...ptData.avaliacao.postura, emPe: e.target.value } } })} />
                                        <StyledInput label="Postura Sentada" value={ptData.avaliacao.postura.sentada} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, postura: { ...ptData.avaliacao.postura, sentada: e.target.value } } })} />
                                    </div>
                                    <StyledInput label="Assimetrias Visíveis" value={ptData.avaliacao.postura.assimetrias} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, postura: { ...ptData.avaliacao.postura, assimetrias: e.target.value } } })} />
                                </FormSection>

                                <FormSection title="II. Mobilidade e Equilíbrio" icon={Zap}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <StyledInput label="Amplitude de Movimento (ADM)" value={ptData.avaliacao.mobilidade.adm} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, mobilidade: { ...ptData.avaliacao.mobilidade, adm: e.target.value } } })} />
                                        <StyledInput label="Coordenação Motora Grossa" value={ptData.avaliacao.mobilidade.coordMotorGrossa} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, mobilidade: { ...ptData.avaliacao.mobilidade, coordMotorGrossa: e.target.value } } })} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <StyledInput label="Equilíbrio Estático" value={ptData.avaliacao.equilibrio.estatico} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, equilibrio: { ...ptData.avaliacao.equilibrio, estatico: e.target.value } } })} />
                                        <StyledInput label="Equilíbrio Dinâmico" value={ptData.avaliacao.equilibrio.dinamico} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, equilibrio: { ...ptData.avaliacao.equilibrio, dinamico: e.target.value } } })} />
                                    </div>
                                </FormSection>

                                <FormSection title="III. Força e Marcha" icon={TrendingUp}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 uppercase block mb-2">Força Muscular Adequada para Idade?</label>
                                            <div className="flex gap-2">
                                                {['Sim', 'Não'].map(opt => (
                                                    <button key={opt} onClick={() => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, forcaMuscular: { ...ptData.avaliacao.forcaMuscular, adequadaIdade: opt } } })} className={`px-4 py-1 rounded-full text-xs font-bold ${ptData.avaliacao.forcaMuscular.adequadaIdade === opt ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <StyledInput label="Déficit Funcional Observado" value={ptData.avaliacao.forcaMuscular.deficitFuncional} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, forcaMuscular: { ...ptData.avaliacao.forcaMuscular, deficitFuncional: e.target.value } } })} />
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-3">Marcha / Locomoção</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                            {['independente', 'comApoio', 'cadeiraRodas'].map(field => (
                                                <div key={field} className="flex items-center justify-between bg-white p-2 rounded border">
                                                    <span className="text-xs font-bold text-slate-600">{field === 'independente' ? 'Independente' : field === 'comApoio' ? 'Com Apoio' : 'Cadeira de Rodas'}</span>
                                                    <select className="text-xs p-1" value={(ptData.avaliacao.marcha as any)[field]} onChange={e => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, marcha: { ...ptData.avaliacao.marcha, [field]: e.target.value } } })}>
                                                        <option>Sim</option><option>Não</option>
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                        <StyledInput label="Observações da Marcha" rows={2} value={ptData.avaliacao.marcha.observacoes} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, marcha: { ...ptData.avaliacao.marcha, observacoes: e.target.value } } })} />
                                    </div>
                                </FormSection>
                            </div>
                        )}

                        {/* TAB: FUNCIONALIDADE ESCOLAR */}
                        {activeTab === 'funcionalidade' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <h3 className="text-xl font-bold text-slate-800">Participação e Funcionalidade Escolar</h3>
                                    <button onClick={handleSaveGeneral} className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700"><Save size={18} /> Salvar</button>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 space-y-4">
                                    <StyledInput label="Deslocamento dentro da Escola (Salas, Pátio)" rows={2} value={ptData.avaliacao.funcionalidadeEscolar.deslocamento} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, funcionalidadeEscolar: { ...ptData.avaliacao.funcionalidadeEscolar, deslocamento: e.target.value } } })} />
                                    <StyledInput label="Acesso a ambientes (Rampas, Escadas, Banheiro)" rows={2} value={ptData.avaliacao.funcionalidadeEscolar.acessoAmbientes} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, funcionalidadeEscolar: { ...ptData.avaliacao.funcionalidadeEscolar, acessoAmbientes: e.target.value } } })} />
                                    <StyledInput label="Permanência em Sala de Aula (Postura, Mobiliário)" rows={2} value={ptData.avaliacao.funcionalidadeEscolar.permanenciaSala} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, funcionalidadeEscolar: { ...ptData.avaliacao.funcionalidadeEscolar, permanenciaSala: e.target.value } } })} />
                                    <StyledInput label="Participação em Atividades Físicas e Recreativas" rows={2} value={ptData.avaliacao.funcionalidadeEscolar.participacaoAtividades} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, funcionalidadeEscolar: { ...ptData.avaliacao.funcionalidadeEscolar, participacaoAtividades: e.target.value } } })} />
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-sm text-blue-800 flex items-start gap-3">
                                    <AlertCircle size={20} className="mt-0.5" />
                                    <p>Esta seção foca em como o aluno interage com o ambiente físico da escola e quais barreiras arquitetônicas ou funcionais ele enfrenta no dia a dia educativo.</p>
                                </div>
                            </div>
                        )}

                        {/* TAB: ATENDIMENTOS (SESSÕES) */}
                        {activeTab === 'sessions' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <h3 className="text-xl font-bold text-slate-800">Histórico de Atendimentos</h3>
                                    {!isEditingSession && (
                                        <button onClick={() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setIsEditingSession(true);
    setCurrentSession({
        date: now.toISOString().split('T')[0],
        startTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
        endTime: `${pad(now.getHours() + 1)}:${pad(now.getMinutes())}`,
        status: 'Realizado',
        humor: 'Neutro'
    });
}} className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700"><Plus size={18} /> Novo Atendimento</button>
                                    )}
                                </div>

                                {isEditingSession ? (
                                    <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200 animate-slideUp">
                                        <h4 className="font-bold text-blue-700 mb-4 border-b border-blue-100 pb-2">Registro de Sessão Fisioterapêutica</h4>

                                        {!currentSession.id && ptData.sessions.length > 0 && (
                                            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm">
                                                <p className="font-bold text-blue-800 mb-1 flex items-center gap-2">
                                                    <History size={14} /> Notas do Último Atendimento ({new Date(ptData.sessions[0].date).toLocaleDateString()}):
                                                </p>
                                                <p className="text-blue-700 italic">"{ptData.sessions[0].observacoesClinicas || 'Sem observações registradas'}"</p>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                            <StyledInput label="Data" type="date" value={currentSession.date} onChange={(e: any) => setCurrentSession({ ...currentSession, date: e.target.value })} />
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 ml-1">Evolução Percebida</label>
                                                <select className="w-full rounded-lg border-slate-300 bg-slate-50 p-2.5 text-sm" value={currentSession.evolucao} onChange={(e) => setCurrentSession({ ...currentSession, evolucao: e.target.value as any })}>
                                                    <option>Estável</option>
                                                    <option>Melhora Leve</option>
                                                    <option>Melhora Significativa</option>
                                                    <option>Regressão</option>
                                                </select>
                                            </div>
                                        </div>
                                        <StyledInput label="Objetivo do Atendimento" value={currentSession.objetivoAtendimento} onChange={(e: any) => setCurrentSession({ ...currentSession, objetivoAtendimento: e.target.value })} />
                                        <StyledInput label="Atividades Realizadas" rows={2} value={currentSession.atividadesRealizadas} onChange={(e: any) => setCurrentSession({ ...currentSession, atividadesRealizadas: e.target.value })} />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <StyledInput label="Resposta Motora Observada" value={currentSession.respostaMotora} onChange={(e: any) => setCurrentSession({ ...currentSession, respostaMotora: e.target.value })} />
                                            <StyledInput label="Níveis de Dor Pós-Atendimento" value={currentSession.niveisDorPos} onChange={(e: any) => setCurrentSession({ ...currentSession, niveisDorPos: e.target.value })} />
                                        </div>
                                        <StyledInput label="Observações e Recomendações" rows={2} value={currentSession.observacoesClinicas} onChange={(e: any) => setCurrentSession({ ...currentSession, observacoesClinicas: e.target.value })} />

                                        <div className="flex justify-end gap-3 mt-6">
                                            <button onClick={() => setIsEditingSession(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                            <button onClick={handleSaveSession} className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">Salvar Atendimento</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {ptData.sessions.length === 0 ? (
                                            <p className="text-center text-slate-400 py-10">Nenhum atendimento registrado.</p>
                                        ) : (
                                            ptData.sessions.map((sess, idx) => (
                                                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-all shadow-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-700">{new Date(sess.date).toLocaleDateString()}</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${sess.evolucao.includes('Melhora') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{sess.evolucao}</span>
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <button onClick={() => handlePrintPT(sess)} className="text-blue-600/50 hover:text-blue-600 transition-all" title="Imprimir registro"><Printer size={16} /></button>
                                                            <button onClick={() => { setCurrentSession(sess); setIsEditingSession(true); }} className="text-blue-600 hover:text-blue-800 transition-all"><Edit2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mb-1"><strong>Objetivo:</strong> {sess.objetivoAtendimento}</p>
                                                    <p className="text-sm text-slate-500 line-clamp-2"><strong>Obs:</strong> {sess.observacoesClinicas}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB: CONCLUSÃO FUNCIONAL */}
                        {activeTab === 'conclusao' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><ClipboardCheck className="text-blue-600" /> Síntese e Conclusão Funcional</h3>
                                    <button onClick={handleSaveGeneral} className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700"><Save size={18} /> Salvar Conclusão</button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <FormSection title="Limitações e Potencialidades" icon={TrendingUp} color="text-blue-700">
                                        <StyledInput label="Limitações Funcionais Observadas" rows={3} value={ptData.conclusao.limitacoes} onChange={(e: any) => setPtData({ ...ptData, conclusao: { ...ptData.conclusao, limitacoes: e.target.value } })} />
                                        <StyledInput label="Potencialidades do Aluno" rows={3} value={ptData.conclusao.potencialidades} onChange={(e: any) => setPtData({ ...ptData, conclusao: { ...ptData.conclusao, potencialidades: e.target.value } })} />
                                    </FormSection>
                                    <FormSection title="Apoio e Recomendações" icon={ShieldAlert} color="text-blue-700">
                                        <StyledInput label="Necessidade de Apoio no Ambiente Escolar" rows={3} value={ptData.conclusao.necessidadeApoioEscolar} onChange={(e: any) => setPtData({ ...ptData, conclusao: { ...ptData.conclusao, necessidadeApoioEscolar: e.target.value } })} placeholder="Apoio de monitor, mediador, ou mobiliário etc" />
                                        <StyledInput label="Recomendações Funcionais Finais" rows={3} value={ptData.conclusao.recomendacoes} onChange={(e: any) => setPtData({ ...ptData, conclusao: { ...ptData.conclusao, recomendacoes: e.target.value } })} />
                                    </FormSection>
                                </div>
                                <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-xl border border-slate-700">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Flag className="text-blue-400" />
                                        <h4 className="font-bold">Status do Caso</h4>
                                    </div>
                                    <div className="max-w-xs">
                                        <select
                                            className="w-full bg-slate-700 border-slate-600 rounded-xl p-3 font-bold"
                                            value={ptData.statusAtendimento}
                                            onChange={e => setPtData({ ...ptData, statusAtendimento: e.target.value as any })}
                                        >
                                            <option>Avaliação Funcional</option>
                                            <option>Acompanhamento</option>
                                            <option>Monitoramento</option>
                                            <option>Alta</option>
                                        </select>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-slate-700">
                                        <button
                                            onClick={handleDischarge}
                                            className="w-full px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-2 uppercase text-sm"
                                        >
                                            <CheckCircle size={18} /> Dar Alta e Gerar Relatório Final
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: RELATÓRIOS (Central Fisioterapia) */}
                        {activeTab === 'reports' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Printer className="text-blue-600" /> Central de Relatórios</h3>
                                </div>
                                <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-slate-200">
                                    <Activity size={48} className="mx-auto text-blue-200 mb-4" />
                                    <h4 className="font-bold text-slate-700 mb-2">Relatório de Avaliação Funcional</h4>
                                    <p className="text-slate-500 mb-8 max-w-md mx-auto">Gere um documento profissional contendo a anamnese funcional, avaliação motora, postural e as recomendações de acessibilidade.</p>
                                    <button
                                        onClick={() => handlePrintPT()}
                                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 mx-auto"
                                    >
                                        <Printer size={20} /> Imprimir Relatório Completo
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


const MOOD_EMOJIS: Record<string, string> = {
    feliz: '😊',
    neutro: '😐',
    triste: '😢',
    ansioso: '😟',
    irritado: '😠'
};

const MOOD_LABELS: Record<string, string> = {
    feliz: 'Feliz / Estável',
    neutro: 'Neutro',
    triste: 'Triste / Retraído',
    ansioso: 'Ansioso / Agitado',
    irritado: 'Irritado / Opositivo'
};

// --- DASHBOARD ESPECÍFICO DE PSICOLOGIA ---
// (MANTIDO INTACTO)
const PsychologySpecificDashboard: React.FC<BaseDashboardProps> = ({ title, onNavigateNew, currentUser, preSelectedStudent }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(preSelectedStudent || null);
    const [activeTab, setActiveTab] = useState<'anamnese' | 'prontuario' | 'sessions' | 'reports'>('anamnese');
    const [recentActivity, setRecentActivity] = useState<{ session: PsychSession, studentName: string, studentId: string }[]>([]);
    const [stats, setStats] = useState({ totalPatients: 0, totalSessions: 0, activeCases: 0, diagnosisData: [] as any[] });
    const [searchTerm, setSearchTerm] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [schoolFilter, setSchoolFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const { success: showToast, error: toastError } = useToast();
    const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
    const [showConfirmDischarge, setShowConfirmDischarge] = useState(false);

    useEffect(() => {
        if (preSelectedStudent) setSelectedStudent(preSelectedStudent);
    }, [preSelectedStudent]);

    // Psychology Specific State
    const [publicData, setPublicData] = useState<PsychFormPublic>(initialPublicForm);
    const [privateData, setPrivateData] = useState<PsychPrivateData>({ formData: initialPrivateForm, sessions: [], statusAtendimento: 'Em acompanhamento' });
    const [psychStatus, setPsychStatus] = useState<string>('Em acompanhamento');

    const [isEditingSession, setIsEditingSession] = useState(false);
    const [currentSession, setCurrentSession] = useState<Partial<PsychSession>>({});

    const [anamneseData, setAnamneseData] = useState({
        dataEntrevista: new Date().toISOString().split('T')[0],
        quemEncaminhou: 'escola' as 'escola' | 'professor' | 'coordenacao' | 'familia',
        nomeEncaminhador: '',
        dataEncaminhamento: '',
        motivoEncaminhamento: '',
        queixaPrincipal: '',
        gestacao: 'sem_intercorrencias' as 'sem_intercorrencias' | 'com_intercorrencias',
        gestacaoDetalhe: '',
        desenvolvimento: 'dentro_esperado' as 'dentro_esperado' | 'com_atraso',
        desenvolvimentoDetalhe: '',
        saude: 'sem_problemas' as 'sem_problemas' | 'com_diagnostico',
        saudeDetalhe: '',
        medicacao: 'nao' as 'nao' | 'sim',
        medicacaoDetalhe: '',
        comQuemMora: '',
        rotinafamiliar: '',
        mudancasRecentes: 'nao' as 'nao' | 'sim',
        mudancasDetalhe: '',
        relacaoProfessores: 'adequada' as 'adequada' | 'dificuldades',
        relacaoProfessoresDetalhe: '',
        relacaoColegas: 'adequada' as 'adequada' | 'dificuldades',
        relacaColegasDetalhe: '',
        comportamentos: [] as string[],
        comportamentoOutro: '',
        aprendizagem: 'adequada' as 'adequada' | 'dificuldades',
        aprendizagemDetalhe: '',
        intervencoes: [] as string[],
        intervencoesDetalhe: '',
        observacoesPsicologa: '',
        encaminhamentoPlano: '',
        status: 'rascunho' as 'rascunho' | 'finalizada',
    });
    const [savingAnamnese, setSavingAnamnese] = useState(false);
    const anamneseScrollRef = useRef<HTMLDivElement>(null);
    const [activeAnamneseSection, setActiveAnamneseSection] = useState<string>('psych-sec-1');

    const handleSaveAnamnese = async () => {
        if (!selectedStudent) return;
        setSavingAnamnese(true);
        try {
            const anamneseRecord: Session = {
                id: `anamnese-${selectedStudent.id}`,
                date: anamneseData.dataEntrevista || new Date().toISOString().split('T')[0],
                specialty: Specialty.PSYCHOLOGY,
                professionalName: currentUser.name,
                notes: JSON.stringify(anamneseData),
                serviceType: 'PsychAnamnese',
            };

            await SupabaseService.saveSession(anamneseRecord, selectedStudent.id, currentUser.id);

            const cleanHistory = selectedStudent.history?.filter(h => !(h.specialty === Specialty.PSYCHOLOGY && h.serviceType === 'PsychAnamnese')) || [];
            const updatedStudent: Student = {
                ...selectedStudent,
                history: [anamneseRecord, ...cleanHistory]
            };

            setSelectedStudent(updatedStudent);
            setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));

            showToast('Anamnese salva com sucesso!');
            setSavingAnamnese(false);
        } catch (e) {
            toastError('Erro ao salvar anamnese.');
            setSavingAnamnese(false);
        }
    };

    const canAccessPrivate = currentUser.role === 'ADMIN' || currentUser.specialty === Specialty.PSYCHOLOGY;

    useAgendaClinicalDeepLink(setLoading, toastError, (full, openTab) => {
        agendaClinicalDeepLinkPreserveTabRef.current = true;
        setSelectedStudent(full);
        const tabs = ['anamnese', 'prontuario', 'sessions', 'reports'] as const;
        const ok = tabs.find((x) => x === openTab);
        setActiveTab(ok ?? 'anamnese');
    });

    const moodColors: Record<string, string> = {
        neutro: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        triste: 'bg-blue-100 text-blue-700 border-blue-200',
        ansioso: 'bg-purple-100 text-purple-700 border-purple-200',
        irritado: 'bg-red-100 text-red-700 border-red-200'
    };

    const loadData = async () => {
        setLoading(true);
        const allStudents = await SupabaseService.getStudentsForUser(currentUser);
        setStudents(allStudents);

        const activity: { session: PsychSession, studentName: string, studentId: string }[] = [];
        let sessionCount = 0;
        let patientCount = 0;
        let activeCount = 0;

        allStudents.forEach(student => {
            const pData = extractPsychData(student);
            if (pData && pData.sessions && pData.sessions.length > 0) {
                patientCount++;
                if (pData.statusAtendimento === 'Em acompanhamento') activeCount++;
                sessionCount += pData.sessions.length;
                pData.sessions.forEach(session => {
                    activity.push({ session, studentName: student.fullName, studentId: student.id });
                });
            }
        });

        activity.sort((a, b) => new Date(b.session.dataHoraISO).getTime() - new Date(a.session.dataHoraISO).getTime());
        setRecentActivity(activity);

        // Calculate Diagnosis Data (Mocked or Real)
        const diagnosisData = allStudents.reduce((acc: any[], s) => {
            const diag = (s.clinical as any).diagnosis?.split(' ')[0] || 'Outros';
            const existing = acc.find((i: any) => i.name === diag);
            if (existing) existing.value++;
            else acc.push({ name: diag, value: 1 });
            return acc;
        }, []);

        setStats({ totalPatients: patientCount, totalSessions: sessionCount, activeCases: activeCount, diagnosisData });
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (selectedStudent) {
            const publicRecord = selectedStudent.history?.find(h => h.specialty === Specialty.PSYCHOLOGY && h.serviceType === 'PsychPublicData');
            if (publicRecord) {
                try { setPublicData(JSON.parse(publicRecord.notes)); } catch { setPublicData(initialPublicForm); }
            } else {
                setPublicData(initialPublicForm);
            }

            // Buscar registro de anamnese no histórico do aluno
            const anamneseRecord = selectedStudent.history?.find(h => h.specialty === Specialty.PSYCHOLOGY && h.serviceType === 'PsychAnamnese');
            if (anamneseRecord) {
                try {
                    setAnamneseData(JSON.parse(anamneseRecord.notes));
                } catch {
                    setAnamneseData({
                        dataEntrevista: new Date().toISOString().split('T')[0],
                        quemEncaminhou: 'escola',
                        nomeEncaminhador: '',
                        dataEncaminhamento: '',
                        motivoEncaminhamento: '',
                        queixaPrincipal: '',
                        gestacao: 'sem_intercorrencias',
                        gestacaoDetalhe: '',
                        desenvolvimento: 'dentro_esperado',
                        desenvolvimentoDetalhe: '',
                        saude: selectedStudent.clinical?.diagnosis ? 'com_diagnostico' : 'sem_problemas',
                        saudeDetalhe: selectedStudent.clinical?.diagnosis
                            ? `${selectedStudent.clinical.diagnosis}${selectedStudent.clinical.cid ? ` - ${selectedStudent.clinical.cid}` : ''}`
                            : '',
                        medicacao: selectedStudent.clinical?.medications && selectedStudent.clinical.medications !== 'Nenhum medicamento em uso.' ? 'sim' : 'nao',
                        medicacaoDetalhe: selectedStudent.clinical?.medications || '',
                        comQuemMora: '',
                        rotinafamiliar: '',
                        mudancasRecentes: 'nao',
                        mudancasDetalhe: '',
                        relacaoProfessores: 'adequada',
                        relacaoProfessoresDetalhe: '',
                        relacaoColegas: 'adequada',
                        relacaColegasDetalhe: '',
                        comportamentos: [],
                        comportamentoOutro: '',
                        aprendizagem: 'adequada',
                        aprendizagemDetalhe: '',
                        intervencoes: [],
                        intervencoesDetalhe: '',
                        observacoesPsicologa: '',
                        encaminhamentoPlano: '',
                        status: 'rascunho',
                    });
                }
            } else {
                setAnamneseData({
                    dataEntrevista: new Date().toISOString().split('T')[0],
                    quemEncaminhou: 'escola',
                    nomeEncaminhador: '',
                    dataEncaminhamento: '',
                    motivoEncaminhamento: '',
                    queixaPrincipal: '',
                    gestacao: 'sem_intercorrencias',
                    gestacaoDetalhe: '',
                    desenvolvimento: 'dentro_esperado',
                    desenvolvimentoDetalhe: '',
                    saude: selectedStudent.clinical?.diagnosis ? 'com_diagnostico' : 'sem_problemas',
                    saudeDetalhe: selectedStudent.clinical?.diagnosis
                        ? `${selectedStudent.clinical.diagnosis}${selectedStudent.clinical.cid ? ` - ${selectedStudent.clinical.cid}` : ''}`
                        : '',
                    medicacao: selectedStudent.clinical?.medications && selectedStudent.clinical.medications !== 'Nenhum medicamento em uso.' ? 'sim' : 'nao',
                    medicacaoDetalhe: selectedStudent.clinical?.medications || '',
                    comQuemMora: '',
                    rotinafamiliar: '',
                    mudancasRecentes: 'nao',
                    mudancasDetalhe: '',
                    relacaoProfessores: 'adequada',
                    relacaoProfessoresDetalhe: '',
                    relacaoColegas: 'adequada',
                    relacaColegasDetalhe: '',
                    comportamentos: [],
                    comportamentoOutro: '',
                    aprendizagem: 'adequada',
                    aprendizagemDetalhe: '',
                    intervencoes: [],
                    intervencoesDetalhe: '',
                    observacoesPsicologa: '',
                    encaminhamentoPlano: '',
                    status: 'rascunho',
                });
            }

            if (canAccessPrivate) {
                setPrivateData(extractPsychData(selectedStudent));
            }
            if (agendaClinicalDeepLinkPreserveTabRef.current) {
                agendaClinicalDeepLinkPreserveTabRef.current = false;
            } else {
                setActiveTab('sessions');
            }
        }
    }, [selectedStudent, canAccessPrivate]);

    // ── SCROLLSPY IntersectionObserver ────────────────────────────────────
    useEffect(() => {
        if (activeTab !== 'anamnese') return;
        const scrollContainer = anamneseScrollRef.current;
        if (!scrollContainer) return;
        const sections = Array.from(scrollContainer.querySelectorAll('[data-psych-section]')) as HTMLElement[];
        if (sections.length === 0) return;
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter(e => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible.length > 0) {
                    setActiveAnamneseSection((visible[0].target as HTMLElement).dataset.psychSection!);
                }
            },
            {
                root: scrollContainer,
                threshold: 0.15,
                rootMargin: '-80px 0px -50% 0px'
            }
        );
        sections.forEach(s => observer.observe(s));
        return () => observer.disconnect();
    }, [activeTab, selectedStudent]);
    // ─────────────────────────────────────────────────────────────────────

    const handlePublicChange = (section: keyof PsychFormPublic, field: string, value: string) => {
        setPublicData({
            ...publicData,
            [section]: {
                ...(publicData as any)[section],
                [field]: value
            }
        });
    };

    const handlePrivateChange = (section: keyof PsychFormPrivate, field: string, value: string) => {
        setPrivateData({
            ...privateData,
            formData: {
                ...privateData.formData,
                [section]: {
                    ...(privateData.formData as any)[section],
                    [field]: value
                }
            }
        });
    };

    const handleSaveGeneral = async () => {
        if (!selectedStudent) return;
        try {
            // Salvar Público no History
            const record: Session = {
                id: `public-data-${selectedStudent.id}`,
                date: new Date().toISOString().split('T')[0],
                specialty: Specialty.PSYCHOLOGY,
                professionalName: 'Sistema',
                serviceType: 'PsychPublicData',
                notes: JSON.stringify(publicData)
            };
            const cleanHistory = selectedStudent.history?.filter(h => !(h.specialty === Specialty.PSYCHOLOGY && h.serviceType === 'PsychPublicData')) || [];

            let updatedStudent: Student = {
                ...selectedStudent,
                history: [record, ...cleanHistory],
                clinical: {
                    ...selectedStudent.clinical,
                    psych_data: { ...privateData, sessions: [] }
                }
            };

            await SupabaseService.saveStudent(updatedStudent);
            setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
            setSelectedStudent(updatedStudent);
            alert('Prontuário atualizado com sucesso!');
        } catch (e) {
            alert('Erro ao salvar prontuário.');
        }
    };

    const handleSaveSession = async () => {
        if (!selectedStudent || !canAccessPrivate) return;

        try {
            const sessionToSave: PsychSession = {
                id: currentSession.id || crypto.randomUUID(),
                numero: currentSession.numero || (privateData.sessions.length + 1),
                dataHoraISO: currentSession.dataHoraISO || new Date().toISOString(),
                duracaoMin: currentSession.duracaoMin || 50,
                titulo: currentSession.titulo || 'Atendimento Psicológico',
                humor: (currentSession.humor as any) || 'neutro',
                status: (currentSession.status as any) || 'Realizado',
                resumo: currentSession.resumo || '',
                anotacoes: currentSession.anotacoes || '',
                indicativoAlta: currentSession.indicativoAlta,
                motivoAlta: currentSession.motivoAlta
            };

            const genericSession: Session = {
                id: sessionToSave.id,
                date: sessionToSave.dataHoraISO.split('T')[0],
                specialty: Specialty.PSYCHOLOGY,
                professionalName: currentUser.name,
                notes: sessionToSave.titulo,
                content: sessionToSave,
                privateNotes: sessionToSave.anotacoes
            };

            await SupabaseService.saveSession(genericSession, selectedStudent.id, currentUser.id);

            const updatedSessions = currentSession.id
                ? privateData.sessions.map(s => s.id === currentSession.id ? sessionToSave : s)
                : [sessionToSave, ...privateData.sessions];

            setPrivateData({ ...privateData, sessions: updatedSessions });
            setIsEditingSession(false);
            setCurrentSession({});
            setCurrentSession({});
            showToast('Atendimento salvo!', 'success');
            loadData(); // Refresh list if needed
        } catch (e) {
            toastError('Erro ao salvar sessão.');
        }
    };

    const handlePrintPsychology = async (targetSession?: PsychSession) => {
        if (!selectedStudent || !canAccessPrivate) return;
        try {
            const config = await SupabaseService.getPapelTimbradoConfig();
            const session = targetSession || (privateData.sessions.length > 0 ? privateData.sessions[0] : null);

            const contentHTML = `
                                                                    <h2 class="section-title">I. IDENTIFICAÇÃO E ENCAMINHAMENTO</h2>
                                                                    <div class="box">
                                                                        <div class="data-row"><span class="label">ENCAMINHADO POR:</span> <span class="value">${publicData.identificacao.encaminhadoPor || '-'}</span></div>
                                                                        <div class="data-row"><span class="label">DATA TRIAGEM:</span> <span class="value">${publicData.identificacao.dataTriagem ? new Date(publicData.identificacao.dataTriagem).toLocaleDateString() : '-'}</span></div>
                                                                        <div class="data-row"><span class="label">QUEIXA PRINCIPAL / MOTIVO:</span> <div class="value">${publicData.motivoEncaminhamento.queixa || 'Não informado'}</div></div>
                                                                    </div>
                                                                    <h2 class="section-title">II. DADOS CLÍNICOS E PLANO TERAPÊUTICO</h2>
                                                                    <div class="box">
                                                                        <div class="data-row"><span class="label">HIPÓTESES INICIAIS:</span> <div class="value">${privateData.formData.triagemPsicologica.hipotesesIniciais || '-'}</div></div>
                                                                        <div class="data-row"><span class="label">OBJETIVO PRINCIPAL:</span> <div class="value">${privateData.formData.planoTerapeutico.objetivoPrincipal || '-'}</div></div>
                                                                        <div class="data-row"><span class="label">METAS ESPECÍFICAS:</span> <div class="value">${privateData.formData.planoTerapeutico.metasEspecificas || '-'}</div></div>
                                                                    </div>
                                                                    ${session ? `
                <h2 class="section-title">III. REGISTRO DE EVOLUÇÃO</h2>
                <div class="box" style="border-left: 4px solid #9333ea; background: #faf5ff;">
                    <div class="data-row"><span class="label">DATA:</span> <span class="value">${new Date(session.dataHoraISO).toLocaleDateString()}</span></div>
                    <div class="data-row"><span class="label">TÍTULO:</span> <span class="value" style="font-weight: bold;">${session.titulo}</span></div>
                    <div class="data-row"><span class="label">EVOLUÇÃO:</span> <div class="value" style="white-space: pre-wrap;">${session.anotacoes || session.resumo || 'Sem anotações.'}</div></div>
                </div>
                ` : ''}
                                                                    `;

            const html = generateClinicalPrintHTML(selectedStudent, config, 'Prontuário Psicológico', contentHTML, {
                name: currentUser.name, jobTitle: currentUser.jobTitle || 'Psicólogo(a)', specialty: currentUser.specialty, signatureUrl: currentUser.signatureUrl
            });

            const win = window.open('', '_blank');
            if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print(); win.close(); }, 500); }
        } catch (e) { toastError('Erro na impressão.'); }
    };

    const filteredActivity = recentActivity.filter(item =>
        item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.session.titulo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={selectedStudent ? 'animate-fadeIn' : 'max-w-6xl mx-auto animate-fadeIn pb-12'}>
            {!selectedStudent ? (
                <div className="space-y-8 animate-slideUp">
                    <WelcomeHeader name={currentUser.name.split(' ')[0]} />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Actions & Chart */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Action Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <ActionCard
                                    title="Nova Sessão"
                                    icon={Brain}
                                    onClick={() => onNavigateNew()}
                                    colorClass="bg-purple-50 text-purple-600"
                                    description="Iniciar novo atendimento psicoterapêutico"
                                />
                                <ActionCard
                                    title="Consultar Agenda"
                                    icon={Calendar}
                                    onClick={() => onNavigateNew()}
                                    colorClass="bg-indigo-50 text-indigo-600"
                                    description="Verificar agendamentos e horários"
                                />
                            </div>

                            {/* Chart Area */}
                            <div className="bg-white p-8 rounded-3xl shadow-card border border-slate-100">
                                <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                                    <Activity className="text-purple-500" /> Diagnósticos Recorrentes
                                </h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.diagnosisData.length > 0 ? stats.diagnosisData : [{ name: 'Sem dados', value: 1 }]}
                                                cx="50%" cy="50%"
                                                innerRadius={60} outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {stats.diagnosisData.length > 0 ? stats.diagnosisData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                                )) : <Cell fill="#e2e8f0" />}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ paddingLeft: '20px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Search & Stats */}
                        <div className="space-y-6">
                            {/* Student Search Box */}
                            <div className="bg-white p-6 rounded-3xl shadow-card border border-slate-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Search size={100} /></div>
                                <h3 className="font-bold text-lg text-slate-800 mb-4 relative z-10">Selecionar Paciente</h3>
                                <div className="relative z-10">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-12 text-slate-700 outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none cursor-pointer hover:bg-slate-100"
                                            onChange={(e) => {
                                                const s = students.find(st => st.id === e.target.value);
                                                if (s) setSelectedStudent(s);
                                            }}
                                            value=""
                                        >
                                            <option value="">Buscar por nome...</option>
                                            {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                                        </select>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2 ml-1">Selecione para ver prontuário completo</p>
                                </div>
                            </div>

                            <StatCard
                                title="Pacientes Ativos"
                                value={stats.activeCases}
                                icon={Users}
                                gradient="from-purple-500 to-indigo-600"
                                subtext="Em acompanhamento regular"
                                trend="up"
                            />

                            <StatCard
                                title="Total Atendimentos"
                                value={stats.totalSessions}
                                icon={History}
                                gradient="from-fuchsia-500 to-pink-500"
                                subtext="Sessões realizadas"
                            />

                            {/* Recent List Mini */}
                            <div className="bg-white p-6 rounded-3xl shadow-card border border-slate-100">
                                <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wide mb-4">Últimas Interações</h3>
                                <div className="space-y-3">
                                    {filteredActivity.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => {
                                            const s = students.find(st => st.id === item.studentId);
                                            if (s) setSelectedStudent(s);
                                        }}>
                                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm">
                                                {MOOD_EMOJIS[item.session.humor] || '😊'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-700 text-sm truncate">{item.studentName}</p>
                                                <p className="text-xs text-slate-400 truncate">{item.session.titulo}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredActivity.length === 0 && <p className="text-xs text-slate-400 italic">Sem atividades recentes</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row min-h-screen -mx-4 lg:-mx-8 -mt-6 bg-slate-50 border-t border-slate-100">
                    {/* Sidebar Premium */}
                    <div className="w-full sm:w-64 shrink-0 p-4 flex flex-col gap-3">
                        {/* Mini-card do paciente */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                            <button onClick={() => setSelectedStudent(null)} className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 mb-3 hover:text-purple-800 transition-colors">
                                <TrendingUp size={13} /> Voltar ao painel
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md shadow-purple-200">
                                    {selectedStudent.fullName?.charAt(0).toUpperCase() ?? '?'}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{selectedStudent.fullName}</p>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full mt-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                        {privateData.statusAtendimento}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Menu de navegação */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" role="tablist" aria-label="Seções do prontuário">
                            {[
                                { id: 'anamnese',  label: 'Anamnese',   icon: ClipboardList  },
                                { id: 'prontuario',label: 'Prontuário', icon: ClipboardCheck },
                                { id: 'sessions',  label: 'Evoluções',  icon: History        },
                                { id: 'reports',   label: 'Relatórios', icon: Printer        },
                            ].map((tab, idx) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-inset
                                            ${idx > 0 ? 'border-t border-slate-100' : ''}
                                            ${isActive
                                                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-inner'
                                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        <tab.icon size={17} className={isActive ? 'opacity-90' : ''} />
                                        <span className="flex-1 text-left">{tab.label}</span>
                                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white opacity-70" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Scrollspy — aparece só na aba Anamnese */}
                        {activeTab === 'anamnese' && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <p className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Seções</p>
                                {[
                                    { id: 'psych-sec-1', label: 'Identificação'         },
                                    { id: 'psych-sec-2', label: 'Encaminhamento'        },
                                    { id: 'psych-sec-3', label: 'Queixa principal'      },
                                    { id: 'psych-sec-4', label: 'Desenvolvimento'       },
                                    { id: 'psych-sec-5', label: 'Contexto familiar'     },
                                    { id: 'psych-sec-6', label: 'Funcionamento escolar' },
                                    { id: 'psych-sec-7', label: 'Comportamentos'        },
                                    { id: 'psych-sec-8', label: 'Intervenções'          },
                                    { id: 'psych-sec-9', label: 'Observações'           },
                                    { id: 'psych-sec-10', label: 'Plano inicial'        },
                                ].map((sec, idx) => {
                                    const isSecActive = activeAnamneseSection === sec.id;
                                    return (
                                        <a
                                            key={sec.id}
                                            href={`#${sec.id}`}
                                            onClick={e => {
                                                e.preventDefault();
                                                const container = anamneseScrollRef.current;
                                                const target = container?.querySelector(`[data-psych-section="${sec.id}"]`) as HTMLElement | null;
                                                if (container && target) {
                                                    const containerRect = container.getBoundingClientRect();
                                                    const targetRect = target.getBoundingClientRect();
                                                    const scrollOffset = targetRect.top - containerRect.top + container.scrollTop - 90;
                                                    container.scrollTo({ top: scrollOffset, behavior: 'smooth' });
                                                }
                                            }}
                                            className={`flex items-center gap-2.5 px-4 py-2.5 text-xs transition-all
                                                ${idx > 0 ? 'border-t border-slate-50' : ''}
                                                ${isSecActive
                                                    ? 'text-purple-700 font-semibold bg-purple-50 border-l-2 border-l-purple-600'
                                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-l-2 border-l-transparent'
                                                }`}
                                        >
                                            <div className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${isSecActive ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                {idx + 1}
                                            </div>
                                            <span className="truncate">{sec.label}</span>
                                            {isSecActive && <div className="w-1 h-1 rounded-full bg-purple-500 ml-auto shrink-0" />}
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Tab Content */}
                    <div ref={anamneseScrollRef} className="flex-1 p-4 lg:p-6 overflow-y-auto">
                        {activeTab === 'anamnese' && (
                          <div className="space-y-4 animate-fadeIn pb-10 print-anamnese-container max-w-4xl mx-auto">
                            {/* CSS customizado para impressão da ficha */}
                            <style dangerouslySetInnerHTML={{ __html: `
                              @media print {
                                body * {
                                  visibility: hidden;
                                }
                                .print-anamnese-container, .print-anamnese-container * {
                                  visibility: visible;
                                }
                                .print-anamnese-container {
                                  position: absolute;
                                  left: 0;
                                  top: 0;
                                  width: 100%;
                                  background: white !important;
                                  color: black !important;
                                  padding: 0 !important;
                                  margin: 0 !important;
                                  border: none !important;
                                  box-shadow: none !important;
                                }
                                .no-print {
                                  display: none !important;
                                }
                                input, textarea, select {
                                  border: 1px solid #cbd5e1 !important;
                                  background: #f8fafc !important;
                                  color: #0f172a !important;
                                  opacity: 1 !important;
                                  -webkit-print-color-adjust: exact;
                                  print-color-adjust: exact;
                                }
                                button {
                                  -webkit-print-color-adjust: exact;
                                  print-color-adjust: exact;
                                }
                                .bg-white.border {
                                  page-break-inside: avoid;
                                  break-inside: avoid;
                                  margin-bottom: 15px !important;
                                }
                              }
                            ` }} />

                            {/* Header sticky premium */}
                            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 no-print shadow-sm">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                  <h3 className="text-base font-bold text-slate-800">Anamnese infantil educacional</h3>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {selectedStudent?.fullName} · Psicologia · {new Date(anamneseData.dataEntrevista).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap shrink-0">
                                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${anamneseData.status === 'finalizada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                    {anamneseData.status === 'finalizada' ? '✓ Finalizada' : '⏳ Rascunho'}
                                  </span>
                                  <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-200 transition-colors min-h-[36px]">
                                    <Printer size={13} /> PDF
                                  </button>
                                  <button onClick={handleSaveAnamnese} disabled={savingAnamnese} className="flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[36px] shadow-sm shadow-purple-200">
                                    <Save size={13} /> {savingAnamnese ? 'Salvando...' : 'Salvar'}
                                  </button>
                                </div>
                              </div>
                              {/* Barra de progresso */}
                              {(() => {
                                const preenchidas = [
                                  anamneseData.motivoEncaminhamento, anamneseData.queixaPrincipal,
                                  anamneseData.comQuemMora, anamneseData.rotinafamiliar,
                                  anamneseData.observacoesPsicologa, anamneseData.encaminhamentoPlano,
                                  anamneseData.comportamentoOutro || (anamneseData.comportamentos.length > 0 ? '1' : ''),
                                ].filter(Boolean).length;
                                const total = 7;
                                const pct = Math.round((preenchidas / total) * 100);
                                return (
                                  <div className="mt-3">
                                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                      <span>{preenchidas} de {total} seções preenchidas</span>
                                      <span>{pct}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-purple-500 to-purple-700 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Cabeçalho exclusivo para Impressão */}
                            <div className="hidden print:block mb-6 border-b pb-4">
                              <h2 className="text-2xl font-black text-slate-900">Anamnese Infantil Educacional</h2>
                              <p className="text-sm text-slate-600 mt-1">
                                <strong>Aluno:</strong> {selectedStudent?.fullName} | <strong>Especialidade:</strong> Psicologia | <strong>Data da Entrevista:</strong> {new Date(anamneseData.dataEntrevista).toLocaleDateString('pt-BR')}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                <strong>Status do Documento:</strong> {anamneseData.status === 'finalizada' ? 'Finalizado' : 'Rascunho'}
                              </p>
                            </div>

                            {/* Seção 1 - Identificação */}
                            <div id="psych-sec-1" data-psych-section="psych-sec-1" className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm scroll-mt-28">
                              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                                <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700 shrink-0">1</div>
                                <span className="text-sm font-semibold text-slate-700">Identificação</span>
                                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full no-print">
                                    <Lock size={9} /> Preenchido automaticamente
                                </span>
                              </div>
                              <div className="p-5">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                {[
                                  { label: 'Nome da criança', value: selectedStudent?.fullName ?? '—' },
                                  { label: 'Data de nascimento', value: selectedStudent?.birthDate ? new Date(selectedStudent.birthDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—' },
                                  { label: 'Idade', value: selectedStudent?.birthDate ? `${Math.floor((Date.now() - new Date(selectedStudent.birthDate).getTime()) / (365.25 * 86400000))} anos` : '—' },
                                ].map(({ label, value }) => (
                                  <div key={label}>
                                    <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Lock size={9} className="text-slate-400" /> {label}</p>
                                    <div className="text-sm font-medium text-slate-700 bg-slate-50 border border-dashed border-slate-300 rounded-lg px-3 py-2.5 min-h-[44px] flex items-center">{value}</div>
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                {[
                                  { label: 'Escola', value: selectedStudent?.school?.name ?? selectedStudent?.school?.schoolName ?? '—' },
                                  { label: 'Série / Ano', value: selectedStudent?.school?.grade ?? '—' },
                                  { label: 'Turno', value: selectedStudent?.school?.shift ?? '—' },
                                ].map(({ label, value }) => (
                                  <div key={label}>
                                    <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Lock size={9} className="text-slate-400" /> {label}</p>
                                    <div className="text-sm font-medium text-slate-700 bg-slate-50 border border-dashed border-slate-300 rounded-lg px-3 py-2.5 min-h-[44px] flex items-center">{value}</div>
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                  { label: 'Responsável', value: selectedStudent?.guardians?.[0]?.name ?? '—' },
                                  { label: 'Contato', value: selectedStudent?.guardians?.[0]?.phone ?? '—' },
                                ].map(({ label, value }) => (
                                  <div key={label}>
                                    <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Lock size={9} className="text-slate-400" /> {label}</p>
                                    <div className="text-sm font-medium text-slate-700 bg-slate-50 border border-dashed border-slate-300 rounded-lg px-3 py-2.5 min-h-[44px] flex items-center">{value}</div>
                                  </div>
                                ))}
                                <div>
                                  <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Data da entrevista</p>
                                  <input type="date" value={anamneseData.dataEntrevista} onChange={e => setAnamneseData(p => ({ ...p, dataEntrevista: e.target.value }))} className="w-full text-sm text-slate-700 bg-white border-[1.5px] border-slate-200 rounded-lg px-3 py-2.5 min-h-[44px] outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all" />
                                </div>
                              </div>
                              </div>
                            </div>

                            {/* Seção 2 - Encaminhamento */}
                            <div id="psych-sec-2" data-psych-section="psych-sec-2" className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm scroll-mt-28">
                              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                                <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700 shrink-0">2</div>
                                <span className="text-sm font-semibold text-slate-700">Encaminhamento</span>
                              </div>
                              <div className="p-5">
                              <div className="mb-4">
                                <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Quem encaminhou</p>
                                <div className="flex flex-wrap gap-2">
                                  {(['escola', 'professor', 'coordenacao', 'familia'] as const).map(opt => (
                                    <button key={opt} onClick={() => setAnamneseData(p => ({ ...p, quemEncaminhou: opt }))}
                                      className={`text-xs font-semibold px-4 py-2 rounded-xl border-[1.5px] min-h-[44px] transition-all ${anamneseData.quemEncaminhou === opt ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200' : 'bg-white text-slate-500 border-slate-200 hover:border-purple-300 hover:text-purple-600'}`}>
                                      {opt === 'escola' ? 'Escola' : opt === 'professor' ? 'Professor(a)' : opt === 'coordenacao' ? 'Coordenação' : 'Família'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nome de quem encaminhou</p>
                                  <input type="text" value={anamneseData.nomeEncaminhador} onChange={e => setAnamneseData(p => ({ ...p, nomeEncaminhador: e.target.value }))} placeholder="Nome completo..." className="w-full text-sm text-slate-700 bg-white border-[1.5px] border-slate-200 rounded-lg px-3 py-2.5 min-h-[44px] outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all" />
                                </div>
                                <div>
                                  <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Data do encaminhamento</p>
                                  <input type="date" value={anamneseData.dataEncaminhamento} onChange={e => setAnamneseData(p => ({ ...p, dataEncaminhamento: e.target.value }))} className="w-full text-sm text-slate-700 bg-white border-[1.5px] border-slate-200 rounded-lg px-3 py-2.5 min-h-[44px] outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all" />
                                </div>
                              </div>
                              <div>
                                <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Motivo do encaminhamento</p>
                                <div className="relative">
                                  <textarea value={anamneseData.motivoEncaminhamento} onChange={e => setAnamneseData(p => ({ ...p, motivoEncaminhamento: e.target.value }))} placeholder="Descreva o motivo do encaminhamento..." rows={4} className="w-full text-sm text-slate-700 bg-white border-[1.5px] border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all resize-y min-h-[96px]" />
                                  <span className="absolute bottom-2 right-3 text-[10px] text-slate-400">{anamneseData.motivoEncaminhamento.length} car.</span>
                                </div>
                              </div>
                              </div>
                            </div>

                            {/* Seção 3 - Queixa Principal */}
                            <div id="psych-sec-3" data-psych-section="psych-sec-3" className="bg-white border border-slate-100 rounded-2xl p-5 scroll-mt-28">
                              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-widest mb-4 pb-3 border-b border-slate-100">
                                <MessageCircle size={14} /> 3. Queixa principal
                              </div>
                              <textarea value={anamneseData.queixaPrincipal} onChange={e => setAnamneseData(p => ({ ...p, queixaPrincipal: e.target.value }))} placeholder="Descreva a queixa principal..." rows={4} className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 resize-y" />
                            </div>

                            {/* Seção 4 - Histórico Desenvolvimento */}
                            <div id="psych-sec-4" data-psych-section="psych-sec-4" className="bg-white border border-slate-100 rounded-2xl p-5 scroll-mt-28">
                              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-widest mb-4 pb-3 border-b border-slate-100">
                                <Activity size={14} /> 4. Histórico breve do desenvolvimento
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {[
                                  { key: 'gestacao', label: 'Gestação', opts: [{ v: 'sem_intercorrencias', l: 'Sem intercorrências' }, { v: 'com_intercorrencias', l: 'Com intercorrências' }], detailKey: 'gestacaoDetalhe' },
                                  { key: 'desenvolvimento', label: 'Desenvolvimento', opts: [{ v: 'dentro_esperado', l: 'Dentro do esperado' }, { v: 'com_atraso', l: 'Com atraso' }], detailKey: 'desenvolvimentoDetalhe' },
                                  { key: 'saude', label: 'Saúde', opts: [{ v: 'sem_problemas', l: 'Sem problemas' }, { v: 'com_diagnostico', l: 'Com diagnóstico' }], detailKey: 'saudeDetalhe' },
                                  { key: 'medicacao', label: 'Uso de medicação', opts: [{ v: 'nao', l: 'Não' }, { v: 'sim', l: 'Sim' }], detailKey: 'medicacaoDetalhe' },
                                ].map(({ key, label, opts, detailKey }) => (
                                  <div key={key}>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">{label}</p>
                                    <div className="flex gap-2 mb-2">
                                      {opts.map(({ v, l }) => (
                                        <button key={v} onClick={() => setAnamneseData(p => ({ ...p, [key]: v }))}
                                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${(anamneseData as any)[key] === v ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                                          {l}
                                        </button>
                                      ))}
                                    </div>
                                    {((anamneseData as any)[key] === 'com_intercorrencias' || (anamneseData as any)[key] === 'com_atraso' || (anamneseData as any)[key] === 'com_diagnostico' || (anamneseData as any)[key] === 'sim') && (
                                      <input type="text" value={(anamneseData as any)[detailKey]} onChange={e => setAnamneseData(p => ({ ...p, [detailKey]: e.target.value }))} placeholder="Descreva..." className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Seção 5 - Contexto Familiar */}
                            <div id="psych-sec-5" data-psych-section="psych-sec-5" className="bg-white border border-slate-100 rounded-2xl p-5 scroll-mt-28">
                              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-widest mb-4 pb-3 border-b border-slate-100">
                                <Home size={14} /> 5. Contexto familiar
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Com quem mora</p>
                                  <textarea value={anamneseData.comQuemMora} onChange={e => setAnamneseData(p => ({ ...p, comQuemMora: e.target.value }))} placeholder="Descreva a composição familiar..." rows={3} className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 resize-y" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Rotina familiar</p>
                                  <textarea value={anamneseData.rotinafamiliar} onChange={e => setAnamneseData(p => ({ ...p, rotinafamiliar: e.target.value }))} placeholder="Descreva a rotina..." rows={3} className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 resize-y" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Mudanças recentes</p>
                                  <div className="flex gap-2 mb-2">
                                    {[{ v: 'nao', l: 'Não' }, { v: 'sim', l: 'Sim' }].map(({ v, l }) => (
                                      <button key={v} onClick={() => setAnamneseData(p => ({ ...p, mudancasRecentes: v as any }))}
                                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${anamneseData.mudancasRecentes === v ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                                        {l}
                                      </button>
                                    ))}
                                  </div>
                                  {anamneseData.mudancasRecentes === 'sim' && (
                                    <input type="text" value={anamneseData.mudancasDetalhe} onChange={e => setAnamneseData(p => ({ ...p, mudancasDetalhe: e.target.value }))} placeholder="Descreva as mudanças..." className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400" />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Seção 6 - Funcionamento Escolar */}
                            <div id="psych-sec-6" data-psych-section="psych-sec-6" className="bg-white border border-slate-100 rounded-2xl p-5 scroll-mt-28">
                              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-widest mb-4 pb-3 border-b border-slate-100">
                                <SchoolIcon size={14} /> 6. Funcionamento escolar
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {[
                                  { key: 'relacaoProfessores', label: 'Relação com professores', detailKey: 'relacaoProfessoresDetalhe' },
                                  { key: 'relacaoColegas', label: 'Relação com colegas', detailKey: 'relacaColegasDetalhe' },
                                  { key: 'aprendizagem', label: 'Aprendizagem', detailKey: 'aprendizagemDetalhe' },
                                ].map(({ key, label, detailKey }) => (
                                  <div key={key}>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">{label}</p>
                                    <div className="flex gap-2 mb-2">
                                      {[{ v: 'adequada', l: 'Adequada' }, { v: 'dificuldades', l: 'Com dificuldades' }].map(({ v, l }) => (
                                        <button key={v} onClick={() => setAnamneseData(p => ({ ...p, [key]: v }))}
                                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${(anamneseData as any)[key] === v ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                                          {l}
                                        </button>
                                      ))}
                                    </div>
                                    {(anamneseData as any)[key] === 'dificuldades' && (
                                      <input type="text" value={(anamneseData as any)[detailKey]} onChange={e => setAnamneseData(p => ({ ...p, [detailKey]: e.target.value }))} placeholder="Descreva as dificuldades..." className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400" />
                                    )}
                                  </div>
                                ))}
                                <div>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Comportamento</p>
                                  <div className="flex flex-wrap gap-2">
                                    {['Participativo', 'Agitado', 'Inibido', 'Disperso', 'Outro'].map(opt => (
                                      <button key={opt} onClick={() => setAnamneseData(p => ({ ...p, comportamentos: p.comportamentos.includes(opt) ? p.comportamentos.filter(c => c !== opt) : [...p.comportamentos, opt] }))}
                                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${anamneseData.comportamentos.includes(opt) ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Seção 7 - Comportamentos Observados */}
                            <div id="psych-sec-7" data-psych-section="psych-sec-7" className="bg-white border border-slate-100 rounded-2xl p-5 scroll-mt-28">
                              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-widest mb-4 pb-3 border-b border-slate-100">
                                <Eye size={14} /> 7. Comportamentos observados / relatados
                              </div>
                              <div className="flex flex-wrap gap-2 mb-4">
                                {['Irritabilidade', 'Agressividade', 'Ansiedade', 'Choro frequente', 'Dificuldade de atenção', 'Isolamento', 'Medos excessivos'].map(opt => (
                                  <button key={opt} onClick={() => setAnamneseData(p => ({ ...p, intervencoes: p.intervencoes.includes(opt) ? p.intervencoes.filter(c => c !== opt) : [...p.intervencoes, opt] }))}
                                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${anamneseData.intervencoes.includes(opt) ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                                    {opt}
                                  </button>
                                ))}
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Outros comportamentos</p>
                                <input type="text" value={anamneseData.comportamentoOutro} onChange={e => setAnamneseData(p => ({ ...p, comportamentoOutro: e.target.value }))} placeholder="Descreva outros comportamentos..." className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400" />
                              </div>
                            </div>

                            {/* Seção 8 - Intervenções */}
                            <div id="psych-sec-8" data-psych-section="psych-sec-8" className="bg-white border border-slate-100 rounded-2xl p-5 scroll-mt-28">
                              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-widest mb-4 pb-3 border-b border-slate-100">
                                <RefreshCw size={14} /> 8. Intervenções já realizadas
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {['Nenhuma', 'Psicoterapia', 'Acompanhamento médico', 'Fonoaudiologia', 'Psicopedagogia', 'Terapia Ocupacional', 'Outros'].map(opt => (
                                  <button key={opt} onClick={() => setAnamneseData(p => ({ ...p, intervencoes: p.intervencoes.includes(opt) ? p.intervencoes.filter(c => c !== opt) : [...p.intervencoes, opt] }))}
                                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${anamneseData.intervencoes.includes(opt) ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Seções 9 e 10 */}
                            {[
                              { key: 'observacoesPsicologa', icon: FileText, num: '9', secId: 'psych-sec-9', title: 'Observações da psicóloga', placeholder: 'Registre suas observações clínicas...' },
                              { key: 'encaminhamentoPlano', icon: Map, num: '10', secId: 'psych-sec-10', title: 'Encaminhamento / plano inicial', placeholder: 'Descreva o plano de intervenção...' },
                            ].map(({ key, icon: Icon, num, secId, title, placeholder }) => (
                              <div key={key} id={secId} data-psych-section={secId} className="bg-white border border-slate-100 rounded-2xl p-5 scroll-mt-28">
                                <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-widest mb-4 pb-3 border-b border-slate-100">
                                  <Icon size={14} /> {num}. {title}
                                </div>
                                <textarea value={(anamneseData as any)[key]} onChange={e => setAnamneseData(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} rows={4} className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 resize-y" />
                              </div>
                            ))}

                            {/* Footer */}
                            <div className="flex justify-end gap-3 pt-2 no-print">
                              <button onClick={() => setAnamneseData(p => ({ ...p, status: 'finalizada' }))} className="text-sm font-semibold bg-teal-600 text-white px-4 py-2 rounded-xl hover:bg-teal-700 transition-colors flex items-center gap-2 no-print">
                                <CheckCircle2 size={15} /> Finalizar anamnese
                              </button>
                              <button onClick={handleSaveAnamnese} disabled={savingAnamnese} className="text-sm font-semibold bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 no-print">
                                <Save size={15} /> {savingAnamnese ? 'Salvando...' : 'Salvar rascunho'}
                              </button>
                            </div>
                          </div>
                        )}

                        {activeTab === 'prontuario' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                                    <h3 className="text-2xl font-black text-slate-800">Prontuário Clínico Seguro</h3>
                                    <button onClick={handleSaveGeneral} className="w-full sm:w-auto bg-purple-600 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 shadow-md"><Save size={18} /> Salvar Prontuário</button>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <FormSection title="Análise Psicológica" icon={Brain} color="text-purple-700">
                                        <StyledInput label="Comportamentos Observados" rows={3} value={privateData.formData.triagemPsicologica.comportamentosObservados} onChange={e => handlePrivateChange('triagemPsicologica', 'comportamentosObservados', e.target.value)} />
                                        <StyledInput label="Hipóteses Diagnósticas Iniciais" rows={3} value={privateData.formData.triagemPsicologica.hipotesesIniciais} onChange={e => handlePrivateChange('triagemPsicologica', 'hipotesesIniciais', e.target.value)} />
                                    </FormSection>
                                    <FormSection title="Plano Terapêutico" icon={Zap} color="text-purple-700">
                                        <StyledInput label="Objetivo Principal" rows={2} value={privateData.formData.planoTerapeutico.objetivoPrincipal} onChange={e => handlePrivateChange('planoTerapeutico', 'objetivoPrincipal', e.target.value)} />
                                        <StyledInput label="Metas e Intervenções" rows={3} value={privateData.formData.planoTerapeutico.metasEspecificas} onChange={e => handlePrivateChange('planoTerapeutico', 'metasEspecificas', e.target.value)} />
                                    </FormSection>
                                </div>
                            </div>
                        )}

                        {activeTab === 'sessions' && (
                            <div className="space-y-6 animate-fadeIn">
                                {isEditingSession ? (
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock className="text-purple-600" /> Registro de Atendimento</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                            <StyledInput label="Data e Hora" type="datetime-local" value={currentSession.dataHoraISO} onChange={e => setCurrentSession({ ...currentSession, dataHoraISO: e.target.value })} />
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Humor Predominante</label>
                                                <select className="w-full p-2.5 rounded-xl border border-slate-300" value={currentSession.humor} onChange={e => setCurrentSession({ ...currentSession, humor: e.target.value as any })}>
                                                    <option value="feliz">😊 Feliz / Estável</option>
                                                    <option value="neutro">😐 Neutro</option>
                                                    <option value="triste">😢 Triste / Retraído</option>
                                                    <option value="ansioso">😟 Ansioso / Agitado</option>
                                                    <option value="irritado">😠 Irritado / Opositivo</option>
                                                </select>
                                            </div>
                                            <StyledInput label="Duração (min)" type="number" value={currentSession.duracaoMin} onChange={(e: any) => setCurrentSession({ ...currentSession, duracaoMin: parseInt(e.target.value) })} />
                                        </div>
                                        <StyledInput label="Título da Sessão" value={currentSession.titulo} onChange={(e: any) => setCurrentSession({ ...currentSession, titulo: e.target.value })} placeholder="Ex: Trabalhando frustração através do lúdico" />
                                        <StyledInput label="Evolução / Observações Clínicas" rows={5} value={currentSession.anotacoes} onChange={(e: any) => setCurrentSession({ ...currentSession, anotacoes: e.target.value })} />

                                        <div className="flex items-center gap-3 mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                                            <input type="checkbox" id="alta" className="w-5 h-5 accent-purple-600" checked={currentSession.indicativoAlta} onChange={e => setCurrentSession({ ...currentSession, indicativoAlta: e.target.checked })} />
                                            <label htmlFor="alta" className="font-bold text-purple-900 cursor-pointer">Registrar indicativo de Alta Psicologia</label>
                                        </div>

                                        <div className="mt-6 flex justify-end gap-3">
                                            <button onClick={() => setIsEditingSession(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                                            <button onClick={handleSaveSession} className="w-full sm:w-auto bg-purple-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-purple-700 shadow-lg">Salvar Sessão</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                            <h3 className="text-2xl font-black text-slate-800">Histórico de Evoluções</h3>
                                            <button onClick={() => { setCurrentSession({ dataHoraISO: new Date().toISOString().slice(0, 16), humor: 'neutro', status: 'Realizado', duracaoMin: 50 }); setIsEditingSession(true); }} className="w-full sm:w-auto bg-purple-600 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 shadow-md"><Plus size={18} /> Novo Registro</button>
                                        </div>
                                        <div className="space-y-4">
                                            {privateData.sessions.length === 0 ? (
                                                <p className="text-center text-slate-400 py-10 italic">Nenhum atendimento registrado.</p>
                                            ) : (
                                                privateData.sessions.map((sess, idx) => (
                                                    <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-purple-200 transition-all shadow-sm group">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-3xl">{MOOD_EMOJIS[sess.humor] || '😊'}</div>
                                                                <div>
                                                                    <span className="text-xs font-bold text-slate-400 uppercase">{new Date(sess.dataHoraISO).toLocaleDateString()} • {new Date(sess.dataHoraISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    <h4 className="font-bold text-slate-800">{sess.titulo}</h4>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                                                                <button onClick={() => handlePrintPsychology(sess)} title="Imprimir registro" className="text-purple-600/50 hover:text-purple-600"><Printer size={18} /></button>
                                                                <button onClick={() => { setCurrentSession(sess); setIsEditingSession(true); }} className="text-slate-400 hover:text-purple-600"><Edit2 size={18} /></button>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-slate-600 line-clamp-3 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                                            "{sess.anotacoes || sess.resumo || 'Sem notas detalhadas.'}"
                                                        </p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'reports' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h3 className="text-2xl font-black text-slate-800 mb-8">Central de Relatórios</h3>
                                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-12 rounded-3xl border border-purple-100 text-center shadow-inner">
                                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-purple-100"><Printer size={40} className="text-purple-600" /></div>
                                    <h4 className="text-xl font-bold text-slate-800 mb-2">Relatório de Evolução Psicológica</h4>
                                    <p className="text-slate-500 mb-8 max-w-md mx-auto">Gere um documento oficial contendo dados de identificação, metas terapêuticas e o extrato da última evolução clínica.</p>
                                    <button onClick={() => handlePrintPsychology()} className="px-10 py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-xl hover:bg-purple-700 transition-all flex items-center gap-2 mx-auto scale-110"><Printer size={20} /> Imprimir Prontuário Completo</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- COMPONENTES AUXILIARES SOCIAL ---
// --- COMPONENTES AUXILIARES SOCIAL ---
const SocialSection = ({ title, isOpen, onToggle, children, icon: Icon, color = 'cyan' }: any) => {
    const colorMap: any = {
        cyan: 'text-cyan-600 bg-cyan-50 border-cyan-100 ring-cyan-50',
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100 ring-indigo-50',
        blue: 'text-blue-600 bg-blue-50 border-blue-100 ring-blue-50',
        purple: 'text-purple-600 bg-purple-50 border-purple-100 ring-purple-50'
    };

    const activeColor = colorMap[color] || colorMap.cyan;

    return (
        <div className={`rounded-[2.5rem] bg-white border border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-slate-300/40 group ${isOpen ? 'ring-4 ring-slate-100/50' : ''}`}>
            <button
                onClick={onToggle}
                type="button"
                className={`w-full flex items-center justify-between p-8 text-left transition-all duration-300 ${isOpen ? 'bg-slate-50/50' : 'bg-white hover:bg-slate-50'}`}
            >
                <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-2xl shadow-inner transition-all duration-500 ${isOpen ? activeColor : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'}`}>
                        {Icon && <Icon size={24} strokeWidth={2.5} />}
                    </div>
                    <div>
                        <h3 className={`text-lg font-black uppercase tracking-widest transition-colors duration-300 ${isOpen ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>{title}</h3>
                        {isOpen && <div className={`h-1.5 w-12 bg-gradient-to-r from-${color}-500 to-${color}-300 rounded-full mt-2 shadow-sm animate-pulse`}></div>}
                    </div>
                </div>
                <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 ${isOpen ? 'bg-slate-900 text-white rotate-180' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'}`}>
                    <ChevronDown size={20} strokeWidth={3} />
                </div>
            </button>

            <div className={`transition-all duration-700 ease-in-out overflow-hidden ${isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-10 border-t border-slate-100 bg-white/50 backdrop-blur-sm">
                    {children}
                </div>
            </div>
        </div>
    );
};


// --- DASHBOARD ESPECÍFICO DE SERVIÇO SOCIAL ---
// --- TIPOS E HELPER DE SERVIÇO SOCIAL (RESTAURADO) ---

interface SocialServiceForm {
    identificacao: {
        genero: string;
        nomeResponsavel: string;
        grauParentesco: string;
        numeroPessoasResidencia: string;
        telefonesContato: string;
        documento: string;
        nis: string;
        matriculado: string;
        nomeEscola: string;
    };
    historicoEscolar: {
        frequentouAnteriormente: string;
        ultimaEscola: string;
        ultimoAnoSerie: string;
        anoParou: string;
        idadeSaiu: string;
        motivosSaida: string[];
        motivosSaidaOutros: string;
    };
    condicoesFamiliares: {
        responsaveisLegais: string;
        fonteRenda: string;
        programasSociais: string[];
        deficienciaResidencia: string;
        quemDeficiencia: string;
        alunoDeficiencia: string;
        qualDeficiencia: string;
        situacoesEnfrentadas: string[];
        adultosAlfabetizados: string;
        educacaoPrioridade: string;
    };
    saudeAcompanhamentos: {
        acompanhamentoMedico: string;
        medicacaoContinua: string;
        qualMedicacao: string;
        acompanhamentoPsi: string;
        conselhoTutelar: string;
        servicosAtendimento: string[];
        outrosServicos: string;
    };
    situacaoAtual: {
        desejoRetornar: string;
        apoioFamilia: string;
        fatoresDificultam: string[];
        fatoresDificultamOutros: string;
        apoiosNecessarios: string[];
        apoiosNecessariosOutros: string;
    };
    observacoesEncaminhamentos: {
        observacoesAgente: string;
        acoesRecomendadas: string[];
        acoesRecomendadasOutros: string;
        statusRegistro: 'PENDENTE' | 'CONCLUÍDO';
    };
    // NOVOS CAMPOS - ALINHAMENTO INSTITUCIONAL
    statusCaso: 'Em Acompanhamento' | 'Encaminhado Educação Especial' | 'Encaminhado Conselho Tutelar' | 'Concluído/Reinserido' | '';
    indicadoresEducacionais: {
        barreirasAcesso: boolean | null;
        dificuldadesAprendizagem: boolean | null;
        apoioEspecializado: boolean | null;
    };
    encaminhamentoInstitucional: {
        sugestao: 'Conselho Tutelar' | 'Educação Especial' | 'CRAS' | 'Saúde' | 'Não há encaminhamento' | '';
        motivo: string;
        prioridade: 'Baixa' | 'Média' | 'Alta' | '';
        dataEncaminhamento: string;
        profissionalResponsavel: string;
    };
}

interface SocialServicePrivateData {
    formData: SocialServiceForm;
    lastUpdate: string;
    professionalName: string;
}

const initialSocialForm: SocialServiceForm = {
    identificacao: { genero: '', nomeResponsavel: '', grauParentesco: '', numeroPessoasResidencia: '', telefonesContato: '', documento: '', nis: '', matriculado: '', nomeEscola: '' },
    historicoEscolar: { frequentouAnteriormente: '', ultimaEscola: '', ultimoAnoSerie: '', anoParou: '', idadeSaiu: '', motivosSaida: [], motivosSaidaOutros: '' },
    condicoesFamiliares: { responsaveisLegais: '', fonteRenda: '', programasSociais: [], deficienciaResidencia: '', quemDeficiencia: '', alunoDeficiencia: '', qualDeficiencia: '', situacoesEnfrentadas: [], adultosAlfabetizados: '', educacaoPrioridade: '' },
    saudeAcompanhamentos: { acompanhamentoMedico: '', medicacaoContinua: '', qualMedicacao: '', acompanhamentoPsi: '', conselhoTutelar: '', servicosAtendimento: [], outrosServicos: '' },
    situacaoAtual: { desejoRetornar: '', apoioFamilia: '', fatoresDificultam: [], fatoresDificultamOutros: '', apoiosNecessarios: [], apoiosNecessariosOutros: '' },
    observacoesEncaminhamentos: { observacoesAgente: '', acoesRecomendadas: [], acoesRecomendadasOutros: '', statusRegistro: 'PENDENTE' },
    // NOVOS
    statusCaso: '',
    indicadoresEducacionais: { barreirasAcesso: null, dificuldadesAprendizagem: null, apoioEspecializado: null },
    encaminhamentoInstitucional: { sugestao: '', motivo: '', prioridade: '', dataEncaminhamento: '', profissionalResponsavel: '' }
};

const extractSocialData = (student: Student): SocialServicePrivateData => {
    const raw = student.clinical.social_data || {};
    // Fallback and deep merge would be better, but initialSocialForm provides a safe default template
    const mergedData = { ...initialSocialForm };
    if (raw.formData) {
        // Simple merge for existing sections
        Object.keys(raw.formData).forEach(key => {
            if ((mergedData as any)[key] && typeof (mergedData as any)[key] === 'object') {
                (mergedData as any)[key] = { ...(mergedData as any)[key], ...raw.formData[key] };
            }
        });
    }

    return {
        formData: mergedData,
        lastUpdate: raw.lastUpdate || student.createdAt,
        professionalName: raw.professionalName || ''
    };
};

// --- DASHBOARD GERENCIAL (VISÃO GERAL) ---
const SocialOverviewDashboard: React.FC<{
    students: Student[];
    onNavigateToCase: (studentId: string) => void;
    currentUser: User;
}> = ({ students, onNavigateToCase, currentUser }) => {

    // 1. CÁLCULO DE INDICADORES (KPIs)
    const stats = useMemo(() => {
        let activeSearch = 0;
        let pending = 0;
        let council = 0;
        let specialEd = 0;
        let resolved = 0;

        const reasons: Record<string, number> = {};
        const schools: Record<string, number> = {};
        const ages: Record<string, number> = {};

        students.forEach(s => {
            const social = s.clinical?.social_data?.formData;
            const interview = s.clinical?.social_interview;

            if (social || interview) {
                // Busca Ativa ou Entrevista
                if (social?.statusCaso || interview) activeSearch++;

                // Pendentes: Status Pendente ou Em Acompanhamento
                if (social?.observacoesEncaminhamentos?.statusRegistro === 'PENDENTE' ||
                    social?.statusCaso === 'Em Acompanhamento' ||
                    interview?.status === 'Pendente') {
                    pending++;
                }

                // Encaminhamentos Específicos
                if (social?.statusCaso?.includes('Conselho Tutelar') || social?.encaminhamentoInstitucional?.sugestao === 'Conselho Tutelar') council++;
                if (social?.statusCaso?.includes('Educação Especial') || social?.encaminhamentoInstitucional?.sugestao === 'Educação Especial') specialEd++;

                // Resolvidos
                if (social?.statusCaso === 'Concluído/Reinserido' || interview?.status === 'Completo') resolved++;

                // --- Gráficos ---
                // Motivos
                const list = social?.historicoEscolar?.motivosSaida || [];
                list.forEach((r: string) => {
                    reasons[r] = (reasons[r] || 0) + 1;
                });

                // Escolas
                if (s.school?.schoolName) {
                    schools[s.school.schoolName] = (schools[s.school.schoolName] || 0) + 1;
                }

                // Idade
                const age = calculateAge(s.birthDate);
                if (typeof age === 'number') {
                    let group = '';
                    if (age <= 5) group = '0-5 anos';
                    else if (age <= 10) group = '6-10 anos';
                    else if (age <= 14) group = '11-14 anos';
                    else if (age <= 18) group = '15-18 anos';
                    else group = '19+ anos';

                    ages[group] = (ages[group] || 0) + 1;
                }
            }
        });

        const reasonsData = Object.entries(reasons)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        const schoolsData = Object.entries(schools)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        const ageData = Object.entries(ages)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => a.name.localeCompare(b.name)); // Ordem de faixa etária

        return { activeSearch, pending, council, specialEd, resolved, reasonsData, schoolsData, ageData };
    }, [students]);

    // 2. LISTA DE PRIORIDADES (Casos abertos/recentes)
    const priorities = useMemo(() => {
        return students
            .filter(s => {
                const social = s.clinical?.social_data?.formData;
                const interview = s.clinical?.social_interview;
                if (!social && !interview) return false;

                // Critérios de prioridade: Status Pendente, Em Acompanhamento, ou Prioridade Alta marcada
                return social?.observacoesEncaminhamentos?.statusRegistro === 'PENDENTE' ||
                    social?.statusCaso === 'Em Acompanhamento' ||
                    social?.encaminhamentoInstitucional?.prioridade === 'Alta' ||
                    interview?.status === 'Pendente' ||
                    interview?.status === 'Em Análise';
            })
            .sort((a, b) => {
                const priorityA = a.clinical?.social_data?.formData.encaminhamentoInstitucional?.prioridade === 'Alta' || a.clinical?.social_interview?.status === 'Em Análise' ? 2 : 1;
                const priorityB = b.clinical?.social_data?.formData.encaminhamentoInstitucional?.prioridade === 'Alta' || b.clinical?.social_interview?.status === 'Em Análise' ? 2 : 1;
                if (priorityA !== priorityB) return priorityB - priorityA;

                const dateA = new Date(a.clinical?.social_data?.lastUpdate || a.createdAt || 0).getTime();
                const dateB = new Date(b.clinical?.social_data?.lastUpdate || b.createdAt || 0).getTime();
                return dateB - dateA;
            })
            .slice(0, 5); // Top 5
    }, [students]);

    return (
        <div className="space-y-10 animate-fadeIn pb-20">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Visão Geral da Rede</h2>
                    <p className="text-slate-500 font-medium mt-2">Painel de Monitoramento de Busca Ativa e Proteção Social</p>
                </div>
                <div className="px-6 py-2 bg-purple-50 text-purple-700 rounded-full font-bold text-xs uppercase tracking-widest border border-purple-100 flex items-center gap-2">
                    <Activity size={14} />
                    Dados em Tempo Real
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard title="Em Busca Ativa" value={stats.activeSearch} icon={Search} gradient="from-blue-400 to-blue-600" />
                <StatCard title="Casos Pendentes" value={stats.pending} icon={Clock} gradient="from-amber-400 to-amber-600" />
                <StatCard title="Conselho Tutelar" value={stats.council} icon={ShieldAlert} gradient="from-rose-400 to-rose-600" />
                <StatCard title="Ed. Especial" value={stats.specialEd} icon={Brain} gradient="from-indigo-400 to-indigo-600" />
                <StatCard title="Resolvidos" value={stats.resolved} icon={CheckCircle} gradient="from-emerald-400 to-emerald-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LISTA DE PRIORIDADES */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                        <h3 className="font-bold text-slate-700 uppercase tracking-widest text-sm flex items-center gap-3">
                            <Flag className="text-rose-500" size={18} /> Minhas Prioridades de Ação
                        </h3>
                    </div>

                    <div className="overflow-x-auto w-full">
                        <table className="min-w-[500px] w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                                    <th className="pb-4 pl-2">Aluno / Escola</th>
                                    <th className="pb-4">Status</th>
                                    <th className="pb-4">Prioridade</th>
                                    <th className="pb-4">Última Atualização</th>
                                    <th className="pb-4 text-right pr-2">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {priorities.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-slate-400 text-sm font-medium">
                                            Nenhum caso prioritário pendente.
                                        </td>
                                    </tr>
                                ) : (
                                    priorities.map(student => {
                                        const social = student.clinical?.social_data?.formData;
                                        const interview = student.clinical?.social_interview;
                                        const priority = social?.encaminhamentoInstitucional?.prioridade || (interview?.status === 'Em Análise' ? 'Alta' : 'Normal');
                                        const lastUpdateDate = (student.clinical?.social_data?.lastUpdate || student.createdAt)
                                            ? new Date(student.clinical?.social_data?.lastUpdate || student.createdAt || 0).toLocaleDateString()
                                            : 'N/A';

                                        return (
                                            <tr key={student.id} className="group hover:bg-slate-50 transition-colors">
                                                <td className="py-4 pl-2">
                                                    <div className="font-bold text-slate-700 text-sm">{student.fullName}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{student.school?.schoolName || 'Sem escola'}</div>
                                                </td>
                                                <td className="py-4">
                                                    <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${(social?.statusCaso?.includes('Concluído') || interview?.status === 'Completo') ? 'bg-emerald-100 text-emerald-600' :
                                                        (social?.statusCaso?.includes('Conselho') || interview?.status === 'Em Análise') ? 'bg-rose-100 text-rose-600' :
                                                            'bg-amber-100 text-amber-600'
                                                        }`}>
                                                        {social?.statusCaso || interview?.status || 'Pendente'}
                                                    </span>
                                                </td>
                                                <td className="py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${(priority === 'Alta' || interview?.status === 'Em Análise') ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                        }`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${priority === 'Alta' ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`} />
                                                        {priority}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-xs font-medium text-slate-500">
                                                    {lastUpdateDate}
                                                </td>
                                                <td className="py-4 text-right pr-2">
                                                    <button
                                                        onClick={() => onNavigateToCase(student.id)}
                                                        className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-[#1E7F85] hover:text-white hover:border-[#1E7F85] transition-all shadow-sm"
                                                    >
                                                        Ver Caso
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* AGENDA SOCIAL */}
                <div className="bg-gradient-to-br from-[#1E7F85] to-[#145f63] rounded-[2rem] p-8 text-white relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><Calendar size={120} /></div>
                    <h3 className="font-bold text-white/90 uppercase tracking-widest text-sm mb-8 flex items-center gap-3 relative z-10">
                        <Calendar size={18} /> Agenda Social
                    </h3>
                    <div className="space-y-6 relative z-10 flex-1">
                        <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:bg-white/20 transition-colors cursor-pointer group">
                            <span className="text-[10px] font-bold text-[#F5C474] uppercase tracking-widest block mb-1 group-hover:text-white transition-colors">Próxima Visita</span>
                            <p className="font-bold text-lg">Visita Domiciliar - Família Silva</p>
                            <div className="flex items-center gap-2 text-white/60 mt-2 text-xs font-medium group-hover:text-white/80">
                                <Clock size={12} /> Amanhã, 09:00hs
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:bg-white/20 transition-colors cursor-pointer group">
                            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest block mb-1 group-hover:text-white transition-colors">Prazo Encaminhamento</span>
                            <p className="font-bold text-lg">Relatório para Conselho Tutelar</p>
                            <div className="flex items-center gap-2 text-white/60 mt-2 text-xs font-medium group-hover:text-white/80">
                                <AlertCircle size={12} /> Vence em 2 dias
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => onNavigateToCase ? onNavigateToCase('agenda') : null}
                        className="w-full py-4 bg-white text-[#1E7F85] rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#F5C474] hover:text-[#1E7F85] transition-colors mt-6 shadow-lg"
                    >
                        Ver Agenda Completa
                    </button>
                </div>
            </div>

            {/* GRÁFICOS VISÃO DE REDE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 uppercase tracking-widest text-sm mb-6 flex items-center gap-3">
                        <PieIcon className="text-indigo-500" size={18} /> Motivos de Evasão
                    </h3>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.reasonsData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9, fill: '#64748b' }} interval={0} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 uppercase tracking-widest text-sm mb-6 flex items-center gap-3">
                        <SchoolIcon className="text-emerald-500" size={18} /> Escolas + Incidência
                    </h3>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.schoolsData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9, fill: '#64748b' }} interval={0} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 uppercase tracking-widest text-sm mb-6 flex items-center gap-3">
                        <Users className="text-amber-500" size={18} /> Faixa Etária Afetada
                    </h3>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.ageData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                                <YAxis hide />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- DASHBOARD ESTRATÉGICO (VISÃO GERAL) ---
const SocialServiceStrategicDashboard: React.FC<BaseDashboardProps> = ({ title, onNavigateNew, onNavigateToCase, currentUser }) => {
    const [students, setStudents] = useState<Student[]>([]);

    useEffect(() => {
        const load = async () => {
            const data = await SupabaseService.getStudentsForUser(currentUser);
            setStudents(data);
        };
        load();
    }, []);

    return (
        <div className="max-w-7xl mx-auto p-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-2xl text-purple-600"><Activity size={32} /></div>
                    {title}
                </h1>
                <div className="flex gap-3">
                    <button
                        onClick={onNavigateNew} // Leva para a área de Atendimento via App.tsx
                        className="px-6 py-3 bg-[#1E7F85] text-white rounded-xl font-bold uppercase tracking-widest shadow-lg hover:shadow-xl hover:bg-[#16666b] transition-all flex items-center gap-2"
                    >
                        <Briefcase size={20} /> Ir para Atendimento
                    </button>
                </div>
            </div>

            <SocialOverviewDashboard
                students={students}
                onNavigateToCase={(id) => {
                    if (id === 'agenda') {
                        // Hacky way to use existing prop or I need a new one. 
                        // SocialServiceStrategicDashboard receives onNavigateNew. 
                        // But onNavigateNew goes to 'social-service-hub'.
                        // I should probably add onNavigate to SocialServiceStrategicDashboard props.
                        if (onNavigateToCase) onNavigateToCase(id);
                    } else {
                        onNavigateToCase ? onNavigateToCase(id) : onNavigateNew();
                    }
                }}
                currentUser={currentUser}
            />
        </div>
    );
};

// --- HUB DE ATENDIMENTO (SERVIÇO SOCIAL - OPERACIONAL) ---
const SocialServiceAttendanceHub: React.FC<BaseDashboardProps & { preSelectedStudent?: Student; allStudents?: Student[] }> = ({ title, onNavigateNew, currentUser, preSelectedStudent, allStudents }) => {
    // SEM VIZUALIZAÇÃO DE DASHBOARD - APENAS ATTENDANCE

    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(preSelectedStudent || null);

    const [socialData, setSocialData] = useState<SocialServiceForm>(initialSocialForm);
    const [lastUpdate, setLastUpdate] = useState('');
    const [activeTab, setActiveTab] = useState(1);
    const { success: showToast, error: toastError } = useToast();

    // -- School Search Logic --
    const [selectedSchool, setSelectedSchool] = useState<string>('');

    const uniqueSchools = useMemo(() => {
        const schools = students.map(s => s.school?.schoolName).filter(Boolean);
        return Array.from(new Set(schools)).sort();
    }, [students]);

    const filteredStudents = useMemo(() => {
        if (!selectedSchool) return students;
        return students.filter(s => s.school?.schoolName === selectedSchool);
    }, [students, selectedSchool]);
    // -------------------------

    // GATEKEEPER: Apenas Assistente Social (ADMIN visualiza tudo, outros veem limitado)
    const specialtyStr = currentUser.specialty as string;
    const isSocialWorker = specialtyStr === Specialty.SOCIAL_WORK || specialtyStr === 'SERVICO_SOCIAL' || currentUser.role === 'ADMIN';

    useEffect(() => {
        const load = async () => {
            const data = await SupabaseService.getStudentsForUser(currentUser);
            setStudents(data);
        };
        load();
    }, []);

    useEffect(() => {
        if (preSelectedStudent) {
            setSelectedStudent(preSelectedStudent);
        }
    }, [preSelectedStudent]);

    useEffect(() => {
        if (selectedStudent) {
            const data = extractSocialData(selectedStudent);
            setSocialData(data.formData);
            setLastUpdate(data.lastUpdate);
        } else {
            setSocialData(initialSocialForm);
            setLastUpdate('');
        }
    }, [selectedStudent]);

    const handleStudentSelect = (id: string) => {
        const student = students.find(s => s.id === id);
        setSelectedStudent(student || null);
        setActiveTab(1);
    };

    const handleNavigateToCase = (studentId: string) => {
        handleStudentSelect(studentId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBackToDashboard = () => {
        // Agora apenas limpa a seleção para voltar à busca
        setSelectedStudent(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleChange = (section: keyof SocialServiceForm, field: string, value: any) => {
        if (!isSocialWorker) return;
        setSocialData(prev => {
            // Handle top-level fields (like statusCaso) if field is empty or special identifier
            if (field === '__ROOT__') {
                return { ...prev, [section]: value };
            }
            // Add safety check for object spread
            const sectionData = prev[section] as any;
            if (typeof sectionData !== 'object' || sectionData === null) {
                return { ...prev, [section]: value }; // Fallback for direct assignment
            }
            return {
                ...prev,
                [section]: { ...sectionData, [field]: value }
            };
        });
    };

    const toggleMultiSelect = (section: keyof SocialServiceForm, field: string, item: string) => {
        if (!isSocialWorker) return;
        setSocialData(prev => {
            const list = (prev[section] as any)[field] as string[];
            const newList = list.includes(item) ? list.filter(i => i !== item) : [...list, item];
            return {
                ...prev,
                [section]: { ...(prev[section] as any), [field]: newList }
            };
        });
    };


    const handleSave = async (tab?: number) => {
        if (!selectedStudent) return;
        if (!isSocialWorker) {
            toastError("Acesso negado: Você não possui a permissão de Assistente Social ou Administrador para salvar estes dados.");
            return;
        }

        console.log('[Busca Ativa] Iniciando processo de salvamento...', { studentId: selectedStudent.id, userId: currentUser.id });

        try {
            const now = new Date().toISOString();
            const dataToSave: SocialServicePrivateData = {
                formData: socialData,
                lastUpdate: now,
                professionalName: currentUser.name
            };

            const updatedStudent = {
                ...selectedStudent,
                clinical: {
                    ...selectedStudent.clinical,
                    social_data: dataToSave
                }
            };

            // 1. Tenta salvar o estudante (Dados do Prontuário)
            try {
                await SupabaseService.saveStudent(updatedStudent);
                console.log('[Busca Ativa] Dados do estudante salvos com sucesso.');
                setLastUpdate(now);
            } catch (studentError: any) {
                console.error('[Busca Ativa] Erro ao salvar estudante:', studentError);
                throw new Error(`Erro ao salvar prontuário: ${studentError.message}`);
            }

            // 2. Tenta salvar o histórico (Sessão)
            try {
                if (!currentUser.id) {
                    console.warn('[Busca Ativa] ID do usuário não encontrado. Pulando registro de histórico.');
                } else {
                    const historyRecord: Session = {
                        id: crypto.randomUUID(),
                        date: now.split('T')[0],
                        specialty: Specialty.SOCIAL_WORK,
                        professionalName: currentUser.name,
                        notes: `Atendimento de Busca Ativa Escolar - Seção ${tab || activeTab} atualizada.`,
                        serviceType: 'Busca Ativa',
                        content: { summary: 'Atualização de formulário por abas', activeTab: tab || activeTab }
                    };
                    await SupabaseService.saveSession(historyRecord, selectedStudent.id, currentUser.id);
                    console.log('[Busca Ativa] Histórico registrado com sucesso.');
                }
            } catch (sessionError: any) {
                console.error('[Busca Ativa] Erro ao salvar histórico:', sessionError);
                // Não lança erro fatal, apenas notifica, pois o dado principal já foi salvo
                showToast('Prontuário salvo, mas houve erro ao registrar no histórico.', 'info');
                return;
            }

            showToast('Dados salvos com sucesso!');
        } catch (err: any) {
            console.error('[Busca Ativa] Erro Geral:', err);
            toastError(err.message || 'Erro ao salvar dados.');
        }
    };

    const handlePrintSocial = async () => {
        if (!selectedStudent || !isSocialWorker) return;

        try {
            const config = await SupabaseService.getPapelTimbradoConfig();
            const renderList = (list: string[]) => list && list.length > 0 ? list.join(', ') : 'Nenhum selecionado';

            const contentHTML = `
                <div style="text-align:center; margin-bottom:20px; font-weight:bold; color:#0e7490; background:#ecfeff; padding:10px; border-radius:8px; border:1px solid #0891b2; text-transform:uppercase;">
                    STATUS DO REGISTRO: ${socialData.observacoesEncaminhamentos.statusRegistro || 'PENDENTE'}
                </div>

                <h2 class="section-title">1. IDENTIFICAÇÃO DO(A) ALUNO(A)</h2>
                <div class="box">
                    <div class="data-row"><span class="label">GÊNERO</span><span class="value">${socialData.identificacao.genero || '-'}</span></div>
                    <div class="data-row"><span class="label">RESPONSÁVEL LEGAL</span><span class="value">${socialData.identificacao.nomeResponsavel || '-'} (${socialData.identificacao.grauParentesco || '-'})</span></div>
                    <div class="data-row"><span class="label">PESSOAS NA RESIDÊNCIA</span><span class="value">${socialData.identificacao.numeroPessoasResidencia || '-'}</span></div>
                    <div class="data-row"><span class="label">TELEFONES</span><span class="value">${socialData.identificacao.telefonesContato || '-'}</span></div>
                    <div class="data-row"><span class="label">DOCUMENTOS</span><span class="value">RG/CPF: ${socialData.identificacao.documento || '-'} | NIS: ${socialData.identificacao.nis || '-'}</span></div>
                    <div class="data-row"><span class="label">MATRICULADO?</span><span class="value">${socialData.identificacao.matriculado || '-'} ${socialData.identificacao.nomeEscola ? `(${socialData.identificacao.nomeEscola})` : ''}</span></div>
                </div>

                <h2 class="section-title">2. HISTÓRICO ESCOLAR</h2>
                <div class="box">
                    <div class="data-row"><span class="label">FREQUENTOU ANTERIORMENTE?</span><span class="value">${socialData.historicoEscolar.frequentouAnteriormente || '-'}</span></div>
                    <div class="data-row"><span class="label">ÚLTIMA ESCOLA / SÉRIE</span><span class="value">${socialData.historicoEscolar.ultimaEscola || '-'} / ${socialData.historicoEscolar.ultimoAnoSerie || '-'}</span></div>
                    <div class="data-row"><span class="label">ANO QUE PAROU / IDADE</span><span class="value">${socialData.historicoEscolar.anoParou || '-'} (${socialData.historicoEscolar.idadeSaiu || '-'} anos)</span></div>
                    <div class="data-row"><span class="label">MOTIVOS DA SAÍDA</span><span class="value">${renderList(socialData.historicoEscolar.motivosSaida)} ${socialData.historicoEscolar.motivosSaidaOutros ? ` - ${socialData.historicoEscolar.motivosSaidaOutros}` : ''}</span></div>
                </div>

                <h2 class="section-title">3. CONDIÇÕES FAMILIARES E SOCIAIS</h2>
                <div class="box">
                    <div class="data-row"><span class="label">FONTE DE RENDA</span><span class="value">${socialData.condicoesFamiliares.fonteRenda || '-'}</span></div>
                    <div class="data-row"><span class="label">PROGRAMAS SOCIAIS</span><span class="value">${renderList(socialData.condicoesFamiliares.programasSociais)}</span></div>
                    <div class="data-row"><span class="label">DEFICIÊNCIA NA RESIDÊNCIA?</span><span class="value">${socialData.condicoesFamiliares.deficienciaResidencia || '-'} ${socialData.condicoesFamiliares.quemDeficiencia ? `(${socialData.condicoesFamiliares.quemDeficiencia})` : ''}</span></div>
                    <div class="data-row"><span class="label">ALUNO COM DEFICIÊNCIA?</span><span class="value">${socialData.condicoesFamiliares.alunoDeficiencia || '-'} ${socialData.condicoesFamiliares.qualDeficiencia ? `(${socialData.condicoesFamiliares.qualDeficiencia})` : ''}</span></div>
                    <div class="data-row"><span class="label">ALFABETIZAÇÃO / PRIORIDADE EDUCAÇÃO</span><span class="value">Adultos alfabetizados: ${socialData.condicoesFamiliares.adultosAlfabetizados || '-'} | Educação prioridade: ${socialData.condicoesFamiliares.educacaoPrioridade || '-'}</span></div>
                    <div class="data-row" style="margin-top:5px; color:#b91c1c;"><span class="label">SITUAÇÕES ENFRENTADAS</span><span class="value">${renderList(socialData.condicoesFamiliares.situacoesEnfrentadas)}</span></div>
                </div>

                <h2 class="section-title">4. SAÚDE E ACOMPANHAMENTOS</h2>
                <div class="box">
                    <div class="data-row"><span class="label">ACOMP. MÉDICO / PSI</span><span class="value">${socialData.saudeAcompanhamentos.acompanhamentoMedico || '-'} / ${socialData.saudeAcompanhamentos.acompanhamentoPsi || '-'}</span></div>
                    <div class="data-row"><span class="label">MEDICAÇÃO CONTÍNUA</span><span class="value">${socialData.saudeAcompanhamentos.medicacaoContinua || '-'} ${socialData.saudeAcompanhamentos.qualMedicacao ? `(${socialData.saudeAcompanhamentos.qualMedicacao})` : ''}</span></div>
                    <div class="data-row"><span class="label">CONSELHO TUTELAR / SERVIÇOS</span><span class="value">${socialData.saudeAcompanhamentos.conselhoTutelar || '-'} | ${renderList(socialData.saudeAcompanhamentos.servicosAtendimento)} ${socialData.saudeAcompanhamentos.outrosServicos ? ` - ${socialData.saudeAcompanhamentos.outrosServicos}` : ''}</span></div>
                </div>

                <h2 class="section-title">5. SITUAÇÃO ATUAL E RETORNO</h2>
                <div class="box">
                    <div class="data-row"><span class="label">DESEJO DE RETORNO / APOIO FAMÍLIA</span><span class="value">${socialData.situacaoAtual.desejoRetornar || '-'} / ${socialData.situacaoAtual.apoioFamilia || '-'}</span></div>
                    <div class="data-row"><span class="label">FATORES QUE DIFICULTAM</span><span class="value">${renderList(socialData.situacaoAtual.fatoresDificultam)} ${socialData.situacaoAtual.fatoresDificultamOutros ? ` - ${socialData.situacaoAtual.fatoresDificultamOutros}` : ''}</span></div>
                    <div class="data-row"><span class="label">APOIOS NECESSÁRIOS</span><span class="value">${renderList(socialData.situacaoAtual.apoiosNecessarios)} ${socialData.situacaoAtual.apoiosNecessariosOutros ? ` - ${socialData.situacaoAtual.apoiosNecessariosOutros}` : ''}</span></div>
                </div>

                <h2 class="section-title">6. OBSERVAÇÕES E ENCAMINHAMENTOS</h2>
                <div class="box">
                    <div class="value" style="white-space: pre-wrap; min-height: 100px;">${socialData.observacoesEncaminhamentos.observacoesAgente || 'Sem observações registradas.'}</div>
                    <div style="margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top:10px;">
                        <span class="label">AÇÕES RECOMENDADAS</span><span class="value">${renderList(socialData.observacoesEncaminhamentos.acoesRecomendadas)} ${socialData.observacoesEncaminhamentos.acoesRecomendadasOutros ? ` - ${socialData.observacoesEncaminhamentos.acoesRecomendadasOutros}` : ''}</span>
                    </div>
                </div>
            `;

            const html = generateClinicalPrintHTML(
                selectedStudent,
                config,
                'Busca Ativa Escolar - Instrumento de Acompanhamento',
                contentHTML,
                { name: currentUser.name, jobTitle: currentUser.jobTitle || 'Assistente Social', specialty: currentUser.specialty, signatureUrl: currentUser.signatureUrl }
            );

            const printWindow = window.open('', '_blank', 'width=900,height=600');
            if (!printWindow) return;
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 500);
        } catch (e) {
            console.error('Erro ao gerar impressão:', e);
            toastError('Erro ao carregar configurações de papel timbrado.');
        }
    };

    if (!isSocialWorker && selectedStudent) {
        return (
            <div className="max-w-4xl mx-auto p-12 text-center bg-white rounded-2xl shadow-xl border border-slate-100">
                <div className="w-20 h-20 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-6 text-cyan-600 shadow-inner"><Shield size={40} /></div>
                <h3 className="text-2xl font-bold text-slate-800">Visualização de Status</h3>
                <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 inline-block text-left min-w-[300px]">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Informações do Aluno</p>
                    <div className="space-y-3">
                        <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500">Aluno:</span> <span className="font-bold text-slate-800">{selectedStudent.fullName}</span></div>
                        <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500">Status Registro:</span> <span className={`font-bold ${socialData.observacoesEncaminhamentos.statusRegistro === 'CONCLUÍDO' ? 'text-emerald-600' : 'text-amber-500'}`}>{socialData.observacoesEncaminhamentos.statusRegistro || 'PENDENTE'}</span></div>
                        {socialData.statusCaso && <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500">Situação:</span> <span className="font-bold text-blue-600">{socialData.statusCaso}</span></div>}
                        {socialData.encaminhamentoInstitucional.sugestao && <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500">Encaminhado para:</span> <span className="font-bold text-purple-600">{socialData.encaminhamentoInstitucional.sugestao}</span></div>}
                        <div className="flex justify-between pt-2"><span className="text-slate-500">Última Atualização:</span> <span className="font-medium text-slate-600">{lastUpdate ? new Date(lastUpdate).toLocaleDateString() : 'N/A'}</span></div>
                    </div>
                </div>
                <p className="text-slate-400 max-w-md mt-8 mx-auto text-sm leading-relaxed">Conforme diretrizes da LGPD e sigilo profissional, o acesso aos detalhes deste formulário é restrito aos Assistentes Sociais.</p>
            </div>
        );
    }

    // MAIN RENDER CONTROLLER
    // SEMPRE RENDERIZA A INTERFACE DE ATENDIMENTO (Dashboard removido)

    const tabs = [
        { id: 1, label: 'Identificação', icon: UserIcon },
        { id: 2, label: 'Histórico Escolar', icon: BookOpen },
        { id: 3, label: 'Social & Família', icon: Users },
        { id: 4, label: 'Condições de Saúde e Bem-estar', icon: Heart },
        { id: 5, label: 'Situação Atual', icon: Flag },
        { id: 6, label: 'Encaminhamento Inst.', icon: ShieldAlert }
    ];

    const handleTabChange = async (tabId: number) => {
        if (selectedStudent && isSocialWorker) {
            await handleSave();
        }
        setActiveTab(tabId);
    };

    return (
        <div className="min-h-screen bg-[#F7F5F0] py-12 px-4 animate-fadeIn">
            <div className="max-w-5xl mx-auto">
                {/* Back Link for Attendance Mode */}
                {!preSelectedStudent && selectedStudent && (
                    <button
                        onClick={handleBackToDashboard}
                        className="mb-6 flex items-center gap-2 text-slate-500 hover:text-[#1E7F85] font-bold text-xs uppercase tracking-widest transition-colors"
                    >
                        <ChevronLeft size={16} /> Voltar para Busca
                    </button>
                )}

                <div className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-[#1E7F85]/10 overflow-hidden">
                    <div className="bg-[#1E7F85] text-white p-10">
                        <div className="flex flex-col sm:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                                    <Heart size={36} className="text-[#F5C474]" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold uppercase tracking-widest text-white">Busca Ativa Escolar</h2>
                                    <p className="text-[#F7F5F0]/80 text-sm mt-1 font-medium tracking-wide">Instrumento de Acompanhamento Social</p>

                                    {/* STATUS VISUAL DO CASO */}
                                    {isSocialWorker && selectedStudent && (
                                        <div className="mt-4">
                                            <select
                                                value={socialData.statusCaso}
                                                onChange={(e) => handleChange('statusCaso', '__ROOT__', e.target.value)}
                                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest outline-none border-2 transition-all cursor-pointer ${socialData.statusCaso.includes('Educação Especial') ? 'bg-blue-600 border-blue-400 text-white' :
                                                    socialData.statusCaso.includes('Conselho') ? 'bg-rose-600 border-rose-400 text-white' :
                                                        socialData.statusCaso.includes('Concluído') ? 'bg-emerald-600 border-emerald-400 text-white' :
                                                            socialData.statusCaso.includes('Acompanhamento') ? 'bg-amber-500 border-amber-300 text-white' :
                                                                'bg-white/10 border-white/30 text-white hover:bg-white/20'
                                                    }`}
                                            >
                                                <option className="text-slate-800" value="">Definir Status do Caso...</option>
                                                <option className="text-slate-800" value="Em Acompanhamento">🟡 Em Acompanhamento Social</option>
                                                <option className="text-slate-800" value="Encaminhado Educação Especial">🔵 Encaminhado à Educação Especial</option>
                                                <option className="text-slate-800" value="Encaminhado Conselho Tutelar">🔴 Encaminhado ao Conselho Tutelar</option>
                                                <option className="text-slate-800" value="Concluído/Reinserido">🟢 Caso Resolvido / Reinserido</option>
                                            </select>
                                        </div>
                                    )}
                                    {!isSocialWorker && socialData.statusCaso && (
                                        <div className={`mt-4 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest inline-block ${socialData.statusCaso.includes('Educação Especial') ? 'bg-blue-600 text-white shadow-lg' :
                                            socialData.statusCaso.includes('Conselho') ? 'bg-rose-600 text-white shadow-lg' :
                                                socialData.statusCaso.includes('Concluído') ? 'bg-emerald-600 text-white shadow-lg' :
                                                    'bg-amber-500 text-white shadow-lg'
                                            }`}>
                                            {socialData.statusCaso}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {selectedStudent && (
                                <button
                                    onClick={handlePrintSocial}
                                    className="flex items-center gap-3 px-6 py-3 bg-white text-[#1E7F85] hover:bg-[#F7F5F0] rounded-full text-sm font-bold transition-all shadow-lg border-none"
                                >
                                    <Printer size={18} /> Imprimir Relatório
                                </button>
                            )}
                        </div>
                    </div>

                    {!selectedStudent ? (
                        <div className="p-12 text-center bg-white">
                            <div className="w-24 h-24 bg-[#F7F5F0] rounded-full shadow-inner flex items-center justify-center mx-auto mb-8 border border-[#1E7F85]/10 group">
                                <Search size={40} className="text-[#1E7F85] group-hover:scale-110 transition-transform" />
                            </div>
                            <h3 className="text-2xl font-bold text-[#1E7F85] mb-2 uppercase tracking-widest">Localizar Aluno</h3>
                            <p className="text-slate-400 max-w-sm mx-auto mb-8 font-medium">Selecione um aluno para acessar o prontuário.</p>

                            <div className="max-w-md mx-auto space-y-6">
                                {/* School Filter */}
                                <div className="text-left">
                                    <label className="text-xs font-bold text-[#1E7F85] uppercase tracking-widest mb-2 block pl-4">Filtrar por Escola</label>
                                    <SearchableSelect
                                        options={uniqueSchools.map(school => ({ value: school, label: school }))}
                                        value={selectedSchool}
                                        onChange={setSelectedSchool}
                                        placeholder="Todas as escolas..."
                                        className="w-full"
                                    />
                                </div>

                                {/* Student Select */}
                                <div className="text-left relative">
                                    <label className="text-xs font-bold text-[#1E7F85] uppercase tracking-widest mb-2 block pl-4">Selecione o Aluno</label>
                                    <div className="relative">
                                        <select
                                            className="block w-full rounded-xl border-2 border-[#1E7F85]/20 p-4 pl-4 bg-[#F7F5F0]/50 shadow-sm focus:ring-4 focus:ring-[#1E7F85]/5 focus:border-[#1E7F85] outline-none transition-all appearance-none font-bold text-slate-700"
                                            onChange={(e) => handleStudentSelect(e.target.value)}
                                            value=""
                                        >
                                            <option value="">
                                                {selectedSchool
                                                    ? `Selecione um aluno de ${selectedSchool}...`
                                                    : 'Buscar aluno por nome...'}
                                            </option>
                                            {filteredStudents.map(s => (
                                                <option key={s.id} value={s.id}>{s.fullName}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1E7F85]/50 pointer-events-none" size={20} />
                                    </div>
                                    <p className="text-right text-[10px] text-slate-400 font-bold mt-2 pr-2">
                                        {filteredStudents.length} alunos encontrados
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white min-h-[600px]">
                            {/* Tab Navigation */}
                            <div className="flex overflow-x-auto bg-[#F7F5F0]/50 border-b border-[#1E7F85]/10 sticky top-0 z-20 no-scrollbar p-3 gap-3">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => handleTabChange(tab.id)}
                                            className={`flex items-center gap-3 px-6 py-4 rounded-full transition-all duration-300 whitespace-nowrap group ${isActive
                                                ? 'bg-[#1E7F85] text-white shadow-lg scale-[1.02]'
                                                : 'text-[#1E7F85]/60 hover:bg-[#1E7F85]/5 hover:text-[#1E7F85]'
                                                }`}
                                        >
                                            <Icon size={18} className={isActive ? 'text-[#F5C474]' : 'text-[#1E7F85]/40 group-hover:text-[#1E7F85]'} />
                                            <span className="text-xs font-bold uppercase tracking-widest">{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Content Area */}
                            <div className="p-10">
                                <div className="flex flex-col sm:flex-row justify-between items-start md:items-center mb-12 gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-10 bg-[#1E7F85] rounded-full" />
                                        <div>
                                            <h3 className="text-2xl font-bold text-[#1E7F85] uppercase tracking-wider">
                                                {tabs.find(t => t.id === activeTab)?.label}
                                            </h3>
                                            <p className="text-[#333333]/40 text-[10px] font-bold uppercase tracking-widest mt-1">Estudante: {selectedStudent.fullName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="hidden md:flex items-center gap-2 bg-rose-50 px-4 py-2 rounded-full border border-rose-100">
                                            <Lock size={12} className="text-rose-600" />
                                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
                                                Sigilo Profissional – Acesso restrito (LGPD)
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 bg-[#F7F5F0] px-5 py-2.5 rounded-full border border-[#1E7F85]/10 shadow-sm">
                                            <div className={`w-2 h-2 rounded-full ${socialData.observacoesEncaminhamentos.statusRegistro === 'CONCLUÍDO' ? 'bg-emerald-500 animate-pulse' : 'bg-[#F5C474] animate-pulse'}`} />
                                            <span className="text-[10px] font-black text-[#1E7F85] uppercase tracking-widest">
                                                Status: {socialData.observacoesEncaminhamentos.statusRegistro}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="animate-fadeIn">
                                    {activeTab === 1 && (
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                                <StyledInput icon={UserIcon} label="Gênero" value={socialData.identificacao.genero} onChange={(e: any) => handleChange('identificacao', 'genero', e.target.value)} placeholder="Masculino / Feminino / Outro" />
                                                <StyledInput icon={Users} label="Responsável Legal" value={socialData.identificacao.nomeResponsavel} onChange={(e: any) => handleChange('identificacao', 'nomeResponsavel', e.target.value)} />
                                                <StyledInput icon={Briefcase} label="Grau de Parentesco" value={socialData.identificacao.grauParentesco} onChange={(e: any) => handleChange('identificacao', 'grauParentesco', e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                <StyledInput icon={Home} label="Nº de Pessoas na Residência" value={socialData.identificacao.numeroPessoasResidencia} onChange={(e: any) => handleChange('identificacao', 'numeroPessoasResidencia', e.target.value)} type="number" />
                                                <StyledInput icon={Smartphone} label="Telefones de Contato" value={socialData.identificacao.telefonesContato} onChange={(e: any) => handleChange('identificacao', 'telefonesContato', e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                <StyledInput icon={FileText} label="Documento (RG ou CPF)" value={socialData.identificacao.documento} onChange={(e: any) => handleChange('identificacao', 'documento', e.target.value)} />
                                                <StyledInput icon={Zap} label="Número do NIS (Opcional)" value={socialData.identificacao.nis} onChange={(e: any) => handleChange('identificacao', 'nis', e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-10 bg-[#F7F5F0] rounded-[30px] border border-[#1E7F85]/10 shadow-inner">
                                                <StyledInput icon={GraduationCap} label="Está matriculado?" value={socialData.identificacao.matriculado} onChange={(e: any) => handleChange('identificacao', 'matriculado', e.target.value)} placeholder="Sim / Não" />
                                                {socialData.identificacao.matriculado.toLowerCase() === 'sim' && (
                                                    <StyledInput icon={SchoolIcon} label="Nome da Escola" value={socialData.identificacao.nomeEscola} onChange={(e: any) => handleChange('identificacao', 'nomeEscola', e.target.value)} />
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 2 && (
                                        <div className="space-y-8">
                                            {/* INDICADORES EDUCACIONAIS (NÃO CLÍNICOS) */}
                                            <div className="p-8 bg-indigo-50 rounded-[2.5rem] border border-indigo-100 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-8 opacity-5"><Brain size={120} /></div>
                                                <h3 className="text-indigo-800 font-bold uppercase tracking-widest mb-6 flex items-center gap-3 relative z-10">
                                                    <Brain size={20} /> Indicadores Educacionais Observados
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                                                    <TriStateField
                                                        label="Barreiras de acesso à escola observadas"
                                                        value={socialData.indicadoresEducacionais.barreirasAcesso}
                                                        onChange={(val) => handleChange('indicadoresEducacionais', 'barreirasAcesso', val)}
                                                    />
                                                    <TriStateField
                                                        label="Dificuldades de aprendizagem percebidas"
                                                        value={socialData.indicadoresEducacionais.dificuldadesAprendizagem}
                                                        onChange={(val) => handleChange('indicadoresEducacionais', 'dificuldadesAprendizagem', val)}
                                                    />
                                                    <TriStateField
                                                        label="Necessidade de apoio educacional especializado"
                                                        value={socialData.indicadoresEducacionais.apoioEspecializado}
                                                        onChange={(val) => handleChange('indicadoresEducacionais', 'apoioEspecializado', val)}
                                                    />
                                                </div>
                                                <p className="mt-4 text-[10px] text-indigo-400 font-bold uppercase tracking-wider text-center">* Sinalização estritamente educacional. Não constitui diagnóstico clínico.</p>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <StyledInput label="Já frequentou a escola anteriormente?" value={socialData.historicoEscolar.frequentouAnteriormente} onChange={(e: any) => handleChange('historicoEscolar', 'frequentouAnteriormente', e.target.value)} placeholder="Sim / Não" />
                                                <StyledInput label="Nome da última escola frequentada" value={socialData.historicoEscolar.ultimaEscola} onChange={(e: any) => handleChange('historicoEscolar', 'ultimaEscola', e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                <StyledInput label="Último ano/série cursado" value={socialData.historicoEscolar.ultimoAnoSerie} onChange={(e: any) => handleChange('historicoEscolar', 'ultimoAnoSerie', e.target.value)} />
                                                <StyledInput label="Ano em que parou de frequentar" value={socialData.historicoEscolar.anoParou} onChange={(e: any) => handleChange('historicoEscolar', 'anoParou', e.target.value)} />
                                                <StyledInput label="Idade ao sair da escola" value={socialData.historicoEscolar.idadeSaiu} onChange={(e: any) => handleChange('historicoEscolar', 'idadeSaiu', e.target.value)} />
                                            </div>
                                            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Motivos da Saída (Múltipla Escolha)</label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {['Dificuldades de aprendizagem', 'Falta de transporte escolar', 'Trabalho infantil', 'Gravidez / maternidade / paternidade', 'Cuidado com familiares', 'Violência ou bullying escolar', 'Uso de álcool ou drogas', 'Mudança de endereço', 'Doença', 'Falta de documentos', 'Desinteresse', 'Reprovação consecutiva', 'Questões religiosas/culturais'].map(opt => (
                                                        <label key={opt} className={`flex items-center gap-3 cursor-pointer p-4 rounded-2xl border transition-all ${socialData.historicoEscolar.motivosSaida.includes(opt) ? 'bg-[#1E7F85] border-[#1E7F85] text-white shadow-lg' : 'bg-white border-slate-200 hover:border-[#1E7F85]/20 text-slate-600'}`}>
                                                            <input type="checkbox" checked={socialData.historicoEscolar.motivosSaida.includes(opt)} onChange={() => toggleMultiSelect('historicoEscolar', 'motivosSaida', opt)} className="hidden" />
                                                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${socialData.historicoEscolar.motivosSaida.includes(opt) ? 'bg-white border-white' : 'border-slate-300 bg-slate-50'}`}>
                                                                {socialData.historicoEscolar.motivosSaida.includes(opt) && <div className="w-2 h-2 bg-[#1E7F85] rounded-sm" />}
                                                            </div>
                                                            <span className="text-xs font-bold leading-tight">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <div className="mt-6"><StyledInput label="Outros Motivos" value={socialData.historicoEscolar.motivosSaidaOutros} onChange={(e: any) => handleChange('historicoEscolar', 'motivosSaidaOutros', e.target.value)} rows={2} /></div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 3 && (
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <StyledInput label="Responsáveis Legais" value={socialData.condicoesFamiliares.responsaveisLegais} onChange={(e: any) => handleChange('condicoesFamiliares', 'responsaveisLegais', e.target.value)} />
                                                <StyledInput label="Principal fonte de renda da família" value={socialData.condicoesFamiliares.fonteRenda} onChange={(e: any) => handleChange('condicoesFamiliares', 'fonteRenda', e.target.value)} />
                                            </div>
                                            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Participa de programa social?</label>
                                                <div className="flex gap-4 flex-wrap">
                                                    {['Bolsa Família', 'BPC', 'CRAS'].map(opt => (
                                                        <label key={opt} className={`flex items-center gap-3 cursor-pointer px-6 py-4 rounded-2xl border transition-all ${socialData.condicoesFamiliares.programasSociais.includes(opt) ? 'bg-[#1E7F85] border-[#1E7F85] text-white shadow-lg' : 'bg-white border-slate-200 hover:border-[#1E7F85]/20 text-slate-600'}`}>
                                                            <input type="checkbox" checked={socialData.condicoesFamiliares.programasSociais.includes(opt)} onChange={() => toggleMultiSelect('condicoesFamiliares', 'programasSociais', opt)} className="hidden" />
                                                            <span className="text-xs font-black uppercase tracking-widest">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <TriStateField
                                                        label="Há pessoa com deficiência ou mobilidade reduzida no domicílio?"
                                                        value={socialData.condicoesFamiliares.deficienciaResidencia === 'Sim' ? true : socialData.condicoesFamiliares.deficienciaResidencia === 'Não' ? false : null}
                                                        onChange={(val) => handleChange('condicoesFamiliares', 'deficienciaResidencia', val === true ? 'Sim' : val === false ? 'Não' : '')}
                                                    />
                                                    {socialData.condicoesFamiliares.deficienciaResidencia === 'Sim' && <StyledInput label="Quem?" value={socialData.condicoesFamiliares.quemDeficiencia} onChange={(e: any) => handleChange('condicoesFamiliares', 'quemDeficiencia', e.target.value)} />}
                                                </div>
                                                <div className="space-y-4">
                                                    <TriStateField
                                                        label="O aluno possui deficiência?"
                                                        value={socialData.condicoesFamiliares.alunoDeficiencia === 'Sim' ? true : socialData.condicoesFamiliares.alunoDeficiencia === 'Não' ? false : null}
                                                        onChange={(val) => handleChange('condicoesFamiliares', 'alunoDeficiencia', val === true ? 'Sim' : val === false ? 'Não' : '')}
                                                    />
                                                    {socialData.condicoesFamiliares.alunoDeficiencia === 'Sim' && <StyledInput label="Qual?" value={socialData.condicoesFamiliares.qualDeficiencia} onChange={(e: any) => handleChange('condicoesFamiliares', 'qualDeficiencia', e.target.value)} />}
                                                </div>
                                            </div>
                                            <div className="p-8 bg-rose-50 rounded-3xl border border-rose-100">
                                                <label className="block text-[10px] font-black text-rose-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                                    <AlertTriangle size={14} strokeWidth={3} /> Situações enfrentadas pela família
                                                </label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {['Situação de rua', 'Violência doméstica', 'Trabalho infantil', 'Dependência química', 'Conflitos com a Justiça', 'Outros'].map(opt => (
                                                        <label key={opt} className={`flex items-center gap-3 cursor-pointer p-4 rounded-2xl border transition-all ${socialData.condicoesFamiliares.situacoesEnfrentadas.includes(opt) ? 'bg-rose-600 border-rose-700 text-white shadow-lg' : 'bg-white border-slate-200 hover:border-rose-200 text-slate-600'}`}>
                                                            <input type="checkbox" checked={socialData.condicoesFamiliares.situacoesEnfrentadas.includes(opt)} onChange={() => toggleMultiSelect('condicoesFamiliares', 'situacoesEnfrentadas', opt)} className="hidden" />
                                                            <span className="text-xs font-bold leading-tight">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                <TriStateField
                                                    label="Há adultos alfabetizados na casa?"
                                                    value={socialData.condicoesFamiliares.adultosAlfabetizados === 'Sim' ? true : socialData.condicoesFamiliares.adultosAlfabetizados === 'Não' ? false : null}
                                                    onChange={(val) => handleChange('condicoesFamiliares', 'adultosAlfabetizados', val === true ? 'Sim' : val === false ? 'Não' : '')}
                                                />
                                                <TriStateField
                                                    label="A família considera a educação prioridade?"
                                                    value={socialData.condicoesFamiliares.educacaoPrioridade === 'Sim' ? true : socialData.condicoesFamiliares.educacaoPrioridade === 'Não' ? false : null}
                                                    onChange={(val) => handleChange('condicoesFamiliares', 'educacaoPrioridade', val === true ? 'Sim' : val === false ? 'Não' : '')}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 4 && (
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                <TriStateField
                                                    label="Acompanhamento médico regular?"
                                                    value={socialData.saudeAcompanhamentos.acompanhamentoMedico === 'Sim' ? true : socialData.saudeAcompanhamentos.acompanhamentoMedico === 'Não' ? false : null}
                                                    onChange={(val) => handleChange('saudeAcompanhamentos', 'acompanhamentoMedico', val === true ? 'Sim' : val === false ? 'Não' : '')}
                                                />
                                                <div className="space-y-4">
                                                    <TriStateField
                                                        label="Uso de medicação contínua?"
                                                        value={socialData.saudeAcompanhamentos.medicacaoContinua === 'Sim' ? true : socialData.saudeAcompanhamentos.medicacaoContinua === 'Não' ? false : null}
                                                        onChange={(val) => handleChange('saudeAcompanhamentos', 'medicacaoContinua', val === true ? 'Sim' : val === false ? 'Não' : '')}
                                                    />
                                                    {socialData.saudeAcompanhamentos.medicacaoContinua === 'Sim' && <StyledInput label="Observações sobre medicação (Impacto escolar/rotina)" value={socialData.saudeAcompanhamentos.qualMedicacao} onChange={(e: any) => handleChange('saudeAcompanhamentos', 'qualMedicacao', e.target.value)} />}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                <TriStateField
                                                    label="Acompanhamento em Saúde Mental (Psicologia/Psiquiatria)?"
                                                    value={socialData.saudeAcompanhamentos.acompanhamentoPsi === 'Sim' ? true : socialData.saudeAcompanhamentos.acompanhamentoPsi === 'Não' ? false : null}
                                                    onChange={(val) => handleChange('saudeAcompanhamentos', 'acompanhamentoPsi', val === true ? 'Sim' : val === false ? 'Não' : '')}
                                                />
                                                <TriStateField
                                                    label="Acompanhamento pelo Conselho Tutelar?"
                                                    value={socialData.saudeAcompanhamentos.conselhoTutelar === 'Sim' ? true : socialData.saudeAcompanhamentos.conselhoTutelar === 'Não' ? false : null}
                                                    onChange={(val) => handleChange('saudeAcompanhamentos', 'conselhoTutelar', val === true ? 'Sim' : val === false ? 'Não' : '')}
                                                />
                                            </div>
                                            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Atendido por serviços?</label>
                                                <div className="flex gap-4 flex-wrap">
                                                    {['CAPS', 'CRAS'].map(opt => (
                                                        <label key={opt} className={`flex items-center gap-3 cursor-pointer px-6 py-4 rounded-2xl border transition-all ${socialData.saudeAcompanhamentos.servicosAtendimento.includes(opt) ? 'bg-[#1E7F85] border-[#1E7F85] text-white shadow-lg' : 'bg-white border-slate-200 hover:border-[#1E7F85]/20 text-slate-600'}`}>
                                                            <input type="checkbox" checked={socialData.saudeAcompanhamentos.servicosAtendimento.includes(opt)} onChange={() => toggleMultiSelect('saudeAcompanhamentos', 'servicosAtendimento', opt)} className="hidden" />
                                                            <span className="text-xs font-black uppercase tracking-widest">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <div className="mt-6"><StyledInput label="Outros (texto)" value={socialData.saudeAcompanhamentos.outrosServicos} onChange={(e: any) => handleChange('saudeAcompanhamentos', 'outrosServicos', e.target.value)} /></div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 5 && (
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                <TriStateField
                                                    label="Desejo do aluno em retornar à escola?"
                                                    value={socialData.situacaoAtual.desejoRetornar === 'Sim' ? true : socialData.situacaoAtual.desejoRetornar === 'Não' ? false : null}
                                                    onChange={(val) => handleChange('situacaoAtual', 'desejoRetornar', val === true ? 'Sim' : val === false ? 'Não' : '')}
                                                />
                                                <TriStateField
                                                    label="Apoio da família ao retorno?"
                                                    value={socialData.situacaoAtual.apoioFamilia === 'Sim' ? true : socialData.situacaoAtual.apoioFamilia === 'Não' ? false : null}
                                                    onChange={(val) => handleChange('situacaoAtual', 'apoioFamilia', val === true ? 'Sim' : val === false ? 'Não' : '')}
                                                />
                                            </div>
                                            <div className="p-8 bg-orange-50 rounded-3xl border border-orange-100">
                                                <label className="block text-[10px] font-black text-orange-400 uppercase tracking-widest mb-6">Fatores que dificultam o retorno</label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {['Falta de transporte', 'Falta de vaga', 'Medo de bullying ou violência', 'Necessidade de trabalhar', 'Desinteresse', 'Situação emocional/psicológica', 'Gravidez/maternidade'].map(opt => (
                                                        <label key={opt} className={`flex items-center gap-3 cursor-pointer p-4 rounded-2xl border transition-all ${socialData.situacaoAtual.fatoresDificultam.includes(opt) ? 'bg-orange-500 border-orange-600 text-white shadow-lg' : 'bg-white border-slate-200 hover:border-orange-200 text-slate-600'}`}>
                                                            <input type="checkbox" checked={socialData.situacaoAtual.fatoresDificultam.includes(opt)} onChange={() => toggleMultiSelect('situacaoAtual', 'fatoresDificultam', opt)} className="hidden" />
                                                            <span className="text-xs font-bold leading-tight">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <div className="mt-6"><StyledInput label="Outros (texto)" value={socialData.situacaoAtual.fatoresDificultamOutros} onChange={(e: any) => handleChange('situacaoAtual', 'fatoresDificultamOutros', e.target.value)} /></div>
                                            </div>
                                            <div className="p-8 bg-cyan-50 rounded-3xl border border-cyan-100">
                                                <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-6">Apoios necessários para retorno e permanência</label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {['Transporte escolar', 'Atendimento psicológico', 'Apoio pedagógico', 'Atendimento especializado', 'Apoio material', 'Visitas domiciliares'].map(opt => (
                                                        <label key={opt} className={`flex items-center gap-3 cursor-pointer p-4 rounded-2xl border transition-all ${socialData.situacaoAtual.apoiosNecessarios.includes(opt) ? 'bg-[#1E7F85] border-[#1E7F85] text-white shadow-lg' : 'bg-white border-slate-200 hover:border-[#1E7F85]/20 text-slate-600'}`}>
                                                            <input type="checkbox" checked={socialData.situacaoAtual.apoiosNecessarios.includes(opt)} onChange={() => toggleMultiSelect('situacaoAtual', 'apoiosNecessarios', opt)} className="hidden" />
                                                            <span className="text-xs font-bold leading-tight">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <div className="mt-6"><StyledInput label="Outros (texto)" value={socialData.situacaoAtual.apoiosNecessariosOutros} onChange={(e: any) => handleChange('situacaoAtual', 'apoiosNecessariosOutros', e.target.value)} /></div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 6 && (
                                        <div className="space-y-8">
                                            {/* BLOCO FINAL DE ENCAMINHAMENTO INSTITUCIONAL */}
                                            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 z-0 group-hover:scale-110 transition-transform duration-700" />

                                                <div className="relative z-10">
                                                    <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight flex items-center gap-3">
                                                        <ShieldAlert className="text-rose-600" size={32} /> Encaminhamento Institucional
                                                    </h3>
                                                    <p className="text-slate-500 mb-10 max-w-xl">Formalização de encaminhamento para órgãos da rede de proteção ou suporte educacional.</p>

                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                                        <div className="space-y-8">
                                                            <div>
                                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Encaminhamento Sugerido</label>
                                                                <div className="space-y-3">
                                                                    {['Conselho Tutelar', 'Educação Especial', 'CRAS', 'Saúde', 'Não há encaminhamento no momento'].map(opt => (
                                                                        <label key={opt} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${socialData.encaminhamentoInstitucional.sugestao === opt ? 'border-[#1E7F85] bg-[#1E7F85]/5 shadow-md' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}>
                                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${socialData.encaminhamentoInstitucional.sugestao === opt ? 'border-[#1E7F85]' : 'border-slate-300'}`}>
                                                                                {socialData.encaminhamentoInstitucional.sugestao === opt && <div className="w-2.5 h-2.5 bg-[#1E7F85] rounded-full" />}
                                                                            </div>
                                                                            <input
                                                                                type="radio"
                                                                                name="sugestao"
                                                                                className="hidden"
                                                                                checked={socialData.encaminhamentoInstitucional.sugestao === opt}
                                                                                onChange={() => handleChange('encaminhamentoInstitucional', 'sugestao', opt)}
                                                                            />
                                                                            <span className={`font-bold ${socialData.encaminhamentoInstitucional.sugestao === opt ? 'text-[#1E7F85]' : 'text-slate-600'}`}>{opt}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Grau de Prioridade</label>
                                                                <div className="flex gap-3">
                                                                    {['Baixa', 'Média', 'Alta'].map(prio => (
                                                                        <button
                                                                            key={prio}
                                                                            type="button"
                                                                            onClick={() => handleChange('encaminhamentoInstitucional', 'prioridade', prio)}
                                                                            className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs tracking-widest border-2 transition-all ${socialData.encaminhamentoInstitucional.prioridade === prio
                                                                                ? prio === 'Alta' ? 'bg-rose-600 border-rose-600 text-white shadow-lg'
                                                                                    : prio === 'Média' ? 'bg-amber-500 border-amber-500 text-white shadow-lg'
                                                                                        : 'bg-emerald-500 border-emerald-500 text-white shadow-lg'
                                                                                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                                                                }`}
                                                                        >
                                                                            {prio}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-8">
                                                            <StyledInput
                                                                label="Motivo do Encaminhamento (Educacional/Social)"
                                                                rows={6}
                                                                placeholder="Descreva o motivo..."
                                                                value={socialData.encaminhamentoInstitucional.motivo}
                                                                onChange={(e: any) => handleChange('encaminhamentoInstitucional', 'motivo', e.target.value)}
                                                            />

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                                <StyledInput
                                                                    label="Data de Encaminhamento"
                                                                    type="date"
                                                                    value={socialData.encaminhamentoInstitucional.dataEncaminhamento}
                                                                    onChange={(e: any) => handleChange('encaminhamentoInstitucional', 'dataEncaminhamento', e.target.value)}
                                                                />
                                                                <div className="opacity-70 pointer-events-none">
                                                                    <StyledInput
                                                                        label="Profissional Responsável"
                                                                        value={currentUser.name}
                                                                        onChange={() => { }}
                                                                        icon={UserIcon}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SEÇÃO LEGADA / OBSERVAÇÕES ADICIONAIS */}
                                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Controle Interno</label>
                                                    <div className="flex bg-white rounded-2xl p-1 shadow-inner border border-slate-200">
                                                        {(['PENDENTE', 'CONCLUÍDO'] as const).map(status => (
                                                            <button
                                                                key={status}
                                                                type="button"
                                                                onClick={() => handleChange('observacoesEncaminhamentos', 'statusRegistro', status)}
                                                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${socialData.observacoesEncaminhamentos.statusRegistro === status ? 'bg-[#1E7F85] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                                            >
                                                                {status}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center gap-2 justify-end text-[#1E7F85] font-black text-[10px] uppercase tracking-widest mb-1">
                                                        <Shield size={12} /> Protegido LGPD
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-400 max-w-[200px] leading-tight text-right">Acesso restrito: Serviço Social.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 italic">O salvamento ocorre automaticamente ao trocar de aba ou clicando no botão ao lado.</p>
                                    <div className="flex gap-4">
                                        <button
                                            type="button"
                                            onClick={() => handleSave()}
                                            className="px-8 py-4 bg-[#1E7F85] text-white rounded-2xl shadow-lg shadow-[#1E7F85]/20 hover:bg-[#166065] font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all hover:scale-105"
                                        >
                                            <Save size={18} /> Salvar Aba Atual
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- BASE DASHBOARD (OUTRAS ESPECIALIDADES) ---
const BaseDashboard: React.FC<BaseDashboardProps> = ({ title, specialty, onNavigateNew, currentUser }) => {
    const [history, setHistory] = useState<{ session: Session, studentName: string }[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const load = async () => {
            const allStudents = await SupabaseService.getStudentsForUser(currentUser);
            const flatHistory: { session: Session, studentName: string }[] = [];

            allStudents.forEach(p => {
                // Check clinical_sessions via Supabase join (mapped to p.history or passed separately?)
                // Since SupabaseService.getStudents() maps sessions to p.history (if they are generic sessions), 
                // but actually my mapStudentFromDB puts them in 'history' property?
                // Let's check mapStudentFromDB... it maps clinical_sessions to history.
                if (p.history) {
                    p.history.forEach(h => {
                        if (h.specialty === specialty) {
                            flatHistory.push({ session: h, studentName: p.fullName });
                        }
                    });
                }
            });

            flatHistory.sort((a, b) => new Date(b.session.date).getTime() - new Date(a.session.date).getTime());
            setHistory(flatHistory);
        };
        load();
    }, [specialty]);

    const filteredHistory = history.filter(item =>
        item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.session.professionalName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
                    <p className="text-slate-500">Painel da especialidade</p>
                </div>
                <button
                    onClick={onNavigateNew}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                >
                    <Plus size={18} /> Novo Atendimento
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por aluno ou profissional..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto w-full">
                    <table className="min-w-[500px] divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Data</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Aluno</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Profissional</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Resumo</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Nenhum atendimento registrado nesta especialidade.
                                    </td>
                                </tr>
                            ) : (
                                filteredHistory.map((item, idx) => {
                                    let summary = item.session.notes;
                                    try {
                                        // Se for JSON, pega algo legível
                                        if (summary.startsWith('{')) {
                                            summary = "Registro estruturado";
                                        }
                                    } catch (e) { }

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {new Date(item.session.date).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                {item.studentName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {item.session.professionalName}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-xs">
                                                {summary}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button className="min-h-[44px] min-w-[44px] text-primary-600 hover:text-primary-900">Ver</button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

interface BaseSessionFormProps {
    title?: string;
    specialty: Specialty;
    onCancel: () => void;
    currentUser: User;
}

// --- FORMULÁRIO GENÉRICO (OUTRAS ESPECIALIDADES) ---
const BaseSessionForm: React.FC<BaseSessionFormProps> = ({ title, specialty, onCancel, currentUser }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [serviceType, setServiceType] = useState('Consulta Individual');
    const [notes, setNotes] = useState('');
    const { success: showToast, error: toastError } = useToast();

    useEffect(() => { SupabaseService.getStudentsForUser(currentUser).then(setStudents); }, [currentUser]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedStudentId) {
            const student = students.find(p => p.id === selectedStudentId);
            if (student) {
                const newSession: Session = {
                    id: crypto.randomUUID(),
                    date,
                    specialty,
                    professionalName: currentUser.name,
                    notes: notes + (serviceType ? ` [Tipo: ${serviceType}]` : ''),
                    serviceType,
                    content: { serviceType } // Save structured usage
                };

                // Save to Supabase
                SupabaseService.saveSession(newSession, student.id, currentUser.id)
                    .then(() => showToast('Atendimento salvo com sucesso!'))
                    .catch(err => toastError('Erro ao salvar: ' + err.message));
            }
        }
        onCancel();
    };

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            <div className="flex items-center gap-2 mb-6 text-slate-500 hover:text-primary-600 cursor-pointer w-fit" onClick={onCancel}><X size={18} /> Cancelar e Voltar</div>
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-primary-600 text-white"><h2 className="text-xl font-bold flex items-center gap-2"><FileText size={24} /> {title} - Atendimento</h2></div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Aluno</label><select className="block w-full rounded-lg border-slate-300 p-2.5 border bg-white" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}><option value="">Selecione...</option>{students.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}</select></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Data</label><input type="date" className="block w-full rounded-lg border-slate-300 p-2 border" value={date} onChange={(e) => setDate(e.target.value)} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label><select className="block w-full rounded-lg border-slate-300 p-2 border bg-white" value={serviceType} onChange={(e) => setServiceType(e.target.value)}><option>Consulta Individual</option><option>Grupo</option><option>Avaliação</option></select></div></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Evolução</label><textarea rows={6} className="block w-full rounded-lg border-slate-300 p-3 border" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100"><button type="button" onClick={onCancel} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button><button type="submit" className="px-8 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">Salvar</button></div>
                </form>
            </div>
        </div>
    );
};

// --- FORMULÁRIO ESPECÍFICO DE PSICOLOGIA (RECONSTRUÇÃO 9 ITENS + SESSÕES) ---

const PsychologySessionForm: React.FC<BaseSessionFormProps> = ({ onCancel, currentUser }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    // Abas e Visibilidade
    const [activeTab, setActiveTab] = useState<'formulario' | 'sessoes'>('formulario');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list'); // Para sessões
    const [showConfirmDischarge, setShowConfirmDischarge] = useState(false);
    const { success: showToast, error: toastError } = useToast();
    const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
    const [studentSearch, setStudentSearch] = useState('');
    const [schoolFilter, setSchoolFilter] = useState('');


    // Dados
    const [publicData, setPublicData] = useState<PsychFormPublic>(initialPublicForm);
    const [privateData, setPrivateData] = useState<PsychPrivateData>({ formData: initialPrivateForm, sessions: [], statusAtendimento: 'Em acompanhamento' });
    const [currentSession, setCurrentSession] = useState<Partial<PsychSession>>({});

    // SEGURANÇA: Apenas Psicólogos veem o privado
    const canAccessPrivate = currentUser.role === 'SPECIALIST' && currentUser.specialty === Specialty.PSYCHOLOGY;

    useEffect(() => {
        SupabaseService.getStudentsForUser(currentUser).then(setStudents);
    }, [currentUser]);

    useEffect(() => {
        if (selectedStudent) {
            // Carregar Publico (Mockado ou do History)
            // Tentativa de achar dados publicos no history
            const publicRecord = selectedStudent.history?.find(h => h.specialty === Specialty.PSYCHOLOGY && h.serviceType === 'PsychPublicData');
            if (publicRecord) {
                try { setPublicData(JSON.parse(publicRecord.notes)); } catch { setPublicData(initialPublicForm); }
            } else {
                setPublicData(initialPublicForm); // Reset se não achar
            }

            // Carregar Privado (Se permitido)
            if (canAccessPrivate) {
                const priv = extractPsychData(selectedStudent);
                setPrivateData(priv);
            }
        }
    }, [selectedStudent, canAccessPrivate]);

    const handleStudentSelect = (id: string) => {
        const student = students.find(s => s.id === id);
        setSelectedStudent(student || null);
        // Resets
        setPublicData(initialPublicForm);
        setPrivateData({ formData: initialPrivateForm, sessions: [], statusAtendimento: 'Em acompanhamento' });
        setViewMode('list');
    };

    // --- Handlers de Salvamento ---

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 3000);
    };

    const preparePublicDataSession = (student: Student, data: PsychFormPublic) => {
        // Salva dados públicos como um registro técnico no histórico geral do aluno
        const record: Session = {
            id: `public-data-${student.id}`, // ID fixo para sobrescrever/atualizar
            date: new Date().toISOString().split('T')[0],
            specialty: Specialty.PSYCHOLOGY,
            professionalName: 'Sistema',
            serviceType: 'PsychPublicData', // Marcador interno
            notes: JSON.stringify(data)
        };
        // Remove anterior se existir e adiciona novo
        const cleanHistory = student.history?.filter(h => !(h.specialty === Specialty.PSYCHOLOGY && h.serviceType === 'PsychPublicData')) || [];
        return { ...student, history: [record, ...cleanHistory] };
    };

    const saveFullForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;

        try {
            // 1. Salvar Público
            let currentStudent = selectedStudent;
            const updatedStudent = preparePublicDataSession(currentStudent, publicData);
            currentStudent = updatedStudent;

            // 2. Salvar Privado (se permitido)
            if (canAccessPrivate) {
                // Update student with both public history change AND private data change
                // Note: sessions are NOT saved in psych_data anymore, but we keep the structure for other fields
                const updatedPsychData = {
                    ...privateData,
                    sessions: [] // Don't duplicate sessions in JSON
                };

                currentStudent = {
                    ...currentStudent,
                    clinical: {
                        ...currentStudent.clinical,
                        psych_data: updatedPsychData
                    }
                };
            }

            await SupabaseService.saveStudent(currentStudent);

            // Update local state
            setStudents(prev => prev.map(s => s.id === currentStudent.id ? currentStudent : s));
            setSelectedStudent(currentStudent);
            showFeedback('success', 'Prontuário salvo com sucesso!');
        } catch (err) {
            console.error(err);
            showFeedback('error', 'Erro ao salvar prontuário.');
        }
    };

    const handleDischarge = async () => {
        if (!selectedStudent) return;
        setShowConfirmDischarge(true);
    };

    const confirmDischargeAction = async () => {
        setShowConfirmDischarge(false);

        try {
            // 1. Salvar o formulário completo (Simulando o evento para reuso da lógica)
            await saveFullForm({ preventDefault: () => { } } as React.FormEvent);

            // 2. Aguardar brevemente para garantir que o estado local esteja sincronizado
            // e disparar a impressão automática
            setTimeout(() => {
                handlePrintPsychology();
            }, 500);

        } catch (err) {
            console.error('Erro ao processar alta:', err);
            showFeedback('error', 'Falha ao processar alta.');
        }
    };

    // --- Handlers de Sessão ---

    const startNewSession = () => {
        setCurrentSession({
            dataHoraISO: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
            duracaoMin: 50,
            humor: 'neutro',
            status: 'Realizado',
            titulo: '',
            resumo: '',
            anotacoes: '',
            indicativoAlta: false,
            motivoAlta: ''
        });
        setViewMode('form');
    };

    const saveSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !canAccessPrivate) return;

        try {
            const sessionToSave: PsychSession = {
                id: currentSession.id || crypto.randomUUID(),
                numero: currentSession.numero || (privateData.sessions.length + 1),
                dataHoraISO: currentSession.dataHoraISO || new Date().toISOString(),
                duracaoMin: currentSession.duracaoMin || 50,
                titulo: currentSession.titulo || 'Atendimento Psicológico',
                humor: currentSession.humor as any || 'neutro',
                status: currentSession.status as any || 'Realizado',
                resumo: currentSession.resumo || '',
                anotacoes: currentSession.anotacoes || '',
                indicativoAlta: currentSession.indicativoAlta,
                motivoAlta: currentSession.motivoAlta
            };

            // Map to generic Session for Supabase
            const genericSession: Session = {
                id: sessionToSave.id,
                date: sessionToSave.dataHoraISO.split('T')[0],
                specialty: Specialty.PSYCHOLOGY,
                professionalName: currentUser.name,
                notes: sessionToSave.titulo,
                content: sessionToSave, // Full JSON
                privateNotes: sessionToSave.anotacoes
            };

            await SupabaseService.saveSession(genericSession, selectedStudent.id, currentUser.id);

            // Update local state (Optimistic update)
            const newSessions = [...privateData.sessions];
            if (currentSession.id) {
                const idx = newSessions.findIndex(s => s.id === sessionToSave.id);
                if (idx >= 0) newSessions[idx] = sessionToSave;
            } else {
                newSessions.unshift(sessionToSave);
            }

            let updatedPrivateData: PsychPrivateData = { ...privateData, sessions: newSessions };
            let studentToUpdate = selectedStudent;

            // Se houve alta, atualiza status do aluno
            if (currentSession.indicativoAlta) {
                const finalData = {
                    ...updatedPrivateData,
                    statusAtendimento: 'Alta psicológica',
                    formData: {
                        ...updatedPrivateData.formData,
                        encerramento: {
                            ...updatedPrivateData.formData.encerramento,
                            motivoAlta: currentSession.motivoAlta || '',
                            resumoGanhos: currentSession.motivoAlta || ''
                        }
                    },
                    sessions: [] // Don't save sessions in JSON
                };

                studentToUpdate = {
                    ...studentToUpdate,
                    clinical: { ...studentToUpdate.clinical, psych_data: finalData }
                };

                await SupabaseService.saveStudent(studentToUpdate); // Update status in DB
            }

            setPrivateData(updatedPrivateData); // Keep sessions in local state for viewing

            // Also update public history just in case we still rely on it for dashboards?
            // Actually new dashboards use generic clinical_sessions, so we don't strictly need to double-save to history array of student.
            // But if we want the "publicData" session logic to hold, we might leave it.
            // For now, I will SKIP saving a duplicate public info session to Student.history to avoid clutter.
            // The dashboard uses SupabaseService.loadStudents() which includes sessions.

            // Update selected student ref if needed
            if (studentToUpdate !== selectedStudent) {
                setStudents(prev => prev.map(s => s.id === studentToUpdate.id ? studentToUpdate : s));
                setSelectedStudent(studentToUpdate);
            }

            showFeedback('success', 'Sessão registrada com sucesso.');
            setViewMode('list');
        } catch (err) {
            console.error(err);
            showFeedback('error', 'Erro ao salvar sessão.');
        }
    };

    const deleteSession = (id: string) => {
        setConfirmModal({
            title: 'Excluir Sessão',
            message: 'Tem certeza que deseja excluir esta sessão permanentemente?',
            onConfirm: () => {
                // TODO: Implement delete in SupabaseService
                // await SupabaseService.deleteSession(id);
                toastError('Funcionalidade de exclusão em desenvolvimento no backend.');
                setConfirmModal(null);
            }
        });
    };

    const handlePublicChange = (section: keyof PsychFormPublic, field: string, value: string) => {
        setPublicData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    };

    const handlePrivateChange = (section: keyof PsychFormPrivate | 'root', field: string, value: string) => {
        if (section === 'root') {
            // logic if needed for root fields in formData
        } else {
            setPrivateData(prev => ({
                ...prev,
                formData: {
                    ...prev.formData,
                    [section]: {
                        ...(prev.formData as any)[section],
                        [field]: value
                    }
                }
            }));
        }
    };

    // --- IMPRESSÃO SEGURA DE ATENDIMENTO ---
    const handlePrintPsychology = async (targetSession?: PsychSession) => {
        if (!selectedStudent || !canAccessPrivate) return;

        try {
            const config = await SupabaseService.getPapelTimbradoConfig();
            const session = targetSession || (privateData.sessions.length > 0 ? privateData.sessions[0] : null);

            const contentHTML = `
                                    <h2 class="section-title">I. IDENTIFICAÇÃO E ENCAMINHAMENTO</h2>
                                    <div class="box">
                                        <div class="data-row"><span class="label">ENCAMINHADO POR</span><span class="value">${publicData.identificacao.encaminhadoPor || '-'}</span></div>
                                        <div class="data-row"><span class="label">DATA TRIAGEM</span><span class="value">${publicData.identificacao.dataTriagem ? new Date(publicData.identificacao.dataTriagem).toLocaleDateString() : '-'}</span></div>
                                        <div class="data-row"><span class="label">QUEIXA PRINCIPAL / MOTIVO</span><div class="value">${publicData.motivoEncaminhamento.queixa || 'Não informado'}</div></div>
                                    </div>

                                    <h2 class="section-title">II. DADOS CLÍNICOS (CONFIDENCIAL)</h2>
                                    <div class="box">
                                        <div class="data-row"><span class="label">HIPÓTESES INICIAIS</span><div class="value">${privateData.formData.triagemPsicologica.hipotesesIniciais || '-'}</div></div>
                                        <div class="data-row"><span class="label">PLANO TERAPÊUTICO</span><div class="value">${privateData.formData.planoTerapeutico.objetivoPrincipal || '-'}</div></div>
                                    </div>

                                    ${session ? `
                <h2 class="section-title">III. REGISTRO DE SESSÃO / EVOLUÇÃO</h2>
                <div class="box" style="border-left: 4px solid #9333ea; background: #faf5ff;">
                    <div class="data-row">
                        <span class="label">DATA DA SESSÃO:</span> <span class="value">${new Date(session.dataHoraISO).toLocaleDateString()} às ${new Date(session.dataHoraISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span class="label" style="display:inline; margin-left: 20px;">SESSÃO #${session.numero}</span>
                    </div>
                    <div class="data-row"><span class="label">TÍTULO:</span> <span class="value" style="font-weight: bold;">${session.titulo}</span></div>
                    <div class="data-row"><span class="label">RESUMO / EVOLUÇÃO:</span> <div class="value" style="white-space: pre-wrap;">${session.anotacoes || session.resumo || 'Sem anotações detalhadas.'}</div></div>
                    ${session.indicativoAlta ? `<div style="margin-top: 10px; padding: 8px; background: #ecfdf5; border-radius: 4px; color: #065f46; font-size: 10pt;"><strong>REGISTRO DE ALTA:</strong> ${session.motivoAlta}</div>` : ''}
                </div>
                ` : ''}
                                    `;

            const html = generateClinicalPrintHTML(
                selectedStudent,
                config,
                'Prontuário Psicológico',
                contentHTML,
                { name: currentUser.name, jobTitle: currentUser.jobTitle || 'Psicólogo(a)', specialty: currentUser.specialty, signatureUrl: currentUser.signatureUrl }
            );

            const printWindow = window.open('', '_blank', 'width=900,height=600');
            if (!printWindow) return;
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 500);
        } catch (e) {
            console.error('Erro ao gerar impressão:', e);
            toastError('Não foi possível gerar o documento. Verifique as configurações de papel timbrado.');
        }
    };

    return (
        <div className="max-w-5xl mx-auto animate-fadeIn pb-12 relative">
            {feedback && (
                <div className={`fixed top-20 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fadeIn ${feedback.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {feedback.type === 'success' ? <CheckCircle size={24} className="shrink-0" /> : <AlertTriangle size={24} className="shrink-0" />}
                    <span className="font-bold text-sm">{feedback.message}</span>
                    <button onClick={() => setFeedback(null)} className="ml-2 opacity-80 hover:opacity-100"><X size={16} /></button>
                </div>
            )}
            <div className="flex items-center gap-2 mb-6 text-slate-500 hover:text-purple-600 cursor-pointer w-fit transition-colors" onClick={onCancel}><X size={18} /> Cancelar e Voltar</div>
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="relative bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-8">
                    <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg"><Brain size={32} className="text-purple-200" /></div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">Psicologia Clínica</h2>
                                <p className="text-purple-100 opacity-90 text-sm mt-1 flex items-center gap-2"><Lock size={12} /> Área de Prontuário Eletrônico Seguro</p>
                            </div>
                        </div>
                        {selectedStudent && (
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-1 flex gap-1 border border-white/10">
                                <button onClick={() => setActiveTab('formulario')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'formulario' ? 'bg-white text-purple-700 shadow-sm' : 'text-purple-100 hover:bg-white/10'}`}><Layout size={16} /> Prontuário</button>
                                {canAccessPrivate && (<button onClick={() => setActiveTab('sessoes')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'sessoes' ? 'bg-white text-purple-700 shadow-sm' : 'text-purple-100 hover:bg-white/10'}`}><History size={16} /> Sessões</button>)}
                            </div>
                        )}
                    </div>

                    {/* BOTÃO DE IMPRESSÃO (NOVO) */}
                    {selectedStudent && canAccessPrivate && (
                        <div className="relative z-10 mt-6 flex justify-end">
                            <button
                                onClick={() => handlePrintPsychology()}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all backdrop-blur-sm border border-white/20"
                            >
                                <Printer size={16} /> Imprimir Prontuário / PDF
                            </button>
                        </div>
                    )}

                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Brain size={200} /></div>
                </div>

                {!selectedStudent ? (
                    <div className="p-6 bg-[#FAF9FF] min-h-[500px]">

                        {/* Cards de métricas */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
                                <p className="text-2xl font-bold text-slate-800">{students.length}</p>
                                <p className="text-xs text-slate-400 mt-1">meus pacientes</p>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
                                <p className="text-2xl font-bold text-slate-800">
                                    {new Set(students.map(s => s.school?.schoolName).filter(Boolean)).size || '—'}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">escolas</p>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
                                <p className="text-2xl font-bold text-purple-600">{students.length > 0 ? 'OK' : '—'}</p>
                                <p className="text-xs text-slate-400 mt-1">escopo seguro</p>
                            </div>
                        </div>

                        {/* Busca + filtro escola */}
                        <div className="flex gap-3 mb-5">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome do aluno..."
                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                                    value={studentSearch || ''}
                                    onChange={e => setStudentSearch(e.target.value)}
                                />
                            </div>
                            <select
                                className="rounded-xl border border-slate-200 bg-white text-sm px-3 py-2.5 focus:outline-none focus:border-purple-400 min-w-[180px]"
                                value={schoolFilter || ''}
                                onChange={e => setSchoolFilter(e.target.value)}
                            >
                                <option value="">Todas as escolas</option>
                                {Array.from(new Set(students.map(s => s.school?.schoolName).filter(Boolean))).sort().map(escola => (
                                    <option key={escola} value={escola}>{escola}</option>
                                ))}
                            </select>
                        </div>

                        {/* Lista agrupada por escola */}
                        {(() => {
                            const search = (studentSearch || '').toLowerCase();
                            const filtered = students.filter(s =>
                                (!search || s.fullName.toLowerCase().includes(search)) &&
                                (!schoolFilter || s.school?.schoolName === schoolFilter)
                            );
                            if (filtered.length === 0) return (
                                <div className="text-center py-12 text-slate-400">
                                    <UserIcon size={32} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">Nenhum paciente encontrado</p>
                                </div>
                            );
                            const bySchool: Record<string, typeof filtered> = {};
                            filtered.forEach(s => {
                                const escola = s.school?.schoolName || 'Escola não informada';
                                if (!bySchool[escola]) bySchool[escola] = [];
                                bySchool[escola].push(s);
                            });
                            return Object.entries(bySchool).map(([escola, alunos]) => (
                                <div key={escola} className="mb-5">
                                    <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-2 font-semibold">
                                        {escola} · {alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'}
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {alunos.map(s => {
                                            const initials = s.fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                                            const age = s.birthDate ? new Date().getFullYear() - new Date(s.birthDate).getFullYear() : null;
                                            return (
                                                <button
                                                    key={s.id}
                                                    onClick={() => handleStudentSelect(s.id)}
                                                    className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 hover:border-purple-300 hover:shadow-sm px-4 py-3 text-left transition-all group w-full"
                                                >
                                                    <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
                                                        {initials}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-purple-700 transition-colors">{s.fullName}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">{age ? `${age} anos` : 'Idade não informada'}</p>
                                                    </div>
                                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                ) : (
                    <div className="flex flex-col min-h-[600px] bg-[#FAF9FF]">

                        {/* --- ABA FORMULÁRIO (PRONTUÁRIO) --- */}
                        {activeTab === 'formulario' && (
                            <div className="p-8 space-y-8 animate-fadeIn max-w-4xl mx-auto w-full">

                                {/* PARTE PÚBLICA (1-4) - VISÍVEL A TODOS */}
                                <form onSubmit={saveFullForm}>

                                    <div className="mb-8">
                                        <h3 className="text-purple-900 font-bold text-lg mb-4 flex items-center gap-2 uppercase tracking-wide opacity-80"><Globe size={18} /> Dados Gerais (Público)</h3>
                                        <FormSection title="I. Identificação e Encaminhamento" icon={UserIcon}>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <StyledInput label="Encaminhado Por" value={publicData.identificacao.encaminhadoPor} onChange={(e: any) => handlePublicChange('identificacao', 'encaminhadoPor', e.target.value)} />
                                                <StyledInput label="Data Triagem" type="date" value={publicData.identificacao.dataTriagem} onChange={(e: any) => handlePublicChange('identificacao', 'dataTriagem', e.target.value)} />
                                                <StyledInput label="Especialista Resp." value={publicData.identificacao.especialistaResponsavel} onChange={(e: any) => handlePublicChange('identificacao', 'especialistaResponsavel', e.target.value)} />
                                            </div>
                                        </FormSection>

                                        <FormSection title="II. Motivo do Encaminhamento" icon={AlertCircle}>
                                            <StyledInput label="Queixa Principal" value={publicData.motivoEncaminhamento.queixa} onChange={(e: any) => handlePublicChange('motivoEncaminhamento', 'queixa', e.target.value)} />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <StyledInput label="Há quanto tempo?" value={publicData.motivoEncaminhamento.haQuantoTempo} onChange={(e: any) => handlePublicChange('motivoEncaminhamento', 'haQuantoTempo', e.target.value)} />
                                                <StyledInput label="Situações / Intensidade" value={publicData.motivoEncaminhamento.situacoesIntensidade} onChange={(e: any) => handlePublicChange('motivoEncaminhamento', 'situacoesIntensidade', e.target.value)} />
                                            </div>
                                        </FormSection>

                                        <FormSection title="III. Histórico Familiar" icon={Users}>
                                            <StyledInput label="Com quem mora?" value={publicData.historicoFamiliar.comQuemMora} onChange={(e: any) => handlePublicChange('historicoFamiliar', 'comQuemMora', e.target.value)} />
                                            <StyledInput label="Relação Familiar" value={publicData.historicoFamiliar.relacaoFamiliar} onChange={(e: any) => handlePublicChange('historicoFamiliar', 'relacaoFamiliar', e.target.value)} />
                                            <StyledInput label="Histórico Geral" rows={3} value={publicData.historicoFamiliar.historicoGeral} onChange={(e: any) => handlePublicChange('historicoFamiliar', 'historicoGeral', e.target.value)} />
                                        </FormSection>

                                        <FormSection title="IV. Histórico Escolar" icon={SchoolIcon}>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <StyledInput label="Desempenho" value={publicData.historicoEscolar.desempenho} onChange={(e: any) => handlePublicChange('historicoEscolar', 'desempenho', e.target.value)} />
                                                <StyledInput label="Dificuldades" value={publicData.historicoEscolar.dificuldades} onChange={(e: any) => handlePublicChange('historicoEscolar', 'dificuldades', e.target.value)} />
                                            </div>
                                            <StyledInput label="Comportamento em Sala" value={publicData.historicoEscolar.comportamentoSala} onChange={(e: any) => handlePublicChange('historicoEscolar', 'comportamentoSala', e.target.value)} />
                                        </FormSection>
                                    </div>

                                    {/* PARTE PRIVADA (5-9) - VISÍVEL APENAS PARA PSICÓLOGOS */}
                                    {canAccessPrivate ? (
                                        <div className="mb-8 relative">
                                            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-purple-400 rounded-full"></div>
                                            <h3 className="text-purple-900 font-bold text-lg mb-4 flex items-center gap-2 uppercase tracking-wide ml-2"><Lock size={18} /> Prontuário Clínico (Privado)</h3>

                                            <FormSection title="V. Comportamento Observado" icon={EyeOff} isPrivate>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    <StyledInput label="Estado Emocional" value={privateData.formData.comportamentoObservado.estadoEmocional} onChange={(e: any) => handlePrivateChange('comportamentoObservado', 'estadoEmocional', e.target.value)} />
                                                    <StyledInput label="Contato Visual" value={privateData.formData.comportamentoObservado.contatoVisual} onChange={(e: any) => handlePrivateChange('comportamentoObservado', 'contatoVisual', e.target.value)} />
                                                    <StyledInput label="Linguagem" value={privateData.formData.comportamentoObservado.linguagem} onChange={(e: any) => handlePrivateChange('comportamentoObservado', 'linguagem', e.target.value)} />
                                                    <StyledInput label="Participação" value={privateData.formData.comportamentoObservado.participacao} onChange={(e: any) => handlePrivateChange('comportamentoObservado', 'participacao', e.target.value)} />
                                                    <StyledInput label="Seguir Instruções" value={privateData.formData.comportamentoObservado.seguirInstrucoes} onChange={(e: any) => handlePrivateChange('comportamentoObservado', 'seguirInstrucoes', e.target.value)} />
                                                    <StyledInput label="Socialização" value={privateData.formData.comportamentoObservado.socializacao} onChange={(e: any) => handlePrivateChange('comportamentoObservado', 'socializacao', e.target.value)} />
                                                </div>
                                            </FormSection>

                                            <FormSection title="VI. Triagem Psicológica" icon={Activity} isPrivate>
                                                <StyledInput label="Comportamentos Observados na Triagem" rows={3} value={privateData.formData.triagemPsicologica.comportamentosObservados} onChange={(e: any) => handlePrivateChange('triagemPsicologica', 'comportamentosObservados', e.target.value)} />
                                                <StyledInput label="Hipóteses Iniciais" rows={2} value={privateData.formData.triagemPsicologica.hipotesesIniciais} onChange={(e: any) => handlePrivateChange('triagemPsicologica', 'hipotesesIniciais', e.target.value)} />
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                                    <StyledInput label="Avaliação Aprofundada?" value={privateData.formData.triagemPsicologica.necessidadeAvaliacaoAprofundada} onChange={(e: any) => handlePrivateChange('triagemPsicologica', 'necessidadeAvaliacaoAprofundada', e.target.value)} />
                                                    <StyledInput label="Encaminhamentos Sugeridos" value={privateData.formData.triagemPsicologica.encaminhamentosSugeridos} onChange={(e: any) => handlePrivateChange('triagemPsicologica', 'encaminhamentosSugeridos', e.target.value)} />
                                                </div>
                                            </FormSection>

                                            <FormSection title="VII. Plano Terapêutico" icon={Layout} isPrivate>
                                                <StyledInput label="Objetivo Principal" value={privateData.formData.planoTerapeutico.objetivoPrincipal} onChange={(e: any) => handlePrivateChange('planoTerapeutico', 'objetivoPrincipal', e.target.value)} />
                                                <StyledInput label="Metas Específicas" rows={3} value={privateData.formData.planoTerapeutico.metasEspecificas} onChange={(e: any) => handlePrivateChange('planoTerapeutico', 'metasEspecificas', e.target.value)} />
                                            </FormSection>

                                            <FormSection title="VIII. Evolução Geral" icon={TrendingUp} isPrivate>
                                                <StyledInput label="Resumo da Evolução (Texto Corrido)" rows={5} value={privateData.formData.evolucaoGeral} onChange={(e: any) => handlePrivateChange('root', 'evolucaoGeral', e.target.value)} />
                                            </FormSection>

                                            <FormSection title="IX. Encerramento / Alta" icon={Flag} isPrivate>
                                                <StyledInput label="Motivo da Alta" value={privateData.formData.encerramento.motivoAlta} onChange={(e: any) => handlePrivateChange('encerramento', 'motivoAlta', e.target.value)} />
                                                <StyledInput label="Resumo dos Ganhos" rows={2} value={privateData.formData.encerramento.resumoGanhos} onChange={(e: any) => handlePrivateChange('encerramento', 'resumoGanhos', e.target.value)} />

                                                <div className="mt-8 p-6 bg-purple-50 rounded-2xl border border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                                                    <div className="flex items-center gap-4 text-purple-900">
                                                        <div className="p-3 bg-white rounded-xl shadow-sm text-purple-600"><Flag size={24} /></div>
                                                        <div>
                                                            <p className="font-bold">Finalizar Acompanhamento</p>
                                                            <p className="text-xs opacity-70">Salva os dados finais e gera o relatório de alta automaticamente.</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleDischarge}
                                                        className="w-full md:w-auto px-6 py-3 bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 shadow-lg shadow-purple-600/20 transition-all active:scale-95 group"
                                                    >
                                                        <CheckCircle size={18} className="group-hover:animate-bounce" />
                                                        Dar Alta e Gerar Relatório
                                                    </button>
                                                </div>
                                            </FormSection>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-100 p-8 rounded-xl border border-slate-200 text-center mb-8">
                                            <Lock className="mx-auto text-slate-400 mb-2" size={32} />
                                            <h4 className="text-slate-700 font-bold">Conteúdo Restrito</h4>
                                            <p className="text-slate-500 text-sm">As seções clínicas V a IX são visíveis apenas para o Psicólogo responsável.</p>
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-4 sticky bottom-4">
                                        <button type="submit" className="px-8 py-3 bg-purple-700 text-white rounded-xl shadow-xl hover:bg-purple-800 font-bold flex items-center gap-2 transition-transform hover:-translate-y-1">
                                            <Save size={20} /> Salvar Prontuário
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* --- ABA SESSÕES (EVOLUÇÃO) --- */}
                        {activeTab === 'sessoes' && canAccessPrivate && (
                            <div className="flex-1 bg-[#FAF9FF] p-8 space-y-6 animate-fadeIn max-w-5xl mx-auto w-full">

                                {viewMode === 'list' && (
                                    <>
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/50 p-4 rounded-xl backdrop-blur-sm border border-white/40 shadow-sm">
                                            <div>
                                                <h3 className="font-bold text-purple-900 text-xl">Sessões Realizadas</h3>
                                                <p className="text-purple-800 text-sm">{privateData.sessions.length} registros encontrados</p>
                                            </div>
                                            <button onClick={startNewSession} className="w-full sm:w-auto bg-purple-700 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-purple-800 shadow-md transition-all">
                                                <Plus size={20} /> Nova Sessão
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            {privateData.sessions.length === 0 ? (
                                                <div className="text-center py-12 bg-white/40 rounded-2xl border-2 border-dashed border-purple-300">
                                                    <Brain size={48} className="mx-auto text-purple-400 mb-2 opacity-60" />
                                                    <p className="text-purple-900 font-medium">Nenhuma sessão registrada ainda.</p>
                                                </div>
                                            ) : (
                                                privateData.sessions.map(sess => (
                                                    <div key={sess.id} className="bg-white p-5 rounded-xl shadow-sm border border-purple-100 hover:shadow-md transition-all flex flex-col sm:flex-row gap-4 relative overflow-hidden group">
                                                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${sess.humor === 'feliz' ? 'bg-green-400' :
                                                            sess.humor === 'triste' ? 'bg-blue-400' :
                                                                sess.humor === 'ansioso' ? 'bg-purple-400' :
                                                                    sess.humor === 'irritado' ? 'bg-red-400' : 'bg-slate-400'
                                                            }`}></div>

                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sessão #{sess.numero}</span>
                                                                <span className="text-xs font-medium text-slate-400">• {new Date(sess.dataHoraISO).toLocaleDateString()}</span>
                                                                {sess.status === 'Realizado' ?
                                                                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Realizado</span> :
                                                                    <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{sess.status}</span>
                                                                }
                                                            </div>
                                                            <h4 className="font-bold text-slate-800 text-lg">{sess.titulo}</h4>
                                                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{sess.resumo}</p>
                                                        </div>

                                                        <div className="flex flex-col items-end justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                            <div className="text-2xl" title={`Humor: ${sess.humor}`}>
                                                                {sess.humor === 'feliz' ? '😃' :
                                                                    sess.humor === 'triste' ? '😢' :
                                                                        sess.humor === 'ansioso' ? '😰' :
                                                                            sess.humor === 'irritado' ? '😡' : '😐'}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {/* BOTÃO IMPRIMIR SESSÃO INDIVIDUAL */}
                                                                <button onClick={() => handlePrintPsychology(sess)} className="min-h-[44px] min-w-[44px] p-2 bg-slate-100 rounded-lg hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition-colors" title="Imprimir Sessão">
                                                                    <Printer size={16} />
                                                                </button>
                                                                <button onClick={() => { setCurrentSession(sess); setViewMode('form'); }} className="min-h-[44px] min-w-[44px] p-2 bg-slate-100 rounded-lg hover:bg-purple-100 text-slate-600 hover:text-purple-700 transition-colors">
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button onClick={() => deleteSession(sess.id)} className="min-h-[44px] min-w-[44px] p-2 bg-slate-100 rounded-lg hover:bg-red-100 text-slate-600 hover:text-red-700 transition-colors">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}

                                {viewMode === 'form' && (
                                    <div className="bg-white p-6 rounded-xl shadow-lg border border-purple-200 animate-slideUp">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                                            <h3 className="font-bold text-purple-900 text-lg">{currentSession.id ? 'Editar Sessão' : 'Nova Sessão'}</h3>
                                            <button onClick={() => setViewMode('list')} className="text-slate-400 hover:text-purple-600"><X size={20} /></button>
                                        </div>
                                        <form onSubmit={saveSession} className="space-y-6">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <label className="block">
                                                    <span className="text-sm font-bold text-slate-700">Título do Atendimento</span>
                                                    <input required type="text" className="w-full rounded-lg border-slate-300 p-2 border"
                                                        value={currentSession.titulo} onChange={e => setCurrentSession({ ...currentSession, titulo: e.target.value })} placeholder="Ex: Atendimento Individual" />
                                                </label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <label className="block">
                                                        <span className="text-sm font-bold text-slate-700">Data e Hora</span>
                                                        <input required type="datetime-local" className="w-full rounded-lg border-slate-300 p-2 border"
                                                            value={currentSession.dataHoraISO} onChange={e => setCurrentSession({ ...currentSession, dataHoraISO: e.target.value })} />
                                                    </label>
                                                    <label className="block">
                                                        <span className="text-sm font-bold text-slate-700">Duração (min)</span>
                                                        <input type="number" className="w-full rounded-lg border-slate-300 p-2 border"
                                                            value={currentSession.duracaoMin} onChange={e => setCurrentSession({ ...currentSession, duracaoMin: parseInt(e.target.value) })} />
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <label className="block">
                                                    <span className="text-sm font-bold text-slate-700">Humor do Paciente</span>
                                                    <select className="w-full rounded-lg border-slate-300 p-2 border" value={currentSession.humor} onChange={e => setCurrentSession({ ...currentSession, humor: e.target.value as any })}>
                                                        <option value="neutro">Neutro 😐 </option>
                                                        <option value="feliz">Feliz 😃</option>
                                                        <option value="triste">Triste 😢</option>
                                                        <option value="ansioso">Ansioso 😰</option>
                                                        <option value="irritado">Irritado 😡</option>
                                                    </select>
                                                </label>
                                                <label className="block">
                                                    <span className="text-sm font-bold text-slate-700">Status</span>
                                                    <select className="w-full rounded-lg border-slate-300 p-2 border" value={currentSession.status} onChange={e => setCurrentSession({ ...currentSession, status: e.target.value as any })}>
                                                        <option value="Realizado">Realizado</option>
                                                        <option value="Agendado">Agendado</option>
                                                        <option value="Falta">Falta</option>
                                                        <option value="Cancelado">Cancelado</option>
                                                    </select>
                                                </label>
                                            </div>

                                            <label className="block">
                                                <span className="text-sm font-bold text-slate-700">Resumo (Visível na lista)</span>
                                                <input type="text" className="w-full rounded-lg border-slate-300 p-2 border"
                                                    value={currentSession.resumo} onChange={e => setCurrentSession({ ...currentSession, resumo: e.target.value })} placeholder="Breve descrição do que foi trabalhado..." />
                                            </label>

                                            <label className="block">
                                                <span className="text-sm font-bold text-slate-700">Anotações Detalhadas (Confidencial)</span>
                                                <textarea rows={6} className="w-full rounded-lg border-slate-300 p-3 border"
                                                    value={currentSession.anotacoes} onChange={e => setCurrentSession({ ...currentSession, anotacoes: e.target.value })} placeholder="Descreva a sessão, técnicas utilizadas, observações clínicas..." />
                                            </label>

                                            <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-center gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" className="rounded text-red-600 focus:ring-red-500 w-5 h-5"
                                                        checked={currentSession.indicativoAlta} onChange={e => setCurrentSession({ ...currentSession, indicativoAlta: e.target.checked })} />
                                                    <span className="font-bold text-red-700">Indicar Alta Terapêutica</span>
                                                </label>
                                                {currentSession.indicativoAlta && (
                                                    <input type="text" className="flex-1 rounded-lg border-red-200 p-2 border text-sm"
                                                        value={currentSession.motivoAlta} onChange={e => setCurrentSession({ ...currentSession, motivoAlta: e.target.value })} placeholder="Motivo da alta..." />
                                                )}
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                                <button type="button" onClick={() => setViewMode('list')} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                                                <button type="submit" className="w-full sm:w-auto px-6 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 font-bold shadow-md">Salvar Sessão</button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* Modal de Confirmação de Alta Profissional */}
            {showConfirmDischarge && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 flex flex-col items-center text-center animate-slideUp border border-slate-100">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 text-amber-600">
                            <AlertTriangle size={48} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-3 uppercase tracking-tight">Confirmar Alta?</h3>
                        <p className="text-slate-500 mb-8 leading-relaxed font-medium">
                            VocÃª estÃ¡ prestes a dar alta para <br />
                            <strong className="text-slate-900">{selectedStudent?.fullName}</strong>. <br />
                            Isso irÃ¡ salvar os dados atuais e gerar o relatÃ³rio final.
                        </p>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setShowConfirmDischarge(false)}
                                className="flex-1 py-4 bg-slate-100 text-slate-500 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Sair
                            </button>
                            <button
                                onClick={confirmDischargeAction}
                                className="flex-1 py-4 bg-amber-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 active:scale-95"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação Genérico */}
            {confirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-slideUp border border-slate-100">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmModal.title}</h3>
                        <p className="text-slate-600 mb-6">{confirmModal.message}</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente SocialServiceSessionForm removido na refatoração (v2.1)
// O formulário de Busca Ativa agora é integrado ao SocialServiceSpecificDashboard.


// --- EXPORTS DE PÁGINAS ---
export const PsychologyDashboardPage: React.FC<{ onNavigateNew: () => void; currentUser: User; preSelectedStudent?: Student }> = (props) => (
    <PsychologySpecificDashboard title="Psicologia Clínica" specialty={Specialty.PSYCHOLOGY} {...props} />
);

export const PsychologySessionFormPage: React.FC<{ onCancel: () => void; currentUser: User }> = (props) => (
    <PsychologySessionForm specialty={Specialty.PSYCHOLOGY} {...props} />
);

// (Definição duplicada movida para o final do arquivo)

// (Definição anterior removida)

export const SpeechTherapyDashboardPage: React.FC<{ onNavigateNew: () => void; currentUser: User; preSelectedStudent?: Student; autoOpenSession?: boolean }> = (props) => (
    <SpeechTherapySpecificDashboard title="Fonoaudiologia" specialty={Specialty.SPEECH_THERAPY} {...props} />
);
export const SpeechTherapySessionFormPage: React.FC<{ onCancel: () => void; currentUser: User; preSelectedStudent?: Student }> = (props) => (
    <SpeechTherapyDashboardPage onNavigateNew={() => { }} currentUser={props.currentUser} preSelectedStudent={props.preSelectedStudent} autoOpenSession={true} />
);

export const OccupationalTherapyDashboardPage: React.FC<{ onNavigateNew: () => void; currentUser: User; preSelectedStudent?: Student }> = (props) => (
    <OccupationalTherapySpecificDashboard title="Terapia Ocupacional" specialty={Specialty.OCCUPATIONAL_THERAPY} {...props} />
);

export const OccupationalTherapySessionFormPage: React.FC<{ onCancel: () => void; currentUser: User }> = (props) => (
    <OccupationalTherapySpecificDashboard title="Terapia Ocupacional" specialty={Specialty.OCCUPATIONAL_THERAPY} onNavigateNew={() => { }} currentUser={props.currentUser} />
);

export const PsychopedagogyDashboardPage: React.FC<{ onNavigateNew: () => void; onNavigate?: (page: string, options?: any) => void; currentUser: User; preSelectedStudent?: Student; autoOpenSession?: boolean }> = (props) => (
    <PsychopedagogySpecificDashboard title="Psicopedagogia" specialty={Specialty.PSYCHOPEDAGOGY} {...props} />
);
export const PsychopedagogySessionFormPage: React.FC<{ onCancel: () => void; currentUser: User; preSelectedStudent?: Student }> = (props) => (
    <PsychopedagogyDashboardPage onNavigateNew={() => { }} currentUser={props.currentUser} preSelectedStudent={props.preSelectedStudent} autoOpenSession={true} />
);

export const PhysiotherapyDashboardPage: React.FC<{ onNavigateNew: () => void; currentUser: User; preSelectedStudent?: Student }> = (props) => (
    <PhysiotherapySpecificDashboard title="Fisioterapia" specialty={Specialty.PHYSIOTHERAPY} {...props} />
);
export const PhysiotherapySessionFormPage: React.FC<{ onCancel: () => void; currentUser: User }> = (props) => (
    // Redireciona para o dashboard pois ele agora gerencia sessões internamente
    <PhysiotherapySpecificDashboard title="Fisioterapia" specialty={Specialty.PHYSIOTHERAPY} onNavigateNew={() => { }} currentUser={props.currentUser} />
);

// --- NUTRIÇÃO - TYPES & HELPERS ---

interface NutritionSession {
    id: string;
    date: string;
    weight: string;
    height: string;
    bmi: string;
    evolution: string;
    dietPlan: string;
    recommendations: string;
}

interface NutritionPrivateData {
    anamnesis: {
        eatingHabits: string;
        allergies: string;
        intolerances: string;
        favoriteFoods: string;
        rejectedFoods: string;
        waterIntake: string;
        familyHistory: string;
    };
    lastAssessment: {
        weight: string;
        height: string;
        bmi: string;
        classification: string;
        date: string;
    };
    sessions: NutritionSession[];
}

const initialNutritionData: NutritionPrivateData = {
    anamnesis: { eatingHabits: '', allergies: '', intolerances: '', favoriteFoods: '', rejectedFoods: '', waterIntake: '', familyHistory: '' },
    lastAssessment: { weight: '', height: '', bmi: '', classification: '', date: '' },
    sessions: []
};

const extractNutritionData = (student: Student): NutritionPrivateData => {
    const raw = student.clinical.nutrition_data || {};
    // Map sessions from history
    const mappedSessions: NutritionSession[] = (student.history || [])
        .filter(h => h.specialty === Specialty.NUTRITION)
        .map(h => ({
            id: h.id,
            date: h.date,
            weight: h.content?.weight || '',
            height: h.content?.height || '',
            bmi: h.content?.bmi || '',
            evolution: h.content?.evolution || h.notes,
            dietPlan: h.content?.dietPlan || '',
            recommendations: h.content?.recommendations || ''
        }));

    return {
        anamnesis: { ...initialNutritionData.anamnesis, ...(raw.anamnesis || {}) },
        lastAssessment: { ...initialNutritionData.lastAssessment, ...(raw.lastAssessment || {}) },
        sessions: mappedSessions
    };
};

// --- DASHBOARD ESPECÍFICO DE NUTRIÇÃO ---

const NutritionStyledInput = ({ label, value, onChange, rows, placeholder }: any) => (
    <label className="block">
        <span className="text-sm font-bold text-slate-700 block mb-2">{label}</span>
        {rows ? (
            <textarea
                rows={rows}
                className="w-full rounded-lg border-slate-300 p-3 border placeholder:text-slate-400 focus:ring-2 focus:ring-green-500 outline-none transition-all resize-none"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />
        ) : (
            <input
                type="text"
                className="w-full rounded-lg border-slate-300 p-3 border placeholder:text-slate-400 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />
        )}
    </label>
);
const NutritionSpecificDashboard: React.FC<BaseDashboardProps & { preSelectedStudent?: Student }> = ({ title, onNavigateNew, currentUser, preSelectedStudent }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(preSelectedStudent || null);
    const [nutritionData, setNutritionData] = useState<NutritionPrivateData>(initialNutritionData);
    const [loading, setLoading] = useState(false);
    const { success: showToast, error: toastError } = useToast();
    const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
    const [showConfirmDischarge, setShowConfirmDischarge] = useState(false);

    // Session State
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
    const [currentSession, setCurrentSession] = useState<Partial<NutritionSession>>({});

    const isNutritionist = currentUser.specialty === Specialty.NUTRITION || currentUser.role === 'ADMIN';

    useAgendaClinicalDeepLink(setLoading, toastError, (full) => {
        setSelectedStudent(full);
        setStudents((prev) => (prev.some((s) => s.id === full.id) ? prev : [...prev, full]));
        setViewMode('list');
    });

    useEffect(() => {
        if (preSelectedStudent) setSelectedStudent(preSelectedStudent);
    }, [preSelectedStudent]);

    useEffect(() => {
        const loadStudents = async () => {
            setLoading(true);
            const data = await SupabaseService.getStudentsForUser(currentUser);
            setStudents(data);
            setLoading(false);
        };
        loadStudents();
    }, []);

    useEffect(() => {
        if (selectedStudent && isNutritionist) {
            setNutritionData(extractNutritionData(selectedStudent));
        }
    }, [selectedStudent, isNutritionist]);

    const handleStudentSelect = (id: string) => {
        const s = students.find(st => st.id === id);
        setSelectedStudent(s || null);
        setViewMode('list');
    };

    const handleAnamnesisChange = (field: string, value: string) => {
        setNutritionData(prev => ({
            ...prev,
            anamnesis: { ...prev.anamnesis, [field]: value }
        }));
    };

    const calculateBMI = (weightStr: string, heightStr: string) => {
        const weight = parseFloat(weightStr.replace(',', '.'));
        const height = parseFloat(heightStr.replace(',', '.')); // meters
        if (weight > 0 && height > 0) {
            const bmi = weight / (height * height);
            let classification = '';
            if (bmi < 18.5) classification = 'Abaixo do peso';
            else if (bmi < 24.9) classification = 'Peso normal';
            else if (bmi < 29.9) classification = 'Sobrepeso';
            else classification = 'Obesidade';
            return { bmi: bmi.toFixed(2), classification };
        }
        return { bmi: '', classification: '' };
    };

    const handleSaveAnamnesis = async () => {
        if (!selectedStudent) return;
        try {
            const updatedStudent = {
                ...selectedStudent,
                clinical: {
                    ...selectedStudent.clinical,
                    nutrition_data: {
                        ...selectedStudent.clinical.nutrition_data,
                        anamnesis: nutritionData.anamnesis
                    }
                }
            };
            await SupabaseService.saveStudent(updatedStudent);
            showToast('Anamnese salva com sucesso!', 'success');
        } catch (e) {
            console.error(e);
            toastError('Erro ao salvar.');
        }
    };

    const handleSaveSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;

        // Calculate BMI if weight/height present
        const { bmi, classification } = calculateBMI(currentSession.weight || '', currentSession.height || '');

        const newSession: NutritionSession = {
            id: currentSession.id || crypto.randomUUID(),
            date: currentSession.date || new Date().toISOString().split('T')[0],
            weight: currentSession.weight || '',
            height: currentSession.height || '',
            bmi: bmi || currentSession.bmi || '',
            evolution: currentSession.evolution || '',
            dietPlan: currentSession.dietPlan || '',
            recommendations: currentSession.recommendations || ''
        };

        const genericSession: Session = {
            id: newSession.id,
            date: newSession.date,
            specialty: Specialty.NUTRITION,
            professionalName: currentUser.name,
            notes: `Peso: ${newSession.weight}kg | IMC: ${newSession.bmi}`,
            content: newSession
        };

        try {
            await SupabaseService.saveSession(genericSession, selectedStudent.id, currentUser.id);

            // Update Last Assessment in Private Data
            if (newSession.weight && newSession.height) {
                const updatedPrivateData = {
                    ...nutritionData,
                    lastAssessment: {
                        weight: newSession.weight,
                        height: newSession.height,
                        bmi: bmi,
                        classification: classification,
                        date: newSession.date
                    }
                };

                const updatedStudent = {
                    ...selectedStudent,
                    clinical: {
                        ...selectedStudent.clinical,
                        nutrition_data: updatedPrivateData
                    }
                };
                await SupabaseService.saveStudent(updatedStudent);
                setNutritionData(extractNutritionData(updatedStudent)); // Refresh
            } else {
                // Just update session list locally
                const updatedSessions = currentSession.id
                    ? nutritionData.sessions.map(s => s.id === currentSession.id ? newSession : s)
                    : [newSession, ...nutritionData.sessions];
                setNutritionData(prev => ({ ...prev, sessions: updatedSessions }));
            }

            setViewMode('list');
            showToast('Atendimento salvo com sucesso!');
        } catch (err) {
            console.error(err);
            toastError('Erro ao salvar atendimento.');
        }
    };

    const handlePrintNutrition = async (targetSession?: NutritionSession) => {
        if (!selectedStudent || !isNutritionist) return;
        try {
            const config = await SupabaseService.getPapelTimbradoConfig();
            const session = targetSession || (nutritionData.sessions.length > 0 ? nutritionData.sessions[0] : null);

            const contentHTML = `
                                            <h2 class="section-title">I. DADOS ANTROPOMÉTRICOS</h2>
                                            <div class="box">
                                                <div class="data-row"><span class="label">PESO:</span> <span class="value">${session?.weight || nutritionData.lastAssessment.weight || '-'} kg</span></div>
                                                <div class="data-row"><span class="label">ALTURA:</span> <span class="value">${session?.height || nutritionData.lastAssessment.height || '-'} m</span></div>
                                                <div class="data-row"><span class="label">IMC:</span> <span class="value">${session?.bmi || nutritionData.lastAssessment.bmi || '-'} (${session?.bmi ? calculateBMI(session.weight, session.height).classification : nutritionData.lastAssessment.classification})</span></div>
                                            </div>

                                            <h2 class="section-title">II. ANAMNESE E HÁBITOS</h2>
                                            <div class="box">
                                                <div class="data-row"><span class="label">HÁBITOS:</span> <div class="value">${nutritionData.anamnesis.eatingHabits || '-'}</div></div>
                                                <div class="data-row"><span class="label">ALERGIAS/AVERSÕES:</span> <div class="value">${nutritionData.anamnesis.allergies || '-'} / ${nutritionData.anamnesis.rejectedFoods || '-'}</div></div>
                                            </div>

                                            ${session ? `
                <h2 class="section-title">III. EVOLUÇÃO E RECOMENDAÇÕES</h2>
                <div class="box" style="border-left: 4px solid #10b981; background: #f0fdf4;">
                    <div class="data-row"><span class="label">DATA:</span> <span class="value">${new Date(session.date).toLocaleDateString()}</span></div>
                    <div class="data-row"><span class="label">EVOLUÇÃO:</span> <div class="value">${session.evolution || 'Sem notas.'}</div></div>
                    <div class="data-row"><span class="label">PLANO ALIMENTAR:</span> <div class="value">${session.dietPlan || '-'}</div></div>
                    <div class="data-row"><span class="label">RECOMENDAÇÕES:</span> <div class="value">${session.recommendations || '-'}</div></div>
                </div>
                ` : ''}
                                            `;

            const html = generateClinicalPrintHTML(selectedStudent, config, 'Relatório Nutricional', contentHTML, {
                name: currentUser.name, jobTitle: currentUser.jobTitle || 'Nutricionista', specialty: currentUser.specialty, signatureUrl: currentUser.signatureUrl
            });

            const win = window.open('', '_blank');
            if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print(); win.close(); }, 500); }
        } catch (e) { toastError('Erro na impressão.'); }
    };

    const handleDischarge = async () => {
        if (!selectedStudent) return;
        setShowConfirmDischarge(true);
    };

    const confirmDischargeAction = async () => {
        setShowConfirmDischarge(false);

        try {
            await handleSaveAnamnesis();
            setTimeout(() => {
                handlePrintNutrition();
            }, 500);
        } catch (err) {
            console.error(err);
            toastError('Erro ao processar alta.');
        }
    };

    if (!isNutritionist) {
        return (
            <div className="p-10 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600"><Lock size={40} /></div>
                <h3 className="text-xl font-bold text-slate-800">Acesso Restrito</h3>
                <p className="text-slate-500 max-w-md mt-2">Módulo exclusivo para Nutrição.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-2xl text-green-600"><Activity size={32} /></div>
                    {title}
                </h1>
            </div>

            {!selectedStudent ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                    <StudentPickerBySchool students={students} accentColor="#16a34a" onSelect={s => { setSelectedStudent(s); setNutritionData(extractNutritionData(s)); }} />
                </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4 text-2xl font-bold">
                                    {selectedStudent.fullName.charAt(0)}
                                </div>
                                <h2 className="font-bold text-slate-800 text-lg">{selectedStudent.fullName}</h2>
                                <p className="text-slate-500 text-sm">
                                    {new Date().getFullYear() - new Date(selectedStudent.birthDate).getFullYear()} anos
                                </p>
                            </div>

                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 mb-4">
                                <h4 className="text-xs font-bold text-green-800 uppercase mb-2">Última Avaliação</h4>
                                {nutritionData.lastAssessment.weight ? (
                                    <div className="space-y-1">
                                        <div className="flex justify-between"><span className="text-sm text-green-700">Peso:</span> <span className="font-bold text-green-900">{nutritionData.lastAssessment.weight} kg</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-green-700">Altura:</span> <span className="font-bold text-green-900">{nutritionData.lastAssessment.height} m</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-green-700">IMC:</span> <span className="font-bold text-green-900">{nutritionData.lastAssessment.bmi}</span></div>
                                        <div className="mt-2 pt-2 border-t border-green-200 text-center font-bold text-green-800 text-sm">
                                            {nutritionData.lastAssessment.classification}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-green-700 text-center italic">Sem dados registrados</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText size={18} /> Anamnese Rápida</h3>
                            <div className="space-y-4">
                                <NutritionStyledInput label="Hábitos Alimentares" rows={2} value={nutritionData.anamnesis.eatingHabits} onChange={(e: any) => handleAnamnesisChange('eatingHabits', e.target.value)} />
                                <NutritionStyledInput label="Alergias" value={nutritionData.anamnesis.allergies} onChange={(e: any) => handleAnamnesisChange('allergies', e.target.value)} />
                                <NutritionStyledInput label="Aversões" value={nutritionData.anamnesis.rejectedFoods} onChange={(e: any) => handleAnamnesisChange('rejectedFoods', e.target.value)} />
                                <NutritionStyledInput label="Histórico Familiar" rows={2} value={nutritionData.anamnesis.familyHistory} onChange={(e: any) => handleAnamnesisChange('familyHistory', e.target.value)} />
                                <button onClick={handleSaveAnamnesis} className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900">Salvar Anamnese</button>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100 border-t-4 border-t-rose-500">
                            <h3 className="font-bold text-rose-600 mb-2 flex items-center gap-2 text-xs uppercase tracking-widest"><ShieldAlert size={14} /> Encerramento</h3>
                            <p className="text-slate-500 text-[10px] mb-4">Gerar relatório final e oficializar a alta nutricional.</p>
                            <button
                                onClick={handleDischarge}
                                className="w-full py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all"
                            >
                                Dar Alta e Imprimir
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: SESSIONS & EVOLUTION */}
                    <div className="lg:col-span-3">
                        {viewMode === 'list' ? (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                    <h3 className="font-bold text-slate-800 text-xl">Histórico de Atendimentos</h3>
                                    <button onClick={() => { setCurrentSession({}); setViewMode('form'); }} className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg shadow-green-200">
                                        <Plus size={20} /> Nova Consulta
                                    </button>
                                </div>

                                <div className="grid gap-4">
                                    {nutritionData.sessions.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400">Nenhum atendimento registrado.</div>
                                    ) : (
                                        nutritionData.sessions.map(session => (
                                            <div key={session.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase tracking-wide">
                                                            {new Date(session.date).toLocaleDateString()}
                                                        </span>
                                                        <h4 className="font-bold text-slate-800 text-lg mt-2">Acompanhamento Nutricional</h4>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handlePrintNutrition(session)} className="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Imprimir Consulta"><Printer size={18} /></button>
                                                        <button onClick={() => { setCurrentSession(session); setViewMode('form'); }} className="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Edit2 size={18} /></button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                                                    <div className="bg-slate-50 p-3 rounded-lg">
                                                        <span className="block text-xs font-bold text-slate-400 uppercase">Antropometria</span>
                                                        <span className="font-medium text-slate-700">Peso: {session.weight}kg | Alt: {session.height}m | IMC: {session.bmi}</span>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <span className="block text-xs font-bold text-slate-400 uppercase">Evolução</span>
                                                        <p className="text-slate-600 line-clamp-2">{session.evolution}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 animate-slideUp">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                                    <h3 className="font-bold text-slate-800 text-xl">{currentSession.id ? 'Editar Consulta' : 'Nova Consulta'}</h3>
                                    <button onClick={() => setViewMode('list')} className="text-slate-400 hover:text-slate-800"><X size={24} /></button>
                                </div>

                                {!currentSession.id && nutritionData.sessions.length > 0 && (
                                    <div className="mb-8 p-4 bg-green-50 border border-green-100 rounded-xl text-sm">
                                        <p className="font-bold text-green-800 mb-1 flex items-center gap-2">
                                            <History size={14} /> Notas do Último Atendimento ({new Date(nutritionData.sessions[0].date).toLocaleDateString()}):
                                        </p>
                                        <p className="text-green-700 italic">"{nutritionData.sessions[0].evolution || 'Sem evolução registrada'}"</p>
                                    </div>
                                )}

                                <form onSubmit={handleSaveSession} className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <label className="block">
                                            <span className="text-sm font-bold text-slate-700 block mb-2">Data</span>
                                            <input type="date" required className="w-full rounded-lg border-slate-300 p-3 border"
                                                value={currentSession.date} onChange={e => setCurrentSession({ ...currentSession, date: e.target.value })} />
                                        </label>
                                        <label className="block">
                                            <span className="text-sm font-bold text-slate-700 block mb-2">Peso (kg)</span>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-3 border" placeholder="00.0"
                                                value={currentSession.weight} onChange={e => setCurrentSession({ ...currentSession, weight: e.target.value })} />
                                        </label>
                                        <label className="block">
                                            <span className="text-sm font-bold text-slate-700 block mb-2">Altura (m)</span>
                                            <input type="text" className="w-full rounded-lg border-slate-300 p-3 border" placeholder="1.00"
                                                value={currentSession.height} onChange={e => setCurrentSession({ ...currentSession, height: e.target.value })} />
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <label className="block">
                                            <span className="text-sm font-bold text-slate-700 block mb-2">Plano Alimentar</span>
                                            <textarea rows={4} className="w-full rounded-lg border-slate-300 p-3 border"
                                                value={currentSession.dietPlan} onChange={e => setCurrentSession({ ...currentSession, dietPlan: e.target.value })} placeholder="Café: ... Almoço: ..." />
                                        </label>
                                        <label className="block">
                                            <span className="text-sm font-bold text-slate-700 block mb-2">Evolução / Queixas</span>
                                            <textarea rows={4} className="w-full rounded-lg border-slate-300 p-3 border"
                                                value={currentSession.evolution} onChange={e => setCurrentSession({ ...currentSession, evolution: e.target.value })} placeholder="Paciente relatou..." />
                                        </label>
                                    </div>

                                    <label className="block">
                                        <span className="text-sm font-bold text-slate-700 block mb-2">Recomendações / Orientações</span>
                                        <textarea rows={2} className="w-full rounded-lg border-slate-300 p-3 border"
                                            value={currentSession.recommendations} onChange={e => setCurrentSession({ ...currentSession, recommendations: e.target.value })} />
                                    </label>

                                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                        <button type="button" onClick={() => setViewMode('list')} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                                        <button type="submit" className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200">Salvar Consulta</button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const SocialServiceDashboardPage: React.FC<{ onNavigateNew: () => void; currentUser: User; preSelectedStudent?: Student; autoOpenSession?: boolean; allStudents?: Student[]; onNavigateToCase?: (id: string) => void }> = (props) => (
    <SocialServiceStrategicDashboard title="Visão Estratégica" specialty={Specialty.SOCIAL_WORK} {...props} />
);

export const SocialServiceOperationalPage: React.FC<{ onNavigateNew: () => void; currentUser: User; preSelectedStudent?: Student; allStudents?: Student[] }> = (props) => (
    <SocialServiceAttendanceHub title="Serviço Social - Atendimento" specialty={Specialty.SOCIAL_WORK} {...props} />
);

export const SocialServiceSessionFormPage: React.FC<{ onCancel: () => void; currentUser: User; preSelectedStudent?: Student }> = (props) => (
    <SocialServiceAttendanceHub title="Serviço Social" specialty={Specialty.SOCIAL_WORK} onNavigateNew={() => { }} {...props} />
);

export const NutritionSessionFormPage: React.FC<{ onCancel: () => void; currentUser: User; preSelectedStudent?: Student }> = (props) => (
    <NutritionSpecificDashboard title="Nutrição" specialty={Specialty.NUTRITION} onNavigateNew={() => { }} currentUser={props.currentUser} preSelectedStudent={props.preSelectedStudent} />
);

export const NutritionDashboardPage: React.FC<{ onNavigateNew: () => void; currentUser: User; preSelectedStudent?: Student; allStudents?: Student[] }> = (props) => (
    <NutritionSpecificDashboard title="Nutrição" specialty={Specialty.NUTRITION} {...props} />
);










