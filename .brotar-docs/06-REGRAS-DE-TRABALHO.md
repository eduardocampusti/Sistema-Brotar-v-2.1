# 06 — Regras de Trabalho — Sistema Brotar

> Este arquivo define como trabalhar no projeto. Leia antes de qualquer sessão de desenvolvimento.
> Seguir estas regras evita quebrar o sistema e facilita o trabalho em equipe com agents de IA.

---

## Regra 1 — Sempre fazer commit antes de alterações importantes

Antes de qualquer mudança em arquivo crítico, rodar no terminal:

```bash
git add .
git commit -m "checkpoint: antes de [descreva o que vai fazer]"
```

**Arquivos críticos** (sempre commitar antes de editar):
- `components/SchedulingCenter.tsx`
- `components/Layout.tsx`
- `components/ClinicalPages.tsx`
- `services/SupabaseService.ts`
- `contexts/AuthContext.tsx`
- `src/App.tsx`
- `tailwind.config.js`
- Qualquer arquivo em `db/migrations/`

---

## Regra 2 — Migrações SQL sempre em arquivo versionado

Toda alteração no banco de dados (criar tabela, alterar coluna, mudar política RLS) deve:

1. Ser criada como um novo arquivo em `db/migrations/`
2. Seguir a nomenclatura: `V[número]_[descricao_curta].sql`
3. Exemplo: `V40_agendamentos_adicionar_campo_observacao.sql`
4. **Nunca** alterar uma migration já aplicada — criar uma nova sempre

---

## Regra 3 — Nunca editar a pasta `dist/` diretamente

A pasta `dist/` é gerada automaticamente pelo comando de build. Editar arquivos lá é inútil — serão sobrescritos no próximo build.

Para gerar um novo build:
```bash
npx vite build
```

Depois do build, fazer commit incluindo a pasta `dist/`:
```bash
git add .
git commit -m "build: versão [X.X.X]"
git push
```

---

## Regra 4 — PowerShell usa ponto e vírgula, não &&

No terminal do Windows (PowerShell), os comandos em sequência usam `;` e não `&&`:

```powershell
# ERRADO (não funciona no PowerShell)
git add . && git commit -m "mensagem"

# CORRETO
git add . ; git commit -m "mensagem"
```

---

## Regra 5 — Substituições de texto em TSX: usar Node.js, não PowerShell

Para fazer busca e substituição em arquivos `.tsx` ou `.ts`, **sempre usar um script Node.js** (`.mjs`) e não PowerShell. O PowerShell pode corromper arquivos com caracteres especiais (CRLF, acentos, JSX).

Exemplo de script seguro:
```js
// fix_algo.mjs
import { readFileSync, writeFileSync } from 'fs';
const path = './components/MeuComponente.tsx';
const content = readFileSync(path, 'utf8');
const fixed = content.replace('textoAntigo', 'textoNovo');
writeFileSync(path, fixed, 'utf8');
console.log('Feito!');
```

---

## Regra 6 — Design System: atualizar sempre nos dois formatos

O `tailwind.config.js` tem dois conjuntos de tokens de cor em paralelo:
- Formato com **ponto**: `sanctuary.primary.500`
- Formato com **hífen**: `sanctuary-primary-500`

Ao alterar qualquer cor do sistema, **os dois formatos devem ser atualizados juntos**. Atualizar só um causa inconsistências visuais.

---

## Regra 7 — Variáveis de ambiente

- Variáveis que começam com `VITE_` ficam disponíveis no frontend (React).
- Variáveis **sem** `VITE_` (como `SUPABASE_SERVICE_ROLE_KEY`) são apenas para o backend (`server.mjs`).
- **Nunca** usar `SUPABASE_SERVICE_ROLE_KEY` no código frontend — isso expõe acesso total ao banco para qualquer usuário.
- O arquivo `.env.local` **nunca deve ir para o GitHub** (já está no `.gitignore`).

---

## Regra 8 — Nomenclatura de commits

Usar prefixos para facilitar o histórico:

| Prefixo | Quando usar |
|---|---|
| `feat:` | Nova funcionalidade |
| `fix:` | Correção de bug |
| `ui:` | Mudança visual sem alterar lógica |
| `db:` | Migration ou alteração no banco |
| `refactor:` | Reorganização de código sem mudar comportamento |
| `build:` | Novo build para produção |
| `checkpoint:` | Backup antes de mudança arriscada |
| `docs:` | Atualização de documentação |

---

## Regra 9 — Testar localmente antes de fazer push

Fluxo correto de trabalho:

```
1. git commit (checkpoint)
2. Fazer a alteração no código
3. npm run dev → testar no navegador (localhost:5173)
4. Se funcionar: npx vite build
5. git add . ; git commit -m "feat: descrição"
6. git push → deploy automático na Vercel
```

---

## Regra 10 — Agents: qual usar para cada tarefa

| Tarefa | Agent recomendado |
|---|---|
| Alterar componente React (visual, layout, UX) | `@frontend-specialist` |
| Depurar erro no console ou comportamento inesperado | `@debugger` |
| Criar ou alterar tabela, política RLS, migration SQL | `@database-architect` |
| Lógica de negócio, serviços, autenticação, API | `@backend-specialist` |
| Melhorar interface, design system, responsividade | `@ui-ux-pro-max` |

> Sempre iniciar o prompt com `@nome-do-agent` e incluir o nome do arquivo que deve ser alterado.

---

## Regra 11 — Arquivos de diagnóstico na raiz

A raiz do projeto acumulou dezenas de arquivos `.mjs`, `.sql` e `.ps1` usados para diagnóstico e correção pontual. Eles **não devem ser deletados** sem análise, pois podem ser referência futura. Quando a raiz estiver muito poluída, mover esses arquivos para a pasta `scratch/` (já existe no projeto).

---

## Regra 12 — Nunca misturar rascunho com dados oficiais

Esta regra vale especialmente para o módulo clínico:
- Evoluções com `status = 'RASCUNHO'` não devem aparecer em relatórios oficiais
- Sessões com `status = 'FINALIZADA'` não podem ser editadas (RLS bloqueia no banco)
- Documentos gerados com código `BRT-` são oficiais e não devem ser deletados — apenas inativados
