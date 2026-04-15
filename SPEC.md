# SPEC — Sistema Brotar (referência técnica)

Documento **estritamente técnico** para desenvolvedores. Complementa o `PRD.md` com stack, modelo de dados, RLS e integrações. Versões e caminhos referem-se ao repositório na branch atual.

---

## 1. Tech stack

### 1.1 Frontend

| Tecnologia | Uso no projeto | Referência |
|------------|----------------|------------|
| **React** `^18.3.1` | UI declarativa, hooks, lazy loading de rotas em `src/App.tsx`. | `package.json` |
| **React DOM** `^18.3.1` | Montagem no cliente. | `package.json` |
| **Vite** `^6.2.0` | Dev server (`npm run dev`), build (`vite build`), preview, `loadEnv`, code-splitting manual (`manualChunks`). | `vite.config.ts`, `package.json` |
| **@vitejs/plugin-react** `^5.0.0` | Fast Refresh / JSX. | `package.json` |
| **TypeScript** `~5.8.2` | Tipagem em `.ts` / `.tsx`. | `package.json` |
| **Tailwind CSS** `^3.4.3` | Utilitários de estilo nas `components/`. | `package.json`, `tailwind.config` (se existir na raiz) |
| **PostCSS** + **Autoprefixer** | Pipeline CSS do Tailwind. | `package.json` |
| **react-router-dom** `^7.13.0` | Rotas públicas/autenticadas, layouts. | `src/App.tsx` |
| **Vitest** `^4.0.18` | Testes unitários (`npm run test`). | `package.json` |

**Aliases:** `@` → raiz do repositório (`vite.config.ts` → `path.resolve(__dirname, '.')`), permitindo imports como `@/src/...`.

**Runtime Node:** `engines.node` fixado em **22.x** (`package.json`).

### 1.2 Backend e dados

| Tecnologia | Uso no projeto | Referência |
|------------|----------------|------------|
| **Supabase** | BaaS: Postgres hospedado, **Auth** (`auth.users`), **PostgREST** (API REST), **Row Level Security**, Storage conforme uso. | `@supabase/supabase-js` `^2.91.0`, `services/supabaseClient.ts` |
| **PostgreSQL** | Motor relacional por trás do projeto Supabase; enums e JSONB no schema. | `supabase_schema.sql`, `db/migrations/*.sql` |

**Cliente no browser:** `createClient` em `services/supabaseClient.ts` com:

- `import.meta.env.VITE_SUPABASE_URL`
- `import.meta.env.VITE_SUPABASE_ANON_KEY`

Validação centralizada: `SupabaseService.isConfigValid()`.

### 1.3 Servidor auxiliar (Node)

| Tecnologia | Uso |
|------------|-----|
| **Express** `^4.19.2`, **cors**, **dotenv** | `server.mjs` / `npm run start` — camada HTTP opcional fora do escopo detalhado deste SPEC; não substitui o PostgREST do Supabase para CRUD principal. |

### 1.4 Bibliotecas transversais (amostra)

- **lucide-react** — ícones.
- **jspdf** / **jspdf-autotable** — PDF (chunk `vendor-pdf`).
- **papaparse** — CSV (`vendor-csv`).
- **recharts** — gráficos.
- **react-markdown** — renderização de texto rico onde aplicável.

---

## 2. Arquitetura de dados

### 2.1 Princípio geral

O modelo separa **identidade cadastral** (aluno na rede) de **eventos clínicos** (sessões) e de **artefatos documentais**. Em produção evoluída, a linha `students` também agrega **JSONB** para formulários ricos e desnormalização controlada; o serviço TypeScript trata isso de forma unificada no tipo `Student`.

### 2.2 Tabelas principais (visão de engenharia)

| Tabela / recurso | Papel técnico |
|------------------|---------------|
| **`schools`** | Unidades escolares (INEP, distrito, flags). FK de `students.school_id`. |
| **`students`** | **Ficha âncora** + colunas evolutivas: identificação, vínculo escolar, `guardians` / `address` em **JSONB**, e **`clinical_info` JSONB** no app (mapeado para `Student.clinical` em `mapStudentFromDB`). Outros JSONB usados pelo serviço: `educational_info`, `social_info` / `family_info`, `documents`. |
| **`clinical_sessions`** | Uma linha por sessão/atendimento: `student_id`, `professional_id` → `auth.users`, **`specialty`** (enum alinhado a `specialty_type`), `date`, **`content` JSONB** (estrutura por especialidade), `private_notes`, campos de auditoria em migrations (`status`, `hash_auditoria`, etc.). |
| **`student_documents`** | Metadados de documentos clínicos/oficiais por aluno, com `specialty` e `professional_id`. |
| **`generated_documents`** | Histórico de documentos gerados pela UI (ex.: fluxo do `DocumentGenerator`), persistidos via `SupabaseService.saveDocument` / `getDocuments`. |
| **`appointments`** | Agenda: aluno, profissional, especialidade, unidade (`SEDE`/`COCAL`), janela horária, status. |
| **`profiles`** | Espelho público do usuário: `role`, `specialty`, escopos/distrito, vínculo escola (`school_id`) para perfil `ESCOLA`. |
| **`support_professionals`** | Profissionais de apoio escolar + `attachments` JSONB (migração V14). |
| **`audit_logs`**, **`system_settings`**, **`portage_assessments`** | Auditoria, configuração de tema/nome, avaliações IPO/Portage conforme módulos ativos. |

### 2.3 Separação aluno × sessões e uso de JSONB

**Camada relacional “fina” (sessões):**  
`clinical_sessions.content` é **`jsonb NOT NULL`** com payload heterogêneo (ex.: resumo, objetivos, instrumentos) — uma coluna serve a várias especialidades sem migração de coluna por área.

**Camada agregada no aluno:**  
O front consome `students.clinical_info` como objeto **`ClinicalInfo`** (`types.ts`): diagnóstico, medicamentos, alergias, e blobs por área (`psych_data`, `pp_data`, `social_data`, etc.). `SupabaseService`:

- Lê `clinical_info` e atribui a `Student.clinical` (`mapStudentFromDB`).
- Na gravação (`saveStudent`), serializa subconjuntos de `student.clinical` de volta para **`clinical_info`** no payload SQL, sem sanitização recursiva destrutiva nos campos listados em `JSONB_FIELDS` (comentário explícito no código).

**Histórico de sessões:**  
`getStudentSessions` consulta `clinical_sessions` e o `mapStudentFromDB` pode receber sessões mapeadas para `Student.history` (`Session[]` com `content` preservado).

**Implicação para desenvolvedores:** alterar o shape de um formulário clínico exige alinhar **TypeScript** (`ClinicalInfo` / tipos por página), **payload JSONB** (`clinical_info` ou `content` da sessão) e, se necessário, **políticas RLS** que dependem de `specialty` / `professional_id`.

### 2.4 Fonte de verdade do schema

- Baseline narrativo: `supabase_schema.sql`.
- **Migrations incrementais:** `db/migrations/V*.sql` (RLS de alunos, appointments, prontuário restrito, exclusão lógica de agendamentos, índices, etc.). O ambiente deployado pode divergir do arquivo baseline; priorize as migrations aplicadas no projeto Supabase.

---

## 3. Segurança técnica (RLS)

O Supabase aplica **Row Level Security** no Postgres: toda query REST do cliente usa o JWT do usuário; `auth.uid()` e `auth.jwt()` entram nas expressões `USING` / `WITH CHECK`.

### 3.1 `clinical_sessions` — isolamento por especialidade e autor

Políticas **de referência** em `supabase_schema.sql`:

| Operação | Ideia implementada |
|----------|---------------------|
| **SELECT** | Linha visível se `professional_id = auth.uid()` **ou** `specialty` igual à `profiles.specialty` do usuário **ou** papel `ADMIN` (auditoria). |
| **INSERT** | `specialty` deve coincidir com a do perfil **e** `professional_id` deve ser `auth.uid()`. |
| **UPDATE** | Apenas onde `professional_id = auth.uid()` (não edita sessão de colega). |
| **DELETE** | Ausência de policy para `authenticated` → delete via API cliente tipicamente **negado** (retenção/auditoria). |

**Endurecimento opcional (ex.: psicologia):** `update_psychology_security.sql` substitui a leitura ampla por **mesma especialidade** por **“isolamento de namespace”**: `SELECT` apenas se `professional_id = auth.uid()` ou `ADMIN`; `UPDATE` bloqueado quando `status = 'FINALIZADA'`; `INSERT` com `professional_id = auth.uid()`.

> **Nota de implementação:** o arquivo `update_psychology_security.sql` remove políticas por nome; em ambientes reais, versionar equivalente em `db/migrations` e validar ordem de aplicação.

### 3.2 `students` — leitura por função e vínculo com agenda

O baseline (`supabase_schema.sql`) permite **SELECT** a usuários com perfil ativo e restringe **INSERT/UPDATE** a papéis de cadastro (`ADMIN`, `EDUCATION_SECRETARY`).

As migrations **V19/V20/V22** introduzem a função **`public.can_select_student(uuid)`** (SECURITY DEFINER, `STABLE`), usada para refinar **quem vê qual aluno**:

- Papéis operacionais amplos (admin, secretarias, assistente, coordenação, etc.) — conforme lista na função.
- Perfil **ESCOLA** — aluno na mesma `school_id` do perfil.
- **`SPECIALIST`** cuja especialidade está em **`prontuario_especialidades_restritas()`** — só se existir **`appointments`** ligando `auth.uid()` ao `student_id` com status em **`prontuario_status_agendamento_vinculo()`** (evolução em V22 inclui estados adicionais como `AGENDADO` conforme migration aplicada).
- **Outros especialistas** — visão ampliada de alunos (não listados como “restritos”).

O front espelha a intenção em `getAlunosPorPerfil` + `src/config/perfilRestrito.ts`; **a fonte autoritativa de exposição na API é a RLS** após as migrations.

### 3.3 `appointments`

`db/migrations/V15_appointments_rls.sql` documenta a estratégia: políticas recriadas em bloco `DO $$`, função auxiliar **`appointments_is_scheduling_staff()`** para recepção/secretarias/admin, e regras separadas para especialistas criarem/atualizarem linhas na **própria especialidade**. Leitura costuma ser ampla para autenticados para suportar calendários; revisar políticas vigentes no banco antes de assumir comportamento em produção.

### 3.4 Outras superfícies

- **`profiles`**, **`schools`**, **`support_professionals`**, **`generated_documents`**: cada uma possui RLS nas migrations correspondentes (ex.: V16 suporte, políticas de documentos). Consultar `db/migrations` e `pg_policies` no ambiente.
- **RPCs** (`delete_user_complete`, `set_user_password`, etc.): executadas com privilégios definidos no SQL; não passam pelo mesmo modelo de RLS de tabelas.

---

## 4. Integrações — Google Gemini

### 4.1 SDK e modelo

| Item | Valor |
|------|--------|
| Pacote | `@google/genai` `^1.30.0` (Google Gen AI SDK para JS). |
| Classe | `GoogleGenAI` instanciada em `services/geminiService.ts`. |
| Modelo textual | `gemini-2.0-flash` (chamada `ai.models.generateContent`). |
| Parâmetros | `systemInstruction` (persona institucional), `temperature: 0.7`, prompt montado com dados do `Student` e contexto livre. |

### 4.2 Fluxo de chamada

1. `DocumentGenerator` chama `GeminiService.generateOfficialDocument(docType, student, professionalName, role, context)`.
2. O serviço injeta trechos opcionais (ex.: último resultado **IPO/Portage** a partir de `student.clinical.pp_data.ipoHistory`).
3. **Retries:** até 3 tentativas com *backoff* exponencial em erros de cota / HTTP 429.
4. Em falha definitiva, `DocumentGenerator` aciona **`TemplateService.getFallbackDocument`** (templates HTML/string institucionais, sem rede).

### 4.3 Configuração de ambiente (Vite)

Em `vite.config.ts`, variáveis carregadas com `loadEnv(mode, '.', '')` e injetadas no bundle:

```ts
define: {
  'process.env': {},
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
}
```

O `geminiService.ts` usa `process.env.API_KEY` (preenchido a partir de **`GEMINI_API_KEY`** no arquivo `.env` da raiz em desenvolvimento/build).

**Implicação de segurança:** chave definida assim no **build de front-end** tende a **estar embutida no JavaScript entregue ao navegador**. Para produção, avaliar:

- Proxy backend (ex.: `server.mjs` ou Edge Function) que guarda a chave **somente no servidor**, ou
- Restrições de chave API (HTTP referrer, escopo mínimo) no Google Cloud / AI Studio.

### 4.4 Chunk de build

`vite.config.ts` agrupa `@google/genai` em **`vendor-ai`** para carregamento sob demanda junto com o lazy load de páginas que importam o gerador.

---

## 5. Manutenção deste documento

Ao alterar RLS, enums ou colunas JSONB, atualizar **este SPEC** e, se aplicável, o `PRD.md`. Conferir sempre:

1. `db/migrations` aplicadas no Supabase (fonte de verdade operacional).
2. `SupabaseService.JSONB_FIELDS` e `mapStudentFromDB` / payloads de `saveStudent`.
3. `perfilRestrito.ts` ↔ funções SQL `prontuario_*`.
