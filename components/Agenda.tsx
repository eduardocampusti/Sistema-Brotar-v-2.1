
import React, { useState, useMemo } from 'react';
import { Student, User, Session, Specialty } from '../types';
import { Calendar as CalendarIcon, Clock, MapPin, User as UserIcon, Filter, ChevronLeft, ChevronRight, Plus, CheckCircle, CircleDashed } from 'lucide-react';

interface AgendaProps {
  students: Student[];
  currentUser: User;
  onNavigate: (page: string) => void;
}

export const Agenda: React.FC<AgendaProps> = ({ students, currentUser, onNavigate }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Helper to format date YYYY-MM-DD for comparison
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getSpecialtyRoute = (specialty?: Specialty) => {
      switch(specialty) {
          case Specialty.PSYCHOLOGY: return 'psychology/new-session';
          case Specialty.SOCIAL_WORK: return 'social-service/new-session';
          case Specialty.PSYCHOPEDAGOGY: return 'psychopedagogy/new-session';
          case Specialty.OCCUPATIONAL_THERAPY: return 'occupational-therapy/new-session';
          case Specialty.SPEECH_THERAPY: return 'speech-therapy/new-session';
          case Specialty.PHYSIOTHERAPY: return 'physiotherapy/new-session';
          default: return 'list';
      }
  };

  const handleNewAppointment = () => {
      if (currentUser.role === 'SPECIALIST' && currentUser.specialty) {
          onNavigate(getSpecialtyRoute(currentUser.specialty));
      } else {
          // Admins e Secretárias vão para a lista para escolher o aluno
          onNavigate('list');
      }
  };

  const allSessions = useMemo(() => {
    const list: { session: Session; student: Student }[] = [];

    students.forEach(student => {
      // 1. Filtro de Escopo (Segurança Cocal vs Sede)
      if (currentUser.role === 'EDUCATION_SECRETARY' && currentUser.scope === 'COCAL') {
         const schoolName = student.school.schoolName?.toLowerCase() || '';
         const district = student.school.district?.toLowerCase() || '';
         const isInCocal = schoolName.includes('cocal') || district.includes('cocal');
         
         if (!isInCocal) return;
      }

      if (student.history) {
        student.history.forEach(session => {
          // 2. Filtro de Especialista (Vê apenas sua especialidade ou sessões atribuídas a ele)
          if (currentUser.role === 'SPECIALIST') {
             const matchesName = session.professionalName === currentUser.name;
             const matchesSpecialty = session.specialty === currentUser.specialty;
             
             if (!matchesName && !matchesSpecialty) {
                 return;
             }
          }
          list.push({ session, student });
        });
      }
    });

    // Ordenar: Futuros primeiro (crescente), depois passados (decrescente)
    return list.sort((a, b) => new Date(b.session.date).getTime() - new Date(a.session.date).getTime());
  }, [students, currentUser]);

  const sessionsOnDate = allSessions.filter(
      item => item.session.date === formatDate(selectedDate)
  );

  const getSpecialtyColor = (specialty: Specialty) => {
      switch(specialty) {
          case Specialty.PSYCHOLOGY: return 'bg-purple-100 text-purple-700 border-purple-200';
          case Specialty.SOCIAL_WORK: return 'bg-blue-100 text-blue-700 border-blue-200';
          case Specialty.PSYCHOPEDAGOGY: return 'bg-orange-100 text-orange-700 border-orange-200';
          case Specialty.SPEECH_THERAPY: return 'bg-teal-100 text-teal-700 border-teal-200';
          case Specialty.OCCUPATIONAL_THERAPY: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
          default: return 'bg-slate-100 text-slate-700 border-slate-200';
      }
  };

  const changeDate = (days: number) => {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + days);
      setSelectedDate(newDate);
  };

  // Status visual baseado na data
  const getStatus = (dateString: string) => {
      const today = new Date().toISOString().split('T')[0];
      if (dateString > today) return { label: 'Agendado', icon: CircleDashed, color: 'text-blue-500 bg-blue-50' };
      if (dateString === today) return { label: 'Hoje', icon: Clock, color: 'text-green-600 bg-green-50' };
      return { label: 'Realizado', icon: CheckCircle, color: 'text-slate-400 bg-slate-100' };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="text-primary-600" /> 
            {currentUser.role === 'EDUCATION_SECRETARY' && currentUser.scope === 'COCAL' ? 'Agenda Distrital - Cocal' : 'Agenda Geral'}
          </h2>
          <p className="text-slate-500">
            {currentUser.role === 'SPECIALIST' 
                ? `Meus atendimentos de ${currentUser.specialty}`
                : 'Visão cronológica dos atendimentos da rede'}
          </p>
        </div>
        <button 
            onClick={handleNewAppointment}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
        >
            <Plus size={18} /> Novo Agendamento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Widget */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit lg:sticky lg:top-4">
            <h3 className="font-bold text-slate-700 mb-4">Calendário</h3>
            <div className="flex items-center justify-between mb-4 bg-slate-50 p-2 rounded-lg">
                <button onClick={() => changeDate(-1)} className="p-1 hover:bg-slate-200 rounded text-slate-600"><ChevronLeft size={20}/></button>
                <span className="font-medium text-slate-700 capitalize">
                    {selectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' })}
                </span>
                <button onClick={() => changeDate(1)} className="p-1 hover:bg-slate-200 rounded text-slate-600"><ChevronRight size={20}/></button>
            </div>
            
            <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <span className="text-sm text-blue-700 font-medium">Eventos no Dia</span>
                    <span className="font-bold text-blue-800 text-lg">{sessionsOnDate.length}</span>
                </div>
                <button 
                    onClick={() => setSelectedDate(new Date())}
                    className="w-full py-2 text-xs font-bold text-slate-500 hover:text-primary-600 hover:bg-slate-50 rounded border border-dashed border-slate-300 transition-colors"
                >
                    Voltar para Hoje
                </button>
            </div>
        </div>

        {/* List of Appointments */}
        <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <Clock size={18} className="text-primary-500" />
                    Cronograma do Dia
                </h3>
            </div>

            {sessionsOnDate.length === 0 ? (
                <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center flex flex-col items-center animate-fadeIn">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <CalendarIcon size={32} className="text-slate-300" />
                    </div>
                    <h4 className="text-lg font-medium text-slate-700">Agenda Livre</h4>
                    <p className="text-slate-500 max-w-xs mx-auto mb-4">Não há atendimentos registrados para esta data.</p>
                    {currentUser.role !== 'EDUCATION_SECRETARY' && (
                        <button onClick={handleNewAppointment} className="text-primary-600 font-medium text-sm hover:underline">
                            Agendar agora
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3 animate-fadeIn">
                    {sessionsOnDate.map((item, idx) => {
                        const status = getStatus(item.session.date);
                        const StatusIcon = status.icon;

                        return (
                            <div key={item.session.id || idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-4 relative overflow-hidden">
                                {/* Status Stripe */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${status.label === 'Agendado' ? 'bg-blue-500' : status.label === 'Hoje' ? 'bg-green-500' : 'bg-slate-300'}`}></div>

                                {/* Time Column */}
                                <div className="flex sm:flex-col items-center justify-center sm:justify-start gap-1 min-w-[90px] border-b sm:border-b-0 sm:border-r border-slate-100 pb-2 sm:pb-0 sm:pr-4">
                                    <span className="text-xl font-bold text-slate-700">
                                        {item.session.startTime || '08:00'}
                                    </span>
                                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${status.color}`}>
                                        <StatusIcon size={10} /> {status.label}
                                    </div>
                                </div>

                                {/* Info Column */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wide ${getSpecialtyColor(item.session.specialty)}`}>
                                            {item.session.specialty}
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium">
                                            {item.session.serviceType || 'Atendimento'}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-lg">{item.student.fullName}</h4>
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2 text-sm text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <UserIcon size={14} className="text-slate-400" /> 
                                            {item.session.professionalName}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MapPin size={14} className="text-slate-400" /> 
                                            {item.student.school.schoolName}
                                        </div>
                                    </div>
                                    {item.session.notes && (
                                        <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100 italic">
                                            "{item.session.notes.substring(0, 100)}{item.session.notes.length > 100 ? '...' : ''}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {/* Lista Geral Recente (Apenas se não houver filtro de data específico ou para preencher espaço) */}
            <div className="mt-8 pt-6 border-t border-slate-200">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Últimos Registros da Rede</h4>
                <div className="space-y-3 opacity-80">
                        {allSessions.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="flex flex-col items-center justify-center w-16 text-center border-r border-slate-200 pr-3">
                                    <span className="text-xs font-bold text-slate-500 uppercase">{new Date(item.session.date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                    <span className="text-lg font-bold text-slate-700">{new Date(item.session.date).getDate()}</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-700">{item.student.fullName}</p>
                                    <p className="text-xs text-slate-500">{item.session.specialty} • {item.session.professionalName}</p>
                                </div>
                            </div>
                        ))}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
