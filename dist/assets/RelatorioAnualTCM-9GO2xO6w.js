import{j as e}from"./vendor-utils-DhbRKpow.js";import{b as N,q as F,s as Z,V as _,S as K,c as W,ab as ee}from"./vendor-ui-guEN412I.js";import{u as te,a as V}from"./index-Du6Nq0-W.js";import{G as ae}from"./geminiService-DYIHH4ei.js";import"./vendor-pdf-JkGS8wou.js";import"./vendor-supabase-CbM-anGD.js";import"./vendor-ai-BER3QIUg.js";const U=new Date().getFullYear(),oe=Array.from({length:5},(s,m)=>U-m),xe=({currentUser:s})=>{const{addToast:m}=te(),[n,g]=N.useState(U),[r,l]=N.useState(!1),[j,h]=N.useState(null),[u,c]=N.useState(""),[y,T]=N.useState(""),f=s.specialty||"Não informada",b=s.role==="EDUCATION_SECRETARY"||s.role==="ADMIN",E=async()=>{l(!0),h(null),c("");try{const d=`${n}-01-01`,z=`${n}-12-31`,$={fromDate:d,toDate:z};b||($.professionalId=s.id);const R=await V.getAppointments($);if(R.length===0){h(`Nenhum atendimento encontrado para ${s.name} no ano ${n}.`),l(!1);return}const t=R,i=t.length,A=t.filter(a=>["ATENDIDO","ENCERRADO","EM_ATENDIMENTO"].includes(a.status)).length,C=t.filter(a=>a.status==="FALTOU").length,D=t.filter(a=>a.status==="CANCELADO").length,k=t.filter(a=>a.status==="RETROATIVO").length,M=new Set(t.map(a=>a.studentId)).size,X=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"],I={};t.forEach(a=>{if(a.date){const o=parseInt(a.date.split("-")[1])-1;I[o]=(I[o]||0)+1}});let S=[];try{S=await V.getAgendamentosDoProfissional(s.id,{fromDate:d})}catch{S=t}const v={};t.forEach(a=>{var q,G;const o=S.find(Q=>Q.id===a.id),x=(o==null?void 0:o.schoolName)||(o==null?void 0:o.school_name)||((G=(q=o==null?void 0:o.students)==null?void 0:q.schools)==null?void 0:G.name)||a.schoolName||a.school_name||"Escola não informada";v[x]||(v[x]={alunos:new Set,atendimentos:0}),v[x].alunos.add(a.studentId),v[x].atendimentos++});const J=[...t].filter(a=>["ATENDIDO","ENCERRADO"].includes(a.status)).sort((a,o)=>{var x;return(x=o.date)==null?void 0:x.localeCompare(a.date)}).slice(0,10),p={};t.forEach(a=>{const o=a.specialty||f;p[o]||(p[o]={total:0,atendidos:0,alunos:new Set}),p[o].total++,["ATENDIDO","ENCERRADO"].includes(a.status)&&p[o].atendidos++,p[o].alunos.add(a.studentId)});const O={};t.forEach(a=>{const o=a.unit||"Não informada";O[o]=(O[o]||0)+1});const P=b?Array.from(new Set(t.map(a=>a.professionalName))).filter(Boolean):[s.name],L=i>0?Math.round(A/i*100):0,Y=`
DADOS REAIS DO SISTEMA BROTAR — ANO ${n}
Profissional: ${s.name}
Especialidade: ${f}
Total de agendamentos: ${i}
Atendimentos realizados: ${A}
Faltas: ${C} | Cancelamentos: ${D} | Retroativos: ${k}
Alunos únicos atendidos: ${M}
Taxa de comparecimento: ${L}%
Profissionais: ${P.join(", ")}
Por especialidade: ${Object.entries(p).map(([a,o])=>`${a}: ${o.total} agend., ${o.atendidos} realizados, ${o.alunos.size} alunos`).join(" | ")}
Por unidade: ${Object.entries(O).map(([a,o])=>`${a}: ${o}`).join(" | ")}
      `.trim();let B;try{const a=`Você é redator oficial do Programa BROTAR de Brotas de Macaúbas/BA. Com base nos dados reais abaixo, complemente e enriqueça o relatório anual institucional para prestação de contas ao TCM/BA referente ao ano ${n}. Use linguagem técnica, formal e institucional. Para cada seção, escreva parágrafos completos e detalhados baseados nos dados fornecidos. NÃO deixe campos em branco — substitua todos os "XXXX" pelos valores reais. ${Y}`;B=await ae.generateOfficialDocument("Relatório Anual TCM",{fullName:"Rede Municipal",school:{schoolName:"Brotas de Macaúbas"}},s.name,"Secretária de Educação",a)}catch{B=se(n,f,s.name,P,A,M,C,D,k,i,L,p,O,I,X,v,J)}const H=`TCM-${n}-${Math.floor(Math.random()*9e4)+1e4}`;T(H),c(B),m("Relatório anual gerado com sucesso!","success")}catch{h("Erro ao gerar relatório. Verifique a conexão e tente novamente.")}finally{l(!1)}},w=()=>{const d=window.open("","_blank","width=1000,height=900");d&&(d.document.write(`<!DOCTYPE html><html><head><title>Relatório Anual TCM ${n}</title>
    <style>
      @page { size: A4; margin: 0; }
      body { margin: 0; padding: 0; font-family: 'Times New Roman', serif; }
      @media print { .no-print { display: none; } }
    </style></head><body>${u}</body></html>`),d.document.close(),setTimeout(()=>{d.print()},800))};return e.jsxs("div",{className:"max-w-6xl mx-auto space-y-6 pb-12",children:[e.jsxs("div",{className:"rounded-3xl p-6 text-white",style:{background:"linear-gradient(135deg, #8B1A3A, #6B1230)"},children:[e.jsxs("div",{className:"flex items-center gap-3 mb-2",children:[e.jsx("div",{className:"p-2 rounded-xl",style:{background:"rgba(255,255,255,0.15)"},children:e.jsx(F,{size:24})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-black tracking-tight",children:"Relatório Anual — TCM"}),e.jsx("p",{className:"text-sm",style:{color:"rgba(255,255,255,0.70)"},children:"Tribunal de Contas dos Municípios da Bahia"})]})]}),e.jsx("p",{className:"text-xs mt-3",style:{color:"rgba(255,255,255,0.60)"},children:"Gera automaticamente o relatório institucional anual seguindo o modelo oficial do Programa BROTAR, com dados reais do sistema preenchidos pela IA."})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-6",children:[e.jsx("div",{className:"lg:col-span-1",children:e.jsxs("div",{className:"bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5 sticky top-6",children:[e.jsx("h2",{className:"text-sm font-black text-slate-700 uppercase tracking-wider",children:"Configurar Relatório"}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2",children:"Ano de Referência"}),e.jsxs("div",{className:"relative",children:[e.jsx(Z,{className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400",size:16}),e.jsx("select",{className:"w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-700 font-semibold appearance-none text-sm",value:n,onChange:d=>g(Number(d.target.value)),children:oe.map(d=>e.jsx("option",{value:d,children:d},d))})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2",children:"Profissional"}),e.jsxs("div",{className:"bg-slate-50 rounded-xl p-3 border border-slate-100",children:[e.jsx("p",{className:"text-sm font-bold text-slate-800",children:s.name}),e.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:f}),e.jsxs("div",{className:"mt-2 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1",children:[e.jsx("div",{className:"w-1.5 h-1.5 rounded-full bg-emerald-400"}),e.jsx("span",{className:"text-[10px] font-semibold text-emerald-700",children:"Relatório individual"})]})]})]}),e.jsxs("button",{onClick:E,disabled:r,className:"w-full py-4 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95",style:{background:"linear-gradient(135deg, #8B1A3A, #6B1230)"},children:[r?e.jsx(_,{size:18,className:"animate-spin"}):e.jsx(K,{size:18}),r?"Gerando com IA...":"Gerar Relatório TCM"]}),j&&e.jsxs("div",{className:"p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2 items-start",children:[e.jsx(W,{size:16,className:"text-red-500 shrink-0 mt-0.5"}),e.jsx("p",{className:"text-red-600 text-xs",children:j})]}),e.jsx("div",{className:"border-t border-slate-100 pt-4",children:e.jsx("p",{className:"text-[10px] text-slate-400 font-medium",children:"📄 Modelo baseado no PDF oficial do Programa BROTAR com 13 seções, tabela de indicadores e página de assinaturas."})})]})}),e.jsx("div",{className:"lg:col-span-2",children:u?e.jsxs("div",{className:"bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden",children:[e.jsxs("div",{className:"flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("span",{className:"text-xs font-black text-slate-500 bg-slate-200 px-2 py-1 rounded-lg",children:["#",y]}),e.jsxs("span",{className:"text-xs text-slate-500 font-medium",children:["Relatório Anual ",n]})]}),e.jsxs("button",{onClick:w,className:"flex items-center gap-2 px-4 py-2 text-white rounded-xl text-xs font-bold transition-all",style:{background:"#8B1A3A"},children:[e.jsx(ee,{size:14})," Imprimir PDF"]})]}),e.jsx("div",{className:"overflow-y-auto max-h-[700px]",dangerouslySetInnerHTML:{__html:u}})]}):e.jsx("div",{className:"bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[400px] text-center p-8",children:r?e.jsxs(e.Fragment,{children:[e.jsx(_,{size:48,className:"animate-spin mb-4",style:{color:"#8B1A3A"}}),e.jsx("p",{className:"font-bold text-slate-700",children:"Coletando dados e gerando relatório..."}),e.jsx("p",{className:"text-slate-400 text-sm mt-2",children:"A IA está preenchendo todas as 13 seções"})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100",children:e.jsx(F,{size:32,className:"text-slate-300"})}),e.jsx("p",{className:"font-bold text-slate-500",children:"Configure e gere o relatório"}),e.jsx("p",{className:"text-slate-400 text-sm mt-1",children:"O modelo seguirá o padrão oficial do PDF do BROTAR"})]})})})]})]})};function se(s,m,n,g,r,l,j,h,u,c,y,T,f,b,E,w,d){const z=new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"}),$=m==="TODAS"?"Todas as especialidades":m,R=Object.entries(T).map(([t,i])=>`
    <tr>
      <td style="border:1px solid #ccc;padding:6px 10px">${t}</td>
      <td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${i.total}</td>
      <td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${i.atendidos}</td>
      <td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${i.alunos.size}</td>
    </tr>`).join("");return`
<div style="font-family:'Times New Roman',serif;color:#000;line-height:1.6;max-width:800px;margin:0 auto">

  <!-- CAPA OFICIAL -->
  <div style="page-break-after:always;position:relative;width:100%;background:#fff">
    <img src="/capa_brotar3.jpg" style="width:100%;display:block" alt="Capa Relatório BROTAR" />
    <div style="position:absolute;top:31%;left:3%;width:47%;text-align:center;font-size:16pt;font-weight:900;color:#1a7a3a;letter-spacing:3px;font-family:Arial,sans-serif;padding:6px 0">
      EXERCÍCIO ${s}
    </div>
  </div>

  <!-- CONTEÚDO -->
  <div style="padding:40px;box-sizing:border-box">

    <div style="text-align:center;border-bottom:2px solid #003d7a;padding-bottom:16px;margin-bottom:30px">
      <div style="font-size:14pt;font-weight:bold;color:#003d7a;text-transform:uppercase">PROGRAMA BROTAR</div>
      <div style="font-size:11pt;color:#555">Relatório Anual de Atividades — Exercício ${s}</div>
      <div style="font-size:10pt;color:#555;margin-top:4px">Profissional: <strong>${n}</strong></div>
      <div style="font-size:10pt;color:#555">Especialidade: <strong>${$}</strong></div>
    </div>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">1. APRESENTAÇÃO INSTITUCIONAL</h2>
    <p style="text-align:justify;margin:8px 0">O Programa BROTAR constitui uma política pública municipal voltada ao acompanhamento especializado de estudantes com necessidades educacionais específicas da rede municipal de ensino de Brotas de Macaúbas/BA. No exercício de ${s}, o programa consolidou suas ações multidisciplinares, atendendo a ${l} aluno(s) únicos por meio de ${c} agendamentos, com taxa de comparecimento de ${y}%.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">2. OBJETIVOS DO PROGRAMA</h2>
    <p style="text-align:justify;margin:8px 0">Promover suporte multidisciplinar especializado aos estudantes da rede municipal, fortalecendo a inclusão escolar, o acompanhamento familiar e o apoio pedagógico. O programa tem como metas: garantir o acesso de todos os alunos com necessidades específicas ao atendimento especializado; promover a articulação entre escola, família e equipe técnica; e produzir documentos técnicos que subsidiem as práticas pedagógicas inclusivas.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">3. ESTRUTURA ORGANIZACIONAL</h2>
    <p style="text-align:justify;margin:8px 0">A equipe técnica do Programa BROTAR atuou de forma integrada no exercício de ${s}, promovendo atendimento multidisciplinar, visitas escolares e acompanhamento contínuo. Compõem a equipe os seguintes profissionais:</p>
    <ul style="margin:8px 0 8px 20px">
      ${g.length>0?g.map(t=>`<li>${t}</li>`).join(""):"<li>Equipe multiprofissional conforme quadro funcional vigente</li>"}
    </ul>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">4. ABRANGÊNCIA TERRITORIAL</h2>
    <p style="text-align:justify;margin:8px 0">Os atendimentos foram realizados nas seguintes unidades: ${Object.keys(f).join(", ")||"SEDE e COCAL"}. O programa manteve ações itinerantes em comunidades rurais, assegurando o atendimento educacional especializado aos estudantes com dificuldade de acesso à sede municipal, ampliando assim a abrangência territorial do serviço.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">5. METODOLOGIA DE ATENDIMENTO</h2>
    <p style="text-align:justify;margin:8px 0">Os atendimentos seguem fluxo técnico composto pelas seguintes etapas: (1) encaminhamento pela escola ou família; (2) triagem e acolhimento inicial; (3) avaliação multidisciplinar; (4) elaboração de plano de acompanhamento individualizado; (5) atendimento especializado sistemático; e (6) monitoramento contínuo com registro no Sistema BROTAR. No exercício de ${s}, foram realizados ${r} atendimentos efetivos, representando ${y}% de aproveitamento dos agendamentos.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">6. AÇÕES DESENVOLVIDAS</h2>
    <p style="text-align:justify;margin:8px 0">Durante o exercício de ${s} foram realizadas as seguintes ações: atendimentos especializados individuais e em grupo; visitas técnicas às unidades escolares da rede municipal; reuniões de orientação familiar; produção de relatórios técnicos, pareceres e encaminhamentos; ações de formação e orientação para professores; e lançamento de ${u} registro(s) histórico(s) de atendimentos realizados em períodos anteriores.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">7. INDICADORES QUANTITATIVOS</h2>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:10pt">
      <tr style="background:#003d7a;color:#fff">
        <th style="border:1px solid #ccc;padding:8px 10px;text-align:left">Indicador</th>
        <th style="border:1px solid #ccc;padding:8px 10px;text-align:center">Quantidade</th>
      </tr>
      <tr style="background:#f5f5f5"><td style="border:1px solid #ccc;padding:6px 10px">Total de agendamentos realizados</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center"><strong>${c}</strong></td></tr>
      <tr><td style="border:1px solid #ccc;padding:6px 10px">Atendimentos efetivamente realizados</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center"><strong>${r}</strong></td></tr>
      <tr style="background:#f5f5f5"><td style="border:1px solid #ccc;padding:6px 10px">Alunos/pacientes únicos atendidos</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center"><strong>${l}</strong></td></tr>
      <tr><td style="border:1px solid #ccc;padding:6px 10px">Faltas registradas</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${j}</td></tr>
      <tr style="background:#f5f5f5"><td style="border:1px solid #ccc;padding:6px 10px">Cancelamentos</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${h}</td></tr>
      <tr><td style="border:1px solid #ccc;padding:6px 10px">Lançamentos históricos (retroativos)</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${u}</td></tr>
      <tr style="background:#e8f5e9"><td style="border:1px solid #ccc;padding:6px 10px"><strong>Taxa de comparecimento</strong></td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center"><strong>${y}%</strong></td></tr>
      <tr><td style="border:1px solid #ccc;padding:6px 10px">Profissionais atuantes</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${g.length}</td></tr>
    </table>

    <p style="font-size:10pt;font-weight:bold;color:#003d7a;margin:16px 0 8px">Distribuição por Especialidade:</p>
    <table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:10pt">
      <tr style="background:#003d7a;color:#fff">
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:left">Especialidade</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">Agendamentos</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">Realizados</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">Alunos</th>
      </tr>
      ${R}
    </table>

    <p style="font-size:10pt;font-weight:bold;color:#003d7a;margin:16px 0 8px">Atendimentos por Mês — ${s}:</p>
    <table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:10pt">
      <tr style="background:#003d7a;color:#fff">
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:left">Mês</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">Atendimentos</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">% do Total</th>
      </tr>
      ${Array.from({length:12},(t,i)=>i).filter(t=>b[t]>0).map((t,i)=>`
      <tr style="${i%2===0?"background:#f5f5f5":""}">
        <td style="border:1px solid #ccc;padding:6px 10px">${E[t]}</td>
        <td style="border:1px solid #ccc;padding:6px 10px;text-align:center"><strong>${b[t]}</strong></td>
        <td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${c>0?Math.round(b[t]/c*100):0}%</td>
      </tr>`).join("")}
    </table>

    <p style="font-size:10pt;font-weight:bold;color:#003d7a;margin:16px 0 8px">Escolas Atendidas:</p>
    <table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:10pt">
      <tr style="background:#003d7a;color:#fff">
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:left">Escola</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">Alunos</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">Atendimentos</th>
      </tr>
      ${Object.entries(w).sort((t,i)=>i[1].atendimentos-t[1].atendimentos).map(([t,i],A)=>`
      <tr style="${A%2===0?"background:#f5f5f5":""}">
        <td style="border:1px solid #ccc;padding:6px 10px">${t}</td>
        <td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${i.alunos.size}</td>
        <td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${i.atendimentos}</td>
      </tr>`).join("")}
    </table>

    ${d.length>0?`
    <p style="font-size:10pt;font-weight:bold;color:#003d7a;margin:16px 0 8px">Últimos Atendimentos Realizados:</p>
    <table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:9pt">
      <tr style="background:#003d7a;color:#fff">
        <th style="border:1px solid #ccc;padding:6px 8px;text-align:left">Data</th>
        <th style="border:1px solid #ccc;padding:6px 8px;text-align:left">Aluno</th>
        <th style="border:1px solid #ccc;padding:6px 8px;text-align:center">Horário</th>
        <th style="border:1px solid #ccc;padding:6px 8px;text-align:center">Unidade</th>
        <th style="border:1px solid #ccc;padding:6px 8px;text-align:center">Status</th>
      </tr>
      ${d.map((t,i)=>`
      <tr style="${i%2===0?"background:#f5f5f5":""}">
        <td style="border:1px solid #ccc;padding:5px 8px">${t.date?new Date(t.date+"T12:00").toLocaleDateString("pt-BR"):"—"}</td>
        <td style="border:1px solid #ccc;padding:5px 8px">${t.studentName||"—"}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;text-align:center">${t.startTime||"—"} – ${t.endTime||"—"}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;text-align:center">${t.unit||"—"}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;text-align:center">${t.status||"—"}</td>
      </tr>`).join("")}
    </table>`:""}

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">8. ATENDIMENTO ITINERANTE – ZONA RURAL</h2>
    <p style="text-align:justify;margin:8px 0">As equipes do Programa BROTAR realizaram deslocamentos periódicos para comunidades rurais do município de Brotas de Macaúbas/BA, assegurando o atendimento educacional especializado aos estudantes com dificuldade de acesso à sede. Esta ação representa o compromisso do programa com a equidade no acesso aos serviços especializados, independentemente da localização geográfica do aluno.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">9. VISITAS TÉCNICAS ESCOLARES</h2>
    <p style="text-align:justify;margin:8px 0">As visitas técnicas às unidades escolares da rede municipal possibilitaram a observação pedagógica direta, a orientação aos professores regentes sobre estratégias inclusivas, e o acompanhamento da inclusão escolar dos alunos atendidos pelo programa. Estas visitas constituem elo fundamental entre o atendimento especializado e a prática pedagógica cotidiana.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">10. PRODUÇÃO TÉCNICA</h2>
    <p style="text-align:justify;margin:8px 0">No exercício de ${s}, a equipe técnica produziu relatórios técnicos individualizados, pareceres especializados, encaminhamentos para outros serviços da rede de proteção social e educacional, planos de acompanhamento individual, e documentos institucionais. Toda a produção técnica foi registrada no Sistema BROTAR, garantindo rastreabilidade e transparência nos registros.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">11. DESAFIOS INSTITUCIONAIS</h2>
    <p style="text-align:justify;margin:8px 0">A crescente demanda por atendimentos especializados, as distâncias territoriais do município, a necessidade de ampliação da estrutura física e de recursos humanos, e o desafio de garantir continuidade dos atendimentos durante períodos de recesso escolar constituem os principais desafios permanentes do programa. A equipe tem buscado soluções criativas e eficientes para superar essas limitações.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">12. RESULTADOS E IMPACTOS</h2>
    <p style="text-align:justify;margin:8px 0">O Programa BROTAR contribuiu significativamente no exercício de ${s} para o fortalecimento da inclusão escolar, o apoio qualificado às famílias, e o acompanhamento multidisciplinar de ${l} estudantes com necessidades educacionais específicas. Os resultados demonstram o impacto positivo das ações na qualidade de vida e no desempenho escolar dos alunos atendidos, refletindo o compromisso da Secretaria Municipal de Educação com a educação inclusiva e de qualidade.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">13. CONSIDERAÇÕES FINAIS</h2>
    <p style="text-align:justify;margin:8px 0">O Programa BROTAR consolidou-se como importante instrumento de apoio à educação inclusiva no município de Brotas de Macaúbas/BA no exercício de ${s}. Com ${r} atendimentos realizados, ${l} alunos beneficiados e equipe de ${g.length} profissional(is) dedicado(s), o programa reafirma seu papel estratégico na garantia do direito à educação de qualidade para todos os estudantes da rede municipal, em consonância com os princípios da Lei Brasileira de Inclusão (Lei nº 13.146/2015) e da Política Nacional de Educação Especial na Perspectiva da Educação Inclusiva.</p>

    <!-- ASSINATURAS -->
    <div style="margin-top:60px;page-break-inside:avoid">
      <p style="margin-bottom:40px">Brotas de Macaúbas/BA, ${z}.</p>
      <div style="display:flex;justify-content:space-around;margin-top:20px">
        <div style="text-align:center;width:280px">
          <div style="border-top:1px solid #000;padding-top:8px">
            <div style="font-weight:bold">Coordenação do Programa BROTAR</div>
          </div>
        </div>
        <div style="text-align:center;width:280px">
          <div style="border-top:1px solid #000;padding-top:8px">
            <div style="font-weight:bold">Secretária Municipal de Educação</div>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>
  `.trim()}export{xe as RelatorioAnualTCM};
