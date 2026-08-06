# 04 — Bugs e Pendências — Sistema Brotar

> **Atualizado em:** 06/08/2026
> Consulte antes de iniciar qualquer sessão de desenvolvimento.

---

## 🔴 CRÍTICO

### BUG-01 — Admin não consegue editar/excluir outros usuários
- **Status:** ⏳ Pendente — SQL `fix_rls_v6_admin_full.sql` criado, não aplicado
- **Causa:** Migration V5 restringiu demais o perfil ADMIN
- **Risco:** Admin não gerencia usuários de teste

---

## 🟠 ALTO

### BUG-03 — Sidebar em tablets de 768px
- **Status:** ⏳ Pendente
- **Arquivo:** `components/Layout.tsx` — linhas 301, 414, 491
- **Solução:** Trocar `md:` por `lg:` nos 3 pontos

### BUG-04 — Tabela de alunos quebra em celular
- **Status:** ⏳ Pendente
- **Arquivo:** `components/PatientList.tsx`
- **Solução:** Cards empilhados para telas < 640px

### PEND-01 — V46 não aplicável no banco
- **Status:** ⛔ Bloqueada
- **Arquivo:** `db/migrations/V46_server_controlled_profile_authorization.sql`
- **Problema:** Não dropa `read_students_v12` antes do check final → se auto-rejeita
- **Referencia colunas inexistentes:** status, account_status, suspended, is_suspended em profiles
- **Ação:** NÃO aplicar até revisão completa. Precisa de ambiente descartável para teste.

### PEND-02 — Eyglison duplicado pendente de decisão
- **Status:** ⏳ Aguardando gestor
- **Problema:** 2 registros com datas de nascimento e diagnósticos diferentes
- **IDs:** 1ec12dc6 (TDAH, nasc 18/02) e cdd8289a (TEA+Bipolaridade, nasc 18/05)
- **Ação:** Gestor deve confirmar qual é o correto

### PEND-03 — Classificação de especificidade no dashboard
- **Status:** 🔄 Em implementação
- **O que faz:** Cards confirmados/suspeitos/sem identificação + alerta de alunos sem laudo
- **Lógica:** CID preenchido OU laudo = CONFIRMADO; diagnóstico sem CID/laudo = SUSPEITO
- **Escopo:** Dashboard SECRETARIA_SEDE e SECRETARIA_COCAL

### PEND-04 — WhatsApp workaround Apache
- **Status:** ⏳ Pendente permanente
- **Problema:** Apache intercepta `/api` antes do Node.js no Hostinger compartilhado
- **Workaround:** Iniciar manualmente via SSH: `/opt/alt/alt-nodejs22/root/usr/bin/node --env-file=.env server.mjs &`

---

## 🟡 MÉDIO

### BUG-05 — Gráfico Radar ilegível em celular
- **Status:** ⏳ Pendente
- **Solução:** Modal fullscreen

### BUG-06 — Anamnese psicopedagogia mistura componentes antigos e novos
- **Status:** ⏳ Pendente
- **Arquivo:** `components/ClinicalPages.tsx`

### BUG-07 — Gráficos Dashboard geram scroll lateral no celular
- **Status:** ⏳ Pendente
- **Solução:** `minWidth={0}` nos containers pai

### PEND-05 — Rotação de credenciais
- **Status:** ⏳ Pendente (manual)
- **O que rotacionar:** Chave Gemini, service_role Supabase, token WhatsApp, senha de teste
- **Motivo:** Commit 3be9216 removeu credenciais do código, mas o histórico Git ainda as contém

---

## 🔵 BAIXO

### MELHORIA-01 — Imagens sem alt descritivo
### MELHORIA-02 — Múltiplos H1 na mesma página
### MELHORIA-03 — Imagem de background em formato pesado (JPG → WebP)
### MELHORIA-04 — Sitemap com domínio placeholder

---

## ✅ RESOLVIDOS

| ID | Descrição | Quando |
|---|---|---|
| RLS-LOOP | Recursividade infinita no RLS | jan/2026 |
| TIMEOUT | Timeouts por plano Free | fev/2026 |
| RLS-STUDENTS | Alunos não carregavam para escolas | mar/2026 |
| CLINICAL-INSERT | Erro RLS ao salvar sessão clínica (V39) | mai/2026 |
| SOFT-DELETE | Profissionais de apoio não desvinculavam (V29-V34) | abr/2026 |
| SEC-CREDENTIALS | Credenciais expostas no código/bundle (3be9216) | ago/2026 |
| SEC-DIST | dist/ removido do Git por engano (a8e9028) | ago/2026 |
| SEC-AUTH | Autorização server-side via profiles (25f2c67, 8f7f6da) | ago/2026 |
| SEC-ADMIN-ROUTE | Guarda visual rota /admin (5d8d3d9) | ago/2026 |
| DUPLICADOS-3 | 3 alunos duplicados inativados (Dandara, Helena, Lauany) | ago/2026 |

---

## 📋 Evoluções planejadas

1. Central de Agendamentos — UX: visualização semana, drag-and-drop, WhatsApp
2. Atestado de Comparecimento — preview implementado, campos livres pendentes
3. Relatório Anual TCM — validar com dados reais
4. Relatório TEA — revisar cálculo e exportação
5. Navegação unificada — padrão do módulo psicologia replicado para outras especialidades
6. Classificação de especificidade — cards no dashboard das secretárias
