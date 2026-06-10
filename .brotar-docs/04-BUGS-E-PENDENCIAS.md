# 04 — Bugs e Pendências — Sistema Brotar

> **Como usar este arquivo**
> Consulte aqui antes de iniciar qualquer sessão de desenvolvimento.
> Atualize sempre que um bug for resolvido ou um novo for encontrado.
> Cada item tem um status, prioridade e o arquivo afetado.

---

## 🔴 CRÍTICO — Resolver antes de qualquer nova funcionalidade

### BUG-01 — Admin não consegue editar/excluir outros usuários
- **Status:** ⏳ Aguardando aplicação do SQL
- **Arquivo SQL:** `fix_rls_v6_admin_full.sql` (já criado, falta aplicar no Supabase)
- **Causa:** A migration V5 resolveu o loop de RLS mas restringiu demais o perfil ADMIN.
- **Impacto:** Admin não consegue editar perfis de terceiros nem excluir usuários de teste.
- **Solução pronta:** Aplicar o script `fix_rls_v6_admin_full.sql` no painel SQL do Supabase.
- **Como testar:** Logar como ADMIN → Gestão de Usuários → tentar editar e excluir um usuário.

---

### BUG-02 — Erro de RLS ao salvar evoluções clínicas
- **Status:** ✅ Migration criada (V39) — confirmar se foi aplicada
- **Arquivo:** `db/migrations/V39_fix_clinical_sessions_rls.sql`
- **Causa:** A política antiga de INSERT em `clinical_sessions` usava subquery aninhada que retornava NULL no PostgreSQL, rejeitando o INSERT mesmo com dados corretos.
- **Solução aplicada:** Nova política simplificada baseada apenas em `professional_id = auth.uid()`.
- **Como verificar:** No Supabase → SQL Editor → rodar: `SELECT policyname FROM pg_policies WHERE tablename = 'clinical_sessions';` e confirmar que existe a política "Permitir inserção de novas sessões".

---

## 🟠 ALTO — Resolver assim que possível

### BUG-03 — Sidebar aparece em tablets de 768px (tela muito apertada)
- **Status:** ✅ Resolvido (confirmado em 10/06/2026)
- **Arquivo:** `components/Layout.tsx`
- **Como foi resolvido:** Breakpoints já estavam corrigidos para `lg:` em sessão anterior. Sidebar desktop usa `hidden lg:flex`, header mobile usa `lg:hidden`, main usa `lg:ml-72` e `lg:ml-[72px]` para o modo colapsado.

---

### BUG-04 — Lista de alunos quebra em celular (tabela estoura a tela)
- **Status:** ⏳ Pendente
- **Arquivo:** `components/PatientList.tsx` — linhas 558–620
- **Causa:** Tabela com 5 colunas não tem scroll horizontal isolado nem versão mobile em cards.
- **Impacto:** No celular, o usuário precisa rolar a página toda para clicar nas ações.
- **Solução:** Criar visualização alternativa em cards para telas menores que 640px (ocultar tabela com `hidden sm:table`, mostrar cards com `grid grid-cols-1 gap-4 sm:hidden`).
- **Risco:** Médio. Precisa preservar todos os dados e ações visíveis.

---

### BUG-05 — Gráfico Radar ilegível em celular
- **Status:** ⏳ Pendente
- **Arquivo:** `components/RoleDashboards.tsx` — linha 2465+
- **Causa:** RadarChart do Recharts em telas de 375px encolhe até os rótulos colidirem no centro.
- **Solução:** Adicionar botão "Expandir gráfico" que abre modal em tela cheia (`fixed inset-0 z-50`).
- **Risco:** Baixo. Funcionalidade adicional, não altera o que já existe.

---

## 🟡 MÉDIO — Melhorias importantes para qualidade

### BUG-06 — Formulário de Anamnese Psicopedagogia mistura componentes antigos e novos
- **Status:** ⏳ Pendente
- **Arquivo:** `components/ClinicalPages.tsx` — linhas 993–1360
- **Causa:** Parte da ficha usa componentes `<FormSection>` e `<TriStateField>` legados em vez dos novos `<PremiumFormSection>` e `<PremiumTriStateField>`.
- **Impacto:** Visual inconsistente, campos quebram em mobile, botão de excluir familiar fica invisível em telas touch.
- **Solução:** Migrar campos legados para os componentes premium. Corrigir posicionamento do botão de exclusão (`absolute top-4 right-4` → `relative mt-4 self-end`).

---

### BUG-07 — Gráficos do Dashboard geram scroll lateral no celular
- **Status:** ⏳ Pendente
- **Arquivo:** `components/Dashboard.tsx` — linhas 170–218
- **Causa:** `ResponsiveContainer` do Recharts sem `minWidth={0}` no pai.
- **Solução:** Adicionar `minWidth={0}` nos contêineres pai dos gráficos. Mover legendas para `verticalAlign="bottom"` em mobile.

---

### BUG-08 — Notificações flutuantes descentralizadas no celular
- **Status:** ⏳ Pendente
- **Arquivo:** `src/layouts/AppLayout.tsx` — linhas 10–35
- **Causa:** Posicionamento fixo das notificações não se adapta a telas pequenas.
- **Solução:** Usar classes responsivas: `right-4 left-4 sm:left-auto sm:right-6 sm:w-80`.

---

## 🔵 BAIXO — Melhorias de qualidade e SEO

### MELHORIA-01 — Imagens sem alt descritivo (acessibilidade e SEO)
- **Status:** ⏳ Pendente
- **Arquivos:** `components/Login.tsx`, `components/Layout.tsx`
- **Problema:** `alt="Logo"` e `alt="Background"` são genéricos.
- **Solução:** Usar textos descritivos. Ex: `alt="Logotipo do Sistema Brotar - Gestão Multidisciplinar"`. Imagens decorativas devem ter `alt=""`.

---

### MELHORIA-02 — Múltiplos H1 na mesma página
- **Status:** ⏳ Pendente
- **Arquivo:** `src/App.tsx`, `components/Layout.tsx`
- **Problema:** Pode haver mais de um `<h1>` por página, diluindo SEO e confundindo leitores de tela.
- **Solução:** Manter apenas um `<h1>` por tela (o título da página ativa). Usar `<div>` ou `<span>` estilizado para o nome do sistema no Sidebar.

---

### MELHORIA-03 — Imagens de background no login em formato pesado
- **Status:** ⏳ Pendente
- **Arquivo:** `public/capa_brotar3.jpg`
- **Problema:** Imagem JPG pode atrasar o LCP (tempo de carregamento da tela principal).
- **Solução:** Converter para formato WebP. Usar `loading="lazy"` onde aplicável.

---

### MELHORIA-04 — Sitemap com domínio placeholder
- **Status:** ⏳ Pendente
- **Arquivo:** `public/sitemap.xml`
- **Problema:** O sitemap foi gerado com `brotar.app` como placeholder em vez do domínio real.
- **Solução:** Substituir por `https://brotar.smebrotas.com.br` em todas as URLs do sitemap.

---

## ✅ RESOLVIDOS — Histórico

| ID | Descrição | Migration | Data |
|---|---|---|---|
| RLS-LOOP | Recursividade infinita no RLS — loop infinito em profiles | V11–V12 | jan/2026 |
| TIMEOUT | Timeouts no banco por plano Free | Upgrade para Supabase PRO Small | fev/2026 |
| RLS-STUDENTS | Alunos não carregavam para perfis de escola | V26, V27, V35 | mar/2026 |
| RLS-APPOINTMENTS | Agendamentos com status AGENDADO não retornavam | V15, V37 | mar/2026 |
| CLINICAL-INSERT | Erro "violates row-level security" ao salvar sessão clínica | V39 | mai/2026 |
| SOFT-DELETE | Profissionais de apoio não podiam ser desvinculados | V29, V31, V34 | abr/2026 |

---

## 📋 Pendências gerais (não são bugs, são evoluções planejadas)

1. **Central de Agendamentos:** Melhorar UX — visualização por semana, drag-and-drop, confirmação por WhatsApp.
2. **Relatório TEA:** Revisar cálculo e exportação PDF.
3. **Relatório Anual TCM:** Validar com dados reais de 2026.
4. **Notificações push:** Sistema de alertas de agendamento está implementado mas não testado em produção.
5. **Fluxo completo de novo aluno:** Testar criação → agendamento → evolução clínica → geração de documento.
6. **n8n keep-alive:** Confirmar que o workflow está ativo e rodando a cada 5 dias.
