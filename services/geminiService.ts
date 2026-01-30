
import { GoogleGenAI } from "@google/genai";
import { Student } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_PERSONA = `
Você é o REDATOR OFICIAL do SISTEMA BROTAR.
Sua tarefa é gerar documentos profissionais (Relatórios, Ofícios, Declarações).
REGRAS:
1. Use linguagem técnica, formal e institucional.
2. NUNCA invente dados médicos ou diagnósticos não fornecidos.
3. Se faltar informação, use [DADO NÃO INFORMADO].
4. Formate como um texto de documento oficial, pronto para impressão em papel timbrado.
`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const GeminiService = {
  generateOfficialDocument: async (docType: string, student: Student, professional: string, role: string, context: string): Promise<string> => {
    // Extração de dados da Calculadora IPO (se houver) - Adicionado para verificação
    let ipoInfo = "";
    // Acessa de forma segura pois clinical pode ser undefined em alguns contextos iniciais
    const clinicalData = student.clinical as any;
    const ipoHistory = clinicalData?.pp_data?.ipoHistory || [];

    if (ipoHistory.length > 0) {
      const lastIPO = ipoHistory[0]; // Assumindo ordenado por data (mais recente primeiro)
      ipoInfo = `
      DADOS QUANTITATIVOS RECENTES (CALCULADORA IPO - PORTAGE):
      Data da Avaliação: ${new Date(lastIPO.date).toLocaleDateString('pt-BR')}
      Idade de Desenvolvimento Geral: ${lastIPO.results.general} anos.
      
      Resultados Detalhados por Área:
      - Socialização: ${lastIPO.results.socializacao} anos
      - Linguagem: ${lastIPO.results.linguagem} anos
      - Cognição: ${lastIPO.results.cognicao} anos
      - Autocuidados: ${lastIPO.results.autocuidados} anos
      - Desenvolvimento Motor: ${lastIPO.results.motor} anos
      `;
    }

    const prompt = `
      SISTEMA BROTAR - GERADOR DE DOCUMENTO OFICIAL
      
      TIPO DE DOCUMENTO: ${docType}
      ALUNO: ${student.fullName}, Idade: ${new Date().getFullYear() - new Date(student.birthDate).getFullYear()} anos.
      ESCOLA: ${student.school.schoolName}.
      EMISSOR: ${professional} (${role}).
      
      ${ipoInfo}
      
      CONTEXTO ADICIONAL / OBSERVAÇÕES CLÍNICAS: ${context}
      
      Gere o texto completo do documento. Inclua cabeçalho institucional fictício (mas formal), título centralizado, corpo do texto bem estruturado e espaço para assinatura ao final.
      O texto deve ser em Português do Brasil, profissional, acolhedor e DEVE OBRIGATORIAMENTE CITAR os dados do IPO se estiverem disponíveis acima, contextualizando-os no desenvolvimento do aluno.
    `;

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash", // Nome correto para o SDK v2.0+
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_PERSONA,
            temperature: 0.7 // Um pouco mais de criatividade para documentos menos robóticos
          }
        });

        if (!response.text) {
          throw new Error("Resposta da IA veio vazia.");
        }

        return response.text;
      } catch (error: any) {
        attempt++;
        const isQuotaError = error.message?.includes("Quota exceeded") || error.message?.includes("429") || error.toString().includes("Quota exceeded");

        if (isQuotaError && attempt < maxRetries) {
          const waitTime = 2000 * Math.pow(2, attempt); // 4s, 8s, 16s...
          console.warn(`Cota excedida. Tentativa ${attempt} de ${maxRetries}. Aguardando ${waitTime}ms...`);
          await delay(waitTime);
          continue; // Tenta novamente
        }

        console.error("Erro no GeminiService:", error);
        throw new Error(error.message || "Erro desconhecido na geração via Gemini.");
      }
    }

    throw new Error("Não foi possível conectar à IA após várias tentativas. Por favor, tente novamente mais tarde.");
  }
};

// --- MODO OFFLINE / FALLBACK ---
export const TemplateService = {
  getFallbackDocument: (docType: string, student: Student, professional: string, role: string, context: string): string => {
    const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const age = new Date().getFullYear() - new Date(student.birthDate).getFullYear();

    // Base Wrapper Style for all documents
    const wrapperStyle = "font-family: 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6;";
    const titleStyle = "text-align: center; font-weight: bold; margin-bottom: 2rem; text-transform: uppercase;";
    const pStyle = "margin-bottom: 1.5rem; text-align: justify;";
    const signatureStyle = "margin-top: 4rem; text-align: center; border-top: 1px solid #1a1a1a; padding-top: 0.5rem; width: 60%; margin-left: auto; margin-right: auto;";

    let body = "";

    // Lógica para Termo de Imagem separada para manter fidelidade
    if (docType === "Termo de Autorização de Uso de Imagem e Vídeo") {
      const guardian = student.guardians?.[0];
      const gName = guardian?.name || "____________________________________________________________";
      const gCpf = guardian?.cpf || "____________________________";
      const gRg = guardian?.rg || "____________________________";
      const gPhone = guardian?.phone || "_________________________________________________";

      let address = "________________________________________________________________________________________";
      if (student.address && student.address.street) {
        address = `${student.address.street}, ${student.address.number || ''}, ${student.address.district || ''} - ${student.address.city}/${student.address.state}`;
      }
      const sBirthDate = student.birthDate ? new Date(student.birthDate).toLocaleDateString('pt-BR') : "//____";
      const day = new Date().getDate();
      const month = new Date().toLocaleDateString('pt-BR', { month: 'long' });
      const year = new Date().getFullYear();

      return `
<div style="${wrapperStyle}">
  <h2 style="${titleStyle}">TERMO DE AUTORIZAÇÃO PARA USO DE IMAGEM E VOZ (MENOR DE IDADE)</h2>
  <p style="margin-bottom: 1rem;">Eu, <strong>${gName}</strong>,<br>
  CPF: <strong>${gCpf}</strong> RG: <strong>${gRg}</strong>,<br>
  endereço: <strong>${address}</strong>,<br>
  na qualidade de responsável legal pelo(a) menor <strong>${student.fullName}</strong>,<br>
  data de nascimento: <strong>${sBirthDate}</strong>,</p>

  <p style="${pStyle}"><strong>AUTORIZO</strong>, de forma livre, informada e inequívoca, o <strong>BROTAR – Centro Multidisciplinar em Educação Inclusiva</strong>, a captar e utilizar a imagem e/ou voz do(a) menor, por meio de fotografias e filmagens, realizadas durante atendimentos, atividades e ações institucionais.</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Finalidade</h3>
  <p style="${pStyle}">A presente autorização destina-se exclusivamente à divulgação institucional e educativa, sem fins comerciais, respeitando a dignidade, privacidade e os direitos do(a) menor, conforme ECA e LGPD (Lei nº 13.709/2018).</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Meios de divulgação</h3>
  <p style="margin-bottom: 1rem;">As imagens/voz poderão ser divulgadas em:</p>
  <ul style="list-style-type: disc; margin-left: 2rem; margin-bottom: 1.5rem;">
    <li>redes sociais institucionais (ex.: Instagram, Facebook e WhatsApp);</li>
    <li>site e materiais informativos do Centro (digitais ou impressos).</li>
  </ul>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Prazo</h3>
  <p style="margin-bottom: 1.5rem;">Autorização válida por <strong>24 (vinte e quatro) meses</strong>, a partir da assinatura.</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Revogação</h3>
  <p style="${pStyle}">O responsável poderá revogar esta autorização a qualquer momento, mediante solicitação por escrito. A revogação não invalida usos já realizados anteriormente, mas impedirá novas divulgações e, quando possível, o material será removido dos canais institucionais.</p>

  <p style="margin-bottom: 2rem;">Declaro que li e compreendi este termo.</p>

  <p style="text-align: right; margin-bottom: 3rem;">Brotas de Macaúbas/BA, <strong>${day} de ${month} de ${year}</strong>.</p>

  <div style="text-align: center; margin-top: 4rem;">
    <div style="display: inline-block; text-align: left;">
      <div style="border-top: 1px solid #000; width: 300px; padding-top: 0.5rem; text-align: center; margin-bottom: 0.5rem;">Assinatura do(a) Responsável Legal</div>
      <div><strong>Nome:</strong> ${gName === "____________________________________________________________" ? "_____________________________________________________" : gName}</div>
      <div><strong>CPF:</strong> ${gCpf === "____________________________" ? "______________________________________________________" : gCpf}</div>
      <div><strong>Telefone:</strong> ${gPhone}</div>
    </div>
  </div>
</div>`.trim();
    }

    // --- TEMPLATES GENÉRICOS CONVERTIDOS PARA HTML ---

    let contentHtml = "";

    switch (docType) {
      case "Declaração de Atendimento":
        contentHtml = `
            <p style="${pStyle}">Declaro para os devidos fins que o(a) estudante <strong>${student.fullName}</strong> encontra-se em acompanhamento <strong>${role.toLowerCase()}</strong> sob minha responsabilidade, participando das atividades propostas para seu desenvolvimento integral.</p>
            <p style="${pStyle}">As sessões ocorrem periodicamente e o(a) aluno(a) tem demonstrado assiduidade.</p>
            ${context ? `<div style="margin-top: 2rem; border-top: 1px dashed #ccc; padding-top: 1rem;"><h4 style="font-weight: bold; margin-bottom: 0.5rem;">OBSERVAÇÕES ADICIONAIS:</h4><p style="${pStyle}">${context}</p></div>` : ''}
        `;
        break;

      case "Encaminhamento Geral":
        contentHtml = `
            <p style="${pStyle}">Solicito avaliação e conduta para o(a) estudante acima identificado(a), nascido em <strong>${new Date(student.birthDate).toLocaleDateString('pt-BR')}</strong>.</p>
            
            <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">MOTIVO DO ENCAMINHAMENTO</h3>
            <p style="${pStyle}">O(a) aluno(a) apresenta demandas que necessitam de olhar especializado para melhor compreensão e intervenção.</p>
            
            <div style="background-color: #f8fafc; padding: 1rem; border-left: 4px solid #cbd5e1; margin-bottom: 1.5rem;">
                ${context ? context.replace(/\n/g, '<br/>') : 'Observa-se necessidade de suporte específico para otimizar seu processo de aprendizagem e desenvolvimento.'}
            </div>

            <p style="${pStyle}">Coloco-me à disposição para maiores esclarecimentos e discussões sobre o caso.</p>
        `;
        break;

      case "Avaliação Psicopedagógica":
        contentHtml = `
            <h2 style="text-align: center; font-size: 1.2em; font-weight: bold; margin-bottom: 2rem;">RELATÓRIO DE AVALIAÇÃO PRELIMINAR</h2>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">1. QUEIXA INICIAL</h3>
            <p style="${pStyle}">${context || 'Dificuldades no processo de aprendizagem reportadas pela escola/família.'}</p>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">2. INSTRUMENTOS UTILIZADOS</h3>
            <p style="${pStyle}">Observação clínica, entrevistas, análise de material escolar e atividades lúdicas.</p>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">3. SÍNTESE VIAL</h3>
            <p style="${pStyle}">O(a) estudante encontra-se em processo de avaliação. Observam-se potencialidades a serem exploradas e áreas que requerem atenção. Sugere-se continuidade dos atendimentos para fechamento diagnóstico.</p>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">4. CONCLUSÃO E ENCAMINHAMENTOS</h3>
            <p style="${pStyle}">Indica-se a manutenção do acompanhamento psicopedagógico e, se necessário, avaliação multidisciplinar.</p>
        `;
        break;

      case "Termo de Autorização de Uso de Imagem e Vídeo":
        const guardian = student.guardians?.[0];
        const gName = guardian?.name || "____________________________________________________________";
        const gCpf = guardian?.cpf || "____________________________";
        const gRg = guardian?.rg || "____________________________";
        const gPhone = guardian?.phone || "_________________________________________________";

        let address = "________________________________________________________________________________________";
        if (student.address && student.address.street) {
          address = `${student.address.street}, ${student.address.number || ''}, ${student.address.district || ''} - ${student.address.city}/${student.address.state}`;
        }

        const sBirthDate = student.birthDate ? new Date(student.birthDate).toLocaleDateString('pt-BR') : "//____";
        const day = new Date().getDate();
        const month = new Date().toLocaleDateString('pt-BR', { month: 'long' });
        const year = new Date().getFullYear();

        return `
<div style="font-family: 'Times New Roman', serif; color: #000;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 2rem;">TERMO DE AUTORIZAÇÃO PARA USO DE IMAGEM E VOZ (MENOR DE IDADE)</h2>

  <p style="margin-bottom: 1rem;">Eu, <strong>${gName}</strong>,<br>
  CPF: <strong>${gCpf}</strong> RG: <strong>${gRg}</strong>,<br>
  endereço: <strong>${address}</strong>,<br>
  na qualidade de responsável legal pelo(a) menor <strong>${student.fullName}</strong>,<br>
  data de nascimento: <strong>${sBirthDate}</strong>,</p>

  <p style="margin-bottom: 1.5rem; text-align: justify;"><strong>AUTORIZO</strong>, de forma livre, informada e inequívoca, o <strong>BROTAR – Centro Multidisciplinar em Educação Inclusiva</strong>, a captar e utilizar a imagem e/ou voz do(a) menor, por meio de fotografias e filmagens, realizadas durante atendimentos, atividades e ações institucionais.</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Finalidade</h3>
  <p style="margin-bottom: 1.5rem; text-align: justify;">A presente autorização destina-se exclusivamente à divulgação institucional e educativa, sem fins comerciais, respeitando a dignidade, privacidade e os direitos do(a) menor, conforme ECA e LGPD (Lei nº 13.709/2018).</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Meios de divulgação</h3>
  <p style="margin-bottom: 1rem;">As imagens/voz poderão ser divulgadas em:</p>
  <ul style="list-style-type: disc; margin-left: 2rem; margin-bottom: 1.5rem;">
    <li>redes sociais institucionais (ex.: Instagram, Facebook e WhatsApp);</li>
    <li>site e materiais informativos do Centro (digitais ou impressos).</li>
  </ul>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Prazo</h3>
  <p style="margin-bottom: 1.5rem;">Autorização válida por <strong>24 (vinte e quatro) meses</strong>, a partir da assinatura.</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Revogação</h3>
  <p style="margin-bottom: 1.5rem; text-align: justify;">O responsável poderá revogar esta autorização a qualquer momento, mediante solicitação por escrito. A revogação não invalida usos já realizados anteriormente, mas impedirá novas divulgações e, quando possível, o material será removido dos canais institucionais.</p>

  <p style="margin-bottom: 2rem;">Declaro que li e compreendi este termo.</p>

  <p style="text-align: right; margin-bottom: 3rem;">Brotas de Macaúbas/BA, <strong>${day} de ${month} de ${year}</strong>.</p>

  <div style="text-align: center; margin-top: 4rem;">
    <div style="display: inline-block; text-align: left;">
      <div style="border-top: 1px solid #000; width: 300px; padding-top: 0.5rem; text-align: center; margin-bottom: 0.5rem;">Assinatura do(a) Responsável Legal</div>
      <div><strong>Nome:</strong> ${gName === "____________________________________________________________" ? "_____________________________________________________" : gName}</div>
      <div><strong>CPF:</strong> ${gCpf === "____________________________" ? "______________________________________________________" : gCpf}</div>
      <div><strong>Telefone:</strong> ${gPhone}</div>
    </div>
  </div>
</div>
        `.trim();

      default:
        body = `
Este documento refere-se ao atendimento do(a) estudante ${student.fullName}.

DESCRIÇÃO:
O(a) aluno(a) tem recebido suporte ${role.toLowerCase()} visando seu bem-estar e sucesso escolar. 
${context ? `\nCONTEXTO:\n${context}` : '\nO processo segue conforme o planejamento técnico estabelecido.'}

Permanecemos à disposição para quaisquer dúvidas.
        `;
    }

    // Header Padrão HTML para os demais documentos
    return `
<div style="${wrapperStyle}">
    <div style="text-align: center; margin-bottom: 3rem;">
        <h1 style="font-size: 1.5em; font-weight: bold; margin: 0; text-transform: uppercase;">${docType}</h1>
        <div style="margin-top: 1rem; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 8px; background-color: #fcfcfc;">
            <p style="margin: 0; text-align: left;"><strong>ALUNO:</strong> ${student.fullName}</p>
            <p style="margin: 0; text-align: left;"><strong>IDADE:</strong> ${age} anos</p>
            <p style="margin: 0; text-align: left;"><strong>ESCOLA:</strong> ${student.school.schoolName || 'Não informada'}</p>
        </div>
    </div>

    ${contentHtml}

    <div style="margin-top: 4rem; text-align: right;">
        <p>Brotas de Macaúbas/BA, <strong>${today}</strong>.</p>
    </div>

    <div style="${signatureStyle}">
        <p style="margin: 0; font-weight: bold;">${professional}</p>
        <p style="margin: 0; color: #64748b;">
            ${(role === 'Psicopedagogia' || role === 'Psicopedagoga')
        ? 'Psicopedagoga<br/>CBO-2394/25'
        : role}
        </p>
    </div>
</div>
    `.trim();
  }
};
