
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
        // Templates específicos por tipo de documento
        if (["Relatório Fonoaudiológico","Evolução Fonoaudiológica","Parecer Fonoaudiológico","Encaminhamento Fonoaudiológico","Relatório de Alta Fonoaudiológica"].includes(docType)) {
          contentHtml = `<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${docType.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${pStyle}">Aluno(a): <strong>${student.fullName}</strong>, em acompanhamento fonoaudiológico.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. ÁREAS AVALIADAS</h3>
            <p style="${pStyle}">Linguagem oral e escrita, comunicação, motricidade orofacial, deglutição e voz.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO</h3>
            <p style="${pStyle}">${context || 'O(a) aluno(a) demonstra evolução gradual nas habilidades comunicativas e linguísticas trabalhadas nas sessões.'}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. ENCAMINHAMENTOS</h3>
            <p style="${pStyle}">Indica-se continuidade do acompanhamento fonoaudiológico com foco nas áreas identificadas.</p>`;
        } else if (["Relatório de Terapia Ocupacional","Evolução em Terapia Ocupacional","Parecer de Terapia Ocupacional","Plano de Intervenção Ocupacional","Relatório de Alta em Terapia Ocupacional"].includes(docType)) {
          contentHtml = `<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${docType.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${pStyle}">Aluno(a): <strong>${student.fullName}</strong>, em acompanhamento de Terapia Ocupacional.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. ÁREAS DE INTERVENÇÃO</h3>
            <p style="${pStyle}">Habilidades de vida diária (AVDs), integração sensorial, coordenação motora fina e grossa, desempenho escolar e funcionalidade.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO</h3>
            <p style="${pStyle}">${context || 'O(a) aluno(a) apresenta progresso nas atividades propostas, com melhora na autonomia e no desempenho funcional.'}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. OBJETIVOS TERAPÊUTICOS</h3>
            <p style="${pStyle}">Ampliar independência nas atividades cotidianas, fortalecer habilidades motoras e promover maior participação escolar.</p>`;
        } else if (["Relatório Fisioterapêutico","Evolução Fisioterapêutica","Parecer Fisioterapêutico","Plano de Reabilitação","Relatório de Alta Fisioterapêutica"].includes(docType)) {
          contentHtml = `<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${docType.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${pStyle}">Aluno(a): <strong>${student.fullName}</strong>, em acompanhamento fisioterapêutico.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. AVALIAÇÃO MOTORA</h3>
            <p style="${pStyle}">Avaliação do desenvolvimento neuropsicomotor, tônus muscular, padrões de movimento, equilíbrio e marcha.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO</h3>
            <p style="${pStyle}">${context || 'O(a) aluno(a) apresenta progressos no desenvolvimento motor, com ganhos observados nas habilidades funcionais trabalhadas.'}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. PLANO TERAPÊUTICO</h3>
            <p style="${pStyle}">Manutenção das sessões com foco em funcionalidade, prevenção de complicações e promoção da autonomia motora.</p>`;
        } else if (["Relatório Nutricional","Evolução Nutricional","Plano Alimentar Institucional","Parecer Nutricional","Relatório de Acompanhamento Nutricional"].includes(docType)) {
          contentHtml = `<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${docType.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${pStyle}">Aluno(a): <strong>${student.fullName}</strong>, em acompanhamento nutricional.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. AVALIAÇÃO NUTRICIONAL</h3>
            <p style="${pStyle}">Avaliação do estado nutricional, hábitos alimentares, aceitação alimentar e condições relacionadas à alimentação.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO</h3>
            <p style="${pStyle}">${context || 'O(a) aluno(a) demonstra adesão ao acompanhamento com evolução positiva nos hábitos alimentares observados.'}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. CONDUTAS E ORIENTAÇÕES</h3>
            <p style="${pStyle}">Orientações nutricionais individualizadas fornecidas à família. Indica-se continuidade do acompanhamento nutricional.</p>`;
        } else if (["Relatório de Busca Ativa","Relatório Social de Visita Domiciliar","Ofício ao Conselho Tutelar","Plano de Acompanhamento Familiar"].includes(docType)) {
          contentHtml = `<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${docType.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO DA FAMÍLIA</h3>
            <p style="${pStyle}">Aluno(a): <strong>${student.fullName}</strong>. Acompanhamento do Serviço Social.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. SITUAÇÃO SOCIAL</h3>
            <p style="${pStyle}">${context || 'Família em acompanhamento pelo Serviço Social. Situação avaliada conforme visita técnica e entrevista social realizada.'}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. INTERVENÇÕES REALIZADAS</h3>
            <p style="${pStyle}">Orientações sobre direitos, acesso a serviços da rede de proteção social e encaminhamentos pertinentes ao caso.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. ENCAMINHAMENTOS</h3>
            <p style="${pStyle}">Indica-se continuidade do acompanhamento familiar e articulação com a rede de proteção social do município.</p>`;
        } else if (["Relatório Psicológico Técnico","Evolução Psicológica","Parecer Psicológico"].includes(docType)) {
          contentHtml = `<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${docType.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${pStyle}">Aluno(a): <strong>${student.fullName}</strong>, em acompanhamento psicológico.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. DEMANDA APRESENTADA</h3>
            <p style="${pStyle}">${context || 'Demanda psicológica identificada e trabalhada em sessões individuais conforme planejamento clínico.'}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO DO PROCESSO</h3>
            <p style="${pStyle}">O(a) aluno(a) demonstra engajamento no processo psicológico com evolução observada nas áreas trabalhadas em sessão.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. CONSIDERAÇÕES TÉCNICAS</h3>
            <p style="${pStyle}">Indica-se continuidade do acompanhamento psicológico. Este documento não substitui laudo diagnóstico e foi elaborado para fins institucionais.</p>`;
        } else if (["Plano de Intervenção","Relatório de Evolução"].includes(docType)) {
          contentHtml = `<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${docType.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${pStyle}">Aluno(a): <strong>${student.fullName}</strong>.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. OBJETIVOS</h3>
            <p style="${pStyle}">Promover o desenvolvimento integral do(a) aluno(a) por meio de intervenções especializadas e individualizadas.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO / INTERVENÇÕES</h3>
            <p style="${pStyle}">${context || 'O(a) aluno(a) apresenta evolução positiva nas áreas trabalhadas, demonstrando engajamento e progresso gradual.'}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. PRÓXIMAS ETAPAS</h3>
            <p style="${pStyle}">Continuidade das intervenções planejadas com reavaliação periódica dos objetivos propostos.</p>`;
        } else {
          contentHtml = `<p style="${pStyle}">Este documento refere-se ao atendimento do(a) estudante <strong>${student.fullName}</strong>.</p>
            ${context ? `<p style="${pStyle}">${context}</p>` : '<p style="' + pStyle + '">O processo segue conforme planejamento técnico estabelecido.</p>'}
            <p style="${pStyle}">Permanecemos à disposição para quaisquer dúvidas.</p>`;
        }
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
