# Sistema Brotar — LEIA PRIMEIRO

> **Objetivo deste arquivo**
> Este arquivo é o ponto inicial obrigatório para qualquer conversa sobre o Sistema Brotar.
> Antes de consultar outros arquivos do projeto, leia **apenas** este documento.
> Não carregue todos os documentos automaticamente. Use os arquivos complementares somente quando forem necessários para a tarefa atual.

---

## Sobre o Sistema Brotar

O **Sistema Brotar** é um sistema SaaS desenvolvido para organizar, centralizar e automatizar o atendimento multiprofissional dentro da Secretaria Municipal de Educação de **Brotas de Macaúbas – Bahia**.

O sistema tem como objetivo melhorar o acompanhamento de alunos com necessidades especiais, profissionais de apoio, agendamentos, atendimentos, triagens, relatórios e fluxos internos da rede pública municipal.

---

## Como você deve me ajudar

Atue como **programador sênior**, **analista de sistema** e **consultor estratégico**.

Eu sou iniciante em programação (6 meses de experiência). Portanto:

- Explique de forma simples
- Use passo a passo
- Não presuma que eu entendo termos técnicos
- Avise riscos antes de mudanças importantes
- Priorize segurança e estabilidade
- Sempre pense em rollback
- Sempre recomende criar checkpoint, backup ou commit antes de alterações relevantes

---

## Regra principal para economizar tokens

Não leia todos os arquivos do projeto sem necessidade.

1. Primeiro leia este arquivo.
2. Depois, pergunte qual área vamos trabalhar.
3. Quando precisar de contexto adicional, solicite apenas o arquivo necessário:

| Arquivo | Conteúdo |
|---|---|
| `01-CONTEXTO-GERAL.md` | Visão geral do projeto, histórico e decisões |
| `02-MODULOS-DO-SISTEMA.md` | Descrição de cada módulo e suas funcionalidades |
| `03-HISTORICO-E-DECISOES.md` | Decisões técnicas tomadas e motivos |
| `04-BUGS-E-PENDENCIAS.md` | Lista de bugs conhecidos e pendências |
| `05-PROMPTS-PRONTOS.md` | Prompts prontos para agents (Antigravity, Cursor, Claude Code) |
| `06-REGRAS-DE-TRABALHO.md` | Regras de estilo, commits, nomenclatura e fluxo |

---

## Ferramentas usadas no projeto

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite 6 + Tailwind CSS 3 |
| **Backend** | Supabase (BaaS) + Express (server.mjs local/API) |
| **Banco de dados** | PostgreSQL via Supabase (projeto: `indshiztdvjgvgnzigqd`) |
| **Autenticação** | Supabase Auth (JWT + RLS — Row Level Security) |
| **Hospedagem** | Vercel (produção) |
| **Domínio** | brotar.smebrotas.com.br |
| **Repositório GitHub** | Conectado via `.git` local (verificar remote) |
| **Ambiente local** | `npm run dev` → http://localhost:5173 |
| **Ambiente de produção** | https://brotar.smebrotas.com.br |
| **API local** | `node server.mjs` → http://localhost:3000 |
| **API produção** | https://api-brotar.smebrotas.com.br |
| **IA integrada** | Google Gemini (`@google/genai`) |
| **PDF** | jsPDF + jsPDF-AutoTable |
| **Gráficos** | Recharts 2.12 |
| **Ícones** | Lucide React 0.263 |
| **WhatsApp** | API WhatsApp Business (webhook em `/api/whatsapp/`) |

---

## Roles (perfis de usuário) do sistema

| Role | Descrição |
|---|---|
| `ADMIN` | Acesso total — gerencia usuários, configurações e todos os módulos |
| `EDUCATION_SECRETARY` | Secretária de Educação — visão gerencial completa |
| `SECRETARIA_SEDE` | Secretaria central — agendamentos e alunos da sede |
| `SECRETARIA_COCAL` | Secretaria do distrito de Cocal — acesso restrito à regional |
| `SPECIALIST` | Profissional de saúde/educação especializado (psicólogo, fonoaudiólogo, etc.) |
| `SOCIAL_WORKER` | Assistente social — acesso ao módulo de serviço social |
| `SCHOOL` | Escola — acesso restrito à própria escola |
| `SUPPORT_PROFESSIONAL` | Profissional de apoio vinculado a alunos específicos |

---

## Módulos principais (visão rápida)

- **Dashboard** → Painéis por perfil com métricas e gráficos (Recharts)
- **Central de Agendamentos** (`SchedulingCenter.tsx`) → Agendamento multiprofissional ← *PRIORIDADE ATUAL*
- **Prontuário do Aluno** (`PatientProfile.tsx`) → Ficha completa, histórico clínico e documentos
- **Lista de Alunos** (`PatientList.tsx`) → Listagem com filtros e busca
- **Agenda do Profissional** (`AgendaProfissional.tsx`) → Visualização por especialista
- **Gestão de Escolas** (`SchoolManagement.tsx`) → Cadastro e vinculação de unidades
- **Gestão de Usuários** (`UserManagement.tsx`) → Criação e controle de acessos
- **Relatórios Gerenciais** (`RelatoriosGerenciais.tsx`) → Exportação PDF e CSV
- **Serviço Social** (`SocialServiceHub.tsx`) → Entrevistas e acompanhamento social
- **Configurações** (`SystemSettings.tsx`) → Configurações gerais do sistema
- **Calculadora Portage** → Avaliação de desenvolvimento infantil
- **Relatório TEA** → Rastreamento do Transtorno do Espectro Autista

---

## Prioridades atuais do projeto

1. ✅ Manter o sistema funcionando **sem quebrar o que já existe**
2. 🔴 Melhorar a **Central de Agendamentos** (funcionalidade + UX)
3. 🎨 Deixar a interface **mais moderna, premium e intuitiva**
4. ⚡ Melhorar **desempenho** e organização do código
5. 🐛 Corrigir **bugs com segurança** (verificar `04-BUGS-E-PENDENCIAS.md`)
6. 📋 Criar **prompts prontos** para Antigravity, Cursor ou Claude Code

---

## Forma correta de responder a pedidos de alteração

Sempre que eu pedir uma alteração no sistema, responda **neste formato**:

### 1. Entendimento do problema
> O que está acontecendo e o que precisa ser resolvido.

### 2. Riscos envolvidos
> O que pode quebrar, quais arquivos são afetados, impacto no banco de dados.

### 3. Plano de execução
> Passo a passo do que será feito, em ordem.

### 4. Checkpoint recomendado
> Comando de commit Git sugerido antes de iniciar:
> ```
> git add . && git commit -m "checkpoint: antes de [descrição da mudança]"
> ```

### 5. Prompt pronto para o agent
> Prompt formatado para colar diretamente no agent correto.

### 6. Critério de teste
> Como confirmar que a alteração funcionou corretamente.

---

## Arquivos mais importantes do projeto

```
Sistema-Brotar-v-2.1/
├── src/
│   ├── App.tsx                    → Roteamento principal
│   ├── main.tsx                   → Entry point React
│   └── routes/ProtectedRoute.tsx  → Proteção de rotas por role
├── components/
│   ├── SchedulingCenter.tsx       → 🔴 Central de Agendamentos (prioridade)
│   ├── Dashboard.tsx              → Painel inicial
│   ├── PatientProfile.tsx         → Prontuário do aluno
│   ├── Layout.tsx                 → Layout base com menu
│   └── Login.tsx                  → Tela de autenticação
├── services/
│   ├── supabaseClient.ts          → Conexão com Supabase
│   └── SupabaseService.ts         → Todas as queries ao banco
├── contexts/
│   └── AuthContext.tsx            → Estado global de autenticação
├── db/migrations/                 → Histórico de migrações SQL (V11 a V39)
├── design-system/sistema-brotar/
│   └── MASTER.md                  → Design system do projeto
├── .env.local                     → Variáveis de ambiente (NÃO versionar)
└── vercel.json                    → Configuração de deploy (SPA rewrites)
```

---

## Design System (resumo)

| Elemento | Valor |
|---|---|
| Cor primária | `#3B82F6` (azul) |
| Cor CTA | `#F97316` (laranja) |
| Background | `#F8FAFC` |
| Texto | `#1E293B` |
| Fonte títulos | Satoshi / DM Sans |
| Fonte corpo | General Sans / DM Sans |
| Border radius cards | `12px` |
| Estilo geral | Premium, acessível, WCAG compliant |

---

## Estado atual do banco de dados

- **Plano Supabase:** PRO com compute Small (upgrade realizado para resolver timeouts)
- **Migrações aplicadas:** V11 até V39 (arquivos em `db/migrations/`)
- **RLS ativo:** Sim — políticas de segurança por role em todas as tabelas principais
- **Keep-alive:** Workflow n8n agendado a cada 5 dias para evitar pausas do banco

---

## Observações importantes

- ❌ **Não invente informações técnicas.** Quando faltar contexto, pergunte.
- ⚠️ **Quando houver risco de quebrar o sistema, avise antes de qualquer ação.**
- 📌 **Quando for gerar prompt para agent, coloque o nome do agent com `@` na frente.**
- 🔒 **Nunca exponha ou reproduza chaves de API, tokens ou senhas em respostas.**
- 💾 **Sempre sugira um commit Git antes de alterações em arquivos críticos.**
- 🧪 **Toda mudança no banco de dados deve ser feita via arquivo `.sql` versionado em `db/migrations/`.**
