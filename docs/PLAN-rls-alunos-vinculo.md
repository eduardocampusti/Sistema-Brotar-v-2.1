# Plano: RLS em `students` com vínculo profissional ↔ aluno

**Produto:** Brotar 2.0 · **Stack:** Supabase (Postgres + Auth + PostgREST) + app cliente.  
**Objetivo:** Garantir na camada de banco que perfis clínicos sensíveis (ex.: psicopedagogia, terapia ocupacional) só **visualizem** alunos explicitamente vinculados, reduzindo risco LGPD e erro operacional (“ver a rede inteira”).  
**Escopo do plano:** desenho de dados, políticas RLS, ordem de implantação, riscos, rollback e bateria de testes. **Não inclui** código de aplicação neste documento (apenas referências conceituais).

---

## 0. Gate socrático (premissas documentadas)

| # | Pergunta | Decisão assumida neste plano (ajustável) |
|---|----------|------------------------------------------|
| 1 | Quais perfis são “restritos por vínculo”? | Especialistas com especialidade **psicopedagogia** e **terapia ocupacional** (valores canônicos no banco: `PSICOPEDAGOGIA`, `TERAPIA_OCUPACIONAL`). Outros especialistas: visão ampla até decisão contrária. |
| 2 | Quem vê “todos os alunos” da rede? | `ADMIN`, secretarias municipais (`EDUCATION_SECRETARY`), `ASSISTANT`, `SECRETARIA_SEDE`, `SECRETARIA_COCAL` — alinhado a papéis operacionais atuais. |
| 3 | Papel “coordenador” sem enum dedicado? | Tratar **coordenador** como `EDUCATION_SECRETARY` ou `ADMIN` até existir `COORDENADOR` em `profiles.role`. |
| 4 | Escola (`ESCOLA`)? | Continua restrita por `school_id` no perfil (não depende da tabela de vínculo). |
| 5 | Tabela física de alunos? | `public.students` (FK do vínculo aponta para `students.id`). |
| 6 | Quem pode criar vínculo? | Preferencialmente o **próprio profissional** (insert com `profissional_id = auth.uid()`); opcionalmente RPC `SECURITY DEFINER` para staff criar vínculos em nome de terceiros (fase 2). |

Se alguma premissa for incorreta, revisar a **matriz de papéis** (Seção 2) antes de executar a migração em produção.

---

## 1. Visão da solução

### 1.1 Tabela de vínculo

| Coluna | Tipo | Observação |
|--------|------|------------|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `profissional_id` | `uuid` FK → `auth.users(id)` | Quem acessa o prontuário |
| `aluno_id` | `uuid` FK → `public.students(id)` | Aluno da rede |
| `criado_em` | `timestamptz` | Auditoria |
| `ativo` | `boolean` default `true` | Soft-disable sem apagar histórico |

**Constraint:** `UNIQUE (profissional_id, aluno_id)` para upsert idempotente no cliente.

**Índices:** `(profissional_id) WHERE ativo`, `(aluno_id) WHERE ativo` — suportam políticas e listagens.

### 1.2 RLS em `students` (SELECT)

Substituir política permissiva do tipo `USING (true)` por uma condição centralizada, idealmente via função **`SECURITY DEFINER`** estável, por exemplo `public.can_select_student(student_id uuid)`, que:

1. Exige `auth.uid()` presente e perfil ativo em `public.profiles`.
2. Concede SELECT amplo para papéis de gestão (JWT e/ou `profiles.role`, como no padrão V16 do projeto).
3. Concede SELECT para `ESCOLA` quando `students.school_id = profiles.school_id`.
4. Para especialistas restritos: `EXISTS` vínculo ativo em `profissional_aluno_vinculo`.
5. Para demais `SPECIALIST`: SELECT permitido (comportamento legado).

**Políticas em `profissional_aluno_vinculo`:** SELECT (próprio + admin), INSERT/UPDATE (próprio profissional), sem DELETE amplo ou DELETE apenas soft via `ativo`.

### 1.3 Aplicação (fora do escopo SQL deste plano, mas necessário)

- Antes de navegar ao prontuário: **garantir vínculo** (upsert) para perfis restritos.
- Listagens: confiar na RLS **e** opcionalmente filtrar no app para UX (toggle “Meus alunos / Todos” para gestores).

---

## 2. Matriz de acesso (referência)

| Papel / condição | SELECT em `students` |
|------------------|------------------------|
| `ADMIN` | Todos (rede) |
| `EDUCATION_SECRETARY`, `ASSISTANT`, `SECRETARIA_*` | Todos (rede) |
| `ESCOLA` | Apenas `school_id` do perfil |
| `SPECIALIST` + (PSICOPEDAGOGIA ou TERAPIA_OCUPACIONAL) | Apenas com vínculo ativo |
| `SPECIALIST` + outras especialidades | Todos (até revisão) |
| Sem perfil / inativo | Nenhum |

---

## 3. Ordem de execução (implantação)

### Fase A — Preparação (sem impacto em produção)

| # | Atividade | Detalhe |
|---|-----------|---------|
| A.1 | Inventário de políticas atuais em `students` | `SELECT * FROM pg_policies WHERE tablename = 'students';` |
| A.2 | Backup lógico | `pg_dump` schema `public` + roles, ou backup Supabase do projeto. |
| A.3 | Ambiente de homologação | Aplicar cópia dos dados + mesmas policies; validar PostgREST. |
| A.4 | Documentar JWT vs `profiles` | Garantir que regras considerem **ambos** (evitar divergência pós-login). |

**Estimativa Fase A:** **4–8 h** (1 dev backend/DB).

### Fase B — Schema (baixo risco se só DDL nova)

| # | Atividade | Detalhe |
|---|-----------|---------|
| B.1 | Criar tabela `profissional_aluno_vinculo` | FKs, unique, índices. |
| B.2 | Habilitar RLS na nova tabela | Políticas mínimas (leitura/escrita do dono + admin leitura). |
| B.3 | Grants | `authenticated` / `service_role` conforme padrão do projeto. |

**Estimativa Fase B:** **2–4 h**.

### Fase C — Função e política em `students` (impacto alto)

| # | Atividade | Detalhe |
|---|-----------|---------|
| C.1 | Criar `can_select_student(uuid)` | `SECURITY DEFINER`, `search_path = public`, `REVOKE ALL FROM PUBLIC`, `GRANT EXECUTE TO authenticated`. |
| C.2 | **Remover** política(ies) de SELECT permissivas (`USING (true)`) | Evitar OR que esvazie a restrição. |
| C.3 | Criar política `SELECT` em `students` | `USING (public.can_select_student(id))`. |
| C.4 | `NOTIFY pgrst, 'reload config';` | Recarregar PostgREST. |

**Estimativa Fase C:** **4–8 h** (inclui ajustes finos e revisão de performance).

### Fase D — Aplicação e dados

| # | Atividade | Detalhe |
|---|-----------|---------|
| D.1 | Upsert de vínculo ao “abrir prontuário” | Apenas perfis restritos (evitar poluir tabela para admin). |
| D.2 | Carregamento de listas | `getStudents` já respeita RLS; opcional filtro “meus” para gestores. |
| D.3 | **Backfill** (opcional) | Se houver histórico clínico (`clinical_sessions`) por `professional_id` + `student_id`, script para popular vínculos retroativos para PP/TO. |

**Estimativa Fase D:** **8–16 h** (depende de backfill, testes E2E e telas).

### Fase E — Produção e observabilidade

| # | Atividade | Detalhe |
|---|-----------|---------|
| E.1 | Janela de manutenção ou deploy silencioso | Preferência: baixo tráfego. |
| E.2 | Monitorar erros 401/403 e tempos de query | Supabase logs + métricas. |
| E.3 | Plano de rollback pronto | Script/testado em homolog (Seção 6). |

**Estimativa Fase E:** **2–4 h**.

### Resumo de esforço (ordem de grandeza)

| Cenário | Pessoa(s) | Prazo indicativo |
|---------|-----------|------------------|
| Mínimo (RLS + app mínimo, sem backfill) | 1 dev full-stack confortável com SQL | **3–5 dias úteis** |
| Completo (homolog rigorosa, backfill, E2E, revisão jurídica leve) | 1 dev + 1 revisão QA | **1–2 semanas** |

---

## 4. Riscos e mitigação

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **Lista vazia** para PP/TO após deploy | Bloqueio operacional | Backfill a partir de sessões; comunicação; botão “abrir” cria vínculo antes da navegação. |
| **Performance** em `can_select_student` | Timeout 57014 / lentidão | Índices em vínculo; função estável; evitar subconsultas correlacionadas pesadas; testar `EXPLAIN` em homolog. |
| **JWT desatualizado** vs `profiles` | RLS inconsistente com a UI | Duplicar checagens JWT **ou** perfil (padrão já usado em migrações V15/V16). |
| **`profiles.specialty` nulo** | Especialista sem especialidade tratado como “não restrito” | Definir política: ou bloquear login, ou tratar NULL como restrito (decisão de negócio). |
| **Escola sem `school_id`** | Zero alunos visíveis | Corrigir cadastro antes do go-live; monitorar. |
| **Políticas duplicadas em `students`** | SELECT ainda amplo por OR | Inventário + drop explícito de policies antigas antes da nova. |
| **Quebra de integrações** (scripts, BI) | Jobs com `anon` ou chave errada | Usar `service_role` só em backend confiável; documentar. |
| **FK para `auth.users`** | Falha em insert se usuário órfão | Garantir criação de usuário Auth antes do vínculo. |

---

## 5. Rollback

### 5.1 Princípio

Rollback **rápido** em produção deve restaurar o comportamento anterior de **SELECT** em `students` sem perder a tabela de vínculo (dados úteis).

### 5.2 Script de rollback (conceitual — executar em homolog primeiro)

1. `DROP POLICY IF EXISTS "read_students_v18_profile_scope" ON public.students;` (nome ajustado ao da migração real).
2. Recriar política permissiva de leitura equivalente à legada, por exemplo:  
   `CREATE POLICY "read_students_rollback_vXX" ON public.students FOR SELECT TO authenticated USING (true);`  
   **Atenção:** só usar temporariamente; viola objetivo LGPD.
3. `DROP FUNCTION IF EXISTS public.can_select_student(uuid);` — somente se nenhuma policy ainda referenciar a função.
4. `NOTIFY pgrst, 'reload config';`
5. **Opcional:** manter tabela `profissional_aluno_vinculo` e RLS dela — não afeta SELECT amplo em `students`.

### 5.3 Rollback “completo” (reverter feature)

- Reverter migração versionada no repositório **e** aplicar script que remove tabela de vínculo apenas se **não** houver dependência em produção e houver backup.

**Risco de rollback:** janela em que dados novos existem só na tabela de vínculo — backup antes do drop.

---

## 6. Testes de validação

### 6.1 Testes manuais (SQL / Supabase SQL Editor)

| ID | Cenário | Passos | Resultado esperado |
|----|---------|--------|---------------------|
| T1 | PP sem vínculo | Login como usuário PP; `SELECT count(*) FROM students;` | `0` ou apenas o esperado pela regra |
| T2 | PP com vínculo | Inserir 1 linha ativa em `profissional_aluno_vinculo`; repetir SELECT | Contagem ≥ 1 e apenas alunos vinculados |
| T3 | Admin | Login admin; SELECT amplo | Todos os alunos (ou limite de paginação PostgREST) |
| T4 | Escola | Login escola com `school_id` X | Somente alunos com `school_id = X` |
| T5 | JWT vs perfil | Alterar role só no JWT ou só em `profiles` | Comportamento conforme matriz acordada (teste de regressão) |

### 6.2 Testes via API (PostgREST)

| ID | Chamada | Esperado |
|----|---------|----------|
| P1 | `GET /rest/v1/students?select=id` com JWT PP | Apenas ids permitidos |
| P2 | Mesmo usuário após upsert vínculo | Inclui novo `id` |
| P3 | Usuário admin | Lista completa (respeitando paginação) |

### 6.3 Testes de aplicação (checklist QA)

- Login como **psicopedagoga**: Central de Prontuários não lista rede inteira; após “Abrir prontuário” em um aluno permitido (ex.: busca por quem já tem permissão delegada — ou fluxo staff), prontuário abre.
- Login como **admin**: lista completa; toggle “Meus alunos” (se existir) restringe a vínculos.
- Regressão: **cadastro de aluno**, **importação CSV**, **agenda** que depende de lista de alunos.

### 6.4 Testes de carga leve

- Listagem paginada (50 em 50) com RLS ativo: tempo < SLA interno (ex.: &lt; 3 s por página em homolog com volume típico).

---

## 7. Critérios de aceite

- [ ] Nenhum perfil **restrito** consegue `SELECT` em `students` fora do conjunto vinculado (validado por T1–T2 / P1–P2).
- [ ] Papéis de **gestão** e **escola** continuam operando conforme matriz (T3–T4).
- [ ] Rollback documentado e **ensaiado** em homolog em &lt; 15 min.
- [ ] Plano de comunicação aos usuários PP/TO (novo fluxo de “primeiro acesso” ao aluno).

---

## 8. Referência no repositório

No código atual do projeto já existe uma migração de referência: **`db/migrations/V18_profissional_aluno_vinculo_students_rls.sql`** (implementação concreta alinhada a este plano). Use-a como baseline ou ajuste os nomes de policies/função conforme governança de versões do seu ambiente.

---

## 9. Próximos passos sugeridos

1. Validar premissas da Seção 0 com gestão/DPO.  
2. Executar Fases A–C em **homolog** com dump recente.  
3. Rodar bateria Seção 6; ajustar índices/`EXPLAIN`.  
4. Agendar produção + rollback ensaiado.  
5. Opcional: backfill de vínculos a partir de `clinical_sessions`.

---

**Arquivo deste plano:** `docs/PLAN-rls-alunos-vinculo.md`
