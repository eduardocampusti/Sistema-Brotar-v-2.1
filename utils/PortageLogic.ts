export interface DomainScores {
    socializacao: number[];
    linguagem: number[];
    cognicao: number[];
    autocuidados: number[];
    motor: number[];
}

export interface CalculationResult {
    domainResults: {
        socializacao: number;
        linguagem: number;
        cognicao: number;
        autocuidados: number;
        motor: number;
    };
    generalResult: number;
    formattedResults: {
        [key: string]: string; // "X anos e Y meses"
    };
    diffs: {
        [key: string]: number; // studentAge - domainAge
    };
    contributionsByBand: {
        [key: string]: number[]; // meses ganhos em cada faixa [0-1, 1-2, ...]
    };
    warnings: string[];
}

// CONSTANTES DO EXCEL (Total de Itens por Faixa Etária)
export const PORTAGE_CONSTANTS = {
    socializacao: [28, 16, 8, 12, 9, 11],
    linguagem: [10, 18, 30, 24, 15, 14],
    cognicao: [14, 10, 16, 24, 22, 22],
    autocuidados: [13, 12, 27, 15, 23, 15],
    motor: [45, 18, 17, 15, 16, 29]
};

export const AGE_RANGES = [
    "0 a 1 ano",
    "1 a 2 anos",
    "2 a 3 anos",
    "3 a 4 anos",
    "4 a 5 anos",
    "5 a 6 anos"
];

const formatAge = (yearsFloat: number): string => {
    const years = Math.floor(yearsFloat);
    const months = Math.round((yearsFloat - years) * 12);
    // Ajuste fino para evitar "X anos e 12 meses" (virar X+1 anos) se necessário,
    // mas mantendo simples para consistência com o float.
    if (months === 12) return `${years + 1} anos e 0 meses`;
    return `${years} anos e ${months} meses`;
};

export const calculatePortage = (scores: DomainScores, studentAgeYears: number = 0): CalculationResult => {
    const domains = ['socializacao', 'linguagem', 'cognicao', 'autocuidados', 'motor'] as const;
    const results: any = {};
    const formatted: any = {};
    const diffs: any = {};
    const contributionsByBand: any = {};
    const warnings: string[] = [];

    let totalSum = 0;

    domains.forEach(domain => {
        let monthsTotal = 0;
        const domainScores = scores[domain];
        const domainConstants = PORTAGE_CONSTANTS[domain];
        const bandContribs: number[] = [];

        // Cálculo por faixa: (pontos / total_itens) * 12 meses
        domainScores.forEach((score, index) => {
            const maxItems = domainConstants[index];

            // Validação de Warning
            if (score > maxItems) {
                warnings.push(`Pontuação excessiva em ${domain} / faixa ${AGE_RANGES[index]}: ${score} de ${maxItems}`);
            }

            // Capa input aqui apenas para cálculo seguro, mas warning avisa
            const validScore = Math.min(Math.max(0, score), maxItems);

            const pointsInMonths = (validScore / maxItems) * 12;

            // Clamp para garantir que não passe de 12 meses por faixa (mesmo se input for zoado não explodir)
            const clampedMonths = Math.min(Math.max(0, pointsInMonths), 12);

            bandContribs.push(Number(clampedMonths.toFixed(2))); // Salva contribuição desta faixa (0-12)
            monthsTotal += clampedMonths;
        });

        contributionsByBand[domain] = bandContribs;

        // Converter para anos
        const yearsRaw = monthsTotal / 12;

        // APLICAR CAP DE 6 ANOS NO RESULTADO FINAL (Regra do Excel corrigida)
        const yearsFinal = Math.min(yearsRaw, 6.0);

        results[domain] = Number(yearsFinal.toFixed(2));
        formatted[domain] = formatAge(yearsFinal);
        diffs[domain] = Number((studentAgeYears - yearsFinal).toFixed(2));

        totalSum += yearsFinal;
    });

    const generalAverage = totalSum / 5;
    const generalFinal = Math.min(generalAverage, 6.0); // Cap também na média geral

    return {
        domainResults: results,
        generalResult: Number(generalFinal.toFixed(2)),
        formattedResults: {
            ...formatted,
            Geral: formatAge(generalFinal)
        },
        diffs,
        contributionsByBand,
        warnings
    };
};
