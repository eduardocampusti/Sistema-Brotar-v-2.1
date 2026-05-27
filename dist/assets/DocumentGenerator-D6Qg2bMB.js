import{j as e}from"./vendor-utils-iivQEqQU.js";import{b as d,R as M,S as z,c as G,a7 as T,q as B,H as F,aB as q,m as U,W as V,ac as H,a$ as Y,b0 as Z,ar as Q,b1 as W,av as X}from"./vendor-ui-ENBO6bTL.js";import{b as J,a as A}from"./index-BLzspYM4.js";import{G as K}from"./vendor-ai-BER3QIUg.js";import"./vendor-pdf-BPiFEYTN.js";import"./vendor-supabase-CbM-anGD.js";const ee=new K({apiKey:"AIzaSyCyp09yV8UF1pYLx3ztn1B4LFakUEMmXIU"}),te=`
Você é o REDATOR OFICIAL do SISTEMA BROTAR.
Sua tarefa é gerar documentos profissionais (Relatórios, Ofícios, Declarações).
REGRAS:
1. Use linguagem técnica, formal e institucional.
2. NUNCA invente dados médicos ou diagnósticos não fornecidos.
3. Se faltar informação, use [DADO NÃO INFORMADO].
4. Formate como um texto de documento oficial, pronto para impressão em papel timbrado.
`,ae=r=>new Promise(a=>setTimeout(a,r)),oe={generateOfficialDocument:async(r,a,x,g,c)=>{var f,u,b;let D="";const n=a.clinical,y=((f=n==null?void 0:n.pp_data)==null?void 0:f.ipoHistory)||[];if(y.length>0){const t=y[0];D=`
      DADOS QUANTITATIVOS RECENTES (CALCULADORA IPO - PORTAGE):
      Data da Avaliação: ${new Date(t.date).toLocaleDateString("pt-BR")}
      Idade de Desenvolvimento Geral: ${t.results.general} anos.
      
      Resultados Detalhados por Área:
      - Socialização: ${t.results.socializacao} anos
      - Linguagem: ${t.results.linguagem} anos
      - Cognição: ${t.results.cognicao} anos
      - Autocuidados: ${t.results.autocuidados} anos
      - Desenvolvimento Motor: ${t.results.motor} anos
      `}const h=`
      SISTEMA BROTAR - GERADOR DE DOCUMENTO OFICIAL
      
      TIPO DE DOCUMENTO: ${r}
      ALUNO: ${a.fullName}, Idade: ${new Date().getFullYear()-new Date(a.birthDate).getFullYear()} anos.
      ESCOLA: ${a.school.schoolName}.
      EMISSOR: ${x} (${g}).
      
      ${D}
      
      CONTEXTO ADICIONAL / OBSERVAÇÕES CLÍNICAS: ${c}
      
      Gere o texto completo do documento. Inclua cabeçalho institucional fictício (mas formal), título centralizado, corpo do texto bem estruturado e espaço para assinatura ao final.
      O texto deve ser em Português do Brasil, profissional, acolhedor e DEVE OBRIGATORIAMENTE CITAR os dados do IPO se estiverem disponíveis acima, contextualizando-os no desenvolvimento do aluno.
    `,i=3;let m=0;for(;m<i;)try{const t=await ee.models.generateContent({model:"gemini-2.0-flash",contents:h,config:{systemInstruction:te,temperature:.7}});if(!t.text)throw new Error("Resposta da IA veio vazia.");return t.text}catch(t){if(m++,(((u=t.message)==null?void 0:u.includes("Quota exceeded"))||((b=t.message)==null?void 0:b.includes("429"))||t.toString().includes("Quota exceeded"))&&m<i){const _=2e3*Math.pow(2,m);console.warn(`Cota excedida. Tentativa ${m} de ${i}. Aguardando ${_}ms...`),await ae(_);continue}throw console.error("Erro no GeminiService:",t),new Error(t.message||"Erro desconhecido na geração via Gemini.")}throw new Error("Não foi possível conectar à IA após várias tentativas. Por favor, tente novamente mais tarde.")}},se={getFallbackDocument:(r,a,x,g,c)=>{var u,b;const D=new Date().toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"}),n=new Date().getFullYear()-new Date(a.birthDate).getFullYear(),y="font-family: 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6;",h="text-align: center; font-weight: bold; margin-bottom: 2rem; text-transform: uppercase;",i="margin-bottom: 1.5rem; text-align: justify;",m="margin-top: 4rem; text-align: center; border-top: 1px solid #1a1a1a; padding-top: 0.5rem; width: 60%; margin-left: auto; margin-right: auto;";if(r==="Termo de Autorização de Uso de Imagem e Vídeo"){const t=(u=a.guardians)==null?void 0:u[0],p=(t==null?void 0:t.name)||"____________________________________________________________",_=(t==null?void 0:t.cpf)||"____________________________",j=(t==null?void 0:t.rg)||"____________________________",$=(t==null?void 0:t.phone)||"_________________________________________________";let v="________________________________________________________________________________________";a.address&&a.address.street&&(v=`${a.address.street}, ${a.address.number||""}, ${a.address.district||""} - ${a.address.city}/${a.address.state}`);const E=a.birthDate?new Date(a.birthDate).toLocaleDateString("pt-BR"):"//____",l=new Date().getDate(),I=new Date().toLocaleDateString("pt-BR",{month:"long"}),O=new Date().getFullYear();return`
<div style="${y}">
  <h2 style="${h}">TERMO DE AUTORIZAÇÃO PARA USO DE IMAGEM E VOZ (MENOR DE IDADE)</h2>
  <p style="margin-bottom: 1rem;">Eu, <strong>${p}</strong>,<br>
  CPF: <strong>${_}</strong> RG: <strong>${j}</strong>,<br>
  endereço: <strong>${v}</strong>,<br>
  na qualidade de responsável legal pelo(a) menor <strong>${a.fullName}</strong>,<br>
  data de nascimento: <strong>${E}</strong>,</p>

  <p style="${i}"><strong>AUTORIZO</strong>, de forma livre, informada e inequívoca, o <strong>BROTAR – Centro Multidisciplinar em Educação Inclusiva</strong>, a captar e utilizar a imagem e/ou voz do(a) menor, por meio de fotografias e filmagens, realizadas durante atendimentos, atividades e ações institucionais.</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Finalidade</h3>
  <p style="${i}">A presente autorização destina-se exclusivamente à divulgação institucional e educativa, sem fins comerciais, respeitando a dignidade, privacidade e os direitos do(a) menor, conforme ECA e LGPD (Lei nº 13.709/2018).</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Meios de divulgação</h3>
  <p style="margin-bottom: 1rem;">As imagens/voz poderão ser divulgadas em:</p>
  <ul style="list-style-type: disc; margin-left: 2rem; margin-bottom: 1.5rem;">
    <li>redes sociais institucionais (ex.: Instagram, Facebook e WhatsApp);</li>
    <li>site e materiais informativos do Centro (digitais ou impressos).</li>
  </ul>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Prazo</h3>
  <p style="margin-bottom: 1.5rem;">Autorização válida por <strong>24 (vinte e quatro) meses</strong>, a partir da assinatura.</p>

  <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">Revogação</h3>
  <p style="${i}">O responsável poderá revogar esta autorização a qualquer momento, mediante solicitação por escrito. A revogação não invalida usos já realizados anteriormente, mas impedirá novas divulgações e, quando possível, o material será removido dos canais institucionais.</p>

  <p style="margin-bottom: 2rem;">Declaro que li e compreendi este termo.</p>

  <p style="text-align: right; margin-bottom: 3rem;">Brotas de Macaúbas/BA, <strong>${l} de ${I} de ${O}</strong>.</p>

  <div style="text-align: center; margin-top: 4rem;">
    <div style="display: inline-block; text-align: left;">
      <div style="border-top: 1px solid #000; width: 300px; padding-top: 0.5rem; text-align: center; margin-bottom: 0.5rem;">Assinatura do(a) Responsável Legal</div>
      <div><strong>Nome:</strong> ${p==="____________________________________________________________"?"_____________________________________________________":p}</div>
      <div><strong>CPF:</strong> ${_==="____________________________"?"______________________________________________________":_}</div>
      <div><strong>Telefone:</strong> ${$}</div>
    </div>
  </div>
</div>`.trim()}let f="";switch(r){case"Declaração de Atendimento":f=`
            <p style="${i}">Declaro para os devidos fins que o(a) estudante <strong>${a.fullName}</strong> encontra-se em acompanhamento <strong>${g.toLowerCase()}</strong> sob minha responsabilidade, participando das atividades propostas para seu desenvolvimento integral.</p>
            <p style="${i}">As sessões ocorrem periodicamente e o(a) aluno(a) tem demonstrado assiduidade.</p>
            ${c?`<div style="margin-top: 2rem; border-top: 1px dashed #ccc; padding-top: 1rem;"><h4 style="font-weight: bold; margin-bottom: 0.5rem;">OBSERVAÇÕES ADICIONAIS:</h4><p style="${i}">${c}</p></div>`:""}
        `;break;case"Encaminhamento Geral":f=`
            <p style="${i}">Solicito avaliação e conduta para o(a) estudante acima identificado(a), nascido em <strong>${new Date(a.birthDate).toLocaleDateString("pt-BR")}</strong>.</p>
            
            <h3 style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1em;">MOTIVO DO ENCAMINHAMENTO</h3>
            <p style="${i}">O(a) aluno(a) apresenta demandas que necessitam de olhar especializado para melhor compreensão e intervenção.</p>
            
            <div style="background-color: #f8fafc; padding: 1rem; border-left: 4px solid #cbd5e1; margin-bottom: 1.5rem;">
                ${c?c.replace(/\n/g,"<br/>"):"Observa-se necessidade de suporte específico para otimizar seu processo de aprendizagem e desenvolvimento."}
            </div>

            <p style="${i}">Coloco-me à disposição para maiores esclarecimentos e discussões sobre o caso.</p>
        `;break;case"Avaliação Psicopedagógica":f=`
            <h2 style="text-align: center; font-size: 1.2em; font-weight: bold; margin-bottom: 2rem;">RELATÓRIO DE AVALIAÇÃO PRELIMINAR</h2>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">1. QUEIXA INICIAL</h3>
            <p style="${i}">${c||"Dificuldades no processo de aprendizagem reportadas pela escola/família."}</p>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">2. INSTRUMENTOS UTILIZADOS</h3>
            <p style="${i}">Observação clínica, entrevistas, análise de material escolar e atividades lúdicas.</p>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">3. SÍNTESE VIAL</h3>
            <p style="${i}">O(a) estudante encontra-se em processo de avaliação. Observam-se potencialidades a serem exploradas e áreas que requerem atenção. Sugere-se continuidade dos atendimentos para fechamento diagnóstico.</p>

            <h3 style="font-weight: bold; margin-bottom: 0.5rem;">4. CONCLUSÃO E ENCAMINHAMENTOS</h3>
            <p style="${i}">Indica-se a manutenção do acompanhamento psicopedagógico e, se necessário, avaliação multidisciplinar.</p>
        `;break;case"Termo de Autorização de Uso de Imagem e Vídeo":const t=(b=a.guardians)==null?void 0:b[0],p=(t==null?void 0:t.name)||"____________________________________________________________",_=(t==null?void 0:t.cpf)||"____________________________",j=(t==null?void 0:t.rg)||"____________________________",$=(t==null?void 0:t.phone)||"_________________________________________________";let v="________________________________________________________________________________________";a.address&&a.address.street&&(v=`${a.address.street}, ${a.address.number||""}, ${a.address.district||""} - ${a.address.city}/${a.address.state}`);const E=a.birthDate?new Date(a.birthDate).toLocaleDateString("pt-BR"):"//____",l=new Date().getDate(),I=new Date().toLocaleDateString("pt-BR",{month:"long"}),O=new Date().getFullYear();return`
<div style="font-family: 'Times New Roman', serif; color: #000;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 2rem;">TERMO DE AUTORIZAÇÃO PARA USO DE IMAGEM E VOZ (MENOR DE IDADE)</h2>

  <p style="margin-bottom: 1rem;">Eu, <strong>${p}</strong>,<br>
  CPF: <strong>${_}</strong> RG: <strong>${j}</strong>,<br>
  endereço: <strong>${v}</strong>,<br>
  na qualidade de responsável legal pelo(a) menor <strong>${a.fullName}</strong>,<br>
  data de nascimento: <strong>${E}</strong>,</p>

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

  <p style="text-align: right; margin-bottom: 3rem;">Brotas de Macaúbas/BA, <strong>${l} de ${I} de ${O}</strong>.</p>

  <div style="text-align: center; margin-top: 4rem;">
    <div style="display: inline-block; text-align: left;">
      <div style="border-top: 1px solid #000; width: 300px; padding-top: 0.5rem; text-align: center; margin-bottom: 0.5rem;">Assinatura do(a) Responsável Legal</div>
      <div><strong>Nome:</strong> ${p==="____________________________________________________________"?"_____________________________________________________":p}</div>
      <div><strong>CPF:</strong> ${_==="____________________________"?"______________________________________________________":_}</div>
      <div><strong>Telefone:</strong> ${$}</div>
    </div>
  </div>
</div>
        `.trim();default:`${a.fullName}${g.toLowerCase()}`,c&&`${c}`}return`
<div style="${y}">
    <div style="text-align: center; margin-bottom: 3rem;">
        <h1 style="font-size: 1.5em; font-weight: bold; margin: 0; text-transform: uppercase;">${r}</h1>
        <div style="margin-top: 1rem; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 8px; background-color: #fcfcfc;">
            <p style="margin: 0; text-align: left;"><strong>ALUNO:</strong> ${a.fullName}</p>
            <p style="margin: 0; text-align: left;"><strong>IDADE:</strong> ${n} anos</p>
            <p style="margin: 0; text-align: left;"><strong>ESCOLA:</strong> ${a.school.schoolName||"Não informada"}</p>
        </div>
    </div>

    ${f}

    <div style="margin-top: 4rem; text-align: right;">
        <p>Brotas de Macaúbas/BA, <strong>${D}</strong>.</p>
    </div>

    <div style="${m}">
        <p style="margin: 0; font-weight: bold;">${x}</p>
        <p style="margin: 0; color: #64748b;">
            ${g==="Psicopedagogia"||g==="Psicopedagoga"?"Psicopedagoga<br/>CBO-2394/25":g}
        </p>
    </div>
</div>
    `.trim()}},ie=["Declaração de Atendimento","Encaminhamento Geral","Relatório Resumido","Termo de Autorização de Uso de Imagem e Vídeo","Declaração Simples"],re=["Relatório Psicológico Técnico","Evolução Psicológica","Parecer Psicológico"],ne=["Relatório de Busca Ativa","Relatório Social de Visita Domiciliar","Ofício ao Conselho Tutelar","Plano de Acompanhamento Familiar"],_e=["Avaliação Psicopedagógica","Plano de Intervenção","Relatório de Evolução"],ue=({currentUser:r})=>{const{addToast:a}=J(),[x,g]=d.useState("generator"),[c,D]=d.useState([]),[n,y]=d.useState(""),[h,i]=d.useState(""),[m,f]=d.useState(""),[u,b]=d.useState(""),[t,p]=d.useState(""),[_,j]=d.useState(!1),[$,v]=d.useState([]);d.useEffect(()=>{(async()=>{const s=await A.getStudents();D(s)})()},[]);const[E,l]=d.useState(null),I=async()=>{if(!n||!h){l("Por favor, selecione um aluno e o tipo de documento desejado.");return}const s=(await A.getStudents()).find(N=>N.id===n);if(!s){l("Erro ao atualizar dados do aluno. Tente novamente.");return}const w=s;j(!0),l(null);const C=`BRT-${new Date().getFullYear()}-${Math.floor(Math.random()*9e4)+1e4}`;let S,R=!1;try{S=await oe.generateOfficialDocument(h,s,r.name,r.jobTitle||r.role,m)}catch(N){console.warn("IA indisponível, ativando fallback de templates:",N);const P=r.specialty||r.jobTitle||r.role;S=se.getFallbackDocument(h,w,r.name,P,m),R=!0}b(S),p(C);const k={id:crypto.randomUUID(),studentId:w.id,studentName:w.fullName,docType:h,code:C,content:S,createdAt:new Date().toISOString(),professionalName:r.name};try{if(await A.saveDocument(k),l(null),R&&a("Documento gerado com sucesso usando modelos institucionais (IA instável).","info"),x==="history"){const N=await A.getDocuments(n);v(N)}}catch(N){console.error("Erro ao salvar documento gerado:",N),l("O texto foi gerado, mas não foi possível salvar no histórico. Verifique conexão, permissões ou tente novamente."),a("Falha ao salvar o documento no servidor.","error")}finally{j(!1)}},O=async()=>{const o=window.open("","_blank","width=900,height=800");if(!o)return;const s=await A.getPapelTimbradoConfig();console.log("DEBUG: Config usada na impressão:",s);const w=`
      <html>
        <head>
          <title>Impressão - ${t}</title>
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
            ${s.logoUrl?`<img src="${s.logoUrl}" />`:""}
            <div>
                <h1>${s.tituloLinha1}</h1>
                <h2>${s.tituloLinha2}</h2>
                ${s.tituloLinha3?`<p>${s.tituloLinha3}</p>`:""}
            </div>
            <p>${s.endereco} | CNPJ: ${s.cnpj}</p>
          </div>

          <div class="content">
            ${u}
          </div>
          
          <div class="qr-auth">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=VERIFICAR_AUTENTICIDADE:${t}" />
            <br>Autenticidade: ${t}
          </div>
        </body>
      </html>
    `;o.document.write(w),o.document.close(),o.onload=()=>{o.focus(),o.print()}};d.useEffect(()=>{n&&(async()=>{const s=await A.getDocuments(n);v(s)})()},[n,x]);const L=M.useMemo(()=>{const o=[...ie,...re,...ne,..._e];return Array.from(new Set(o)).sort()},[]);return e.jsxs("div",{className:"max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12 relative",children:[_&&e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300",children:e.jsxs("div",{className:"bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 transform animate-scaleIn",children:[e.jsxs("div",{className:"relative mb-6",children:[e.jsx("div",{className:"w-20 h-20 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"}),e.jsx(z,{className:"absolute inset-0 m-auto text-primary-600 animate-pulse",size:32})]}),e.jsx("h3",{className:"text-xl font-bold text-slate-800 mb-2 text-center",children:"IA Processando..."}),e.jsx("p",{className:"text-slate-500 text-center text-sm leading-relaxed",children:"Estamos estruturando seu documento com base nos dados do aluno e diretrizes técnicas. Aguarde um instante."})]})}),E&&e.jsx("div",{className:"fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4",children:e.jsxs("div",{className:"bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-shake",children:[e.jsxs("div",{className:"flex items-center gap-3 text-red-600 mb-4",children:[e.jsx("div",{className:"p-2 bg-red-100 rounded-lg",children:e.jsx(G,{size:24})}),e.jsx("h3",{className:"text-lg font-bold",children:"Falha na Geração"})]}),e.jsx("p",{className:"text-slate-600 mb-6 text-sm",children:E}),e.jsx("button",{onClick:()=>l(null),className:"w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors",children:"Entendido"})]})}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-8",children:[e.jsx("div",{className:"lg:col-span-1 space-y-6",children:e.jsxs("div",{className:"bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden sticky top-6",children:[e.jsxs("div",{className:"flex border-b bg-slate-50/50",children:[e.jsx("button",{onClick:()=>g("generator"),className:`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${x==="generator"?"text-primary-600 border-b-2 border-primary-600 bg-white":"text-slate-400 hover:text-slate-600"}`,children:"Gerador Inteli"}),e.jsx("button",{onClick:()=>g("history"),className:`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${x==="history"?"text-primary-600 border-b-2 border-primary-600 bg-white":"text-slate-400 hover:text-slate-600"}`,children:"Histórico"})]}),x==="generator"?e.jsxs("div",{className:"p-6 space-y-5",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2",children:"Selecione o Aluno"}),e.jsxs("div",{className:"relative",children:[e.jsx(T,{className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400",size:18}),e.jsxs("select",{className:"w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-slate-50/30 text-slate-700 font-medium appearance-none",value:n,onChange:o=>y(o.target.value),children:[e.jsx("option",{value:"",children:"Buscar aluno..."}),c.map(o=>e.jsx("option",{value:o.id,children:o.fullName},o.id))]})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2",children:"Modelo de Documento"}),e.jsxs("div",{className:"relative",children:[e.jsx(B,{className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400",size:18}),e.jsxs("select",{className:"w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-slate-50/30 text-slate-700 font-medium appearance-none",value:h,onChange:o=>i(o.target.value),children:[e.jsx("option",{value:"",children:"Selecione o modelo..."}),L.map(o=>e.jsx("option",{value:o,children:o},o))]})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2",children:"Diretrizes da IA (Opcional)"}),e.jsx("textarea",{className:"w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white text-sm placeholder:text-slate-300 resize-none min-h-[120px]",placeholder:"Ex: Enfatizar dificuldades na alfabetização e sugerir encaminhamento para fonoaudiologia...",value:m,onChange:o=>f(o.target.value)})]}),e.jsxs("button",{onClick:I,disabled:_,className:"w-full py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-primary-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95",children:[_?e.jsx(F,{className:"animate-spin"}):e.jsx(z,{size:18}),"Gerar Documento com IA"]})]}):e.jsx("div",{className:"p-2 space-y-2 h-[500px] overflow-y-auto bg-slate-50/50",children:n?$.length===0?e.jsxs("div",{className:"h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center",children:[e.jsx(q,{size:32,className:"mb-2 opacity-20"}),e.jsx("p",{className:"text-xs",children:"Nenhum documento salvo para este aluno."})]}):$.map(o=>e.jsxs("div",{className:"p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-primary-200 transition-all group",children:[e.jsxs("div",{className:"flex justify-between items-start mb-2",children:[e.jsx("span",{className:"text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full",children:o.docType}),e.jsx("span",{className:"text-[10px] text-slate-400 font-mono",children:o.code})]}),e.jsxs("p",{className:"text-[10px] text-slate-500 flex items-center gap-1 mb-3",children:[e.jsx(U,{size:10})," ",new Date(o.createdAt).toLocaleDateString("pt-BR")]}),e.jsxs("div",{className:"flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity",children:[e.jsx("button",{onClick:()=>{b(o.content),p(o.code)},className:"p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors",title:"Visualizar",children:e.jsx(V,{size:16})}),e.jsx("button",{onClick:async()=>{if(confirm("Excluir este documento permanentemente?"))try{await A.deleteDocument(o.id),v(s=>s.filter(w=>w.id!==o.id))}catch(s){console.error(s),a("Não foi possível excluir o documento.","error")}},className:"p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors",title:"Excluir",children:e.jsx(H,{size:16})})]})]},o.id)):e.jsxs("div",{className:"h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center",children:[e.jsx(T,{size:32,className:"mb-2 opacity-20"}),e.jsx("p",{className:"text-xs",children:"Selecione um aluno para ver o histórico."})]})})]})}),e.jsx("div",{className:"lg:col-span-2",children:u?e.jsxs("div",{className:"space-y-4 animate-scaleIn",children:[e.jsxs("div",{className:"flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm",children:[e.jsxs("div",{className:"flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200",children:[e.jsx(Y,{size:14,className:"text-slate-400"}),e.jsx("span",{className:"text-xs font-mono font-bold text-slate-600",children:t})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("button",{onClick:()=>{navigator.clipboard.writeText(u),l("Texto copiado para a área de transferência!"),setTimeout(()=>l(null),2e3)},className:"flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg font-bold hover:bg-slate-50 transition-colors text-sm",children:[e.jsx(Z,{size:16})," Copiar"]}),e.jsxs("button",{onClick:O,className:"flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all shadow-lg text-sm",children:[e.jsx(Q,{size:16})," Imprimir PDF"]})]})]}),e.jsxs("div",{className:"bg-white shadow-2xl w-full min-h-[1000px] border border-slate-200 rounded-t-xl relative group",children:[e.jsx("div",{className:"w-full h-full min-h-[1000px] outline-none font-serif text-[12pt] leading-relaxed text-justify p-12 md:p-20 bg-white",contentEditable:!0,suppressContentEditableWarning:!0,dangerouslySetInnerHTML:{__html:u},onInput:o=>b(o.currentTarget.innerHTML),style:{backgroundImage:"linear-gradient(#f1f5f9 1px, transparent 1px)",backgroundSize:"100% 1.6em",lineHeight:"1.6em"}}),e.jsxs("div",{className:"absolute top-4 right-4 text-[10px] font-bold text-primary-400 opacity-40 uppercase tracking-widest flex items-center gap-1 pointer-events-none",children:[e.jsx(W,{size:10})," Editor Rico Habilitado"]})]})]}):e.jsxs("div",{className:"h-full min-h-[600px] border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 bg-slate-50/30",children:[e.jsx("div",{className:"w-24 h-24 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-6",children:e.jsx(X,{size:40,className:"opacity-20 translate-y-1"})}),e.jsx("h4",{className:"text-xl font-bold text-slate-400 mb-2",children:"Central de Documentos IA"}),e.jsx("p",{className:"max-w-xs text-center text-sm text-slate-400/60 leading-relaxed",children:"Selecione um aluno e um modelo clínico no menu lateral para iniciar a geração inteligente."})]})})]})]})};export{ue as DocumentGenerator};
