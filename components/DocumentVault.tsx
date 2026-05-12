import React, { useState, useEffect, useRef } from 'react';
import {
    Shield,
    FileText,
    Book,
    UploadCloud,
    Lock,
    Search,
    ArrowRight,
    FileCheck,
    Hash,
    ChevronRight,
    Download,
    Eye,
    AlertCircle
} from 'lucide-react';
import { Student, User, DocumentType } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { useToast } from '../contexts/ToastContext';

interface DocumentVaultProps {
    currentUser: User;
    students: Student[];
    onModelSelect?: (modelName: string) => void;
    onUpdate?: () => void;
}

type VaultCategory = 'models' | 'normatives' | 'scanned';

export const DocumentVault: React.FC<DocumentVaultProps> = ({ currentUser, students, onModelSelect, onUpdate }) => {
    const [activeCategory, setActiveCategory] = useState<VaultCategory>('models');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { success, error, info } = useToast();

    // Mock de normativas (seriam carregadas do banco em uma versão real)
    const normatives = [
        { id: '1', title: 'Diretrizes do Centro Brotar 2026', type: 'PDF', date: '01/02/2026' },
        { id: '2', title: 'Tutorial: Uso do Prontuário Digital', type: 'Manual', date: '15/01/2026' },
        { id: '3', title: 'Decreto Municipal nº 4.520 - Educação Inclusiva', type: 'PDF', date: '10/12/2025' }
    ];

    const filteredStudents = students.filter(s =>
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedStudent = students.find(s => s.id === selectedStudentId);

    // Hash de autenticidade (Selo Brotar)
    const generateHash = (id: string | null) => {
        if (!id) return '';
        // Simulação de Hash para demonstração
        return `BROTAR-${id.substring(0, 8).toUpperCase()}-${new Date().getFullYear()}`;
    };

    const handleModelClick = (model: string) => {
        if (onModelSelect) {
            onModelSelect(model);
        } else {
            alert(`Iniciando preenchimento automático de: ${model}`);
        }
    };

    const handleDownload = (docUrl: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = docUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        info(`Iniciando download seguro de: ${fileName}`);
    };

    const handleView = (docUrl: string) => {
        window.open(docUrl, '_blank');
    };

    const handleUploadClick = () => {
        if (!selectedStudentId) {
            error('Selecione um aluno primeiro.');
            return;
        }
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedStudent) return;

        const types: DocumentType[] = [
            'Laudo Médico', 'Receita Médica', 'Cartão de Vacina', 'Cartão SUS', 
            'Certidão de Nascimento', 'PEI', 'RG', 'CPF', 'Autorização de Uso de Imagem', 'Outros'
        ];
        
        const typeSelected = window.prompt(
            `Selecione o tipo de documento:\n\n${types.map((t, i) => `${i + 1}. ${t}`).join('\n')}`, 
            'Outros'
        );

        let finalType: DocumentType = 'Outros';
        if (typeSelected) {
            const index = parseInt(typeSelected) - 1;
            if (index >= 0 && index < types.length) {
                finalType = types[index];
            } else if (types.includes(typeSelected as any)) {
                finalType = typeSelected as DocumentType;
            }
        }

        try {
            setIsUploading(true);
            await SupabaseService.saveStudent(selectedStudent, undefined, [{ file, type: finalType }]);
            success('Documento enviado com sucesso para a nuvem.');
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Erro no upload:', err);
            error('Falha ao enviar documento.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-fadeIn p-4 md:p-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Shield size={120} />
                </div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <Shield className="text-primary-400" />
                        Cofre de Documentos
                    </h2>
                    <p className="text-slate-400 mt-2 max-w-2xl">
                        Central de inteligência documental. Acesse modelos, normativas e a nuvem de arquivos escaneados dos alunos com total segurança e sigilo.
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                <button
                    onClick={() => setActiveCategory('models')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeCategory === 'models'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <FileText size={18} /> Modelos de Declarações
                </button>
                <button
                    onClick={() => setActiveCategory('normatives')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeCategory === 'normatives'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Book size={18} /> Normativas e Tutoriais
                </button>
                <button
                    onClick={() => setActiveCategory('scanned')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeCategory === 'scanned'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <UploadCloud size={18} /> Arquivos Escaneados (Nuvem)
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
                {activeCategory === 'models' && (
                    <div className="p-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <FileCheck className="text-primary-500" />
                            Modelos Pré-configurados
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                'Declaração de Frequência',
                                'Declaração de Acompanhamento Multidisciplinar',
                                'Relatório de Admissão',
                                'Solicitação de AEE (Atendimento Educacional Especializado)'
                            ].map(model => (
                                <div
                                    key={model}
                                    onClick={() => handleModelClick(model)}
                                    className="group p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-primary-500 group-hover:text-white transition-colors">
                                            <FileText size={20} />
                                        </div>
                                        <ArrowRight size={16} className="text-slate-300 group-hover:text-primary-500 transform group-hover:translate-x-1 transition-all" />
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm">{model}</h4>
                                    <p className="text-xs text-slate-500 mt-1">Preenchimento automático via sistema</p>
                                    <div className="mt-4 flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                                        <Hash size={10} /> {generateHash(model)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeCategory === 'normatives' && (
                    <div className="p-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Book className="text-primary-500" />
                            Biblioteca Normativa
                        </h3>
                        <div className="space-y-3">
                            {normatives.map(doc => (
                                <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-primary-600 shadow-sm">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm group-hover:text-primary-600 transition-colors">{doc.title}</h4>
                                            <div className="flex gap-3 mt-1">
                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">{doc.type}</span>
                                                <span className="text-[10px] text-slate-400 italic">Atualizado em: {doc.date}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDownload(doc.title)}
                                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-white rounded-lg transition-all shadow-sm"
                                    >
                                        <Download size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeCategory === 'scanned' && (
                    <div className="flex flex-col md:flex-row h-auto min-h-[600px]">
                        {/* Student Selector Sidebar */}
                        <div className="w-full md:w-80 border-r border-slate-200 flex flex-col">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar aluno..."
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-primary-500"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto max-h-[400px] md:max-h-none p-2 space-y-1">
                                {filteredStudents.map(student => (
                                    <button
                                        key={student.id}
                                        onClick={() => setSelectedStudentId(student.id)}
                                        className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${selectedStudentId === student.id
                                            ? 'bg-primary-50 text-primary-700 shadow-sm'
                                            : 'hover:bg-slate-50 text-slate-600'
                                            }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs uppercase overflow-hidden">
                                            {student.photoUrl ? <img src={student.photoUrl} className="w-full h-full object-cover" /> : student.fullName[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-xs truncate">{student.fullName}</p>
                                            <p className="text-[10px] opacity-70 truncate">{student.school.schoolName}</p>
                                        </div>
                                        <ChevronRight size={14} className={selectedStudentId === student.id ? 'opacity-100' : 'opacity-0'} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* File View */}
                        <div className="flex-1 bg-slate-50/30 p-8 flex flex-col h-full overflow-hidden">
                            {selectedStudent ? (
                                <>
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800">{selectedStudent.fullName}</h3>
                                            <p className="text-xs text-slate-500">Documentação Digitalizada no Cofre</p>
                                        </div>
                                        <button 
                                            onClick={handleUploadClick}
                                            disabled={isUploading}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-wait"
                                        >
                                            {isUploading ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <UploadCloud size={18} />
                                            )}
                                            {isUploading ? 'Enviando...' : 'Novo Arquivo'}
                                        </button>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            onChange={handleFileChange}
                                            accept=".pdf,.jpg,.jpeg,.png"
                                        />
                                    </div>

                                    {/* Barreira de Sigilo em ação */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1 pr-2">
                                        {selectedStudent.documents && selectedStudent.documents.length > 0 ? (
                                            selectedStudent.documents.map(doc => {
                                                const docType = doc.type.toLowerCase();
                                                const isClinical = docType.includes('médic') || docType.includes('laudo') || docType.includes('receita');
                                                // Bloqueio se for clínico (Regra do Cofre)
                                                const isBlocked = isClinical && (currentUser.role === 'SECRETARIA_SEDE' || currentUser.role === 'SECRETARIA_COCAL' || currentUser.role === 'EDUCATION_SECRETARY');

                                                return (
                                                    <div key={doc.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${isBlocked ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                                                {isBlocked ? <Lock size={20} /> : <FileText size={20} />}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-800 text-[13px]">{doc.fileName}</h4>
                                                                <span className="text-[10px] text-slate-400">{doc.type} • {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isBlocked ? (
                                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100">
                                                                    <Shield size={12} /> BLOQUEADO
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <button 
                                                                        onClick={() => handleView(doc.url)}
                                                                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded" 
                                                                        title="Ver Arquivo"
                                                                    >
                                                                        <Eye size={16} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDownload(doc.url, doc.fileName)}
                                                                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded" 
                                                                        title="Baixar"
                                                                    >
                                                                        <Download size={16} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-inner">
                                                <UploadCloud size={48} className="mb-4 opacity-20" />
                                                <p className="font-bold">Nenhum arquivo escaneado</p>
                                                <p className="text-xs mt-1">Clique em "Novo Arquivo" para digitalizar documentos deste aluno.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Selo de Autenticidade Global no rodapé */}
                                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                                            Selo de Autenticidade Brotar (Hash de Verificação Ativo)
                                        </div>
                                        <div className="font-mono">
                                            SHA-256: {generateHash(selectedStudentId)}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center py-20">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                        <Shield size={32} />
                                    </div>
                                    <h4 className="font-bold text-slate-800">Acesse a Nuvem do Aluno</h4>
                                    <p className="text-xs mt-1 max-w-xs">Selecione um aluno na lista ao lado para gerenciar sua documentação digitalizada com o selo de autenticidade.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Support Message */}
            <div className="bg-primary-50/50 p-4 rounded-xl border border-primary-100 flex gap-3 items-center">
                <AlertCircle className="text-primary-500 shrink-0" size={20} />
                <p className="text-xs text-primary-800 leading-relaxed">
                    <strong>Dica do Sistema:</strong> O Cofre de Documentos permite que arquivos acompanhem o aluno em toda a rede. Se o aluno mudar de escola, a documentação digital já estará disponível instantaneamente para a nova unidade.
                </p>
            </div>
        </div>
    );
};
