import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SupabaseService } from '../../services/SupabaseService';
import type { Student } from '../../types';

/**
 * Psicologia força a aba "sessions" ao selecionar aluno; ao abrir pela agenda/perfil
 * este ref evita sobrescrever a aba já definida pelo deep link.
 */
export const agendaClinicalDeepLinkPreserveTabRef = { current: false };

/**
 * Consome `navigate(..., { state: { openStudentId, openTab } })` vindo da Minha Agenda ou do perfil.
 */
export function useAgendaClinicalDeepLink(
    setLoading: (v: boolean) => void,
    toastError: (msg: string) => void,
    applyStudent: (student: Student, openTab: string | undefined) => void
) {
    const location = useLocation();
    const navigate = useNavigate();
    const applyRef = useRef(applyStudent);
    applyRef.current = applyStudent;

    useEffect(() => {
        const raw = location.state as { openStudentId?: unknown; openTab?: unknown } | null;
        const id = raw?.openStudentId;
        if (typeof id !== 'string' || !id) return;

        let cancelled = false;
        void (async () => {
            try {
                setLoading(true);
                const full = await SupabaseService.getStudentById(id);
                if (cancelled) return;
                if (!full) {
                    toastError('Não foi possível abrir o prontuário deste aluno.');
                    return;
                }
                try {
                    const sessions = await SupabaseService.getStudentSessions(id);
                    full.history = sessions;
                } catch { /* sessões indisponíveis — continua sem history */ }
                if (cancelled) return;
                const t = raw.openTab;
                const tabStr = typeof t === 'string' ? t : undefined;
                applyRef.current(full, tabStr);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                    // Preserva o pathname e a query string atualizada síncronamente no navegador
                    navigate(window.location.pathname + window.location.search, { replace: true, state: {} });
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [location.state, navigate, toastError, setLoading]);
}
