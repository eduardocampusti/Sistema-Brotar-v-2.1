
import React, { useState, useEffect } from 'react';
import { User, Student, Specialty, SavedDocument } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { GeminiService, TemplateService } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';
import { FileText, Printer, Copy, Sparkles, User as UserIcon, ChevronDown, Loader2, FileCheck, AlertCircle, Edit3, Hash, History, Eye, Trash2, Calendar, Layout, Building2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AtestadoComparecimento } from './AtestadoComparecimento';

// Documento administrativo que NÃO passa pela IA — roteado para componente próprio
const ATESTADO_COMPARECIMENTO = 'Atestado de Comparecimento';
const OFICIO_ORIENTACAO = 'Ofício de Orientação — Encaminhamento Multidisciplinar';

interface DocumentGeneratorProps {
  currentUser: User;
}

// --- LISTA DE MODELOS ---
const DOCS_COMUM = ["Declaração de Atendimento", "Encaminhamento Geral", "Relatório Resumido", "Termo de Autorização de Uso de Imagem e Vídeo", "Declaração Simples", "Carta de Encaminhamento Intersetorial"];
const DOCS_PSICOLOGIA = ["Anamnese Psicológica", "Relatório Psicológico Técnico", "Evolução Psicológica", "Parecer Psicológico", "Declaração de Sigilo Profissional"];
const DOCS_SERVICO_SOCIAL = ["Anamnese Social", "Estudo Social", "Relatório de Busca Ativa", "Relatório Social de Visita Domiciliar", "Ofício ao Conselho Tutelar", "Plano de Acompanhamento Familiar"];
const DOCS_PSICOPEDAGOGIA = ["Anamnese Psicopedagógica", "Avaliação Psicopedagógica", "Parecer Psicopedagógico", "Plano de Intervenção", "Relatório de Evolução", "Relatório Semestral Psicopedagógico"];
const DOCS_FONOAUDIOLOGIA = ["Anamnese Fonoaudiológica", "Avaliação Fonoaudiológica", "Relatório Fonoaudiológico", "Evolução Fonoaudiológica", "Parecer Fonoaudiológico", "Encaminhamento Fonoaudiológico", "Relatório de Alta Fonoaudiológica"];
const DOCS_TERAPIA_OCUPACIONAL = ["Anamnese de Terapia Ocupacional", "Relatório Sensorial", "Relatório de Terapia Ocupacional", "Evolução em Terapia Ocupacional", "Parecer de Terapia Ocupacional", "Plano de Intervenção Ocupacional", "Relatório de Alta em Terapia Ocupacional"];
const DOCS_FISIOTERAPIA = ["Anamnese Fisioterapêutica", "Avaliação Fisioterapêutica", "Relatório Fisioterapêutico", "Evolução Fisioterapêutica", "Parecer Fisioterapêutico", "Plano de Reabilitação", "Relatório de Alta Fisioterapêutica"];
const DOCS_NUTRICAO = ["Anamnese Nutricional", "Avaliação Nutricional", "Relatório Nutricional", "Evolução Nutricional", "Plano Alimentar Institucional", "Parecer Nutricional", "Relatório de Acompanhamento Nutricional"];

// Documentos exclusivos para Secretaria (administrativos/gestão)
const DOCS_SECRETARIA = [
  // Comunicações oficiais
  "Ofício de Encaminhamento",
  "Ofício Informativo",
  "Memorando Interno",
  "Circular Informativa",
  // Declarações administrativas
  "Declaração de Matrícula",
  "Declaração de Frequência",
  "Declaração de Vaga em Atendimento Especializado",
  // Convocações e comunicados
  "Convocação de Responsável",
  "Comunicado à Família",
  "Comunicado à Escola",
  // Relatórios administrativos
  "Relatório de Atendimentos do Mês",
  "Relatório de Frequência do Aluno",
  "Relatório de Encaminhamentos Realizados",
  // Termos
  "Termo de Ciência e Responsabilidade",
  "Termo de Compromisso Familiar",
  // Documento com valor jurídico (NÃO usa IA — fluxo próprio)
  ATESTADO_COMPARECIMENTO,
];

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({ currentUser }) => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'generator' | 'history'>('generator');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [docType, setDocType] = useState('');
  const [context, setContext] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [documentCode, setDocumentCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<SavedDocument[]>([]);
  const [showAtestado, setShowAtestado] = useState(false);

  // Quem pode emitir o Atestado de Comparecimento (documento com valor jurídico)
  const canEmitAtestado = ['ADMIN', 'EDUCATION_SECRETARY', 'SECRETARIA_SEDE', 'SECRETARIA_COCAL', 'SPECIALIST']
    .includes((currentUser.role || '').toUpperCase());

  const canEmitOficio = ['ADMIN', 'EDUCATION_SECRETARY', 'SPECIALIST', 'SECRETARIA_SEDE']
    .includes((currentUser.role || '').toUpperCase());

  useEffect(() => {
    const loadStudents = async () => {
      if (currentUser.role === 'SPECIALIST') {
        const data = await SupabaseService.getStudentsForUser(currentUser);
        setStudents(data);
      } else {
        const data = await SupabaseService.getStudents();
        setStudents(data);
      }
    };
    loadStudents();
  }, [currentUser.id, currentUser.role]);

  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedStudentId || !docType) {
      setError("Por favor, selecione um aluno e o tipo de documento desejado.");
      return;
    }


    // Re-fetch student data to ensure we have the latest Clinical Info (including IPO)
    // This is crucial because DocumentGenerator might have stale data from initial load
    const freshStudentList = await SupabaseService.getStudentsForUser(currentUser);
    const freshStudent = freshStudentList.find(s => s.id === selectedStudentId);

    if (!freshStudent) {
      setError("Erro ao atualizar dados do aluno. Tente novamente.");
      return;
    }

    const student = freshStudent; // Use the fresh one

    setIsGenerating(true);
    setError(null);
    const newCode = `BRT-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;

    // Ofício de Orientação — template fixo, sem IA
    if (docType === OFICIO_ORIENTACAO) {
      const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
      const now = new Date();
      const dataExtenso = `${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;
      const nomeUsuario = 'Carlos Eduardo Campos de Araújo';
      const cargoUsuario = 'Coordenador de Educação Especial e Inclusiva';
      const numOficio = context.trim() || '____';

      const oficioHtml = `
<div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.8; color: #000; text-align: justify;">
  <p style="text-align: right; font-weight: bold; font-size: 13pt; margin-bottom: 24px;">OFÍCIO Nº ${numOficio}/${now.getFullYear()}</p>

  <p style="margin-bottom: 4px;">Secretaria Municipal de Educação</p>
  <p style="margin-bottom: 4px;">Centro Multidisciplinar</p>
  <p style="margin-bottom: 24px;">Brotas de Macaúbas – BA</p>

  <p style="margin-bottom: 24px;"><strong>Assunto:</strong> Orientação para encaminhamento de estudantes à Equipe Multidisciplinar</p>

  <p style="margin-bottom: 4px;">Às</p>
  <p style="margin-bottom: 24px;">Unidades Escolares da Rede Municipal de Ensino</p>

  <p style="margin-bottom: 16px;">Prezados(as) Diretores(as), Coordenadores(as) Pedagógicos(as) e Professores(as),</p>

  <p style="margin-bottom: 16px; text-indent: 2em;">A Secretaria Municipal de Educação de Brotas de Macaúbas, por meio da Equipe Multidisciplinar do Centro Multidisciplinar, vem, por meio deste, orientar as Unidades Escolares quanto aos procedimentos necessários para o encaminhamento de crianças e estudantes para avaliação e/ou acompanhamento multidisciplinar.</p>

  <p style="margin-bottom: 16px; text-indent: 2em;">Considerando que a escola constitui um espaço privilegiado de observação do desenvolvimento, da aprendizagem, da interação social e do comportamento do estudante, informamos que todo encaminhamento realizado à Equipe Multidisciplinar deverá ser acompanhado do respectivo <strong>RELATÓRIO ESCOLAR</strong>.</p>

  <p style="margin-bottom: 16px; text-indent: 2em;">O relatório tem como finalidade fornecer informações que auxiliem os profissionais da equipe na compreensão das necessidades apresentadas pelo estudante, contribuindo para uma avaliação mais ampla, contextualizada e adequada à sua realidade escolar.</p>

  <p style="margin-bottom: 8px; text-indent: 2em;">O documento deverá contemplar, sempre que possível, informações relacionadas a:</p>

  <ul style="margin-left: 40px; margin-bottom: 16px; list-style-type: disc;">
    <li>identificação do estudante e da unidade escolar;</li>
    <li>ano/série e turma em que se encontra matriculado;</li>
    <li>motivo que levou a escola a solicitar o encaminhamento;</li>
    <li>aspectos relacionados à aprendizagem e ao desempenho pedagógico;</li>
    <li>comportamento observado no ambiente escolar;</li>
    <li>interação com professores, colegas e demais profissionais;</li>
    <li>comunicação, participação e autonomia;</li>
    <li>frequência escolar;</li>
    <li>potencialidades, habilidades e interesses apresentados pelo estudante;</li>
    <li>dificuldades observadas;</li>
    <li>estratégias e intervenções pedagógicas já realizadas pela escola;</li>
    <li>resultados percebidos após as intervenções;</li>
    <li>informações adicionais consideradas relevantes para a avaliação multidisciplinar.</li>
  </ul>

  <p style="margin-bottom: 16px; text-indent: 2em;">Ressaltamos que o relatório não possui a finalidade de estabelecer diagnóstico, mas de registrar, de maneira objetiva e responsável, as observações realizadas pela equipe escolar no cotidiano do estudante.</p>

  <p style="text-align: center; font-weight: bold; font-size: 13pt; margin: 24px 0 16px;">ENCAMINHAMENTO PELO SISTEMA BROTAR</p>

  <p style="margin-bottom: 16px; text-indent: 2em;">Para facilitar e padronizar esse processo, o Sistema Brotar dispõe do módulo de Encaminhamento Escolar, no qual a própria escola poderá registrar o encaminhamento e preencher o Relatório Escolar, fornecendo as informações necessárias para análise da Equipe Multidisciplinar.</p>

  <p style="margin-bottom: 16px; text-indent: 2em;">Dessa forma, solicitamos que os encaminhamentos sejam realizados por meio do Sistema Brotar, com o preenchimento completo das informações solicitadas.</p>

  <p style="margin-bottom: 16px; text-indent: 2em;">Encaminhamentos sem o Relatório Escolar devidamente preenchido poderão ser devolvidos à Unidade Escolar para complementação das informações antes do prosseguimento do atendimento.</p>

  <p style="margin-bottom: 16px; text-indent: 2em;">A adoção deste procedimento busca fortalecer a articulação entre escola, família e Equipe Multidisciplinar, proporcionando maior organização dos atendimentos e permitindo que cada estudante seja compreendido considerando sua realidade, suas necessidades e suas potencialidades.</p>

  <p style="margin-bottom: 24px; text-indent: 2em;">Contamos com a colaboração de todos para o cumprimento desta orientação e para o fortalecimento do trabalho integrado em benefício dos nossos estudantes.</p>

  <p style="margin-bottom: 40px;">Atenciosamente,</p>

  <p style="text-align: center; margin-bottom: 4px; font-weight: bold;">${nomeUsuario}</p>
  <p style="text-align: center; margin-bottom: 4px;">${cargoUsuario}</p>
  <p style="text-align: center; margin-bottom: 4px;">Secretaria Municipal de Educação / Centro Multidisciplinar</p>
  <p style="text-align: center; margin-bottom: 24px;">Brotas de Macaúbas – BA</p>

  <p style="text-align: right; margin-top: 16px;">Brotas de Macaúbas, ${dataExtenso}.</p>
</div>`.trim();

      setGeneratedContent(oficioHtml);
      setDocumentCode(newCode);

      const newDoc: SavedDocument = {
        id: crypto.randomUUID(),
        studentId: student.id,
        studentName: student.fullName,
        docType,
        code: newCode,
        content: oficioHtml,
        createdAt: new Date().toISOString(),
        professionalName: currentUser.name
      };

      try {
        await SupabaseService.saveDocument(newDoc);
        if (activeTab === 'history') {
          const data = await SupabaseService.getDocuments(selectedStudentId);
          setHistory(data);
        }
      } catch (saveErr: any) {
        console.error('Erro ao salvar ofício:', saveErr);
        setError('O ofício foi gerado, mas não foi possível salvar no histórico.');
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    let content: string;
    let usedTemplateFallback = false;

    try {
      content = await GeminiService.generateOfficialDocument(
        docType, freshStudent, currentUser.name, currentUser.jobTitle || currentUser.role, context
      );
    } catch (err: any) {
      console.warn('IA indisponível, ativando fallback de templates:', err);
      const professionalRole = currentUser.specialty || currentUser.jobTitle || currentUser.role;
      content = TemplateService.getFallbackDocument(
        docType, student, currentUser.name, professionalRole, context
      );
      usedTemplateFallback = true;
    }

    setGeneratedContent(content);
    setDocumentCode(newCode);

    const newDoc: SavedDocument = {
      id: crypto.randomUUID(),
      studentId: student.id,
      studentName: student.fullName,
      docType,
      code: newCode,
      content,
      createdAt: new Date().toISOString(),
      professionalName: currentUser.name
    };

    try {
      await SupabaseService.saveDocument(newDoc);
      setError(null);
      if (usedTemplateFallback) {
        addToast("Documento gerado com sucesso usando modelos institucionais (IA instável).", "info");
      }
      if (activeTab === 'history') {
        const data = await SupabaseService.getDocuments(selectedStudentId);
        setHistory(data);
      }
    } catch (saveErr: any) {
      console.error('Erro ao salvar documento gerado:', saveErr);
      setError(
        'O texto foi gerado, mas não foi possível salvar no histórico. Verifique conexão, permissões ou tente novamente.'
      );
      addToast('Falha ao salvar o documento no servidor.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    const printWindow = window.open("", "_blank", "width=900,height=800");
    if (!printWindow) return;

    const config = await SupabaseService.getPapelTimbradoConfig();
    console.log('DEBUG: Config usada na impressão:', config);

    const html = `
      <html>
        <head>
          <title>Impressão - ${documentCode}</title>
          <style>
            @page { 
              size: A4; 
              margin: 20mm 20mm 20mm 20mm; /* Margens A4 Padrão */
            }
            body { 
              font-family: "Times New Roman", serif; 
              font-size: 12pt; 
              line-height: 1.5;
              color: #000; /* Preto absoluto para impressão */
              -webkit-print-color-adjust: exact;
              margin: 0;
              padding: 0;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #000; 
              padding-bottom: 10px; 
              margin-bottom: 30px; 
            }
            .header img { max-height: 70px; margin-bottom: 5px; }
            .header h1 { font-size: 14pt; margin: 0; color: #000; text-transform: uppercase; font-weight: bold; }
            .header h2 { font-size: 12pt; margin: 2px 0; color: #000; font-weight: bold; }
            .header p { font-size: 10pt; color: #000; margin-top: 5px; }
            
            .content { 
              text-align: justify; 
              text-justify: inter-word;
            }
            
            /* Utilitários para o conteúdo rico do editor */
            .content h1, .content h2, .content h3 { color: #000; margin-top: 1.5em; margin-bottom: 0.5em; }
            .content p { margin-bottom: 1em; }
            .content strong { font-weight: bold; }
            .content ul { margin-left: 20px; margin-bottom: 1em; }
            .content li { margin-bottom: 0.5em; }

            .footer { 
              margin-top: 50px; 
              text-align: center; 
              page-break-inside: avoid;
            }
            
            .qr-auth { 
              text-align: right;
              margin-top: 40px; 
              font-size: 8pt;
              color: #000;
              page-break-inside: avoid;
            }
            .qr-auth img { width: 70px; height: 70px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${config.logoUrl ? `<img src="${config.logoUrl}" />` : ''}
            <div>
                <h1>${config.tituloLinha1}</h1>
                <h2>${config.tituloLinha2}</h2>
                ${config.tituloLinha3 ? `<p>${config.tituloLinha3}</p>` : ''}
            </div>
            <p>${config.endereco} | CNPJ: ${config.cnpj}</p>
          </div>

          <div class="content">
            ${generatedContent}
          </div>
          
          <div class="qr-auth">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=VERIFICAR_AUTENTICIDADE:${documentCode}" />
            <br>Autenticidade: ${documentCode}
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();

    // Aguarda carregamento de imagens antes de imprimir
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      // Não fecha automaticamente para permitir que o usuário veja
    };
  };



  useEffect(() => {
    if (selectedStudentId) {
      const loadHistory = async () => {
        const data = await SupabaseService.getDocuments(selectedStudentId);
        setHistory(data);
      };
      loadHistory();
    }
  }, [selectedStudentId, activeTab]);

  const availableDocs = React.useMemo(() => {
    const role = currentUser.role || '';
    const sp = (currentUser.specialty || '').toLowerCase();

    const build = (): string[] => {
      // Secretarias — apenas documentos administrativos + comuns
      if (role === 'SECRETARIA_SEDE' || role === 'SECRETARIA_COCAL' || role === 'ASSISTANT') {
        return [...DOCS_COMUM, ...DOCS_SECRETARIA].sort();
      }

      // Especialistas clínicos — documentos comuns + específicos da especialidade
      const common = [...DOCS_COMUM];
      if (sp.includes('psicopedagogia') || sp.includes('psicopedago')) return [...common, ...DOCS_PSICOPEDAGOGIA];
      if (sp.includes('psicologia')) return [...common, ...DOCS_PSICOLOGIA];
      if (sp.includes('social')) return [...common, ...DOCS_SERVICO_SOCIAL];
      if (sp.includes('fonoaudiologia')) return [...common, ...DOCS_FONOAUDIOLOGIA];
      if (sp.includes('terapia ocupacional')) return [...common, ...DOCS_TERAPIA_OCUPACIONAL];
      if (sp.includes('fisioterapia')) return [...common, ...DOCS_FISIOTERAPIA];
      if (sp.includes('nutri')) return [...common, ...DOCS_NUTRICAO];

      // ADMIN/COORDENADOR — todos os documentos
      return Array.from(new Set([
        ...DOCS_COMUM, ...DOCS_SECRETARIA,
        ...DOCS_PSICOLOGIA, ...DOCS_SERVICO_SOCIAL,
        ...DOCS_PSICOPEDAGOGIA, ...DOCS_FONOAUDIOLOGIA,
        ...DOCS_TERAPIA_OCUPACIONAL, ...DOCS_FISIOTERAPIA, ...DOCS_NUTRICAO
      ])).sort();
    };

    // Garante que documentos especiais apareçam só para quem tem permissão
    let list = build().filter(d => d !== ATESTADO_COMPARECIMENTO && d !== OFICIO_ORIENTACAO);
    if (canEmitAtestado) list = [...list, ATESTADO_COMPARECIMENTO];
    if (canEmitOficio) list = [...list, OFICIO_ORIENTACAO];
    return list;
  }, [currentUser.specialty, currentUser.role, canEmitAtestado, canEmitOficio]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12 relative">
      {/* Atestado de Comparecimento — fluxo próprio, sem IA */}
      {showAtestado && (
        <AtestadoComparecimento currentUser={currentUser} onClose={() => setShowAtestado(false)} />
      )}

      {/* Loading Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 transform animate-scaleIn">
            <div className="relative mb-6">
              <div className="w-20 h-20 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
              <Sparkles className="absolute inset-0 m-auto text-primary-600 animate-pulse" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">IA Processando...</h3>
            <p className="text-slate-500 text-center text-sm leading-relaxed">
              Estamos estruturando seu documento com base nos dados do aluno e diretrizes técnicas. Aguarde um instante.
            </p>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-shake">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-lg font-bold">Falha na Geração</h3>
            </div>
            <p className="text-slate-600 mb-6 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden sticky top-6">
            <div className="flex border-b bg-slate-50/50">
              <button
                onClick={() => setActiveTab('generator')}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'generator' ? 'text-primary-600 border-b-2 border-primary-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Gerador Inteli
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'text-primary-600 border-b-2 border-primary-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Histórico
              </button>
            </div>

            {activeTab === 'generator' ? (
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Selecione o Aluno</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-slate-50/30 text-slate-700 font-medium appearance-none"
                      value={selectedStudentId}
                      onChange={e => setSelectedStudentId(e.target.value)}
                    >
                      <option value="">Buscar aluno...</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Modelo de Documento</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-slate-50/30 text-slate-700 font-medium appearance-none"
                      value={docType}
                      onChange={e => {
                        // Atestado de Comparecimento não usa IA — abre o fluxo próprio
                        if (e.target.value === ATESTADO_COMPARECIMENTO) {
                          setShowAtestado(true);
                          return;
                        }
                        setDocType(e.target.value);
                      }}
                    >
                      <option value="">Selecione o modelo...</option>
                      {availableDocs.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    {docType === OFICIO_ORIENTACAO ? 'Número do Ofício' : 'Diretrizes da IA (Opcional)'}
                  </label>
                  <textarea
                    className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white text-sm placeholder:text-slate-300 resize-none min-h-[120px]"
                    placeholder={docType === OFICIO_ORIENTACAO
                      ? 'Digite o número do ofício (ex: 001). Deixe em branco para usar "____".'
                      : 'Ex: Enfatizar dificuldades na alfabetização e sugerir encaminhamento para fonoaudiologia...'}
                    value={context}
                    onChange={e => setContext(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-primary-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                >
                  {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                  {docType === OFICIO_ORIENTACAO ? 'Gerar Ofício' : 'Gerar Documento com IA'}
                </button>
              </div>
            ) : (
              <div className="p-2 space-y-2 h-[500px] overflow-y-auto bg-slate-50/50">
                {selectedStudentId ? (
                  history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                      <History size={32} className="mb-2 opacity-20" />
                      <p className="text-xs">Nenhum documento salvo para este aluno.</p>
                    </div>
                  ) : (
                    history.map(doc => (
                      <div key={doc.id} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-primary-200 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{doc.docType}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{doc.code}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mb-3">
                          <Calendar size={10} /> {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setGeneratedContent(doc.content); setDocumentCode(doc.code); }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Visualizar"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Excluir este documento permanentemente?')) {
                                try {
                                  await SupabaseService.deleteDocument(doc.id);
                                  setHistory(prev => prev.filter(h => h.id !== doc.id));
                                } catch (e) {
                                  console.error(e);
                                  addToast('Não foi possível excluir o documento.', 'error');
                                }
                              }
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                    <UserIcon size={32} className="mb-2 opacity-20" />
                    <p className="text-xs">Selecione um aluno para ver o histórico.</p>
                  </div>
                )}
              </div>
            )}
          </div>

        {/* Card exclusivo Relatório Anual TCM */}
        <div
          onClick={() => navigate('/app/relatorio-anual-tcm')}
          className="cursor-pointer rounded-2xl p-5 text-white relative overflow-hidden transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: 'linear-gradient(135deg, #8B1A3A, #5A0F24)' }}
        >
          <div className="absolute right-3 top-3 opacity-10 text-[70px] leading-none pointer-events-none">📋</div>
          <div className="flex items-start gap-3 mb-3 relative z-10">
            <div className="p-2 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <Building2 size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-white leading-tight">Relatório Anual TCM</p>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>Exclusivo</span>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Tribunal de Contas dos Municípios/BA</p>
            </div>
          </div>
          <p className="text-[11px] relative z-10 mb-3" style={{ color: 'rgba(255,255,255,0.70)', lineHeight: '1.5' }}>
            Relatório institucional anual com dados reais de atendimentos, gerado automaticamente pela IA.
          </p>
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>Clique para acessar →</span>
            <ExternalLink size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
          </div>
        </div>
      </div>

        <div className="lg:col-span-2">
          {generatedContent ? (
            <div className="space-y-4 animate-scaleIn">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center p-3 bg-slate-50/50 border-b border-slate-100">
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200">
                    <Hash size={14} className="text-slate-400" />
                    <span className="text-xs font-mono font-bold text-slate-600">{documentCode}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { navigator.clipboard.writeText(generatedContent); addToast('Copiado!', 'success'); }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg font-bold hover:bg-slate-50 transition-colors text-xs"
                    >
                      <Copy size={14} /> Copiar
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-[#10B981] text-white rounded-lg font-bold hover:bg-emerald-600 transition-all shadow-sm text-xs">
                      <Printer size={14} /> Imprimir PDF
                    </button>
                  </div>
                </div>
                <div className="flex border-b border-slate-100 bg-white px-2">
                  <div className="px-4 py-2.5 text-xs font-black text-emerald-600 border-b-2 border-emerald-500">
                    ✏️ Editor Rico Habilitado — clique no texto para editar
                  </div>
                </div>
              </div>

              <div className="bg-white shadow-2xl w-full min-h-[1000px] border border-slate-200 rounded-xl relative group">
                <div
                  className="w-full h-full min-h-[1000px] outline-none font-serif text-[12pt] leading-relaxed text-justify p-12 md:p-20 bg-white"
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: generatedContent }}
                  onInput={(e) => setGeneratedContent(e.currentTarget.innerHTML)}
                  style={{
                    backgroundImage: 'linear-gradient(#f1f5f9 1px, transparent 1px)',
                    backgroundSize: '100% 1.6em',
                    lineHeight: '1.6em'
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[600px] border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 bg-slate-50/30">
              <div className="w-24 h-24 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                <Layout size={40} className="opacity-20 translate-y-1" />
              </div>
              <h4 className="text-xl font-bold text-slate-400 mb-2">Central de Documentos IA</h4>
              <p className="max-w-xs text-center text-sm text-slate-400/60 leading-relaxed">
                Selecione um aluno e um modelo clínico no menu lateral para iniciar a geração inteligente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
