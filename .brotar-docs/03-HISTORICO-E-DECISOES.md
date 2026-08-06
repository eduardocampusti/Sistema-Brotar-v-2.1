# 03 — Histórico e Decisões Técnicas — Sistema Brotar

> **Atualizado em:** 06/08/2026
> **REGRA:** Antes de refatorar qualquer solução existente, verifique aqui se há motivo documentado.
> Decisões marcadas com ⚠️ são armadilhas comuns — IAs já erraram ao ignorá-las.

---

## ⚠️ DECISÃO-01 — dist/ DEVE estar no repositório Git
**Motivo:** O deploy Hostinger serve o conteúdo de `dist/` diretamente do repositório.
O script `"build"` do package.json é `echo 'dist already built' && exit 0`.
**O que acontece se remover:** O site fica vazio. Deploy serve nada.
**Histórico:** Em agosto/2026, o ChatGPT removeu `dist/` do Git e adicionou ao `.gitignore` como "melhoria de segurança". Isso quebrou o deploy. Foi revertido no commit `a8e9028`.
**REGRA:** NUNCA adicionar `/dist/` ao `.gitignore`. NUNCA remover `dist/` do rastreamento Git.

---

## ⚠️ DECISÃO-02 — Role no user_metadata do JWT é obrigatório
**Motivo:** As policies RLS em produção leem o role via `auth.jwt() -> 'user_metadata' ->> 'role'`.
A função `get_user_role()` no banco também usa metadata.
**O que acontece se remover:** Usuários novos não conseguem acessar nenhum dado via RLS.
**Histórico:** Em agosto/2026, o ChatGPT removeu `role` do `user_metadata` no signup e createUser como "melhoria de segurança". Foi revertido no commit `8f7f6da`.
**REGRA:** Ao criar/cadastrar usuário, SEMPRE incluir `role` no `options.data` do `supabase.auth.signUp()`.
SEMPRE manter o upsert de perfil em `profiles` como rede de segurança.

---

## ⚠️ DECISÃO-03 — Upsert de perfil no signup é rede de segurança
**Motivo:** Não há confirmação de que existe trigger no banco criando perfil automaticamente.
O upsert no `signUp()` garante que o perfil existe mesmo se o trigger falhar.
**O que acontece se remover:** Usuários podem ficar "órfãos" — existem no Auth mas sem perfil.
**REGRA:** Manter o upsert de perfil em `signUp()` e verificar que `createUser()` também cria perfil.

---

## DECISÃO-04 — Supabase PRO com compute Small
**Data:** fevereiro/2026
**Motivo:** Plano Free causava timeouts de 30s em queries RLS complexas e pausava após 7 dias.
**Custo:** ~$25/mês USD.

---

## DECISÃO-05 — RLS por role via JWT metadata + profiles como fonte de autorização
**Data:** jan-ago/2026 (evolução contínua)
**Estado atual (produção):**
- RLS usa `auth.jwt() -> 'user_metadata' ->> 'role'` via funções helper (get_user_role, etc.)
- Server-side (server.mjs, endpoints Vercel) usa `profiles` como fonte de verdade
- Frontend (SupabaseService) valida via `profiles` mas mantém role no JWT por compatibilidade
**Migração futura (V46 — NÃO APLICADA):**
- A V46 migraria todas as policies para ler de `profiles` via schema `private`
- Ela foi criada pelo ChatGPT mas tem bugs (não dropa `read_students_v12` antes do check final)
- NÃO aplicar sem revisão e teste completo em ambiente descartável

---

## DECISÃO-06 — Breakpoint lg para sidebar (não md)
**Motivo:** O breakpoint `md` (768px) ativa sidebar de 288px em tablets, deixando 480px úteis.
**Status:** ⏳ Ainda não implementado — documentado como BUG-03.

---

## DECISÃO-07 — INSERT em clinical_sessions simplificada (V39)
**Motivo:** Subquery aninhada na policy antiga retornava NULL no contexto RLS.
**Solução:** `WITH CHECK (professional_id = auth.uid())`.

---

## DECISÃO-08 — Comando de build customizado no package.json
**Motivo:** O Hostinger (e antes Vercel) tentava rodar `npm run build`.
**Solução:** `"build": "echo 'dist already built' && exit 0"`.
**Para buildar de verdade:** `npm run build:vite`.

---

## DECISÃO-09 — Perfis restritos por especialidade
**Arquivo:** `src/config/perfilRestrito.ts`
**Motivo:** Especialistas não devem ver todos os alunos da rede — apenas os com agendamento vinculado.
**Especialidades restritas:** psicologia, psicopedagogia, terapia_ocupacional, fonoaudiologia, fisioterapia, nutricao.

---

## DECISÃO-10 — Dois formatos de token no tailwind.config.js
**Motivo:** Componentes antigos usam `sanctuary.primary.500`, novos usam `sanctuary-primary-500`.
**REGRA:** Ao alterar uma cor, atualizar nos DOIS formatos.

---

## DECISÃO-11 — WhatsApp via webhook próprio
**Status:** Implementado, endpoint protegido por autenticação (commit 25f2c67).
**Problema ativo:** Apache no Hostinger intercepta `/api` antes do Node.js. Workaround manual via SSH.

---

## DECISÃO-12 — Soft delete em profissionais de apoio (V29, V31, V34)
**Motivo:** Hard delete quebraria histórico de vínculos. Campo `deleted_at` + filtro na interface.

---

## DECISÃO-13 — Autorização server-side via profiles (agosto/2026)
**Commits:** 25f2c67, 8f7f6da
**O que foi feito:**
- Endpoints Gemini e WhatsApp validam sessão + perfil ativo em `profiles`
- server.mjs usa módulo `server/authorization.mjs` com permissões por role
- SupabaseService valida role via set `TRUSTED_USER_ROLES` (inclui SOCIAL_WORKER)
- Signup mantém role no JWT metadata (compatibilidade RLS) + upsert de perfil
- Rota /admin tem guarda visual (só ADMIN renderiza UserManagement)
**Coexistência:** RLS no banco ainda usa JWT metadata. Server-side usa profiles. Ambos devem ser mantidos.

---

## DECISÃO-14 — Alunos duplicados resolvidos via status 'Duplicado' (agosto/2026)
**O que foi feito:** 3 registros marcados com `status = 'Duplicado'` (deleção lógica):
- Dandara Maria Rodrigues de Souza (6344dc1a) — registro vazio idêntico
- Helena Andrade de Oliveira (a3c89578) — Marechal Deodoro sem dados (mantido Timoteo Lopes com 3 agendamentos)
- Lauany Moreira Novais (625721ad) — N.S. do Carmo sem dados (mantido D. Pedro II com 2 agendamentos + 1 sessão)
**Pendente:** Eyglison Otávio Gomes da Silva — 2 registros com datas de nascimento e diagnósticos diferentes. Aguardando decisão do gestor.
**REGRA:** Queries de listagem de alunos devem filtrar `.eq('status', 'Active')`.

---

## DECISÃO-15 — Classificação de especificidade é computada, não armazenada
**Data:** agosto/2026
**Motivo:** Evitar nova coluna/migration para um dado derivável dos campos já existentes.
**Regra:** CONFIRMADO = `clinical_info.cid` preenchido OU documento tipo "Laudo Médico" anexado. SUSPEITO = `clinical_info.diagnosis` preenchido sem CID nem laudo. SEM_IDENTIFICACAO = sem diagnóstico.
**Arquivo:** `src/utils/studentClassification.ts` — função pura, sem I/O, reutilizável em qualquer dashboard.
**Consequência:** Se o formulário de anexo de documentos mudar o valor `type` de "Laudo Médico", a classificação quebra silenciosamente. Ao alterar esse campo, atualizar `temLaudoAnexado()` também.

---

## Linha do tempo do projeto

| Período | Evento |
|---|---|
| Dez/2025 | v1.0 — cadastro básico de alunos e agendamentos |
| Jan/2026 | Crise de RLS: loop infinito. Resolvido com V11-V12 |
| Fev/2026 | Upgrade Supabase Free → PRO Small |
| Mar/2026 | Prontuário clínico, módulo psicologia, serviço social |
| Abr/2026 | RLS refinado ("parede de concreto" por especialidade) |
| Mai/2026 | v2.4 — auditoria responsividade, V39, V40 nutrição |
| Jun/2026 | Sistema estável em produção, foco em UX |
| Jul/2026 | V41-V45: cadastro rápido, desvinculação, atestado, antropometria, lançamento retroativo |
| Ago/2026 | Auditoria de segurança (ChatGPT), correções de autorização, classificação de especificidade |
