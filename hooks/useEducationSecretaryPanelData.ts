import { useState, useEffect } from 'react';
import { User, Appointment, SupportProfessional, School, SavedDocument } from '../types';
import { SupabaseService } from '../services/SupabaseService';

/**
 * Mesmo carregamento já usado em `EducationSecretaryDashboard` (sem novas queries ao Supabase).
 */
export function useEducationSecretaryPanelData(currentUser: User) {
  const scope = currentUser.scope ?? 'GLOBAL';

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [supportProfessionals, setSupportProfessionals] = useState<SupportProfessional[]>([]);
  const [schoolsList, setSchoolsList] = useState<School[]>([]);
  const [generatedLaudoDocs, setGeneratedLaudoDocs] = useState<SavedDocument[]>([]);

  useEffect(() => {
    if (currentUser.role !== 'EDUCATION_SECRETARY') {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [pros, sch, docsAll] = await Promise.all([
          SupabaseService.getSupportProfessionals(),
          SupabaseService.getSchools(),
          SupabaseService.getDocuments(),
        ]);
        let apts: Appointment[] = [];
        if (scope === 'GLOBAL') {
          const [aSede, aCocal] = await Promise.all([
            SupabaseService.getAppointments({ unit: 'SEDE' }),
            SupabaseService.getAppointments({ unit: 'COCAL' }),
          ]);
          const byId = new Map<string, Appointment>();
          [...aSede, ...aCocal].forEach(a => byId.set(a.id, a));
          apts = [...byId.values()];
        } else if (scope === 'SEDE') {
          apts = await SupabaseService.getAppointments({ unit: 'SEDE' });
        } else if (scope === 'COCAL') {
          apts = await SupabaseService.getAppointments({ unit: 'COCAL' });
        }
        if (!cancelled) {
          setSupportProfessionals(pros);
          setSchoolsList(sch);
          setGeneratedLaudoDocs((docsAll || []).filter(d => d.docType === 'Laudo Médico'));
          setAppointments(apts);
        }
      } catch (e) {
        console.error('[useEducationSecretaryPanelData] Erro ao carregar painel:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [scope, currentUser.role, currentUser.id]);

  return { loading, appointments, supportProfessionals, schoolsList, generatedLaudoDocs };
}
