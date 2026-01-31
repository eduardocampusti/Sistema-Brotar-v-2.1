
import React, { useState, useEffect } from 'react';
import { User, Student, Specialty, SavedDocument } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { GeminiService, TemplateService } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';
import { FileText, Printer, Copy, Sparkles, User as UserIcon, ChevronDown, Loader2, FileCheck, AlertCircle, Edit3, Hash, History, Eye, Trash2, Calendar, Layout } from 'lucide-react';

interface DocumentGeneratorProps {
  currentUser: User;
}

// --- LISTA DE MODELOS ---
const DOCS_COMUM = ["Declaração de Atendimento", "Encaminhamento Geral", "Relatório Resumido", "Termo de Autorização de Uso de Imagem e Vídeo", "Declaração Simples"];
const DOCS_PSICOLOGIA = ["Relatório Psicológico Técnico", "Evolução Psicológica", "Parecer Psicológico"];
const DOCS_SERVICO_SOCIAL = ["Relatório de Busca Ativa", "Relatório Social de Visita Domiciliar", "Ofício ao Conselho Tutelar", "Plano de Acompanhamento Familiar"];
const DOCS_PSICOPEDAGOGIA = ["Avaliação Psicopedagógica", "Plano de Intervenção", "Relatório de Evolução"];

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({ currentUser }) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'generator' | 'history'>('generator');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [docType, setDocType] = useState('');
  const [context, setContext] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [documentCode, setDocumentCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<SavedDocument[]>([]);

  useEffect(() => {
    const loadStudents = async () => {
      const data = await SupabaseService.getStudents();
      setStudents(data);
    };
    loadStudents();
  }, []);

  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedStudentId || !docType) {
      setError("Por favor, selecione um aluno e o tipo de documento desejado.");
      return;
    }


    // Re-fetch student data to ensure we have the latest Clinical Info (including IPO)
    // This is crucial because DocumentGenerator might have stale data from initial load
    const freshStudentList = await SupabaseService.getStudents();
    const freshStudent = freshStudentList.find(s => s.id === selectedStudentId);

    if (!freshStudent) {
      setError("Erro ao atualizar dados do aluno. Tente novamente.");
      return;
    }

    const student = freshStudent; // Use the fresh one

    setIsGenerating(true);
    setError(null);
    const newCode = `BRT-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;

    try {
      // Lógica de Geração IA via GeminiService
      // Using freshStudent guarantees we send the latest IPO data if it was just saved
      const result = await GeminiService.generateOfficialDocument(
        docType, freshStudent, currentUser.name, currentUser.jobTitle || currentUser.role, context
      );

      setGeneratedContent(result);
      setDocumentCode(newCode);

      // Salvar Automático no Histórico
      const newDoc: SavedDocument = {
        id: crypto.randomUUID(),
        studentId: student.id,
        studentName: student.fullName,
        docType,
        code: newCode,
        content: result,
        createdAt: new Date().toISOString(),
        professionalName: currentUser.name
      };
      await SupabaseService.saveDocument(newDoc);

      // Refresh history if on history tab
      if (activeTab === 'history') {
        const data = await SupabaseService.getDocuments(selectedStudentId);
        setHistory(data);
      }

    } catch (err: any) {
      console.warn('IA indisponível, ativando fallback de templates:', err);

      // --- FALLBACK AUTOMÁTICO PARA TEMPLATES ---
      const professionalRole = currentUser.specialty || currentUser.jobTitle || currentUser.role;
      const fallbackContent = TemplateService.getFallbackDocument(docType, student, currentUser.name, professionalRole, context);
      setGeneratedContent(fallbackContent);
      setDocumentCode(newCode);

      // Salvar como documento gerado (marcando origem no console se necessário, mas para o usuário é transparente)
      const newDoc: SavedDocument = {
        id: crypto.randomUUID(),
        studentId: student.id,
        studentName: student.fullName,
        docType,
        code: newCode,
        content: fallbackContent,
        createdAt: new Date().toISOString(),
        professionalName: currentUser.name
      };
      await SupabaseService.saveDocument(newDoc);

      // Notificar usuário que o sistema usou modelos padrão devido à instabilidade da IA
      setError(null); // Limpa erro anterior
      addToast("Documento gerado com sucesso usando modelos institucionais (IA Instável)", "info");

      if (activeTab === 'history') {
        const data = await SupabaseService.getDocuments(selectedStudentId);
        setHistory(data);
      }

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
    const all = [...DOCS_COMUM, ...DOCS_PSICOLOGIA, ...DOCS_SERVICO_SOCIAL, ...DOCS_PSICOPEDAGOGIA];
    return Array.from(new Set(all)).sort();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12 relative">
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
                      onChange={e => setDocType(e.target.value)}
                    >
                      <option value="">Selecione o modelo...</option>
                      {availableDocs.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Diretrizes da IA (Opcional)</label>
                  <textarea
                    className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white text-sm placeholder:text-slate-300 resize-none min-h-[120px]"
                    placeholder="Ex: Enfatizar dificuldades na alfabetização e sugerir encaminhamento para fonoaudiologia..."
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
                  Gerar Documento com IA
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
                                await SupabaseService.deleteDocument(doc.id);
                                setHistory(prev => prev.filter(h => h.id !== doc.id));
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
        </div>

        <div className="lg:col-span-2">
          {generatedContent ? (
            <div className="space-y-4 animate-scaleIn">
              <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200">
                  <Hash size={14} className="text-slate-400" />
                  <span className="text-xs font-mono font-bold text-slate-600">{documentCode}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedContent);
                      setError("Texto copiado para a área de transferência!"); // Usando setError temporariamente pra feedback
                      setTimeout(() => setError(null), 2000);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg font-bold hover:bg-slate-50 transition-colors text-sm"
                  >
                    <Copy size={16} /> Copiar
                  </button>
                  <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all shadow-lg text-sm">
                    <Printer size={16} /> Imprimir PDF
                  </button>
                </div>
              </div>

              <div className="bg-white shadow-2xl w-full min-h-[1000px] border border-slate-200 rounded-t-xl relative group">
                <div
                  className="w-full h-full min-h-[1000px] outline-none font-serif text-[12pt] leading-relaxed text-justify p-12 md:p-20 bg-white"
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: generatedContent }}
                  onInput={(e) => setGeneratedContent(e.currentTarget.innerHTML)}
                  style={{
                    backgroundImage: 'linear-gradient(#f1f5f9 1px, transparent 1px)',
                    backgroundSize: '100% 1.6em',
                    lineHeight: '1.6em' // Align text with lines
                  }}
                />

                {/* Visual indicator that it's editable */}
                <div className="absolute top-4 right-4 text-[10px] font-bold text-primary-400 opacity-40 uppercase tracking-widest flex items-center gap-1 pointer-events-none">
                  <Edit3 size={10} /> Editor Rico Habilitado
                </div>
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
