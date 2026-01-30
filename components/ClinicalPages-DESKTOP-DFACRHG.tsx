import React, { useState, useEffect, useMemo } from 'react';
import { Student, Specialty, Session, User, PapelTimbradoConfig } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { Plus, Search, Calendar, Clock, User as UserIcon, Save, X, FileText, CheckCircle, Brain, Activity, Lock, StickyNote, Smile, Meh, Frown, Zap, AlertCircle, Edit2, Trash2, ChevronDown, ChevronUp, EyeOff, ShieldAlert, History, AlertTriangle, Layout, AlignLeft, TrendingUp, Users, Flag, Heart, MapPin, Home, Briefcase, GraduationCap, DollarSign, Globe, School, Printer, BarChart2, PieChart as PieIcon, Layers, Baby, Puzzle, ClipboardCheck } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell, CartesianGrid } from 'recharts';

// --- PRIVACY & STORAGE HELPERS FOR PSYCHOLOGY ---
const PSYCH_STORAGE_KEY = 'brotar_psychology_private';

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
    statusAtendimento: 'Em acompanhamento' | 'Alta psicolÃ³gica';
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

// --- PRIVACY & STORAGE HELPERS FOR SOCIAL SERVICE ---
const SOCIAL_STORAGE_KEY = 'brotar_socialService_private';

interface SocialServiceForm {
    identificacao: {
        matriculadoAtualmente: string;
        nomeEscolaAtual: string;
    };
    historicoEscolar: {
        frequentouEscola: string;
        ultimaEscola: string;
        ultimoAno: string;
        anoParou: string;
        idadeSaiu: string;
        motivoSaida: string[];
        motivoSaidaOutros: string;
    };
    condicoesSociais: {
        responsaveisLegais: string;
        fonteRenda: string;
        programasSociais: string[];
        deficienciaCasa: string;
        criancaDeficiencia: string;
        situacoesEnfrentadas: string[];
        adultosAlfabetizados: string;
        educacaoPrioridade: string;
    };
    saude: {
        acompanhamentoMedico: string;
        medicacaoContinua: string;
        acompanhamentoPsi: string;
        conselhoTutelar: string;
        atendidoCapsCras: string;
    };
    situacaoAtual: {
        desejoRetornar: string;
        familiaApoia: string;
        fatoresDificultam: string[];
        fatoresDificultamOutros: string;
        apoiosNecessarios: string[];
        apoiosNecessariosOutros: string;
    };
    observacoes: {
        textoLivre: string;
        acoesRecomendadas: string[];
        statusCaso: string;
    };
}

interface SocialServicePrivateData {
    formData: SocialServiceForm;
    lastUpdate: string;
    professionalName: string;
}

const initialSocialForm: SocialServiceForm = {
    identificacao: { matriculadoAtualmente: '', nomeEscolaAtual: '' },
    historicoEscolar: { frequentouEscola: '', ultimaEscola: '', ultimoAno: '', anoParou: '', idadeSaiu: '', motivoSaida: [], motivoSaidaOutros: '' },
    condicoesSociais: { responsaveisLegais: '', fonteRenda: '', programasSociais: [], deficienciaCasa: '', criancaDeficiencia: '', situacoesEnfrentadas: [], adultosAlfabetizados: '', educacaoPrioridade: '' },
    saude: { acompanhamentoMedico: '', medicacaoContinua: '', acompanhamentoPsi: '', conselhoTutelar: '', atendidoCapsCras: '' },
    situacaoAtual: { desejoRetornar: '', familiaApoia: '', fatoresDificultam: [], fatoresDificultamOutros: '', apoiosNecessarios: [], apoiosNecessariosOutros: '' },
    observacoes: { textoLivre: '', acoesRecomendadas: [], statusCaso: 'Em Acompanhamento' }
};

const extractSocialData = (student: Student): SocialServicePrivateData => {
    const raw = student.clinical.social_data || {};
    return {
        formData: raw.formData || initialSocialForm,
        lastUpdate: raw.lastUpdate || student.createdAt,
        professionalName: raw.professionalName || ''
    };
};

// --- FONOAUDIOLOGIA - TYPES & HELPERS ---
interface SpeechSession {
    id: string;
    date: string;
    objetivo: string;
    atividades: string;
    fonemasTrabalhados: string;
    observacoes: string;
    evolucao: 'Melhora Significativa' | 'Melhora Leve' | 'EstÃ¡vel' | 'RegressÃ£o';
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
    statusAtendimento: 'Em AvaliaÃ§Ã£o' | 'Em Acompanhamento' | 'Alta' | 'Desligado';
}

const initialSpeechData: SpeechPrivateData = {
    anamnese: { queixaPrincipal: '', historicoDesenvolvimentoLinguagem: '', comportamentoAuditivo: '', alimentacaoMastigacao: '', sonoRespiracao: '', historicoEscolar: '' },
    avaliacao: { motricidadeOrofacial: '', linguagemOral: '', linguagemEscrita: '', voz: '', audicao: '' },
    sessions: [],
    examsHistory: [],
    statusAtendimento: 'Em AvaliaÃ§Ã£o'
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
            evolucao: h.content?.evolucao || 'EstÃ¡vel',
            participacao: h.content?.participacao || 'Ativo'
        }));

    return {
        anamnese: { ...initialSpeechData.anamnese, ...(raw.anamnese || {}) },
        avaliacao: { ...initialSpeechData.avaliacao, ...(raw.avaliacao || {}) },
        examsHistory: raw.examsHistory || [],
        statusAtendimento: raw.statusAtendimento || 'Em AvaliaÃ§Ã£o',
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
    nivelIndependencia: 'Independente' | 'SupervisÃ£o' | 'Ajuda MÃ­nima' | 'Ajuda Moderada' | 'Ajuda MÃ¡xima' | 'Dependente';
    evolucao: 'Melhora Significativa' | 'Leve Melhora' | 'EstÃ¡vel' | 'RegressÃ£o';
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
    statusAtendimento: 'AvaliaÃ§Ã£o' | 'IntervenÃ§Ã£o' | 'Monitoramento' | 'Alta';
}

const initialOTData: OTPrivateData = {
    anamnese: { historicoOcupacional: '', rotinaAVDs: '', perfilSensorialPrevia: '', brincarDesenvolvimento: '', comportamentoSocial: '' },
    avaliacao: { motricidadeFina: '', motricidadeGrossa: '', processamentoSensorial: '', integracaoVisomotora: '', autocuidados: '' },
    sessions: [],
    statusAtendimento: 'AvaliaÃ§Ã£o'
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
            nivelIndependencia: h.content?.nivelIndependencia || 'SupervisÃ£o',
            evolucao: h.content?.evolucao || 'EstÃ¡vel',
            observacoes: h.content?.observacoes || h.notes
        }));

    return {
        anamnese: { ...initialOTData.anamnese, ...(raw.anamnese || {}) },
        avaliacao: { ...initialOTData.avaliacao, ...(raw.avaliacao || {}) },
        statusAtendimento: raw.statusAtendimento || 'AvaliaÃ§Ã£o',
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
    evolucao: 'Melhora Significativa' | 'Melhora Leve' | 'EstÃ¡vel' | 'RegressÃ£o';
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
            existe: string; // 'Sim' | 'NÃ£o'
            local: string;
            intensidade: string; // 'Leve' | 'Moderada' | 'Intensa'
        };
        rotinaFuncional: string;
        nivelIndependencia: string;
        dificuldadesLocomocao: string;
        fadigaFrequente: string; // 'Sim' | 'NÃ£o'
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
    statusAtendimento: 'AvaliaÃ§Ã£o Funcional' | 'Acompanhamento' | 'Monitoramento' | 'Alta';
}

const initialPhysioData: PhysioPrivateData = {
    anamnese: {
        queixaPrincipal: '', dataInicioQueixa: '', historicoFuncional: '', historicoSaude: '', diagnosticoInformado: '', dispositivosApoio: '', cirurgiasPrevias: '',
        dor: { existe: 'NÃ£o', local: '', intensidade: 'Leve' },
        rotinaFuncional: '', nivelIndependencia: '', dificuldadesLocomocao: '', fadigaFrequente: 'NÃ£o'
    },
    avaliacao: {
        gmfcs: '',
        postura: { emPe: '', sentada: '', assimetrias: '' },
        mobilidade: { adm: 'Normal', global: '', coordMotorGrossa: '' },
        forcaMuscular: { adequadaIdade: 'Sim', deficitFuncional: '' },
        equilibrio: { estatico: '', dinamico: '' },
        marcha: { independente: 'Sim', comApoio: 'NÃ£o', cadeiraRodas: 'NÃ£o', observacoes: '' },
        funcionalidadeEscolar: { deslocamento: '', acessoAmbientes: '', permanenciaSala: '', participacaoAtividades: '' }
    },
    conclusao: { limitacoes: '', potencialidades: '', necessidadeApoioEscolar: '', recomendacoes: '' },
    sessions: [],
    statusAtendimento: 'AvaliaÃ§Ã£o Funcional'
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
            evolucao: h.content?.evolucao || 'EstÃ¡vel'
        }));

    return {
        anamnese: { ...initialPhysioData.anamnese, ...(raw.anamnese || {}) },
        avaliacao: { ...initialPhysioData.avaliacao, ...(raw.avaliacao || {}) },
        conclusao: { ...initialPhysioData.conclusao, ...(raw.conclusao || {}) },
        statusAtendimento: raw.statusAtendimento || 'AvaliaÃ§Ã£o Funcional',
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
                @page { size: A4; margin: 20mm 15mm; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.5; font-size: 11pt; }
                .header-container { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
                .header-logo { max-height: 80px; margin-bottom: 10px; }
                .header-titles h1 { font-size: 14pt; margin: 0; color: #334155; text-transform: uppercase; }
                .header-titles h2 { font-size: 12pt; margin: 2px 0; color: #475569; }
                .header-titles h3 { font-size: 10pt; margin: 2px 0; color: #64748b; }
                .contact-info { font-size: 8pt; color: #94a3b8; margin-top: 5px; }
                
                h1.doc-title { font-size: 18pt; color: #1e293b; text-align: center; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px; }
                h2.section-title { font-size: 13pt; color: #475569; margin-top: 25px; margin-bottom: 10px; background-color: #f8fafc; padding: 5px 10px; border-left: 4px solid #cbd5e1; }
                
                .student-info-box { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #fff; }
                .info-item { margin-bottom: 5px; }
                .label { font-weight: bold; color: #64748b; font-size: 9pt; text-transform: uppercase; display: block; }
                .value { color: #1e293b; font-size: 11pt; }
                
                .content-box { margin-bottom: 20px; }
                .data-row { margin-bottom: 10px; }
                .box { border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 10px; background: #fff; }
                
                .footer-container { margin-top: 50px; text-align: center; }
                .signature-container { display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 40px; }
                .signature-image { max-height: 80px; margin-bottom: -15px; z-index: 10; position: relative; }
                .signature-line { width: 300px; border-top: 1px solid #94a3b8; margin: 0 auto 10px; position: relative; }
                .professional-name { font-weight: bold; font-size: 11pt; color: #1e293b; }
                .professional-info { font-size: 9pt; color: #64748b; }
                
                .system-footer { margin-top: 30px; text-align: center; border-top: 1px dashed #e2e8f0; padding-top: 10px; }
                .footer-text { font-size: 8pt; color: #cbd5e1; }
                .footer-image { max-height: 40px; margin-top: 10px; opacity: 0.7; }
                
                .emission-tag { text-align: right; font-size: 8pt; color: #94a3b8; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="emission-tag">EmissÃ£o em: ${emissionDate}</div>
            
            <div class="header-container">
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

            <h1 class="doc-title">${title}</h1>

            <div class="student-info-box">
                <div class="info-item"><span class="label">Paciente</span><span class="value">${student.fullName}</span></div>
                <div class="info-item"><span class="label">Nascimento / Idade</span><span class="value">${new Date(student.birthDate).toLocaleDateString()} (${studentAge} anos)</span></div>
                <div class="info-item"><span class="label">ResponsÃ¡vel</span><span class="value">${student.guardians[0]?.name || 'NÃ£o informado'}</span></div>
                <div class="info-item"><span class="label">Escola</span><span class="value">${student.school.schoolName || 'NÃ£o vinculada'}</span></div>
            </div>

            <div class="content-box">
                ${contentHTML}
            </div>

            <div class="footer-container">
                <div class="signature-container">
                    ${professional.signatureUrl ? `<img src="${professional.signatureUrl}" class="signature-image" alt="Assinatura">` : ''}
                    <div class="signature-line"></div>
                </div>
                <div class="professional-name">${professional.name}</div>
                <div class="professional-info">${professional.jobTitle || professional.specialty}</div>
                ${professional.specialty && professional.jobTitle !== professional.specialty ? `<div class="professional-info">${professional.specialty}</div>` : ''}
            </div>

            <div class="system-footer">
                ${config.rodapeTexto ? `<div class="footer-text">${config.rodapeTexto}</div>` : ''}
                ${config.rodapeImg ? `<img src="${config.rodapeImg}" class="footer-image" alt="RodapÃ©">` : ''}
            </div>
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
    date: string;
    objetivo: string;
    estrategias: string;
    observacoes: string;
    evolucao: string;
    recomendacoes: string;
    status: 'Realizado' | 'Falta' | 'Justificada';
    humor: 'Feliz' | 'Triste' | 'Agitado' | 'Cansado' | 'Neutro';
}

interface PPPrivateData {
    diagnosis: PPDiagnosisForm;
    anamnesis: PPAnamnesisForm;
    sessions: PPSession[];
    ipoHistory: IPOAssessment[];
    statusAtendimento: 'Em AvaliaÃ§Ã£o' | 'Em Acompanhamento' | 'Alta' | 'Desligado';
}

const initialPPData: PPPrivateData = {
    diagnosis: { queixaPrincipal: '', queixaSecundaria: '', contextoDemanda: '', instrumentosUtilizados: '', hipoteseDiagnostica: '', parecerInicial: '', encaminhamentos: '' },
    anamnesis: { historicoGestacional: '', historicoEscolar: '', rotinaEstudos: '', sono: '', alimentacaoSaude: '', emocionalComportamental: '', psicossexual: 'NÃ£o se aplica', relacaoFamiliaEscola: '', observacoesGerais: '' },
    sessions: [],
    ipoHistory: [],
    statusAtendimento: 'Em AvaliaÃ§Ã£o'
};

const extractPPData = (student: Student): PPPrivateData => {
    const rawPP = student.clinical.pp_data || {};
    // Merge sessions from history (clinical_sessions table)
    const mappedSessions: PPSession[] = student.history.map(h => ({
        id: h.id,
        date: h.date,
        objetivo: h.content?.objetivo || h.notes,
        estrategias: h.content?.estrategias || '',
        observacoes: h.content?.observacoes || h.notes,
        evolucao: h.content?.evolucao || '',
        recomendacoes: h.content?.recomendacoes || '',
        status: (h.content?.status || 'Realizado') as any,
        humor: (h.content?.humor || 'Neutro') as any
    }));

    return {
        diagnosis: { ...initialPPData.diagnosis, ...(rawPP.diagnosis || {}) },
        anamnesis: { ...initialPPData.anamnesis, ...(rawPP.anamnesis || {}) },
        ipoHistory: rawPP.ipoHistory || [],
        statusAtendimento: rawPP.statusAtendimento || 'Em AvaliaÃ§Ã£o',
        sessions: mappedSessions,
    };
};

// --- COMPONENTES AUXILIARES DE UI ---

const FormSection = ({ title, icon: Icon, children, color = "text-slate-800", bgColor = "bg-white", isPrivate = false }: any) => (
    <div className={`${bgColor} rounded-xl shadow-sm border ${isPrivate ? 'border-purple-100' : 'border-slate-200'} overflow-hidden mb-6`}>
        <div className={`px-6 py-4 border-b ${isPrivate ? 'border-purple-100 bg-purple-50/50' : 'border-slate-100 bg-slate-50/50'} flex items-center gap-2`}>
            {Icon && <Icon size={18} className={isPrivate ? "text-purple-600" : "text-slate-500"} />}
            <h3 className={`font-bold text-sm uppercase tracking-wide ${color}`}>{title}</h3>
            {isPrivate && <Lock size={14} className="ml-auto text-purple-300" />}
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
);

// Atualizei para text-slate-700 para maior legibilidade
const StyledInput = ({ label, value, onChange, type = "text", placeholder = "", rows = 1 }: any) => (
    <div className="mb-4">
        <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 ml-1">{label}</label>
        {rows > 1 ? (
            <textarea
                className="w-full rounded-lg border-slate-300 bg-slate-50 p-3 text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none resize-y text-slate-800 placeholder:text-slate-400"
                rows={rows}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />
        ) : (
            <input
                type={type}
                className="w-full rounded-lg border-slate-300 bg-slate-50 p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none text-slate-800 placeholder:text-slate-400"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />
        )}
    </div>
);

interface BaseDashboardProps {
    title: string;
    specialty: Specialty;
    onNavigateNew: () => void;
    currentUser: User;
    preSelectedStudent?: Student | null;
}

// --- DASHBOARD ESPECÃFICO DE PSICOPEDAGOGIA (NOVO MODO COFRE) ---
const PsychopedagogySpecificDashboard: React.FC<BaseDashboardProps> = ({ title, onNavigateNew, currentUser, preSelectedStudent }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(preSelectedStudent || null);
    const [activeTab, setActiveTab] = useState<'diagnostic' | 'anamnesis' | 'sessions' | 'ipo' | 'reports'>('diagnostic');
    const [ppData, setPPData] = useState<PPPrivateData>(initialPPData);
    const [isEditingSession, setIsEditingSession] = useState(false);
    const [currentSession, setCurrentSession] = useState<Partial<PPSession>>({});
    const [loading, setLoading] = useState(false);

    // IPO States
    const [ipoEditMode, setIpoEditMode] = useState(false);
    const [currentIpo, setCurrentIpo] = useState<IPODomain[]>([
        { name: 'ComunicaÃ§Ã£o', realiza: 0, comAjuda: 0, naoRealiza: 0, totalItensAplicados: 0 },
        { name: 'SocializaÃ§Ã£o', realiza: 0, comAjuda: 0, naoRealiza: 0, totalItensAplicados: 0 },
        { name: 'CogniÃ§Ã£o', realiza: 0, comAjuda: 0, naoRealiza: 0, totalItensAplicados: 0 },
        { name: 'Motricidade', realiza: 0, comAjuda: 0, naoRealiza: 0, totalItensAplicados: 0 },
        { name: 'Autonomia', realiza: 0, comAjuda: 0, naoRealiza: 0, totalItensAplicados: 0 }
    ]);

    const isPP = currentUser.specialty === Specialty.PSYCHOPEDAGOGY || currentUser.role === 'ADMIN';

    // Carrega alunos via Supabase
    useEffect(() => {
        const loadStudents = async () => {
            setLoading(true);
            const data = await SupabaseService.getStudents();
            setStudents(data);
            setLoading(false);
        };
        loadStudents();
    }, []);

    // Sync com preSelectedStudent se mudar
    useEffect(() => {
        if (preSelectedStudent) {
            setSelectedStudent(preSelectedStudent);
        }
    }, [preSelectedStudent]);

    // Atualiza dados quando aluno muda (sem fetch extra, usa dados jÃ¡ carregados/mapeados)
    useEffect(() => {
        if (selectedStudent && isPP) {
            setPPData(extractPPData(selectedStudent));
        }
    }, [selectedStudent, isPP]);

    const handleStudentSelect = (id: string) => {
        const s = students.find(st => st.id === id);
        setSelectedStudent(s || null);
        // O useEffect acima cuidarÃ¡ de atualizar o ppData
        setIpoEditMode(false);
    };

    const handleSaveGeneral = async () => {
        if (!selectedStudent) return;

        try {
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

            await SupabaseService.saveStudent(updatedStudent);

            // Atualiza estado local de students para refletir a mudanÃ§a sem reload
            setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
            setSelectedStudent(updatedStudent);
            alert('Dados da ficha salvos com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar dados.');
        }
    };

    const updateDiagnosis = (field: keyof PPDiagnosisForm, value: string) => {
        setPPData(prev => ({ ...prev, diagnosis: { ...prev.diagnosis, [field]: value } }));
    };

    const updateAnamnesis = (field: keyof PPAnamnesisForm, value: string) => {
        setPPData(prev => ({ ...prev, anamnesis: { ...prev.anamnesis, [field]: value } }));
    };

    // --- SESSION LOGIC ---
    const handleSaveSession = async () => {
        if (!selectedStudent) return;

        const newSession: PPSession = {
            id: currentSession.id || crypto.randomUUID(),
            date: currentSession.date || new Date().toISOString().split('T')[0],
            objetivo: currentSession.objetivo || '',
            estrategias: currentSession.estrategias || '',
            observacoes: currentSession.observacoes || '',
            evolucao: currentSession.evolucao || '',
            recomendacoes: currentSession.recomendacoes || '',
            status: currentSession.status || 'Realizado',
            humor: currentSession.humor || 'Neutro'
        };

        // Salva no Supabase (convertendo para formato genÃ©rico Session)
        const genericSession: Session = {
            id: newSession.id,
            date: newSession.date,
            specialty: Specialty.PSYCHOPEDAGOGY,
            professionalName: currentUser.name,
            notes: newSession.objetivo, // Resumo simples
            content: newSession, // JSON completo especÃ­fico
            privateNotes: newSession.observacoes
        };

        try {
            // Salva sessÃ£o no banco
            await SupabaseService.saveSession(genericSession, selectedStudent.id, currentUser.id);

            // Atualiza estado local
            const updatedSessions = currentSession.id
                ? ppData.sessions.map(s => s.id === currentSession.id ? newSession : s)
                : [newSession, ...ppData.sessions];

            const newData = { ...ppData, sessions: updatedSessions };
            setPPData(newData);

            // TambÃ©m atualiza o objeto student localmente para manter coerÃªncia sem reload
            // (Isso Ã© opcional mas melhora a UX)

            setIsEditingSession(false);
            setCurrentSession({});
            alert('SessÃ£o salva!');
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar sessÃ£o.');
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

        let analysisText = `AVALIAÃ‡ÃƒO PORTAGE:\nO aluno obteve um desempenho global de ${percentage.toFixed(1)}%.\n`;

        domains.forEach(d => {
            const domPerc = d.maxScore > 0 ? (d.score / d.maxScore) * 100 : 0;
            let status = 'Adequado';
            if (domPerc < 50) status = 'Necessita IntervenÃ§Ã£o PrioritÃ¡ria';
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
        alert('AvaliaÃ§Ã£o IPO salva com sucesso!');
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

            const contentHTML = `
                <h2 class="section-title">I. ANAMNESE E QUEIXA</h2>
                <div class="box">
                    <div class="data-row"><span class="label">QUEIXA PRINCIPAL:</span> <div class="value">${ppData.diagnosis.queixaPrincipal || '-'}</div></div>
                    <div class="data-row"><span class="label">HISTÃ“RICO ESCOLAR:</span> <div class="value">${ppData.anamnesis.historicoEscolar || '-'}</div></div>
                    <div class="data-row"><span class="label">ROTINA DE ESTUDOS:</span> <div class="value">${ppData.anamnesis.rotinaEstudos || '-'}</div></div>
                </div>

                <h2 class="section-title">II. DIAGNÃ“STICO PSICOPEDAGÃ“GICO</h2>
                <div class="box">
                    <div class="data-row"><span class="label">INSTRUMENTOS UTILIZADOS:</span> <div class="value">${ppData.diagnosis.instrumentosUtilizados || '-'}</div></div>
                    <div class="data-row"><span class="label">HIPÃ“TESE DIAGNÃ“STICA:</span> <div class="value">${ppData.diagnosis.hipoteseDiagnostica || '-'}</div></div>
                    <div class="data-row"><span class="label">PARECER INICIAL:</span> <div class="value">${ppData.diagnosis.parecerInicial || '-'}</div></div>
                    <div class="data-row"><span class="label">ENCAMINHAMENTOS:</span> <div class="value">${ppData.diagnosis.encaminhamentos || '-'}</div></div>
                </div>

                ${latestIPO ? `
                <h2 class="section-title">III. ESCALA DE DESENVOLVIMENTO (EXTRATO IPO)</h2>
                <div class="box" style="background: #fdf2f8; border: 1px solid #fbcfe8;">
                    <div class="data-row"><span class="label">DATA DA AVALIAÃ‡ÃƒO:</span> <span class="value">${new Date(latestIPO.date).toLocaleDateString()}</span></div>
                    <div class="data-row"><span class="label">DESEMPENHO GLOBAL:</span> <span class="value" style="color: #db2777; font-weight: bold;">${latestIPO.percentage.toFixed(1)}%</span></div>
                    <div class="data-row"><span class="label">ANÃLISE:</span> <div class="value" style="white-space: pre-wrap;">${latestIPO.autoReport}</div></div>
                </div>
                ` : ''}

                ${session ? `
                <h2 class="section-title">IV. REGISTRO DE ATENDIMENTO / EVOLUÃ‡ÃƒO</h2>
                <div class="box" style="border-left: 4px solid #db2777; background: #fff1f2;">
                    <div class="data-row">
                        <span class="label">DATA:</span> <span class="value">${new Date(session.date).toLocaleDateString()}</span>
                        <span class="label" style="display:inline; margin-left: 20px;">HUMOR:</span> <span class="value">${session.humor}</span>
                    </div>
                    <div class="data-row"><span class="label">OBJETIVO:</span> <span class="value">${session.objetivo}</span></div>
                    <div class="data-row"><span class="label">ESTRATÃ‰GIAS:</span> <div class="value">${session.estrategias}</div></div>
                    <div class="data-row"><span class="label">EVOLUÃ‡ÃƒO:</span> <span class="value">${session.evolucao}</span></div>
                    <div class="data-row"><span class="label">OBSERVAÃ‡Ã•ES:</span> <div class="value" style="white-space: pre-wrap;">${session.observacoes || '-'}</div></div>
                </div>
                ` : ''}
            `;

            const html = generateClinicalPrintHTML(
                selectedStudent,
                config,
                'RelatÃ³rio PsicopedagÃ³gico',
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
            alert('Erro ao gerar impressÃ£o.');
        }
    };

    if (!isPP) return <div className="p-8 text-center text-red-600 font-bold">Acesso restrito Ã  Psicopedagogia.</div>;

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn pb-12">

            {/* Header */}
            <div className="bg-gradient-to-r from-pink-600 to-rose-700 rounded-2xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Brain size={200} /></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-extrabold flex items-center gap-3">
                            <Brain size={32} /> Psicopedagogia ClÃ­nica
                        </h2>
                        <p className="text-pink-100 mt-2">AvaliaÃ§Ã£o, DiagnÃ³stico e IntervenÃ§Ã£o de Aprendizagem</p>
                    </div>
                    {selectedStudent && (
                        <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/20">
                            <p className="text-xs uppercase font-bold text-pink-100">Paciente</p>
                            <p className="text-xl font-bold">{selectedStudent.fullName}</p>
                        </div>
                    )}
                </div>
            </div>

            {!selectedStudent ? (
                <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-slate-200">
                    <UserIcon size={64} className="mx-auto text-pink-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 mb-4">Selecione um Paciente</h3>
                    <div className="max-w-md mx-auto relative">
                        <select className="w-full p-4 pl-12 rounded-xl border border-slate-300 shadow-sm bg-white" onChange={(e) => handleStudentSelect(e.target.value)} value="">
                            <option value="">Buscar aluno...</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                        </select>
                        <Search className="absolute left-4 top-4 text-slate-400" size={20} />
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col md:flex-row">

                    {/* Sidebar Tabs */}
                    <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
                        {[
                            { id: 'diagnostic', label: 'DiagnÃ³stico', icon: FileText },
                            { id: 'anamnesis', label: 'Anamnese', icon: Users },
                            { id: 'sessions', label: 'Atendimentos', icon: History },
                            { id: 'ipo', label: 'IPO - Portage', icon: BarChart2 },
                            { id: 'reports', label: 'RelatÃ³rios', icon: Printer },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`p-4 flex items-center gap-3 text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white text-pink-600 border-l-4 border-pink-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                            >
                                <tab.icon size={18} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-8 bg-slate-50/50">

                        {/* TAB 1: DIAGNÃ“STICO */}
                        {activeTab === 'diagnostic' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FileText className="text-pink-600" /> Queixa e DiagnÃ³stico</h3>
                                    <button onClick={handleSaveGeneral} className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-pink-700"><Save size={18} /> Salvar</button>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-pink-100 space-y-4">
                                    <StyledInput label="Queixa Principal" rows={2} value={ppData.diagnosis.queixaPrincipal} onChange={(e: any) => updateDiagnosis('queixaPrincipal', e.target.value)} />
                                    <StyledInput label="Queixa SecundÃ¡ria" value={ppData.diagnosis.queixaSecundaria} onChange={(e: any) => updateDiagnosis('queixaSecundaria', e.target.value)} />
                                    <StyledInput label="Contexto da Demanda" rows={3} value={ppData.diagnosis.contextoDemanda} onChange={(e: any) => updateDiagnosis('contextoDemanda', e.target.value)} />
                                    <StyledInput label="Instrumentos Utilizados" value={ppData.diagnosis.instrumentosUtilizados} onChange={(e: any) => updateDiagnosis('instrumentosUtilizados', e.target.value)} />
                                    <div className="p-4 bg-pink-50 rounded-lg border border-pink-100">
                                        <StyledInput label="HipÃ³tese DiagnÃ³stica PsicopedagÃ³gica" rows={3} value={ppData.diagnosis.hipoteseDiagnostica} onChange={(e: any) => updateDiagnosis('hipoteseDiagnostica', e.target.value)} />
                                        <StyledInput label="Parecer Inicial" rows={3} value={ppData.diagnosis.parecerInicial} onChange={(e: any) => updateDiagnosis('parecerInicial', e.target.value)} />
                                    </div>
                                    <StyledInput label="Encaminhamentos Iniciais" value={ppData.diagnosis.encaminhamentos} onChange={(e: any) => updateDiagnosis('encaminhamentos', e.target.value)} />
                                </div>
                            </div>
                        )}

                        {/* TAB 2: ANAMNESE */}
                        {activeTab === 'anamnesis' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-pink-600" /> Anamnese PsicopedagÃ³gica</h3>
                                    <button onClick={handleSaveGeneral} className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-pink-700"><Save size={18} /> Salvar</button>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <FormSection title="HistÃ³rico e Desenvolvimento" icon={Baby} color="text-pink-700">
                                        <StyledInput label="HistÃ³rico Gestacional e Marcos do Desenvolvimento" rows={4} value={ppData.anamnesis.historicoGestacional} onChange={(e: any) => updateAnamnesis('historicoGestacional', e.target.value)} />
                                    </FormSection>
                                    <FormSection title="Vida Escolar e Rotina" icon={School} color="text-pink-700">
                                        <StyledInput label="HistÃ³rico Escolar (ReprovaÃ§Ãµes, MudanÃ§as)" rows={3} value={ppData.anamnesis.historicoEscolar} onChange={(e: any) => updateAnamnesis('historicoEscolar', e.target.value)} />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <StyledInput label="Rotina e HÃ¡bitos de Estudo" rows={3} value={ppData.anamnesis.rotinaEstudos} onChange={(e: any) => updateAnamnesis('rotinaEstudos', e.target.value)} />
                                            <StyledInput label="Sono (Unificado)" rows={3} value={ppData.anamnesis.sono} onChange={(e: any) => updateAnamnesis('sono', e.target.value)} placeholder="Qualidade, HorÃ¡rios, AgitaÃ§Ã£o..." />
                                        </div>
                                    </FormSection>
                                    <FormSection title="SaÃºde e Comportamento" icon={Activity} color="text-pink-700">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <StyledInput label="AlimentaÃ§Ã£o e SaÃºde Geral" rows={3} value={ppData.anamnesis.alimentacaoSaude} onChange={(e: any) => updateAnamnesis('alimentacaoSaude', e.target.value)} />
                                            <StyledInput label="Aspectos Emocionais e Comportamentais" rows={3} value={ppData.anamnesis.emocionalComportamental} onChange={(e: any) => updateAnamnesis('emocionalComportamental', e.target.value)} />
                                        </div>
                                        <div className="mt-4">
                                            <StyledInput label="Desenvolvimento Psicossexual (ObrigatÃ³rio)" value={ppData.anamnesis.psicossexual} onChange={(e: any) => updateAnamnesis('psicossexual', e.target.value)} placeholder="Descreva ou marque 'NÃ£o se aplica'" />
                                        </div>
                                    </FormSection>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: SESSÃ•ES */}
                        {activeTab === 'sessions' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><History className="text-pink-600" /> Registro de Atendimentos</h3>
                                    {!isEditingSession && (
                                        <button onClick={() => { setIsEditingSession(true); setCurrentSession({}); }} className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-pink-700"><Plus size={18} /> Nova SessÃ£o</button>
                                    )}
                                </div>

                                {isEditingSession ? (
                                    <div className="bg-white p-6 rounded-xl shadow-lg border border-pink-200 animate-slideUp">
                                        <h4 className="font-bold text-pink-700 mb-4 border-b border-pink-100 pb-2">Detalhes da SessÃ£o</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            <StyledInput label="Data" type="date" value={currentSession.date} onChange={(e: any) => setCurrentSession({ ...currentSession, date: e.target.value })} />
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 ml-1">Humor do Aluno</label>
                                                <select className="w-full rounded-lg border-slate-300 bg-slate-50 p-2.5 text-sm" value={currentSession.humor} onChange={(e) => setCurrentSession({ ...currentSession, humor: e.target.value as any })}>
                                                    <option>Neutro</option><option>Feliz</option><option>Triste</option><option>Agitado</option><option>Cansado</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 ml-1">Status</label>
                                                <select className="w-full rounded-lg border-slate-300 bg-slate-50 p-2.5 text-sm" value={currentSession.status} onChange={(e) => setCurrentSession({ ...currentSession, status: e.target.value as any })}>
                                                    <option>Realizado</option><option>Falta</option><option>Justificada</option>
                                                </select>
                                            </div>
                                        </div>
                                        <StyledInput label="Objetivo da SessÃ£o" value={currentSession.objetivo} onChange={(e: any) => setCurrentSession({ ...currentSession, objetivo: e.target.value })} />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                            <StyledInput label="EstratÃ©gias / Instrumentos" rows={3} value={currentSession.estrategias} onChange={(e: any) => setCurrentSession({ ...currentSession, estrategias: e.target.value })} />
                                            <StyledInput label="ObservaÃ§Ãµes ClÃ­nicas" rows={3} value={currentSession.observacoes} onChange={(e: any) => setCurrentSession({ ...currentSession, observacoes: e.target.value })} />
                                        </div>
                                        <StyledInput label="EvoluÃ§Ã£o Percebida" rows={2} value={currentSession.evolucao} onChange={(e: any) => setCurrentSession({ ...currentSession, evolucao: e.target.value })} />
                                        <div className="flex justify-end gap-3 mt-6">
                                            <button onClick={() => setIsEditingSession(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                            <button onClick={handleSaveSession} className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-bold">Salvar SessÃ£o</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-pink-50 p-4 rounded-xl border border-pink-100 mb-6 text-sm">
                                            <span className="font-bold text-pink-800">Resumo do Caso:</span> {ppData.diagnosis.hipoteseDiagnostica || 'Sem hipÃ³tese definida.'}
                                        </div>
                                        {ppData.sessions.length === 0 ? (
                                            <p className="text-center text-slate-400 py-10">Nenhum atendimento registrado.</p>
                                        ) : (
                                            ppData.sessions.map((sess, idx) => (
                                                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-pink-300 transition-all shadow-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-700">{new Date(sess.date).toLocaleDateString()}</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${sess.status === 'Realizado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{sess.status}</span>
                                                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Humor: {sess.humor}</span>
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <button onClick={() => handlePrintPP(sess)} className="text-pink-600/50 hover:text-pink-600 transition-all" title="Imprimir registro"><Printer size={16} /></button>
                                                            <button onClick={() => { setCurrentSession(sess); setIsEditingSession(true); }} className="text-pink-600 hover:text-pink-800 transition-all"><Edit2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mb-1"><strong>Objetivo:</strong> {sess.objetivo}</p>
                                                    <p className="text-sm text-slate-500 line-clamp-2"><strong>Obs:</strong> {sess.observacoes}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 4: IPO - PORTAGE */}
                        {activeTab === 'ipo' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><BarChart2 className="text-pink-600" /> IPO - InventÃ¡rio Portage Operacionalizado</h3>
                                        <p className="text-xs text-slate-500">AvaliaÃ§Ã£o do desenvolvimento motor, cognitivo, linguagem, socializaÃ§Ã£o e autocuidados.</p>
                                    </div>
                                    {!ipoEditMode && (
                                        <button onClick={() => setIpoEditMode(true)} className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-pink-700"><Plus size={18} /> Nova AvaliaÃ§Ã£o</button>
                                    )}
                                </div>

                                {ipoEditMode ? (
                                    <div className="bg-white p-6 rounded-xl shadow-lg border border-pink-200 animate-slideUp">
                                        <h4 className="font-bold text-pink-700 mb-6 border-b border-pink-100 pb-2">Preenchimento dos DomÃ­nios (Contagem de Pontos)</h4>
                                        <div className="space-y-6">
                                            {currentIpo.map((domain, idx) => (
                                                <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-slate-50 p-4 rounded-lg">
                                                    <div className="md:col-span-1 font-bold text-slate-700">{domain.name}</div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-green-700 mb-1">Realiza (2 pts)</label>
                                                        <input type="number" className="w-full rounded border-slate-300 p-2" value={domain.realiza} onChange={(e) => updateIpoDomain(idx, 'realiza', parseInt(e.target.value) || 0)} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-orange-600 mb-1">Com Ajuda (1 pt)</label>
                                                        <input type="number" className="w-full rounded border-slate-300 p-2" value={domain.comAjuda} onChange={(e) => updateIpoDomain(idx, 'comAjuda', parseInt(e.target.value) || 0)} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-red-600 mb-1">NÃ£o Realiza (0 pts)</label>
                                                        <input type="number" className="w-full rounded border-slate-300 p-2" value={domain.naoRealiza} onChange={(e) => updateIpoDomain(idx, 'naoRealiza', parseInt(e.target.value) || 0)} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Total Itens</label>
                                                        <input type="number" className="w-full rounded border-slate-300 p-2 bg-white" value={domain.totalItensAplicados} onChange={(e) => updateIpoDomain(idx, 'totalItensAplicados', parseInt(e.target.value) || 0)} placeholder="Total" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end gap-3 mt-6">
                                            <button onClick={() => setIpoEditMode(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                            <button onClick={handleSaveIPO} className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-bold">Gerar Laudo e Salvar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {ppData.ipoHistory.length === 0 ? (
                                            <p className="text-center text-slate-400 py-10">Nenhuma avaliaÃ§Ã£o IPO registrada.</p>
                                        ) : (
                                            <>
                                                {/* Latest Report */}
                                                <div className="bg-white p-6 rounded-xl border border-pink-100 shadow-sm">
                                                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity size={18} className="text-pink-500" /> Resultado Mais Recente ({new Date(ppData.ipoHistory[0].date).toLocaleDateString()})</h4>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        <div className="h-[300px] w-full">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={ppData.ipoHistory[0].domains.map(d => ({
                                                                    subject: d.name,
                                                                    A: d.totalItensAplicados > 0 ? (((d.realiza * 2 + d.comAjuda) / (d.totalItensAplicados * 2)) * 100) : 0,
                                                                    fullMark: 100
                                                                }))}>
                                                                    <PolarGrid />
                                                                    <PolarAngleAxis dataKey="subject" />
                                                                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                                                    <Radar name="Desempenho %" dataKey="A" stroke="#db2777" fill="#db2777" fillOpacity={0.6} />
                                                                    <Tooltip />
                                                                </RadarChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                        <div className="flex flex-col justify-center">
                                                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                                                                <p className="text-sm whitespace-pre-wrap text-slate-700">{ppData.ipoHistory[0].autoReport}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                                                <span>Score Global: {ppData.ipoHistory[0].totalScore} / {ppData.ipoHistory[0].totalPossible}</span>
                                                                <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">{ppData.ipoHistory[0].percentage.toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* History Table */}
                                                <div>
                                                    <h4 className="font-bold text-slate-700 mb-2">HistÃ³rico de AvaliaÃ§Ãµes</h4>
                                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                                        <table className="min-w-full divide-y divide-slate-200">
                                                            <thead className="bg-slate-50">
                                                                <tr>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Data</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">PontuaÃ§Ã£o</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Percentual</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Profissional</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-200">
                                                                {ppData.ipoHistory.map((item, idx) => (
                                                                    <tr key={item.id} className="hover:bg-slate-50">
                                                                        <td className="px-4 py-2 text-sm text-slate-700">{new Date(item.date).toLocaleDateString()}</td>
                                                                        <td className="px-4 py-2 text-sm text-slate-700">{item.totalScore}</td>
                                                                        <td className="px-4 py-2 text-sm font-bold text-pink-600">{item.percentage.toFixed(1)}%</td>
                                                                        <td className="px-4 py-2 text-sm text-slate-500">{item.professionalName}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 5: RELATÃ“RIOS (Central Unificada) */}
                        {activeTab === 'reports' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Printer className="text-pink-600" /> Central de RelatÃ³rios</h3>
                                </div>
                                <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-slate-200">
                                    <FileText size={48} className="mx-auto text-pink-200 mb-4" />
                                    <h4 className="font-bold text-slate-700 mb-2">RelatÃ³rio SintÃ©tico PsicopedagÃ³gico</h4>
                                    <p className="text-slate-500 mb-8 max-w-md mx-auto">Gere um documento oficial contendo dados de anamnese, diagnÃ³stico e o extrato da Ãºltima avaliaÃ§Ã£o IPO realizada.</p>
                                    <button
                                        onClick={() => handlePrintPP()}
                                        className="px-8 py-3 bg-pink-600 text-white rounded-xl font-bold shadow-lg hover:bg-pink-700 transition-all flex items-center gap-2 mx-auto"
                                    >
                                        <Printer size={20} /> Imprimir RelatÃ³rio Completo
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

// --- DASHBOARD ESPECIALIZADO DE FONOAUDIOLOGIA ---
const SpeechTherapySpecificDashboard: React.FC<BaseDashboardProps> = ({ title, onNavigateNew, currentUser }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [speechData, setSpeechData] = useState<SpeechPrivateData>(initialSpeechData);
    const [activeTab, setActiveTab] = useState<'anamnese' | 'avaliacao' | 'sessions' | 'history' | 'reports'>('anamnese');
    const [isEditingSession, setIsEditingSession] = useState(false);
    const [currentSession, setCurrentSession] = useState<Partial<SpeechSession>>({});
    const [loading, setLoading] = useState(false);

    const isSpeech = currentUser.specialty === Specialty.SPEECH_THERAPY || currentUser.role === 'ADMIN';

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await SupabaseService.getStudents();
            setStudents(data);
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        if (selectedStudent && isSpeech) {
            setSpeechData(extractSpeechData(selectedStudent));
        }
    }, [selectedStudent, isSpeech]);

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
            alert('Dados salvos com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar dados.');
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
            evolucao: currentSession.evolucao || 'EstÃ¡vel',
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
            alert('SessÃ£o salva!');
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar sessÃ£o.');
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
                    <div class="data-row"><span class="label">HISTÃ“RICO DE LINGUAGEM:</span> <div class="value">${speechData.anamnese.historicoDesenvolvimentoLinguagem || '-'}</div></div>
                    <div class="data-row"><span class="label">ALIMENTAÃ‡ÃƒO / MASTIGAÃ‡ÃƒO:</span> <div class="value">${speechData.anamnese.alimentacaoMastigacao || '-'}</div></div>
                    <div class="data-row"><span class="label">SONO / RESPIRAÃ‡ÃƒO:</span> <div class="value">${speechData.anamnese.sonoRespiracao || '-'}</div></div>
                </div>

                <h2 class="section-title">II. AVALIAÃ‡ÃƒO CLÃNICA</h2>
                <div class="box">
                    <div class="data-row"><span class="label">MOTRICIDADE OROFACIAL:</span> <div class="value">${speechData.avaliacao.motricidadeOrofacial || '-'}</div></div>
                    <div class="data-row"><span class="label">LINGUAGEM ORAL:</span> <div class="value">${speechData.avaliacao.linguagemOral || '-'}</div></div>
                    <div class="data-row"><span class="label">LINGUAGEM ESCRITA:</span> <div class="value">${speechData.avaliacao.linguagemEscrita || '-'}</div></div>
                    <div class="data-row"><span class="label">VOZ:</span> <div class="value">${speechData.avaliacao.voz || '-'}</div></div>
                    <div class="data-row"><span class="label">AUDIÃ‡ÃƒO:</span> <div class="value">${speechData.avaliacao.audicao || '-'}</div></div>
                </div>

                ${session ? `
                <h2 class="section-title">III. REGISTRO DE ATENDIMENTO / EVOLUÃ‡ÃƒO</h2>
                <div class="box" style="border-left: 4px solid #0891b2; background: #f0fdfa;">
                    <div class="data-row">
                        <span class="label">DATA:</span> <span class="value">${new Date(session.date).toLocaleDateString()}</span>
                        <span class="label" style="display:inline; margin-left: 20px;">PARTICIPAÃ‡ÃƒO:</span> <span class="value">${session.participacao}</span>
                    </div>
                    <div class="data-row"><span class="label">OBJETIVO:</span> <span class="value">${session.objetivo}</span></div>
                    <div class="data-row"><span class="label">FONEMAS TRABALHADOS:</span> <span class="value">${session.fonemasTrabalhados || '-'}</span></div>
                    <div class="data-row"><span class="label">EVOLUÃ‡ÃƒO:</span> <span class="value">${session.evolucao}</span></div>
                    <div class="data-row"><span class="label">OBSERVAÃ‡Ã•ES:</span> <div class="value" style="white-space: pre-wrap;">${session.observacoes || '-'}</div></div>
                </div>
                ` : ''}
            `;

            const html = generateClinicalPrintHTML(
                selectedStudent,
                config,
                'RelatÃ³rio FonoaudiolÃ³gico',
                contentHTML,
                { name: currentUser.name, jobTitle: currentUser.jobTitle || 'FonoaudiÃ³logo(a)', specialty: currentUser.specialty, signatureUrl: currentUser.signatureUrl }
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
            alert('Erro ao gerar impressÃ£o.');
        }
    };

    if (!isSpeech) return <div className="p-8 text-center text-red-600 font-bold">Acesso restrito Ã  Fonoaudiologia.</div>;

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn pb-12">
            <div className="bg-gradient-to-r from-cyan-600 to-teal-700 rounded-2xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Activity size={200} /></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-extrabold flex items-center gap-3">
                            <Activity size={32} /> Fonoaudiologia ClÃ­nica
                        </h2>
                        <p className="text-cyan-100 mt-2">Linguagem, Motricidade Orofacial e AudiÃ§Ã£o</p>
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
                <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-slate-200">
                    <UserIcon size={64} className="mx-auto text-cyan-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 mb-4">Selecione um Paciente</h3>
                    <div className="max-w-md mx-auto relative">
                        <select className="w-full p-4 pl-12 rounded-xl border border-slate-300 bg-white shadow-sm" onChange={(e) => {
                            const s = students.find(st => st.id === e.target.value);
                            setSelectedStudent(s || null);
                        }} value="">
                            <option value="">Buscar aluno...</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                        </select>
                        <Search className="absolute left-4 top-4 text-slate-400" size={20} />
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                    <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
                        {[
                            { id: 'anamnese', label: 'Anamnese', icon: Users },
                            { id: 'avaliacao', label: 'AvaliaÃ§Ã£o ClÃ­nica', icon: Search },
                            { id: 'sessions', label: 'Atendimentos', icon: History },
                            { id: 'history', label: 'Ficha HistÃ³rica', icon: FileText },
                            { id: 'reports', label: 'RelatÃ³rios', icon: Printer },
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

                    <div className="flex-1 p-8 bg-slate-50/50">
                        {activeTab === 'anamnese' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-cyan-600" /> Anamnese FonoaudiolÃ³gica</h3>
                                    <button onClick={handleSaveGeneral} className="bg-cyan-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-cyan-700 transition-all shadow-md"><Save size={18} /> Salvar</button>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <StyledInput label="Queixa Principal" rows={2} value={speechData.anamnese.queixaPrincipal} onChange={(e: any) => setSpeechData({ ...speechData, anamnese: { ...speechData.anamnese, queixaPrincipal: e.target.value } })} />
                                    <StyledInput label="Desenvolvimento da Linguagem" rows={3} value={speechData.anamnese.historicoDesenvolvimentoLinguagem} onChange={(e: any) => setSpeechData({ ...speechData, anamnese: { ...speechData.anamnese, historicoDesenvolvimentoLinguagem: e.target.value } })} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <StyledInput label="AlimentaÃ§Ã£o / MastigaÃ§Ã£o" rows={2} value={speechData.anamnese.alimentacaoMastigacao} onChange={(e: any) => setSpeechData({ ...speechData, anamnese: { ...speechData.anamnese, alimentacaoMastigacao: e.target.value } })} />
                                        <StyledInput label="Sono / RespiraÃ§Ã£o" rows={2} value={speechData.anamnese.sonoRespiracao} onChange={(e: any) => setSpeechData({ ...speechData, anamnese: { ...speechData.anamnese, sonoRespiracao: e.target.value } })} />
                                    </div>
                                    <StyledInput label="Comportamento Auditivo" value={speechData.anamnese.comportamentoAuditivo} onChange={(e: any) => setSpeechData({ ...speechData, anamnese: { ...speechData.anamnese, comportamentoAuditivo: e.target.value } })} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'avaliacao' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Search className="text-cyan-600" /> AvaliaÃ§Ã£o ClÃ­nica</h3>
                                    <button onClick={handleSaveGeneral} className="bg-cyan-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-cyan-700 transition-all shadow-md"><Save size={18} /> Salvar</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormSection title="Sistema EstomatognÃ¡tico" icon={Activity} color="text-cyan-700">
                                        <StyledInput label="Motricidade Orofacial" rows={4} value={speechData.avaliacao.motricidadeOrofacial} onChange={(e: any) => setSpeechData({ ...speechData, avaliacao: { ...speechData.avaliacao, motricidadeOrofacial: e.target.value } })} />
                                    </FormSection>
                                    <FormSection title="Linguagem e ComunicaÃ§Ã£o" icon={Brain} color="text-cyan-700">
                                        <StyledInput label="Linguagem Oral" rows={2} value={speechData.avaliacao.linguagemOral} onChange={(e: any) => setSpeechData({ ...speechData, avaliacao: { ...speechData.avaliacao, linguagemOral: e.target.value } })} />
                                        <StyledInput label="Linguagem Escrita" rows={2} value={speechData.avaliacao.linguagemEscrita} onChange={(e: any) => setSpeechData({ ...speechData, avaliacao: { ...speechData.avaliacao, linguagemEscrita: e.target.value } })} />
                                    </FormSection>
                                    <FormSection title="Voz e AudiÃ§Ã£o" icon={Zap} color="text-cyan-700">
                                        <StyledInput label="Aspectos Vocais" rows={2} value={speechData.avaliacao.voz} onChange={(e: any) => setSpeechData({ ...speechData, avaliacao: { ...speechData.avaliacao, voz: e.target.value } })} />
                                        <StyledInput label="Aspectos Auditivos" rows={2} value={speechData.avaliacao.audicao} onChange={(e: any) => setSpeechData({ ...speechData, avaliacao: { ...speechData.avaliacao, audicao: e.target.value } })} />
                                    </FormSection>
                                </div>
                            </div>
                        )}

                        {activeTab === 'sessions' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center bg-white/50 p-4 rounded-xl backdrop-blur-sm border border-white/40 shadow-sm">
                                    <h3 className="font-bold text-cyan-900 text-xl">SessÃµes Realizadas</h3>
                                    {!isEditingSession && (
                                        <button onClick={() => { setIsEditingSession(true); setCurrentSession({}); }} className="bg-cyan-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-cyan-700 transition-all shadow-md"><Plus size={18} /> Nova SessÃ£o</button>
                                    )}
                                </div>

                                {isEditingSession ? (
                                    <div className="bg-white p-6 rounded-xl shadow-lg border border-cyan-200 animate-slideUp">
                                        <h4 className="font-bold text-cyan-700 mb-4 border-b border-cyan-100 pb-2">Registro de Fonoaudiologia</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <StyledInput label="Data" type="date" value={currentSession.date} onChange={(e: any) => setCurrentSession({ ...currentSession, date: e.target.value })} />
                                            <StyledInput label="Objetivo" value={currentSession.objetivo} onChange={(e: any) => setCurrentSession({ ...currentSession, objetivo: e.target.value })} />
                                        </div>
                                        <StyledInput label="Fonemas Trabalhados" value={currentSession.fonemasTrabalhados} onChange={(e: any) => setCurrentSession({ ...currentSession, fonemasTrabalhados: e.target.value })} placeholder="Ex: /r/ vibrante, grupos consonantais..." />
                                        <StyledInput label="Atividades / TÃ©cnicas" rows={2} value={currentSession.atividades} onChange={(e: any) => setCurrentSession({ ...currentSession, atividades: e.target.value })} />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 ml-1">EvoluÃ§Ã£o</label>
                                                <select className="w-full rounded-lg border-slate-300 bg-slate-50 p-2.5 text-sm" value={currentSession.evolucao} onChange={(e) => setCurrentSession({ ...currentSession, evolucao: e.target.value as any })}>
                                                    <option>Melhora Significativa</option><option>Melhora Leve</option><option>EstÃ¡vel</option><option>RegressÃ£o</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 ml-1">ParticipaÃ§Ã£o</label>
                                                <select className="w-full rounded-lg border-slate-300 bg-slate-50 p-2.5 text-sm" value={currentSession.participacao} onChange={(e) => setCurrentSession({ ...currentSession, participacao: e.target.value as any })}>
                                                    <option>Ativo</option><option>Passivo</option><option>Recusou</option>
                                                </select>
                                            </div>
                                        </div>
                                        <StyledInput label="ObservaÃ§Ãµes de Resposta" rows={3} value={currentSession.observacoes} onChange={(e: any) => setCurrentSession({ ...currentSession, observacoes: e.target.value })} />
                                        <div className="flex justify-end gap-3 mt-6">
                                            <button onClick={() => setIsEditingSession(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all">Cancelar</button>
                                            <button onClick={handleSaveSession} className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-bold shadow-md transition-all">Salvar SessÃ£o</button>
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
                                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">ParticipaÃ§Ã£o: {sess.participacao}</span>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <button onClick={() => handlePrintSpeech(sess)} className="text-cyan-600/50 hover:text-cyan-600 transition-all" title="Imprimir registro de sessÃ£o"><Printer size={16} /></button>
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
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FileText className="text-cyan-600" /> Resumo HistÃ³rico</h3>
                                <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400">
                                    MÃ³dulo de geraÃ§Ã£o de histÃ³rico cronolÃ³gico automÃ¡tico em desenvolvimento.
                                </div>
                            </div>
                        )}

                        {activeTab === 'reports' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Printer className="text-cyan-600" /> Central de RelatÃ³rios</h3>
                                </div>
                                <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-slate-200">
                                    <FileText size={48} className="mx-auto text-cyan-200 mb-4" />
                                    <h4 className="font-bold text-slate-700 mb-2">Gerar Documento Oficial</h4>
                                    <p className="text-slate-500 mb-8 max-w-md mx-auto">Clique no botÃ£o abaixo para gerar uma versÃ£o para impressÃ£o com todos os dados clÃ­nicos registrados (Anamnese e AvaliaÃ§Ã£o).</p>
                                    <button
                                        onClick={() => handlePrintSpeech()}
                                        className="px-8 py-3 bg-cyan-600 text-white rounded-xl font-bold shadow-lg hover:bg-cyan-700 transition-all flex items-center gap-2 mx-auto"
                                    >
                                        <Printer size={20} /> Imprimir RelatÃ³rio Completo
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

// --- DASHBOARD ESPECIALIZADO DE TERAPIA OCUPACIONAL ---
const OccupationalTherapySpecificDashboard: React.FC<BaseDashboardProps> = ({ title, onNavigateNew, currentUser, preSelectedStudent }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(preSelectedStudent || null);
    const [activeTab, setActiveTab] = useState<'anamnese' | 'avaliacao' | 'sessions' | 'history'>('anamnese');
    const [otData, setOtData] = useState<OTPrivateData>(initialOTData);
    const [isEditingSession, setIsEditingSession] = useState(false);
    const [currentSession, setCurrentSession] = useState<Partial<OTSession>>({});
    const [loading, setLoading] = useState(false);

    const isOT = currentUser.specialty === Specialty.OCCUPATIONAL_THERAPY || currentUser.role === 'ADMIN';

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await SupabaseService.getStudents();
            setStudents(data);
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        if (preSelectedStudent) setSelectedStudent(preSelectedStudent);
    }, [preSelectedStudent]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await SupabaseService.getStudents();
            setStudents(data);
            setLoading(false);
        };
        load();
    }, []);

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
            alert('Dados salvos com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar dados.');
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
            evolucao: currentSession.evolucao || 'EstÃ¡vel',
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
            alert('SessÃ£o salva!');
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar sessÃ£o.');
        }
    };

    const handlePrintOT = async (targetSession?: OTSession) => {
        if (!selectedStudent || !isOT) return;

        try {
            const config = await SupabaseService.getPapelTimbradoConfig();
            const session = targetSession || (otData.sessions.length > 0 ? otData.sessions[0] : null);

            const contentHTML = `
                <h2 class="section-title">I. ANAMNESE E HISTÃ“RICO</h2>
                <div class="box">
                    <div class="data-row"><span class="label">HISTÃ“RICO OCUPACIONAL:</span> <div class="value">${otData.anamnese.historicoOcupacional || '-'}</div></div>
                    <div class="data-row"><span class="label">ROTINA E AVDs:</span> <div class="value">${otData.anamnese.rotinaAVDs || '-'}</div></div>
                    <div class="data-row"><span class="label">PERFIL SENSORIAL (PRÃ‰VIA):</span> <div class="value">${otData.anamnese.perfilSensorialPrevia || '-'}</div></div>
                    <div class="data-row"><span class="label">BRINCAR E DESENVOLVIMENTO:</span> <div class="value">${otData.anamnese.brincarDesenvolvimento || '-'}</div></div>
                    <div class="data-row"><span class="label">COMPORTAMENTO SOCIAL:</span> <div class="value">${otData.anamnese.comportamentoSocial || '-'}</div></div>
                </div>

                <h2 class="section-title">II. AVALIAÃ‡ÃƒO TERAPÃŠUTICA OCUPACIONAL</h2>
                <div class="box">
                    <div class="data-row"><span class="label">MOTRICIDADE FINA:</span> <div class="value">${otData.avaliacao.motricidadeFina || '-'}</div></div>
                    <div class="data-row"><span class="label">MOTRICIDADE GROSSA:</span> <div class="value">${otData.avaliacao.motricidadeGrossa || '-'}</div></div>
                    <div class="data-row"><span class="label">PROCESSAMENTO SENSORIAL:</span> <div class="value">${otData.avaliacao.processamentoSensorial || '-'}</div></div>
                    <div class="data-row"><span class="label">INTEGRAÃ‡ÃƒO VISOMOTORA:</span> <div class="value">${otData.avaliacao.integracaoVisomotora || '-'}</div></div>
                    <div class="data-row"><span class="label">AUTOCUIDADOS:</span> <div class="value">${otData.avaliacao.autocuidados || '-'}</div></div>
                </div>

                ${session ? `
                <h2 class="section-title">III. REGISTRO DE ATENDIMENTO / EVOLUÃ‡ÃƒO</h2>
                <div class="box" style="border-left: 4px solid #ea580c; background: #fff7ed;">
                    <div class="data-row">
                        <span class="label">DATA:</span> <span class="value">${new Date(session.date).toLocaleDateString()}</span>
                        <span class="label" style="display:inline; margin-left: 20px;">INDEPENDÃŠNCIA:</span> <span class="value">${session.nivelIndependencia}</span>
                    </div>
                    <div class="data-row"><span class="label">OBJETIVOS:</span> <span class="value">${session.objetivos}</span></div>
                    <div class="data-row"><span class="label">ATIVIDADES / RECURSOS:</span> <div class="value">${session.atividades} / ${session.recursos}</div></div>
                    <div class="data-row"><span class="label">RESPOSTA SENSORIAL:</span> <div class="value">${session.respostaSensorial || '-'}</div></div>
                    <div class="data-row"><span class="label">DESEMPENHO MOTOR:</span> <div class="value">${session.desempenhoMotor || '-'}</div></div>
                    <div class="data-row"><span class="label">EVOLUÃ‡ÃƒO:</span> <span class="value">${session.evolucao}</span></div>
                    <div class="data-row"><span class="label">OBSERVAÃ‡Ã•ES:</span> <div class="value" style="white-space: pre-wrap;">${session.observacoes || '-'}</div></div>
                </div>
                ` : ''}
            `;

            const html = generateClinicalPrintHTML(
                selectedStudent,
                config,
                'RelatÃ³rio de Terapia Ocupacional',
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
            alert('Erro ao gerar impressÃ£o.');
        }
    };

    if (!isOT) return <div className="p-8 text-center text-red-600 font-bold">Acesso restrito Ã  Terapia Ocupacional.</div>;

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn pb-12">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-2xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Puzzle size={200} /></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-extrabold flex items-center gap-3">
                            <Puzzle size={32} /> Terapia Ocupacional
                        </h2>
                        <p className="text-indigo-100 mt-2">Desempenho Ocupacional, IntegraÃ§Ã£o Sensorial e AVDs</p>
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
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                    <Search className="mx-auto text-slate-300 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Selecione um Paciente</h3>
                    <p className="text-slate-500 mb-8">Para acessar o histÃ³rico e evoluÃ§Ãµes de T.O.</p>
                    <div className="max-w-md mx-auto">
                        <select
                            className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                            onChange={(e) => setSelectedStudent(students.find(s => s.id === e.target.value) || null)}
                            value=""
                        >
                            <option value="">Buscar aluno...</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                        </select>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Tabs */}
                    <div className="lg:col-span-1 space-y-2">
                        <button onClick={() => setActiveTab('anamnese')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'anamnese' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-indigo-50'}`}>
                            <FileText size={18} /> Anamnese T.O.
                        </button>
                        <button onClick={() => setActiveTab('avaliacao')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'avaliacao' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-indigo-50'}`}>
                            <ClipboardCheck size={18} /> AvaliaÃ§Ã£o ClÃ­nica
                        </button>
                        <button onClick={() => setActiveTab('sessions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'sessions' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-indigo-50'}`}>
                            <History size={18} /> Atendimentos
                        </button>
                        <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-indigo-50'}`}>
                            <Printer size={18} /> RelatÃ³rios
                        </button>
                        <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-indigo-50'}`}>
                            <TrendingUp size={18} /> EvoluÃ§Ã£o e Status
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
                                    <FileText className="text-indigo-600" /> HistÃ³rico Ocupacional
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">HistÃ³rico Ocupacional e Queixas</label>
                                        <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[100px]" value={otData.anamnese.historicoOcupacional} onChange={e => setOtData({ ...otData, anamnese: { ...otData.anamnese, historicoOcupacional: e.target.value } })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Rotina e AVDs (Atividades de Vida DiÃ¡ria)</label>
                                        <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[100px]" value={otData.anamnese.rotinaAVDs} onChange={e => setOtData({ ...otData, anamnese: { ...otData.anamnese, rotinaAVDs: e.target.value } })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Perfil Sensorial PrÃ©vio</label>
                                        <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[80px]" value={otData.anamnese.perfilSensorialPrevia} onChange={e => setOtData({ ...otData, anamnese: { ...otData.anamnese, perfilSensorialPrevia: e.target.value } })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
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
                                    <button onClick={handleSaveGeneral} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2">
                                        <Save size={20} /> Salvar HistÃ³rico
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'avaliacao' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fadeIn">
                                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <ClipboardCheck className="text-indigo-600" /> AvaliaÃ§Ã£o ClÃ­nica Especializada
                                </h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
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
                                        <label className="block text-sm font-bold text-slate-700 mb-1">IntegraÃ§Ã£o Visomotora</label>
                                        <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[100px]" value={otData.avaliacao.integracaoVisomotora} onChange={e => setOtData({ ...otData, avaliacao: { ...otData.avaliacao, integracaoVisomotora: e.target.value } })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Autocuidados e AVDs</label>
                                        <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[100px]" value={otData.avaliacao.autocuidados} onChange={e => setOtData({ ...otData, avaliacao: { ...otData.avaliacao, autocuidados: e.target.value } })} />
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <button onClick={handleSaveGeneral} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2">
                                        <Save size={20} /> Salvar AvaliaÃ§Ã£o
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'sessions' && (
                            <div className="space-y-6 animate-fadeIn">
                                {isEditingSession ? (
                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold text-slate-800">Registrar SessÃ£o T.O.</h3>
                                            <button onClick={() => setIsEditingSession(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Data</label>
                                                <input type="date" className="w-full p-2.5 rounded-lg border border-slate-300" value={currentSession.date} onChange={e => setCurrentSession({ ...currentSession, date: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">NÃ­vel de IndependÃªncia</label>
                                                <select className="w-full p-2.5 rounded-lg border border-slate-300" value={currentSession.nivelIndependencia} onChange={e => setCurrentSession({ ...currentSession, nivelIndependencia: e.target.value as any })}>
                                                    <option>Independente</option>
                                                    <option>SupervisÃ£o</option>
                                                    <option>Ajuda MÃ­nima</option>
                                                    <option>Ajuda Moderada</option>
                                                    <option>Ajuda MÃ¡xima</option>
                                                    <option>Dependente</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-4 mt-6">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Objetivos TerapÃªuticos da SessÃ£o</label>
                                                <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[80px]" value={currentSession.objetivos} onChange={e => setCurrentSession({ ...currentSession, objetivos: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Atividades Realizadas e Recursos</label>
                                                <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[80px]" value={currentSession.atividades} onChange={e => setCurrentSession({ ...currentSession, atividades: e.target.value })} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                <label className="block text-sm font-bold text-slate-700 mb-1">ObservaÃ§Ãµes e EvoluÃ§Ã£o Ocupacional</label>
                                                <select className="w-full p-2.5 rounded-lg border border-slate-300 mb-2" value={currentSession.evolucao} onChange={e => setCurrentSession({ ...currentSession, evolucao: e.target.value as any })}>
                                                    <option>Melhora Significativa</option>
                                                    <option>Leve Melhora</option>
                                                    <option>EstÃ¡vel</option>
                                                    <option>RegressÃ£o</option>
                                                </select>
                                                <textarea className="w-full p-3 rounded-lg border border-slate-300 min-h-[80px]" value={currentSession.observacoes} onChange={e => setCurrentSession({ ...currentSession, observacoes: e.target.value })} placeholder="Mais detalhes sobre a evoluÃ§Ã£o..." />
                                            </div>
                                        </div>
                                        <div className="mt-8 flex justify-end gap-3">
                                            <button onClick={() => setIsEditingSession(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
                                            <button onClick={handleSaveSession} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2">
                                                <CheckCircle size={20} /> Salvar SessÃ£o
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-xl font-bold text-slate-800">HistÃ³rico de Atendimentos</h3>
                                            <button onClick={() => { setCurrentSession({}); setIsEditingSession(true); }} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2">
                                                <Plus size={20} /> Novo Registro
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            {otData.sessions.length === 0 ? (
                                                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 border-dashed">
                                                    <p className="text-slate-500">Nenhuma sessÃ£o registrada para este aluno.</p>
                                                </div>
                                            ) : (
                                                otData.sessions.map((sess, idx) => (
                                                    <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded mb-2 inline-block">SessÃ£o T.O.</span>
                                                                <h4 className="font-bold text-slate-800 text-lg">{new Date(sess.date).toLocaleDateString('pt-BR')}</h4>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs font-bold text-slate-400">Progresso</span>
                                                                <span className={`text-sm font-bold ${sess.evolucao.includes('Melhora') ? 'text-green-600' : 'text-slate-600'}`}>{sess.evolucao}</span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
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
                                        <option>AvaliaÃ§Ã£o</option>
                                        <option>IntervenÃ§Ã£o</option>
                                        <option>Monitoramento</option>
                                        <option>Alta</option>
                                    </select>
                                    <p className="text-sm text-slate-500 mt-2">O status Ã© exibido no painel de gestÃ£o para outros profissionais.</p>

                                    <button onClick={handleSaveGeneral} className="mt-8 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md w-full">
                                        Atualizar Status
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




// --- DASHBOARD ESPECIALIZADO DE FISIOTERAPIA FUNCIONAL ---
const PhysiotherapySpecificDashboard: React.FC<BaseDashboardProps> = ({ title, onNavigateNew, currentUser, preSelectedStudent }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(preSelectedStudent || null);
    const [activeTab, setActiveTab] = useState<'anamnese' | 'avaliacao' | 'funcionalidade' | 'sessions' | 'conclusao' | 'reports'>('anamnese');
    const [ptData, setPtData] = useState<PhysioPrivateData>(initialPhysioData);
    const [isEditingSession, setIsEditingSession] = useState(false);
    const [currentSession, setCurrentSession] = useState<Partial<PhysioSession>>({});
    const [loading, setLoading] = useState(false);

    const isPT = currentUser.specialty === Specialty.PHYSIOTHERAPY || currentUser.role === 'ADMIN';

    useEffect(() => {
        if (preSelectedStudent) setSelectedStudent(preSelectedStudent);
    }, [preSelectedStudent]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await SupabaseService.getStudents();
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
            alert('Dados salvos com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar dados.');
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
            evolucao: currentSession.evolucao || 'EstÃ¡vel'
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
            alert('SessÃ£o salva!');
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar sessÃ£o.');
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
                    <div class="data-row"><span class="label">DIAGNÃ“STICO INFORMADO:</span> <div class="value">${ptData.anamnese.diagnosticoInformado || '-'}</div></div>
                    <div class="data-row"><span class="label">HISTÃ“RICO FUNCIONAL:</span> <div class="value">${ptData.anamnese.historicoFuncional || '-'}</div></div>
                    <div class="data-row"><span class="label">DISPOSITIVOS DE APOIO:</span> <div class="value">${ptData.anamnese.dispositivosApoio || '-'}</div></div>
                </div>

                <h2 class="section-title">II. AVALIAÃ‡ÃƒO MOTORA E POSTURAL</h2>
                <div class="box">
                    <div class="data-row"><span class="label">CLASSIFICAÃ‡ÃƒO GMFCS:</span> <div class="value"><strong>NÃVEL ${ptData.avaliacao.gmfcs || 'NÃƒO INFORMADO'}</strong></div></div>
                    <div class="data-row"><span class="label">POSTURA (PÃ©/Sentado):</span> <div class="value">${ptData.avaliacao.postura.emPe} / ${ptData.avaliacao.postura.sentada}</div></div>
                    <div class="data-row"><span class="label">MOBILIDADE (ADM):</span> <div class="value">${ptData.avaliacao.mobilidade.adm}</div></div>
                    <div class="data-row"><span class="label">EQUILÃBRIO:</span> <div class="value">${ptData.avaliacao.equilibrio.estatico} (Est.) / ${ptData.avaliacao.equilibrio.dinamico} (Din.)</div></div>
                    <div class="data-row"><span class="label">MARCHA:</span> <div class="value">${ptData.avaliacao.marcha.observacoes || '-'}</div></div>
                </div>

                <h2 class="section-title">III. CONCLUSÃƒO E RECOMENDAÃ‡Ã•ES ESCOLARES</h2>
                <div class="box">
                    <div class="data-row"><span class="label">LIMITAÃ‡Ã•ES:</span> <div class="value">${ptData.conclusao.limitacoes || '-'}</div></div>
                    <div class="data-row"><span class="label">POTENCIALIDADES:</span> <div class="value">${ptData.conclusao.potencialidades || '-'}</div></div>
                    <div class="data-row"><span class="label">APOIO ESCOLAR:</span> <div class="value">${ptData.conclusao.necessidadeApoioEscolar || '-'}</div></div>
                    <div class="data-row"><span class="label">RECOMENDAÃ‡Ã•ES:</span> <div class="value">${ptData.conclusao.recomendacoes || '-'}</div></div>
                </div>

                ${session ? `
                <h2 class="section-title">IV. REGISTRO DE ATENDIMENTO / EVOLUÃ‡ÃƒO</h2>
                <div class="box" style="border-left: 4px solid #1d4ed8; background: #eff6ff;">
                    <div class="data-row">
                        <span class="label">DATA:</span> <span class="value">${new Date(session.date).toLocaleDateString()}</span>
                        <span class="label" style="display:inline; margin-left: 20px;">EVOLUÃ‡ÃƒO:</span> <span class="value">${session.evolucao}</span>
                    </div>
                    <div class="data-row"><span class="label">OBJETIVO:</span> <span class="value">${session.objetivoAtendimento}</span></div>
                    <div class="data-row"><span class="label">ATIVIDADES:</span> <div class="value">${session.atividadesRealizadas}</div></div>
                    <div class="data-row"><span class="label">RESPOSTA MOTORA:</span> <span class="value">${session.respostaMotora}</span></div>
                    <div class="data-row"><span class="label">OBSERVAÃ‡Ã•ES:</span> <div class="value" style="white-space: pre-wrap;">${session.observacoesClinicas || '-'}</div></div>
                </div>
                ` : ''}
            `;

            const html = generateClinicalPrintHTML(
                selectedStudent,
                config,
                'RelatÃ³rio de AvaliaÃ§Ã£o FisioterapÃªutica Funcional',
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
            alert('Erro ao gerar impressÃ£o.');
        }
    };

    if (!isPT) return <div className="p-8 text-center text-red-600 font-bold">Acesso restrito Ã  Fisioterapia.</div>;

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn pb-12">
            {/* Institucional Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Activity size={200} /></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-extrabold flex items-center gap-3">
                            <Activity size={32} /> Fisioterapia Funcional
                        </h2>
                        <p className="text-blue-100 mt-2">Acompanhamento Motor e Acessibilidade Escolar</p>
                        <div className="mt-4 flex items-center gap-2 bg-blue-900/40 p-3 rounded-lg border border-blue-400/30 text-xs w-fit">
                            <ShieldAlert size={16} className="text-blue-300" />
                            <span>MÃ³dulo em conformidade com a LGPD e limites Ã©ticos (Sem diagnÃ³stico clÃ­nico).</span>
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
                <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-slate-200">
                    <UserIcon size={64} className="mx-auto text-blue-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 mb-4">Selecione um Paciente</h3>
                    <div className="max-w-md mx-auto relative">
                        <select className="w-full p-4 pl-12 rounded-xl border border-slate-300 shadow-sm bg-white" onChange={(e) => {
                            const s = students.find(st => st.id === e.target.value);
                            setSelectedStudent(s || null);
                        }} value="">
                            <option value="">Buscar aluno...</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                        </select>
                        <Search className="absolute left-4 top-4 text-slate-400" size={20} />
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col md:flex-row">
                    {/* Sidebar Tabs */}
                    <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
                        {[
                            { id: 'anamnese', label: 'Anamnese', icon: FileText },
                            { id: 'avaliacao', label: 'AvaliaÃ§Ã£o Motora', icon: Activity },
                            { id: 'funcionalidade', label: 'Rotina Escolar', icon: School },
                            { id: 'sessions', label: 'Atendimentos', icon: History },
                            { id: 'conclusao', label: 'ConclusÃ£o', icon: ClipboardCheck },
                            { id: 'reports', label: 'RelatÃ³rios', icon: Printer },
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
                    <div className="flex-1 p-8 bg-slate-50/50">
                        {/* TAB: ANAMNESE */}
                        {activeTab === 'anamnese' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-slate-800">Anamnese FisioterapÃªutica Funcional</h3>
                                    <button onClick={handleSaveGeneral} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700"><Save size={18} /> Salvar</button>
                                </div>
                                <div className="space-y-4">
                                    <StyledInput label="Queixa Principal (impacto na funcionalidade)" rows={2} value={ptData.anamnese.queixaPrincipal} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, queixaPrincipal: e.target.value } })} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <StyledInput label="InÃ­cio da Queixa" value={ptData.anamnese.dataInicioQueixa} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, dataInicioQueixa: e.target.value } })} />
                                        <StyledInput label="DiagnÃ³stico Informado (Documentos)" value={ptData.anamnese.diagnosticoInformado} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, diagnosticoInformado: e.target.value } })} />
                                    </div>
                                    <StyledInput label="HistÃ³rico Funcional e SaÃºde Relevante" rows={3} value={ptData.anamnese.historicoFuncional} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, historicoFuncional: e.target.value } })} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <StyledInput label="Dispositivos de Apoio (Cadeira, Ã“rtese, etc)" value={ptData.anamnese.dispositivosApoio} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, dispositivosApoio: e.target.value } })} />
                                        <StyledInput label="Cirurgias PrÃ©vias" value={ptData.anamnese.cirurgiasPrevias} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, cirurgiasPrevias: e.target.value } })} />
                                    </div>

                                    <div className="p-4 bg-white rounded-lg border border-slate-200">
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-3">Registro de Dor</label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">Existe Dor?</label>
                                                <select className="w-full p-2 bg-slate-50 border rounded" value={ptData.anamnese.dor.existe} onChange={e => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, dor: { ...ptData.anamnese.dor, existe: e.target.value } } })}>
                                                    <option>NÃ£o</option><option>Sim</option>
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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <StyledInput label="NÃ­vel de IndependÃªncia (AVDs)" value={ptData.anamnese.nivelIndependencia} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, nivelIndependencia: e.target.value } })} />
                                        <StyledInput label="Dificuldades de Locomocao" value={ptData.anamnese.dificuldadesLocomocao} onChange={(e: any) => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, dificuldadesLocomocao: e.target.value } })} />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 text-sm font-bold text-slate-700">Apresenta Fadiga Frequente?</div>
                                        <div className="flex gap-2">
                                            {['Sim', 'NÃ£o'].map(opt => (
                                                <button key={opt} onClick={() => setPtData({ ...ptData, anamnese: { ...ptData.anamnese, fadigaFrequente: opt } })} className={`px-4 py-1 rounded-full text-xs font-bold ${ptData.anamnese.fadigaFrequente === opt ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: AVALIAÃ‡ÃƒO MOTORA */}
                        {activeTab === 'avaliacao' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-slate-800">AvaliaÃ§Ã£o FisioterapÃªutica Funcional</h3>
                                    <button onClick={handleSaveGeneral} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700"><Save size={18} /> Salvar</button>
                                </div>

                                <FormSection title="ClassificaÃ§Ã£o GMFCS" icon={Activity} color="text-blue-700">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">NÃ­vel GMFCS (FunÃ§Ã£o Motora Grossa)</label>
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
                                                {ptData.avaliacao.gmfcs === 'I' && 'NÃ­vel I: Anda sem restriÃ§Ãµes.'}
                                                {ptData.avaliacao.gmfcs === 'II' && 'NÃ­vel II: Anda com limitaÃ§Ãµes.'}
                                                {ptData.avaliacao.gmfcs === 'III' && 'NÃ­vel III: Anda com dispositivo manual de mobilidade.'}
                                                {ptData.avaliacao.gmfcs === 'IV' && 'NÃ­vel IV: Mobilidade limitada; pode usar motorizada.'}
                                                {ptData.avaliacao.gmfcs === 'V' && 'NÃ­vel V: Transportado em cadeira de rodas manual.'}
                                                {!ptData.avaliacao.gmfcs && 'Selecione um nÃ­vel para ver a descriÃ§Ã£o.'}
                                            </p>
                                            <p className="text-blue-600/80 text-xs mt-1">
                                                {ptData.avaliacao.gmfcs === 'I' && 'Desempenha habilidades motoras grossas como correr e pular, mas velocidade e coordenaÃ§Ã£o sÃ£o reduzidas.'}
                                                {ptData.avaliacao.gmfcs === 'II' && 'Dificuldade em andar longas distÃ¢ncias e em terrenos irregulares; necessita de corrimÃ£o em escadas.'}
                                                {ptData.avaliacao.gmfcs === 'III' && 'Caminha com dispositivos de auxÃ­lio (andadores, muletas) e usa cadeira de rodas para longas distÃ¢ncias.'}
                                                {ptData.avaliacao.gmfcs === 'IV' && 'Funcionalidade limitada; necessita de assistÃªncia fÃ­sica ou mobilidade motorizada na maioria dos ambientes.'}
                                                {ptData.avaliacao.gmfcs === 'V' && 'Grave limitaÃ§Ã£o no controle postural e movimento; dependÃªncia total para mobilidade.'}
                                            </p>
                                        </div>
                                    </div>
                                </FormSection>

                                <FormSection title="I. Postura" icon={AlignLeft}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <StyledInput label="Postura em PÃ©" value={ptData.avaliacao.postura.emPe} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, postura: { ...ptData.avaliacao.postura, emPe: e.target.value } } })} />
                                        <StyledInput label="Postura Sentada" value={ptData.avaliacao.postura.sentada} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, postura: { ...ptData.avaliacao.postura, sentada: e.target.value } } })} />
                                    </div>
                                    <StyledInput label="Assimetrias VisÃ­veis" value={ptData.avaliacao.postura.assimetrias} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, postura: { ...ptData.avaliacao.postura, assimetrias: e.target.value } } })} />
                                </FormSection>

                                <FormSection title="II. Mobilidade e EquilÃ­brio" icon={Zap}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <StyledInput label="Amplitude de Movimento (ADM)" value={ptData.avaliacao.mobilidade.adm} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, mobilidade: { ...ptData.avaliacao.mobilidade, adm: e.target.value } } })} />
                                        <StyledInput label="CoordenaÃ§Ã£o Motora Grossa" value={ptData.avaliacao.mobilidade.coordMotorGrossa} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, mobilidade: { ...ptData.avaliacao.mobilidade, coordMotorGrossa: e.target.value } } })} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <StyledInput label="EquilÃ­brio EstÃ¡tico" value={ptData.avaliacao.equilibrio.estatico} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, equilibrio: { ...ptData.avaliacao.equilibrio, estatico: e.target.value } } })} />
                                        <StyledInput label="EquilÃ­brio DinÃ¢mico" value={ptData.avaliacao.equilibrio.dinamico} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, equilibrio: { ...ptData.avaliacao.equilibrio, dinamico: e.target.value } } })} />
                                    </div>
                                </FormSection>

                                <FormSection title="III. ForÃ§a e Marcha" icon={TrendingUp}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 uppercase block mb-2">ForÃ§a Muscular Adequada para Idade?</label>
                                            <div className="flex gap-2">
                                                {['Sim', 'NÃ£o'].map(opt => (
                                                    <button key={opt} onClick={() => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, forcaMuscular: { ...ptData.avaliacao.forcaMuscular, adequadaIdade: opt } } })} className={`px-4 py-1 rounded-full text-xs font-bold ${ptData.avaliacao.forcaMuscular.adequadaIdade === opt ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <StyledInput label="DÃ©ficit Funcional Observado" value={ptData.avaliacao.forcaMuscular.deficitFuncional} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, forcaMuscular: { ...ptData.avaliacao.forcaMuscular, deficitFuncional: e.target.value } } })} />
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-3">Marcha / LocomoÃ§Ã£o</label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            {['independente', 'comApoio', 'cadeiraRodas'].map(field => (
                                                <div key={field} className="flex items-center justify-between bg-white p-2 rounded border">
                                                    <span className="text-xs font-bold text-slate-600">{field === 'independente' ? 'Independente' : field === 'comApoio' ? 'Com Apoio' : 'Cadeira de Rodas'}</span>
                                                    <select className="text-xs p-1" value={(ptData.avaliacao.marcha as any)[field]} onChange={e => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, marcha: { ...ptData.avaliacao.marcha, [field]: e.target.value } } })}>
                                                        <option>Sim</option><option>NÃ£o</option>
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                        <StyledInput label="ObservaÃ§Ãµes da Marcha" rows={2} value={ptData.avaliacao.marcha.observacoes} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, marcha: { ...ptData.avaliacao.marcha, observacoes: e.target.value } } })} />
                                    </div>
                                </FormSection>
                            </div>
                        )}

                        {/* TAB: FUNCIONALIDADE ESCOLAR */}
                        {activeTab === 'funcionalidade' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-slate-800">ParticipaÃ§Ã£o e Funcionalidade Escolar</h3>
                                    <button onClick={handleSaveGeneral} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700"><Save size={18} /> Salvar</button>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 space-y-4">
                                    <StyledInput label="Deslocamento dentro da Escola (Salas, PÃ¡tio)" rows={2} value={ptData.avaliacao.funcionalidadeEscolar.deslocamento} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, funcionalidadeEscolar: { ...ptData.avaliacao.funcionalidadeEscolar, deslocamento: e.target.value } } })} />
                                    <StyledInput label="Acesso a ambientes (Rampas, Escadas, Banheiro)" rows={2} value={ptData.avaliacao.funcionalidadeEscolar.acessoAmbientes} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, funcionalidadeEscolar: { ...ptData.avaliacao.funcionalidadeEscolar, acessoAmbientes: e.target.value } } })} />
                                    <StyledInput label="PermanÃªncia em Sala de Aula (Postura, MobiliÃ¡rio)" rows={2} value={ptData.avaliacao.funcionalidadeEscolar.permanenciaSala} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, funcionalidadeEscolar: { ...ptData.avaliacao.funcionalidadeEscolar, permanenciaSala: e.target.value } } })} />
                                    <StyledInput label="ParticipaÃ§Ã£o em Atividades FÃ­sicas e Recreativas" rows={2} value={ptData.avaliacao.funcionalidadeEscolar.participacaoAtividades} onChange={(e: any) => setPtData({ ...ptData, avaliacao: { ...ptData.avaliacao, funcionalidadeEscolar: { ...ptData.avaliacao.funcionalidadeEscolar, participacaoAtividades: e.target.value } } })} />
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-sm text-blue-800 flex items-start gap-3">
                                    <AlertCircle size={20} className="mt-0.5" />
                                    <p>Esta seÃ§Ã£o foca em como o aluno interage com o ambiente fÃ­sico da escola e quais barreiras arquitetÃ´nicas ou funcionais ele enfrenta no dia a dia educativo.</p>
                                </div>
                            </div>
                        )}

                        {/* TAB: ATENDIMENTOS (SESSÃ•ES) */}
                        {activeTab === 'sessions' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-slate-800">HistÃ³rico de Atendimentos</h3>
                                    {!isEditingSession && (
                                        <button onClick={() => { setIsEditingSession(true); setCurrentSession({}); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700"><Plus size={18} /> Novo Atendimento</button>
                                    )}
                                </div>

                                {isEditingSession ? (
                                    <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200 animate-slideUp">
                                        <h4 className="font-bold text-blue-700 mb-4 border-b border-blue-100 pb-2">Registro de SessÃ£o FisioterapÃªutica</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <StyledInput label="Data" type="date" value={currentSession.date} onChange={(e: any) => setCurrentSession({ ...currentSession, date: e.target.value })} />
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 ml-1">EvoluÃ§Ã£o Percebida</label>
                                                <select className="w-full rounded-lg border-slate-300 bg-slate-50 p-2.5 text-sm" value={currentSession.evolucao} onChange={(e) => setCurrentSession({ ...currentSession, evolucao: e.target.value as any })}>
                                                    <option>EstÃ¡vel</option>
                                                    <option>Melhora Leve</option>
                                                    <option>Melhora Significativa</option>
                                                    <option>RegressÃ£o</option>
                                                </select>
                                            </div>
                                        </div>
                                        <StyledInput label="Objetivo do Atendimento" value={currentSession.objetivoAtendimento} onChange={(e: any) => setCurrentSession({ ...currentSession, objetivoAtendimento: e.target.value })} />
                                        <StyledInput label="Atividades Realizadas" rows={2} value={currentSession.atividadesRealizadas} onChange={(e: any) => setCurrentSession({ ...currentSession, atividadesRealizadas: e.target.value })} />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <StyledInput label="Resposta Motora Observada" value={currentSession.respostaMotora} onChange={(e: any) => setCurrentSession({ ...currentSession, respostaMotora: e.target.value })} />
                                            <StyledInput label="NÃ­veis de Dor PÃ³s-Atendimento" value={currentSession.niveisDorPos} onChange={(e: any) => setCurrentSession({ ...currentSession, niveisDorPos: e.target.value })} />
                                        </div>
                                        <StyledInput label="ObservaÃ§Ãµes e RecomendaÃ§Ãµes" rows={2} value={currentSession.observacoesClinicas} onChange={(e: any) => setCurrentSession({ ...currentSession, observacoesClinicas: e.target.value })} />

                                        <div className="flex justify-end gap-3 mt-6">
                                            <button onClick={() => setIsEditingSession(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                            <button onClick={handleSaveSession} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">Salvar Atendimento</button>
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

                        {/* TAB: CONCLUSÃƒO FUNCIONAL */}
                        {activeTab === 'conclusao' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><ClipboardCheck className="text-blue-600" /> SÃ­ntese e ConclusÃ£o Funcional</h3>
                                    <button onClick={handleSaveGeneral} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700"><Save size={18} /> Salvar ConclusÃ£o</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormSection title="LimitaÃ§Ãµes e Potencialidades" icon={TrendingUp} color="text-blue-700">
                                        <StyledInput label="LimitaÃ§Ãµes Funcionais Observadas" rows={3} value={ptData.conclusao.limitacoes} onChange={(e: any) => setPtData({ ...ptData, conclusao: { ...ptData.conclusao, limitacoes: e.target.value } })} />
                                        <StyledInput label="Potencialidades do Aluno" rows={3} value={ptData.conclusao.potencialidades} onChange={(e: any) => setPtData({ ...ptData, conclusao: { ...ptData.conclusao, potencialidades: e.target.value } })} />
                                    </FormSection>
                                    <FormSection title="Apoio e RecomendaÃ§Ãµes" icon={ShieldAlert} color="text-blue-700">
                                        <StyledInput label="Necessidade de Apoio no Ambiente Escolar" rows={3} value={ptData.conclusao.necessidadeApoioEscolar} onChange={(e: any) => setPtData({ ...ptData, conclusao: { ...ptData.conclusao, necessidadeApoioEscolar: e.target.value } })} placeholder="Apoio de monitor, mediador, ou mobiliÃ¡rio etc" />
                                        <StyledInput label="RecomendaÃ§Ãµes Funcionais Finais" rows={3} value={ptData.conclusao.recomendacoes} onChange={(e: any) => setPtData({ ...ptData, conclusao: { ...ptData.conclusao, recomendacoes: e.target.value } })} />
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
                                            <option>AvaliaÃ§Ã£o Funcional</option>
                                            <option>Acompanhamento</option>
                                            <option>Monitoramento</option>
                                            <option>Alta</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: RELATÃ“RIOS (Central Fisioterapia) */}
                        {activeTab === 'reports' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Printer className="text-blue-600" /> Central de RelatÃ³rios</h3>
                                </div>
                                <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-slate-200">
                                    <Activity size={48} className="mx-auto text-blue-200 mb-4" />
                                    <h4 className="font-bold text-slate-700 mb-2">RelatÃ³rio de AvaliaÃ§Ã£o Funcional</h4>
                                    <p className="text-slate-500 mb-8 max-w-md mx-auto">Gere um documento profissional contendo a anamnese funcional, avaliaÃ§Ã£o motora, postural e as recomendaÃ§Ãµes de acessibilidade.</p>
                                    <button
                                        onClick={() => handlePrintPT()}
                                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 mx-auto"
                                    >
                                        <Printer size={20} /> Imprimir RelatÃ³rio Completo
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


// --- DASHBOARD ESPECÃFICO DE PSICOLOGIA ---
// (MANTIDO INTACTO)
const PsychologySpecificDashboard: React.FC<BaseDashboardProps> = ({ title, onNavigateNew, currentUser, preSelectedStudent }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(preSelectedStudent || null);
    const [activeTab, setActiveTab] = useState<'identification' | 'anamnesis' | 'sessions' | 'documents'>('identification');
    const [recentActivity, setRecentActivity] = useState<{ session: PsychSession, studentName: string, studentId: string }[]>([]);
    const [stats, setStats] = useState({ totalPatients: 0, totalSessions: 0, activeCases: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (preSelectedStudent) setSelectedStudent(preSelectedStudent);
    }, [preSelectedStudent]);

    // Psychology Specific State
    const [psychPublicData, setPsychPublicData] = useState<PsychFormPublic>(initialPublicForm);
    const [psychPrivateData, setPsychPrivateData] = useState<PsychFormPrivate>(initialPrivateForm);
    const [psychSessions, setPsychSessions] = useState<PsychSession[]>([]);
    const [psychStatus, setPsychStatus] = useState<string>('Em acompanhamento');

    const [isEditingSession, setIsEditingSession] = useState(false);
    const [currentSession, setCurrentSession] = useState<Partial<PsychSession>>({});

    neutro: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        triste: 'bg-blue-100 text-blue-700 border-blue-200',
            ansioso: 'bg-purple-100 text-purple-700 border-purple-200',
                irritado: 'bg-red-100 text-red-700 border-red-200'
};

const loadData = async () => {
    setLoading(true);
    const allStudents = await SupabaseService.getStudents();
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
    setStats({ totalPatients: patientCount, totalSessions: sessionCount, activeCases: activeCount });
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

        if (canAccessPrivate) {
            setPrivateData(extractPsychData(selectedStudent));
        }
        setActiveTab('sessions');
    }
}, [selectedStudent, canAccessPrivate]);

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
        // Salvar PÃºblico no History
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
        alert('ProntuÃ¡rio atualizado com sucesso!');
    } catch (e) {
        alert('Erro ao salvar prontuÃ¡rio.');
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
            titulo: currentSession.titulo || 'Atendimento PsicolÃ³gico',
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
        alert('Atendimento salvo!');
        loadData(); // Refresh list if needed
    } catch (e) {
        alert('Erro ao salvar sessÃ£o.');
    }
};

const handlePrintPsychology = async (targetSession?: PsychSession) => {
    if (!selectedStudent || !canAccessPrivate) return;
    try {
        const config = await SupabaseService.getPapelTimbradoConfig();
        const session = targetSession || (privateData.sessions.length > 0 ? privateData.sessions[0] : null);

        const contentHTML = `
                <h2 class="section-title">I. IDENTIFICAÃ‡ÃƒO E ENCAMINHAMENTO</h2>
                <div class="box">
                    <div class="data-row"><span class="label">ENCAMINHADO POR:</span> <span class="value">${publicData.identificacao.encaminhadoPor || '-'}</span></div>
                    <div class="data-row"><span class="label">DATA TRIAGEM:</span> <span class="value">${publicData.identificacao.dataTriagem ? new Date(publicData.identificacao.dataTriagem).toLocaleDateString() : '-'}</span></div>
                    <div class="data-row"><span class="label">QUEIXA PRINCIPAL / MOTIVO:</span> <div class="value">${publicData.motivoEncaminhamento.queixa || 'NÃ£o informado'}</div></div>
                </div>
                <h2 class="section-title">II. DADOS CLÃNICOS E PLANO TERAPÃŠUTICO</h2>
                <div class="box">
                    <div class="data-row"><span class="label">HIPÃ“TESES INICIAIS:</span> <div class="value">${privateData.formData.triagemPsicologica.hipotesesIniciais || '-'}</div></div>
                    <div class="data-row"><span class="label">OBJETIVO PRINCIPAL:</span> <div class="value">${privateData.formData.planoTerapeutico.objetivoPrincipal || '-'}</div></div>
                    <div class="data-row"><span class="label">METAS ESPECÃFICAS:</span> <div class="value">${privateData.formData.planoTerapeutico.metasEspecificas || '-'}</div></div>
                </div>
                ${session ? `
                <h2 class="section-title">III. REGISTRO DE EVOLUÃ‡ÃƒO</h2>
                <div class="box" style="border-left: 4px solid #9333ea; background: #faf5ff;">
                    <div class="data-row"><span class="label">DATA:</span> <span class="value">${new Date(session.dataHoraISO).toLocaleDateString()}</span></div>
                    <div class="data-row"><span class="label">TÃTULO:</span> <span class="value" style="font-weight: bold;">${session.titulo}</span></div>
                    <div class="data-row"><span class="label">EVOLUÃ‡ÃƒO:</span> <div class="value" style="white-space: pre-wrap;">${session.anotacoes || session.resumo || 'Sem anotaÃ§Ãµes.'}</div></div>
                </div>
                ` : ''}
            `;

        const html = generateClinicalPrintHTML(selectedStudent, config, 'ProntuÃ¡rio PsicolÃ³gico', contentHTML, {
            name: currentUser.name, jobTitle: currentUser.jobTitle || 'PsicÃ³logo(a)', specialty: currentUser.specialty, signatureUrl: currentUser.signatureUrl
        });

        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print(); win.close(); }, 500); }
    } catch (e) { alert('Erro na impressÃ£o.'); }
};

const filteredActivity = recentActivity.filter(item =>
    item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.session.titulo.toLowerCase().includes(searchTerm.toLowerCase())
);

return (
    <div className="max-w-6xl mx-auto animate-fadeIn pb-12">
        {!selectedStudent ? (
            <div className="space-y-8">
                {/* Header */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-800 to-indigo-900 p-8 text-white shadow-xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Brain size={200} /></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h2 className="text-3xl font-extrabold flex items-center gap-3"><Brain className="text-purple-300" /> {title}</h2>
                            <p className="text-purple-100 mt-2 font-medium">GestÃ£o clÃ­nica e prontuÃ¡rios psicolÃ³gicos.</p>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-4 top-4 text-purple-300" size={20} />
                            <select
                                className="w-full bg-white/20 backdrop-blur-md border border-white/30 rounded-xl p-3 pl-12 text-white placeholder:text-purple-200 outline-none focus:ring-2 focus:ring-white/50"
                                onChange={(e) => {
                                    const s = students.find(st => st.id === e.target.value);
                                    if (s) setSelectedStudent(s);
                                }}
                                value=""
                            >
                                <option value="" className="text-slate-800">Buscar paciente...</option>
                                {students.map(s => <option key={s.id} value={s.id} className="text-slate-800">{s.fullName}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Pacientes Ativos', val: stats.activeCases, icon: Users, color: 'bg-purple-100 text-purple-700' },
                        { label: 'Total de SessÃµes', val: stats.totalSessions, icon: Activity, color: 'bg-blue-100 text-blue-700' },
                        { label: 'Casos em Alta', val: 0, icon: CheckCircle, color: 'bg-green-100 text-green-700' }
                    ].map((s, i) => (
                        <div key={i} className={`${s.color} p-6 rounded-2xl shadow-sm border border-white flex items-center gap-4`}>
                            <div className="p-3 bg-white/50 rounded-xl"><s.icon size={24} /></div>
                            <div><p className="text-xs font-bold uppercase tracking-wider opacity-70">{s.label}</p><h3 className="text-2xl font-black">{s.val}</h3></div>
                        </div>
                    ))}
                </div>

                {/* Recent Activity List */}
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><History size={20} className="text-purple-600" /> Atendimentos Recentes</h3>
                        <input type="text" placeholder="Filtrar por nome ou tema..." className="px-4 py-2 rounded-lg border border-slate-300 text-sm w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="p-6 space-y-4">
                        {filteredActivity.length === 0 ? (
                            <p className="text-center text-slate-400 py-10">Nenhum registro encontrado.</p>
                        ) : (
                            filteredActivity.slice(0, 10).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer" onClick={() => {
                                    const s = students.find(st => st.id === item.studentId);
                                    if (s) setSelectedStudent(s);
                                }}>
                                    <div className="w-12 h-12 flex items-center justify-center bg-purple-50 text-2xl rounded-xl border border-purple-100">
                                        {MOOD_EMOJIS[item.session.humor] || 'ðŸ˜'}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800">{item.studentName}</h4>
                                        <p className="text-sm text-slate-500 font-medium">{item.session.titulo}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-700">{new Date(item.session.dataHoraISO).toLocaleDateString()}</p>
                                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full font-bold uppercase text-slate-500">{item.session.status}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        ) : (
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[700px]">
                {/* Sidebar Tabs */}
                <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
                    <div className="p-6 border-b border-slate-200 bg-white">
                        <button onClick={() => setSelectedStudent(null)} className="flex items-center gap-2 text-xs font-bold text-purple-600 mb-4 hover:underline"><TrendingUp size={14} /> Voltar ao Painel</button>
                        <h3 className="font-black text-slate-900 leading-tight">{selectedStudent.fullName}</h3>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">Status: {privateData.statusAtendimento}</p>
                    </div>
                    <div className="flex-1 py-4">
                        {[
                            { id: 'anamnese', label: 'IdentificaÃ§Ã£o', icon: Users },
                            { id: 'prontuario', label: 'ProntuÃ¡rio', icon: ClipboardCheck },
                            { id: 'sessions', label: 'EvoluÃ§Ãµes', icon: History },
                            { id: 'reports', label: 'RelatÃ³rios', icon: Printer },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`w-full p-4 flex items-center gap-3 text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 ml-2 rounded-l-xl' : 'text-slate-500 hover:bg-white hover:text-purple-600'}`}
                            >
                                <tab.icon size={18} /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 p-8 bg-white overflow-y-auto max-h-[700px]">
                    {activeTab === 'anamnese' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-slate-800">IdentificaÃ§Ã£o e Queixa</h3>
                                <button onClick={handleSaveGeneral} className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 shadow-md"><Save size={18} /> Salvar AlteraÃ§Ãµes</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormSection title="Origem" icon={AlignLeft} color="text-purple-700">
                                    <StyledInput label="Encaminhado por" value={publicData.identificacao.encaminhadoPor} onChange={e => handlePublicChange('identificacao', 'encaminhadoPor', e.target.value)} />
                                    <StyledInput label="Queixa Principal / Motivo" rows={3} value={publicData.motivoEncaminhamento.queixa} onChange={e => handlePublicChange('motivoEncaminhamento', 'queixa', e.target.value)} />
                                </FormSection>
                                <FormSection title="Ambiente Familiar" icon={Home} color="text-purple-700">
                                    <StyledInput label="Com quem mora?" value={publicData.historicoFamiliar.comQuemMora} onChange={(e: any) => handlePublicChange('historicoFamiliar', 'comQuemMora', e.target.value)} />
                                    <StyledInput label="DinÃ¢mica Relacional" rows={3} value={publicData.historicoFamiliar.relacaoFamiliar} onChange={(e: any) => handlePublicChange('historicoFamiliar', 'relacaoFamiliar', e.target.value)} />
                                </FormSection>
                            </div>
                        </div>
                    )}

                    {activeTab === 'prontuario' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-slate-800">ProntuÃ¡rio ClÃ­nico Seguro</h3>
                                <button onClick={handleSaveGeneral} className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 shadow-md"><Save size={18} /> Salvar ProntuÃ¡rio</button>
                            </div>
                            <div className="grid grid-cols-1 gap-6">
                                <FormSection title="AnÃ¡lise PsicolÃ³gica" icon={Brain} color="text-purple-700">
                                    <StyledInput label="Comportamentos Observados" rows={3} value={privateData.formData.triagemPsicologica.comportamentosObservados} onChange={e => handlePrivateChange('triagemPsicologica', 'comportamentosObservados', e.target.value)} />
                                    <StyledInput label="HipÃ³teses DiagnÃ³sticas Iniciais" rows={3} value={privateData.formData.triagemPsicologica.hipotesesIniciais} onChange={e => handlePrivateChange('triagemPsicologica', 'hipotesesIniciais', e.target.value)} />
                                </FormSection>
                                <FormSection title="Plano TerapÃªutico" icon={Zap} color="text-purple-700">
                                    <StyledInput label="Objetivo Principal" rows={2} value={privateData.formData.planoTerapeutico.objetivoPrincipal} onChange={e => handlePrivateChange('planoTerapeutico', 'objetivoPrincipal', e.target.value)} />
                                    <StyledInput label="Metas e IntervenÃ§Ãµes" rows={3} value={privateData.formData.planoTerapeutico.metasEspecificas} onChange={e => handlePrivateChange('planoTerapeutico', 'metasEspecificas', e.target.value)} />
                                </FormSection>
                            </div>
                        </div>
                    )}

                    {activeTab === 'sessions' && (
                        <div className="space-y-6 animate-fadeIn">
                            {isEditingSession ? (
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock className="text-purple-600" /> Registro de Atendimento</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <StyledInput label="Data e Hora" type="datetime-local" value={currentSession.dataHoraISO} onChange={e => setCurrentSession({ ...currentSession, dataHoraISO: e.target.value })} />
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Humor Predominante</label>
                                            <select className="w-full p-2.5 rounded-xl border border-slate-300" value={currentSession.humor} onChange={e => setCurrentSession({ ...currentSession, humor: e.target.value as any })}>
                                                <option value="feliz">ðŸ˜ƒ Feliz / EstÃ¡vel</option>
                                                <option value="neutro">ðŸ˜ Neutro</option>
                                                <option value="triste">ðŸ˜¢ Triste / RetraÃ­do</option>
                                                <option value="ansioso">ðŸ˜° Ansioso / Agitado</option>
                                                <option value="irritado">ðŸ˜¡ Irritado / Opositivo</option>
                                            </select>
                                        </div>
                                        <StyledInput label="DuraÃ§Ã£o (min)" type="number" value={currentSession.duracaoMin} onChange={e => setCurrentSession({ ...currentSession, duracaoMin: parseInt(e.target.value) })} />
                                    </div>
                                    <StyledInput label="TÃ­tulo da SessÃ£o" value={currentSession.titulo} onChange={e => setCurrentSession({ ...currentSession, titulo: e.target.value })} placeholder="Ex: Trabalhando frustraÃ§Ã£o atravÃ©s do lÃºdico" />
                                    <StyledInput label="EvoluÃ§Ã£o / ObservaÃ§Ãµes ClÃ­nicas" rows={5} value={currentSession.anotacoes} onChange={e => setCurrentSession({ ...currentSession, anotacoes: e.target.value })} />

                                    <div className="flex items-center gap-3 mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                                        <input type="checkbox" id="alta" className="w-5 h-5 accent-purple-600" checked={currentSession.indicativoAlta} onChange={e => setCurrentSession({ ...currentSession, indicativoAlta: e.target.checked })} />
                                        <label htmlFor="alta" className="font-bold text-purple-900 cursor-pointer">Registrar indicativo de Alta Psicologia</label>
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button onClick={() => setIsEditingSession(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                                        <button onClick={handleSaveSession} className="bg-purple-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-purple-700 shadow-lg">Salvar SessÃ£o</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-2xl font-black text-slate-800">HistÃ³rico de EvoluÃ§Ãµes</h3>
                                        <button onClick={() => { setCurrentSession({ dataHoraISO: new Date().toISOString().slice(0, 16), humor: 'neutro', status: 'Realizado', duracaoMin: 50 }); setIsEditingSession(true); }} className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 shadow-md"><Plus size={18} /> Novo Registro</button>
                                    </div>
                                    <div className="space-y-4">
                                        {privateData.sessions.length === 0 ? (
                                            <p className="text-center text-slate-400 py-10 italic">Nenhum atendimento registrado.</p>
                                        ) : (
                                            privateData.sessions.map((sess, idx) => (
                                                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-purple-200 transition-all shadow-sm group">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-3xl">{MOOD_EMOJIS[sess.humor] || 'ðŸ˜'}</div>
                                                            <div>
                                                                <span className="text-xs font-bold text-slate-400 uppercase">{new Date(sess.dataHoraISO).toLocaleDateString()} â€¢ {new Date(sess.dataHoraISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                            <h3 className="text-2xl font-black text-slate-800 mb-8">Central de RelatÃ³rios</h3>
                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-12 rounded-3xl border border-purple-100 text-center shadow-inner">
                                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-purple-100"><Printer size={40} className="text-purple-600" /></div>
                                <h4 className="text-xl font-bold text-slate-800 mb-2">RelatÃ³rio de EvoluÃ§Ã£o PsicolÃ³gica</h4>
                                <p className="text-slate-500 mb-8 max-w-md mx-auto">Gere um documento oficial contendo dados de identificaÃ§Ã£o, metas terapÃªuticas e o extrato da Ãºltima evoluÃ§Ã£o clÃ­nica.</p>
                                <button onClick={() => handlePrintPsychology()} className="px-10 py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-xl hover:bg-purple-700 transition-all flex items-center gap-2 mx-auto scale-110"><Printer size={20} /> Imprimir ProntuÃ¡rio Completo</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
);
};

// --- DASHBOARD ESPECÃFICO DE SERVIÃ‡O SOCIAL ---
// --- DASHBOARD ESPECÍFICO DE SERVIÇO SOCIAL ---
const SocialServiceSpecificDashboard: React.FC<BaseDashboardProps & { preSelectedStudent?: Student }> = ({ title, onNavigateNew, currentUser, preSelectedStudent }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(preSelectedStudent || null);
    const [activeTab, setActiveTab] = useState<'identification' | 'family' | 'housing' | 'health' | 'benefits' | 'observations' | 'documents'>('identification');
    const [recentUpdates, setRecentUpdates] = useState<{ studentName: string, lastUpdate: string, professional: string, studentId: string }[]>([]);
    const [stats, setStats] = useState({ totalVisits: 0, activeSearch: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // Dados do Aluno Selecionado
    const [socialData, setSocialData] = useState<SocialServicePrivateData>({
        formData: initialSocialForm,
        lastUpdate: '',
        professionalName: ''
    });

    useEffect(() => {
        if (preSelectedStudent) setSelectedStudent(preSelectedStudent);
    }, [preSelectedStudent]);

    const loadData = async () => {
        setLoading(true);
        const data = await SupabaseService.getStudents();
        setStudents(data);

        const updates: any[] = [];
        let count = 0;

        data.forEach(student => {
            const sData = student.clinical?.social_data; // This should be SocialServicePrivateData
            if (sData && sData.lastUpdate && sData.lastUpdate !== student.createdAt) {
                count++;
                updates.push({
                    studentId: student.id,
                    studentName: student.fullName,
                    lastUpdate: sData.lastUpdate,
                    professional: sData.professionalName
                });
            }
        });

        updates.sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime());
        setRecentUpdates(updates);
        setStats({ totalVisits: count, activeSearch: count });
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (selectedStudent) {
            // Ensure social_data exists, otherwise initialize with default
            setSocialData(selectedStudent.clinical?.social_data || {
                formData: initialSocialForm,
                lastUpdate: '',
                professionalName: ''
            });
            setActiveTab('id');
        }
    }, [selectedStudent]);

    const handleSaveSocial = async () => {
        if (!selectedStudent) return;
        try {
            const updatedStudent: Student = {
                ...selectedStudent,
                clinical: {
                    ...selectedStudent.clinical,
                    social_data: {
                        ...socialData, // This is already SocialServicePrivateData
                        lastUpdate: new Date().toISOString(),
                        professionalName: currentUser.name
                    }
                }
            };
            await SupabaseService.saveStudent(updatedStudent);
            setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
            setSelectedStudent(updatedStudent);
            alert('Busca Ativa atualizada com sucesso!');
            loadData();
        } catch (e) {
            alert('Erro ao salvar dados sociais.');
        }
    };

    const handlePrintSocialReport = async () => {
        if (!selectedStudent) return;
        try {
            const config = await SupabaseService.getPapelTimbradoConfig();

            const renderList = (items: string[]) => items && items.length > 0
                ? `<ul style="margin: 0; padding-left: 20px;">${items.map(i => `<li>${i}</li>`).join('')}</ul>`
                : 'NÃ£o informado';

            const contentHTML = `
                <h2 class="section-title">I. IDENTIFICAÃ‡ÃƒO E DADOS ESCOLARES</h2>
                <div class="box">
                    <div class="data-row"><span class="label">MATRICULADO:</span><span class="value">${socialData.formData.identificacao.matriculadoAtualmente}</span></div>
                    <div class="data-row"><span class="label">ESCOLA ATUAL:</span><span class="value">${socialData.formData.identificacao.nomeEscolaAtual || '-'}</span></div>
                </div>
                <h2 class="section-title">II. CONDIÃ‡Ã•ES SOCIOECONÃ”MICAS</h2>
                <div class="box">
                    <div class="data-row"><span class="label">RESPONSÃVEIS:</span><span class="value">${socialData.formData.condicoesSociais.responsaveisLegais || '-'}</span></div>
                    <div class="data-row"><span class="label">FONTE DE RENDA:</span><span class="value">${socialData.formData.condicoesSociais.fonteRenda || '-'}</span></div>
                    <div class="data-row"><span class="label">PROGRAMAS SOCIAIS:</span><span class="value">${renderList(socialData.formData.condicoesSociais.programasSociais)}</span></div>
                </div>
                <h2 class="section-title">III. PARECER TÃ‰CNICO SOCIAL</h2>
                <div class="box">
                    <div class="data-row"><span class="label">SITUAÃ‡ÃƒO ATUAL:</span><div class="value" style="white-space: pre-wrap;">${socialData.formData.observacoes.textoLivre || 'Sem observaÃ§Ãµes.'}</div></div>
                </div>
            `;

            const html = generateClinicalPrintHTML(selectedStudent, config, 'RelatÃ³rio de Atendimento Social', contentHTML, {
                name: currentUser.name, jobTitle: currentUser.jobTitle || 'Assistente Social', specialty: currentUser.specialty, signatureUrl: currentUser.signatureUrl
            });

            const win = window.open('', '_blank');
            if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print(); win.close(); }, 500); }
        } catch (e) { alert('Erro na impressÃ£o.'); }
    };

    const filteredUpdates = recentUpdates.filter(u => u.studentName.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleArrayToggle = (section: keyof SocialServiceForm, field: string, value: string) => {
        const current = (socialData.formData as any)[section][field] as string[];
        const updated = current.includes(value) ? current.filter(i => i !== value) : [...current, value];
        setSocialData({
            ...socialData,
            formData: {
                ...socialData.formData,
                [section]: { ...(socialData.formData as any)[section], [field]: updated }
            }
        });
    };

    const handleInputChange = (section: keyof SocialServiceForm, field: string, value: string) => {
        setSocialData({
            ...socialData,
            formData: {
                ...socialData.formData,
                [section]: {
                    ...(socialData.formData as any)[section],
                    [field]: value
                }
            }
        });
    };

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn pb-12">
            {!selectedStudent ? (
                <div className="space-y-8">
                    {/* Header */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 to-cyan-900 p-8 text-white shadow-xl">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Heart size={200} /></div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h2 className="text-3xl font-extrabold flex items-center gap-3"><Heart className="text-cyan-300" /> {title}</h2>
                                <p className="text-cyan-100 mt-2 font-medium">Busca Ativa Escolar e ProteÃ§Ã£o Social.</p>
                            </div>
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-4 top-4 text-cyan-300" size={20} />
                                <select
                                    className="w-full bg-white/20 backdrop-blur-md border border-white/30 rounded-xl p-3 pl-12 text-white outline-none focus:ring-2 focus:ring-white/50"
                                    onChange={(e) => {
                                        const s = students.find(st => st.id === e.target.value);
                                        if (s) setSelectedStudent(s);
                                    }}
                                    value=""
                                >
                                    <option value="" className="text-slate-800">Buscar aluno para Busca Ativa...</option>
                                    {students.map(s => <option key={s.id} value={s.id} className="text-slate-800">{s.fullName}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-cyan-50 p-6 rounded-2xl border border-cyan-100 flex items-center gap-4">
                            <div className="p-4 bg-white text-cyan-600 rounded-xl shadow-sm"><Home size={24} /></div>
                            <div><p className="text-xs font-bold text-cyan-800 uppercase">Visitas e AtualizaÃ§Ãµes</p><h3 className="text-2xl font-black text-cyan-900">{stats.totalVisits}</h3></div>
                        </div>
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-center gap-4">
                            <div className="p-4 bg-white text-blue-600 rounded-xl shadow-sm"><Search size={24} /></div>
                            <div><p className="text-xs font-bold text-blue-800 uppercase">Em Acompanhamento Social</p><h3 className="text-2xl font-black text-blue-900">{stats.activeSearch}</h3></div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">HistÃ³rico de AtuaÃ§Ã£o Social</h3>
                            <input type="text" placeholder="Filtrar aluno..." className="px-4 py-2 rounded-lg border border-slate-300 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Aluno</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Ãšltima Visita</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Profissional</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {filteredUpdates.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 cursor-pointer" onClick={() => {
                                            const s = students.find(st => st.id === item.studentId);
                                            if (s) setSelectedStudent(s);
                                        }}>
                                            <td className="px-6 py-4 font-bold text-slate-700">{item.studentName}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{new Date(item.lastUpdate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{item.professional}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[700px]">
                    {/* Sidebar */}
                    <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
                        <div className="p-6 border-b border-slate-200 bg-white">
                            <button onClick={() => setSelectedStudent(null)} className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-4 hover:underline"><Plus size={14} className="rotate-45" /> Voltar ao Painel</button>
                            <h3 className="font-black text-slate-900 leading-tight">{selectedStudent.fullName}</h3>
                        </div>
                        <div className="flex-1 py-4">
                            {[
                                { id: 'id', label: 'IdentificaÃ§Ã£o', icon: GraduationCap },
                                { id: 'social', label: 'Dados Sociais', icon: Home },
                                { id: 'health', label: 'SaÃºde e ProteÃ§Ã£o', icon: ShieldAlert },
                                { id: 'status', label: 'SituaÃ§Ã£o Atual', icon: Search },
                                { id: 'reports', label: 'RelatÃ³rios', icon: Printer },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`w-full p-4 flex items-center gap-3 text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg ml-2 rounded-l-xl' : 'text-slate-500 hover:bg-white hover:text-blue-600'}`}
                                >
                                    <tab.icon size={18} /> {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8 bg-white overflow-y-auto max-h-[700px]">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-800">Busca Ativa Escolar</h3>
                            <button onClick={handleSaveSocial} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-xl transition-all"><Save size={20} /> Salvar Dados</button>
                        </div>

                        {activeTab === 'id' && (
                            <div className="space-y-6 animate-fadeIn">
                                <FormSection title="SituaÃ§Ã£o Escolar" icon={GraduationCap} color="text-blue-600">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Matriculado atualmente?</label>
                                            <select className="w-full p-2.5 rounded-xl border border-slate-300" value={socialData.formData.identificacao.matriculadoAtualmente} onChange={e => handleInputChange('identificacao', 'matriculadoAtualmente', e.target.value)}>
                                                <option>Sim</option><option>NÃ£o</option><option>Evadido</option>
                                            </select>
                                        </div>
                                        <StyledInput label="Nome da Escola" value={socialData.formData.identificacao.nomeEscolaAtual} onChange={e => handleInputChange('identificacao', 'nomeEscolaAtual', e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <StyledInput label="Ãšltima Escola Frequentada" value={socialData.formData.historicoEscolar.ultimaEscola} onChange={e => handleInputChange('historicoEscolar', 'ultimaEscola', e.target.value)} />
                                        <StyledInput label="Ano que parou" value={socialData.formData.historicoEscolar.anoParou} onChange={e => handleInputChange('historicoEscolar', 'anoParou', e.target.value)} />
                                    </div>
                                </FormSection>
                            </div>
                        )}

                        {activeTab === 'social' && (
                            <div className="space-y-6 animate-fadeIn">
                                <FormSection title="FamÃ­lia e Renda" icon={Home} color="text-blue-600">
                                    <StyledInput label="ResponsÃ¡veis Legais" value={socialData.formData.condicoesSociais.responsaveisLegais} onChange={e => handleInputChange('condicoesSociais', 'responsaveisLegais', e.target.value)} />
                                    <StyledInput label="Fonte de Renda Familiar" value={socialData.formData.condicoesSociais.fonteRenda} onChange={e => handleInputChange('condicoesSociais', 'fonteRenda', e.target.value)} />
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Programas Sociais</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['Bolsa FamÃ­lia', 'BPC / LOAS', 'AuxÃ­lio GÃ¡s', 'Outros'].map(p => (
                                                <button key={p} onClick={() => handleArrayToggle('condicoesSociais', 'programasSociais', p)} className={`p-3 rounded-xl border text-sm font-bold transition-all ${socialData.formData.condicoesSociais.programasSociais.includes(p) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{p}</button>
                                            ))}
                                        </div>
                                    </div>
                                </FormSection>
                            </div>
                        )}

                        {activeTab === 'health' && (
                            <div className="space-y-6 animate-fadeIn">
                                <FormSection title="SaÃºde e Rede de ProteÃ§Ã£o" icon={ShieldAlert} color="text-blue-600">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Acompanhamento MÃ©dico</label>
                                            <select className="w-full p-2.5 rounded-xl border border-slate-300" value={socialData.formData.saude.acompanhamentoMedico} onChange={e => handleInputChange('saude', 'acompanhamentoMedico', e.target.value)}>
                                                <option>Sim</option><option>NÃ£o</option><option>Irregular</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Conselho Tutelar</label>
                                            <select className="w-full p-2.5 rounded-xl border border-slate-300" value={socialData.formData.saude.conselhoTutelar} onChange={e => handleInputChange('saude', 'conselhoTutelar', e.target.value)}>
                                                <option>Nunca acionado</option><option>JÃ¡ acionado</option><option>Acompanhamento Ativo</option>
                                            </select>
                                        </div>
                                    </div>
                                    <StyledInput label="Uso de MedicaÃ§Ã£o ContÃ­nua" value={socialData.formData.saude.medicacaoContinua} onChange={e => handleInputChange('saude', 'medicacaoContinua', e.target.value)} />
                                </FormSection>
                            </div>
                        )}

                        {activeTab === 'status' && (
                            <div className="space-y-6 animate-fadeIn">
                                <FormSection title="Parecer do ServiÃ§o Social" icon={AlignLeft} color="text-blue-600">
                                    <StyledInput label="DescriÃ§Ã£o da SituaÃ§Ã£o Atual" rows={6} value={socialData.formData.observacoes.textoLivre} onChange={e => handleInputChange('observacoes', 'textoLivre', e.target.value)} placeholder="Descreva os detalhes observados na visita ou atendimento..." />
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Principais Barreiras Identificadas</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['DistÃ¢ncia da Escola', 'Necessidade de Trabalhar', 'Falta de DocumentaÃ§Ã£o', 'Problemas de SaÃºde na FamÃ­lia', 'ViolÃªncia no TerritÃ³rio'].map(b => (
                                                <button key={b} onClick={() => handleArrayToggle('situacaoAtual', 'fatoresDificultam', b)} className={`p-4 rounded-2xl border text-left text-sm font-bold transition-all ${socialData.formData.situacaoAtual.fatoresDificultam.includes(b) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{b}</button>
                                            ))}
                                        </div>
                                    </div>
                                </FormSection>
                            </div>
                        )}

                        {activeTab === 'reports' && (
                            <div className="space-y-6 animate-fadeIn text-center py-20">
                                <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner"><Printer size={48} /></div>
                                <h4 className="text-2xl font-black text-slate-800">RelatÃ³rio de AtuaÃ§Ã£o Social</h4>
                                <p className="text-slate-500 mb-10 max-w-md mx-auto">Gere o documento oficial de Busca Ativa Escolar contendo todos os dados socioeconÃ´micos e o parecer tÃ©cnico.</p>
                                <button onClick={handlePrintSocialReport} className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-black shadow-2xl hover:bg-blue-700 transition-all flex items-center gap-2 mx-auto scale-110"><Printer size={20} /> Gerar PDF Oficial</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- BASE DASHBOARD (OUTRAS ESPECIALIDADES) ---
const BaseDashboard: React.FC<BaseDashboardProps> = ({ title, specialty, onNavigateNew }) => {
    const [history, setHistory] = useState<{ session: Session, studentName: string }[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const load = async () => {
            const allStudents = await SupabaseService.getStudents();
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
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
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

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Data</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Aluno</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Profissional</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Resumo</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">AÃ§Ãµes</th>
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
                                        // Se for JSON, pega algo legÃ­vel
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
                                                <button className="text-primary-600 hover:text-primary-900">Ver</button>
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

// --- FORMULÃRIO GENÃ‰RICO (OUTRAS ESPECIALIDADES) ---
const BaseSessionForm: React.FC<BaseSessionFormProps> = ({ title, specialty, onCancel, currentUser }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [serviceType, setServiceType] = useState('Consulta Individual');
    const [notes, setNotes] = useState('');

    useEffect(() => { SupabaseService.getStudents().then(setStudents); }, []);

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
                    .then(() => alert('Atendimento salvo com sucesso!'))
                    .catch(err => alert('Erro ao salvar: ' + err.message));
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
                        <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Data</label><input type="date" className="block w-full rounded-lg border-slate-300 p-2 border" value={date} onChange={(e) => setDate(e.target.value)} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label><select className="block w-full rounded-lg border-slate-300 p-2 border bg-white" value={serviceType} onChange={(e) => setServiceType(e.target.value)}><option>Consulta Individual</option><option>Grupo</option><option>AvaliaÃ§Ã£o</option></select></div></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">EvoluÃ§Ã£o</label><textarea rows={6} className="block w-full rounded-lg border-slate-300 p-3 border" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100"><button type="button" onClick={onCancel} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button><button type="submit" className="px-8 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">Salvar</button></div>
                </form>
            </div>
        </div>
    );
};

// --- FORMULÃRIO ESPECÃFICO DE PSICOLOGIA (RECONSTRUÃ‡ÃƒO 9 ITENS + SESSÃ•ES) ---

const PsychologySessionForm: React.FC<BaseSessionFormProps> = ({ onCancel, currentUser }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    // Abas e Visibilidade
    const [activeTab, setActiveTab] = useState<'formulario' | 'sessoes'>('formulario');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list'); // Para sessÃµes

    // Dados
    const [publicData, setPublicData] = useState<PsychFormPublic>(initialPublicForm);
    const [privateData, setPrivateData] = useState<PsychPrivateData>({ formData: initialPrivateForm, sessions: [], statusAtendimento: 'Em acompanhamento' });
    const [currentSession, setCurrentSession] = useState<Partial<PsychSession>>({});

    // SEGURANÃ‡A: Apenas PsicÃ³logos veem o privado
    const canAccessPrivate = currentUser.role === 'SPECIALIST' && currentUser.specialty === Specialty.PSYCHOLOGY;

    useEffect(() => {
        SupabaseService.getStudents().then(setStudents);
    }, []);

    useEffect(() => {
        if (selectedStudent) {
            // Carregar Publico (Mockado ou do History)
            // Tentativa de achar dados publicos no history
            const publicRecord = selectedStudent.history?.find(h => h.specialty === Specialty.PSYCHOLOGY && h.serviceType === 'PsychPublicData');
            if (publicRecord) {
                try { setPublicData(JSON.parse(publicRecord.notes)); } catch { setPublicData(initialPublicForm); }
            } else {
                setPublicData(initialPublicForm); // Reset se nÃ£o achar
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
        // Salva dados pÃºblicos como um registro tÃ©cnico no histÃ³rico geral do aluno
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
            // 1. Salvar PÃºblico
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
            showFeedback('success', 'ProntuÃ¡rio salvo com sucesso!');
        } catch (err) {
            console.error(err);
            showFeedback('error', 'Erro ao salvar prontuÃ¡rio.');
        }
    };

    // --- Handlers de SessÃ£o ---

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
                titulo: currentSession.titulo || 'Atendimento PsicolÃ³gico',
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
                    statusAtendimento: 'Alta psicolÃ³gica',
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

            showFeedback('success', 'SessÃ£o registrada com sucesso.');
            setViewMode('list');
        } catch (err) {
            console.error(err);
            showFeedback('error', 'Erro ao salvar sessÃ£o.');
        }
    };

    const deleteSession = (id: string) => {
        if (confirm('Excluir esta sessÃ£o permanentemente?')) {
            // TODO: Implement delete in SupabaseService
            // await SupabaseService.deleteSession(id);
            alert('Funcionalidade de exclusÃ£o em desenvolvimento no backend.');
        }
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

    // --- IMPRESSÃƒO SEGURA DE ATENDIMENTO ---
    const handlePrintPsychology = async (targetSession?: PsychSession) => {
        if (!selectedStudent || !canAccessPrivate) return;

        try {
            const config = await SupabaseService.getPapelTimbradoConfig();
            const session = targetSession || (privateData.sessions.length > 0 ? privateData.sessions[0] : null);

            const contentHTML = `
                <h2 class="section-title">I. IDENTIFICAÃ‡ÃƒO E ENCAMINHAMENTO</h2>
                <div class="box">
                    <div class="data-row"><span class="label">ENCAMINHADO POR</span><span class="value">${publicData.identificacao.encaminhadoPor || '-'}</span></div>
                    <div class="data-row"><span class="label">DATA TRIAGEM</span><span class="value">${publicData.identificacao.dataTriagem ? new Date(publicData.identificacao.dataTriagem).toLocaleDateString() : '-'}</span></div>
                    <div class="data-row"><span class="label">QUEIXA PRINCIPAL / MOTIVO</span><div class="value">${publicData.motivoEncaminhamento.queixa || 'NÃ£o informado'}</div></div>
                </div>

                <h2 class="section-title">II. DADOS CLÃNICOS (CONFIDENCIAL)</h2>
                <div class="box">
                    <div class="data-row"><span class="label">HIPÃ“TESES INICIAIS</span><div class="value">${privateData.formData.triagemPsicologica.hipotesesIniciais || '-'}</div></div>
                    <div class="data-row"><span class="label">PLANO TERAPÃŠUTICO</span><div class="value">${privateData.formData.planoTerapeutico.objetivoPrincipal || '-'}</div></div>
                </div>

                ${session ? `
                <h2 class="section-title">III. REGISTRO DE SESSÃƒO / EVOLUÃ‡ÃƒO</h2>
                <div class="box" style="border-left: 4px solid #9333ea; background: #faf5ff;">
                    <div class="data-row">
                        <span class="label">DATA DA SESSÃƒO:</span> <span class="value">${new Date(session.dataHoraISO).toLocaleDateString()} Ã s ${new Date(session.dataHoraISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span class="label" style="display:inline; margin-left: 20px;">SESSÃƒO #${session.numero}</span>
                    </div>
                    <div class="data-row"><span class="label">TÃTULO:</span> <span class="value" style="font-weight: bold;">${session.titulo}</span></div>
                    <div class="data-row"><span class="label">RESUMO / EVOLUÃ‡ÃƒO:</span> <div class="value" style="white-space: pre-wrap;">${session.anotacoes || session.resumo || 'Sem anotaÃ§Ãµes detalhadas.'}</div></div>
                    ${session.indicativoAlta ? `<div style="margin-top: 10px; padding: 8px; background: #ecfdf5; border-radius: 4px; color: #065f46; font-size: 10pt;"><strong>REGISTRO DE ALTA:</strong> ${session.motivoAlta}</div>` : ''}
                </div>
                ` : ''}
            `;

            const html = generateClinicalPrintHTML(
                selectedStudent,
                config,
                'ProntuÃ¡rio PsicolÃ³gico',
                contentHTML,
                { name: currentUser.name, jobTitle: currentUser.jobTitle || 'PsicÃ³logo(a)', specialty: currentUser.specialty, signatureUrl: currentUser.signatureUrl }
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
            console.error('Erro ao gerar impressÃ£o:', e);
            alert('NÃ£o foi possÃ­vel gerar o documento. Verifique as configuraÃ§Ãµes de papel timbrado.');
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
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg"><Brain size={32} className="text-purple-200" /></div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">Psicologia ClÃ­nica</h2>
                                <p className="text-purple-100 opacity-90 text-sm mt-1 flex items-center gap-2"><Lock size={12} /> Ãrea de ProntuÃ¡rio EletrÃ´nico Seguro</p>
                            </div>
                        </div>
                        {selectedStudent && (
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-1 flex gap-1 border border-white/10">
                                <button onClick={() => setActiveTab('formulario')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'formulario' ? 'bg-white text-purple-700 shadow-sm' : 'text-purple-100 hover:bg-white/10'}`}><Layout size={16} /> ProntuÃ¡rio</button>
                                {canAccessPrivate && (<button onClick={() => setActiveTab('sessoes')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'sessoes' ? 'bg-white text-purple-700 shadow-sm' : 'text-purple-100 hover:bg-white/10'}`}><History size={16} /> SessÃµes</button>)}
                            </div>
                        )}
                    </div>

                    {/* BOTÃƒO DE IMPRESSÃƒO (NOVO) */}
                    {selectedStudent && canAccessPrivate && (
                        <div className="relative z-10 mt-6 flex justify-end">
                            <button
                                onClick={() => handlePrintPsychology()}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all backdrop-blur-sm border border-white/20"
                            >
                                <Printer size={16} /> Imprimir ProntuÃ¡rio / PDF
                            </button>
                        </div>
                    )}

                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Brain size={200} /></div>
                </div>

                {!selectedStudent ? (
                    <div className="p-16 text-center bg-[#E0AAFF] flex flex-col items-center justify-center min-h-[400px]">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-200 text-purple-500"><UserIcon size={40} /></div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Selecione um Paciente</h3>
                        <p className="text-slate-500 mb-8 max-w-md">Para acessar o prontuÃ¡rio ou registrar sessÃµes, localize o aluno na lista abaixo.</p>
                        <div className="relative w-full max-w-md">
                            <select className="block w-full rounded-xl border-slate-300 shadow-lg focus:border-purple-500 focus:ring-purple-500 p-4 pl-12 border bg-white text-lg transition-all cursor-pointer hover:border-purple-300" onChange={(e) => handleStudentSelect(e.target.value)} value="">
                                <option value="">Buscar aluno...</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                            </select>
                            <Search className="absolute left-4 top-5 text-purple-500" size={20} />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col min-h-[600px] bg-[#E0AAFF]">

                        {/* --- ABA FORMULÃRIO (PRONTUÃRIO) --- */}
                        {activeTab === 'formulario' && (
                            <div className="p-8 space-y-8 animate-fadeIn max-w-4xl mx-auto w-full">

                                {/* PARTE PÃšBLICA (1-4) - VISÃVEL A TODOS */}
                                <form onSubmit={saveFullForm}>

                                    <div className="mb-8">
                                        <h3 className="text-purple-900 font-bold text-lg mb-4 flex items-center gap-2 uppercase tracking-wide opacity-80"><Globe size={18} /> Dados Gerais (PÃºblico)</h3>
                                        <FormSection title="I. IdentificaÃ§Ã£o e Encaminhamento" icon={UserIcon}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <StyledInput label="Encaminhado Por" value={publicData.identificacao.encaminhadoPor} onChange={(e: any) => handlePublicChange('identificacao', 'encaminhadoPor', e.target.value)} />
                                                <StyledInput label="Data Triagem" type="date" value={publicData.identificacao.dataTriagem} onChange={(e: any) => handlePublicChange('identificacao', 'dataTriagem', e.target.value)} />
                                                <StyledInput label="Especialista Resp." value={publicData.identificacao.especialistaResponsavel} onChange={(e: any) => handlePublicChange('identificacao', 'especialistaResponsavel', e.target.value)} />
                                            </div>
                                        </FormSection>

                                        <FormSection title="II. Motivo do Encaminhamento" icon={AlertCircle}>
                                            <StyledInput label="Queixa Principal" value={publicData.motivoEncaminhamento.queixa} onChange={(e: any) => handlePublicChange('motivoEncaminhamento', 'queixa', e.target.value)} />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <StyledInput label="HÃ¡ quanto tempo?" value={publicData.motivoEncaminhamento.haQuantoTempo} onChange={(e: any) => handlePublicChange('motivoEncaminhamento', 'haQuantoTempo', e.target.value)} />
                                                <StyledInput label="SituaÃ§Ãµes / Intensidade" value={publicData.motivoEncaminhamento.situacoesIntensidade} onChange={(e: any) => handlePublicChange('motivoEncaminhamento', 'situacoesIntensidade', e.target.value)} />
                                            </div>
                                        </FormSection>

                                        <FormSection title="III. HistÃ³rico Familiar" icon={Users}>
                                            <StyledInput label="Com quem mora?" value={publicData.historicoFamiliar.comQuemMora} onChange={(e: any) => handlePublicChange('historicoFamiliar', 'comQuemMora', e.target.value)} />
                                            <StyledInput label="RelaÃ§Ã£o Familiar" value={publicData.historicoFamiliar.relacaoFamiliar} onChange={(e: any) => handlePublicChange('historicoFamiliar', 'relacaoFamiliar', e.target.value)} />
                                            <StyledInput label="HistÃ³rico Geral" rows={3} value={publicData.historicoFamiliar.historicoGeral} onChange={(e: any) => handlePublicChange('historicoFamiliar', 'historicoGeral', e.target.value)} />
                                        </FormSection>

                                        <FormSection title="IV. HistÃ³rico Escolar" icon={School}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <StyledInput label="Desempenho" value={publicData.historicoEscolar.desempenho} onChange={(e: any) => handlePublicChange('historicoEscolar', 'desempenho', e.target.value)} />
                                                <StyledInput label="Dificuldades" value={publicData.historicoEscolar.dificuldades} onChange={(e: any) => handlePublicChange('historicoEscolar', 'dificuldades', e.target.value)} />
                                            </div>
                                            <StyledInput label="Comportamento em Sala" value={publicData.historicoEscolar.comportamentoSala} onChange={(e: any) => handlePublicChange('historicoEscolar', 'comportamentoSala', e.target.value)} />
                                        </FormSection>
                                    </div>

                                    {/* PARTE PRIVADA (5-9) - VISÃVEL APENAS PARA PSICÃ“LOGOS */}
                                    {canAccessPrivate ? (
                                        <div className="mb-8 relative">
                                            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-purple-400 rounded-full"></div>
                                            <h3 className="text-purple-900 font-bold text-lg mb-4 flex items-center gap-2 uppercase tracking-wide ml-2"><Lock size={18} /> ProntuÃ¡rio ClÃ­nico (Privado)</h3>

                                            <FormSection title="V. Comportamento Observado" icon={EyeOff} isPrivate>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <StyledInput label="Estado Emocional" value={privateData.formData.comportamentoObservado.estadoEmocional} onChange={(e: any) => handlePrivateChange('comportamentoObservado', 'estadoEmocional', e.target.value)} />
                                                    <StyledInput label="Contato Visual" value={privateData.formData.comportamentoObservado.contatoVisual} onChange={(e: any) => handlePrivateChange('comportamentoObservado', 'contatoVisual', e.target.value)} />
                                                    <StyledInput label="Linguagem" value={privateData.formData.comportamentoObservado.linguagem} onChange={(e: any) => handlePrivateChange('comportamentoObservado', 'linguagem', e.target.value)} />
                                                    <StyledInput label="ParticipaÃ§Ã£o" value={privateData.formData.comportamentoObservado.participacao} onChange={(e: any) => handlePrivateChange('comportamentoObservado', 'participacao', e.target.value)} />
                                                    <StyledInput label="Seguir InstruÃ§Ãµes" value={privateData.formData.comportamentoObservado.seguirInstrucoes} onChange={(e: any) => handlePrivateChange('comportamentoObservado', 'seguirInstrucoes', e.target.value)} />
                                                    <StyledInput label="SocializaÃ§Ã£o" value={privateData.formData.comportamentoObservado.socializacao} onChange={(e: any) => handlePrivateChange('comportamentoObservado', 'socializacao', e.target.value)} />
                                                </div>
                                            </FormSection>

                                            <FormSection title="VI. Triagem PsicolÃ³gica" icon={Activity} isPrivate>
                                                <StyledInput label="Comportamentos Observados na Triagem" rows={3} value={privateData.formData.triagemPsicologica.comportamentosObservados} onChange={(e: any) => handlePrivateChange('triagemPsicologica', 'comportamentosObservados', e.target.value)} />
                                                <StyledInput label="HipÃ³teses Iniciais" rows={2} value={privateData.formData.triagemPsicologica.hipotesesIniciais} onChange={(e: any) => handlePrivateChange('triagemPsicologica', 'hipotesesIniciais', e.target.value)} />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                                    <StyledInput label="AvaliaÃ§Ã£o Aprofundada?" value={privateData.formData.triagemPsicologica.necessidadeAvaliacaoAprofundada} onChange={(e: any) => handlePrivateChange('triagemPsicologica', 'necessidadeAvaliacaoAprofundada', e.target.value)} />
                                                    <StyledInput label="Encaminhamentos Sugeridos" value={privateData.formData.triagemPsicologica.encaminhamentosSugeridos} onChange={(e: any) => handlePrivateChange('triagemPsicologica', 'encaminhamentosSugeridos', e.target.value)} />
                                                </div>
                                            </FormSection>

                                            <FormSection title="VII. Plano TerapÃªutico" icon={Layout} isPrivate>
                                                <StyledInput label="Objetivo Principal" value={privateData.formData.planoTerapeutico.objetivoPrincipal} onChange={(e: any) => handlePrivateChange('planoTerapeutico', 'objetivoPrincipal', e.target.value)} />
                                                <StyledInput label="Metas EspecÃ­ficas" rows={3} value={privateData.formData.planoTerapeutico.metasEspecificas} onChange={(e: any) => handlePrivateChange('planoTerapeutico', 'metasEspecificas', e.target.value)} />
                                            </FormSection>

                                            <FormSection title="VIII. EvoluÃ§Ã£o Geral" icon={TrendingUp} isPrivate>
                                                <StyledInput label="Resumo da EvoluÃ§Ã£o (Texto Corrido)" rows={5} value={privateData.formData.evolucaoGeral} onChange={(e: any) => handlePrivateChange('root', 'evolucaoGeral', e.target.value)} />
                                            </FormSection>

                                            <FormSection title="IX. Encerramento / Alta" icon={Flag} isPrivate>
                                                <StyledInput label="Motivo da Alta" value={privateData.formData.encerramento.motivoAlta} onChange={(e: any) => handlePrivateChange('encerramento', 'motivoAlta', e.target.value)} />
                                                <StyledInput label="Resumo dos Ganhos" rows={2} value={privateData.formData.encerramento.resumoGanhos} onChange={(e: any) => handlePrivateChange('encerramento', 'resumoGanhos', e.target.value)} />
                                            </FormSection>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-100 p-8 rounded-xl border border-slate-200 text-center mb-8">
                                            <Lock className="mx-auto text-slate-400 mb-2" size={32} />
                                            <h4 className="text-slate-700 font-bold">ConteÃºdo Restrito</h4>
                                            <p className="text-slate-500 text-sm">As seÃ§Ãµes clÃ­nicas V a IX sÃ£o visÃ­veis apenas para o PsicÃ³logo responsÃ¡vel.</p>
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-4 sticky bottom-4">
                                        <button type="submit" className="px-8 py-3 bg-purple-700 text-white rounded-xl shadow-xl hover:bg-purple-800 font-bold flex items-center gap-2 transition-transform hover:-translate-y-1">
                                            <Save size={20} /> Salvar ProntuÃ¡rio
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* --- ABA SESSÃ•ES (EVOLUÃ‡ÃƒO) --- */}
                        {activeTab === 'sessoes' && canAccessPrivate && (
                            <div className="flex-1 bg-[#E0AAFF] p-8 space-y-6 animate-fadeIn max-w-5xl mx-auto w-full">

                                {viewMode === 'list' && (
                                    <>
                                        <div className="flex justify-between items-center bg-white/50 p-4 rounded-xl backdrop-blur-sm border border-white/40 shadow-sm">
                                            <div>
                                                <h3 className="font-bold text-purple-900 text-xl">SessÃµes Realizadas</h3>
                                                <p className="text-purple-800 text-sm">{privateData.sessions.length} registros encontrados</p>
                                            </div>
                                            <button onClick={startNewSession} className="bg-purple-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-800 shadow-md transition-all">
                                                <Plus size={20} /> Nova SessÃ£o
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            {privateData.sessions.length === 0 ? (
                                                <div className="text-center py-12 bg-white/40 rounded-2xl border-2 border-dashed border-purple-300">
                                                    <Brain size={48} className="mx-auto text-purple-400 mb-2 opacity-60" />
                                                    <p className="text-purple-900 font-medium">Nenhuma sessÃ£o registrada ainda.</p>
                                                </div>
                                            ) : (
                                                privateData.sessions.map(sess => (
                                                    <div key={sess.id} className="bg-white p-5 rounded-xl shadow-sm border border-purple-100 hover:shadow-md transition-all flex flex-col md:flex-row gap-4 relative overflow-hidden group">
                                                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${sess.humor === 'feliz' ? 'bg-green-400' :
                                                            sess.humor === 'triste' ? 'bg-blue-400' :
                                                                sess.humor === 'ansioso' ? 'bg-purple-400' :
                                                                    sess.humor === 'irritado' ? 'bg-red-400' : 'bg-slate-400'
                                                            }`}></div>

                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">SessÃ£o #{sess.numero}</span>
                                                                <span className="text-xs font-medium text-slate-400">â€¢ {new Date(sess.dataHoraISO).toLocaleDateString()}</span>
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
                                                                {sess.humor === 'feliz' ? 'ðŸ˜ƒ' :
                                                                    sess.humor === 'triste' ? 'ðŸ˜¢' :
                                                                        sess.humor === 'ansioso' ? 'ðŸ˜°' :
                                                                            sess.humor === 'irritado' ? 'ðŸ˜¡' : 'ðŸ˜'}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {/* BOTÃƒO IMPRIMIR SESSÃƒO INDIVIDUAL */}
                                                                <button onClick={() => handlePrintPsychology(sess)} className="p-2 bg-slate-100 rounded-lg hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition-colors" title="Imprimir SessÃ£o">
                                                                    <Printer size={16} />
                                                                </button>
                                                                <button onClick={() => { setCurrentSession(sess); setViewMode('form'); }} className="p-2 bg-slate-100 rounded-lg hover:bg-purple-100 text-slate-600 hover:text-purple-700 transition-colors">
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button onClick={() => deleteSession(sess.id)} className="p-2 bg-slate-100 rounded-lg hover:bg-red-100 text-slate-600 hover:text-red-700 transition-colors">
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
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="font-bold text-purple-900 text-lg">{currentSession.id ? 'Editar SessÃ£o' : 'Nova SessÃ£o'}</h3>
                                            <button onClick={() => setViewMode('list')} className="text-slate-400 hover:text-purple-600"><X size={20} /></button>
                                        </div>
                                        <form onSubmit={saveSession} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <label className="block">
                                                    <span className="text-sm font-bold text-slate-700">TÃ­tulo do Atendimento</span>
                                                    <input required type="text" className="w-full rounded-lg border-slate-300 p-2 border"
                                                        value={currentSession.titulo} onChange={e => setCurrentSession({ ...currentSession, titulo: e.target.value })} placeholder="Ex: Atendimento Individual" />
                                                </label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <label className="block">
                                                        <span className="text-sm font-bold text-slate-700">Data e Hora</span>
                                                        <input required type="datetime-local" className="w-full rounded-lg border-slate-300 p-2 border"
                                                            value={currentSession.dataHoraISO} onChange={e => setCurrentSession({ ...currentSession, dataHoraISO: e.target.value })} />
                                                    </label>
                                                    <label className="block">
                                                        <span className="text-sm font-bold text-slate-700">DuraÃ§Ã£o (min)</span>
                                                        <input type="number" className="w-full rounded-lg border-slate-300 p-2 border"
                                                            value={currentSession.duracaoMin} onChange={e => setCurrentSession({ ...currentSession, duracaoMin: parseInt(e.target.value) })} />
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <label className="block">
                                                    <span className="text-sm font-bold text-slate-700">Humor do Paciente</span>
                                                    <select className="w-full rounded-lg border-slate-300 p-2 border" value={currentSession.humor} onChange={e => setCurrentSession({ ...currentSession, humor: e.target.value as any })}>
                                                        <option value="neutro">Neutro ðŸ˜</option>
                                                        <option value="feliz">Feliz ðŸ˜ƒ</option>
                                                        <option value="triste">Triste ðŸ˜¢</option>
                                                        <option value="ansioso">Ansioso ðŸ˜°</option>
                                                        <option value="irritado">Irritado ðŸ˜¡</option>
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
                                                <span className="text-sm font-bold text-slate-700">Resumo (VisÃ­vel na lista)</span>
                                                <input type="text" className="w-full rounded-lg border-slate-300 p-2 border"
                                                    value={currentSession.resumo} onChange={e => setCurrentSession({ ...currentSession, resumo: e.target.value })} placeholder="Breve descriÃ§Ã£o do que foi trabalhado..." />
                                            </label>

                                            <label className="block">
                                                <span className="text-sm font-bold text-slate-700">AnotaÃ§Ãµes Detalhadas (Confidencial)</span>
                                                <textarea rows={6} className="w-full rounded-lg border-slate-300 p-3 border"
                                                    value={currentSession.anotacoes} onChange={e => setCurrentSession({ ...currentSession, anotacoes: e.target.value })} placeholder="Descreva a sessÃ£o, tÃ©cnicas utilizadas, observaÃ§Ãµes clÃ­nicas..." />
                                            </label>

                                            <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-center gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" className="rounded text-red-600 focus:ring-red-500 w-5 h-5"
                                                        checked={currentSession.indicativoAlta} onChange={e => setCurrentSession({ ...currentSession, indicativoAlta: e.target.checked })} />
                                                    <span className="font-bold text-red-700">Indicar Alta TerapÃªutica</span>
                                                </label>
                                                {currentSession.indicativoAlta && (
                                                    <input type="text" className="flex-1 rounded-lg border-red-200 p-2 border text-sm"
                                                        value={currentSession.motivoAlta} onChange={e => setCurrentSession({ ...currentSession, motivoAlta: e.target.value })} placeholder="Motivo da alta..." />
                                                )}
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                                <button type="button" onClick={() => setViewMode('list')} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                                                <button type="submit" className="px-6 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 font-bold shadow-md">Salvar SessÃ£o</button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- FORMULÃRIO EXCLUSIVO DE SERVIÃ‡O SOCIAL (BUSCA ATIVA) ---

const SocialServiceSessionForm: React.FC<BaseSessionFormProps> = ({ onCancel, currentUser }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [socialData, setSocialData] = useState<SocialServiceForm>(initialSocialForm);
    const [lastUpdate, setLastUpdate] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // GATEKEEPER: Apenas Assistente Social
    const isSocialWorker = currentUser.specialty === Specialty.SOCIAL_WORK || currentUser.role === 'ADMIN';

    useEffect(() => {
        SupabaseService.getStudents().then(setStudents);
    }, []);

    useEffect(() => {
        if (selectedStudent && isSocialWorker) {
            const data = extractSocialData(selectedStudent);
            setSocialData(data.formData);
            setLastUpdate(data.lastUpdate);
        }
    }, [selectedStudent, isSocialWorker]);

    const handleStudentSelect = (id: string) => {
        const student = students.find(s => s.id === id);
        setSelectedStudent(student || null);
    };

    const handleChange = (section: keyof SocialServiceForm, field: string, value: any) => {
        setSocialData(prev => ({
            ...prev,
            [section]: { ...prev[section], [field]: value }
        }));
    };

    const toggleMultiSelect = (section: keyof SocialServiceForm, field: string, item: string) => {
        setSocialData(prev => {
            const list = (prev[section] as any)[field] as string[];
            const newList = list.includes(item) ? list.filter(i => i !== item) : [...list, item];
            return {
                ...prev,
                [section]: { ...prev[section], [field]: newList }
            };
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;

        try {
            const now = new Date().toISOString();
            const dataToSave: SocialServicePrivateData = {
                formData: socialData,
                lastUpdate: now,
                professionalName: currentUser.name
            };

            // 1. Update Student Record (Private Data)
            const updatedStudent = {
                ...selectedStudent,
                clinical: {
                    ...selectedStudent.clinical,
                    social_data: dataToSave
                }
            };
            await SupabaseService.saveStudent(updatedStudent);
            setLastUpdate(now);

            // 2. Create History Log (Session)
            const historyRecord: Session = {
                id: crypto.randomUUID(),
                date: now.split('T')[0],
                specialty: Specialty.SOCIAL_WORK,
                professionalName: currentUser.name,
                notes: 'AtualizaÃ§Ã£o do formulÃ¡rio de Busca Ativa Escolar.',
                serviceType: 'Busca Ativa',
                content: { summary: 'AtualizaÃ§Ã£o de formulÃ¡rio' }
            };

            await SupabaseService.saveSession(historyRecord, selectedStudent.id, currentUser.id);

            setFeedback({ type: 'success', message: 'Busca Ativa salva com sucesso!' });

            // Update local state if needed (optional for view)

            setTimeout(() => setFeedback(null), 3000);
        } catch (err) {
            console.error(err);
            setFeedback({ type: 'error', message: 'Erro ao salvar dados.' });
        }
    };

    // --- FUNÃ‡ÃƒO DE IMPRESSÃƒO SOCIAL (NOVA) ---
    const handlePrintSocial = async () => {
        if (!selectedStudent || !isSocialWorker) return;

        try {
            const config = await SupabaseService.getPapelTimbradoConfig();
            const renderList = (list: string[]) => list && list.length > 0 ? list.join(', ') : 'Nenhum selecionado';

            const contentHTML = `
                <div style="text-align:center; margin-bottom:20px; font-weight:bold; color:#0e7490; background:#ecfeff; padding:10px; border-radius:8px; border:1px solid #0891b2;">
                    STATUS DO CASO: ${socialData.observacoes.statusCaso || 'Em Acompanhamento'}
                </div>

                <h2 class="section-title">I. IDENTIFICAÃ‡ÃƒO E ESCOLA</h2>
                <div class="box">
                    <div class="data-row"><span class="label">ALUNO MATRICULADO?</span><span class="value">${socialData.identificacao.matriculadoAtualmente || '-'}</span></div>
                    <div class="data-row"><span class="label">ESCOLA ATUAL</span><span class="value">${socialData.identificacao.nomeEscolaAtual || '-'}</span></div>
                </div>

                <h2 class="section-title">II. HISTÃ“RICO ESCOLAR</h2>
                <div class="box">
                    <div class="data-row"><span class="label">ÃšLTIMA ESCOLA</span><span class="value">${socialData.historicoEscolar.ultimaEscola || '-'}</span></div>
                    <div class="data-row"><span class="label">ANO QUE PAROU</span><span class="value">${socialData.historicoEscolar.anoParou || '-'}</span></div>
                    <div class="data-row"><span class="label">MOTIVOS DA EVASÃƒO</span><span class="value">${renderList(socialData.historicoEscolar.motivoSaida)}</span></div>
                    ${socialData.historicoEscolar.motivoSaidaOutros ? `<div class="data-row"><span class="label">OUTROS MOTIVOS</span><span class="value">${socialData.historicoEscolar.motivoSaidaOutros}</span></div>` : ''}
                </div>

                <h2 class="section-title">III. CONDIÃ‡Ã•ES SOCIAIS</h2>
                <div class="box">
                    <div class="data-row"><span class="label">RESPONSÃVEIS LEGAIS</span><span class="value">${socialData.condicoesSociais.responsaveisLegais || '-'}</span></div>
                    <div class="data-row"><span class="label">FONTE DE RENDA</span><span class="value">${socialData.condicoesSociais.fonteRenda || '-'}</span></div>
                    <div class="data-row"><span class="label">PROGRAMAS SOCIAIS</span><span class="value">${renderList(socialData.condicoesSociais.programasSociais)}</span></div>
                    <div class="data-row" style="margin-top:5px;"><span class="label" style="color:#b91c1c;">SITUAÃ‡Ã•ES DE RISCO</span><span class="value">${renderList(socialData.condicoesSociais.situacoesEnfrentadas)}</span></div>
                </div>

                <h2 class="section-title">IV. SAÃšDE</h2>
                <div class="box">
                    <div class="data-row">
                        <span class="label">ACOMP. MÃ‰DICO / PSI</span> 
                        <span class="value">${socialData.saude.acompanhamentoMedico || '-'} / ${socialData.saude.acompanhamentoPsi || '-'}</span>
                    </div>
                    <div class="data-row"><span class="label">MEDICAÃ‡ÃƒO</span><span class="value">${socialData.saude.medicacaoContinua || 'NÃ£o informada'}</span></div>
                    <div class="data-row"><span class="label">REDE DE APOIO (CAPS/CRAS/CONSELHO)</span><span class="value">${socialData.saude.atendidoCapsCras || '-'} / ${socialData.saude.conselhoTutelar || '-'}</span></div>
                </div>

                <h2 class="section-title">V. SITUAÃ‡ÃƒO ATUAL</h2>
                <div class="box">
                    <div class="data-row"><span class="label">DESEJO DE RETORNO / APOIO FAMILIAR</span><span class="value">${socialData.situacaoAtual.desejoRetornar || '-'} / ${socialData.situacaoAtual.familiaApoia || '-'}</span></div>
                    <div class="data-row"><span class="label">FATORES DIFICULTADORES</span><span class="value">${renderList(socialData.situacaoAtual.fatoresDificultam)}</span></div>
                </div>

                <h2 class="section-title">VI. PARECER TÃ‰CNICO / OBSERVAÃ‡Ã•ES</h2>
                <div class="box">
                    <div class="value" style="white-space: pre-wrap;">${socialData.observacoes.textoLivre || 'Sem observaÃ§Ãµes adicionais.'}</div>
                    <div style="margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top:10px;"><span class="label">ENCAMINHAMENTOS SUGERIDOS</span><span class="value">${renderList(socialData.observacoes.acoesRecomendadas)}</span></div>
                </div>
            `;

            const html = generateClinicalPrintHTML(
                selectedStudent,
                config,
                'Busca Ativa Escolar - RelatÃ³rio Social',
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
            console.error('Erro ao gerar impressÃ£o:', e);
            alert('Erro ao carregar configuraÃ§Ãµes de papel timbrado.');
        }
    };

    if (!isSocialWorker) {
        return (
            <div className="p-10 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600"><Lock size={40} /></div>
                <h3 className="text-xl font-bold text-slate-800">Acesso Restrito</h3>
                <p className="text-slate-500 max-w-md mt-2">Este mÃ³dulo Ã© exclusivo para profissionais de ServiÃ§o Social. Entre em contato com o administrador se acredita que isso Ã© um erro.</p>
                <button onClick={onCancel} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900">Voltar</button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto animate-fadeIn pb-12">
            {feedback && (
                <div className={`fixed top-20 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {feedback.type === 'success' ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                    <span className="font-bold">{feedback.message}</span>
                </div>
            )}

            <div className="flex items-center gap-2 mb-6 text-slate-500 hover:text-cyan-600 cursor-pointer w-fit" onClick={onCancel}>
                <X size={18} /> Cancelar e Voltar
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-900 to-cyan-900 text-white p-8">
                    <div className="flex justify-between items-start md:items-center">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20"><Heart size={32} className="text-cyan-200" /></div>
                            <div>
                                <h2 className="text-2xl font-bold uppercase tracking-wide">Busca Ativa Escolar</h2>
                                <p className="text-cyan-100 opacity-90 text-sm mt-1">FormulÃ¡rio Oficial de Acompanhamento Social</p>
                            </div>
                        </div>
                        {selectedStudent && (
                            <button
                                onClick={handlePrintSocial}
                                className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all backdrop-blur-sm border border-white/20 shadow-lg"
                            >
                                <Printer size={16} /> Imprimir RelatÃ³rio
                            </button>
                        )}
                    </div>
                </div>

                {!selectedStudent ? (
                    <div className="p-12 text-center bg-slate-50">
                        <h3 className="text-lg font-bold text-slate-700 mb-4">Selecione o aluno para iniciar a Busca Ativa</h3>
                        <div className="relative w-full max-w-md mx-auto">
                            <select className="block w-full rounded-xl border-slate-300 p-4 pl-12 border bg-white shadow-sm" onChange={(e) => handleStudentSelect(e.target.value)} value="">
                                <option value="">Buscar aluno...</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                            </select>
                            <Search className="absolute left-4 top-5 text-slate-400" size={20} />
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="p-8 space-y-8 bg-slate-50">
                        {lastUpdate && (
                            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 flex items-center gap-2 mb-4 font-medium">
                                <History size={14} /> Ãšltima atualizaÃ§Ã£o em {new Date(lastUpdate).toLocaleString()} por um profissional autorizado.
                            </div>
                        )}

                        {/* I. IdentificaÃ§Ã£o */}
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-cyan-600 border-y border-r border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                                <UserIcon size={20} className="text-cyan-700" />
                                <h3 className="font-bold text-lg text-cyan-900">I. IdentificaÃ§Ã£o do Aluno</h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <div><span className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Nome</span> <span className="font-bold text-slate-900 text-lg">{selectedStudent.fullName}</span></div>
                                    <div><span className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Idade</span> <span className="font-bold text-slate-900">{new Date().getFullYear() - new Date(selectedStudent.birthDate).getFullYear()} anos</span></div>
                                    <div><span className="block text-xs font-bold text-slate-500 uppercase tracking-wide">ResponsÃ¡vel</span> <span className="font-bold text-slate-900">{selectedStudent.guardians[0]?.name}</span></div>
                                    <div><span className="block text-xs font-bold text-slate-500 uppercase tracking-wide">EndereÃ§o</span> <span className="font-bold text-slate-900">{selectedStudent.address.street}, {selectedStudent.address.number}</span></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <StyledInput label="EstÃ¡ matriculado atualmente?" value={socialData.identificacao.matriculadoAtualmente} onChange={(e: any) => handleChange('identificacao', 'matriculadoAtualmente', e.target.value)} placeholder="Sim / NÃ£o" />
                                    <StyledInput label="Nome da Escola Atual (se houver)" value={socialData.identificacao.nomeEscolaAtual} onChange={(e: any) => handleChange('identificacao', 'nomeEscolaAtual', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* II. HistÃ³rico Escolar */}
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-cyan-600 border-y border-r border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                                <Layout size={20} className="text-cyan-700" />
                                <h3 className="font-bold text-lg text-cyan-900">II. HistÃ³rico Escolar</h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <StyledInput label="JÃ¡ frequentou escola?" value={socialData.historicoEscolar.frequentouEscola} onChange={(e: any) => handleChange('historicoEscolar', 'frequentouEscola', e.target.value)} />
                                    <StyledInput label="Ãšltima Escola" value={socialData.historicoEscolar.ultimaEscola} onChange={(e: any) => handleChange('historicoEscolar', 'ultimaEscola', e.target.value)} />
                                    <StyledInput label="Ãšltimo Ano Cursado" value={socialData.historicoEscolar.ultimoAno} onChange={(e: any) => handleChange('historicoEscolar', 'ultimoAno', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <StyledInput label="Ano em que parou" value={socialData.historicoEscolar.anoParou} onChange={(e: any) => handleChange('historicoEscolar', 'anoParou', e.target.value)} />
                                    <StyledInput label="Idade em que saiu" value={socialData.historicoEscolar.idadeSaiu} onChange={(e: any) => handleChange('historicoEscolar', 'idadeSaiu', e.target.value)} />
                                </div>
                                <div className="mt-6">
                                    <label className="block text-sm font-bold text-slate-800 uppercase mb-3 border-b border-slate-100 pb-2">Motivo(s) da SaÃ­da</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {['Falta de transporte', 'DoenÃ§a', 'Gravidez', 'Trabalho', 'MudanÃ§a de endereÃ§o', 'ViolÃªncia na escola', 'Dificuldade de aprendizado', 'Bullying'].map(opt => (
                                            <label key={opt} className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border transition-all ${socialData.historicoEscolar.motivoSaida.includes(opt) ? 'bg-cyan-600 border-cyan-700 text-white shadow-md' : 'bg-white border-slate-200 hover:border-cyan-300 text-slate-600'}`}>
                                                <input type="checkbox" checked={socialData.historicoEscolar.motivoSaida.includes(opt)} onChange={() => toggleMultiSelect('historicoEscolar', 'motivoSaida', opt)} className="hidden" />
                                                <span className="text-sm font-semibold">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="mt-4"><StyledInput label="Outros Motivos" value={socialData.historicoEscolar.motivoSaidaOutros} onChange={(e: any) => handleChange('historicoEscolar', 'motivoSaidaOutros', e.target.value)} /></div>
                                </div>
                            </div>
                        </div>

                        {/* III. CondiÃ§Ãµes Sociais */}
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-cyan-600 border-y border-r border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                                <Users size={20} className="text-cyan-700" />
                                <h3 className="font-bold text-lg text-cyan-900">III. CondiÃ§Ãµes Familiares e Sociais</h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <StyledInput label="ResponsÃ¡veis Legais" value={socialData.condicoesSociais.responsaveisLegais} onChange={(e: any) => handleChange('condicoesSociais', 'responsaveisLegais', e.target.value)} />
                                    <StyledInput label="Principal Fonte de Renda" value={socialData.condicoesSociais.fonteRenda} onChange={(e: any) => handleChange('condicoesSociais', 'fonteRenda', e.target.value)} />
                                </div>
                                <div className="mt-4">
                                    <label className="block text-sm font-bold text-slate-800 uppercase mb-3 border-b border-slate-100 pb-2">Programas Sociais</label>
                                    <div className="flex gap-4 flex-wrap">
                                        {['Bolsa FamÃ­lia', 'BPC', 'CRAS', 'Tarifa Social'].map(opt => (
                                            <label key={opt} className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border transition-all ${socialData.condicoesSociais.programasSociais.includes(opt) ? 'bg-green-600 border-green-700 text-white shadow-md' : 'bg-white border-slate-200 hover:border-green-300 text-slate-600'}`}>
                                                <input type="checkbox" checked={socialData.condicoesSociais.programasSociais.includes(opt)} onChange={() => toggleMultiSelect('condicoesSociais', 'programasSociais', opt)} className="hidden" />
                                                <span className="text-sm font-semibold">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                    <StyledInput label="DeficiÃªncia na Casa (Quem?)" value={socialData.condicoesSociais.deficienciaCasa} onChange={(e: any) => handleChange('condicoesSociais', 'deficienciaCasa', e.target.value)} />
                                    <StyledInput label="DeficiÃªncia na CrianÃ§a (Qual?)" value={socialData.condicoesSociais.criancaDeficiencia} onChange={(e: any) => handleChange('condicoesSociais', 'criancaDeficiencia', e.target.value)} />
                                </div>
                                <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-100">
                                    <label className="block text-sm font-bold text-red-700 uppercase mb-3 flex items-center gap-2">
                                        <AlertTriangle size={16} /> SituaÃ§Ãµes de Risco Enfrentadas
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {['SituaÃ§Ã£o de Rua', 'ViolÃªncia DomÃ©stica', 'Trabalho Infantil', 'DependÃªncia QuÃ­mica', 'Conflito com Lei', 'Abuso Sexual', 'NegligÃªncia'].map(opt => (
                                            <label key={opt} className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border transition-all ${socialData.condicoesSociais.situacoesEnfrentadas.includes(opt) ? 'bg-red-600 border-red-700 text-white shadow-md' : 'bg-white border-slate-200 hover:border-red-300 text-slate-600'}`}>
                                                <input type="checkbox" checked={socialData.condicoesSociais.situacoesEnfrentadas.includes(opt)} onChange={() => toggleMultiSelect('condicoesSociais', 'situacoesEnfrentadas', opt)} className="hidden" />
                                                <span className="text-sm font-semibold">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* IV. SaÃºde */}
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-cyan-600 border-y border-r border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                                <Activity size={20} className="text-cyan-700" />
                                <h3 className="font-bold text-lg text-cyan-900">IV. SituaÃ§Ã£o de SaÃºde</h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <StyledInput label="Acomp. MÃ©dico Regular?" value={socialData.saude.acompanhamentoMedico} onChange={(e: any) => handleChange('saude', 'acompanhamentoMedico', e.target.value)} placeholder="Sim/NÃ£o" />
                                    <StyledInput label="MedicaÃ§Ã£o ContÃ­nua?" value={socialData.saude.medicacaoContinua} onChange={(e: any) => handleChange('saude', 'medicacaoContinua', e.target.value)} placeholder="Sim/NÃ£o e Qual" />
                                    <StyledInput label="Acomp. PsicolÃ³gico?" value={socialData.saude.acompanhamentoPsi} onChange={(e: any) => handleChange('saude', 'acompanhamentoPsi', e.target.value)} placeholder="Sim/NÃ£o" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <StyledInput label="JÃ¡ acionou Conselho Tutelar?" value={socialData.saude.conselhoTutelar} onChange={(e: any) => handleChange('saude', 'conselhoTutelar', e.target.value)} />
                                    <StyledInput label="Atendido por CAPS/CRAS?" value={socialData.saude.atendidoCapsCras} onChange={(e: any) => handleChange('saude', 'atendidoCapsCras', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* V. SituaÃ§Ã£o Atual */}
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-cyan-600 border-y border-r border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                                <Flag size={20} className="text-cyan-700" />
                                <h3 className="font-bold text-lg text-cyan-900">V. SituaÃ§Ã£o Atual e Retorno</h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <StyledInput label="Desejo de Retornar Ã  Escola?" value={socialData.situacaoAtual.desejoRetornar} onChange={(e: any) => handleChange('situacaoAtual', 'desejoRetornar', e.target.value)} />
                                    <StyledInput label="FamÃ­lia Apoia o Retorno?" value={socialData.situacaoAtual.familiaApoia} onChange={(e: any) => handleChange('situacaoAtual', 'familiaApoia', e.target.value)} />
                                </div>
                                <div className="mt-4">
                                    <label className="block text-sm font-bold text-slate-800 uppercase mb-3 border-b border-slate-100 pb-2">Fatores que Dificultam</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['Falta de Vaga', 'DistÃ¢ncia', 'Falta de Transporte', 'Necessidade de Trabalhar', 'Bullying', 'DoenÃ§a na FamÃ­lia'].map(opt => (
                                            <label key={opt} className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border transition-all ${socialData.situacaoAtual.fatoresDificultam.includes(opt) ? 'bg-orange-500 border-orange-600 text-white shadow-md' : 'bg-white border-slate-200 hover:border-orange-300 text-slate-600'}`}>
                                                <input type="checkbox" checked={socialData.situacaoAtual.fatoresDificultam.includes(opt)} onChange={() => toggleMultiSelect('situacaoAtual', 'fatoresDificultam', opt)} className="hidden" />
                                                <span className="text-sm font-semibold">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="mt-4"><StyledInput label="Outros Fatores" value={socialData.situacaoAtual.fatoresDificultamOutros} onChange={(e: any) => handleChange('situacaoAtual', 'fatoresDificultamOutros', e.target.value)} /></div>
                                </div>
                            </div>
                        </div>

                        {/* VI. ObservaÃ§Ãµes */}
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-cyan-600 border-y border-r border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                                <FileText size={20} className="text-cyan-700" />
                                <h3 className="font-bold text-lg text-cyan-900">VI. ObservaÃ§Ãµes e Encaminhamentos</h3>
                            </div>
                            <div className="p-6">
                                <div className="mb-4">
                                    <label className="block text-sm font-bold text-slate-800 uppercase mb-1.5 ml-1">Status do Caso</label>
                                    <select
                                        className="w-full rounded-lg border-slate-300 bg-slate-50 p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-cyan-500 transition-all"
                                        value={socialData.observacoes.statusCaso}
                                        onChange={(e) => handleChange('observacoes', 'statusCaso', e.target.value)}
                                    >
                                        <option>Em Acompanhamento</option>
                                        <option>Aguardando Visita</option>
                                        <option>Encaminhado para Rede</option>
                                        <option>ConcluÃ­do / Arquivado</option>
                                    </select>
                                </div>
                                <StyledInput label="ConsideraÃ§Ãµes Relevantes (Texto Livre)" rows={6} value={socialData.observacoes.textoLivre} onChange={(e: any) => handleChange('observacoes', 'textoLivre', e.target.value)} />
                                <div className="mt-4">
                                    <label className="block text-sm font-bold text-slate-800 uppercase mb-3 border-b border-slate-100 pb-2">AÃ§Ãµes Recomendadas</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['Encaminhamento ao CRAS', 'Encaminhamento Ã  SaÃºde', 'Visita da Escola', 'Contato com Conselho Tutelar', 'MatrÃ­cula Imediata', 'InserÃ§Ã£o em Programas Sociais'].map(opt => (
                                            <label key={opt} className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border transition-all ${socialData.observacoes.acoesRecomendadas.includes(opt) ? 'bg-cyan-700 border-cyan-800 text-white shadow-md' : 'bg-white border-slate-200 hover:border-cyan-300 text-slate-600'}`}>
                                                <input type="checkbox" checked={socialData.observacoes.acoesRecomendadas.includes(opt)} onChange={() => toggleMultiSelect('observacoes', 'acoesRecomendadas', opt)} className="hidden" />
                                                <span className="text-sm font-semibold">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 sticky bottom-4">
                            <button type="submit" className="px-8 py-4 bg-cyan-700 text-white rounded-xl shadow-xl hover:bg-cyan-800 font-bold flex items-center gap-2 transition-transform hover:-translate-y-1 text-lg">
                                <Save size={24} /> Salvar Busca Ativa
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

// --- EXPORTS DE PÁGINAS ---
export const PsychologyDashboardPage: React.FC<{ onNavigateNew: () => void; currentUser: User; preSelectedStudent?: Student }> = (props) => (
    <PsychologySpecificDashboard title="Psicologia Clínica" specialty={Specialty.PSYCHOLOGY} {...props} />
);

export const PsychologySessionFormPage: React.FC<{ onCancel: () => void; currentUser: User }> = (props) => (
    <PsychologySessionForm specialty={Specialty.PSYCHOLOGY} {...props} />
);

export const SocialServiceDashboardPage: React.FC<{ onNavigateNew: () => void; currentUser: User; preSelectedStudent?: Student }> = (props) => (
    <SocialServiceSpecificDashboard title="Serviço Social" specialty={Specialty.SOCIAL_WORK} {...props} />
);

export const SocialServiceSessionFormPage: React.FC<{ onCancel: () => void; currentUser: User }> = (props) => (
    <SocialServiceSessionForm specialty={Specialty.SOCIAL_WORK} {...props} />
);

export const SpeechTherapyDashboardPage: React.FC<{ onNavigateNew: () => void; currentUser: User; preSelectedStudent?: Student }> = (props) => (
    <SpeechTherapySpecificDashboard title="Fonoaudiologia" specialty={Specialty.SPEECH_THERAPY} {...props} />
);
export const SpeechTherapySessionFormPage: React.FC<{ onCancel: () => void; currentUser: User }> = (props) => (
    <SpeechTherapySpecificDashboard title="Fonoaudiologia" specialty={Specialty.SPEECH_THERAPY} onNavigateNew={() => { }} currentUser={props.currentUser} />
);

export const OccupationalTherapyDashboardPage: React.FC<{ onNavigateNew: () => void; currentUser: User; preSelectedStudent?: Student }> = (props) => (
    <OccupationalTherapySpecificDashboard title="Terapia Ocupacional" specialty={Specialty.OCCUPATIONAL_THERAPY} {...props} />
);

export const OccupationalTherapySessionFormPage: React.FC<{ onCancel: () => void; currentUser: User }> = (props) => (
    <OccupationalTherapySpecificDashboard title="Terapia Ocupacional" specialty={Specialty.OCCUPATIONAL_THERAPY} onNavigateNew={() => { }} currentUser={props.currentUser} />
);

export const PsychopedagogyDashboardPage: React.FC<{ onNavigateNew: () => void; currentUser: User; preSelectedStudent?: Student }> = (props) => (
    <PsychopedagogySpecificDashboard title="Psicopedagogia" specialty={Specialty.PSYCHOPEDAGOGY} {...props} />
);
export const PsychopedagogySessionFormPage: React.FC<{ onCancel: () => void; currentUser: User }> = (props) => (
    // Redirects back to dashboard since the dashboard now handles sessions internally
    <PsychopedagogySpecificDashboard title="Psicopedagogia" specialty={Specialty.PSYCHOPEDAGOGY} onNavigateNew={() => { }} currentUser={props.currentUser} />
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

// ---DASHBOARD ESPECÃFICO DE NUTRIÃ‡ÃƒO ---
const NutritionSpecificDashboard: React.FC<BaseDashboardProps & { preSelectedStudent?: Student }> = ({ title, onNavigateNew, currentUser, preSelectedStudent }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(preSelectedStudent || null);
    const [nutritionData, setNutritionData] = useState<NutritionPrivateData>(initialNutritionData);
    const [loading, setLoading] = useState(false);

    // Session State
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
    const [currentSession, setCurrentSession] = useState<Partial<NutritionSession>>({});

    const isNutritionist = currentUser.specialty === Specialty.NUTRITION || currentUser.role === 'ADMIN';

    useEffect(() => {
        if (preSelectedStudent) setSelectedStudent(preSelectedStudent);
    }, [preSelectedStudent]);

    useEffect(() => {
        const loadStudents = async () => {
            setLoading(true);
            const data = await SupabaseService.getStudents();
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
                        ...student.clinical.nutrition_data,
                        anamnesis: nutritionData.anamnesis
                    }
                }
            };
            await SupabaseService.saveStudent(updatedStudent);
            alert('Anamnese salva com sucesso!');
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar.');
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
            alert('Atendimento salvo com sucesso!');
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar atendimento.');
        }
    };

    if (!isNutritionist) {
        return (
            <div className="p-10 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600"><Lock size={40} /></div>
                <h3 className="text-xl font-bold text-slate-800">Acesso Restrito</h3>
                <p className="text-slate-500 max-w-md mt-2">MÃ³dulo exclusivo para NutriÃ§Ã£o.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-2xl text-green-600"><Activity size={32} /></div>
                    {title}
                </h1>

                <div className="relative min-w-[300px]">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                    <select
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-green-500 outline-none bg-white appearance-none"
                        onChange={(e) => handleStudentSelect(e.target.value)}
                        value={selectedStudent?.id || ''}
                    >
                        <option value="">Selecione um paciente...</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                    </select>
                </div>
            </div>

            {selectedStudent ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* LEFT: INFO CARD & ANAMNESIS */}
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
                                <h4 className="text-xs font-bold text-green-800 uppercase mb-2">Ãšltima AvaliaÃ§Ã£o</h4>
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
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText size={18} /> Anamnese RÃ¡pida</h3>
                            <div className="space-y-4">
                                <StyledInput label="HÃ¡bitos Alimentares" rows={2} value={nutritionData.anamnesis.eatingHabits} onChange={(e: any) => handleAnamnesisChange('eatingHabits', e.target.value)} />
                                <StyledInput label="Alergias" value={nutritionData.anamnesis.allergies} onChange={(e: any) => handleAnamnesisChange('allergies', e.target.value)} />
                                <StyledInput label="AversÃµes" value={nutritionData.anamnesis.rejectedFoods} onChange={(e: any) => handleAnamnesisChange('rejectedFoods', e.target.value)} />
                                <StyledInput label="HistÃ³rico Familiar" rows={2} value={nutritionData.anamnesis.familyHistory} onChange={(e: any) => handleAnamnesisChange('familyHistory', e.target.value)} />
                                <button onClick={handleSaveAnamnesis} className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900">Salvar Anamnese</button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: SESSIONS & EVOLUTION */}
                    <div className="lg:col-span-3">
                        {viewMode === 'list' ? (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                    <h3 className="font-bold text-slate-800 text-xl">HistÃ³rico de Atendimentos</h3>
                                    <button onClick={() => { setCurrentSession({}); setViewMode('form'); }} className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 flex items-center gap-2 shadow-lg shadow-green-200">
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
                                                        <button onClick={() => { setCurrentSession(session); setViewMode('form'); }} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Edit2 size={18} /></button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                                    <div className="bg-slate-50 p-3 rounded-lg">
                                                        <span className="block text-xs font-bold text-slate-400 uppercase">Antropometria</span>
                                                        <span className="font-medium text-slate-700">Peso: {session.weight}kg | Alt: {session.height}m | IMC: {session.bmi}</span>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <span className="block text-xs font-bold text-slate-400 uppercase">EvoluÃ§Ã£o</span>
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
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-slate-800 text-xl">{currentSession.id ? 'Editar Consulta' : 'Nova Consulta'}</h3>
                                    <button onClick={() => setViewMode('list')} className="text-slate-400 hover:text-slate-800"><X size={24} /></button>
                                </div>

                                <form onSubmit={handleSaveSession} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <label className="block">
                                            <span className="text-sm font-bold text-slate-700 block mb-2">Plano Alimentar</span>
                                            <textarea rows={4} className="w-full rounded-lg border-slate-300 p-3 border"
                                                value={currentSession.dietPlan} onChange={e => setCurrentSession({ ...currentSession, dietPlan: e.target.value })} placeholder="CafÃ©: ... AlmoÃ§o: ..." />
                                        </label>
                                        <label className="block">
                                            <span className="text-sm font-bold text-slate-700 block mb-2">EvoluÃ§Ã£o / Queixas</span>
                                            <textarea rows={4} className="w-full rounded-lg border-slate-300 p-3 border"
                                                value={currentSession.evolution} onChange={e => setCurrentSession({ ...currentSession, evolution: e.target.value })} placeholder="Paciente relatou..." />
                                        </label>
                                    </div>

                                    <label className="block">
                                        <span className="text-sm font-bold text-slate-700 block mb-2">RecomendaÃ§Ãµes / OrientaÃ§Ãµes</span>
                                        <textarea rows={2} className="w-full rounded-lg border-slate-300 p-3 border"
                                            value={currentSession.recommendations} onChange={e => setCurrentSession({ ...currentSession, recommendations: e.target.value })} />
                                    </label>

                                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                        <button type="button" onClick={() => setViewMode('list')} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                                        <button type="submit" className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200">Salvar Consulta</button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                        <Search size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Selecione um paciente para comeÃ§ar</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">Use a barra de busca acima para encontrar a ficha do aluno e iniciar o atendimento nutricional.</p>
                </div>
            )}
        </div>
    );
};

export const NutritionDashboardPage: React.FC<{ onNavigateNew: () => void; currentUser: User; preSelectedStudent?: Student }> = (props) => (
    <NutritionSpecificDashboard title="Nutrição Clínica" specialty={Specialty.NUTRITION} {...props} />
);

export const NutritionSessionFormPage: React.FC<{ onCancel: () => void; currentUser: User }> = (props) => (
    <NutritionSpecificDashboard title="NutriÃ§Ã£o ClÃ­nica" specialty={Specialty.NUTRITION} onNavigateNew={() => { }} currentUser={props.currentUser} />
);
