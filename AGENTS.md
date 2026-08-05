# Repository Guidelines

## Leitura obrigatória

Antes de alterar o sistema, leia `docs/ARQUITETURA_ATUAL.md`, `docs/AUDITORIA_TECNICA.md`, `docs/PLANO_DE_CORRECAO.md` e `docs/MAPA_FRONTEND_BACKEND.md`. Esses arquivos registram a arquitetura observada, riscos conhecidos e a ordem segura de correção. Confirme no ambiente de homologação tudo que depender do estado remoto do Supabase.

## Estrutura do projeto

A aplicação principal é React 18, TypeScript e Vite. Os pontos de entrada são `src/main.tsx` e `src/App.tsx`. Código novo deve preferencialmente ficar em `src/features/`; itens compartilhados pertencem às pastas correspondentes em `src/`. Há módulos legados ainda ativos em `components/`, `services/`, `contexts/`, `hooks/` e `utils/`; siga a localização da funcionalidade existente e evite duplicar componentes.

- `services/SupabaseService.ts`: principal gateway de dados do navegador.
- `server.mjs` e `api/whatsapp/`: backends auxiliares de WhatsApp.
- `db/migrations/`: migrações versionadas; SQLs na raiz são scripts históricos ou avulsos.
- `public/`: ativos estáticos; `tests/integration/`: testes de RLS.
- `dist/`: artefato gerado atualmente rastreado pelo Git; não edite manualmente.

## Comandos de desenvolvimento e validação

Use Node.js 22.x, conforme `package.json`. No PowerShell, prefira `npm.cmd` se a política local bloquear `npm.ps1`.

- `npm install`: instala dependências; só execute quando a tarefa autorizar mudanças no lockfile ou ambiente.
- `npm run dev`: inicia o Vite na porta 5500 e expõe o servidor na rede local.
- `npm.cmd exec tsc -- --noEmit`: executa a checagem de tipos sem gerar arquivos.
- `npm test -- --run`: executa uma passagem do Vitest.
- `npm run test:rls`: executa testes de integração das políticas Supabase; requer credenciais exclusivas de teste.
- `npm run build:vite`: gera o bundle real de produção em `dist/`.
- `npm run preview`: serve localmente o bundle produzido.

`npm run build` é intencionalmente um no-op e não serve como validação. Não existe lint configurado no repositório; registre essa limitação no PR.

## Estilo e convenções

Use TypeScript, módulos ES, componentes funcionais, dois espaços, ponto e vírgula e aspas simples. Componentes e seus arquivos usam `PascalCase`; hooks começam com `use`; helpers usam `camelCase`. Prefira o alias `@/` e tipos explícitos a `any`. Preserve o estilo próximo enquanto não houver formatter oficial. Separe regra de negócio, acesso a dados e apresentação; não amplie arquivos monolíticos como `ClinicalPages.tsx` ou `SupabaseService.ts` sem antes avaliar extração.

Testes são nomeados `*.test.ts(x)`, `*.spec.ts(x)` ou `*.integration.test.ts`. Toda correção de regressão deve incluir teste focado. Mudanças de autorização exigem testes positivos e negativos por papel, unidade/região e registro pertencente a outro usuário. Nunca execute integração contra produção.

## Regras de banco, autenticação e segurança

O Supabase/RLS é a barreira real de autorização; esconder rotas ou botões não substitui política de banco. Papéis confiáveis devem vir de `profiles` ou de claims imutáveis controladas pelo servidor, nunca de `user_metadata`. Funções `SECURITY DEFINER` precisam validar o chamador internamente, fixar `search_path`, ter grants mínimos e testes de abuso.

Crie toda alteração de schema como uma nova migração ordenada em `db/migrations/`; não reescreva uma migração já aplicada e não execute SQL avulso sem confirmar histórico e rollback. Mudanças em RLS, Auth, Storage, certificados, auditoria, dados clínicos, nutrição ou escopo regional exigem revisão dedicada. Preserve isolamento por usuário, especialidade, escola, unidade e região.

Segredos ficam apenas em variáveis server-side ou `.env.local`. Variáveis `VITE_*` e valores definidos em `vite.config.ts` são públicos no bundle. Nunca registre tokens, payloads de webhook, telefones, CPF, diagnóstico ou dados de alunos. Não adicione dumps, backups ou artefatos com dados reais ao Git.

## Arquivos e áreas sensíveis

Analise impacto e dependências antes de modificar `src/App.tsx`, `services/SupabaseService.ts`, `supabaseClient.ts`, `server.mjs`, `api/whatsapp/*`, `vite.config.ts`, `db/migrations/*`, `supabase_schema.sql`, `.env*`, `vercel.json` ou `.htaccess`. Não edite `package-lock.json`, `dist/`, políticas RLS, funções RPC ou configurações de deploy como efeito colateral.

## Commits e pull requests

O histórico usa prefixos concisos como `feat:`, `fix:`, `ui:`, `db:`, `build:` e `perf:`. Mantenha commits estreitos. O PR deve descrever comportamento e papéis afetados, migrações e ordem de deploy, comandos executados, resultados e rollback. Vincule a issue e inclua capturas antes/depois em alterações visuais. Falhas ou testes ignorados devem aparecer explicitamente; não os apresente como validação concluída.
