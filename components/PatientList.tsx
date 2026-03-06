
import React, { useState, useEffect, useRef } from 'react';
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
  FileEdit
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';

interface StudentListProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onDelete: (id: string) => void;
  onRegister: () => void;
  onEdit: (student: Student) => void;
  currentUser?: User;
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

export const PatientList: React.FC<StudentListProps> = ({ students, onSelectStudent, onDelete, onRegister, onEdit, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('ALL');

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

  // Normalização de texto
  const normalizeText = (text: string) => {
    return (text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const isRestricted = (currentUser?.role === 'EDUCATION_SECRETARY' || currentUser?.role === 'ASSISTANT' || currentUser?.role === 'SECRETARIA_COCAL' || currentUser?.role === 'SECRETARIA_SEDE') && currentUser?.scope === 'COCAL';
  const canRegister = currentUser?.role === 'ADMIN' || currentUser?.role === 'EDUCATION_SECRETARY' || currentUser?.role === 'ASSISTANT' || currentUser?.role === 'SECRETARIA_SEDE' || currentUser?.role === 'SECRETARIA_COCAL' || currentUser?.role === 'ESCOLA';
  const canViewClinical = currentUser?.role === 'ADMIN' || currentUser?.role === 'SPECIALIST';

  // Permissões Específicas
  const isSocialWorker = currentUser?.specialty === Specialty.SOCIAL_WORK;
  const isClinician = currentUser?.role === 'SPECIALIST';

  const isSchool = currentUser?.role === 'ESCOLA';

  // Filter students based on search, school filter AND user scope
  const filteredStudents = students.filter(p => {
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
  });

  const confirmDelete = async () => {
    if (studentToDelete) {
      if (currentUser) {
        await SupabaseService.logAction(currentUser, AuditAction.DELETE, 'ALUNOS', studentToDelete.fullName);
      }
      onDelete(studentToDelete.id);
      setStudentToDelete(null);
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
                ...Array.from(new Map(
                  students
                    .filter(s => s.school?.schoolId || s.school?.schoolName)
                    .map(s => {
                      const id = s.school?.schoolId || s.school?.schoolName; // Fallback para o nome se não tiver ID
                      return [id, s.school?.schoolName || 'Sem nome'];
                    })
                ).entries())
                  .map(([id, name]) => ({ value: id as string, label: name as string }))
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
            <button
              onClick={onRegister}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-95 whitespace-nowrap"
            >
              <UserPlus size={16} />
              Novo Aluno
            </button>
          )}
        </div>
      </div>

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
