import{j as e}from"./vendor-utils-q1Rf0q3C.js";import{b as c,R as H,S as T,c as Z,a9 as z,t as Y,N as W,aC as Q,o as J,Z as X,ae as K,b0 as ee,b1 as te,at as oe,b2 as ae,aw as ie}from"./vendor-ui-DWGKM8jj.js";import{b as se,a as A}from"./index-CXMof-P6.js";import{G as ne}from"./vendor-ai-BER3QIUg.js";import"./vendor-pdf-BZCvapMr.js";import"./vendor-supabase-CbM-anGD.js";const re=new ne({apiKey:"AIzaSyBbDAz-DnscuuBTWWJZbLBdnO4ocW3uV4M"}),le=`
Você é o REDATOR OFICIAL do SISTEMA BROTAR.
Sua tarefa é gerar documentos profissionais (Relatórios, Ofícios, Declarações).
REGRAS:
1. Use linguagem técnica, formal e institucional.
2. NUNCA invente dados médicos ou diagnósticos não fornecidos.
3. Se faltar informação, use [DADO NÃO INFORMADO].
4. Formate como um texto de documento oficial, pronto para impressão em papel timbrado.
`,de=s=>new Promise(a=>setTimeout(a,s)),_e={generateOfficialDocument:async(s,a,h,f,r)=>{var l,u,x;let N="";const d=a.clinical,O=((l=d==null?void 0:d.pp_data)==null?void 0:l.ipoHistory)||[];if(O.length>0){const o=O[0];N=`
      DADOS QUANTITATIVOS RECENTES (CALCULADORA IPO - PORTAGE):
      Data da Avaliação: ${new Date(o.date).toLocaleDateString("pt-BR")}
      Idade de Desenvolvimento Geral: ${o.results.general} anos.
      
      Resultados Detalhados por Área:
      - Socialização: ${o.results.socializacao} anos
      - Linguagem: ${o.results.linguagem} anos
      - Cognição: ${o.results.cognicao} anos
      - Autocuidados: ${o.results.autocuidados} anos
      - Desenvolvimento Motor: ${o.results.motor} anos
      `}const b=`
      SISTEMA BROTAR - GERADOR DE DOCUMENTO OFICIAL
      
      TIPO DE DOCUMENTO: ${s}
      ALUNO: ${a.fullName}, Idade: ${new Date().getFullYear()-new Date(a.birthDate).getFullYear()} anos.
      ESCOLA: ${a.school.schoolName}.
      EMISSOR: ${h} (${f}).
      
      ${N}
      
      CONTEXTO ADICIONAL / OBSERVAÇÕES CLÍNICAS: ${r}
      
      Gere o texto completo do documento. Inclua cabeçalho institucional fictício (mas formal), título centralizado, corpo do texto bem estruturado e espaço para assinatura ao final.
      O texto deve ser em Português do Brasil, profissional, acolhedor e DEVE OBRIGATORIAMENTE CITAR os dados do IPO se estiverem disponíveis acima, contextualizando-os no desenvolvimento do aluno.
    `,t=3;let p=0;for(;p<t;)try{const o=await re.models.generateContent({model:"gemini-2.0-flash",contents:b,config:{systemInstruction:le,temperature:.7}});if(!o.text)throw new Error("Resposta da IA veio vazia.");return o.text}catch(o){if(p++,(((u=o.message)==null?void 0:u.includes("Quota exceeded"))||((x=o.message)==null?void 0:x.includes("429"))||o.toString().includes("Quota exceeded"))&&p<t){const _=2e3*Math.pow(2,p);console.warn(`Cota excedida. Tentativa ${p} de ${t}. Aguardando ${_}ms...`),await de(_);continue}throw console.error("Erro no GeminiService:",o),new Error(o.message||"Erro desconhecido na geração via Gemini.")}throw new Error("Não foi possível conectar à IA após várias tentativas. Por favor, tente novamente mais tarde.")}},me={getFallbackDocument:(s,a,h,f,r)=>{var u,x;const N=new Date().toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"}),d=new Date().getFullYear()-new Date(a.birthDate).getFullYear(),O="font-family: 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6;",b="text-align: center; font-weight: bold; margin-bottom: 2rem; text-transform: uppercase;",t="margin-bottom: 1.5rem; text-align: justify;",p="margin-top: 4rem; text-align: center; border-top: 1px solid #1a1a1a; padding-top: 0.5rem; width: 60%; margin-left: auto; margin-right: auto;";if(s==="Termo de Autorização de Uso de Imagem e Vídeo"){const o=(u=a.guardians)==null?void 0:u[0],g=(o==null?void 0:o.name)||"____________________________________________________________",_=(o==null?void 0:o.cpf)||"____________________________",E=(o==null?void 0:o.rg)||"____________________________",$=(o==null?void 0:o.phone)||"_________________________________________________";let v="________________________________________________________________________________________";a.address&&a.address.street&&(v=`${a.address.street}, ${a.address.number||""}, ${a.address.district||""} - ${a.address.city}/${a.address.state}`);const D=a.birthDate?new Date(a.birthDate).toLocaleDateString("pt-BR"):"//____",m=new Date().getDate(),S=new Date().toLocaleDateString("pt-BR",{month:"long"}),R=new Date().getFullYear();return`
<div style="${O}">
  <h2 style="${b}">TERMO DE AUTORIZAÇÃO PARA USO DE IMAGEM E VOZ (MENOR DE IDADE)</h2>
  <p style="margin-bottom: 1rem;">Eu, <strong>${g}</strong>,<br>
  CPF: <strong>${_}</strong> RG: <strong>${E}</strong>,<br>
  endereço: <strong>${v}</strong>,<br>
  na qualidade de responsável legal pelo(a) menor <strong>${a.fullName}</strong>,<br>
  data de nascimento: <strong>${D}</strong>,</p>

  <p style="${t}"><strong>AUTORIZO</strong>, de forma livre, informada e inequívoca, o <strong>BROTAR – Centro Multidisciplinar em Educação Inclusiva</strong>, a captar e utilizar a imagem e/ou voz do(a) menor, por meio de fotografias e filmagens, realizadas durante atendimentos, atividades e ações institucionais.</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Finalidade</h3>
  <p style="${t}">A presente autorização destina-se exclusivamente à divulgação institucional e educativa, sem fins comerciais, respeitando a dignidade, privacidade e os direitos do(a) menor, conforme ECA e LGPD (Lei nº 13.709/2018).</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Meios de divulgação</h3>
  <p style="margin-bottom: 1rem;">As imagens/voz poderão ser divulgadas em:</p>
  <ul style="list-style-type: disc; margin-left: 2rem; margin-bottom: 1.5rem;">
    <li>redes sociais institucionais (ex.: Instagram, Facebook e WhatsApp);</li>
    <li>site e materiais informativos do Centro (digitais ou impressos).</li>
  </ul>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Prazo</h3>
  <p style="margin-bottom: 1.5rem;">Autorização válida por <strong>24 (vinte e quatro) meses</strong>, a partir da assinatura.</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Revogação</h3>
  <p style="${t}">O responsável poderá revogar esta autorização a qualquer momento, mediante solicitação por escrito. A revogação não invalida usos já realizados anteriormente, mas impedirá novas divulgações e, quando possível, o material será removido dos canais institucionais.</p>

  <p style="margin-bottom: 2rem;">Declaro que li e compreendi este termo.</p>

  <p style="text-align: right; margin-bottom: 3rem;">Brotas de Macaúbas/BA, <strong>${m} de ${S} de ${R}</strong>.</p>

  <div style="text-align: center; margin-top: 4rem;">
    <div style="display: inline-block; text-align: left;">
      <div style="border-top: 1px solid #000; width: 300px; padding-top: 0.5rem; text-align: center; margin-bottom: 0.5rem;">Assinatura do(a) Responsável Legal</div>
      <div><strong>Nome:</strong> ${g==="____________________________________________________________"?"_____________________________________________________":g}</div>
      <div><strong>CPF:</strong> ${_==="____________________________"?"______________________________________________________":_}</div>
      <div><strong>Telefone:</strong> ${$}</div>
    </div>
  </div>
</div>`.trim()}let l="";switch(s){case"Declaração de Atendimento":l=`
            <p style="${t}">Declaro para os devidos fins que o(a) estudante <strong>${a.fullName}</strong> encontra-se em acompanhamento <strong>${f.toLowerCase()}</strong> sob minha responsabilidade, participando das atividades propostas para seu desenvolvimento integral.</p>
            <p style="${t}">As sessões ocorrem periodicamente e o(a) aluno(a) tem demonstrado assiduidade.</p>
            ${r?`<div style="margin-top: 2rem; border-top: 1px dashed #ccc; padding-top: 1rem;"><h4 style="font-weight: bold; margin-bottom: 0.5rem;">OBSERVAÇÕES ADICIONAIS:</h4><p style="${t}">${r}</p></div>`:""}
        `;break;case"Encaminhamento Geral":l=`
            <p style="${t}">Solicito avaliação e conduta para o(a) estudante acima identificado(a), nascido em <strong>${new Date(a.birthDate).toLocaleDateString("pt-BR")}</strong>.</p>
            
            <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">MOTIVO DO ENCAMINHAMENTO</h3>
            <p style="${t}">O(a) aluno(a) apresenta demandas que necessitam de olhar especializado para melhor compreensão e intervenção.</p>
            
            <div style="background-color: #f8fafc; padding: 1rem; border-left: 4px solid #cbd5e1; margin-bottom: 1.5rem;">
                ${r?r.replace(/\n/g,"<br/>"):"Observa-se necessidade de suporte específico para otimizar seu processo de aprendizagem e desenvolvimento."}
            </div>

            <p style="${t}">Coloco-me à disposição para maiores esclarecimentos e discussões sobre o caso.</p>
        `;break;case"Avaliação Psicopedagógica":l=`
            <h2 style="text-align: center; font-size: 1.2em; font-weight: bold; margin-bottom: 2rem;">RELATÓRIO DE AVALIAÇÃO PRELIMINAR</h2>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">1. QUEIXA INICIAL</h3>
            <p style="${t}">${r||"Dificuldades no processo de aprendizagem reportadas pela escola/família."}</p>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">2. INSTRUMENTOS UTILIZADOS</h3>
            <p style="${t}">Observação clínica, entrevistas, análise de material escolar e atividades lúdicas.</p>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">3. SÍNTESE VIAL</h3>
            <p style="${t}">O(a) estudante encontra-se em processo de avaliação. Observam-se potencialidades a serem exploradas e áreas que requerem atenção. Sugere-se continuidade dos atendimentos para fechamento diagnóstico.</p>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">4. CONCLUSÃO E ENCAMINHAMENTOS</h3>
            <p style="${t}">Indica-se a manutenção do acompanhamento psicopedagógico e, se necessário, avaliação multidisciplinar.</p>
        `;break;case"Termo de Autorização de Uso de Imagem e Vídeo":const o=(x=a.guardians)==null?void 0:x[0],g=(o==null?void 0:o.name)||"____________________________________________________________",_=(o==null?void 0:o.cpf)||"____________________________",E=(o==null?void 0:o.rg)||"____________________________",$=(o==null?void 0:o.phone)||"_________________________________________________";let v="________________________________________________________________________________________";a.address&&a.address.street&&(v=`${a.address.street}, ${a.address.number||""}, ${a.address.district||""} - ${a.address.city}/${a.address.state}`);const D=a.birthDate?new Date(a.birthDate).toLocaleDateString("pt-BR"):"//____",m=new Date().getDate(),S=new Date().toLocaleDateString("pt-BR",{month:"long"}),R=new Date().getFullYear();return`
<div style="font-family: 'Times New Roman', serif; color: #000;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 2rem;">TERMO DE AUTORIZAÇÃO PARA USO DE IMAGEM E VOZ (MENOR DE IDADE)</h2>

  <p style="margin-bottom: 1rem;">Eu, <strong>${g}</strong>,<br>
  CPF: <strong>${_}</strong> RG: <strong>${E}</strong>,<br>
  endereço: <strong>${v}</strong>,<br>
  na qualidade de responsável legal pelo(a) menor <strong>${a.fullName}</strong>,<br>
  data de nascimento: <strong>${D}</strong>,</p>

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

  <p style="text-align: right; margin-bottom: 3rem;">Brotas de Macaúbas/BA, <strong>${m} de ${S} de ${R}</strong>.</p>

  <div style="text-align: center; margin-top: 4rem;">
    <div style="display: inline-block; text-align: left;">
      <div style="border-top: 1px solid #000; width: 300px; padding-top: 0.5rem; text-align: center; margin-bottom: 0.5rem;">Assinatura do(a) Responsável Legal</div>
      <div><strong>Nome:</strong> ${g==="____________________________________________________________"?"_____________________________________________________":g}</div>
      <div><strong>CPF:</strong> ${_==="____________________________"?"______________________________________________________":_}</div>
      <div><strong>Telefone:</strong> ${$}</div>
    </div>
  </div>
</div>
        `.trim();default:["Relatório Fonoaudiológico","Evolução Fonoaudiológica","Parecer Fonoaudiológico","Encaminhamento Fonoaudiológico","Relatório de Alta Fonoaudiológica"].includes(s)?l=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${s.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${t}">Aluno(a): <strong>${a.fullName}</strong>, em acompanhamento fonoaudiológico.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. ÁREAS AVALIADAS</h3>
            <p style="${t}">Linguagem oral e escrita, comunicação, motricidade orofacial, deglutição e voz.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO</h3>
            <p style="${t}">${r||"O(a) aluno(a) demonstra evolução gradual nas habilidades comunicativas e linguísticas trabalhadas nas sessões."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. ENCAMINHAMENTOS</h3>
            <p style="${t}">Indica-se continuidade do acompanhamento fonoaudiológico com foco nas áreas identificadas.</p>`:["Relatório de Terapia Ocupacional","Evolução em Terapia Ocupacional","Parecer de Terapia Ocupacional","Plano de Intervenção Ocupacional","Relatório de Alta em Terapia Ocupacional"].includes(s)?l=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${s.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${t}">Aluno(a): <strong>${a.fullName}</strong>, em acompanhamento de Terapia Ocupacional.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. ÁREAS DE INTERVENÇÃO</h3>
            <p style="${t}">Habilidades de vida diária (AVDs), integração sensorial, coordenação motora fina e grossa, desempenho escolar e funcionalidade.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO</h3>
            <p style="${t}">${r||"O(a) aluno(a) apresenta progresso nas atividades propostas, com melhora na autonomia e no desempenho funcional."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. OBJETIVOS TERAPÊUTICOS</h3>
            <p style="${t}">Ampliar independência nas atividades cotidianas, fortalecer habilidades motoras e promover maior participação escolar.</p>`:["Relatório Fisioterapêutico","Evolução Fisioterapêutica","Parecer Fisioterapêutico","Plano de Reabilitação","Relatório de Alta Fisioterapêutica"].includes(s)?l=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${s.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${t}">Aluno(a): <strong>${a.fullName}</strong>, em acompanhamento fisioterapêutico.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. AVALIAÇÃO MOTORA</h3>
            <p style="${t}">Avaliação do desenvolvimento neuropsicomotor, tônus muscular, padrões de movimento, equilíbrio e marcha.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO</h3>
            <p style="${t}">${r||"O(a) aluno(a) apresenta progressos no desenvolvimento motor, com ganhos observados nas habilidades funcionais trabalhadas."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. PLANO TERAPÊUTICO</h3>
            <p style="${t}">Manutenção das sessões com foco em funcionalidade, prevenção de complicações e promoção da autonomia motora.</p>`:["Relatório Nutricional","Evolução Nutricional","Plano Alimentar Institucional","Parecer Nutricional","Relatório de Acompanhamento Nutricional"].includes(s)?l=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${s.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${t}">Aluno(a): <strong>${a.fullName}</strong>, em acompanhamento nutricional.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. AVALIAÇÃO NUTRICIONAL</h3>
            <p style="${t}">Avaliação do estado nutricional, hábitos alimentares, aceitação alimentar e condições relacionadas à alimentação.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO</h3>
            <p style="${t}">${r||"O(a) aluno(a) demonstra adesão ao acompanhamento com evolução positiva nos hábitos alimentares observados."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. CONDUTAS E ORIENTAÇÕES</h3>
            <p style="${t}">Orientações nutricionais individualizadas fornecidas à família. Indica-se continuidade do acompanhamento nutricional.</p>`:["Relatório de Busca Ativa","Relatório Social de Visita Domiciliar","Ofício ao Conselho Tutelar","Plano de Acompanhamento Familiar"].includes(s)?l=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${s.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO DA FAMÍLIA</h3>
            <p style="${t}">Aluno(a): <strong>${a.fullName}</strong>. Acompanhamento do Serviço Social.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. SITUAÇÃO SOCIAL</h3>
            <p style="${t}">${r||"Família em acompanhamento pelo Serviço Social. Situação avaliada conforme visita técnica e entrevista social realizada."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. INTERVENÇÕES REALIZADAS</h3>
            <p style="${t}">Orientações sobre direitos, acesso a serviços da rede de proteção social e encaminhamentos pertinentes ao caso.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. ENCAMINHAMENTOS</h3>
            <p style="${t}">Indica-se continuidade do acompanhamento familiar e articulação com a rede de proteção social do município.</p>`:["Relatório Psicológico Técnico","Evolução Psicológica","Parecer Psicológico"].includes(s)?l=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${s.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${t}">Aluno(a): <strong>${a.fullName}</strong>, em acompanhamento psicológico.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. DEMANDA APRESENTADA</h3>
            <p style="${t}">${r||"Demanda psicológica identificada e trabalhada em sessões individuais conforme planejamento clínico."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO DO PROCESSO</h3>
            <p style="${t}">O(a) aluno(a) demonstra engajamento no processo psicológico com evolução observada nas áreas trabalhadas em sessão.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. CONSIDERAÇÕES TÉCNICAS</h3>
            <p style="${t}">Indica-se continuidade do acompanhamento psicológico. Este documento não substitui laudo diagnóstico e foi elaborado para fins institucionais.</p>`:["Plano de Intervenção","Relatório de Evolução"].includes(s)?l=`<h2 style="text-align:center;font-size:1.2em;font-weight:bold;margin-bottom:2rem;">${s.toUpperCase()}</h2>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">1. IDENTIFICAÇÃO</h3>
            <p style="${t}">Aluno(a): <strong>${a.fullName}</strong>.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">2. OBJETIVOS</h3>
            <p style="${t}">Promover o desenvolvimento integral do(a) aluno(a) por meio de intervenções especializadas e individualizadas.</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">3. EVOLUÇÃO / INTERVENÇÕES</h3>
            <p style="${t}">${r||"O(a) aluno(a) apresenta evolução positiva nas áreas trabalhadas, demonstrando engajamento e progresso gradual."}</p>
            <h3 style="font-weight:bold;margin-bottom:0.5rem;">4. PRÓXIMAS ETAPAS</h3>
            <p style="${t}">Continuidade das intervenções planejadas com reavaliação periódica dos objetivos propostos.</p>`:l=`<p style="${t}">Este documento refere-se ao atendimento do(a) estudante <strong>${a.fullName}</strong>.</p>
            ${r?`<p style="${t}">${r}</p>`:'<p style="'+t+'">O processo segue conforme planejamento técnico estabelecido.</p>'}
            <p style="${t}">Permanecemos à disposição para quaisquer dúvidas.</p>`}return`
<div style="${O}">
    <div style="text-align: center; margin-bottom: 3rem;">
        <h1 style="font-size: 1.5em; font-weight: bold; margin: 0; text-transform: uppercase;">${s}</h1>
        <div style="margin-top: 1rem; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 8px; background-color: #fcfcfc;">
            <p style="margin: 0; text-align: left;"><strong>ALUNO:</strong> ${a.fullName}</p>
            <p style="margin: 0; text-align: left;"><strong>IDADE:</strong> ${d} anos</p>
            <p style="margin: 0; text-align: left;"><strong>ESCOLA:</strong> ${a.school.schoolName||"Não informada"}</p>
        </div>
    </div>

    ${l}

    <div style="margin-top: 4rem; text-align: right;">
        <p>Brotas de Macaúbas/BA, <strong>${N}</strong>.</p>
    </div>

    <div style="${p}">
        <p style="margin: 0; font-weight: bold;">${h}</p>
        <p style="margin: 0; color: #64748b;">
            ${f==="Psicopedagogia"||f==="Psicopedagoga"?"Psicopedagoga<br/>CBO-2394/25":f}
        </p>
    </div>
</div>
    `.trim()}},ce=["Declaração de Atendimento","Encaminhamento Geral","Relatório Resumido","Termo de Autorização de Uso de Imagem e Vídeo","Declaração Simples"],P=["Relatório Psicológico Técnico","Evolução Psicológica","Parecer Psicológico"],L=["Relatório de Busca Ativa","Relatório Social de Visita Domiciliar","Ofício ao Conselho Tutelar","Plano de Acompanhamento Familiar"],F=["Avaliação Psicopedagógica","Plano de Intervenção","Relatório de Evolução"],M=["Relatório Fonoaudiológico","Evolução Fonoaudiológica","Parecer Fonoaudiológico","Encaminhamento Fonoaudiológico","Relatório de Alta Fonoaudiológica"],k=["Relatório de Terapia Ocupacional","Evolução em Terapia Ocupacional","Parecer de Terapia Ocupacional","Plano de Intervenção Ocupacional","Relatório de Alta em Terapia Ocupacional"],U=["Relatório Fisioterapêutico","Evolução Fisioterapêutica","Parecer Fisioterapêutico","Plano de Reabilitação","Relatório de Alta Fisioterapêutica"],B=["Relatório Nutricional","Evolução Nutricional","Plano Alimentar Institucional","Parecer Nutricional","Relatório de Acompanhamento Nutricional"],xe=({currentUser:s})=>{const{addToast:a}=se(),[h,f]=c.useState("generator"),[r,N]=c.useState([]),[d,O]=c.useState(""),[b,t]=c.useState(""),[p,l]=c.useState(""),[u,x]=c.useState(""),[o,g]=c.useState(""),[_,E]=c.useState(!1),[$,v]=c.useState([]);c.useEffect(()=>{(async()=>{if(s.role==="SPECIALIST"){const n=await A.getAppointments({professionalId:s.id}),y=new Set(n.map(w=>w.studentId)),C=await A.getStudents();N(C.filter(w=>y.has(w.id)))}else{const n=await A.getStudents();N(n)}})()},[s.id,s.role]);const[D,m]=c.useState(null),S=async()=>{if(!d||!b){m("Por favor, selecione um aluno e o tipo de documento desejado.");return}const n=(await A.getStudents()).find(I=>I.id===d);if(!n){m("Erro ao atualizar dados do aluno. Tente novamente.");return}const y=n;E(!0),m(null);const C=`BRT-${new Date().getFullYear()}-${Math.floor(Math.random()*9e4)+1e4}`;let w,j=!1;try{w=await _e.generateOfficialDocument(b,n,s.name,s.jobTitle||s.role,p)}catch(I){console.warn("IA indisponível, ativando fallback de templates:",I);const q=s.specialty||s.jobTitle||s.role;w=me.getFallbackDocument(b,y,s.name,q,p),j=!0}x(w),g(C);const G={id:crypto.randomUUID(),studentId:y.id,studentName:y.fullName,docType:b,code:C,content:w,createdAt:new Date().toISOString(),professionalName:s.name};try{if(await A.saveDocument(G),m(null),j&&a("Documento gerado com sucesso usando modelos institucionais (IA instável).","info"),h==="history"){const I=await A.getDocuments(d);v(I)}}catch(I){console.error("Erro ao salvar documento gerado:",I),m("O texto foi gerado, mas não foi possível salvar no histórico. Verifique conexão, permissões ou tente novamente."),a("Falha ao salvar o documento no servidor.","error")}finally{E(!1)}},R=async()=>{const i=window.open("","_blank","width=900,height=800");if(!i)return;const n=await A.getPapelTimbradoConfig();console.log("DEBUG: Config usada na impressão:",n);const y=`
      <html>
        <head>
          <title>Impressão - ${o}</title>
          <style>
            @page { 
              size: A4; 
              margin: 20mm 20mm 20mm 20mm; /* Margens A4 Padrão */
            }
            body { 
              font-family: "Times New Roman", serif; 
              font-size: 12pt; 
              line-height: 1.5;
              color: #000; /* Preto absoluto para impressão */
              -webkit-print-color-adjust: exact;
              margin: 0;
              padding: 0;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #000; 
              padding-bottom: 10px; 
              margin-bottom: 30px; 
            }
            .header img { max-height: 70px; margin-bottom: 5px; }
            .header h1 { font-size: 14pt; margin: 0; color: #000; text-transform: uppercase; font-weight: bold; }
            .header h2 { font-size: 12pt; margin: 2px 0; color: #000; font-weight: bold; }
            .header p { font-size: 10pt; color: #000; margin-top: 5px; }
            
            .content { 
              text-align: justify; 
              text-justify: inter-word;
            }
            
            /* Utilitários para o conteúdo rico do editor */
            .content h1, .content h2, .content h3 { color: #000; margin-top: 1.5em; margin-bottom: 0.5em; }
            .content p { margin-bottom: 1em; }
            .content strong { font-weight: bold; }
            .content ul { margin-left: 20px; margin-bottom: 1em; }
            .content li { margin-bottom: 0.5em; }

            .footer { 
              margin-top: 50px; 
              text-align: center; 
              page-break-inside: avoid;
            }
            
            .qr-auth { 
              text-align: right;
              margin-top: 40px; 
              font-size: 8pt;
              color: #000;
              page-break-inside: avoid;
            }
            .qr-auth img { width: 70px; height: 70px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${n.logoUrl?`<img src="${n.logoUrl}" />`:""}
            <div>
                <h1>${n.tituloLinha1}</h1>
                <h2>${n.tituloLinha2}</h2>
                ${n.tituloLinha3?`<p>${n.tituloLinha3}</p>`:""}
            </div>
            <p>${n.endereco} | CNPJ: ${n.cnpj}</p>
          </div>

          <div class="content">
            ${u}
          </div>
          
          <div class="qr-auth">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=VERIFICAR_AUTENTICIDADE:${o}" />
            <br>Autenticidade: ${o}
          </div>
        </body>
      </html>
    `;i.document.write(y),i.document.close(),i.onload=()=>{i.focus(),i.print()}};c.useEffect(()=>{d&&(async()=>{const n=await A.getDocuments(d);v(n)})()},[d,h]);const V=H.useMemo(()=>{const i=(s.specialty||"").toLowerCase(),n=[...ce];return i.includes("psicopedagogia")||i.includes("psicopedago")?[...n,...F]:i.includes("psicologia")?[...n,...P]:i.includes("social")?[...n,...L]:i.includes("fonoaudiologia")?[...n,...M]:i.includes("terapia ocupacional")?[...n,...k]:i.includes("fisioterapia")?[...n,...U]:i.includes("nutri")?[...n,...B]:Array.from(new Set([...n,...P,...L,...F,...M,...k,...U,...B])).sort()},[s.specialty]);return e.jsxs("div",{className:"max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12 relative",children:[_&&e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300",children:e.jsxs("div",{className:"bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 transform animate-scaleIn",children:[e.jsxs("div",{className:"relative mb-6",children:[e.jsx("div",{className:"w-20 h-20 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"}),e.jsx(T,{className:"absolute inset-0 m-auto text-primary-600 animate-pulse",size:32})]}),e.jsx("h3",{className:"text-xl font-bold text-slate-800 mb-2 text-center",children:"IA Processando..."}),e.jsx("p",{className:"text-slate-500 text-center text-sm leading-relaxed",children:"Estamos estruturando seu documento com base nos dados do aluno e diretrizes técnicas. Aguarde um instante."})]})}),D&&e.jsx("div",{className:"fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4",children:e.jsxs("div",{className:"bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-shake",children:[e.jsxs("div",{className:"flex items-center gap-3 text-red-600 mb-4",children:[e.jsx("div",{className:"p-2 bg-red-100 rounded-lg",children:e.jsx(Z,{size:24})}),e.jsx("h3",{className:"text-lg font-bold",children:"Falha na Geração"})]}),e.jsx("p",{className:"text-slate-600 mb-6 text-sm",children:D}),e.jsx("button",{onClick:()=>m(null),className:"w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors",children:"Entendido"})]})}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-8",children:[e.jsx("div",{className:"lg:col-span-1 space-y-6",children:e.jsxs("div",{className:"bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden sticky top-6",children:[e.jsxs("div",{className:"flex border-b bg-slate-50/50",children:[e.jsx("button",{onClick:()=>f("generator"),className:`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${h==="generator"?"text-primary-600 border-b-2 border-primary-600 bg-white":"text-slate-400 hover:text-slate-600"}`,children:"Gerador Inteli"}),e.jsx("button",{onClick:()=>f("history"),className:`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${h==="history"?"text-primary-600 border-b-2 border-primary-600 bg-white":"text-slate-400 hover:text-slate-600"}`,children:"Histórico"})]}),h==="generator"?e.jsxs("div",{className:"p-6 space-y-5",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2",children:"Selecione o Aluno"}),e.jsxs("div",{className:"relative",children:[e.jsx(z,{className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400",size:18}),e.jsxs("select",{className:"w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-slate-50/30 text-slate-700 font-medium appearance-none",value:d,onChange:i=>O(i.target.value),children:[e.jsx("option",{value:"",children:"Buscar aluno..."}),r.map(i=>e.jsx("option",{value:i.id,children:i.fullName},i.id))]})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2",children:"Modelo de Documento"}),e.jsxs("div",{className:"relative",children:[e.jsx(Y,{className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400",size:18}),e.jsxs("select",{className:"w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-slate-50/30 text-slate-700 font-medium appearance-none",value:b,onChange:i=>t(i.target.value),children:[e.jsx("option",{value:"",children:"Selecione o modelo..."}),V.map(i=>e.jsx("option",{value:i,children:i},i))]})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2",children:"Diretrizes da IA (Opcional)"}),e.jsx("textarea",{className:"w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white text-sm placeholder:text-slate-300 resize-none min-h-[120px]",placeholder:"Ex: Enfatizar dificuldades na alfabetização e sugerir encaminhamento para fonoaudiologia...",value:p,onChange:i=>l(i.target.value)})]}),e.jsxs("button",{onClick:S,disabled:_,className:"w-full py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-primary-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95",children:[_?e.jsx(W,{className:"animate-spin"}):e.jsx(T,{size:18}),"Gerar Documento com IA"]})]}):e.jsx("div",{className:"p-2 space-y-2 h-[500px] overflow-y-auto bg-slate-50/50",children:d?$.length===0?e.jsxs("div",{className:"h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center",children:[e.jsx(Q,{size:32,className:"mb-2 opacity-20"}),e.jsx("p",{className:"text-xs",children:"Nenhum documento salvo para este aluno."})]}):$.map(i=>e.jsxs("div",{className:"p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-primary-200 transition-all group",children:[e.jsxs("div",{className:"flex justify-between items-start mb-2",children:[e.jsx("span",{className:"text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full",children:i.docType}),e.jsx("span",{className:"text-[10px] text-slate-400 font-mono",children:i.code})]}),e.jsxs("p",{className:"text-[10px] text-slate-500 flex items-center gap-1 mb-3",children:[e.jsx(J,{size:10})," ",new Date(i.createdAt).toLocaleDateString("pt-BR")]}),e.jsxs("div",{className:"flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity",children:[e.jsx("button",{onClick:()=>{x(i.content),g(i.code)},className:"p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors",title:"Visualizar",children:e.jsx(X,{size:16})}),e.jsx("button",{onClick:async()=>{if(confirm("Excluir este documento permanentemente?"))try{await A.deleteDocument(i.id),v(n=>n.filter(y=>y.id!==i.id))}catch(n){console.error(n),a("Não foi possível excluir o documento.","error")}},className:"p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors",title:"Excluir",children:e.jsx(K,{size:16})})]})]},i.id)):e.jsxs("div",{className:"h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center",children:[e.jsx(z,{size:32,className:"mb-2 opacity-20"}),e.jsx("p",{className:"text-xs",children:"Selecione um aluno para ver o histórico."})]})})]})}),e.jsx("div",{className:"lg:col-span-2",children:u?e.jsxs("div",{className:"space-y-4 animate-scaleIn",children:[e.jsxs("div",{className:"flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm",children:[e.jsxs("div",{className:"flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200",children:[e.jsx(ee,{size:14,className:"text-slate-400"}),e.jsx("span",{className:"text-xs font-mono font-bold text-slate-600",children:o})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("button",{onClick:()=>{navigator.clipboard.writeText(u),m("Texto copiado para a área de transferência!"),setTimeout(()=>m(null),2e3)},className:"flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg font-bold hover:bg-slate-50 transition-colors text-sm",children:[e.jsx(te,{size:16})," Copiar"]}),e.jsxs("button",{onClick:R,className:"flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all shadow-lg text-sm",children:[e.jsx(oe,{size:16})," Imprimir PDF"]})]})]}),e.jsxs("div",{className:"bg-white shadow-2xl w-full min-h-[1000px] border border-slate-200 rounded-t-xl relative group",children:[e.jsx("div",{className:"w-full h-full min-h-[1000px] outline-none font-serif text-[12pt] leading-relaxed text-justify p-12 md:p-20 bg-white",contentEditable:!0,suppressContentEditableWarning:!0,dangerouslySetInnerHTML:{__html:u},onInput:i=>x(i.currentTarget.innerHTML),style:{backgroundImage:"linear-gradient(#f1f5f9 1px, transparent 1px)",backgroundSize:"100% 1.6em",lineHeight:"1.6em"}}),e.jsxs("div",{className:"absolute top-4 right-4 text-[10px] font-bold text-primary-400 opacity-40 uppercase tracking-widest flex items-center gap-1 pointer-events-none",children:[e.jsx(ae,{size:10})," Editor Rico Habilitado"]})]})]}):e.jsxs("div",{className:"h-full min-h-[600px] border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 bg-slate-50/30",children:[e.jsx("div",{className:"w-24 h-24 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-6",children:e.jsx(ie,{size:40,className:"opacity-20 translate-y-1"})}),e.jsx("h4",{className:"text-xl font-bold text-slate-400 mb-2",children:"Central de Documentos IA"}),e.jsx("p",{className:"max-w-xs text-center text-sm text-slate-400/60 leading-relaxed",children:"Selecione um aluno e um modelo clínico no menu lateral para iniciar a geração inteligente."})]})})]})]})};export{xe as DocumentGenerator};
