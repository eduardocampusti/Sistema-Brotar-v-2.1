import{j as e}from"./vendor-utils-DrLvZqkZ.js";import{b as g,o as C,p as F,u as q,O as D,S as U,c as G,a9 as V}from"./vendor-ui-9VhDV4ZH.js";import{u as X,a as Z}from"./index-C9Rx9zR7.js";import{G as _}from"./geminiService-DTfoLb1U.js";import"./vendor-pdf-CpiGyxgF.js";import"./vendor-supabase-CbM-anGD.js";import"./vendor-ai-BER3QIUg.js";const Y=[{label:"Psicopedagogia",value:"Psicopedagogia"},{label:"Psicologia",value:"Psicologia"},{label:"Fonoaudiologia",value:"Fonoaudiologia"},{label:"Terapia Ocupacional",value:"Terapia Ocupacional"},{label:"Fisioterapia",value:"Fisioterapia"},{label:"Nutrição",value:"Nutrição"},{label:"Serviço Social",value:"Serviço Social"},{label:"Todas as Especialidades",value:"TODAS"}],M=new Date().getFullYear(),H=Array.from({length:5},(s,p)=>M-p),ie=({currentUser:s})=>{const{addToast:p}=X(),[o,u]=g.useState(M),[d,A]=g.useState("TODAS"),[m,x]=g.useState(!1),[f,r]=g.useState(null),[b,h]=g.useState(""),[N,E]=g.useState(""),O=async()=>{x(!0),r(null),h("");try{const a=`${o}-01-01`,P=`${o}-12-31`,j=await Z.getAppointments({fromDate:a,toDate:P}),n=d==="TODAS"?j:j.filter(t=>t.specialty===d);if(n.length===0){r(`Nenhum atendimento encontrado para ${d==="TODAS"?"o período":d} no ano ${o}.`),x(!1);return}const y=n.length,T=n.filter(t=>["ATENDIDO","ENCERRADO","EM_ATENDIMENTO"].includes(t.status)).length,S=n.filter(t=>t.status==="FALTOU").length,z=n.filter(t=>t.status==="CANCELADO").length,w=n.filter(t=>t.status==="RETROATIVO").length,I=new Set(n.map(t=>t.studentId)).size,c={};n.forEach(t=>{const i=t.specialty||"Não informada";c[i]||(c[i]={total:0,atendidos:0,alunos:new Set}),c[i].total++,["ATENDIDO","ENCERRADO"].includes(t.status)&&c[i].atendidos++,c[i].alunos.add(t.studentId)});const v={};n.forEach(t=>{const i=t.unit||"Não informada";v[i]=(v[i]||0)+1});const $=Array.from(new Set(n.map(t=>t.professionalName))).filter(Boolean),B=y>0?Math.round(T/y*100):0,k=`
DADOS REAIS DO SISTEMA BROTAR — ANO ${o}
Especialidade(s): ${d==="TODAS"?"Todas":d}
Total de agendamentos: ${y}
Atendimentos realizados: ${T}
Faltas: ${S} | Cancelamentos: ${z} | Retroativos: ${w}
Alunos únicos atendidos: ${I}
Taxa de comparecimento: ${B}%
Profissionais: ${$.join(", ")}
Por especialidade: ${Object.entries(c).map(([t,i])=>`${t}: ${i.total} agend., ${i.atendidos} realizados, ${i.alunos.size} alunos`).join(" | ")}
Por unidade: ${Object.entries(v).map(([t,i])=>`${t}: ${i}`).join(" | ")}
      `.trim();let R;try{const t=`Você é redator oficial do Programa BROTAR de Brotas de Macaúbas/BA. Com base nos dados reais abaixo, complemente e enriqueça o relatório anual institucional para prestação de contas ao TCM/BA referente ao ano ${o}. Use linguagem técnica, formal e institucional. Para cada seção, escreva parágrafos completos e detalhados baseados nos dados fornecidos. NÃO deixe campos em branco — substitua todos os "XXXX" pelos valores reais. ${k}`;R=await _.generateOfficialDocument("Relatório Anual TCM",{fullName:"Rede Municipal",school:{schoolName:"Brotas de Macaúbas"}},s.name,"Secretária de Educação",t)}catch{R=J(o,d,$,T,I,S,z,w,y,B,c,v)}const L=`TCM-${o}-${Math.floor(Math.random()*9e4)+1e4}`;E(L),h(R),p("Relatório anual gerado com sucesso!","success")}catch{r("Erro ao gerar relatório. Verifique a conexão e tente novamente.")}finally{x(!1)}},l=()=>{const a=window.open("","_blank","width=1000,height=900");a&&(a.document.write(`<!DOCTYPE html><html><head><title>Relatório Anual TCM ${o}</title>
    <style>
      @page { size: A4; margin: 0; }
      body { margin: 0; padding: 0; font-family: 'Times New Roman', serif; }
      @media print { .no-print { display: none; } }
    </style></head><body>${b}</body></html>`),a.document.close(),setTimeout(()=>{a.print()},800))};return e.jsxs("div",{className:"max-w-6xl mx-auto space-y-6 pb-12",children:[e.jsxs("div",{className:"rounded-3xl p-6 text-white",style:{background:"linear-gradient(135deg, #8B1A3A, #6B1230)"},children:[e.jsxs("div",{className:"flex items-center gap-3 mb-2",children:[e.jsx("div",{className:"p-2 rounded-xl",style:{background:"rgba(255,255,255,0.15)"},children:e.jsx(C,{size:24})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-black tracking-tight",children:"Relatório Anual — TCM"}),e.jsx("p",{className:"text-sm",style:{color:"rgba(255,255,255,0.70)"},children:"Tribunal de Contas dos Municípios da Bahia"})]})]}),e.jsx("p",{className:"text-xs mt-3",style:{color:"rgba(255,255,255,0.60)"},children:"Gera automaticamente o relatório institucional anual seguindo o modelo oficial do Programa BROTAR, com dados reais do sistema preenchidos pela IA."})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-6",children:[e.jsx("div",{className:"lg:col-span-1",children:e.jsxs("div",{className:"bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5 sticky top-6",children:[e.jsx("h2",{className:"text-sm font-black text-slate-700 uppercase tracking-wider",children:"Configurar Relatório"}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2",children:"Ano de Referência"}),e.jsxs("div",{className:"relative",children:[e.jsx(F,{className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400",size:16}),e.jsx("select",{className:"w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-700 font-semibold appearance-none text-sm",value:o,onChange:a=>u(Number(a.target.value)),children:H.map(a=>e.jsx("option",{value:a,children:a},a))})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2",children:"Especialidade"}),e.jsxs("div",{className:"relative",children:[e.jsx(q,{className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400",size:16}),e.jsx("select",{className:"w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-700 font-semibold appearance-none text-sm",value:d,onChange:a=>A(a.target.value),children:Y.map(a=>e.jsx("option",{value:a.value,children:a.label},a.value))})]})]}),e.jsxs("button",{onClick:O,disabled:m,className:"w-full py-4 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95",style:{background:"linear-gradient(135deg, #8B1A3A, #6B1230)"},children:[m?e.jsx(D,{size:18,className:"animate-spin"}):e.jsx(U,{size:18}),m?"Gerando com IA...":"Gerar Relatório TCM"]}),f&&e.jsxs("div",{className:"p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2 items-start",children:[e.jsx(G,{size:16,className:"text-red-500 shrink-0 mt-0.5"}),e.jsx("p",{className:"text-red-600 text-xs",children:f})]}),e.jsx("div",{className:"border-t border-slate-100 pt-4",children:e.jsx("p",{className:"text-[10px] text-slate-400 font-medium",children:"📄 Modelo baseado no PDF oficial do Programa BROTAR com 13 seções, tabela de indicadores e página de assinaturas."})})]})}),e.jsx("div",{className:"lg:col-span-2",children:b?e.jsxs("div",{className:"bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden",children:[e.jsxs("div",{className:"flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("span",{className:"text-xs font-black text-slate-500 bg-slate-200 px-2 py-1 rounded-lg",children:["#",N]}),e.jsxs("span",{className:"text-xs text-slate-500 font-medium",children:["Relatório Anual ",o]})]}),e.jsxs("button",{onClick:l,className:"flex items-center gap-2 px-4 py-2 text-white rounded-xl text-xs font-bold transition-all",style:{background:"#8B1A3A"},children:[e.jsx(V,{size:14})," Imprimir PDF"]})]}),e.jsx("div",{className:"overflow-y-auto max-h-[700px]",dangerouslySetInnerHTML:{__html:b}})]}):e.jsx("div",{className:"bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[400px] text-center p-8",children:m?e.jsxs(e.Fragment,{children:[e.jsx(D,{size:48,className:"animate-spin mb-4",style:{color:"#8B1A3A"}}),e.jsx("p",{className:"font-bold text-slate-700",children:"Coletando dados e gerando relatório..."}),e.jsx("p",{className:"text-slate-400 text-sm mt-2",children:"A IA está preenchendo todas as 13 seções"})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100",children:e.jsx(C,{size:32,className:"text-slate-300"})}),e.jsx("p",{className:"font-bold text-slate-500",children:"Configure e gere o relatório"}),e.jsx("p",{className:"text-slate-400 text-sm mt-1",children:"O modelo seguirá o padrão oficial do PDF do BROTAR"})]})})})]})]})};function J(s,p,o,u,d,A,m,x,f,r,b,h){const N=new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"}),E=p==="TODAS"?"Todas as especialidades":p,O=Object.entries(b).map(([l,a])=>`
    <tr>
      <td style="border:1px solid #ccc;padding:6px 10px">${l}</td>
      <td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${a.total}</td>
      <td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${a.atendidos}</td>
      <td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${a.alunos.size}</td>
    </tr>`).join("");return`
<div style="font-family:'Times New Roman',serif;color:#000;line-height:1.6;max-width:800px;margin:0 auto">

  <!-- CAPA -->
  <div style="page-break-after:always;min-height:1100px;background:#fff;padding:40px;box-sizing:border-box;position:relative;border-bottom:4px solid #003d7a">

    <!-- Cabeçalho institucional -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:20px;border-bottom:2px solid #003d7a;margin-bottom:30px">
      <div style="text-align:center;flex:1">
        <div style="font-size:11pt;color:#003d7a;font-weight:bold;text-transform:uppercase;letter-spacing:1px">Prefeitura Municipal</div>
        <div style="font-size:20pt;color:#003d7a;font-weight:900;text-transform:uppercase;letter-spacing:2px">BROTAS DE MACAÚBAS</div>
        <div style="font-size:9pt;color:#555;font-style:italic">A força do povo é o trabalho</div>
      </div>
      <div style="width:2px;height:80px;background:#003d7a;margin:0 30px"></div>
      <div style="text-align:center;flex:1">
        <div style="font-size:9pt;color:#555">Secretaria Municipal de</div>
        <div style="font-size:22pt;color:#003d7a;font-weight:900;text-transform:uppercase;letter-spacing:1px">EDUCAÇÃO</div>
        <div style="font-size:9pt;color:#003d7a;font-weight:bold">BROTAS DE MACAÚBAS – BA</div>
      </div>
    </div>

    <!-- Título principal -->
    <div style="text-align:center;margin:40px 0 20px">
      <div style="font-size:18pt;color:#003d7a;font-weight:bold;text-transform:uppercase;letter-spacing:2px">RELATÓRIO ANUAL DE</div>
      <div style="font-size:42pt;color:#003d7a;font-weight:900;text-transform:uppercase;letter-spacing:3px;line-height:1">ATIVIDADES</div>
      <div style="display:inline-block;background:#10B981;color:#fff;font-size:16pt;font-weight:900;letter-spacing:3px;padding:6px 30px;margin-top:10px;border-radius:4px">EXERCÍCIO ${s}</div>
    </div>

    <!-- Logo BROTAR -->
    <div style="text-align:center;margin:30px 0">
      <div style="font-size:48pt;font-weight:900;letter-spacing:-2px;margin-bottom:5px">
        <span style="color:#003d7a">Br</span><span style="color:#10B981">o</span><span style="color:#F59E0B">t</span><span style="color:#EF4444">a</span><span style="color:#8B5CF6">r</span>
      </div>
      <div style="font-size:13pt;color:#003d7a;font-weight:bold;letter-spacing:1px">Centro Multidisciplinar</div>
      <div style="font-size:13pt;color:#003d7a;font-weight:bold">em Educação Inclusiva</div>
      <div style="font-size:12pt;color:#10B981;font-style:italic;margin-top:8px">Acolher, incluir e transformar vidas.</div>
    </div>

    <!-- Ícones das 6 ações -->
    <div style="display:flex;justify-content:center;gap:16px;margin:30px 0;flex-wrap:wrap">
      ${[{icon:"👥",label:`ATENDIMENTO
ESPECIALIZADO`},{icon:"🏫",label:`VISITAS TÉCNICAS
ESCOLARES`},{icon:"👨‍👩‍👧",label:`ATENDIMENTO
ÀS FAMÍLIAS`},{icon:"📍",label:`ATENDIMENTO
ZONA RURAL`},{icon:"📋",label:`AVALIAÇÕES E
ACOMPANHAMENTOS`},{icon:"📈",label:`INCLUSÃO,
APRENDIZAGEM E VIDA`}].map(l=>`
        <div style="text-align:center;width:100px">
          <div style="font-size:28pt;margin-bottom:4px">${l.icon}</div>
          <div style="font-size:7pt;font-weight:bold;color:#003d7a;text-transform:uppercase;line-height:1.3;white-space:pre-line">${l.label}</div>
        </div>
      `).join("")}
    </div>

    <!-- Rodapé da capa -->
    <div style="border-top:2px solid #003d7a;margin-top:30px;padding-top:16px;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:10pt;color:#333;font-style:italic">
        <span style="font-size:20pt;color:#003d7a">"</span> A inclusão não é um favor.<br/>É um direito e um compromisso de todos. <span style="font-size:20pt;color:#003d7a">"</span>
      </div>
      <div style="text-align:right">
        <div style="font-size:10pt;color:#003d7a;font-weight:bold">BROTAS DE MACAÚBAS – BA</div>
        <div style="font-size:9pt;color:#555">Janeiro a Dezembro de ${s}</div>
      </div>
    </div>
  </div>

  <!-- CONTEÚDO -->
  <div style="padding:40px;box-sizing:border-box">

    <div style="text-align:center;border-bottom:2px solid #003d7a;padding-bottom:16px;margin-bottom:30px">
      <div style="font-size:14pt;font-weight:bold;color:#003d7a;text-transform:uppercase">PROGRAMA BROTAR</div>
      <div style="font-size:11pt;color:#555">Relatório Anual de Atividades — Exercício ${s}</div>
      <div style="font-size:10pt;color:#555">Especialidade(s): ${E}</div>
    </div>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">1. APRESENTAÇÃO INSTITUCIONAL</h2>
    <p style="text-align:justify;margin:8px 0">O Programa BROTAR constitui uma política pública municipal voltada ao acompanhamento especializado de estudantes com necessidades educacionais específicas da rede municipal de ensino de Brotas de Macaúbas/BA. No exercício de ${s}, o programa consolidou suas ações multidisciplinares, atendendo a ${d} aluno(s) únicos por meio de ${f} agendamentos, com taxa de comparecimento de ${r}%.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">2. OBJETIVOS DO PROGRAMA</h2>
    <p style="text-align:justify;margin:8px 0">Promover suporte multidisciplinar especializado aos estudantes da rede municipal, fortalecendo a inclusão escolar, o acompanhamento familiar e o apoio pedagógico. O programa tem como metas: garantir o acesso de todos os alunos com necessidades específicas ao atendimento especializado; promover a articulação entre escola, família e equipe técnica; e produzir documentos técnicos que subsidiem as práticas pedagógicas inclusivas.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">3. ESTRUTURA ORGANIZACIONAL</h2>
    <p style="text-align:justify;margin:8px 0">A equipe técnica do Programa BROTAR atuou de forma integrada no exercício de ${s}, promovendo atendimento multidisciplinar, visitas escolares e acompanhamento contínuo. Compõem a equipe os seguintes profissionais:</p>
    <ul style="margin:8px 0 8px 20px">
      ${o.length>0?o.map(l=>`<li>${l}</li>`).join(""):"<li>Equipe multiprofissional conforme quadro funcional vigente</li>"}
    </ul>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">4. ABRANGÊNCIA TERRITORIAL</h2>
    <p style="text-align:justify;margin:8px 0">Os atendimentos foram realizados nas seguintes unidades: ${Object.keys(h).join(", ")||"SEDE e COCAL"}. O programa manteve ações itinerantes em comunidades rurais, assegurando o atendimento educacional especializado aos estudantes com dificuldade de acesso à sede municipal, ampliando assim a abrangência territorial do serviço.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">5. METODOLOGIA DE ATENDIMENTO</h2>
    <p style="text-align:justify;margin:8px 0">Os atendimentos seguem fluxo técnico composto pelas seguintes etapas: (1) encaminhamento pela escola ou família; (2) triagem e acolhimento inicial; (3) avaliação multidisciplinar; (4) elaboração de plano de acompanhamento individualizado; (5) atendimento especializado sistemático; e (6) monitoramento contínuo com registro no Sistema BROTAR. No exercício de ${s}, foram realizados ${u} atendimentos efetivos, representando ${r}% de aproveitamento dos agendamentos.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">6. AÇÕES DESENVOLVIDAS</h2>
    <p style="text-align:justify;margin:8px 0">Durante o exercício de ${s} foram realizadas as seguintes ações: atendimentos especializados individuais e em grupo; visitas técnicas às unidades escolares da rede municipal; reuniões de orientação familiar; produção de relatórios técnicos, pareceres e encaminhamentos; ações de formação e orientação para professores; e lançamento de ${x} registro(s) histórico(s) de atendimentos realizados em períodos anteriores.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">7. INDICADORES QUANTITATIVOS</h2>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:10pt">
      <tr style="background:#003d7a;color:#fff">
        <th style="border:1px solid #ccc;padding:8px 10px;text-align:left">Indicador</th>
        <th style="border:1px solid #ccc;padding:8px 10px;text-align:center">Quantidade</th>
      </tr>
      <tr style="background:#f5f5f5"><td style="border:1px solid #ccc;padding:6px 10px">Total de agendamentos realizados</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center"><strong>${f}</strong></td></tr>
      <tr><td style="border:1px solid #ccc;padding:6px 10px">Atendimentos efetivamente realizados</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center"><strong>${u}</strong></td></tr>
      <tr style="background:#f5f5f5"><td style="border:1px solid #ccc;padding:6px 10px">Alunos/pacientes únicos atendidos</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center"><strong>${d}</strong></td></tr>
      <tr><td style="border:1px solid #ccc;padding:6px 10px">Faltas registradas</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${A}</td></tr>
      <tr style="background:#f5f5f5"><td style="border:1px solid #ccc;padding:6px 10px">Cancelamentos</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${m}</td></tr>
      <tr><td style="border:1px solid #ccc;padding:6px 10px">Lançamentos históricos (retroativos)</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${x}</td></tr>
      <tr style="background:#e8f5e9"><td style="border:1px solid #ccc;padding:6px 10px"><strong>Taxa de comparecimento</strong></td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center"><strong>${r}%</strong></td></tr>
      <tr><td style="border:1px solid #ccc;padding:6px 10px">Profissionais atuantes</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${o.length}</td></tr>
    </table>

    <p style="font-size:10pt;font-weight:bold;color:#003d7a;margin:16px 0 8px">Distribuição por Especialidade:</p>
    <table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:10pt">
      <tr style="background:#003d7a;color:#fff">
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:left">Especialidade</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">Agendamentos</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">Realizados</th>
        <th style="border:1px solid #ccc;padding:7px 10px;text-align:center">Alunos</th>
      </tr>
      ${O}
    </table>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">8. ATENDIMENTO ITINERANTE – ZONA RURAL</h2>
    <p style="text-align:justify;margin:8px 0">As equipes do Programa BROTAR realizaram deslocamentos periódicos para comunidades rurais do município de Brotas de Macaúbas/BA, assegurando o atendimento educacional especializado aos estudantes com dificuldade de acesso à sede. Esta ação representa o compromisso do programa com a equidade no acesso aos serviços especializados, independentemente da localização geográfica do aluno.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">9. VISITAS TÉCNICAS ESCOLARES</h2>
    <p style="text-align:justify;margin:8px 0">As visitas técnicas às unidades escolares da rede municipal possibilitaram a observação pedagógica direta, a orientação aos professores regentes sobre estratégias inclusivas, e o acompanhamento da inclusão escolar dos alunos atendidos pelo programa. Estas visitas constituem elo fundamental entre o atendimento especializado e a prática pedagógica cotidiana.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">10. PRODUÇÃO TÉCNICA</h2>
    <p style="text-align:justify;margin:8px 0">No exercício de ${s}, a equipe técnica produziu relatórios técnicos individualizados, pareceres especializados, encaminhamentos para outros serviços da rede de proteção social e educacional, planos de acompanhamento individual, e documentos institucionais. Toda a produção técnica foi registrada no Sistema BROTAR, garantindo rastreabilidade e transparência nos registros.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">11. DESAFIOS INSTITUCIONAIS</h2>
    <p style="text-align:justify;margin:8px 0">A crescente demanda por atendimentos especializados, as distâncias territoriais do município, a necessidade de ampliação da estrutura física e de recursos humanos, e o desafio de garantir continuidade dos atendimentos durante períodos de recesso escolar constituem os principais desafios permanentes do programa. A equipe tem buscado soluções criativas e eficientes para superar essas limitações.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">12. RESULTADOS E IMPACTOS</h2>
    <p style="text-align:justify;margin:8px 0">O Programa BROTAR contribuiu significativamente no exercício de ${s} para o fortalecimento da inclusão escolar, o apoio qualificado às famílias, e o acompanhamento multidisciplinar de ${d} estudantes com necessidades educacionais específicas. Os resultados demonstram o impacto positivo das ações na qualidade de vida e no desempenho escolar dos alunos atendidos, refletindo o compromisso da Secretaria Municipal de Educação com a educação inclusiva e de qualidade.</p>

    <h2 style="font-size:12pt;font-weight:bold;color:#003d7a;border-left:4px solid #10B981;padding-left:10px;margin-top:24px">13. CONSIDERAÇÕES FINAIS</h2>
    <p style="text-align:justify;margin:8px 0">O Programa BROTAR consolidou-se como importante instrumento de apoio à educação inclusiva no município de Brotas de Macaúbas/BA no exercício de ${s}. Com ${u} atendimentos realizados, ${d} alunos beneficiados e equipe de ${o.length} profissional(is) dedicado(s), o programa reafirma seu papel estratégico na garantia do direito à educação de qualidade para todos os estudantes da rede municipal, em consonância com os princípios da Lei Brasileira de Inclusão (Lei nº 13.146/2015) e da Política Nacional de Educação Especial na Perspectiva da Educação Inclusiva.</p>

    <!-- ASSINATURAS -->
    <div style="margin-top:60px;page-break-inside:avoid">
      <p style="margin-bottom:40px">Brotas de Macaúbas/BA, ${N}.</p>
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
  `.trim()}export{ie as RelatorioAnualTCM};
