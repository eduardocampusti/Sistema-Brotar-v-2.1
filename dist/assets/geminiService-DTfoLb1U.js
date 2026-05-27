import{G as E}from"./vendor-ai-BER3QIUg.js";const I=new E({apiKey:"AIzaSyBbDAz-DnscuuBTWWJZbLBdnO4ocW3uV4M"}),D=`
Você é o REDATOR OFICIAL do SISTEMA BROTAR.
Sua tarefa é gerar documentos profissionais (Relatórios, Ofícios, Declarações).
REGRAS:
1. Use linguagem técnica, formal e institucional.
2. NUNCA invente dados médicos ou diagnósticos não fornecidos.
3. Se faltar informação, use [DADO NÃO INFORMADO].
4. Formate como um texto de documento oficial, pronto para impressão em papel timbrado.
`,w=t=>new Promise(o=>setTimeout(o,t)),N={generateOfficialDocument:async(t,o,u,l,i)=>{var _,g,c;let h="";const m=o.clinical,d=((_=m==null?void 0:m.pp_data)==null?void 0:_.ipoHistory)||[];if(d.length>0){const a=d[0];h=`
      DADOS QUANTITATIVOS RECENTES (CALCULADORA IPO - PORTAGE):
      Data da Avaliação: ${new Date(a.date).toLocaleDateString("pt-BR")}
      Idade de Desenvolvimento Geral: ${a.results.general} anos.
      
      Resultados Detalhados por Área:
      - Socialização: ${a.results.socializacao} anos
      - Linguagem: ${a.results.linguagem} anos
      - Cognição: ${a.results.cognicao} anos
      - Autocuidados: ${a.results.autocuidados} anos
      - Desenvolvimento Motor: ${a.results.motor} anos
      `}const f=`
      SISTEMA BROTAR - GERADOR DE DOCUMENTO OFICIAL
      
      TIPO DE DOCUMENTO: ${t}
      ALUNO: ${o.fullName}, Idade: ${new Date().getFullYear()-new Date(o.birthDate).getFullYear()} anos.
      ESCOLA: ${o.school.schoolName}.
      EMISSOR: ${u} (${l}).
      
      ${h}
      
      CONTEXTO ADICIONAL / OBSERVAÇÕES CLÍNICAS: ${i}
      
      Gere o texto completo do documento. Inclua cabeçalho institucional fictício (mas formal), título centralizado, corpo do texto bem estruturado e espaço para assinatura ao final.
      O texto deve ser em Português do Brasil, profissional, acolhedor e DEVE OBRIGATORIAMENTE CITAR os dados do IPO se estiverem disponíveis acima, contextualizando-os no desenvolvimento do aluno.
    `,e=3;let r=0;for(;r<e;)try{const a=await I.models.generateContent({model:"gemini-2.0-flash",contents:f,config:{systemInstruction:D,temperature:.7}});if(!a.text)throw new Error("Resposta da IA veio vazia.");return a.text}catch(a){if(r++,(((g=a.message)==null?void 0:g.includes("Quota exceeded"))||((c=a.message)==null?void 0:c.includes("429"))||a.toString().includes("Quota exceeded"))&&r<e){const s=2e3*Math.pow(2,r);console.warn(`Cota excedida. Tentativa ${r} de ${e}. Aguardando ${s}ms...`),await w(s);continue}throw console.error("Erro no GeminiService:",a),new Error(a.message||"Erro desconhecido na geração via Gemini.")}throw new Error("Não foi possível conectar à IA após várias tentativas. Por favor, tente novamente mais tarde.")}},S={getFallbackDocument:(t,o,u,l,i)=>{var g,c;const h=new Date().toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"}),m=new Date().getFullYear()-new Date(o.birthDate).getFullYear(),d="font-family: 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6;",f="text-align: center; font-weight: bold; margin-bottom: 2rem; text-transform: uppercase;",e="margin-bottom: 1.5rem; text-align: justify;",r="margin-top: 4rem; text-align: center; border-top: 1px solid #1a1a1a; padding-top: 0.5rem; width: 60%; margin-left: auto; margin-right: auto;";if(t==="Termo de Autorização de Uso de Imagem e Vídeo"){const a=(g=o.guardians)==null?void 0:g[0],n=(a==null?void 0:a.name)||"____________________________________________________________",s=(a==null?void 0:a.cpf)||"____________________________",b=(a==null?void 0:a.rg)||"____________________________",v=(a==null?void 0:a.phone)||"_________________________________________________";let p="________________________________________________________________________________________";o.address&&o.address.street&&(p=`${o.address.street}, ${o.address.number||""}, ${o.address.district||""} - ${o.address.city}/${o.address.state}`);const A=o.birthDate?new Date(o.birthDate).toLocaleDateString("pt-BR"):"//____",y=new Date().getDate(),$=new Date().toLocaleDateString("pt-BR",{month:"long"}),O=new Date().getFullYear();return`
<div style="${d}">
  <h2 style="${f}">TERMO DE AUTORIZAÇÃO PARA USO DE IMAGEM E VOZ (MENOR DE IDADE)</h2>
  <p style="margin-bottom: 1rem;">Eu, <strong>${n}</strong>,<br>
  CPF: <strong>${s}</strong> RG: <strong>${b}</strong>,<br>
  endereço: <strong>${p}</strong>,<br>
  na qualidade de responsável legal pelo(a) menor <strong>${o.fullName}</strong>,<br>
  data de nascimento: <strong>${A}</strong>,</p>

  <p style="${e}"><strong>AUTORIZO</strong>, de forma livre, informada e inequívoca, o <strong>BROTAR – Centro Multidisciplinar em Educação Inclusiva</strong>, a captar e utilizar a imagem e/ou voz do(a) menor, por meio de fotografias e filmagens, realizadas durante atendimentos, atividades e ações institucionais.</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Finalidade</h3>
  <p style="${e}">A presente autorização destina-se exclusivamente à divulgação institucional e educativa, sem fins comerciais, respeitando a dignidade, privacidade e os direitos do(a) menor, conforme ECA e LGPD (Lei nº 13.709/2018).</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Meios de divulgação</h3>
  <p style="margin-bottom: 1rem;">As imagens/voz poderão ser divulgadas em:</p>
  <ul style="list-style-type: disc; margin-left: 2rem; margin-bottom: 1.5rem;">
    <li>redes sociais institucionais (ex.: Instagram, Facebook e WhatsApp);</li>
    <li>site e materiais informativos do Centro (digitais ou impressos).</li>
  </ul>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Prazo</h3>
  <p style="margin-bottom: 1.5rem;">Autorização válida por <strong>24 (vinte e quatro) meses</strong>, a partir da assinatura.</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Revogação</h3>
  <p style="${e}">O responsável poderá revogar esta autorização a qualquer momento, mediante solicitação por escrito. A revogação não invalida usos já realizados anteriormente, mas impedirá novas divulgações e, quando possível, o material será removido dos canais institucionais.</p>

  <p style="margin-bottom: 2rem;">Declaro que li e compreendi este termo.</p>

  <p style="text-align: right; margin-bottom: 3rem;">Brotas de Macaúbas/BA, <strong>${y} de ${$} de ${O}</strong>.</p>

  <div style="text-align: center; margin-top: 4rem;">
    <div style="display: inline-block; text-align: left;">
      <div style="border-top: 1px solid #000; width: 300px; padding-top: 0.5rem; text-align: center; margin-bottom: 0.5rem;">Assinatura do(a) Responsável Legal</div>
      <div><strong>Nome:</strong> ${n==="____________________________________________________________"?"_____________________________________________________":n}</div>
      <div><strong>CPF:</strong> ${s==="____________________________"?"______________________________________________________":s}</div>
      <div><strong>Telefone:</strong> ${v}</div>
    </div>
  </div>
</div>`.trim()}let _="";switch(t){case"Declaração de Atendimento":_=`
            <p style="${e}">Declaro para os devidos fins que o(a) estudante <strong>${o.fullName}</strong> encontra-se em acompanhamento <strong>${l.toLowerCase()}</strong> sob minha responsabilidade, participando das atividades propostas para seu desenvolvimento integral.</p>
            <p style="${e}">As sessões ocorrem periodicamente e o(a) aluno(a) tem demonstrado assiduidade.</p>
            ${i?`<div style="margin-top: 2rem; border-top: 1px dashed #ccc; padding-top: 1rem;"><h4 style="font-weight: bold; margin-bottom: 0.5rem;">OBSERVAÇÕES ADICIONAIS:</h4><p style="${e}">${i}</p></div>`:""}
        `;break;case"Encaminhamento Geral":_=`
            <p style="${e}">Solicito avaliação e conduta para o(a) estudante acima identificado(a), nascido em <strong>${new Date(o.birthDate).toLocaleDateString("pt-BR")}</strong>.</p>
            
            <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">MOTIVO DO ENCAMINHAMENTO</h3>
            <p style="${e}">O(a) aluno(a) apresenta demandas que necessitam de olhar especializado para melhor compreensão e intervenção.</p>
            
            <div style="background-color: #f8fafc; padding: 1rem; border-left: 4px solid #cbd5e1; margin-bottom: 1.5rem;">
                ${i?i.replace(/\n/g,"<br/>"):"Observa-se necessidade de suporte específico para otimizar seu processo de aprendizagem e desenvolvimento."}
            </div>

            <p style="${e}">Coloco-me à disposição para maiores esclarecimentos e discussões sobre o caso.</p>
        `;break;case"Avaliação Psicopedagógica":_=`
            <h2 style="text-align: center; font-size: 1.2em; font-weight: bold; margin-bottom: 2rem;">RELATÓRIO DE AVALIAÇÃO PRELIMINAR</h2>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">1. QUEIXA INICIAL</h3>
            <p style="${e}">${i||"Dificuldades no processo de aprendizagem reportadas pela escola/família."}</p>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">2. INSTRUMENTOS UTILIZADOS</h3>
            <p style="${e}">Observação clínica, entrevistas, análise de material escolar e atividades lúdicas.</p>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">3. SÍNTESE VIAL</h3>
            <p style="${e}">O(a) estudante encontra-se em processo de avaliação. Observam-se potencialidades a serem exploradas e áreas que requerem atenção. Sugere-se continuidade dos atendimentos para fechamento diagnóstico.</p>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">4. CONCLUSÃO E ENCAMINHAMENTOS</h3>
            <p style="${e}">Indica-se a manutenção do acompanhamento psicopedagógico e, se necessário, avaliação multidisciplinar.</p>
        `;break;case"Termo de Autorização de Uso de Imagem e Vídeo":const a=(c=o.guardians)==null?void 0:c[0],n=(a==null?void 0:a.name)||"____________________________________________________________",s=(a==null?void 0:a.cpf)||"____________________________",b=(a==null?void 0:a.rg)||"____________________________",v=(a==null?void 0:a.phone)||"_________________________________________________";let p="________________________________________________________________________________________";o.address&&o.address.street&&(p=`${o.address.street}, ${o.address.number||""}, ${o.address.district||""} - ${o.address.city}/${o.address.state}`);const A=o.birthDate?new Date(o.birthDate).toLocaleDateString("pt-BR"):"//____",y=new Date().getDate(),$=new Date().toLocaleDateString("pt-BR",{month:"long"}),O=new Date().getFullYear();return`
<div style="font-family: 'Times New Roman', serif; color: #000;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 2rem;">TERMO DE AUTORIZAÇÃO PARA USO DE IMAGEM E VOZ (MENOR DE IDADE)</h2>

  <p style="margin-bottom: 1rem;">Eu, <strong>${n}</strong>,<br>
  CPF: <strong>${s}</strong> RG: <strong>${b}</strong>,<br>
  endereço: <strong>${p}</strong>,<br>
  na qualidade de responsável legal pelo(a) menor <strong>${o.fullName}</strong>,<br>
  data de nascimento: <strong>${A}</strong>,</p>

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

  <p style="text-align: right; margin-bottom: 3rem;">Brotas de Macaúbas/BA, <strong>${y} de ${$} de ${O}</strong>.</p>

  <div style="text-align: center; margin-top: 4rem;">
    <div style="display: inline-block; text-align: left;">
      <div style="border-top: 1px solid #000; width: 300px; padding-top: 0.5rem; text-align: center; margin-bottom: 0.5rem;">Assinatura do(a) Responsável Legal</div>
      <div><strong>Nome:</strong> ${n==="____________________________________________________________"?"_____________________________________________________":n}</div>
      <div><strong>CPF:</strong> ${s==="____________________________"?"______________________________________________________":s}</div>
      <div><strong>Telefone:</strong> ${v}</div>
    </div>
  </div>
</div>
        `.trim();default:["Relatório Fonoaudiológico","Evolução Fonoaudiológica","Parecer Fonoaudiológico","Encaminhamento Fonoaudiológico","Relatório de Alta Fonoaudiológica"].includes(t)?_=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${t.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${e}">Aluno(a): <strong>${o.fullName}</strong>, em acompanhamento fonoaudiológico.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. ÁREAS AVALIADAS</h3>
            <p style="${e}">Linguagem oral e escrita, comunicação, motricidade orofacial, deglutição e voz.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO</h3>
            <p style="${e}">${i||"O(a) aluno(a) demonstra evolução gradual nas habilidades comunicativas e linguísticas trabalhadas nas sessões."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. ENCAMINHAMENTOS</h3>
            <p style="${e}">Indica-se continuidade do acompanhamento fonoaudiológico com foco nas áreas identificadas.</p>`:["Relatório de Terapia Ocupacional","Evolução em Terapia Ocupacional","Parecer de Terapia Ocupacional","Plano de Intervenção Ocupacional","Relatório de Alta em Terapia Ocupacional"].includes(t)?_=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${t.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${e}">Aluno(a): <strong>${o.fullName}</strong>, em acompanhamento de Terapia Ocupacional.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. ÁREAS DE INTERVENÇÃO</h3>
            <p style="${e}">Habilidades de vida diária (AVDs), integração sensorial, coordenação motora fina e grossa, desempenho escolar e funcionalidade.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO</h3>
            <p style="${e}">${i||"O(a) aluno(a) apresenta progresso nas atividades propostas, com melhora na autonomia e no desempenho funcional."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. OBJETIVOS TERAPÊUTICOS</h3>
            <p style="${e}">Ampliar independência nas atividades cotidianas, fortalecer habilidades motoras e promover maior participação escolar.</p>`:["Relatório Fisioterapêutico","Evolução Fisioterapêutica","Parecer Fisioterapêutico","Plano de Reabilitação","Relatório de Alta Fisioterapêutica"].includes(t)?_=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${t.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${e}">Aluno(a): <strong>${o.fullName}</strong>, em acompanhamento fisioterapêutico.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. AVALIAÇÃO MOTORA</h3>
            <p style="${e}">Avaliação do desenvolvimento neuropsicomotor, tônus muscular, padrões de movimento, equilíbrio e marcha.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO</h3>
            <p style="${e}">${i||"O(a) aluno(a) apresenta progressos no desenvolvimento motor, com ganhos observados nas habilidades funcionais trabalhadas."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. PLANO TERAPÊUTICO</h3>
            <p style="${e}">Manutenção das sessões com foco em funcionalidade, prevenção de complicações e promoção da autonomia motora.</p>`:["Relatório Nutricional","Evolução Nutricional","Plano Alimentar Institucional","Parecer Nutricional","Relatório de Acompanhamento Nutricional"].includes(t)?_=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${t.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${e}">Aluno(a): <strong>${o.fullName}</strong>, em acompanhamento nutricional.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. AVALIAÇÃO NUTRICIONAL</h3>
            <p style="${e}">Avaliação do estado nutricional, hábitos alimentares, aceitação alimentar e condições relacionadas à alimentação.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO</h3>
            <p style="${e}">${i||"O(a) aluno(a) demonstra adesão ao acompanhamento com evolução positiva nos hábitos alimentares observados."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. CONDUTAS E ORIENTAÇÕES</h3>
            <p style="${e}">Orientações nutricionais individualizadas fornecidas à família. Indica-se continuidade do acompanhamento nutricional.</p>`:["Relatório de Busca Ativa","Relatório Social de Visita Domiciliar","Ofício ao Conselho Tutelar","Plano de Acompanhamento Familiar"].includes(t)?_=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${t.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO DA FAMÍLIA</h3>
            <p style="${e}">Aluno(a): <strong>${o.fullName}</strong>. Acompanhamento do Serviço Social.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. SITUAÇÃO SOCIAL</h3>
            <p style="${e}">${i||"Família em acompanhamento pelo Serviço Social. Situação avaliada conforme visita técnica e entrevista social realizada."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. INTERVENÇÕES REALIZADAS</h3>
            <p style="${e}">Orientações sobre direitos, acesso a serviços da rede de proteção social e encaminhamentos pertinentes ao caso.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. ENCAMINHAMENTOS</h3>
            <p style="${e}">Indica-se continuidade do acompanhamento familiar e articulação com a rede de proteção social do município.</p>`:["Relatório Psicológico Técnico","Evolução Psicológica","Parecer Psicológico"].includes(t)?_=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${t.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${e}">Aluno(a): <strong>${o.fullName}</strong>, em acompanhamento psicológico.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. DEMANDA APRESENTADA</h3>
            <p style="${e}">${i||"Demanda psicológica identificada e trabalhada em sessões individuais conforme planejamento clínico."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO DO PROCESSO</h3>
            <p style="${e}">O(a) aluno(a) demonstra engajamento no processo psicológico com evolução observada nas áreas trabalhadas em sessão.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. CONSIDERAÇÕES TÉCNICAS</h3>
            <p style="${e}">Indica-se continuidade do acompanhamento psicológico. Este documento não substitui laudo diagnóstico e foi elaborado para fins institucionais.</p>`:["Plano de Intervenção","Relatório de Evolução"].includes(t)?_=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${t.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${e}">Aluno(a): <strong>${o.fullName}</strong>.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. OBJETIVOS</h3>
            <p style="${e}">Promover o desenvolvimento integral do(a) aluno(a) por meio de intervenções especializadas e individualizadas.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO / INTERVENÇÕES</h3>
            <p style="${e}">${i||"O(a) aluno(a) apresenta evolução positiva nas áreas trabalhadas, demonstrando engajamento e progresso gradual."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. PRÓXIMAS ETAPAS</h3>
            <p style="${e}">Continuidade das intervenções planejadas com reavaliação periódica dos objetivos propostos.</p>`:_=`<p style="${e}">Este documento refere-se ao atendimento do(a) estudante <strong>${o.fullName}</strong>.</p>
            ${i?`<p style="${e}">${i}</p>`:'<p style="'+e+'">O processo segue conforme planejamento técnico estabelecido.</p>'}
            <p style="${e}">Permanecemos à disposição para quaisquer dúvidas.</p>`}return`
<div style="${d}">
    <div style="text-align: center; margin-bottom: 3rem;">
        <h1 style="font-size: 1.5em; font-weight: bold; margin: 0; text-transform: uppercase;">${t}</h1>
        <div style="margin-top: 1rem; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 8px; background-color: #fcfcfc;">
            <p style="margin: 0; text-align: left;"><strong>ALUNO:</strong> ${o.fullName}</p>
            <p style="margin: 0; text-align: left;"><strong>IDADE:</strong> ${m} anos</p>
            <p style="margin: 0; text-align: left;"><strong>ESCOLA:</strong> ${o.school.schoolName||"Não informada"}</p>
        </div>
    </div>

    ${_}

    <div style="margin-top: 4rem; text-align: right;">
        <p>Brotas de Macaúbas/BA, <strong>${h}</strong>.</p>
    </div>

    <div style="${r}">
        <p style="margin: 0; font-weight: bold;">${u}</p>
        <p style="margin: 0; color: #64748b;">
            ${l==="Psicopedagogia"||l==="Psicopedagoga"?"Psicopedagoga<br/>CBO-2394/25":l}
        </p>
    </div>
</div>
    `.trim()}};export{N as G,S as T};
