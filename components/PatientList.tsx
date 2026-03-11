
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Student, School, User, Specialty, AuditAction } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { generateStudentPDF } from '../utils/pdfExport';
import {
  Search,
  ChevronRight,
  User as UserIcon,
  Trash2,
  AlertTriangle,
  X,
  UserPlus,
  Edit,
  Filter,
  Globe,
  FileText,
  MoreVertical,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  Loader2,
  GitMerge,
  CopyCheck
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { CSVImporter } from './CSVImporter';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from '../contexts/ToastContext';

interface StudentListProps {
  students: Student[];
  schools: School[];
  onSelectStudent: (student: Student) => void;
  onDelete: (id: string) => void;
  onRegister: () => void;
  onEdit: (student: Student) => void;
  currentUser?: User;
  onRefresh?: () => Promise<void>;
}

// Helper para Status Visual
const getStudentStatus = (student: Student) => {
  const social = student.clinical?.social_data?.formData;
  const interview = student.clinical?.social_interview;

  // Prioridade 1: Busca Ativa / Risco
  if (social?.observacoesEncaminhamentos?.statusRegistro === 'PENDENTE' ||
    social?.statusCaso?.includes('Evasão') ||
    social?.statusCaso?.includes('Conselho')) {
    return { label: 'Em Risco / Busca Ativa', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: AlertTriangle };
  }

  // Prioridade 2: Em Acompanhamento Ativo
  if (social?.statusCaso === 'Em Acompanhamento' ||
    interview?.status === 'Em Análise' ||
    social?.statusCaso?.includes('Concluído')) { // Concluído também é um status relevante
    return { label: 'Em Acompanhamento', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Activity };
  }

  // Prioridade 3: Sem dados recentes (Default)
  return { label: 'Sem Registro Recente', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: Clock };
};

export const PatientList: React.FC<StudentListProps> = ({ students, schools, onSelectStudent, onDelete, onRegister, onEdit, currentUser, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('ALL');
  const [showImporter, setShowImporter] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showConfirmFinal, setShowConfirmFinal] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const { addToast } = useToast();

  // Estados para Mesclagem
  const [mainStudentId, setMainStudentId] = useState<string>('');
  const [duplicateStudentId, setDuplicateStudentId] = useState<string>('');
  const [hasConfirmedIrreversible, setHasConfirmedIrreversible] = useState(false);

  // Menu de Ações
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Normalização de texto — memoizada para evitar recriação
  const normalizeText = useCallback((text: string) => {
    return (text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }, []);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const isRestricted = (currentUser?.role === 'EDUCATION_SECRETARY' || currentUser?.role === 'ASSISTANT' || currentUser?.role === 'SECRETARIA_COCAL' || currentUser?.role === 'SECRETARIA_SEDE') && currentUser?.scope === 'COCAL';
  const canRegister = currentUser?.role === 'ADMIN' || currentUser?.role === 'EDUCATION_SECRETARY' || currentUser?.role === 'ASSISTANT' || currentUser?.role === 'SECRETARIA_SEDE' || currentUser?.role === 'SECRETARIA_COCAL' || currentUser?.role === 'ESCOLA';
  const canViewClinical = currentUser?.role === 'ADMIN' || currentUser?.role === 'SPECIALIST';

  // Permissões Específicas
  const isSocialWorker = currentUser?.specialty === Specialty.SOCIAL_WORK;
  const isClinician = currentUser?.role === 'SPECIALIST';

  const isSchool = currentUser?.role === 'ESCOLA';

  const filteredStudents = useMemo(() => students.filter(p => {
    // 1. User Scope Filter (Cocal Security)
    if (isRestricted) {
      const schoolName = (p.school.schoolName || '').toLowerCase();
      const district = (p.school.district || '').toLowerCase();
      if (!schoolName.includes('cocal') && !district.includes('cocal')) return false;
    }

    // 1b. School Specific Restriction
    if (isSchool) {
      const mySchoolId = currentUser?.schoolInep;
      const mySchoolName = currentUser?.name;
      const isMyStudent = p.school?.schoolId === mySchoolId || p.school?.schoolName === mySchoolName;
      if (!isMyStudent) return false;
    }

    // 2. Search Term Filter
    const normalizedSearch = normalizeText(searchTerm);
    const matchesSearch =
      normalizeText(p.fullName || '').includes(normalizedSearch) ||
      normalizeText(p.school?.schoolName || '').includes(normalizedSearch) ||
      (canViewClinical && normalizeText(p.clinical?.diagnosis || '').includes(normalizedSearch)) ||
      (p.cpf || '').includes(searchTerm);

    // 3. School Dropdown Filter
    const matchesSchool = selectedSchoolId === 'ALL' ||
      p.school?.schoolId === selectedSchoolId ||
      (selectedSchoolId !== 'ALL' && !p.school?.schoolId && p.school?.schoolName === selectedSchoolId);

    return matchesSearch && matchesSchool;
  }), [students, searchTerm, selectedSchoolId, isRestricted, isSchool, currentUser?.schoolInep, currentUser?.name, canViewClinical]);

  // Memoize school options — recomputed only when students list changes
  const schoolOptions = useMemo(() => [
    { value: 'ALL', label: 'Todas as Escolas' },
    ...Array.from(new Map(
      students
        .filter(s => s.school?.schoolId || s.school?.schoolName)
        .map(s => {
          const id = s.school?.schoolId || s.school?.schoolName;
          return [id, s.school?.schoolName || 'Sem nome'];
        })
    ).entries())
      .map(([id, name]) => ({ value: id as string, label: name as string }))
      .sort((a, b) => a.label.localeCompare(b.label))
  ], [students]);

  const confirmDelete = useCallback(async () => {
    if (studentToDelete) {
      try {
        if (currentUser) {
          await SupabaseService.logAction(currentUser, AuditAction.DELETE, 'ALUNOS', studentToDelete.fullName);
        }
        
        // Executa a exclusão no banco de dados primeiro
        await SupabaseService.deleteStudent(studentToDelete.id);
        
        // Garante que a atualização da lista ocorra somente após a confirmação do banco
        if (onRefresh) {
          await onRefresh();
        }
        
        addToast("Registro excluído com sucesso!", "success");
      } catch (error: any) {
        console.error("Erro ao excluir aluno:", error);
        addToast("Erro ao excluir registro: " + error.message, "error");
      }
      setStudentToDelete(null);
    }
  }, [studentToDelete, currentUser, onRefresh, addToast]);

  const handleMergeRequest = () => {
    if (!mainStudentId || !duplicateStudentId || !hasConfirmedIrreversible) return;
    
    if (mainStudentId === duplicateStudentId) {
      addToast("Selecione alunos diferentes para realizar a mesclagem.", "error");
      return;
    }

    setShowConfirmFinal(true);
  };

  const executeMerge = async () => {
    if (!currentUser) return;
    
    try {
      setIsMerging(true);
      const mainStudent = students.find(s => s.id === mainStudentId);
      const duplicateStudent = students.find(s => s.id === duplicateStudentId);
      
      await SupabaseService.mergeStudents(mainStudentId, duplicateStudentId);
      
      await SupabaseService.logAction(
        currentUser, 
        'MERGE' as AuditAction, 
        'ALUNOS', 
        `Mesclagem: ${duplicateStudent?.fullName} (removido) -> ${mainStudent?.fullName} (mantido)`
      );

      setShowConfirmFinal(false);
      setShowMergeModal(false);
      setMainStudentId('');
      setDuplicateStudentId('');
      setHasConfirmedIrreversible(false);
      
      addToast("Registros mesclados com sucesso!", "success");
      
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error: any) {
      console.error("Erro na mesclagem:", error);
      addToast("Erro ao realizar mesclagem: " + error.message, "error");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
              <FileText size={24} />
            </div>
            Central de Prontuários
            {isRestricted && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[10px] rounded-full border border-orange-200 flex items-center gap-1 font-bold uppercase tracking-wide">
                <Globe size={10} /> Cocal
              </span>
            )}
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1 ml-1">
            Gestão unificada de alunos e histórico clínico
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Filtros */}
          <div className="w-full sm:w-64 z-20">
            <SearchableSelect
              options={[
                { value: 'ALL', label: 'Todas as Escolas' },
                ...schools.map(s => ({ value: s.id, label: s.name || '' }))
                  .sort((a, b) => a.label.localeCompare(b.label))
              ]}
              value={selectedSchoolId}
              onChange={setSelectedSchoolId}
              placeholder="Filtrar por escola..."
              className="w-full"
            />
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Localizar aluno, CPF ou escola..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {canRegister && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowMergeModal(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all font-bold text-xs uppercase tracking-widest shadow-sm"
              >
                <GitMerge size={16} />
                Mesclar Alunos
              </button>
              <button
                onClick={() => setShowImporter(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl hover:bg-teal-100 transition-all font-bold text-xs uppercase tracking-widest shadow-sm"
              >
                <FileText size={16} />
                Importar CSV
              </button>
              <button
                onClick={onRegister}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-95 whitespace-nowrap"
              >
                <UserPlus size={16} />
                Novo Aluno
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Mesclagem */}
      {showMergeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden animate-scaleIn">
            {/* Header Modal */}
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <GitMerge className="text-indigo-600" size={24} />
                  Mesclar Registros de Alunos
                </h3>
                <p className="text-slate-500 text-xs font-medium mt-1">Consolide dois cadastros em um único prontuário</p>
              </div>
              <button 
                onClick={() => setShowMergeModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Aluno Principal */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    Aluno Principal (Será Mantido)
                  </label>
                  <SearchableSelect
                    options={students.map(s => ({ value: s.id, label: `${s.fullName} ${s.cpf ? `(${s.cpf})` : ''}` }))}
                    value={mainStudentId}
                    onChange={setMainStudentId}
                    placeholder="Selecione o aluno oficial..."
                  />
                  <p className="text-[10px] text-slate-400 italic">Este registro receberá todos os dados do outro aluno.</p>
                </div>

                {/* Aluno Duplicado */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Trash2 size={12} className="text-rose-500" />
                    Aluno Duplicado (Será Apagado)
                  </label>
                  <SearchableSelect
                    options={students.map(s => ({ value: s.id, label: `${s.fullName} ${s.cpf ? `(${s.cpf})` : ''}` }))}
                    value={duplicateStudentId}
                    onChange={setDuplicateStudentId}
                    placeholder="Selecione o cadastro duplicado..."
                  />
                  <p className="text-[10px] text-slate-400 italic">Este registro será removido permanentemente após a mesclagem.</p>
                </div>
              </div>

              {/* Alerta de Perigo */}
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex gap-4">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl h-fit">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-800">Ação Irreversível</h4>
                  <p className="text-xs text-rose-700/80 mt-1 leading-relaxed">
                    Ao confirmar, todas as sessões, documentos e informações do <b>Aluno Duplicado</b> serão transferidos para o <b>Aluno Principal</b>. O registro duplicado será <b>excluído permanentemente</b>.
                  </p>
                </div>
              </div>

              {/* Checkbox de Confirmação Extra */}
              <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors group">
                <input 
                  type="checkbox" 
                  checked={hasConfirmedIrreversible}
                  onChange={(e) => setHasConfirmedIrreversible(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800 transition-colors">
                  Estou ciente de que esta ação é irreversível e desejo prosseguir com a mesclagem dos dados.
                </span>
              </label>
            </div>

            {/* Footer Modal */}
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowMergeModal(false)}
                className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={!mainStudentId || !duplicateStudentId || !hasConfirmedIrreversible || isMerging}
                onClick={handleMergeRequest}
                className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 ${
                  !mainStudentId || !duplicateStudentId || !hasConfirmedIrreversible || isMerging
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20'
                }`}
              >
                {isMerging ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Mesclando...
                  </>
                ) : (
                  <>
                    <GitMerge size={16} />
                    Confirmar Mesclagem
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação Final de Mesclagem */}
      <ConfirmModal
        isOpen={showConfirmFinal}
        title="Confirmar Mesclagem?"
        message={`Você está prestes a mesclar todos os dados de "${students.find(s => s.id === duplicateStudentId)?.fullName}" para o prontuário de "${students.find(s => s.id === mainStudentId)?.fullName}". Esta operação não pode ser desfeita.`}
        confirmLabel="Sim, Confirmar Mesclagem"
        cancelLabel="Cancelar"
        onConfirm={executeMerge}
        onCancel={() => setShowConfirmFinal(false)}
        type="danger"
        isLoading={isMerging}
      />

      {/* Modal Importador */}
      {showImporter && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto custom-scrollbar relative">
            <button
              onClick={() => setShowImporter(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            {/* Importação Dinâmica do Componente se necessário, ou uso direto */}
            <React.Suspense fallback={<div className="bg-white p-20 rounded-2xl flex justify-center"><Loader2 className="animate-spin text-teal-600" size={48} /></div>}>
              <CSVImporter
                type="students"
                currentUser={currentUser || { name: 'Admin', email: '', role: 'ADMIN' }}
                onComplete={() => {
                  setShowImporter(false);
                  window.location.reload(); // Simplificado para atualizar lista
                }}
              />
            </React.Suspense>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden relative min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Aluno / Identificação</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Situação / Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Idade • Série</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <UserIcon size={48} className="mb-4 opacity-20" />
                      <p className="font-bold text-slate-600">Nenhum registro encontrado</p>
                      <p className="text-sm">Tente ajustar os filtros de busca</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const status = getStudentStatus(student);
                  const StatusIcon = status.icon;
                  const age = new Date().getFullYear() - new Date(student.birthDate).getFullYear();

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* ALUNO */}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-slate-500 overflow-hidden border-2 border-white shadow-sm">
                            {student.photoUrl ? (
                              <img className="h-full w-full object-cover" src={student.photoUrl} alt="" />
                            ) : (
                              <span className="font-bold text-xs">{student.fullName.charAt(0)}</span>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-slate-700">{student.fullName}</div>
                            {canViewClinical && student.clinical.diagnosis ? (
                              <div className="text-[10px] font-bold text-rose-500 mt-0.5 bg-rose-50 px-1.5 py-0.5 rounded w-fit">
                                {student.clinical.diagnosis}
                              </div>
                            ) : (
                              <div className="text-[10px] font-medium text-slate-400 mt-0.5">SUS: {student.susCard || 'N/A'}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${status.color}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                        <div className="text-[10px] text-slate-400 font-medium mt-1 truncate max-w-[150px]">
                          {student.school.schoolName}
                        </div>
                      </td>

                      {/* IDADE / ESCOLA */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold text-slate-700">{age} anos</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{student.school.grade || '-'}</span>
                        </div>
                      </td>

                      {/* RESPONSÁVEL */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-600">{student.guardians[0]?.name || 'Não informado'}</span>
                          <span className="text-[10px] text-slate-400">{student.guardians[0]?.phone || '-'}</span>
                        </div>
                      </td>

                      {/* AÇÕES */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 relative">
                          {/* Botão Principal: Abrir Prontuário */}
                          <button
                            onClick={() => onSelectStudent(student)}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-primary-600 hover:shadow-lg hover:shadow-primary-600/20 transition-all active:scale-95"
                          >
                            Abrir Prontuário <ChevronRight size={14} />
                          </button>

                          {/* Menu de Contexto */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === student.id ? null : student.id);
                              }}
                              className={`p-2 rounded-lg transition-colors ${activeMenuId === student.id ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                            >
                              <MoreVertical size={18} />
                            </button>

                            {activeMenuId === student.id && (
                              <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-scaleIn origin-top-right">
                                <div className="p-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onSelectStudent(student); setActiveMenuId(null); }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary-600 rounded-lg flex items-center gap-2 sm:hidden"
                                  >
                                    <FileText size={14} /> Abrir Prontuário
                                  </button>

                                  {/* Ações para Clínicos e Social */}
                                  {(isClinician || isSocialWorker) && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onSelectStudent(student); /* Navegação para sessão deve ser via perfil ou ajustar prop onNewSession */ setActiveMenuId(null); }}
                                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary-600 rounded-lg flex items-center gap-2"
                                    >
                                      <Activity size={14} /> Novo Atendimento
                                    </button>
                                  )}

                                  {/* Ações Administrativas */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(student); setActiveMenuId(null); }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg flex items-center gap-2"
                                  >
                                    <Edit size={14} /> Editar Cadastro
                                  </button>

                                  {currentUser?.role === 'ADMIN' && (
                                    <>
                                      <div className="h-px bg-slate-100 my-1" />
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setStudentToDelete(student); setActiveMenuId(null); }}
                                        className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg flex items-center gap-2"
                                      >
                                        <Trash2 size={14} /> Excluir Registro
                                      </button>
                                    </>
                                  )}

                                  {/* PDF (Visível para todos com acesso a lista) */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); generateStudentPDF(student); setActiveMenuId(null); }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-emerald-600 rounded-lg flex items-center gap-2"
                                  >
                                    <FileText size={14} /> Gerar Relatório PDF
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-6 animate-scaleIn">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Excluir Registro?</h3>
              <p className="text-sm text-slate-500 font-medium mb-6">
                Tem certeza que deseja remover <strong className="text-slate-800">{studentToDelete.fullName}</strong>?
                <br /><span className="text-xs text-red-400 block mt-2">Esta ação apagará todo o histórico clínico irremediavelmente.</span>
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setStudentToDelete(null)}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors uppercase text-xs tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 px-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30 uppercase text-xs tracking-wider"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
