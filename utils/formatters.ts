/**
 * Formata um nome próprio no padrão brasileiro:
 * - Primeira letra de cada palavra em maiúscula.
 * - Restante em minúscula.
 * - Preposições (de, da, do, das, dos, e) permanecem em minúscula.
 * - Remove espaços extras.
 * 
 * @param texto Nome a ser formatado
 * @returns Nome formatado
 */
export const formatarNomeBR = (texto: string): string => {
    if (!texto) return '';

    const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e'];

    // Para permitir a digitação de espaços (barra de espaço),
    // removemos o .trim() e a substituição de múltiplos espaços (\s+) em tempo real.
    // A limpeza de espaços extras deve ser feita apenas no onBlur ou antes de salvar no banco.
    return texto
        .split(' ')
        .map((palavra, index) => {
            if (!palavra) return ''; // Mantém espaços vazios durante a digitação

            // Se for uma preposição e não for a primeira palavra, mantém minúscula
            if (preposicoes.includes(palavra.toLowerCase()) && index !== 0) {
                return palavra.toLowerCase();
            }

            // Para nomes como D'Ávila ou com hífens
            if (palavra.includes("'")) {
                const partes = palavra.split("'");
                return partes.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("'");
            }

            if (palavra.includes("-")) {
                const partes = palavra.split("-");
                return partes.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("-");
            }

            // Capitaliza a primeira letra normalmente
            return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
        })
        .join(' ');
};

/**
 * Remove todos os caracteres não numéricos.
 */
export const apenasNumeros = (valor: string): string => {
    if (!valor) return '';
    return valor.replace(/\D/g, '');
};

/**
 * Limpa espaços duplicados e padroniza documentos (RG/Certidão).
 */
export const limparDocumento = (valor: string): string => {
    if (!valor) return '';
    // Apenas mantém o valor como está durante a digitação para permitir espaços.
    // A limpeza (trim) será feita apenas no momento de salvar.
    return valor;
};

/**
 * Formata CPF: 000.000.000-00
 */
export const formatarCPF = (valor: string): string => {
    const numeros = apenasNumeros(valor).slice(0, 11);
    return numeros
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

/**
 * Formata CEP: 00000-000
 */
export const formatarCEP = (valor: string): string => {
    const numeros = apenasNumeros(valor).slice(0, 8);
    return numeros
        .replace(/(\d{5})(\d)/, '$1-$2');
};

/**
 * Formata Telefone: (00) 0000-0000 ou (00) 00000-0000
 */
export const formatarTelefoneBR = (valor: string): string => {
    const numeros = apenasNumeros(valor).slice(0, 11);

    if (numeros.length <= 10) {
        return numeros
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d)/, '$1-$2');
    }

    return numeros
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
};

/**
 * Formata Data: DD/MM/AAAA
 */
export const formatarDataBR = (valor: string): string => {
    const numeros = apenasNumeros(valor).slice(0, 8);
    return numeros
        .replace(/(\d{2})(\d)/, '$1/$2')
        .replace(/(\d{2})(\d)/, '$1/$2');
};

/**
 * Converte data BR (DD/MM/AAAA) para ISO (YYYY-MM-DD)
 */
export const dataBRParaISO = (dataBR: string): string => {
    const partes = dataBR.split('/');
    if (partes.length !== 3) return dataBR;
    const [dia, mes, ano] = partes;
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
};

/**
 * Converte data ISO (YYYY-MM-DD) para BR (DD/MM/AAAA)
 */
export const dataISOParaBR = (dataISO: string): string => {
    if (!dataISO) return '';
    const partes = dataISO.split('-');
    if (partes.length !== 3) return dataISO;
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
};
/**
 * Calcula a idade com base na data de nascimento (ISO ou BR).
 */
export const calcularIdade = (dataNascimento: string): number | null => {
    if (!dataNascimento) return null;

    let data;
    if (dataNascimento.includes('-')) {
        data = new Date(dataNascimento);
    } else if (dataNascimento.includes('/')) {
        data = new Date(dataBRParaISO(dataNascimento));
    } else {
        return null;
    }

    if (isNaN(data.getTime())) return null;

    const hoje = new Date();
    let idade = hoje.getFullYear() - data.getFullYear();
    const mes = hoje.getMonth() - data.getMonth();

    if (mes < 0 || (mes === 0 && hoje.getDate() < data.getDate())) {
        idade--;
    }

    return idade;
};
