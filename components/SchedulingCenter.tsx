
import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    Plus,
    Search,
    Filter,
    CheckCircle2,
    Clock,
    XCircle,
    RotateCcw,
    MoreHorizontal,
    MapPin,
    User as UserIcon,
    ChevronLeft,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';
import { Appointment, AppointmentStatus, Unit, Specialty, Student, User } from '../types';
import { useToast } from '../contexts/ToastContext';

interface SchedulingCenterProps {
    currentUser: User;
    students: Student[];
    onNavigate?: (page: string) => void;
}

export const SchedulingCenter: React.FC<SchedulingCenterProps> = ({ currentUser, students, onNavigate }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const { success, error: showError } = useToast();

    // Filtros
    const [filterUnit, setFilterUnit] = useState<Unit | 'ALL'>(
        currentUser.role === 'ADMIN' ? 'ALL' : (currentUser.scope as Unit || 'SEDE')
    );
    const [filterSpecialty, setFilterSpecialty] = useState<Specialty | 'ALL'>('ALL');
    const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'ALL'>('ALL');

    const loadAppointments = async () => {
        setLoading(true);
        try {
            const data = await SupabaseService.getAppointments({
                date: selectedDate,
                unit: filterUnit === 'ALL' ? undefined : filterUnit as Unit,
                specialty: filterSpecialty === 'ALL' ? undefined : filterSpecialty as Specialty,
                status: filterStatus === 'ALL' ? undefined : filterStatus as AppointmentStatus
            });
            setAppointments(data);
        } catch (err) {
            showError("Erro ao carregar agendamentos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAppointments();
    }, [selectedDate, filterUnit, filterSpecialty, filterStatus]);

    const handleStatusUpdate = async (id: string, newStatus: AppointmentStatus) => {
        try {
            await SupabaseService.updateAppointmentStatus(id, newStatus);
            success(`Status atualizado para ${newStatus}`);
            loadAppointments();
        } catch (err) {
            showError("Erro ao atualizar status");
        }
    };

    const getStatusColor = (status: AppointmentStatus) => {
        switch (status) {
            case 'AGENDADO': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
            case 'ATENDIDO': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'FALTOU': return 'bg-red-50 text-red-600 border-red-200';
            case 'REMARCAR': return 'bg-orange-50 text-orange-600 border-orange-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    const getStatusIcon = (status: AppointmentStatus) => {
        switch (status) {
            case 'AGENDADO': return <Clock size={14} />;
            case 'ATENDIDO': return <CheckCircle2 size={14} />;
            case 'FALTOU': return <XCircle size={14} />;
            case 'REMARCAR': return <RotateCcw size={14} />;
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* 1. TOPO DA TELA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Central de Agendamentos</h1>
                    <p className="text-slate-500 text-sm font-medium">Visão operacional dos atendimentos da rede</p>
                </div>
                <button
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all active:scale-95"
                    onClick={() => onNavigate && onNavigate('new-appointment')}
                >
                    <Plus size={20} />
                    <span>Novo Agendamento</span>
                </button>
            </div>

            {/* 2. FILTROS OPERACIONAIS */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Unidade */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Unidade</label>
                        <select
                            value={filterUnit}
                            onChange={(e) => setFilterUnit(e.target.value as any)}
                            disabled={currentUser.role !== 'ADMIN'}
                            className="w-full p-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all"
                        >
                            {currentUser.role === 'ADMIN' && <option value="ALL">Todas as Unidades</option>}
                            <option value="SEDE">SEDE</option>
                            <option value="COCAL">COCAL</option>
                        </select>
                    </div>

                    {/* Especialidade */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Especialidade</label>
                        <select
                            value={filterSpecialty}
                            onChange={(e) => setFilterSpecialty(e.target.value as any)}
                            className="w-full p-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all"
                        >
                            <option value="ALL">Todos os Profissionais</option>
                            {Object.values(Specialty).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="w-full p-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all"
                        >
                            <option value="ALL">Todos os Status</option>
                            <option value="AGENDADO">🟢 Agendado</option>
                            <option value="ATENDIDO">🔵 Atendido</option>
                            <option value="FALTOU">🔴 Faltou</option>
                            <option value="REMARCAR">🟠 Remarcar</option>
                        </select>
                    </div>

                    {/* Data / Calendário Simples */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Data</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="flex-1 p-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all"
                            />
                            <button
                                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                                className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all"
                                title="Voltar para Hoje"
                            >
                                <CalendarIcon size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. LISTA OPERACIONAL */}
            <div className="flex-1 overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col">
                <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Lista de Atendimentos do Dia</span>
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight">
                        {appointments.length} registros
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 animate-pulse">
                            <Loader2 size={40} className="animate-spin mb-4 text-primary-500" />
                            <p className="font-bold text-sm">Carregando agenda...</p>
                        </div>
                    ) : appointments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-slate-400">
                            <CalendarIcon size={48} className="mb-4 opacity-20" />
                            <p className="font-bold text-slate-500">Nenhum atendimento para esta data</p>
                            <p className="text-sm">Tente mudar os filtros ou adicione um novo agendamento.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {appointments.map((apt) => (
                                <div key={apt.id} className="p-4 hover:bg-slate-50/80 transition-all flex items-center gap-4 group">
                                    {/* Horário */}
                                    <div className="flex flex-col items-center justify-center min-w-[70px] py-1 bg-slate-100 rounded-2xl border border-slate-200/50 group-hover:bg-white group-hover:shadow-sm transition-all">
                                        <span className="text-sm font-black text-slate-800">{apt.startTime}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{apt.endTime}</span>
                                    </div>

                                    {/* Aluno e Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-bold text-slate-800 truncate">{apt.studentName}</h3>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                                                <UserIcon size={12} className="text-primary-500" />
                                                {apt.professionalName} ({apt.specialty})
                                            </span>
                                            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                                                <MapPin size={12} className="text-orange-500" />
                                                {apt.unit}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="hidden sm:flex items-center gap-2">
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${getStatusColor(apt.status)}`}>
                                            {getStatusIcon(apt.status)}
                                            {apt.status}
                                        </div>
                                    </div>

                                    {/* Ações Rápidas */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleStatusUpdate(apt.id, 'ATENDIDO')}
                                            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                            title="Marcar como Atendido"
                                        >
                                            <CheckCircle2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(apt.id, 'FALTOU')}
                                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                            title="Paciente Faltou"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(apt.id, 'REMARCAR')}
                                            className="p-2.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                                            title="Solicitar Remarcação"
                                        >
                                            <RotateCcw size={18} />
                                        </button>
                                        <div className="w-px h-6 bg-slate-100 mx-1 hidden sm:block" />
                                        <button
                                            className="p-2.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all hidden sm:block"
                                            title="Mais opções"
                                        >
                                            <MoreHorizontal size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
