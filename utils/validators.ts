/**
 * Valida o algoritmo do CPF brasileiro.
 */
export const validarCPF = (cpf: string): boolean => {
    const numeros = cpf.replace(/\D/g, '');

    if (numeros.length !== 11) return false;

    // CPF com todos os números iguais é inválido
    if (/^(\d)\1{10}$/.test(numeros)) return false;

    // Cálculo do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(numeros.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digitoVerificador1 = resto === 10 || resto === 11 ? 0 : resto;

    if (digitoVerificador1 !== parseInt(numeros.charAt(9))) return false;

    // Cálculo do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(numeros.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let digitoVerificador2 = resto === 10 || resto === 11 ? 0 : resto;

    if (digitoVerificador2 !== parseInt(numeros.charAt(10))) return false;

    return true;
};

/**
 * Valida telefone brasileiro (fixo ou celular).
 */
export const validarTelefoneBR = (telefone: string): boolean => {
    const numeros = telefone.replace(/\D/g, '');

    // Verifica tamanho (10 ou 11 dígitos)
    if (numeros.length < 10 || numeros.length > 11) return false;

    // DDDs válidos (simplificado, apenas verifica se começa com 1-9 e 1-9)
    const ddd = parseInt(numeros.substring(0, 2));
    if (ddd < 11 || ddd > 99) return false;

    // Se for celular (11 dígitos), deve começar com 9
    if (numeros.length === 11 && numeros.charAt(2) !== '9') return false;

    return true;
};

/**
 * Valida se uma data é válida e não é futura.
 */
export const validarDataBR = (dataBR: string, permitirFutura = false): { valida: boolean, erro?: string } => {
    const numeros = dataBR.replace(/\D/g, '');
    if (numeros.length !== 8) return { valida: false, erro: 'Data incompleta' };

    const dia = parseInt(dataBR.substring(0, 2));
    const mes = parseInt(dataBR.substring(3, 5)) - 1; // 0-indexed
    const ano = parseInt(dataBR.substring(6, 10));

    const data = new Date(ano, mes, dia);

    if (
        data.getFullYear() !== ano ||
        data.getMonth() !== mes ||
        data.getDate() !== dia
    ) {
        return { valida: false, erro: 'Data inválida' };
    }

    if (!permitirFutura && data > new Date()) {
        return { valida: false, erro: 'Data não pode ser futura' };
    }

    return { valida: true };
};
/**
 * Valida CEP brasileiro (8 dígitos).
 */
export const validarCEP = (cep: string): boolean => {
    const numeros = cep.replace(/\D/g, '');
    return numeros.length === 8;
};

/**
 * Valida RG (Lógica simples: 5 a 20 caracteres).
 */
export const validarRG = (rg: string): boolean => {
    if (!rg) return true; // RG opcional
    const limpo = rg.trim();
    return limpo.length >= 5 && limpo.length <= 20;
};

/**
 * Valida Certidão de Nascimento (Lógica simples: 5 a 32 caracteres).
 */
export const validarCertidao = (certidao: string): boolean => {
    if (!certidao) return true; // Certidão opcional
    const limpo = certidao.trim();
    return limpo.length >= 5 && limpo.length <= 32;
};
