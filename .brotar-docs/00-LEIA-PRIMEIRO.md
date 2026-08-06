# Sistema Brotar — LEIA PRIMEIRO

> **Atualizado em:** 06/08/2026 | **Versão:** 2.4.159 (v2.4.161 no deploy)
> **Este arquivo é o ponto de entrada obrigatório para qualquer IA ou desenvolvedor.**
> Leia APENAS este documento primeiro. Use os demais sob demanda.

---

## O que é o Sistema Brotar

Plataforma SaaS de gestão educacional e atendimento clínico multiprofissional da **Secretaria Municipal de Educação de Brotas de Macaúbas – Bahia** (SMED).
Centraliza cadastro de alunos com necessidades especiais, agendamentos, prontuários clínicos, relatórios e fluxos internos da rede pública municipal.

**Produção:** https://brotar.smebrotas.com.br
**Repositório:** https://github.com/eduardocampusti/Sistema-Brotar-v-2.1

---

## Stack tecnológico (estado real do repositório)

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS | 18.3.1 / 5.8.2 / 6.2.0 / 3.4.3 |
| Backend (BaaS) | Supabase (PostgreSQL + RLS + Auth) | Plano PRO, compute Small |
| Backend (API) | Express via server.mjs | Node.js 22.x |
| Hospedagem | Hostinger (webhook GitHub) | Deploy automático via push |
| Domínio | brotar.smebrotas.com.br | DNS via Hostinger |
| IA integrada | Google Gemini (@google/genai) | Server-side apenas |
| WhatsApp | WhatsApp Business Cloud API | Server-side apenas |
| PDF | jsPDF + jsPDF-AutoTable | 4.0.0 / 5.0.7 |
| Gráficos | Recharts | 2.12.7 |
| Ícones | Lucide React | 0.263.1 |
| Roteamento | React Router DOM | 7.13.0 |

**Supabase Project ID:** `indshiztdvjgvgnzigqd`

---

## ⛔ REGRAS INVIOLÁVEIS — Qualquer IA deve respeitar

### 1. dist/ DEVE estar no Git
O deploy Hostinger serve `dist/` diretamente do repositório. O script `"build"` do package.json é `echo 'dist already built' && exit 0`. Sem `dist/` no Git = site vazio.
**NUNCA remover dist/ do .gitignore. NUNCA adicionar /dist/ ao .gitignore.**

### 2. Role no user_metadata do JWT é OBRIGATÓRIO
As policies RLS em produção usam `auth.jwt() -> 'user_metadata' ->> 'role'` para autorização. Ao criar/cadastrar um usuário, o role DEVE ser gravado em `user_metadata` E na tabela `profiles`. Remover role do metadata = usuário sem acesso a nada.

### 3. Todas as queries ao banco passam por SupabaseService.ts
Nunca usar `supabase.from()` diretamente em componentes. Sempre via `SupabaseService`.

### 4. Mockup ANTES de implementar
Qualquer alteração visual deve ser apresentada como mockup/preview para aprovação antes de codificar. Violar isso causa retrabalho.

### 5. Commits descritivos — NUNCA genéricos
"fix: correções gerais" será rejeitado. O commit e a descrição no package.json devem dizer exatamente o que mudou.

### 6. Deleção de registros = lógica, nunca física
Usar soft-delete (campo status, deleted_at, is_active). Restrito ao perfil ADMIN.

### 7. Migrations SQL versionadas
Toda alteração no banco = novo arquivo `V[número]_[descricao].sql` em `db/migrations/`. Nunca alterar uma migration já aplicada. Sempre verificar o número da última migration antes de criar uma nova.
**Última migration no repositório:** V46 (NÃO APLICADA — ver detalhes em 03-HISTORICO).
**Última migration APLICADA no banco:** V45.

---

## Roles do sistema (confirmados no banco de produção)

| Role | Total no banco | Descrição |
|---|---|---|
| `ADMIN` | 1 | Acesso total — gerencia tudo |
| `SPECIALIST` | 8 | Profissionais de saúde/educação (psicólogo, fono, TO, etc.) |
| `ASSISTANT` | 3 | Assistentes administrativos |
| `EDUCATION_SECRETARY` | 2 | Secretária de Educação — visão gerencial |
| `SECRETARIA_SEDE` | 1 | Secretaria central — agendamentos Sede |
| `SECRETARIA_COCAL` | 0 | Secretaria Cocal — ainda sem usuário |
| `COORDENADOR` | 0 | Coordenador — previsto, sem usuário |
| `ESCOLA` | 58 | Escolas — acesso restrito à própria escola |
| `SOCIAL_WORKER` | 0 | Assistente social — previsto no código |

**Roles no TypeScript (types.ts):** ADMIN, SPECIALIST, ASSISTANT, EDUCATION_SECRETARY, SECRETARIA_SEDE, SECRETARIA_COCAL, COORDENADOR, ESCOLA, SOCIAL_WORKER
**Roles que NÃO existem no código:** SECRETARIA_EDUCACAO, SUPPORT_PROFESSIONAL

---

## Sequência de deploy OBRIGATÓRIA

```
1. npm run version:patch          ← SEMPRE antes do build
2. npm run build:vite             ← OBRIGATÓRIO antes do commit
3. git add -A dist/ [arquivos alterados]
4. git commit --no-verify -m "MENSAGEM DESCRITIVA"
5. git push --no-verify
```

**Verificação pós-push:** `git log --oneline origin/main..HEAD` deve retornar vazio.
**Cache não atualizou?** hPanel Hostinger → Avançado → Cache → Limpar.
**PowerShell:** usar `;` e não `&&` para encadear comandos.

---

## Tabelas do banco (produção real — 20 tabelas)

| Tabela | O que armazena |
|---|---|
| `profiles` | Usuários do sistema (role, specialty, scope, school_id) |
| `students` | Ficha âncora dos alunos (dados admin + clinical_info JSONB) |
| `appointments` | Agendamentos multiprofissionais |
| `clinical_sessions` | Evoluções e sessões clínicas por especialidade |
| `generated_documents` | Documentos gerados pelo sistema (código BRT-) |
| `schools` | Unidades escolares (name, district, inep) |
| `support_professionals` | Profissionais de apoio (cuidadores) |
| `audit_logs` | Trilha de auditoria de todas as ações |
| `system_messages` | Mensagens internas e notificações |
| `system_settings` | Configurações gerais |
| `letterhead_config` | Papel timbrado (id=1 Sede, id=2 Cocal) |
| `attendance_certificates` | Atestados de comparecimento |
| `nutrition_assessments` | Avaliações nutricionais |
| `nutrition_anthropometry_history` | Histórico antropométrico |
| `nutrition_nae` | Necessidades alimentares especiais |
| `nutrition_ean_activities` | Atividades de educação alimentar |
| `nutrition_evolution` | Evolução nutricional |
| `portal_config` | Configuração do portal público |
| `portal_perfis` | Perfis do portal |
| `portal_sistemas` | Sistemas do portal |

**Tabela NÃO existente no banco:** `student_documents` (documentos ficam no campo JSONB `students.documents`).
**Tabela ausente de migrations:** `profissional_aluno_vinculo` (criada na V18 como tabela auxiliar).

---

## Funções SQL no banco (produção)

| Função | Usada em |
|---|---|
| `prontuario_status_agendamento_vinculo()` | RLS de vínculo profissional↔aluno |
| `prontuario_especialidades_restritas()` | RLS de perfis clínicos restritos |
| `regional_district_cap()` | RLS regional (Sede/Cocal) |
| `row_matches_regional_school()` | RLS por escola/distrito |
| `appointments_is_scheduling_staff()` | RLS de agendamentos |
| `appointments_is_admin()` | RLS de agendamentos |
| `can_select_student()` | RLS de leitura de alunos |
| `can_insert_student()` | RLS de inserção de alunos |
| `can_update_student_clinical()` | RLS de update clínico |
| `can_update_student_v38()` | RLS de update geral |
| `support_professionals_can_manage()` | RLS de profissionais de apoio |
| `support_professionals_escola_can_write_school()` | RLS escola↔profissional |
| `delete_user_complete()` | RPC para exclusão de usuário |
| `set_user_password()` | RPC para reset de senha |
| `merge_students()` | RPC para merge de duplicados |
| `get_user_role()` | Helper de role (usa user_metadata) |
| `clear_must_change_password()` | RPC pós-troca de senha |

---

## Arquivos complementares (ler sob demanda)

| Arquivo | Quando ler |
|---|---|
| `01-CONTEXTO-GERAL.md` | Visão geral, histórico, princípios, estrutura de pastas |
| `02-MODULOS-DO-SISTEMA.md` | O que cada módulo faz, qual arquivo, quem acessa |
| `03-HISTORICO-E-DECISOES.md` | Por que algo foi feito assim — consultar ANTES de refatorar |
| `04-BUGS-E-PENDENCIAS.md` | Bugs ativos, pendências, estado de cada item |
| `05-PROMPTS-PRONTOS.md` | Prompts para Cursor, Claude Code, Antigravity |
| `06-REGRAS-DE-TRABALHO.md` | Commits, migrations, nomenclatura, deploy |

---

## Design System (resumo)

| Elemento | Valor |
|---|---|
| Cor primária | `#3B82F6` (azul) |
| Cor CTA | `#F97316` (laranja) |
| Background | `#F8FAFC` |
| Texto | `#1E293B` |
| Fonte | DM Sans (importada) |
| Border radius cards | `12px` |
| Ícones | Lucide React (Tabler foi removido — renderizava quadrados cinza) |
| Estilo | Premium, acessível, WCAG compliant |
| Cards premium | Gradiente no ícone, sombra colorida, barra top colorida, hover elevation |
