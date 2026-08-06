# Sistema Brotar — Guia para Agents e IAs

> **Atualizado em:** 06/08/2026 | **Versão:** 2.4.161
> Leia `.brotar-docs/00-LEIA-PRIMEIRO.md` ANTES de qualquer alteração.

## ⛔ O QUE NUNCA FAZER (erros já cometidos por IAs)

| Ação proibida | O que acontece | Incidente |
|---|---|---|
| Remover dist/ do Git ou adicionar ao .gitignore | Deploy fica vazio | ChatGPT ago/2026 |
| Remover role do user_metadata no signup | Usuários novos sem acesso RLS | ChatGPT ago/2026 |
| Remover upsert de perfil no signup | Usuários órfãos sem perfil | ChatGPT ago/2026 |
| Aplicar V46 sem teste | Se auto-rejeita, mas pode travar | Detectado na revisão |
| Usar Tabler icons (ti ti-) | Renderiza quadrados cinza | Resolvido v2.4.156 |
| Commit genérico ("fix: correções") | Rejeitado pelo gestor | Regra do projeto |
| supabase.from() em componente | Quebra padrão de serviço | Regra do projeto |

## Estrutura do projeto

```
Sistema-Brotar-v-2.1/
├── src/                    → Código principal (React + TypeScript)
│   ├── App.tsx             → Roteamento (guarda visual /admin)
│   ├── main.tsx            → Entry point
│   ├── config/             → perfilRestrito.ts, version.ts
│   ├── utils/              → Utilitários (studentClassification.ts)
│   └── routes/             → ProtectedRoute.tsx
├── components/             → Todas as telas do sistema
├── services/
│   ├── supabaseClient.ts   → Conexão Supabase
│   └── SupabaseService.ts  → TODAS as queries (4400+ linhas)
├── contexts/               → AuthContext, NotificationContext
├── server/
│   └── authorization.mjs   → Autorização server-side
├── api/
│   ├── _shared/authorization.ts → Autorização endpoints Vercel
│   ├── gemini/             → Endpoint Gemini (server-side)
│   └── whatsapp/           → Endpoint WhatsApp (server-side)
├── server.mjs              → Express (Gemini, WhatsApp, testes)
├── db/migrations/          → V11 a V46 (V46 NÃO aplicada)
├── dist/                   → Build compilado (DEVE estar no Git)
├── .brotar-docs/           → Documentação completa do projeto
├── types.ts                → Tipos TypeScript (UserRole, etc.)
└── tailwind.config.js      → Design system (dois formatos de token)
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Inicia Vite em localhost:5173 |
| `npm run build:vite` | Build real de produção |
| `npm run build` | NO-OP (retorna "dist already built") |
| `npm test -- --run` | Roda testes Vitest |
| `npm run version:patch` | Bumpa versão (ANTES do build) |
| `npm start` | Inicia server.mjs (Express) |
| `node --check server.mjs` | Verifica sintaxe do servidor |

## Roles válidos (tipos + banco)

```typescript
type UserRole = 'ADMIN' | 'SPECIALIST' | 'ASSISTANT' |
  'EDUCATION_SECRETARY' | 'SECRETARIA_SEDE' | 'SECRETARIA_COCAL' |
  'COORDENADOR' | 'ESCOLA' | 'SOCIAL_WORKER';
```

**NÃO existe no código:** SECRETARIA_EDUCACAO, SUPPORT_PROFESSIONAL

## Banco de dados

- **20 tabelas** em produção (ver lista em 00-LEIA-PRIMEIRO.md)
- **24 funções SQL** (helpers RLS + RPCs)
- **Migrations aplicadas:** V11 a V45
- **V46:** NÃO aplicada, NÃO aplicar sem revisão
- **RLS ativo** em todas as tabelas principais
- **Alunos com status 'Duplicado'** devem ser filtrados nas queries
