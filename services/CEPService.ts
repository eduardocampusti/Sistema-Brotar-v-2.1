export interface ViaCEPResponse {
    cep: string;
    logradouro: string;
    complemento: string;
    bairro: string;
    localidade: string;
    uf: string;
    ibge: string;
    gia: string;
    ddd: string;
    siafi: string;
    erro?: boolean;
}

export interface AddressData {
    street: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
}

export class CEPService {
    /**
     * Busca endereço pelo CEP na API ViaCEP.
     * @param cep CEP (apenas números ou formatado)
     */
    static async fetchAddress(cep: string): Promise<AddressData | null> {
        const cleanedCEP = cep.replace(/\D/g, '');

        if (cleanedCEP.length !== 8) {
            return null;
        }

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanedCEP}/json/`);
            const data: ViaCEPResponse = await response.json();

            if (data.erro) {
                return null;
            }

            return {
                street: data.logradouro,
                district: data.bairro,
                city: data.localidade,
                state: data.uf,
                zipCode: cleanedCEP
            };
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            throw new Error('Não foi possível buscar o CEP');
        }
    }
}
