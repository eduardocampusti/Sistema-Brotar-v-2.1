export type ClassificacaoEspecificidade = 'CONFIRMADO' | 'SUSPEITO' | 'SEM_IDENTIFICACAO';

export interface ResumoClassificacao {
    confirmados: number;
    suspeitos: number;
    semIdentificacao: number;
    confirmadosSemLaudo: { id: string; nome: string; diagnostico: string; cid: string; escola: string }[];
}

function temLaudoAnexado(documents: any): boolean {
    if (!Array.isArray(documents)) return false;
    return documents.some((doc: any) => doc?.type === 'Laudo Médico');
}

function temCidPreenchido(clinicalInfo: any): boolean {
    const cid = clinicalInfo?.cid;
    return typeof cid === 'string' && cid.trim().length > 0;
}

function temDiagnosticoPreenchido(clinicalInfo: any): boolean {
    const diag = clinicalInfo?.diagnosis;
    return typeof diag === 'string' && diag.trim().length > 0;
}

export function classificarAluno(clinicalInfo: any, documents: any): ClassificacaoEspecificidade {
    const laudo = temLaudoAnexado(documents);
    const cid = temCidPreenchido(clinicalInfo);
    const diag = temDiagnosticoPreenchido(clinicalInfo);

    if (laudo || cid) return 'CONFIRMADO';
    if (diag) return 'SUSPEITO';
    return 'SEM_IDENTIFICACAO';
}

export function gerarResumoClassificacao(alunos: any[]): ResumoClassificacao {
    let confirmados = 0;
    let suspeitos = 0;
    let semIdentificacao = 0;
    const confirmadosSemLaudo: ResumoClassificacao['confirmadosSemLaudo'] = [];

    for (const aluno of alunos) {
        const ci = aluno.clinicalInfo || aluno.clinical_info || {};
        const docs = aluno.documents || [];
        const classificacao = classificarAluno(ci, docs);

        if (classificacao === 'CONFIRMADO') {
            confirmados++;
            if (!temLaudoAnexado(docs)) {
                confirmadosSemLaudo.push({
                    id: aluno.id,
                    nome: aluno.name || aluno.full_name || aluno.fullName || '',
                    diagnostico: ci.diagnosis || '',
                    cid: ci.cid || '',
                    escola: aluno.schoolName || aluno.school_name || (aluno.schools?.name) || '',
                });
            }
        } else if (classificacao === 'SUSPEITO') {
            suspeitos++;
        } else {
            semIdentificacao++;
        }
    }

    return { confirmados, suspeitos, semIdentificacao, confirmadosSemLaudo };
}
