import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isPerfilRestritoProntuario } from '@/src/config/perfilRestrito';
import { Appointment, Specialty, Student, User } from '../types';
import { SchedulingCenter } from './SchedulingCenter';
import { AgendaProfissional } from './AgendaProfissional';
import { SocialWorkerAgenda } from './SocialWorkerAgenda';

/** Pós “Iniciar atendimento” na Minha Agenda: abre o módulo clínico com aluno e aba de anamnese. */
function clinicalRouteStateAfterAgendaStart(
    specialty: Specialty,
    studentId: string
): { path: string; state: { openStudentId: string; openTab: string } } | null {
    switch (specialty) {
        case Specialty.PSYCHOPEDAGOGY:
            return { path: '/app/psychopedagogy', state: { openStudentId: studentId, openTab: 'anamnesis' } };
        case Specialty.PSYCHOLOGY:
            return { path: '/app/psychology', state: { openStudentId: studentId, openTab: 'anamnese' } };
        case Specialty.SPEECH_THERAPY:
            return { path: '/app/speech-therapy', state: { openStudentId: studentId, openTab: 'anamnese' } };
        case Specialty.OCCUPATIONAL_THERAPY:
            return { path: '/app/occupational-therapy', state: { openStudentId: studentId, openTab: 'anamnese' } };
        case Specialty.PHYSIOTHERAPY:
            return { path: '/app/physiotherapy', state: { openStudentId: studentId, openTab: 'anamnese' } };
        case Specialty.NUTRITION:
            return { path: '/app/nutrition', state: { openStudentId: studentId, openTab: 'anamnese' } };
        default:
            return null;
    }
}

export interface SchedulingRoutePageProps {
    students: Student[];
    onNavigate: (page: string) => void;
    onReschedule: (appointment: Appointment) => void;
    onSelectStudent: (student: Student) => void;
}

/**
 * Conteúdo da rota /app/scheduling: escolhe a visão conforme perfil (useAuth).
 */
export const SchedulingRoutePage: React.FC<SchedulingRoutePageProps> = ({
    students,
    onNavigate,
    onReschedule,
    onSelectStudent,
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    if (user.specialty === Specialty.SOCIAL_WORK) {
        return (
            <SocialWorkerAgenda
                currentUser={user}
                students={students}
                onNavigate={onNavigate}
                onNavigateToCase={(id) => {
                    const st = students.find((s) => s.id === id);
                    if (st) onSelectStudent(st);
                }}
            />
        );
    }

    if (isPerfilRestritoProntuario(user as Pick<User, 'role' | 'specialty'>)) {
        return (
            <AgendaProfissional
                currentUser={user}
                students={students}
                onSelectStudent={onSelectStudent}
                onSelectStudentAfterIniciar={(st) => {
                    if (!user.specialty) {
                        onSelectStudent(st);
                        return;
                    }
                    const target = clinicalRouteStateAfterAgendaStart(user.specialty, st.id);
                    if (target) navigate(target.path, { state: target.state });
                    else onSelectStudent(st);
                }}
            />
        );
    }

    return (
        <SchedulingCenter
            currentUser={user}
            students={students}
            onNavigate={onNavigate}
            onReschedule={onReschedule}
        />
    );
};
