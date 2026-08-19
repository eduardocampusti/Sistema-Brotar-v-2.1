import{j as e}from"./vendor-utils-Bxn0JB1s.js";import{b as c,at as ce,v as pe,W as $,ak as K,aK as X,ac as ee,V as te,q as me,ae as xe,I as ue,aE as be,f as ae}from"./vendor-ui-DuMRwyrh.js";import{u as ge,f as he,a as I,n as _}from"./index-WxVtjZi0.js";import"./vendor-pdf-BYCk4RPG.js";import"./vendor-supabase-CbM-anGD.js";const P={"Linguagem e Comunicação":["Dificuldade na fala/articulação","Vocabulário limitado para a idade","Dificuldade na compreensão de comandos","Dificuldade na expressão oral","Não se comunica verbalmente"],"Leitura e Escrita":["Não reconhece letras","Não associa letra/som","Dificuldade na leitura de palavras/frases","Dificuldade na interpretação de textos","Dificuldade na produção escrita","Troca/omissão de letras"],"Raciocínio Lógico-Matemático":["Dificuldade no reconhecimento de números","Dificuldade nas operações básicas","Dificuldade na resolução de problemas","Dificuldade na noção de quantidade"],"Comportamento e Socialização":["Agitação/hiperatividade","Dificuldade em seguir regras","Agressividade","Isolamento social","Choro frequente","Dificuldade em manter atenção/concentração","Comportamento opositor/desafiador"],"Desenvolvimento Motor":["Dificuldade na coordenação motora fina","Dificuldade na coordenação motora grossa","Dificuldade no manuseio do lápis/tesoura"],"Autonomia e Vida Diária":["Dificuldade em atividades de autocuidado","Dependência excessiva do adulto","Dificuldade em organizar materiais"]},M=["Psicólogo(a)","Fonoaudiólogo(a)","Terapeuta Ocupacional","Psicopedagogo(a)","Assistente Social","Neuropsicólogo(a)"],fe={observacoes:"",impacto:"",intervencoes_familia:"",aspectos:{},aspectosOutro:{},complementares:"",profissionais:[],possuiLaudo:null,diagnostico:"",atendimentoExterno:""},ve={"Psicólogo(a)":"PSICOLOGIA","Fonoaudiólogo(a)":"FONOAUDIOLOGIA","Terapeuta Ocupacional":"TERAPIA_OCUPACIONAL","Psicopedagogo(a)":"PSICOPEDAGOGIA","Assistente Social":"SERVICO_SOCIAL","Neuropsicólogo(a)":"PSICOLOGIA"},we=({currentUser:m})=>{var H,W,Y,Q,U,Z,J;const{addToast:h}=ge(),T=he(),[k,se]=c.useState([]),[z,oe]=c.useState([]),[N,ie]=c.useState(""),[j,R]=c.useState(""),[s,p]=c.useState(fe),[w,F]=c.useState(!1),[A,L]=c.useState(!1);c.useEffect(()=>{(async()=>{try{const a=m.role==="SPECIALIST"?await I.getStudentsForUser(m):await I.getStudents();se(a);const{data:o}=await _.from("schools").select("*").order("name");o&&oe(o)}catch(a){console.error("Erro ao carregar dados:",a)}})()},[m.id]),c.useEffect(()=>{m.schoolId&&R(m.schoolId)},[m.schoolId]);const d=c.useMemo(()=>k.find(t=>t.id===N),[k,N]),n=c.useMemo(()=>z.find(t=>t.id===j),[z,j]),re=(t,a)=>{p(o=>{const i=o.aspectos[t]||[],l=i.includes(a)?i.filter(r=>r!==a):[...i,a];return{...o,aspectos:{...o.aspectos,[t]:l}}})},le=t=>{p(a=>({...a,profissionais:a.profissionais.includes(t)?a.profissionais.filter(o=>o!==t):[...a.profissionais,t]}))},de=()=>`ENC-${new Date().getFullYear()}-${Math.floor(Math.random()*9e4)+1e4}`,O=async(t=!1)=>{if(!N||!j){h("Selecione o aluno e a escola antes de salvar.","error");return}if(t&&!s.observacoes.trim()){h('O campo "O que você tem observado no aluno?" é obrigatório.',"error");return}if(t&&!s.impacto.trim()){h("O campo sobre o impacto na aprendizagem é obrigatório.","error");return}if(t&&!s.intervencoes_familia.trim()){h("O campo sobre intervenções e família é obrigatório.","error");return}if(t&&s.profissionais.length===0){h("Selecione ao menos um profissional para encaminhamento.","error");return}t?L(!0):F(!0);try{const a=de(),o=new Date().toISOString(),i=(await _.auth.getUser()).data.user,{data:l,error:r}=await _.from("relatorios_encaminhamento").insert({student_id:N,school_id:j,status:t?"ENVIADO":"RASCUNHO",observacoes_aluno:s.observacoes,impacto_aprendizagem:s.impacto,intervencoes_familia:s.intervencoes_familia,aspectos_desenvolvimento:s.aspectos,informacoes_complementares:s.complementares,profissionais_solicitados:s.profissionais,possui_laudo:s.possuiLaudo??!1,diagnostico:s.diagnostico,atendimento_externo:s.atendimentoExterno,preenchido_por:i==null?void 0:i.id,nome_preenchedor:m.name,cargo_preenchedor:m.jobTitle||m.role,codigo:a,enviado_em:t?o:null,notificado:!!t}).select("id").single();if(r)throw r;if(t&&i&&l){const b=d,g=n,S="Novo Encaminhamento Recebido",C=`Novo encaminhamento recebido: ${(b==null?void 0:b.fullName)||"Aluno"} — ${(g==null?void 0:g.name)||"Escola"}`,y=s.profissionais.map(u=>ve[u]).filter(Boolean),{data:x}=await _.from("profiles").select("id").in("role",["ADMIN","EDUCATION_SECRETARY","SECRETARIA_SEDE","SECRETARIA_COCAL"]).eq("is_active",!0);let D=[];if(y.length>0){const{data:u}=await _.from("profiles").select("id").eq("role","SPECIALIST").in("specialty",y).eq("is_active",!0);D=u||[]}const v=new Set;(x||[]).forEach(u=>v.add(u.id)),D.forEach(u=>v.add(u.id)),v.delete(i.id);const E=Array.from(v).map(u=>({sender_id:i.id,recipient_id:u,title:S,content:C,priority:"normal",type:"ALERT"}));E.length>0&&await _.from("system_messages").insert(E)}h(t?`Relatório enviado ao Centro Multidisciplinar! Código: ${a}`:`Rascunho salvo com sucesso. Código: ${a}`,"success"),t&&T("/app/documentos")}catch(a){console.error("Erro ao salvar relatório:",a),h(`Erro ao ${t?"enviar":"salvar"}: ${a.message}`,"error")}finally{F(!1),L(!1)}},B=t=>t?`<div class="header">
      ${t.showLogo&&t.logoUrl?`<img src="${t.logoUrl}" style="max-width:100%;max-height:140px;height:auto;object-fit:contain;margin-bottom:6px" alt="Logo">`:""}
      ${t.showTitulos?`<h1>${t.tituloLinha1}</h1><h1>${t.tituloLinha2}</h1><h2>${t.tituloLinha3}</h2>`:""}
      ${t.showContato?`<p style="font-size:8pt;color:#666;margin-top:4px">${t.cnpj?`CNPJ: ${t.cnpj} | `:""}${t.endereco?`${t.endereco} | `:""}${t.telefone?`Tel: ${t.telefone}`:""}</p>`:""}
    </div>`:'<div class="header"><h1>Prefeitura Municipal de Brotas de Macaúbas</h1><h1>Secretaria Municipal de Educação</h1><h2>Coordenação de Educação Especial e Inclusiva</h2><p style="font-size:10pt;font-style:italic">Centro Multidisciplinar</p></div>',q=t=>{if(!t)return"";const a=[];return t.rodapeImg&&a.push(`<img src="${t.rodapeImg}" style="max-width:100%;max-height:50px;object-fit:contain;opacity:0.8" alt="">`),t.rodapeTexto&&a.push(`<p style="font-size:7pt;color:#999;margin:4px 0 0">${t.rodapeTexto}</p>`),a.length?`<div style="text-align:center;border-top:1px dashed #ccc;padding-top:8px;margin-top:16px">${a.join("")}</div>`:""},V=async()=>{var b,g,S,C,y;const t=d,a=n;if(!t||!a)return;const o=await I.getPapelTimbradoConfig(),i=Object.entries(P).map(([x,D])=>{const v=s.aspectos[x]||[];return`<div class="checklist-group">
        <p style="font-weight:bold;color:#1B4F72;margin:6px 0 4px">${x}</p>
        ${D.map(E=>`<p style="margin:2px 0 2px 12px">${v.includes(E)?"☑":"☐"} ${E}</p>`).join("")}
        ${s.aspectosOutro[x]?`<p style="margin:2px 0 2px 12px">☑ Outro: ${s.aspectosOutro[x]}</p>`:""}
      </div>`}).join(""),l=M.map(x=>`<p style="margin:3px 0">${s.profissionais.includes(x)?"☑":"☐"} ${x}</p>`).join(""),r=window.open("","_blank","width=900,height=1100");r&&(r.document.write(`<html><head><title>Relatório de Encaminhamento</title>
<style>
@page{size:A4;margin:20mm}
body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.5;color:#000;margin:0;padding:0}
.header{text-align:center;border-bottom:2px solid #1B4F72;padding-bottom:8px;margin-bottom:20px}
.header h1{font-size:13pt;margin:0;text-transform:uppercase}
.header h2{font-size:11pt;margin:2px 0;color:#1B4F72}
.sec{margin:16px 0;border-bottom:1px solid #1B4F72;padding-bottom:3px;font-weight:bold;color:#1B4F72;font-size:12pt;page-break-after:avoid}
.section{page-break-inside:avoid;margin-bottom:12px}
table{width:100%;border-collapse:collapse;margin-bottom:12px;page-break-inside:avoid}
td{padding:4px 8px;border:1px solid #ccc;font-size:11pt}
td:first-child{font-weight:bold;background:#EBF5FB;width:38%}
.checklist-group{page-break-inside:avoid;margin-bottom:10px}
.signatures{page-break-inside:avoid;page-break-before:auto}
.sig{display:inline-block;width:45%;text-align:center;margin-top:40px}
.sig-line{border-top:1px solid #000;margin-top:40px;padding-top:4px;font-size:10pt}
.note{font-size:9pt;color:#555;font-style:italic;margin-top:20px;border-top:1px solid #1B4F72;padding-top:8px}
</style></head><body>
${B(o)}
<h2 style="text-align:center;color:#1B4F72;font-size:14pt">RELATÓRIO PEDAGÓGICO DE ENCAMINHAMENTO</h2>

<div class="section">
<p class="sec">1. DADOS DA ESCOLA</p>
<table>
  <tr><td>Nome da Escola</td><td>${a.name||""}</td></tr>
  <tr><td>INEP</td><td>${a.inep||""}</td></tr>
  <tr><td>Endereço</td><td>${a.address?`${a.address.street||""}, ${a.address.number||""} - ${a.address.district||""}`:""}</td></tr>
  <tr><td>Telefone</td><td>${a.phone||""}</td></tr>
  <tr><td>Diretor(a)</td><td>${a.director||""}</td></tr>
  <tr><td>Distrito</td><td>${a.district||""}</td></tr>
</table>
</div>

<div class="section">
<p class="sec">2. DADOS DO(A) ALUNO(A)</p>
<table>
  <tr><td>Nome Completo</td><td>${t.fullName}</td></tr>
  <tr><td>Data de Nascimento</td><td>${t.birthDate?new Date(t.birthDate).toLocaleDateString("pt-BR"):""}</td></tr>
  <tr><td>Responsável</td><td>${((g=(b=t.guardians)==null?void 0:b[0])==null?void 0:g.name)||""}</td></tr>
  <tr><td>Ano/Série</td><td>${((S=t.school)==null?void 0:S.grade)||""}</td></tr>
  <tr><td>Turno</td><td>${((C=t.school)==null?void 0:C.shift)||""}</td></tr>
  <tr><td>Professor(a) Regente</td><td>${((y=t.school)==null?void 0:y.regentTeacher)||""}</td></tr>
  <tr><td>Possui Laudo</td><td>${s.possuiLaudo?"Sim":"Não"}</td></tr>
  ${s.possuiLaudo?`<tr><td>Diagnóstico</td><td>${s.diagnostico}</td></tr>`:""}
</table>
</div>

<div class="section">
<p class="sec">3. MOTIVO DO ENCAMINHAMENTO</p>
<p style="font-weight:bold;margin:8px 0 4px;color:#1B4F72">a) O que você tem observado no aluno?</p>
<p style="text-align:justify">${s.observacoes||"Não informado"}</p>
<p style="font-weight:bold;margin:8px 0 4px;color:#1B4F72">b) Como essas dificuldades interferem na aprendizagem e/ou na convivência?</p>
<p style="text-align:justify">${s.impacto||"Não informado"}</p>
<p style="font-weight:bold;margin:8px 0 4px;color:#1B4F72">c) O que a escola já tentou fazer e qual foi o resultado? A família foi comunicada?</p>
<p style="text-align:justify">${s.intervencoes_familia||"Não informado"}</p>
</div>

<p class="sec">4. ASPECTOS DO DESENVOLVIMENTO E APRENDIZAGEM</p>
${i}

<div class="section">
<p class="sec">5. INFORMAÇÕES COMPLEMENTARES</p>
<p style="text-align:justify">${s.complementares||"Não informado"}</p>
</div>

<div class="section">
<p class="sec">6. ENCAMINHAMENTO SOLICITADO</p>
${l}
</div>

<div class="signatures">
<div style="margin-top:40px">
  <div class="sig"><div class="sig-line">Professor(a) Regente<br>Matrícula: ___________</div></div>
  <div class="sig" style="margin-left:8%"><div class="sig-line">Coordenador(a) Pedagógico(a)<br>Matrícula: ___________</div></div>
</div>
<div style="margin-top:30px">
  <div class="sig"><div class="sig-line">Diretor(a) da Escola<br>Matrícula: ___________</div></div>
  <div class="sig" style="margin-left:8%"><p style="margin-top:50px">Data: ____/____/________</p></div>
</div>
</div>
<p class="note">OBSERVAÇÃO: Este relatório é de caráter confidencial. As informações serão utilizadas exclusivamente pelos profissionais do Centro Multidisciplinar para fins de avaliação e planejamento de intervenção. A escola deve manter uma cópia em arquivo.</p>
${q(o)}
</body></html>`),r.document.close(),r.onload=()=>{r.focus(),r.print()})},G=async()=>{const t=await I.getPapelTimbradoConfig(),a=r=>Array.from({length:r},()=>'<div style="border-bottom:1px dotted #999;height:28px;margin-bottom:2px"></div>').join(""),o=Object.entries(P).map(([r,b])=>`<div class="checklist-group">
        <p style="font-weight:bold;color:#1B4F72;margin:6px 0 4px">${r}</p>
        ${b.map(g=>`<p style="margin:2px 0 2px 12px">☐ ${g}</p>`).join("")}
        <p style="margin:2px 0 2px 12px">☐ Outro: _______________________________________________</p>
      </div>`).join(""),i=[...M,"Outro: ________________"].map(r=>`<span style="margin-right:18px;white-space:nowrap">☐ ${r}</span>`).join(""),l=window.open("","_blank","width=900,height=1100");l&&(l.document.write(`<html><head><title>Ficha em Branco - Encaminhamento</title>
<style>
@page{size:A4;margin:20mm}
body{font-family:"Times New Roman",serif;font-size:11pt;line-height:1.4;color:#000;margin:0;padding:0}
.header{text-align:center;border-bottom:2px solid #1B4F72;padding-bottom:8px;margin-bottom:16px}
.header h1{font-size:12pt;margin:0;text-transform:uppercase}
.header h2{font-size:10pt;margin:2px 0;color:#1B4F72}
.sec{margin:14px 0 6px;border-bottom:1px solid #1B4F72;padding-bottom:2px;font-weight:bold;color:#1B4F72;font-size:11pt;page-break-after:avoid}
.section{page-break-inside:avoid;margin-bottom:12px}
table{width:100%;border-collapse:collapse;margin-bottom:10px;page-break-inside:avoid}
td{padding:3px 6px;border:1px solid #ccc;font-size:10pt;height:26px}
td:first-child{font-weight:bold;background:#EBF5FB;width:35%}
.checklist-group{page-break-inside:avoid;margin-bottom:10px}
.signatures{page-break-inside:avoid;page-break-before:auto}
.sig{display:inline-block;width:30%;text-align:center;margin-top:30px}
.sig-line{border-top:1px solid #000;margin-top:35px;padding-top:4px;font-size:9pt}
.note{font-size:8pt;color:#555;font-style:italic;margin-top:16px;border-top:1px solid #1B4F72;padding-top:6px}
.orientadora{border-left:3px solid #27ae60;background:#f0faf4;padding:8px 12px;margin:8px 0 12px;font-size:10pt;font-style:italic;color:#2c6e49;page-break-inside:avoid}
</style></head><body>
${B(t)}
<h2 style="text-align:center;color:#1B4F72;font-size:13pt;margin-bottom:14px">RELATÓRIO PEDAGÓGICO DE ENCAMINHAMENTO</h2>

<div class="section">
<p class="sec">1. DADOS DA ESCOLA</p>
<table>
  <tr><td>Nome da Escola</td><td></td></tr>
  <tr><td>INEP</td><td></td></tr>
  <tr><td>Endereço</td><td></td></tr>
  <tr><td>Telefone</td><td></td></tr>
  <tr><td>Diretor(a)</td><td></td></tr>
  <tr><td>Coordenador(a) Pedagógico(a)</td><td></td></tr>
</table>
</div>

<div class="section">
<p class="sec">2. DADOS DO(A) ALUNO(A)</p>
<table>
  <tr><td>Nome Completo</td><td></td></tr>
  <tr><td>Data de Nascimento</td><td style="width:30%"></td><td style="font-weight:bold;background:#EBF5FB;width:12%;border:1px solid #ccc">Idade</td><td style="border:1px solid #ccc"></td></tr>
  <tr><td>Nome da Mãe/Responsável</td><td colspan="3"></td></tr>
  <tr><td>Nome do Pai/Responsável</td><td colspan="3"></td></tr>
  <tr><td>Telefone</td><td style="width:30%"></td><td style="font-weight:bold;background:#EBF5FB;width:12%;border:1px solid #ccc">Turma</td><td style="border:1px solid #ccc"></td></tr>
  <tr><td>Endereço</td><td colspan="3"></td></tr>
  <tr><td>Ano/Série</td><td style="width:30%"></td><td style="font-weight:bold;background:#EBF5FB;width:12%;border:1px solid #ccc">Turno</td><td style="border:1px solid #ccc"></td></tr>
  <tr><td>Professor(a) Regente</td><td colspan="3"></td></tr>
  <tr><td>Data de Matrícula</td><td colspan="3"></td></tr>
  <tr><td>Possui Laudo Médico?</td><td colspan="3">☐ Sim&nbsp;&nbsp;&nbsp;☐ Não</td></tr>
  <tr><td>Diagnóstico</td><td colspan="3"></td></tr>
  <tr><td>Recebe Atendimento Externo?</td><td colspan="3">☐ Sim&nbsp;&nbsp;&nbsp;☐ Não&nbsp;&nbsp;&nbsp;Qual? ______________________________</td></tr>
</table>
</div>

<div class="orientadora">Para que o encaminhamento possa ser melhor compreendido pela equipe, procure relatar situações observáveis e exemplos concretos, evitando diagnósticos ou rótulos.</div>

<div class="section">
<p class="sec">3. MOTIVO DO ENCAMINHAMENTO</p>
<p style="font-weight:bold;color:#1B4F72;margin:6px 0 3px;font-size:10pt">a) O que você tem observado no aluno?</p>
<p style="font-size:9pt;color:#555;margin:0 0 4px;font-style:italic">Descreva brevemente as principais dificuldades ou comportamentos observados, incluindo como isso aparece no dia a dia escolar.</p>
${a(7)}
<p style="font-weight:bold;color:#1B4F72;margin:10px 0 3px;font-size:10pt">b) Como essas dificuldades interferem na aprendizagem e/ou na convivência do aluno na escola?</p>
<p style="font-size:9pt;color:#555;margin:0 0 4px;font-style:italic">Se possível, dê um exemplo de uma situação observada.</p>
${a(7)}
<p style="font-weight:bold;color:#1B4F72;margin:10px 0 3px;font-size:10pt">c) O que a escola já tentou fazer e qual foi o resultado? A família já foi comunicada sobre a situação?</p>
<p style="font-size:9pt;color:#555;margin:0 0 4px;font-style:italic">Descreva brevemente as estratégias realizadas e o retorno da família, quando houver.</p>
${a(7)}
</div>

<p class="sec">4. ASPECTOS DO DESENVOLVIMENTO E APRENDIZAGEM</p>
<p style="font-size:9pt;color:#555;font-style:italic;margin-bottom:6px">Marque os itens observados:</p>
${o}

<div class="section">
<p class="sec">5. INFORMAÇÕES COMPLEMENTARES</p>
${a(5)}
</div>

<div class="section">
<p class="sec">6. ENCAMINHAMENTO SOLICITADO</p>
<p style="font-size:9pt;color:#555;font-style:italic;margin-bottom:6px">Profissional(is) para o(s) qual(is) o aluno está sendo encaminhado:</p>
<p style="line-height:2.2">${i}</p>
</div>

<div class="signatures">
<div style="margin-top:30px">
  <div class="sig"><div class="sig-line">Professor(a) Regente<br>Matrícula: ___________</div></div>
  <div class="sig" style="margin-left:3%"><div class="sig-line">Coordenador(a) Pedagógico(a)<br>Matrícula: ___________</div></div>
  <div class="sig" style="margin-left:3%"><div class="sig-line">Diretor(a) da Escola<br>Matrícula: ___________</div></div>
</div>
<p style="text-align:right;margin-top:20px;font-size:10pt">Data: ____/____/________</p>
</div>
<p class="note">OBSERVAÇÃO: Este relatório é de caráter confidencial. As informações serão utilizadas exclusivamente pelos profissionais do Centro Multidisciplinar para fins de avaliação e planejamento de intervenção. A escola deve manter uma cópia em arquivo.</p>
${q(t)}
</body></html>`),l.document.close(),l.onload=()=>{l.focus(),l.print()})},ne=({checked:t,onChange:a,label:o})=>e.jsxs("label",{onClick:a,className:"flex items-center gap-2.5 py-1.5 px-1 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors text-sm text-slate-700 select-none",children:[e.jsx("div",{className:`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${t?"bg-primary-600 border-primary-600":"border-slate-300"}`,children:t&&e.jsx(ae,{size:10,className:"text-white",strokeWidth:3})}),o]}),f=({num:t,title:a,tag:o,tagColor:i,children:l})=>e.jsxs("div",{className:"bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden mb-5",children:[e.jsxs("div",{className:"flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/30",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx("span",{className:"w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center",children:t}),e.jsx("span",{className:"text-sm font-bold text-primary-700",children:a})]}),e.jsx("span",{className:`text-[10px] font-bold px-2.5 py-1 rounded-full ${i}`,children:o})]}),e.jsx("div",{className:"p-5",children:l})]});return e.jsxs("div",{className:"max-w-4xl mx-auto pb-12 animate-fadeIn",children:[e.jsxs("div",{className:"flex items-center gap-3 mb-2",children:[e.jsx("button",{onClick:()=>T("/app/documentos"),className:"p-2 hover:bg-slate-100 rounded-xl transition-colors",children:e.jsx(ce,{size:20,className:"text-slate-500"})}),e.jsx(pe,{size:22,className:"text-primary-600"}),e.jsx("h1",{className:"text-xl font-bold text-slate-800",children:"Relatório Pedagógico de Encaminhamento"}),e.jsx("span",{className:"text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full",children:"Rascunho"})]}),e.jsx("p",{className:"text-sm text-slate-400 mb-6 ml-12",children:"Centro Multidisciplinar de Brotas de Macaúbas"}),e.jsxs("div",{className:"flex justify-end gap-2 mb-6",children:[e.jsxs("button",{onClick:()=>O(!1),disabled:w,className:"flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50",children:[w?e.jsx($,{size:14,className:"animate-spin"}):e.jsx(K,{size:14})," Salvar rascunho"]}),e.jsxs("button",{onClick:G,className:"flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all",children:[e.jsx(X,{size:14})," Ficha em branco"]}),e.jsxs("button",{onClick:V,className:"flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all",children:[e.jsx(ee,{size:14})," Imprimir"]}),e.jsxs("button",{onClick:()=>O(!0),disabled:A,className:"flex items-center gap-1.5 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-all shadow-sm disabled:opacity-50",children:[A?e.jsx($,{size:14,className:"animate-spin"}):e.jsx(te,{size:14})," Enviar ao Centro"]})]}),e.jsx(f,{num:1,title:"Dados da escola",tag:"✓ Preenchido automaticamente",tagColor:"bg-emerald-100 text-emerald-700",children:e.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{className:"col-span-2",children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1",children:"Selecione a escola"}),e.jsxs("div",{className:"relative",children:[e.jsx(me,{className:"absolute left-3 top-1/2 -translate-y-1/2 text-primary-500",size:16}),e.jsxs("select",{className:"w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-slate-50/30 text-slate-700 font-medium appearance-none",value:j,onChange:t=>R(t.target.value),children:[e.jsx("option",{value:"",children:"Buscar escola..."}),z.map(t=>e.jsx("option",{value:t.id,children:t.name},t.id))]})]})]}),n&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-400 uppercase mb-1",children:"INEP"}),e.jsx("div",{className:"py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-slate-700",children:n.inep||"—"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-400 uppercase mb-1",children:"Telefone"}),e.jsx("div",{className:"py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-slate-700",children:n.phone||"—"})]}),e.jsxs("div",{className:"col-span-2",children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-400 uppercase mb-1",children:"Endereço"}),e.jsx("div",{className:"py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-slate-700",children:n.address?`${n.address.street||""}, ${n.address.number||""} - ${n.address.district||""}`:"—"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-400 uppercase mb-1",children:"Diretor(a)"}),e.jsx("div",{className:"py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-slate-700",children:n.director||"—"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-400 uppercase mb-1",children:"Distrito"}),e.jsx("div",{className:"py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-slate-700",children:n.district||"—"})]})]})]})}),e.jsxs(f,{num:2,title:"Dados do(a) aluno(a)",tag:"✓ Autopreenchido ao selecionar",tagColor:"bg-emerald-100 text-emerald-700",children:[e.jsxs("div",{className:"mb-4",children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1",children:"Selecione o aluno"}),e.jsxs("div",{className:"relative",children:[e.jsx(xe,{className:"absolute left-3 top-1/2 -translate-y-1/2 text-primary-500",size:16}),e.jsxs("select",{className:"w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-slate-50/30 text-slate-700 font-medium appearance-none",value:N,onChange:t=>ie(t.target.value),children:[e.jsx("option",{value:"",children:"Buscar aluno..."}),k.map(t=>e.jsx("option",{value:t.id,children:t.fullName},t.id))]})]})]}),d&&e.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-400 uppercase mb-1",children:"Data de nascimento"}),e.jsx("div",{className:"py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium",children:d.birthDate?new Date(d.birthDate).toLocaleDateString("pt-BR"):"—"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-400 uppercase mb-1",children:"Ano/Série"}),e.jsx("div",{className:"py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium",children:((H=d.school)==null?void 0:H.grade)||"—"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-400 uppercase mb-1",children:"Turno"}),e.jsx("div",{className:"py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium",children:((W=d.school)==null?void 0:W.shift)||"—"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-400 uppercase mb-1",children:"Professor(a) Regente"}),e.jsx("div",{className:"py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium",children:((Y=d.school)==null?void 0:Y.regentTeacher)||"—"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-400 uppercase mb-1",children:"Responsável"}),e.jsx("div",{className:"py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium",children:((U=(Q=d.guardians)==null?void 0:Q[0])==null?void 0:U.name)||"—"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-400 uppercase mb-1",children:"Telefone"}),e.jsx("div",{className:"py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium",children:((J=(Z=d.guardians)==null?void 0:Z[0])==null?void 0:J.phone)||"—"})]})]}),d&&e.jsxs("div",{className:"grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-400 uppercase mb-2",children:"Possui laudo médico?"}),e.jsxs("div",{className:"flex gap-4",children:[e.jsxs("label",{className:"flex items-center gap-2 cursor-pointer text-sm",onClick:()=>p(t=>({...t,possuiLaudo:!0})),children:[e.jsx("div",{className:`w-4 h-4 rounded-full border-2 flex items-center justify-center ${s.possuiLaudo===!0?"border-primary-600 bg-primary-600":"border-slate-300"}`,children:s.possuiLaudo===!0&&e.jsx("div",{className:"w-2 h-2 rounded-full bg-white"})})," Sim"]}),e.jsxs("label",{className:"flex items-center gap-2 cursor-pointer text-sm",onClick:()=>p(t=>({...t,possuiLaudo:!1})),children:[e.jsx("div",{className:`w-4 h-4 rounded-full border-2 flex items-center justify-center ${s.possuiLaudo===!1?"border-primary-600 bg-primary-600":"border-slate-300"}`,children:s.possuiLaudo===!1&&e.jsx("div",{className:"w-2 h-2 rounded-full bg-white"})})," Não"]})]})]}),s.possuiLaudo&&e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-400 uppercase mb-1",children:"Diagnóstico"}),e.jsx("input",{type:"text",className:"w-full py-2 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500",value:s.diagnostico,onChange:t=>p(a=>({...a,diagnostico:t.target.value})),placeholder:"Qual diagnóstico?"})]})]})]}),e.jsxs(f,{num:3,title:"Motivo do encaminhamento",tag:"✎ Preenchimento manual",tagColor:"bg-blue-100 text-blue-700",children:[e.jsxs("div",{className:"flex items-start gap-3 p-4 mb-5 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl",children:[e.jsx(ue,{size:20,className:"text-emerald-600 flex-shrink-0 mt-0.5"}),e.jsx("p",{className:"text-sm text-emerald-800 leading-relaxed",children:"Para que o encaminhamento possa ser melhor compreendido pela equipe, procure relatar situações observáveis e exemplos concretos, evitando diagnósticos ou rótulos."})]}),e.jsxs("div",{className:"space-y-5",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-bold text-slate-700 mb-1",children:"a) O que você tem observado no aluno?"}),e.jsx("p",{className:"text-xs text-slate-400 mb-2",children:"Descreva brevemente as principais dificuldades ou comportamentos observados, incluindo como isso aparece no dia a dia escolar."}),e.jsx("textarea",{className:"w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white text-sm placeholder:text-slate-300 resize-none min-h-[100px] leading-relaxed",placeholder:"Ex.: O aluno apresenta dificuldade em acompanhar as atividades em sala...",value:s.observacoes,onChange:t=>p(a=>({...a,observacoes:t.target.value}))})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-bold text-slate-700 mb-1",children:"b) Como essas dificuldades interferem na aprendizagem e/ou na convivência do aluno na escola?"}),e.jsx("p",{className:"text-xs text-slate-400 mb-2",children:"Se possível, dê um exemplo de uma situação observada."}),e.jsx("textarea",{className:"w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white text-sm placeholder:text-slate-300 resize-none min-h-[100px] leading-relaxed",placeholder:"Ex.: O aluno não consegue concluir as atividades propostas no tempo...",value:s.impacto,onChange:t=>p(a=>({...a,impacto:t.target.value}))})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-bold text-slate-700 mb-1",children:"c) O que a escola já tentou fazer e qual foi o resultado? A família já foi comunicada sobre a situação?"}),e.jsx("p",{className:"text-xs text-slate-400 mb-2",children:"Descreva brevemente as estratégias realizadas e o retorno da família, quando houver."}),e.jsx("textarea",{className:"w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white text-sm placeholder:text-slate-300 resize-none min-h-[100px] leading-relaxed",placeholder:"Ex.: A escola realizou reforço escolar e reunião com a família...",value:s.intervencoes_familia,onChange:t=>p(a=>({...a,intervencoes_familia:t.target.value}))})]})]})]}),e.jsx(f,{num:4,title:"Aspectos do desenvolvimento e aprendizagem",tag:"✎ Marque os itens observados",tagColor:"bg-blue-100 text-blue-700",children:Object.entries(P).map(([t,a])=>e.jsxs("div",{className:"mb-4 last:mb-0",children:[e.jsxs("p",{className:"text-sm font-bold text-primary-600 mb-2 flex items-center gap-1.5",children:[e.jsx(be,{size:14})," ",t]}),e.jsx("div",{className:"grid grid-cols-2 gap-x-4",children:a.map(o=>e.jsx(ne,{label:o,checked:(s.aspectos[t]||[]).includes(o),onChange:()=>re(t,o)},o))}),e.jsx("input",{type:"text",className:"mt-1 w-full py-1.5 px-3 border border-dashed border-slate-200 rounded-lg text-xs text-slate-500 placeholder:text-slate-300 focus:ring-1 focus:ring-primary-400",placeholder:`Outro (${t})...`,value:s.aspectosOutro[t]||"",onChange:o=>p(i=>({...i,aspectosOutro:{...i.aspectosOutro,[t]:o.target.value}}))})]},t))}),e.jsx(f,{num:5,title:"Informações complementares",tag:"✎ Preenchimento manual",tagColor:"bg-blue-100 text-blue-700",children:e.jsx("textarea",{className:"w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 bg-white text-sm placeholder:text-slate-300 resize-none min-h-[80px] leading-relaxed",placeholder:"Registre qualquer informação adicional relevante sobre o(a) aluno(a), sua família ou contexto social (com sigilo e ética)...",value:s.complementares,onChange:t=>p(a=>({...a,complementares:t.target.value}))})}),e.jsxs(f,{num:6,title:"Encaminhamento solicitado",tag:"✎ Selecione os profissionais",tagColor:"bg-blue-100 text-blue-700",children:[e.jsx("p",{className:"text-xs text-slate-400 mb-3",children:"Profissional(is) para o(s) qual(is) o aluno está sendo encaminhado"}),e.jsx("div",{className:"grid grid-cols-2 md:grid-cols-3 gap-2",children:M.map(t=>e.jsxs("button",{onClick:()=>le(t),className:`flex items-center gap-2.5 p-3 rounded-xl border text-sm text-left transition-all ${s.profissionais.includes(t)?"bg-primary-50 border-primary-300 text-primary-700 font-semibold shadow-sm":"bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`,children:[e.jsx("div",{className:`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${s.profissionais.includes(t)?"bg-primary-600 border-primary-600":"border-slate-300"}`,children:s.profissionais.includes(t)&&e.jsx(ae,{size:10,className:"text-white",strokeWidth:3})}),t]},t))})]}),e.jsxs("div",{className:"bg-slate-50 border-l-4 border-primary-600 rounded-r-xl p-4 text-xs text-slate-500 italic leading-relaxed",children:[e.jsx("strong",{className:"not-italic text-slate-600",children:"Observação:"})," Este relatório é um documento de caráter confidencial. As informações serão utilizadas exclusivamente pelos profissionais do Centro Multidisciplinar para fins de avaliação e planejamento de intervenção. A escola deve manter uma cópia em arquivo."]}),e.jsxs("div",{className:"flex justify-end gap-3 mt-6",children:[e.jsxs("button",{onClick:()=>O(!1),disabled:w,className:"flex items-center gap-1.5 px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50",children:[w?e.jsx($,{size:14,className:"animate-spin"}):e.jsx(K,{size:14})," Salvar rascunho"]}),e.jsxs("button",{onClick:G,className:"flex items-center gap-1.5 px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all",children:[e.jsx(X,{size:14})," Ficha em branco"]}),e.jsxs("button",{onClick:V,className:"flex items-center gap-1.5 px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all",children:[e.jsx(ee,{size:14})," Imprimir"]}),e.jsxs("button",{onClick:()=>O(!0),disabled:A,className:"flex items-center gap-1.5 px-6 py-3 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50",children:[A?e.jsx($,{size:14,className:"animate-spin"}):e.jsx(te,{size:14})," Enviar ao Centro Multidisciplinar"]})]})]})};export{we as RelatorioEncaminhamento};
