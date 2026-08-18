import{n as C}from"./index-C8RLQQR7.js";class O extends Error{constructor(a,m){super(a),this.status=m,this.name="GeminiApiError"}}function N(e){if(!e||typeof e!="object")return!1;const a=e;return typeof a.text=="string"||typeof a.error=="string"}function b(e){return e instanceof Error?e.message:"Erro desconhecido na geração via Gemini."}async function D(e){const{data:{session:a},error:m}=await C.auth.getSession();if(m||!(a!=null&&a.access_token))throw new Error("Sessão inválida. Entre novamente antes de gerar o documento.");const l={prompt:e},t="http://localhost:3000".trim()||"",d=await fetch(`${t.replace(/\/$/,"")}/api/gemini/generate`,{method:"POST",headers:{Authorization:`Bearer ${a.access_token}`,"Content-Type":"application/json"},body:JSON.stringify(l)});let r;try{r=await d.json()}catch{throw new O("O serviço de IA retornou uma resposta inválida.",d.status)}if(!N(r))throw new O("O serviço de IA retornou uma resposta inválida.",d.status);if(!d.ok){const _="error"in r?r.error:"Não foi possível gerar o documento. Tente novamente mais tarde.";throw new O(_,d.status)}if(!("text"in r)||!r.text.trim())throw new O("O provedor de IA retornou uma resposta vazia.",d.status);return r.text}const L=e=>new Promise(a=>setTimeout(a,e)),U={generateOfficialDocument:async(e,a,m,l,t)=>{var s,A;let d="";const r=a.clinical,_=((s=r==null?void 0:r.pp_data)==null?void 0:s.ipoHistory)||[];if(_.length>0){const n=_[0];d=`
      DADOS QUANTITATIVOS RECENTES (CALCULADORA IPO - PORTAGE):
      Data da Avaliação: ${new Date(n.date).toLocaleDateString("pt-BR")}
      Idade de Desenvolvimento Geral: ${n.results.general} anos.
      
      Resultados Detalhados por Área:
      - Socialização: ${n.results.socializacao} anos
      - Linguagem: ${n.results.linguagem} anos
      - Cognição: ${n.results.cognicao} anos
      - Autocuidados: ${n.results.autocuidados} anos
      - Desenvolvimento Motor: ${n.results.motor} anos
      `}const E=`
      SISTEMA BROTAR - GERADOR DE DOCUMENTO OFICIAL
      
      TIPO DE DOCUMENTO: ${e}
      ALUNO: ${a.fullName}, Idade: ${new Date().getFullYear()-new Date(a.birthDate).getFullYear()} anos.
      ESCOLA: ${((A=a.school)==null?void 0:A.schoolName)||"Escola Municipal"}.
      EMISSOR: ${m} (${l}).
      
      ${d}
      
      CONTEXTO ADICIONAL / OBSERVAÇÕES CLÍNICAS: ${t}
      
      ESTRUTURA OBRIGATÓRIA PARA ESTE DOCUMENTO:
      ${S(e)}
      
      INSTRUÇÕES:
      - Gere o documento COMPLETO seguindo EXATAMENTE a estrutura acima
      - Use linguagem técnica, formal e institucional em Português do Brasil
      - Substitua todos os campos [entre colchetes] pelos dados reais fornecidos
      - NUNCA invente diagnósticos — use [DADO NÃO INFORMADO] se faltar info
      - Inclua espaço para assinatura ao final com nome e cargo do profissional
      - Se houver dados IPO disponíveis, cite-os no corpo do documento
      - Formate como HTML pronto para impressão em papel timbrado
    `,o=3;let u=0;for(;u<o;)try{return await D(E)}catch(n){if(u++,n instanceof O&&n.status===429&&u<o){const c=2e3*Math.pow(2,u);console.warn(`Cota excedida. Tentativa ${u} de ${o}. Aguardando ${c}ms...`),await L(c);continue}throw new Error(b(n))}throw new Error("Não foi possível conectar à IA após várias tentativas. Por favor, tente novamente mais tarde.")}},y={getFallbackDocument:(e,a,m,l,t)=>{var A,n;const d=new Date().toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"}),r=new Date().getFullYear()-new Date(a.birthDate).getFullYear(),_="font-family: 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6;",E="text-align: center; font-weight: bold; margin-bottom: 2rem; text-transform: uppercase;",o="margin-bottom: 1.5rem; text-align: justify;",u="margin-top: 4rem; text-align: center; border-top: 1px solid #1a1a1a; padding-top: 0.5rem; width: 60%; margin-left: auto; margin-right: auto;";if(e==="Termo de Autorização de Uso de Imagem e Vídeo"){const i=(A=a.guardians)==null?void 0:A[0],c=(i==null?void 0:i.name)||"____________________________________________________________",p=(i==null?void 0:i.cpf)||"____________________________",I=(i==null?void 0:i.rg)||"____________________________",v=(i==null?void 0:i.phone)||"_________________________________________________";let g="________________________________________________________________________________________";a.address&&a.address.street&&(g=`${a.address.street}, ${a.address.number||""}, ${a.address.district||""} - ${a.address.city}/${a.address.state}`);const f=a.birthDate?new Date(a.birthDate).toLocaleDateString("pt-BR"):"//____",T=new Date().getDate(),h=new Date().toLocaleDateString("pt-BR",{month:"long"}),R=new Date().getFullYear();return`
<div style="${_}">
  <h2 style="${E}">TERMO DE AUTORIZAÇÃO PARA USO DE IMAGEM E VOZ (MENOR DE IDADE)</h2>
  <p style="margin-bottom: 1rem;">Eu, <strong>${c}</strong>,<br>
  CPF: <strong>${p}</strong> RG: <strong>${I}</strong>,<br>
  endereço: <strong>${g}</strong>,<br>
  na qualidade de responsável legal pelo(a) menor <strong>${a.fullName}</strong>,<br>
  data de nascimento: <strong>${f}</strong>,</p>

  <p style="${o}"><strong>AUTORIZO</strong>, de forma livre, informada e inequívoca, o <strong>BROTAR – Centro Multidisciplinar em Educação Inclusiva</strong>, a captar e utilizar a imagem e/ou voz do(a) menor, por meio de fotografias e filmagens, realizadas durante atendimentos, atividades e ações institucionais.</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Finalidade</h3>
  <p style="${o}">A presente autorização destina-se exclusivamente à divulgação institucional e educativa, sem fins comerciais, respeitando a dignidade, privacidade e os direitos do(a) menor, conforme ECA e LGPD (Lei nº 13.709/2018).</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Meios de divulgação</h3>
  <p style="margin-bottom: 1rem;">As imagens/voz poderão ser divulgadas em:</p>
  <ul style="list-style-type: disc; margin-left: 2rem; margin-bottom: 1.5rem;">
    <li>redes sociais institucionais (ex.: Instagram, Facebook e WhatsApp);</li>
    <li>site e materiais informativos do Centro (digitais ou impressos).</li>
  </ul>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Prazo</h3>
  <p style="margin-bottom: 1.5rem;">Autorização válida por <strong>24 (vinte e quatro) meses</strong>, a partir da assinatura.</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Revogação</h3>
  <p style="${o}">O responsável poderá revogar esta autorização a qualquer momento, mediante solicitação por escrito. A revogação não invalida usos já realizados anteriormente, mas impedirá novas divulgações e, quando possível, o material será removido dos canais institucionais.</p>

  <p style="margin-bottom: 2rem;">Declaro que li e compreendi este termo.</p>

  <p style="text-align: right; margin-bottom: 3rem;">Brotas de Macaúbas/BA, <strong>${T} de ${h} de ${R}</strong>.</p>

  <div style="text-align: center; margin-top: 4rem;">
    <div style="display: inline-block; text-align: left;">
      <div style="border-top: 1px solid #000; width: 300px; padding-top: 0.5rem; text-align: center; margin-bottom: 0.5rem;">Assinatura do(a) Responsável Legal</div>
      <div><strong>Nome:</strong> ${c==="____________________________________________________________"?"_____________________________________________________":c}</div>
      <div><strong>CPF:</strong> ${p==="____________________________"?"______________________________________________________":p}</div>
      <div><strong>Telefone:</strong> ${v}</div>
    </div>
  </div>
</div>`.trim()}let s="";switch(e){case"Declaração de Atendimento":s=`
            <p style="${o}">Declaro para os devidos fins que o(a) estudante <strong>${a.fullName}</strong> encontra-se em acompanhamento <strong>${l.toLowerCase()}</strong> sob minha responsabilidade, participando das atividades propostas para seu desenvolvimento integral.</p>
            <p style="${o}">As sessões ocorrem periodicamente e o(a) aluno(a) tem demonstrado assiduidade.</p>
            ${t?`<div style="margin-top: 2rem; border-top: 1px dashed #ccc; padding-top: 1rem;"><h4 style="font-weight: bold; margin-bottom: 0.5rem;">OBSERVAÇÕES ADICIONAIS:</h4><p style="${o}">${t}</p></div>`:""}
        `;break;case"Encaminhamento Geral":s=`
            <p style="${o}">Solicito avaliação e conduta para o(a) estudante acima identificado(a), nascido em <strong>${new Date(a.birthDate).toLocaleDateString("pt-BR")}</strong>.</p>
            
            <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">MOTIVO DO ENCAMINHAMENTO</h3>
            <p style="${o}">O(a) aluno(a) apresenta demandas que necessitam de olhar especializado para melhor compreensão e intervenção.</p>
            
            <div style="background-color: #f8fafc; padding: 1rem; border-left: 4px solid #cbd5e1; margin-bottom: 1.5rem;">
                ${t?t.replace(/\n/g,"<br/>"):"Observa-se necessidade de suporte específico para otimizar seu processo de aprendizagem e desenvolvimento."}
            </div>

            <p style="${o}">Coloco-me à disposição para maiores esclarecimentos e discussões sobre o caso.</p>
        `;break;case"Avaliação Psicopedagógica":s=`
            <h2 style="text-align: center; font-size: 1.2em; font-weight: bold; margin-bottom: 2rem;">RELATÓRIO DE AVALIAÇÃO PRELIMINAR</h2>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">1. QUEIXA INICIAL</h3>
            <p style="${o}">${t||"Dificuldades no processo de aprendizagem reportadas pela escola/família."}</p>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">2. INSTRUMENTOS UTILIZADOS</h3>
            <p style="${o}">Observação clínica, entrevistas, análise de material escolar e atividades lúdicas.</p>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">3. SÍNTESE VIAL</h3>
            <p style="${o}">O(a) estudante encontra-se em processo de avaliação. Observam-se potencialidades a serem exploradas e áreas que requerem atenção. Sugere-se continuidade dos atendimentos para fechamento diagnóstico.</p>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">4. CONCLUSÃO E ENCAMINHAMENTOS</h3>
            <p style="${o}">Indica-se a manutenção do acompanhamento psicopedagógico e, se necessário, avaliação multidisciplinar.</p>
        `;break;case"Termo de Autorização de Uso de Imagem e Vídeo":const i=(n=a.guardians)==null?void 0:n[0],c=(i==null?void 0:i.name)||"____________________________________________________________",p=(i==null?void 0:i.cpf)||"____________________________",I=(i==null?void 0:i.rg)||"____________________________",v=(i==null?void 0:i.phone)||"_________________________________________________";let g="________________________________________________________________________________________";a.address&&a.address.street&&(g=`${a.address.street}, ${a.address.number||""}, ${a.address.district||""} - ${a.address.city}/${a.address.state}`);const f=a.birthDate?new Date(a.birthDate).toLocaleDateString("pt-BR"):"//____",T=new Date().getDate(),h=new Date().toLocaleDateString("pt-BR",{month:"long"}),R=new Date().getFullYear();return`
<div style="font-family: 'Times New Roman', serif; color: #000;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 2rem;">TERMO DE AUTORIZAÇÃO PARA USO DE IMAGEM E VOZ (MENOR DE IDADE)</h2>

  <p style="margin-bottom: 1rem;">Eu, <strong>${c}</strong>,<br>
  CPF: <strong>${p}</strong> RG: <strong>${I}</strong>,<br>
  endereço: <strong>${g}</strong>,<br>
  na qualidade de responsável legal pelo(a) menor <strong>${a.fullName}</strong>,<br>
  data de nascimento: <strong>${f}</strong>,</p>

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

  <p style="text-align: right; margin-bottom: 3rem;">Brotas de Macaúbas/BA, <strong>${T} de ${h} de ${R}</strong>.</p>

  <div style="text-align: center; margin-top: 4rem;">
    <div style="display: inline-block; text-align: left;">
      <div style="border-top: 1px solid #000; width: 300px; padding-top: 0.5rem; text-align: center; margin-bottom: 0.5rem;">Assinatura do(a) Responsável Legal</div>
      <div><strong>Nome:</strong> ${c==="____________________________________________________________"?"_____________________________________________________":c}</div>
      <div><strong>CPF:</strong> ${p==="____________________________"?"______________________________________________________":p}</div>
      <div><strong>Telefone:</strong> ${v}</div>
    </div>
  </div>
</div>
        `.trim();default:["Relatório Fonoaudiológico","Evolução Fonoaudiológica","Parecer Fonoaudiológico","Encaminhamento Fonoaudiológico","Relatório de Alta Fonoaudiológica"].includes(e)?s=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${e.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${o}">Aluno(a): <strong>${a.fullName}</strong>, em acompanhamento fonoaudiológico.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. ÁREAS AVALIADAS</h3>
            <p style="${o}">Linguagem oral e escrita, comunicação, motricidade orofacial, deglutição e voz.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO</h3>
            <p style="${o}">${t||"O(a) aluno(a) demonstra evolução gradual nas habilidades comunicativas e linguísticas trabalhadas nas sessões."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. ENCAMINHAMENTOS</h3>
            <p style="${o}">Indica-se continuidade do acompanhamento fonoaudiológico com foco nas áreas identificadas.</p>`:["Relatório de Terapia Ocupacional","Evolução em Terapia Ocupacional","Parecer de Terapia Ocupacional","Plano de Intervenção Ocupacional","Relatório de Alta em Terapia Ocupacional"].includes(e)?s=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${e.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${o}">Aluno(a): <strong>${a.fullName}</strong>, em acompanhamento de Terapia Ocupacional.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. ÁREAS DE INTERVENÇÃO</h3>
            <p style="${o}">Habilidades de vida diária (AVDs), integração sensorial, coordenação motora fina e grossa, desempenho escolar e funcionalidade.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO</h3>
            <p style="${o}">${t||"O(a) aluno(a) apresenta progresso nas atividades propostas, com melhora na autonomia e no desempenho funcional."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. OBJETIVOS TERAPÊUTICOS</h3>
            <p style="${o}">Ampliar independência nas atividades cotidianas, fortalecer habilidades motoras e promover maior participação escolar.</p>`:["Relatório Fisioterapêutico","Evolução Fisioterapêutica","Parecer Fisioterapêutico","Plano de Reabilitação","Relatório de Alta Fisioterapêutica"].includes(e)?s=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${e.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${o}">Aluno(a): <strong>${a.fullName}</strong>, em acompanhamento fisioterapêutico.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. AVALIAÇÃO MOTORA</h3>
            <p style="${o}">Avaliação do desenvolvimento neuropsicomotor, tônus muscular, padrões de movimento, equilíbrio e marcha.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO</h3>
            <p style="${o}">${t||"O(a) aluno(a) apresenta progressos no desenvolvimento motor, com ganhos observados nas habilidades funcionais trabalhadas."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. PLANO TERAPÊUTICO</h3>
            <p style="${o}">Manutenção das sessões com foco em funcionalidade, prevenção de complicações e promoção da autonomia motora.</p>`:["Relatório Nutricional","Evolução Nutricional","Plano Alimentar Institucional","Parecer Nutricional","Relatório de Acompanhamento Nutricional"].includes(e)?s=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${e.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${o}">Aluno(a): <strong>${a.fullName}</strong>, em acompanhamento nutricional.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. AVALIAÇÃO NUTRICIONAL</h3>
            <p style="${o}">Avaliação do estado nutricional, hábitos alimentares, aceitação alimentar e condições relacionadas à alimentação.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO</h3>
            <p style="${o}">${t||"O(a) aluno(a) demonstra adesão ao acompanhamento com evolução positiva nos hábitos alimentares observados."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. CONDUTAS E ORIENTAÇÕES</h3>
            <p style="${o}">Orientações nutricionais individualizadas fornecidas à família. Indica-se continuidade do acompanhamento nutricional.</p>`:["Relatório de Busca Ativa","Relatório Social de Visita Domiciliar","Ofício ao Conselho Tutelar","Plano de Acompanhamento Familiar"].includes(e)?s=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${e.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO DA FAMÍLIA</h3>
            <p style="${o}">Aluno(a): <strong>${a.fullName}</strong>. Acompanhamento do Serviço Social.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. SITUAÇÃO SOCIAL</h3>
            <p style="${o}">${t||"Família em acompanhamento pelo Serviço Social. Situação avaliada conforme visita técnica e entrevista social realizada."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. INTERVENÇÕES REALIZADAS</h3>
            <p style="${o}">Orientações sobre direitos, acesso a serviços da rede de proteção social e encaminhamentos pertinentes ao caso.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. ENCAMINHAMENTOS</h3>
            <p style="${o}">Indica-se continuidade do acompanhamento familiar e articulação com a rede de proteção social do município.</p>`:["Relatório Psicológico Técnico","Evolução Psicológica","Parecer Psicológico"].includes(e)?s=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${e.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${o}">Aluno(a): <strong>${a.fullName}</strong>, em acompanhamento psicológico.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. DEMANDA APRESENTADA</h3>
            <p style="${o}">${t||"Demanda psicológica identificada e trabalhada em sessões individuais conforme planejamento clínico."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO DO PROCESSO</h3>
            <p style="${o}">O(a) aluno(a) demonstra engajamento no processo psicológico com evolução observada nas áreas trabalhadas em sessão.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. CONSIDERAÇÕES TÉCNICAS</h3>
            <p style="${o}">Indica-se continuidade do acompanhamento psicológico. Este documento não substitui laudo diagnóstico e foi elaborado para fins institucionais.</p>`:["Plano de Intervenção","Relatório de Evolução"].includes(e)?s=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${e.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${o}">Aluno(a): <strong>${a.fullName}</strong>.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. OBJETIVOS</h3>
            <p style="${o}">Promover o desenvolvimento integral do(a) aluno(a) por meio de intervenções especializadas e individualizadas.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO / INTERVENÇÕES</h3>
            <p style="${o}">${t||"O(a) aluno(a) apresenta evolução positiva nas áreas trabalhadas, demonstrando engajamento e progresso gradual."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. PRÓXIMAS ETAPAS</h3>
            <p style="${o}">Continuidade das intervenções planejadas com reavaliação periódica dos objetivos propostos.</p>`:s=`<p style="${o}">Este documento refere-se ao atendimento do(a) estudante <strong>${a.fullName}</strong>.</p>
            ${t?`<p style="${o}">${t}</p>`:'<p style="'+o+'">O processo segue conforme planejamento técnico estabelecido.</p>'}
            <p style="${o}">Permanecemos à disposição para quaisquer dúvidas.</p>`}return`
<div style="${_}">
    <div style="text-align: center; margin-bottom: 3rem;">
        <h1 style="font-size: 1.5em; font-weight: bold; margin: 0; text-transform: uppercase;">${e}</h1>
        <div style="margin-top: 1rem; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 8px; background-color: #fcfcfc;">
            <p style="margin: 0; text-align: left;"><strong>ALUNO:</strong> ${a.fullName}</p>
            <p style="margin: 0; text-align: left;"><strong>IDADE:</strong> ${r} anos</p>
            <p style="margin: 0; text-align: left;"><strong>ESCOLA:</strong> ${a.school.schoolName||"Não informada"}</p>
        </div>
    </div>

    ${s}

    <div style="margin-top: 4rem; text-align: right;">
        <p>Brotas de Macaúbas/BA, <strong>${d}</strong>.</p>
    </div>

    <div style="${u}">
        <p style="margin: 0; font-weight: bold;">${m}</p>
        <p style="margin: 0; color: #64748b;">
            ${l==="Psicopedagogia"||l==="Psicopedagoga"?"Psicopedagoga<br/>CBO-2394/25":l}
        </p>
    </div>
</div>
    `.trim()}};function S(e){return{"Declaração de Atendimento":`
      TÍTULO: DECLARAÇÃO DE ATENDIMENTO
      1. Corpo: Declaramos que [Nome do Aluno], [Idade] anos, aluno(a) da [Escola], esteve presente para atendimento sob responsabilidade técnica do(a) profissional emissor(a).
      2. Contexto Adicional inserido
      3. Encerramento: "Por ser verdade, firmo a presente declaração."
      4. Local, Data e Assinatura do profissional`,"Encaminhamento Geral":`
      TÍTULO: ENCAMINHAMENTO PROFISSIONAL / INSTITUCIONAL
      1. Destinatário: "Ao Setor/Profissional Competente"
      2. Apresentação: encaminhamos [Nome do Aluno], [Idade] anos, da [Escola]
      3. Motivo do encaminhamento com contexto adicional
      4. Solicitação de avaliação e acompanhamento
      5. Disponibilidade para esclarecimentos
      6. Assinatura`,"Relatório Resumido":`
      TÍTULO: RELATÓRIO DE ACOMPANHAMENTO RESUMIDO
      1. Identificação: Nome | Idade | Escola
      2. Histórico e evolução sucinta com contexto adicional
      3. Considerações finais sobre continuidade do acompanhamento
      4. Assinatura`,"Declaração Simples":`
      TÍTULO: DECLARAÇÃO
      1. Corpo: "Declaro, sob as penas da lei... referente ao aluno(a) [Nome], [Idade], da [Escola]"
      2. Contexto adicional como conteúdo principal
      3. Fecho: "Sem mais para o momento"
      4. Assinatura`,"Relatório Psicológico Técnico":`
      TÍTULO: RELATÓRIO PSICOLÓGICO
      1. Identificação completa: Nome | Idade | Escola | Autor | CRP
      2. Descrição da Demanda: queixa e motivo do atendimento
      3. Procedimentos Terapêuticos: metodologia, sessões, técnicas aplicadas
      4. Análise e Compreensão Dinâmica: estado emocional, comportamental, habilidades sociais — usar contexto adicional
      5. Conclusão / Parecer técnico
      6. Encaminhamentos e sugestões à escola e família
      7. Assinatura com CRP`,"Evolução Psicológica":`
      TÍTULO: REGISTRO DE EVOLUÇÃO PSICOLÓGICA
      1. Identificação: Nome | Idade | Escola
      2. Síntese do período de atendimento
      3. Apresentação clínica: progresso frente às metas terapêuticas — usar contexto adicional
      4. Conduta: manutenção ou ajuste do plano terapêutico
      5. Assinatura`,"Parecer Psicológico":`
      TÍTULO: PARECER PSICOLÓGICO TÉCNICO
      1. Identificação do solicitante e assunto: referente ao menor [Nome], [Idade], [Escola]
      2. Exposição de Motivos: dúvida técnica ou requisição
      3. Análise fundamentada nos princípios éticos da psicologia — usar contexto adicional
      4. Conclusão: posicionamento final assertivo
      5. Assinatura com CRP`,"Anamnese Psicológica":`
      TÍTULO: ANAMNESE PSICOLÓGICA
      1. Identificação: Nome | Idade | Escola | Responsável
      2. Queixa Principal: motivo da procura pelo atendimento
      3. História do Desenvolvimento: gestação, nascimento, marcos do desenvolvimento
      4. Histórico de Saúde: doenças, medicamentos, hospitalizações
      5. Histórico Escolar: desempenho, relacionamentos, dificuldades
      6. Dinâmica Familiar: composição familiar, vínculos, contexto socioeconômico
      7. Contexto adicional com observações clínicas iniciais
      8. Assinatura`,"Declaração de Sigilo Profissional":`
      TÍTULO: DECLARAÇÃO DE SIGILO PROFISSIONAL
      1. Identificação do profissional e do paciente [Nome], [Idade], [Escola]
      2. Declaração formal de compromisso com o sigilo ético conforme CFP
      3. Exceções legais ao sigilo (risco de vida, determinação judicial)
      4. Contexto adicional se houver
      5. Assinatura com CRP`,"Relatório de Busca Ativa":`
      TÍTULO: RELATÓRIO SOCIAL DE BUSCA ATIVA
      1. Dados do Aluno: Nome | Idade | Escola
      2. Objetivo: documentar ação de busca ativa por infrequência/evasão
      3. Relato da Ação: tentativas de contato, visita ao endereço, dados colhidos — usar contexto adicional
      4. Fatores Identificados: vulnerabilidades e entraves sociais
      5. Encaminhamentos realizados à rede de assistência
      6. Assinatura com CRESS`,"Relatório Social de Visita Domiciliar":`
      TÍTULO: RELATÓRIO SOCIAL DE VISITA DOMICILIAR
      1. Identificação: Aluno | Idade | Escola
      2. Contexto: justificativa técnica da visita
      3. Composição Familiar: moradores, renda, benefícios sociais
      4. Condições de Habitabilidade: ambiente, saneamento, segurança
      5. Considerações Técnicas: parecer social sobre impacto no desenvolvimento — usar contexto adicional
      6. Assinatura com CRESS`,"Ofício ao Conselho Tutelar":`
      CABEÇALHO: OFÍCIO Nº [automático] / [Ano]
      DESTINATÁRIO: Ao Ilustríssimo Conselho Tutelar da Criança e do Adolescente
      ASSUNTO: Encaminhamento e Requisição de Providências
      1. Corpo: comunicar ao Conselho fatos sobre [Nome], [Idade], [Escola]
      2. Relato do Caso: irregularidades ou violações identificadas — usar contexto adicional
      3. Requerimento: averiguação, medidas protetivas do ECA e retorno institucional
      4. Assinatura`,"Plano de Acompanhamento Familiar":`
      TÍTULO: PLANO DE ACOMPANHAMENTO FAMILIAR (PAF)
      1. Família Assistida: Nome da criança referência | Idade | Escola
      2. Síntese do Diagnóstico Social: contexto de vulnerabilidade
      3. Objetivos: metas a curto, médio e longo prazo
      4. Ações Propostas: atividades e responsabilidades mútuas — usar contexto adicional
      5. Previsão de Reavaliação: cronograma de monitoramento
      6. Assinatura`,"Anamnese Social":`
      TÍTULO: ANAMNESE SOCIAL
      1. Identificação: Nome | Idade | Escola | Responsável
      2. Composição e Dinâmica Familiar
      3. Condições Socioeconômicas: renda, moradia, acesso a serviços
      4. Histórico de Acompanhamentos Anteriores
      5. Vulnerabilidades e Fatores de Proteção identificados
      6. Contexto adicional com observações iniciais
      7. Assinatura com CRESS`,"Estudo Social":`
      TÍTULO: ESTUDO SOCIAL
      1. Identificação do caso: Nome | Idade | Escola
      2. Metodologia: instrumentos e técnicas utilizadas (entrevistas, visitas, pesquisa documental)
      3. Análise da Situação Social: contexto familiar, econômico e comunitário
      4. Diagnóstico Social: síntese das vulnerabilidades e potencialidades — usar contexto adicional
      5. Parecer e Encaminhamentos propostos
      6. Assinatura com CRESS`,"Avaliação Psicopedagógica":`
      TÍTULO: RELATÓRIO DE AVALIAÇÃO PSICOPEDAGÓGICA CLÍNICA
      1. Identificação: Nome | Idade | Escola | Avaliador
      2. Queixa Inicial: motivo encaminhado pelos pais/escola
      3. Instrumentos Utilizados: anamnese, sessões lúdicas, testagens, baterias cognitivas (EOCA, Piaget, rastreio de leitura)
      4. Análise Quantitativa e Qualitativa: habilidades cognitivas, linguísticas, sociais e motoras — usar contexto adicional e dados IPO se disponíveis
      5. Hipótese Diagnóstica: fechamento clínico fundamentado
      6. Encaminhamentos: diretrizes pedagógicas, Neuropediatria, Fonoaudiologia
      7. Assinatura`,"Anamnese Psicopedagógica":`
      TÍTULO: ANAMNESE PSICOPEDAGÓGICA
      1. Identificação: Nome | Idade | Escola | Responsável
      2. Queixa Principal: dificuldades referidas pela família e escola
      3. História do Desenvolvimento: marcos do desenvolvimento neuropsicomotor
      4. Histórico Escolar: anos cursados, repetências, relação com aprendizagem
      5. Aspectos Familiares e Emocionais: dinâmica familiar, relações afetivas
      6. Observações Iniciais do Profissional — usar contexto adicional
      7. Assinatura`,"Plano de Intervenção":`
      TÍTULO: PLANO DE INTERVENÇÃO PSICOPEDAGÓGICA (PIP)
      1. Dados do Paciente: Nome | Idade | Escola
      2. Síntese Avaliativa: onde a criança se encontra no processo cognitivo
      3. Objetivos Gerais: trajetória esperada para os próximos semestres
      4. Estratégias e Metodologia: práticas, estimulação, treinos cognitivos — usar contexto adicional
      5. Orientação Escolar: adaptações curriculares, manejo em sala
      6. Assinatura`,"Relatório de Evolução":`
      TÍTULO: RELATÓRIO DE EVOLUÇÃO PSICOPEDAGÓGICA
      1. Identificação: Nome | Idade | Escola
      2. Finalidade: retrospectiva dos atendimentos e ganhos alcançados
      3. Avanços Cognitivos e de Aprendizagem: habilidades desenvolvidas — usar contexto adicional
      4. Postura frente às propostas: engajamento familiar e comportamental
      5. Conclusões e Condutas: manutenção ou novas metas
      6. Assinatura`,"Relatório Semestral Psicopedagógico":`
      TÍTULO: RELATÓRIO SEMESTRAL PSICOPEDAGÓGICO
      1. Identificação: Nome | Idade | Escola | Período (1º ou 2º semestre / Ano)
      2. Resumo das Intervenções Realizadas no Semestre
      3. Evolução das Habilidades Trabalhadas: cognitivas, emocionais, pedagógicas — usar contexto adicional
      4. Desafios Persistentes e Estratégias Adotadas
      5. Metas para o Próximo Semestre
      6. Assinatura`,"Anamnese Fonoaudiológica":`
      TÍTULO: ANAMNESE FONOAUDIOLÓGICA
      1. Identificação: Nome | Idade | Escola | Responsável
      2. Queixa Principal: dificuldades de fala, linguagem, voz ou deglutição
      3. História do Desenvolvimento da Linguagem: primeiras palavras, frases
      4. Histórico de Saúde: otites, amigdalectomia, uso de aparelho auditivo
      5. Hábitos Orais: chupeta, mamadeira, onicofagia
      6. Contexto adicional com observações iniciais
      7. Assinatura com CRFa`,"Relatório Fonoaudiológico":`
      TÍTULO: RELATÓRIO FONOAUDIOLÓGICO
      1. Identificação: Nome | Idade | Escola | Avaliador com CRFa
      2. Áreas Avaliadas: linguagem oral e escrita, comunicação, motricidade orofacial, deglutição, voz
      3. Achados Clínicos: resultados por área avaliada — usar contexto adicional
      4. Hipótese Diagnóstica Fonoaudiológica
      5. Conduta e Encaminhamentos
      6. Assinatura com CRFa`,"Evolução Fonoaudiológica":`
      TÍTULO: EVOLUÇÃO FONOAUDIOLÓGICA
      1. Identificação: Nome | Idade | Escola
      2. Período de Acompanhamento
      3. Evolução nas Áreas Trabalhadas: progressos observados — usar contexto adicional
      4. Metas Atingidas e Pendentes
      5. Conduta para os próximos atendimentos
      6. Assinatura com CRFa`,"Parecer Fonoaudiológico":`
      TÍTULO: PARECER FONOAUDIOLÓGICO
      1. Identificação e solicitante
      2. Análise técnica fonoaudiológica do caso [Nome], [Idade], [Escola] — usar contexto adicional
      3. Posicionamento conclusivo
      4. Assinatura com CRFa`,"Encaminhamento Fonoaudiológico":`
      TÍTULO: ENCAMINHAMENTO FONOAUDIOLÓGICO
      1. Destinatário especializado
      2. Dados do paciente: Nome | Idade | Escola
      3. Justificativa clínica do encaminhamento — usar contexto adicional
      4. Hipótese que motivou o encaminhamento
      5. Assinatura com CRFa`,"Relatório de Alta Fonoaudiológica":`
      TÍTULO: RELATÓRIO DE ALTA FONOAUDIOLÓGICA
      1. Identificação: Nome | Idade | Escola
      2. Período de acompanhamento fonoaudiológico
      3. Objetivos alcançados e justificativa da alta — usar contexto adicional
      4. Orientações para manutenção dos resultados
      5. Assinatura com CRFa`,"Anamnese de Terapia Ocupacional":`
      TÍTULO: ANAMNESE DE TERAPIA OCUPACIONAL
      1. Identificação: Nome | Idade | Escola | Responsável
      2. Queixa Principal: dificuldades nas AVDs, escola, brincar
      3. História do Desenvolvimento Motor e Sensorial
      4. Histórico de Saúde e Cirurgias
      5. Rotina Diária e Participação Escolar
      6. Contexto adicional com observações iniciais
      7. Assinatura com CREFITO`,"Relatório Sensorial":`
      TÍTULO: RELATÓRIO DE PROCESSAMENTO SENSORIAL
      1. Identificação: Nome | Idade | Escola
      2. Áreas de Processamento Avaliadas: tátil, vestibular, proprioceptivo, auditivo, visual
      3. Perfil Sensorial: padrões identificados — usar contexto adicional
      4. Impacto no Desempenho Escolar e nas AVDs
      5. Estratégias de Regulação Sensorial Recomendadas
      6. Assinatura com CREFITO`,"Relatório de Terapia Ocupacional":`
      TÍTULO: RELATÓRIO DE TERAPIA OCUPACIONAL
      1. Identificação: Nome | Idade | Escola
      2. Áreas de Intervenção: AVDs, integração sensorial, coordenação motora, desempenho escolar
      3. Evolução e Progressos Observados — usar contexto adicional
      4. Objetivos Terapêuticos e Próximas Etapas
      5. Assinatura com CREFITO`,"Evolução em Terapia Ocupacional":`
      TÍTULO: EVOLUÇÃO EM TERAPIA OCUPACIONAL
      1. Identificação: Nome | Idade | Escola
      2. Período de Acompanhamento
      3. Progressos na Autonomia e Funcionalidade — usar contexto adicional
      4. Metas Atingidas e Pendentes
      5. Assinatura com CREFITO`,"Parecer de Terapia Ocupacional":`
      TÍTULO: PARECER DE TERAPIA OCUPACIONAL
      1. Identificação e solicitante
      2. Análise técnica ocupacional do caso — usar contexto adicional
      3. Posicionamento conclusivo
      4. Assinatura com CREFITO`,"Plano de Intervenção Ocupacional":`
      TÍTULO: PLANO DE INTERVENÇÃO OCUPACIONAL
      1. Dados do Paciente: Nome | Idade | Escola
      2. Perfil Ocupacional: habilidades atuais e demandas identificadas
      3. Objetivos Terapêuticos a Curto e Longo Prazo
      4. Estratégias e Atividades Propostas — usar contexto adicional
      5. Frequência e Critérios de Reavaliação
      6. Assinatura com CREFITO`,"Relatório de Alta em Terapia Ocupacional":`
      TÍTULO: RELATÓRIO DE ALTA EM TERAPIA OCUPACIONAL
      1. Identificação: Nome | Idade | Escola
      2. Período de acompanhamento
      3. Objetivos alcançados e justificativa da alta — usar contexto adicional
      4. Orientações para manutenção da funcionalidade
      5. Assinatura com CREFITO`,"Anamnese Fisioterapêutica":`
      TÍTULO: ANAMNESE FISIOTERAPÊUTICA
      1. Identificação: Nome | Idade | Escola | Responsável
      2. Queixa Principal: limitações motoras, dores, posturas
      3. História do Desenvolvimento Neuropsicomotor
      4. Histórico de Saúde: cirurgias, fraturas, doenças neurológicas
      5. Contexto adicional com observações iniciais
      6. Assinatura com CREFITO`,"Relatório Fisioterapêutico":`
      TÍTULO: RELATÓRIO FISIOTERAPÊUTICO
      1. Identificação: Nome | Idade | Escola
      2. Avaliação Motora: tônus, padrões de movimento, equilíbrio, marcha
      3. Achados Clínicos e Funcionais — usar contexto adicional
      4. Plano Terapêutico e Metas
      5. Assinatura com CREFITO`,"Evolução Fisioterapêutica":`
      TÍTULO: EVOLUÇÃO FISIOTERAPÊUTICA
      1. Identificação: Nome | Idade | Escola
      2. Período de Acompanhamento
      3. Ganhos Motores e Funcionais Observados — usar contexto adicional
      4. Ajustes no Plano Terapêutico
      5. Assinatura com CREFITO`,"Parecer Fisioterapêutico":`
      TÍTULO: PARECER FISIOTERAPÊUTICO
      1. Identificação e solicitante
      2. Análise técnica fisioterapêutica — usar contexto adicional
      3. Posicionamento conclusivo
      4. Assinatura com CREFITO`,"Plano de Reabilitação":`
      TÍTULO: PLANO DE REABILITAÇÃO FISIOTERAPÊUTICA
      1. Dados do Paciente: Nome | Idade | Escola
      2. Diagnóstico Funcional: condição atual e limitações identificadas
      3. Objetivos: curto, médio e longo prazo
      4. Protocolo de Intervenção: técnicas e frequência — usar contexto adicional
      5. Critérios de Alta
      6. Assinatura com CREFITO`,"Relatório de Alta Fisioterapêutica":`
      TÍTULO: RELATÓRIO DE ALTA FISIOTERAPÊUTICA
      1. Identificação: Nome | Idade | Escola
      2. Período de acompanhamento e objetivos atingidos — usar contexto adicional
      3. Orientações para manutenção
      4. Assinatura com CREFITO`,"Anamnese Nutricional":`
      TÍTULO: ANAMNESE NUTRICIONAL
      1. Identificação: Nome | Idade | Escola | Responsável
      2. Queixa Alimentar Principal: seletividade, recusa, dificuldades
      3. Histórico Alimentar: aleitamento, introdução alimentar, alimentos aceitos/rejeitados
      4. Histórico de Saúde: alergias, intolerâncias, uso de suplementos
      5. Rotina Alimentar: horários, local das refeições, quantidade
      6. Contexto adicional com observações iniciais
      7. Assinatura com CRN`,"Relatório Nutricional":`
      TÍTULO: RELATÓRIO NUTRICIONAL
      1. Identificação: Nome | Idade | Escola
      2. Avaliação do Estado Nutricional: dados antropométricos e classificação
      3. Hábitos Alimentares e Aceitação — usar contexto adicional
      4. Diagnóstico Nutricional
      5. Orientações e Conduta
      6. Assinatura com CRN`,"Evolução Nutricional":`
      TÍTULO: EVOLUÇÃO NUTRICIONAL
      1. Identificação: Nome | Idade | Escola
      2. Período de Acompanhamento
      3. Evolução nos Hábitos Alimentares — usar contexto adicional
      4. Metas Atingidas e Pendentes
      5. Assinatura com CRN`,"Plano Alimentar Institucional":`
      TÍTULO: PLANO ALIMENTAR INSTITUCIONAL
      1. Identificação: Nome | Idade | Escola
      2. Diagnóstico Nutricional e necessidades específicas
      3. Orientações para a Escola: adaptações na merenda, restrições — usar contexto adicional
      4. Orientações para a Família: substituições e preparações recomendadas
      5. Assinatura com CRN`,"Parecer Nutricional":`
      TÍTULO: PARECER NUTRICIONAL
      1. Identificação e solicitante
      2. Análise técnica nutricional do caso — usar contexto adicional
      3. Posicionamento conclusivo
      4. Assinatura com CRN`,"Relatório de Acompanhamento Nutricional":`
      TÍTULO: RELATÓRIO DE ACOMPANHAMENTO NUTRICIONAL
      1. Identificação: Nome | Idade | Escola
      2. Período de Acompanhamento
      3. Evolução do Estado Nutricional e Hábitos — usar contexto adicional
      4. Condutas e Orientações fornecidas à família
      5. Assinatura com CRN`,"Carta de Encaminhamento Intersetorial":`
      TÍTULO: CARTA DE ENCAMINHAMENTO INTERSETORIAL
      1. Destinatário: serviço/equipamento de destino (saúde, assistência, educação)
      2. Identificação: Nome | Idade | Escola
      3. Motivo do encaminhamento intersetorial — usar contexto adicional
      4. Histórico relevante e intervenções já realizadas
      5. Objetivo do encaminhamento e retorno esperado
      6. Assinatura do profissional`,"Parecer Psicopedagógico":`
      TÍTULO: PARECER PSICOPEDAGÓGICO
      1. Identificação e solicitante
      2. Síntese do processo de acompanhamento de [Nome], [Idade], [Escola]
      3. Análise psicopedagógica fundamentada — usar contexto adicional
      4. Posicionamento conclusivo sobre hipótese diagnóstica ou aprendizagem
      5. Encaminhamentos e orientações pedagógicas
      6. Assinatura`,"Avaliação Fonoaudiológica":`
      TÍTULO: AVALIAÇÃO FONOAUDIOLÓGICA
      1. Identificação: Nome | Idade | Escola | Avaliador CRFa
      2. Motivo da Avaliação: queixa e encaminhamento
      3. Instrumentos Aplicados: protocolos, testes e observações
      4. Resultados por Área: linguagem oral, escrita, fala, voz, motricidade orofacial — usar contexto adicional
      5. Hipótese Diagnóstica Fonoaudiológica
      6. Conduta Proposta e Encaminhamentos
      7. Assinatura com CRFa`,"Avaliação Fisioterapêutica":`
      TÍTULO: AVALIAÇÃO FISIOTERAPÊUTICA
      1. Identificação: Nome | Idade | Escola | Avaliador CREFITO
      2. Motivo da Avaliação: queixa motora e encaminhamento
      3. Exame Físico: postura, tônus, força, amplitude de movimento, equilíbrio, marcha
      4. Achados Clínicos — usar contexto adicional
      5. Diagnóstico Fisioterapêutico e Metas
      6. Plano de Tratamento Proposto
      7. Assinatura com CREFITO`,"Avaliação Nutricional":`
      TÍTULO: AVALIAÇÃO NUTRICIONAL
      1. Identificação: Nome | Idade | Escola | Avaliador CRN
      2. Dados Antropométricos: peso, altura, IMC, classificação nutricional
      3. Avaliação do Consumo Alimentar: recordatório, frequência
      4. Comportamento Alimentar: seletividade, recusas — usar contexto adicional
      5. Diagnóstico Nutricional
      6. Metas e Conduta Nutricional
      7. Assinatura com CRN`,"Ofício de Encaminhamento":`
      CABEÇALHO: OFÍCIO Nº [automático] / [Ano] — Secretaria BROTAR
      DESTINATÁRIO: Nome e cargo do destinatário, instituição
      ASSUNTO: Encaminhamento do(a) aluno(a) [Nome]
      1. Apresentação institucional do BROTAR
      2. Dados do aluno: Nome | Idade | Escola
      3. Motivo e objetivo do encaminhamento — usar contexto adicional
      4. Solicitação de recebimento e providências
      5. Assinatura da Secretaria`,"Ofício Informativo":`
      CABEÇALHO: OFÍCIO Nº [automático] / [Ano] — Secretaria BROTAR
      DESTINATÁRIO: Autoridade/Instituição competente
      ASSUNTO: Informação sobre atendimento especializado
      1. Contexto institucional do BROTAR
      2. Informação principal — usar contexto adicional
      3. Dados relevantes e justificativa
      4. Disposição para esclarecimentos
      5. Assinatura da Secretaria`,"Memorando Interno":`
      CABEÇALHO: MEMORANDO Nº [automático] / [Ano]
      PARA: [Destinatário interno] | DE: Secretaria BROTAR
      ASSUNTO: [conforme contexto]
      1. Comunicação interna objetiva — usar contexto adicional
      2. Providências solicitadas ou informações relevantes
      3. Prazo se houver
      4. Assinatura`,"Circular Informativa":`
      TÍTULO: CIRCULAR Nº [automático] / [Ano]
      DESTINATÁRIOS: Equipe técnica / Famílias / Escolas
      1. Comunicado institucional — usar contexto adicional
      2. Orientações ou informações relevantes para o público-alvo
      3. Contato para dúvidas
      4. Assinatura da Coordenação/Secretaria`,"Declaração de Matrícula":`
      TÍTULO: DECLARAÇÃO DE MATRÍCULA EM ATENDIMENTO ESPECIALIZADO
      1. Declaramos que [Nome], [Idade] anos, aluno(a) da [Escola]
      2. Está regularmente matriculado(a) no Programa BROTAR
      3. Modalidade de atendimento e especialidade — usar contexto adicional
      4. Fins a que se destina
      5. Assinatura da Secretaria`,"Declaração de Frequência":`
      TÍTULO: DECLARAÇÃO DE FREQUÊNCIA
      1. Declaramos que [Nome], [Idade] anos, aluno(a) da [Escola]
      2. Frequenta regularmente os atendimentos do Programa BROTAR
      3. Frequência no período — usar contexto adicional
      4. Fins a que se destina
      5. Assinatura da Secretaria`,"Declaração de Vaga em Atendimento Especializado":`
      TÍTULO: DECLARAÇÃO DE VAGA EM ATENDIMENTO ESPECIALIZADO
      1. Declaramos que [Nome], [Idade] anos, aluno(a) da [Escola]
      2. Possui vaga garantida no Programa BROTAR
      3. Data de início e periodicidade — usar contexto adicional
      4. Fins a que se destina
      5. Assinatura da Secretaria`,"Convocação de Responsável":`
      TÍTULO: CONVOCAÇÃO
      1. Convocamos o(a) responsável pelo(a) aluno(a) [Nome], da [Escola]
      2. Data, horário e local do comparecimento
      3. Motivo da convocação — usar contexto adicional
      4. Importância do comparecimento e contato
      5. Assinatura da Secretaria`,"Comunicado à Família":`
      TÍTULO: COMUNICADO AO RESPONSÁVEL
      1. Prezado(a) responsável pelo(a) aluno(a) [Nome], da [Escola]
      2. Comunicado sobre atendimentos, agenda ou situação — usar contexto adicional
      3. Orientações ou solicitações pertinentes
      4. Contato para dúvidas
      5. Assinatura da Secretaria`,"Comunicado à Escola":`
      TÍTULO: COMUNICADO À UNIDADE ESCOLAR
      DESTINATÁRIO: Direção/Coordenação da [Escola]
      1. Informações sobre o aluno [Nome] atendido pelo BROTAR
      2. Orientações ou solicitações à escola — usar contexto adicional
      3. Articulação necessária entre BROTAR e escola
      4. Contato para articulação
      5. Assinatura da Secretaria`,"Relatório de Atendimentos do Mês":`
      TÍTULO: RELATÓRIO MENSAL DE ATENDIMENTOS
      1. Unidade de atendimento (Sede/Cocal) | Mês/Ano
      2. Total de atendimentos realizados no período
      3. Distribuição por especialidade e profissional
      4. Informações sobre frequência e faltas — usar contexto adicional
      5. Observações administrativas relevantes
      6. Assinatura da Secretaria`,"Relatório de Frequência do Aluno":`
      TÍTULO: RELATÓRIO DE FREQUÊNCIA — [Nome] | [Escola]
      1. Período de referência
      2. Total de atendimentos agendados vs realizados
      3. Faltas justificadas e injustificadas — usar contexto adicional
      4. Impacto na continuidade do atendimento
      5. Orientações à família
      6. Assinatura da Secretaria`,"Relatório de Encaminhamentos Realizados":`
      TÍTULO: RELATÓRIO DE ENCAMINHAMENTOS REALIZADOS
      1. Aluno: [Nome] | Escola: [Escola] | Período
      2. Encaminhamentos realizados: instituições e especialidades
      3. Situação de cada encaminhamento — usar contexto adicional
      4. Retornos recebidos e pendências
      5. Próximos passos
      6. Assinatura da Secretaria`,"Termo de Ciência e Responsabilidade":`
      TÍTULO: TERMO DE CIÊNCIA E RESPONSABILIDADE
      1. Identificação do responsável e do aluno [Nome], [Idade], [Escola]
      2. Objeto do termo: ciência sobre as condições do atendimento
      3. Direitos e deveres do responsável — usar contexto adicional
      4. Comprometimento com frequência e participação
      5. Assinatura do Responsável, Testemunha e Secretaria`,"Termo de Compromisso Familiar":`
      TÍTULO: TERMO DE COMPROMISSO FAMILIAR
      1. Identificação da família e do aluno [Nome], [Idade], [Escola]
      2. Compromissos assumidos pela família com o Programa BROTAR
      3. Cláusulas específicas de comprometimento — usar contexto adicional
      4. Consequências do não cumprimento
      5. Assinatura do Responsável, Testemunha e Coordenação`}[e]||`
    TÍTULO: ${e.toUpperCase()}
    1. Identificação: Nome do aluno | Idade | Escola
    2. Objetivo do documento
    3. Desenvolvimento com contexto adicional fornecido
    4. Conclusões e encaminhamentos
    5. Assinatura do profissional`}export{U as G,y as T};
