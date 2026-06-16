
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Student, School, User, Specialty, AuditAction } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { generateStudentPDF } from '../utils/pdfExport';
import {
  Search, ChevronRight, ChevronDown, User as UserIcon, Trash2, AlertTriangle, X,
  UserPlus, Edit, Filter, Globe, FileText, MoreVertical, Activity, Clock,
  CheckCircle2, AlertCircle, FileEdit, Loader2, GitMerge, CopyCheck,
  Building2, Dna, Calendar, SortAsc, SortDesc
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { CSVImporter } from './CSVImporter';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '@/src/hooks/useAuth';
import { isPerfilRestritoProntuario } from '@/src/config/perfilRestrito';
import CadastroRapidoModal from './CadastroRapidoModal';

interface StudentListProps {
  students: Student[];
  schools: School[];
  onSelectStudent: (student: Student) => void | Promise<void>;
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
  const { user: authUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('PatientList_searchTerm') || '');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(() => sessionStorage.getItem('PatientList_selectedSchoolId') || 'ALL');

  useEffect(() => {
    sessionStorage.setItem('PatientList_searchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    sessionStorage.setItem('PatientList_selectedSchoolId', selectedSchoolId);
  }, [selectedSchoolId]);
  const [showImporter, setShowImporter] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showConfirmFinal, setShowConfirmFinal] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [listaEscopo, setListaEscopo] = useState<'todos' | 'meus'>('todos');
  const [showCadastroRapido, setShowCadastroRapido] = useState(false);
  const [sessionsInfo, setSessionsInfo] = useState<Record<string, { total: number, lastDate: string | null }>>({});
  const [meusAlunoIds, setMeusAlunoIds] = useState<Set<string> | null>(null);
  const { addToast } = useToast();

  // Estados para Mesclagem
  const [mainStudentId, setMainStudentId] = useState<string>('');
  const [duplicateStudentId, setDuplicateStudentId] = useState<string>('');
  const [hasConfirmedIrreversible, setHasConfirmedIrreversible] = useState(false);

  // Menu de Ações
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterSchool, setFilterSchool] = useState<string>('');
  const [filterDiag, setFilterDiag] = useState<string>('');
  const [filterSemRegistro, setFilterSemRegistro] = useState(false);
  const [sortField, setSortField] = useState<'name'|'age'|'lastSession'>('name');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };
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
  const canDelete = currentUser?.role === 'ADMIN' || currentUser?.role === 'SECRETARIA_SEDE';
const canRegister = currentUser?.role === 'ADMIN' || currentUser?.role === 'EDUCATION_SECRETARY' || currentUser?.role === 'ASSISTANT' || currentUser?.role === 'SECRETARIA_SEDE' || currentUser?.role === 'SECRETARIA_COCAL' || currentUser?.role === 'ESCOLA';
  const canViewClinical = currentUser?.role === 'ADMIN' || currentUser?.role === 'SPECIALIST' || currentUser?.role === 'ESCOLA';

  // Permissões Específicas
  const isSocialWorker = currentUser?.specialty === Specialty.SOCIAL_WORK;
  const isClinician = currentUser?.role === 'SPECIALIST';

  const isSchool = currentUser?.role === 'ESCOLA';

  const podeAlternarListaRede =
    !!authUser && SupabaseService.podeVerTodosAlunosNaRede(authUser);

  /** Clínicos/terapeutas restritos: lista só por agendamento; sem busca global na Central de Prontuários. */
  const listaSomenteAgendaProfissional =
    !!authUser &&
    isPerfilRestritoProntuario(authUser) &&
    !SupabaseService.podeVerTodosAlunosNaRede(authUser);

  useEffect(() => {
    if (!podeAlternarListaRede || listaEscopo !== 'meus' || !authUser?.id) {
      setMeusAlunoIds(null);
      return;
    }
    let cancelled = false;
    SupabaseService.listAlunoIdsVinculadosProfissional(authUser.id)
      .then((ids) => {
        if (!cancelled) setMeusAlunoIds(new Set(ids));
      })
      .catch(() => {
        if (!cancelled) setMeusAlunoIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [podeAlternarListaRede, listaEscopo, authUser?.id]);

  // Carrega as informações das sessões (última sessão)
  useEffect(() => {
      let isMounted = true;
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
          if (isMounted) setSessionsInfo(info);
      };
      if (students.length > 0) fetchSessionsInfo();
      return () => { isMounted = false; };
  }, [students]);

  const baseStudentList = useMemo(() => {
    if (podeAlternarListaRede && listaEscopo === 'meus') {
      if (!meusAlunoIds) return [];
      return students.filter((s) => meusAlunoIds.has(s.id));
    }
    return students;
  }, [students, podeAlternarListaRede, listaEscopo, meusAlunoIds]);

  const abrirProntuario = async (student: Student) => {
    try {
      await onSelectStudent(student);
    } catch (e: any) {
      console.error(e);
      addToast(e?.message || 'Não foi possível abrir o prontuário.', 'error');
    }
  };

  const filteredStudents = useMemo(() => baseStudentList.filter(p => {
    // 1. User Scope Filter (Cocal Security) — distrito, nome da escola ou unidade do aluno
    if (isRestricted) {
      const unit = String(p.unit || '').toUpperCase();
      const schoolName = (p.school.schoolName || '').toLowerCase();
      const district = (p.school.district || '').toLowerCase();
      const isCocalScope =
        unit === 'COCAL' ||
        schoolName.includes('cocal') ||
        district.includes('cocal');
      if (!isCocalScope) return false;
    }

    // 1b. School Specific Restriction — usa o UUID real (schoolId) resolvido no login
    if (isSchool) {
      // currentUser.schoolId é o UUID da tabela schools, resolvido via lookup por INEP no login
      const mySchoolId = currentUser?.schoolId;
      if (!mySchoolId) return false; // Segurança: sem UUID, escola não vê nada
      if (p.school?.schoolId !== mySchoolId) return false;
    }

    if (listaSomenteAgendaProfissional) {
      // Para perfis restritos, aplica os filtros visuais mas mantém a lista do agendamento
      const matchesSem = !filterSemRegistro || !sessionsInfo[p.id]?.lastDate;
      const matchesDiagFilter = !filterDiag || normalizeText(p.clinical?.diagnosis||'').includes(normalizeText(filterDiag));
      const matchesSchoolFilter = !filterSchool || normalizeText(p.school?.schoolName||'').includes(normalizeText(filterSchool));
      return matchesSem && matchesDiagFilter && matchesSchoolFilter;
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

    return matchesSearch && matchesSchool && (!filterSemRegistro || !sessionsInfo[p.id]?.lastDate) && (!filterDiag || normalizeText(p.clinical?.diagnosis||'').includes(normalizeText(filterDiag))) && (!filterSchool || normalizeText(p.school?.schoolName||'').includes(normalizeText(filterSchool)));
  }), [baseStudentList, searchTerm, selectedSchoolId, isRestricted, isSchool, currentUser?.schoolInep, currentUser?.name, canViewClinical, listaSomenteAgendaProfissional, filterSemRegistro, filterDiag, filterSchool, sessionsInfo, normalizeText]);

  // Sort + paginação sobre filteredStudents
  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      if (sortField === 'name') return sortDir === 'asc' ? a.fullName.localeCompare(b.fullName) : b.fullName.localeCompare(a.fullName);
      if (sortField === 'age') return sortDir === 'asc' ? (a.birthDate||'').localeCompare(b.birthDate||'') : (b.birthDate||'').localeCompare(a.birthDate||'');
      if (sortField === 'lastSession') {
        const da = sessionsInfo[a.id]?.lastDate || '0000';
        const db = sessionsInfo[b.id]?.lastDate || '0000';
        return sortDir === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
      }
      return 0;
    });
  }, [filteredStudents, sortField, sortDir, sessionsInfo]);

  const pagedStudents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedStudents.slice(start, start + PAGE_SIZE);
  }, [sortedStudents, currentPage]);

  const totalPages = Math.ceil(sortedStudents.length / PAGE_SIZE);

  // Memoize school options — recomputed only when students list changes
  const schoolOptions = useMemo(() => [
    { value: 'ALL', label: 'Todas as Escolas' },
    ...Array.from(new Map(
      baseStudentList
        .filter(s => s.school?.schoolId || s.school?.schoolName)
        .map(s => {
          const id = s.school?.schoolId || s.school?.schoolName;
          return [id, s.school?.schoolName || 'Sem nome'];
        })
    ).entries())
      .map(([id, name]) => ({ value: id as string, label: name as string }))
      .sort((a, b) => a.label.localeCompare(b.label))
  ], [baseStudentList]);

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
      const mainStudent = baseStudentList.find(s => s.id === mainStudentId);
      const duplicateStudent = baseStudentList.find(s => s.id === duplicateStudentId);
      
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
          {podeAlternarListaRede && (
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 shadow-sm self-start sm:self-center">
              <button
                type="button"
                onClick={() => setListaEscopo('todos')}
                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  listaEscopo === 'todos'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Visão geral
              </button>
              <button
                type="button"
                onClick={() => setListaEscopo('meus')}
                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  listaEscopo === 'meus'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Por profissional
              </button>
            </div>
          )}
          {/* Filtros (secretaria/admin/coordenação — profissional restrita não tem busca global) */}
          {!listaSomenteAgendaProfissional && (
            <>
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
            </>
          )}

          {/* Filtros rápidos já aparecem acima da tabela para todos os perfis */}

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
              {currentUser?.role === 'SPECIALIST' && (
                <button
                  onClick={() => setShowCadastroRapido(true)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-95 whitespace-nowrap"
                >
                  <UserPlus size={16} />
                  Cadastro Rápido
                </button>
              )}
              <button
                onClick={onRegister}
                data-testid="btn-cadastrar"
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-95 whitespace-nowrap"
              >
                <UserPlus size={16} />
                Cadastrar Aluno
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
                    options={baseStudentList.map(s => ({ value: s.id, label: `${s.fullName} ${s.cpf ? `(${s.cpf})` : ''}` }))}
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
                    options={baseStudentList.map(s => ({ value: s.id, label: `${s.fullName} ${s.cpf ? `(${s.cpf})` : ''}` }))}
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
        message={`Você está prestes a mesclar todos os dados de "${baseStudentList.find(s => s.id === duplicateStudentId)?.fullName}" para o prontuário de "${baseStudentList.find(s => s.id === mainStudentId)?.fullName}". Esta operação não pode ser desfeita.`}
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

      {/* STATS + FILTROS RÁPIDOS — visível para todos os perfis */}
      <div className="grid grid-cols-3 gap-3 mb-2">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-xl font-bold" style={{color:'#A32D2D'}}>{filteredStudents.filter(s => !sessionsInfo[s.id]?.lastDate).length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Sem registro</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-xl font-bold" style={{color:'#10B981'}}>{filteredStudents.filter(s => !!sessionsInfo[s.id]?.lastDate).length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Com registro</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-slate-700">{filteredStudents.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Total</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center mb-2">
        {/* Filtros de status */}
        <button onClick={() => setFilterSemRegistro(false)}
          className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all"
          style={!filterSemRegistro ? {background:'#8B1A3A',color:'#fff',borderColor:'#8B1A3A'} : {background:'white',borderColor:'#e2e8f0',color:'#64748b'}}>
          Todos ({pagedStudents.length > 0 ? filteredStudents.length : 0})
        </button>
        <button onClick={() => setFilterSemRegistro(true)}
          className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all"
          style={filterSemRegistro ? {background:'#FCEBEB',color:'#A32D2D',borderColor:'#F09595'} : {background:'white',borderColor:'#F09595',color:'#A32D2D'}}>
          Sem registro
        </button>
        <button onClick={() => setFilterSemRegistro(false)}
          className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all"
          style={{background:'white',borderColor:'#97C459',color:'#3B6D11'}}>
          Com registro
        </button>

        {/* Separador */}
        <div className="w-px h-6 bg-slate-200 mx-1"/>

        {/* Filtro por Escola */}
        <div className="relative">
          <select
            value={filterSchool}
            onChange={e => { setFilterSchool(e.target.value); setCurrentPage(1); }}
            className="pl-3 pr-7 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-600 outline-none appearance-none cursor-pointer hover:border-slate-300 transition-all"
            style={filterSchool ? {borderColor:'#85B7EB',background:'#E6F1FB',color:'#185FA5'} : {}}>
            <option value="">🏫 Todas as escolas</option>
            {Array.from(new Set(baseStudentList.map(s => s.school?.schoolName).filter(Boolean))).sort().map(school => (
              <option key={school} value={school!}>{school}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</div>
        </div>

        {/* Filtro por CID/Diagnóstico */}
        <div className="relative">
          <select
            value={filterDiag}
            onChange={e => { setFilterDiag(e.target.value); setCurrentPage(1); }}
            className="pl-3 pr-7 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-600 outline-none appearance-none cursor-pointer hover:border-slate-300 transition-all"
            style={filterDiag ? {borderColor:'#AFA9EC',background:'#EEEDFE',color:'#3C3489'} : {}}>
            <option value="">🧬 Todos os diagnósticos</option>
            {Array.from(new Set(baseStudentList.map(s => s.clinical?.diagnosis).filter(Boolean))).sort().map(diag => (
              <option key={diag} value={diag!}>{diag}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</div>
        </div>

        {/* Limpar filtros */}
        {(filterSchool || filterDiag || filterSemRegistro) && (
          <button onClick={() => { setFilterSchool(''); setFilterDiag(''); setFilterSemRegistro(false); setCurrentPage(1); }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-400 hover:bg-slate-50 transition-all">
            ✕ Limpar filtros
          </button>
        )}
      </div>
      {/* CARDS MOBILE — visível apenas em telas < 640px */}
      <div className="sm:hidden space-y-2 mb-4">
        {pagedStudents.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-slate-400">
            <UserIcon size={36} className="mb-3 opacity-20"/>
            <p className="font-bold text-slate-500 text-sm">{listaSomenteAgendaProfissional ? 'Nenhum aluno agendado para você ainda.' : 'Nenhum registro encontrado'}</p>
            <p className="text-xs mt-1">{listaSomenteAgendaProfissional ? 'Os alunos aparecem quando a secretaria vincular você a um agendamento.' : 'Tente ajustar os filtros'}</p>
          </div>
        ) : pagedStudents.map((student) => {
          const status = getStudentStatus(student);
          const StatusIcon = status.icon;
          const sessInfo = sessionsInfo[student.id];
          const lastDate = sessInfo?.lastDate;
          const diasSemRegistro = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) : null;
          return (
            <div key={student.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden border-2 border-white shadow-sm"
                  style={{background: lastDate ? '#EAF3DE' : '#FCEBEB', color: lastDate ? '#3B6D11' : '#A32D2D'}}>
                  {student.photoUrl
                    ? <img src={student.photoUrl} className="w-full h-full object-cover" alt={student.fullName}/>
                    : <span className="font-bold">{student.fullName.charAt(0)}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{student.fullName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{student.school?.schoolName||'—'} · {student.school?.grade||'—'}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${status.color}`}>
                  <StatusIcon size={10}/> {status.label}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  {lastDate ? (
                    <span style={{color: diasSemRegistro && diasSemRegistro > 30 ? '#A32D2D' : '#3B6D11'}}>
                      {new Date(lastDate).toLocaleDateString('pt-BR')} · {sessInfo?.total} sessão{sessInfo?.total !== 1 ? 'ões' : ''}
                    </span>
                  ) : <span className="text-slate-400">Sem registro</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => void abrirProntuario(student)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B1A3A] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-[#731530] transition-all">
                    Abrir <ChevronRight size={12}/>
                  </button>
                  <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId===student.id?null:student.id); }}
                      className={`p-1.5 rounded-lg transition-colors ${activeMenuId===student.id?'bg-slate-200 text-slate-800':'text-slate-400 hover:bg-slate-100'}`}>
                      <MoreVertical size={16}/>
                    </button>
                    {activeMenuId === student.id && (
                      <div ref={menuRef} className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-scaleIn origin-top-right">
                        <div className="p-1">
                          {(isClinician||isSocialWorker) && <button onClick={(e) => { e.stopPropagation(); void abrirProntuario(student); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2"><Activity size={13}/> Novo Atendimento</button>}
                          <button onClick={(e) => { e.stopPropagation(); onEdit(student); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2"><Edit size={13}/> Editar Cadastro</button>
                          {(currentUser?.role==='ADMIN'||currentUser?.role==='SECRETARIA_SEDE') && (<><div className="h-px bg-slate-100 my-1"/><button onClick={(e) => { e.stopPropagation(); setStudentToDelete(student); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-2"><Trash2 size={13}/> Excluir</button></>)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TABLE PREMIUM — visível apenas em telas >= 640px */}
      <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full" style={{borderCollapse:'separate',borderSpacing:0}}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-10 px-3 py-3"></th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-1">Aluno / Identificação {sortField==='name' ? (sortDir==='asc'?<SortAsc size={11}/>:<SortDesc size={11}/>) : <span className="opacity-30">↕</span>}</div>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Situação</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer select-none" onClick={() => toggleSort('age')}>
                  <div className="flex items-center gap-1">Idade {sortField==='age' ? (sortDir==='asc'?<SortAsc size={11}/>:<SortDesc size={11}/>) : <span className="opacity-30">↕</span>}</div>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer select-none" onClick={() => toggleSort('lastSession')}>
                  <div className="flex items-center gap-1">Última Sessão {sortField==='lastSession' ? (sortDir==='asc'?<SortAsc size={11}/>:<SortDesc size={11}/>) : <span className="opacity-30">↕</span>}</div>
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pagedStudents.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center text-slate-400">
                    <UserIcon size={40} className="mb-3 opacity-20"/>
                    <p className="font-bold text-slate-500 text-sm">{listaSomenteAgendaProfissional ? 'Nenhum aluno agendado para você ainda.' : 'Nenhum registro encontrado'}</p>
                    <p className="text-xs mt-1">{listaSomenteAgendaProfissional ? 'Os alunos aparecem quando a secretaria vincular você a um agendamento.' : 'Tente ajustar os filtros'}</p>
                  </div>
                </td></tr>
              ) : pagedStudents.map((student) => {
                const status = getStudentStatus(student);
                const StatusIcon = status.icon;
                const age = new Date().getFullYear() - new Date(student.birthDate).getFullYear();
                const isExpanded = expandedRows.has(student.id);
                const sessInfo = sessionsInfo[student.id];
                const lastDate = sessInfo?.lastDate;
                const diasSemRegistro = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) : null;
                const nextAppt = null; // placeholder — pode ser implementado
                return (
                  <React.Fragment key={student.id}>
                    <tr className={`transition-colors border-b border-slate-100 ${isExpanded ? 'bg-slate-50/80' : 'hover:bg-slate-50/50'}`}>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleExpand(student.id)}
                          className="w-6 h-6 rounded flex items-center justify-center border transition-all text-xs"
                          style={isExpanded ? {background:'#8B1A3A',color:'#fff',borderColor:'#8B1A3A'} : {background:'var(--color-background-secondary)',borderColor:'var(--color-border-tertiary)',color:'var(--color-text-secondary)'}}>
                          {isExpanded ? '▾' : '▸'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border-2 border-white shadow-sm"
                            style={{background: lastDate ? '#EAF3DE' : '#FCEBEB', color: lastDate ? '#3B6D11' : '#A32D2D'}}>
                            {student.photoUrl
                              ? <img src={student.photoUrl} className="w-full h-full object-cover" alt={student.fullName}/>
                              : <span className="font-bold">{student.fullName.charAt(0)}</span>
                            }
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-700">{student.fullName}</div>
                            <div className="text-[10px] text-slate-400">SUS: {student.susCard||'N/A'} · {student.school?.schoolName||'—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${status.color}`}>
                            <StatusIcon size={10}/> {status.label}
                          </span>
                          {canViewClinical && student.clinical?.diagnosis && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EEEDFE] text-[#3C3489] border border-[#AFA9EC]">
                              <Dna size={9}/> {student.clinical.diagnosis}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-slate-700">{age} anos</span>
                        <div className="text-[10px] text-slate-400">{student.school?.grade||'—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        {lastDate ? (
                          <>
                            <span className="text-xs font-bold" style={{color: diasSemRegistro && diasSemRegistro > 30 ? '#A32D2D' : '#3B6D11'}}>
                              {new Date(lastDate).toLocaleDateString('pt-BR')}
                            </span>
                            <div className="text-[10px]" style={{color: diasSemRegistro && diasSemRegistro > 30 ? '#A32D2D' : 'var(--color-text-secondary)'}}>
                              {sessInfo?.total} sessão{sessInfo?.total !== 1 ? 'ões' : ''}{diasSemRegistro && diasSemRegistro > 30 ? ` · há ${diasSemRegistro} dias` : ''}
                            </div>
                          </>
                        ) : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 relative">
                          <button onClick={() => void abrirProntuario(student)}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#8B1A3A] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-[#731530] transition-all">
                            Abrir <ChevronRight size={12}/>
                          </button>
                          <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId===student.id?null:student.id); }}
                              className={`p-1.5 rounded-lg transition-colors ${activeMenuId===student.id?'bg-slate-200 text-slate-800':'text-slate-400 hover:bg-slate-100'}`}>
                              <MoreVertical size={16}/>
                            </button>
                            {activeMenuId === student.id && (
                              <div ref={menuRef} className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-scaleIn origin-top-right">
                                <div className="p-1">
                                  <button onClick={(e) => { e.stopPropagation(); void abrirProntuario(student); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2 sm:hidden"><FileText size={13}/> Abrir Prontuário</button>
                                  {(isClinician||isSocialWorker) && <button onClick={(e) => { e.stopPropagation(); void abrirProntuario(student); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2"><Activity size={13}/> Novo Atendimento</button>}
                                  <button onClick={(e) => { e.stopPropagation(); onEdit(student); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2"><Edit size={13}/> Editar Cadastro</button>
                                  {(currentUser?.role==='ADMIN'||currentUser?.role==='SECRETARIA_SEDE') && (<><div className="h-px bg-slate-100 my-1"/><button onClick={(e) => { e.stopPropagation(); setStudentToDelete(student); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-2"><Trash2 size={13}/> Excluir</button></>)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {/* EXPANDED ROW */}
                    {isExpanded && (
                      <tr className="border-b border-slate-100">
                        <td colSpan={6} className="px-0 py-0">
                          <div className="px-6 py-4 pl-16 grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50/50">
                            <div className="bg-white border border-slate-200 rounded-xl p-3">
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Diagnóstico / CID</div>
                              <div className="text-xs font-bold text-slate-700">{student.clinical?.diagnosis || <span className="text-slate-400 font-normal">Sem diagnóstico</span>}</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-3">
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Escola · Turma · Turno</div>
                              <div className="text-xs font-bold text-slate-700">{student.school?.schoolName||'—'}</div>
                              <div className="text-[10px] text-slate-400">{student.school?.grade||'—'} · {student.school?.shift||'—'}</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-3">
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Total de sessões</div>
                              <div className="text-xs font-bold text-slate-700">{sessInfo?.total||0} sessão{(sessInfo?.total||0)!==1?'ões':''}</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-3">
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Responsável</div>
                              <div className="text-xs font-bold text-slate-700">{student.guardianName||'—'}</div>
                              <div className="text-[10px] text-slate-400">{student.guardianPhone||'—'}</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-3">
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Data de nascimento</div>
                              <div className="text-xs font-bold text-slate-700">{student.birthDate ? new Date(student.birthDate).toLocaleDateString('pt-BR') : '—'}</div>
                              <div className="text-[10px] text-slate-400">{age} anos</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-3">
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">SUS / CPF</div>
                              <div className="text-xs font-bold text-slate-700">SUS: {student.susCard||'N/A'}</div>
                              <div className="text-[10px] text-slate-400">CPF: {student.cpf||'—'}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* PAGINAÇÃO */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            Mostrando {Math.min((currentPage-1)*PAGE_SIZE+1, sortedStudents.length)}–{Math.min(currentPage*PAGE_SIZE, sortedStudents.length)} de {sortedStudents.length} alunos
          </span>
          <div className="flex gap-1">
            <button disabled={currentPage===1} onClick={() => setCurrentPage(p=>p-1)}
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all">
              <ChevronRight size={12} className="rotate-180"/>
            </button>
            {Array.from({length:Math.min(totalPages,5)}, (_,i) => i+1).map(p => (
              <button key={p} onClick={() => setCurrentPage(p)}
                className="w-7 h-7 rounded-lg border text-xs font-bold transition-all"
                style={currentPage===p ? {background:'#8B1A3A',color:'#fff',borderColor:'#8B1A3A'} : {background:'white',borderColor:'#e2e8f0',color:'#64748b'}}>
                {p}
              </button>
            ))}
            <button disabled={currentPage===totalPages||totalPages===0} onClick={() => setCurrentPage(p=>p+1)}
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all">
              <ChevronRight size={12}/>
            </button>
          </div>
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

      {currentUser && (
        <CadastroRapidoModal
          isOpen={showCadastroRapido}
          onClose={() => setShowCadastroRapido(false)}
          currentUserId={currentUser.id}
          currentUserName={currentUser.name}
          onCreated={() => { onRefresh?.(); }}
        />
      )}
    </div>
  );
};
