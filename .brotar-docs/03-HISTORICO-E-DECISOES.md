# 03 — Histórico e Decisões Técnicas — Sistema Brotar

> Use este arquivo para entender **por que** algo foi feito de determinada forma.
> Antes de refatorar uma solução existente, verifique aqui se há motivo documentado para ela ser assim.

---

## DECISÃO-01 — Supabase PRO com compute Small
**Data:** fevereiro de 2026
**Problema:** O banco de dados no plano Free pausava automaticamente após 7 dias sem uso. Além disso, queries complexas (RLS com subqueries) causavam timeout de 30 segundos e erros silenciosos.
**Decisão:** Upgrade para Supabase PRO + instância Small compute.
**Resultado:** Timeouts resolvidos, banco nunca pausa, performance estável.
**Custo:** ~$25/mês USD.

---

## DECISÃO-02 — Keep-alive via n8n
**Data:** fevereiro de 2026
**Problema:** Mesmo no PRO, havia preocupação com inatividade em períodos de férias escolares.
**Decisão:** Criar workflow automático no n8n que faz uma requisição ao banco a cada 5 dias.
**Onde está:** Workflow externo no n8n (não está no repositório).
**Como verificar:** Acessar o painel n8n e confirmar que o workflow está ativo.

---

## DECISÃO-03 — RLS por role via JWT metadata (não via subquery em profiles)
**Data:** janeiro/fevereiro de 2026
**Problema:** As políticas RLS originais usavam subqueries na tabela `profiles` para descobrir o role do usuário. Isso causava recursão infinita (profiles consultava profiles) e timeouts.
**Decisão:** Migrar para leitura do role diretamente do JWT (`auth.jwt() -> 'user_metadata' ->> 'role'`). O role é gravado nos metadados do usuário no momento do cadastro e lido diretamente, sem subquery.
**Migration:** V11, V12 e subsequentes.
**Atenção:** Quando criar um novo usuário, o role DEVE ser gravado em `user_metadata` no Supabase Auth, não apenas na tabela `profiles`.

---

## DECISÃO-04 — Breakpoint lg para sidebar (não md)
**Data:** maio de 2026
**Problema:** O breakpoint `md` (768px) ativava a sidebar de 288px em tablets, deixando apenas 480px de espaço útil para tabelas e formulários densos.
**Decisão:** Trocar `md:` por `lg:` no `Layout.tsx` para que a sidebar só apareça em telas ≥ 1024px. Em tablets (768–1023px), usar menu sanduíche igual ao celular.
**Status:** ⏳ Ainda não implementado — documentado como BUG-03.
**Arquivo:** `components/Layout.tsx` — linhas 301, 414, 491.

---

## DECISÃO-05 — Gráfico Radar em modal para mobile (não inline)
**Data:** maio de 2026
**Problema:** O RadarChart do Recharts em telas de 375px encolhe tanto que os rótulos se sobrepõem e ficam ilegíveis.
**Decisão:** Em vez de tentar redimensionar o gráfico (o que nunca fica bom), mostrar um botão "Expandir gráfico" que abre um modal em tela cheia (`fixed inset-0 z-50`).
**Status:** ⏳ Ainda não implementado — documentado como BUG-05.
**Arquivo:** `components/RoleDashboards.tsx`.

---

## DECISÃO-06 — Política INSERT em clinical_sessions simplificada
**Data:** maio de 2026
**Problema:** A política antiga de INSERT usava subquery aninhada para verificar a especialidade do profissional. O PostgreSQL rejeitava o INSERT silenciosamente porque a subquery retornava NULL no contexto de segurança do RLS.
**Decisão:** Simplificar para `WITH CHECK (professional_id = auth.uid())`. Segurança mantida: cada profissional só pode inserir sessões em seu próprio nome.
**Migration:** V39 — `db/migrations/V39_fix_clinical_sessions_rls.sql`.

---

## DECISÃO-07 — dist/ incluída no repositório Git
**Data:** início do projeto
**Motivo:** A hospedagem via Vercel + GitHub requer que a pasta `dist/` esteja no repositório para deploy funcionar corretamente na configuração atual do projeto.
**Consequência:** Cada push de produção deve incluir um novo build (`npx vite build`) seguido de commit com a pasta `dist/`.
**Atenção:** Nunca deletar a pasta `dist/` do `.gitignore` inadvertidamente.

---

## DECISÃO-08 — Comando de build customizado no package.json
**Data:** durante configuração do Vercel
**Problema:** O Vercel tentava rodar `npm run build` e isso conflitava com o build local já commitado.
**Decisão:** O script `"build"` no `package.json` foi alterado para `echo 'dist already built' && exit 0`, sinalizando ao Vercel que o build já está pronto.
**Para buildar de verdade:** usar `npm run build:vite` (que chama `vite build` de verdade).

---

## DECISÃO-09 — Perfis restritos por especialidade (perfilRestrito.ts)
**Data:** março/abril de 2026
**Problema:** Especialistas podiam ver a lista completa de alunos da rede, o que é uma violação de privacidade — um fonoaudiólogo não deveria ver alunos que nunca atendeu.
**Decisão:** Criar arquivo `src/config/perfilRestrito.ts` que lista os roles que têm visão restrita. Para esses perfis, a lista de alunos é filtrada para mostrar apenas alunos com agendamento vinculado ao profissional (qualquer status ativo).
**Impacto no banco:** A query em `SupabaseService.getAlunosPorPerfil` faz join com `appointments` para filtrar.

---

## DECISÃO-10 — Dois formatos de token no tailwind.config.js
**Data:** durante desenvolvimento do Design System
**Problema:** Alguns componentes foram criados usando a notação de ponto do Tailwind (`sanctuary.primary.500`) e outros com hífen (`sanctuary-primary-500`). Padronizar teria exigido refatorar centenas de classes.
**Decisão:** Manter os dois formatos em paralelo no `tailwind.config.js`. Ao alterar uma cor, sempre atualizar os dois.
**Risco:** Inconsistência visual se apenas um for atualizado. Documentado em `06-REGRAS-DE-TRABALHO.md` como Regra 6.

---

## DECISÃO-11 — WhatsApp Business API via webhook próprio
**Data:** durante desenvolvimento
**Implementação:** `api/whatsapp/send.ts` e `api/whatsapp/webhook.ts`
**Motivo:** Integração direta com a API oficial do Meta/WhatsApp Business para notificações de agendamento.
**Status atual:** Implementado, mas ainda não testado em produção com volume real.
**Variáveis necessárias:** `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_TOKEN` no `.env.local`.

---

## DECISÃO-12 — Soft delete em profissionais de apoio (não hard delete)
**Data:** abril de 2026
**Motivo:** Profissionais de apoio vinculados a alunos não podem simplesmente ser deletados do banco — isso quebraria o histórico de vínculos. A solução foi soft delete: um campo `deleted_at` é preenchido, o registro continua no banco mas é filtrado na interface.
**Migrations:** V29, V31, V34.
