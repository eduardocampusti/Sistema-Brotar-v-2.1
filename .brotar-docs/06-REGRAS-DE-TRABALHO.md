# 06 — Regras de Trabalho — Sistema Brotar

> **Atualizado em:** 06/08/2026
> **Leia antes de qualquer sessão de desenvolvimento.**

---

## REGRA 1 — Sequência de deploy (NUNCA pular ou reordenar)

```
1. npm run version:patch          ← SEMPRE antes do build
2. npm run build:vite             ← OBRIGATÓRIO antes do commit
3. git add -A dist/ [arquivos alterados]
4. git commit --no-verify -m "MENSAGEM DESCRITIVA"
5. git push --no-verify
```

**Verificações:**
- Build OK: `npm run build:vite 2>&1 | Select-String -Pattern "error|Error|built in"`
- Push OK: `git log --oneline origin/main..HEAD` → deve retornar vazio
- Cache Hostinger: hPanel → Avançado → Cache → Limpar

---

## REGRA 2 — Commit antes de alterações em arquivos críticos

```powershell
git add . ; git commit -m "checkpoint: antes de [descrição]"
```

**Arquivos críticos:**
- `services/SupabaseService.ts` — gateway de dados inteiro
- `server.mjs` — servidor Express
- `src/App.tsx` — roteamento principal
- `contexts/AuthContext.tsx` — estado de autenticação
- `components/Layout.tsx` — layout base
- `components/RoleDashboards.tsx` — dashboards por role
- `tailwind.config.js` — design system
- Qualquer arquivo em `db/migrations/`

---

## REGRA 3 — Migrations SQL sempre versionadas

- Novo arquivo: `V[número]_[descricao_curta].sql` em `db/migrations/`
- **Última migration no repositório:** V46 (NÃO aplicada)
- **Última migration APLICADA no banco:** V45
- **SEMPRE verificar** o número da última migration antes de criar nova
- Nunca alterar migration já aplicada — criar nova
- Usar `IF NOT EXISTS` / `IF EXISTS` para reexecução segura
- Adicionar `NOTIFY pgrst, 'reload config';` se alterar RLS
- **Existem duas V38** no repositório (profiles_birth_date e remove_social_work_restriction)

---

## REGRA 4 — PowerShell usa ponto e vírgula

```powershell
# ERRADO: git add . && git commit -m "msg"
# CORRETO:
git add . ; git commit -m "msg"
```

---

## REGRA 5 — Edição de TSX/TS: usar Node.js, não PowerShell

PowerShell corrompe arquivos com `ç`, `ã`, JSX. Usar script `.mjs`:
```js
import { readFileSync, writeFileSync } from 'fs';
const path = './components/MeuComponente.tsx';
const content = readFileSync(path, 'utf8');
const fixed = content.replace('antigo', 'novo');
writeFileSync(path, fixed, 'utf8');
```

---

## REGRA 6 — Tailwind: atualizar nos dois formatos

O `tailwind.config.js` tem tokens em paralelo:
- `sanctuary.primary.500` (ponto)
- `sanctuary-primary-500` (hífen)
Alterar um sem o outro = inconsistência visual.

---

## REGRA 7 — Variáveis de ambiente

- `VITE_*` → disponível no frontend (React)
- Sem `VITE_` → apenas backend (server.mjs)
- **NUNCA** usar `SUPABASE_SERVICE_ROLE_KEY` no frontend
- `.env.local` NUNCA vai para o Git (está no .gitignore)
- Chave Gemini: server-side only (removida do bundle no commit 3be9216)

---

## REGRA 8 — Nomenclatura de commits

| Prefixo | Quando |
|---|---|
| `feat:` | Nova funcionalidade |
| `fix:` | Correção de bug |
| `security:` | Alteração de segurança |
| `ui:` | Mudança visual sem alterar lógica |
| `db:` | Migration ou alteração no banco |
| `refactor:` | Reorganização sem mudar comportamento |
| `build:` | Novo build para produção |
| `checkpoint:` | Backup antes de mudança arriscada |
| `docs:` | Documentação |

---

## REGRA 9 — Testar localmente antes de push

```
1. git commit (checkpoint)
2. Fazer alteração
3. npm run dev → testar em localhost:5173
4. npm run build:vite → verificar sem erros
5. npx vitest run → verificar testes passam
6. git add . ; git commit --no-verify -m "descritivo"
7. git push --no-verify
```

---

## REGRA 10 — Agents (Antigravity/Cursor)

| Tarefa | Agent |
|---|---|
| Componente React, layout, visual | `@frontend-specialist` |
| Erro, bug, comportamento inesperado | `@debugger` |
| SQL, RLS, migration | `@database-architect` |
| Lógica, serviços, autenticação | `@backend-specialist` |
| Design, responsividade | `@ui-ux-pro-max` |
| Tarefas multi-domínio | `@orchestrator` via `/orchestrate` |

**Todo prompt para Cursor deve incluir:** mapeamento pré-código, regras absolutas, revisão de diff.

---

## REGRA 11 — Diagnóstico de problemas comuns

| Problema | Solução |
|---|---|
| Tela branca | F12 Console → checar erro. `npm run build:vite` antes de qualquer fix |
| Deploy não refletiu | Verificar `dist/` no commit. Limpar cache Hostinger |
| Cursor não aplicou | Verificar: commitou na main? Rodou build:vite? Fez push? |
| Ícone cinza/quadrado | Está usando Tabler (ti ti-). Trocar para Lucide React |
| RLS bloqueando | Verificar role no user_metadata do JWT. Usuário logou depois de mudança? |
| Login falha após mudança | `NOTIFY pgrst, 'reload config'` no Supabase SQL Editor |
| `mapStudentFromDB` undefined | Componente usa nome de coluna do banco ao invés de camelCase |

---

## REGRA 12 — Rascunho ≠ dados oficiais

- Evoluções com `status = 'RASCUNHO'` → fora de relatórios oficiais
- Sessões com `status = 'FINALIZADA'` → RLS bloqueia edição
- Documentos com código `BRT-` → oficiais, nunca deletar, apenas inativar
- Alunos com `status = 'Duplicado'` → fora das listagens (filtro obrigatório)

---

## REGRA 13 — Arquivos de diagnóstico na raiz

A raiz acumulou ~80 arquivos `.mjs`, `.sql`, `.ps1` de debugging. Não deletar sem análise.
Quando poluir muito, mover para `scratch/`.

---

## REGRA 14 — Ferramentas MCP disponíveis

| Ferramenta | O que faz |
|---|---|
| Desktop Commander | Acesso direto ao sistema de arquivos e processos (Windows, PowerShell) |
| Supabase MCP | SQL direto no banco de produção (`execute_sql`). Migrations via `apply_migration` |
| Antigravity/Cursor | Agents especializados por domínio |
| Claude Code | Execução de código e terminal no projeto |
