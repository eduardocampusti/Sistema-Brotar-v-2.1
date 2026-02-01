
import React, { useState, useEffect } from 'react';
import { Student, School, User } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { generateStudentPDF } from '../utils/pdfExport';
import { Search, ChevronRight, User as UserIcon, Trash2, AlertTriangle, X, UserPlus, Edit, School as SchoolIcon, Filter, Globe, FileText } from 'lucide-react';

interface StudentListProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onDelete: (id: string) => void;
  onRegister: () => void;
  onEdit: (student: Student) => void;
  currentUser?: User; // Passar o usuário atual para filtrar visibilidade
}

export const PatientList: React.FC<StudentListProps> = ({ students, onSelectStudent, onDelete, onRegister, onEdit, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('ALL');
  const [schools, setSchools] = useState<School[]>([]);

  // Função auxiliar para normalizar texto (remover acentos)
  const normalizeText = (text: string) => {
    return (text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  useEffect(() => {
    // Carregar escolas para o filtro
    async function loadSchools() {
      const data = await SupabaseService.getSchools();
      setSchools(data);
    }
    loadSchools();
  }, []);

  const isRestricted = currentUser?.role === 'EDUCATION_SECRETARY' && currentUser?.scope === 'COCAL';
  const canRegister = currentUser?.role === 'ADMIN' || currentUser?.role === 'EDUCATION_SECRETARY';

  // Filter students based on search, school filter AND user scope
  const filteredStudents = students.filter(p => {
    // 1. User Scope Filter (Cocal Security)
    if (isRestricted) {
      const schoolName = (p.school.schoolName || '').toLowerCase();
      const district = (p.school.district || '').toLowerCase();

      // Strict Check: School name OR District must contain 'cocal'
      if (!schoolName.includes('cocal') && !district.includes('cocal')) {
        return false;
      }
    }

    // 2. Search Term Filter
    const normalizedSearch = normalizeText(searchTerm);
    const matchesSearch =
      normalizeText(p.fullName || '').includes(normalizedSearch) ||
      normalizeText(p.clinical?.diagnosis || '').includes(normalizedSearch) ||
      (p.cpf || '').includes(searchTerm);

    // 3. School Dropdown Filter
    const matchesSchool = selectedSchoolId === 'ALL' || p.school?.schoolId === selectedSchoolId;

    return matchesSearch && matchesSchool;
  });

  const confirmDelete = () => {
    if (studentToDelete) {
      onDelete(studentToDelete.id);
      setStudentToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Alunos Cadastrados
            {isRestricted && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full border border-orange-200 flex items-center gap-1 font-bold">
                <Globe size={10} /> Filtro Cocal Ativo
              </span>
            )}
          </h2>
          <p className="text-slate-500">
            {isRestricted ? 'Gerencie os alunos das unidades do Distrito Cocal' : 'Gerencie os prontuários e acessos da rede'}
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {/* Filtro de Escola */}
          <div className="relative w-full md:w-64">
            <SchoolIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              className="w-full pl-10 pr-8 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white text-slate-700 truncate"
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
            >
              <option value="ALL">Todas as Escolas</option>
              {Array.from(new Map(students.filter(s => s.school?.schoolId).map(s => [s.school?.schoolId, s.school?.schoolName])).entries()).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Filter size={14} className="text-slate-400" />
            </div>
          </div>

          {/* Busca Textual */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou diagnóstico..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {canRegister && (
            <button
              onClick={onRegister}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm whitespace-nowrap"
            >
              <UserPlus size={20} />
              Novo Aluno
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome / Diagnóstico</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Escola / Idade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Responsável</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    {searchTerm ? 'Nenhum aluno encontrado para sua busca.' : 'Nenhum aluno cadastrado nesta visualização.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onSelectStudent(student)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 overflow-hidden">
                          {student.photoUrl ? (
                            <img className="h-10 w-10 object-cover" src={student.photoUrl} alt="" />
                          ) : (
                            <UserIcon size={20} />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{student.fullName}</div>
                          {/* Diagnóstico em Vermelho logo abaixo do nome */}
                          <div className="text-xs font-bold text-red-600 mt-0.5">
                            {student.clinical.diagnosis} {student.clinical.cid ? `(CID: ${student.clinical.cid})` : ''}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">SUS: {student.susCard}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{student.school.schoolName || 'Sem escola'}</span>
                        <span className="text-xs">
                          {new Date().getFullYear() - new Date(student.birthDate).getFullYear()} anos • {student.school.grade}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {student.guardians[0]?.name}
                      <div className="text-xs text-slate-400">{student.guardians[0]?.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(student);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="Editar Aluno"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudentToDelete(student);
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            generateStudentPDF(student);
                          }}
                          className="flex items-center gap-1 p-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors text-xs font-bold"
                          title="Baixar Ficha PDF"
                        >
                          <FileText size={16} /> PDF
                        </button>
                        <button className="text-primary-600 hover:text-primary-900 flex items-center gap-1 ml-2">
                          Ver <ChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-fadeIn">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3 text-red-600">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Confirmar Exclusão</h3>
              </div>
              <button
                onClick={() => setStudentToDelete(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-slate-600 mb-6">
              Tem certeza que deseja excluir o aluno <strong className="text-slate-800">{studentToDelete.fullName}</strong>?
              Esta ação removerá todo o histórico clínico e não poderá ser desfeita.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
