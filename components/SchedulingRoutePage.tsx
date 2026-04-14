import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isPerfilRestritoProntuario } from '@/src/config/perfilRestrito';
import { Appointment, Specialty, Student, User } from '../types';
import { SchedulingCenter } from './SchedulingCenter';
import { AgendaProfissional } from './AgendaProfissional';
import { SocialWorkerAgenda } from './SocialWorkerAgenda';

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
