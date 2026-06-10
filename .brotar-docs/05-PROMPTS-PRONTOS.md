# 05 — Prompts Prontos — Sistema Brotar

> Use este arquivo para copiar e colar prompts direto nos agents.
> Cada prompt já tem o contexto mínimo necessário para o agent trabalhar bem.
> Substitua os textos entre [colchetes] antes de usar.

---

## Como usar

1. Escolha o prompt da categoria certa
2. Substitua os campos entre `[colchetes]`
3. Cole no agent correto (indicado no título de cada prompt)
4. O agent já receberá o contexto necessário sem precisar reler tudo

---

## CATEGORIA 1 — Corrigir bugs de interface

### PROMPT-01 — Corrigir bug visual em componente React
**Agent:** `@frontend-specialist`

```
@frontend-specialist

Preciso corrigir um problema visual no Sistema Brotar v2.1.

STACK: React 18 + TypeScript + Tailwind CSS 3 + Vite 6

ARQUIVO: components/[NomeDoComponente].tsx

PROBLEMA:
[Descreva o que está acontecendo — ex: "O botão de salvar some em telas menores que 768px"]

COMPORTAMENTO ESPERADO:
[Ex: "O botão deve aparecer sempre, independente do tamanho da tela"]

REGRAS QUE NÃO PODEM SER QUEBRADAS:
- Não alterar a lógica de dados, apenas o visual/layout
- Manter compatibilidade com Tailwind CSS 3 (não usar v4)
- Seguir o Design System: cor primária #3B82F6, CTA #F97316, border-radius cards 12px
- Não remover funcionalidades existentes

Me mostre as alterações necessárias com o diff exato (antes/depois).
```

---

### PROMPT-02 — Corrigir responsividade (celular/tablet)
**Agent:** `@ui-ux-pro-max`

```
@ui-ux-pro-max

Preciso corrigir a responsividade do Sistema Brotar v2.1.

ARQUIVO: components/[NomeDoComponente].tsx

PROBLEMA EM [375px / 768px]:
[Descreva o que quebra — ex: "Tabela estoura a tela, usuário precisa rolar horizontalmente"]

DECISÃO JÁ TOMADA:
- Sidebar deve aparecer apenas em telas ≥ 1024px (breakpoint lg, não md)
- Em mobile, tabelas densas devem virar cards empilhados
- Gráficos Radar devem abrir em modal fullscreen no mobile

DESIGN SYSTEM:
- Cores: primário #3B82F6, CTA #F97316, background #F8FAFC, texto #1E293B
- Border radius: 12px em cards, 8px em inputs
- Fonte: DM Sans (já importada no projeto)
- Estilo: premium, acessível, WCAG compliant

Me entregue o código corrigido completo do arquivo.
```

---

## CATEGORIA 2 — Banco de dados e RLS

### PROMPT-03 — Criar nova migration SQL
**Agent:** `@database-architect`

```
@database-architect

Preciso criar uma nova migration para o Sistema Brotar v2.1.

BANCO: PostgreSQL via Supabase (projeto: indshiztdvjgvgnzigqd)
ÚLTIMA MIGRATION APLICADA: V39
NOVA MIGRATION: V40

OBJETIVO:
[Descreva o que precisa ser feito — ex: "Adicionar coluna 'observacao' do tipo TEXT na tabela appointments"]

REGRAS OBRIGATÓRIAS:
- O arquivo deve se chamar V40_[descricao].sql e ficar em db/migrations/
- Sempre usar IF NOT EXISTS / IF EXISTS para evitar erros em reexecução
- Nunca fazer DROP de coluna com dados — usar soft delete ou renomear
- Ao alterar RLS: sempre DROP POLICY IF EXISTS antes de CREATE POLICY
- Adicionar NOTIFY pgrst, 'reload config'; no final se alterar RLS
- Não pode quebrar as migrations V11 a V39 já aplicadas

Me entregue o arquivo SQL completo pronto para aplicar.
```

---

### PROMPT-04 — Diagnosticar problema de RLS
**Agent:** `@database-architect`

```
@database-architect

Preciso diagnosticar um problema de RLS no Sistema Brotar v2.1.

BANCO: PostgreSQL via Supabase (projeto: indshiztdvjgvgnzigqd)
TABELA COM PROBLEMA: [nome_da_tabela]

SINTOMA:
[Ex: "Usuário com role SPECIALIST tenta fazer INSERT e recebe: 'new row violates row-level security policy'"]

ROLE DO USUÁRIO: [ADMIN / SPECIALIST / SECRETARIA_SEDE / etc.]
OPERAÇÃO: [SELECT / INSERT / UPDATE / DELETE]

CONTEXTO IMPORTANTE:
- O role do usuário está em auth.jwt() -> 'user_metadata' ->> 'role' (NÃO na tabela profiles diretamente)
- Evitar subqueries aninhadas nas políticas RLS — elas podem retornar NULL no contexto de segurança
- Migrations aplicadas: V11 a V39

Me diga: qual é a causa provável e qual SQL corrige o problema?
```

---

## CATEGORIA 3 — Novas funcionalidades

### PROMPT-05 — Adicionar campo em formulário existente
**Agent:** `@frontend-specialist`

```
@frontend-specialist

Preciso adicionar um novo campo ao formulário do Sistema Brotar v2.1.

ARQUIVO: components/[NomeDoFormulário].tsx
TABELA NO BANCO: [nome_da_tabela] (já tem a coluna — migration já aplicada)
NOME DA COLUNA: [nome_da_coluna]
TIPO: [texto / número / data / seleção / checkbox]

NOVO CAMPO:
- Label: "[Nome visível ao usuário]"
- Tipo de input: [text / number / date / select / textarea]
- Obrigatório: [sim / não]
- [Adicionar qualquer validação necessária]

REGRAS:
- Seguir o padrão visual existente no formulário (não criar novo estilo)
- Salvar no Supabase via SupabaseService.ts (verificar se a função já existe)
- Não alterar outros campos existentes
- Manter TypeScript tipado corretamente

Me entregue: (1) alteração no componente, (2) alteração no SupabaseService.ts se necessário, (3) alteração no types.ts se necessário.
```

---

### PROMPT-06 — Criar novo componente de tela
**Agent:** `@frontend-specialist` + `@ui-ux-pro-max`

```
@frontend-specialist @ui-ux-pro-max

Preciso criar uma nova tela no Sistema Brotar v2.1.

NOME DO COMPONENTE: [NomeDaTela].tsx
LOCAL: components/[NomeDaTela].tsx
QUEM ACESSA: [roles que podem ver essa tela]

OBJETIVO DA TELA:
[Descreva o que o usuário vai fazer nessa tela]

DADOS NECESSÁRIOS:
- [Tabela 1]: buscar [o quê]
- [Tabela 2]: salvar [o quê]

DESIGN SYSTEM OBRIGATÓRIO:
- Cores: primário #3B82F6, CTA #F97316, background #F8FAFC
- Fonte: DM Sans
- Cards: border-radius 12px, shadow-md
- Inputs: border #E2E8F0, focus border #3B82F6
- Botão primário: fundo #F97316, texto branco
- Responsivo: funcionar em 375px, 768px, 1024px e 1440px

Me entregue o componente completo TypeScript + Tailwind, pronto para importar no App.tsx.
```

---

## CATEGORIA 4 — Deploy e infraestrutura

### PROMPT-07 — Fazer build e deploy
**Agent:** sem agent — executar direto no terminal

```
# Passo 1: Fazer checkpoint
git add .
git commit -m "checkpoint: antes do build [data]"

# Passo 2: Build
npx vite build

# Passo 3: Verificar se a pasta dist/ foi gerada
# (deve aparecer arquivos novos em dist/assets/)

# Passo 4: Commit com o build incluído
git add .
git commit -m "build: versão [X.X.X] - [descrição do que mudou]"

# Passo 5: Push para o GitHub (deploy automático na Vercel)
git push
```

---

### PROMPT-08 — Aplicar migration no Supabase
**Sem agent — executar manualmente no painel do Supabase**

```
1. Acesse: https://supabase.com/dashboard/project/indshiztdvjgvgnzigqd
2. Menu lateral → SQL Editor
3. Clique em "+ New query"
4. Cole o conteúdo do arquivo db/migrations/V[XX]_[nome].sql
5. Clique em "Run"
6. Verifique se aparece "Success" (sem erros em vermelho)
7. Anote no arquivo 03-HISTORICO-E-DECISOES.md que a migration foi aplicada
```

---

## CATEGORIA 5 — Debugging

### PROMPT-09 — Investigar erro no console
**Agent:** `@debugger`

```
@debugger

Preciso investigar um erro no Sistema Brotar v2.1.

STACK: React 18 + TypeScript + Supabase + Vite 6

ERRO NO CONSOLE:
[Cole aqui o erro completo do console do navegador]

CONTEXTO:
- Quando ocorre: [Ex: "ao clicar em Salvar no formulário de agendamento"]
- Usuário logado: role [SPECIALIST / ADMIN / etc.]
- Funciona para outros usuários: [sim / não / não testei]

ARQUIVOS PROVAVELMENTE ENVOLVIDOS:
- components/[Componente].tsx
- services/SupabaseService.ts (função [nomeDaFunção])

REGRAS:
- Não alterar o que já funciona
- Se for RLS, lembre que o role está em auth.jwt() -> 'user_metadata' ->> 'role'
- Preferir solução mínima e cirúrgica

Qual é a causa e qual é a correção?
```

---

### PROMPT-10 — Verificar se migration foi aplicada
**Sem agent — rodar no SQL Editor do Supabase**

```sql
-- Verificar políticas RLS de uma tabela
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = '[nome_da_tabela]'
ORDER BY policyname;

-- Verificar colunas de uma tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = '[nome_da_tabela]'
ORDER BY ordinal_position;

-- Verificar se índice existe
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = '[nome_da_tabela]';
```
