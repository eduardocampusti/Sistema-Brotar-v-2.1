# Plano de Correção

## Princípios de execução

Este plano não foi aplicado durante a auditoria. Cada fase deve ocorrer primeiro em ambiente isolado, com backup verificável, inventário de dependências, rollback e evidências de teste. Não executar SQLs históricos diretamente em produção. Para segurança, testar tanto acesso permitido quanto acesso negado.

## Fase 0 — contenção e resposta a incidente

**Objetivo:** reduzir imediatamente exposição de credenciais, dados e operações privilegiadas.

1. Preservar evidências e identificar responsáveis por Supabase, Google, Meta, deploy e Git.
2. Inventariar e revogar/rotacionar chaves potencialmente expostas, começando por Gemini, JWTs/tokens aparentes e service role.
3. Verificar logs de uso anômalo e a distribuição dos arquivos JSON/dumps rastreados.
4. Restringir temporariamente endpoints WhatsApp e a execução de `delete_user_complete` e emissão de atestados.
5. Confirmar ACLs, policies, funções e buckets no banco remoto por consultas somente leitura.
6. Planejar remoção de dados/segredos da árvore e, se necessário, do histórico Git sem perder cadeia de evidências.

**Aceite:** nenhuma credencial exposta permanece válida; operações críticas exigem bloqueio explícito; relatório de incidente e inventário de ambientes aprovados.

**Rollback:** credenciais anteriores não devem ser reativadas; integrações usam chaves novas armazenadas somente no servidor.

## Fase 1 — identidade, sessão e RBAC

**Dependência:** Fase 0 e inventário de usuários/perfis.

1. Definir `profiles` ou claims server-side imutáveis como única fonte de papel, unidade e região.
2. Remover confiança em `user_metadata` de código, funções e RLS.
3. Bloquear login de perfil inativo e eliminar fallback que fabrica usuário ativo.
4. Corrigir logout para encerrar a sessão Supabase em todos os pontos.
5. Implementar guards centralizados de rota e ação por papel, mantendo RLS como barreira final.
6. Substituir criação/alteração de usuários por backend/RPC que valide administrador internamente.
7. Recriar `delete_user_complete` e demais funções privilegiadas com `search_path` fixo, grants mínimos e auditoria.

**Testes obrigatórios:** matriz por papel; conta desativada; sessão após refresh/logout; tentativa de alterar metadata; chamada direta das RPCs por usuário comum.

**Aceite:** nenhum papel pode ser elevado pelo cliente; toda conta inativa é recusada; rotas e banco negam os mesmos cenários.

## Fase 2 — contratos frontend/backend e integrações

**Dependência:** contrato de identidade da Fase 1.

1. Criar tipos compartilhados para usuário, escola, aluno, nutrição e navegação.
2. Corrigir os 14 diagnósticos atuais do typecheck e tornar `tsc --noEmit` gate obrigatório.
3. Tornar rotas de aluno duráveis com ID na URL e estados claros de carregamento/ausência.
4. Consolidar WhatsApp em um único backend.
5. Validar assinatura Meta, timestamp/replay e idempotência; redigir PII dos logs.
6. Autenticar envio, remover endpoint de teste público, limitar taxa e validar destinatário/template.
7. Mover Gemini para backend autenticado, aplicar quota, minimização de PII e observabilidade.

**Aceite:** typecheck limpo; refresh preserva o contexto da tela; requests falsificadas não alteram agenda; nenhum segredo é emitido no bundle.

## Fase 3 — reconciliação e endurecimento do banco

**Dependência:** snapshot somente leitura do schema remoto e decisão sobre fonte de identidade.

1. Comparar schema remoto, `supabase_schema.sql`, `db/migrations/` e SQLs da raiz.
2. Criar ledger único, resolver numeração V38 duplicada e registrar checksum/ordem por ambiente.
3. Versionar definições ausentes (`generated_documents`, RPCs e políticas de Storage) sem reescrever migrações aplicadas.
4. Redesenhar RLS de alunos, sessões, nutrição, auditoria e documentos pela matriz papel × região × vínculo × especialidade.
5. Tornar buckets privados e usar URLs assinadas com duração mínima.
6. Planejar normalização de `students.clinical_info`, preservando compatibilidade e histórico.
7. Adicionar constraints, FKs, índices e regras de deleção onde a semântica estiver confirmada.

**Aceite:** um ambiente vazio é reproduzível apenas pelas migrações; diff de schema é conhecido; suíte RLS cobre cross-user, cross-school, cross-region e cross-specialty.

**Rollback:** migrações expansivas primeiro; remoção de colunas/policies antigas somente após leitura dupla e janela de observação.

## Fase 4 — regras de negócio críticas

**Dependência:** Fases 1–3.

1. Reimplementar atestado como operação server-side transacional que valide agendamento, emissor, aluno e papel.
2. Assinar conteúdo canônico e criar verificação pública que revele apenas o mínimo necessário.
3. Definir transição para atestados legados e revogação/reemissão.
4. Corrigir vínculos de atendimento clínico e nutricional por especialidade e profissional.
5. Formalizar estados e transições de agendamento, inclusive mensagens duplicadas ou fora de ordem.
6. Tornar `audit_logs` append-only e não forjável, com política de retenção e redação.

**Aceite:** documento não pode ser forjado no cliente; mudança de estado inválida é recusada atomicamente; logs identificam ator confiável sem PII excessiva.

## Fase 5 — qualidade, acessibilidade e desempenho

**Dependência:** baseline funcional das fases anteriores.

1. Configurar ESLint, regras React Hooks, formatter e checagens de acessibilidade.
2. Adicionar CI em Node 22 com typecheck, testes, build, scanner de segredo e validação de migrações.
3. Ampliar testes unitários e de integração; adicionar E2E para login, aluno, agenda, atendimento, documento e administração.
4. Extrair domínios de `ClinicalPages.tsx` e `SupabaseService.ts` em mudanças pequenas e testadas.
5. Remover componentes/serviços duplicados somente após confirmar ausência de importação e uso operacional.
6. Corrigir semântica de teclado, `alt`, foco, estados de erro e templates HTML escapados.
7. Medir bundle, dividir rotas pesadas e revisar dependências/chunks somente com métricas.

**Aceite:** pipeline bloqueia regressões; cobertura mínima é definida por risco, não apenas percentual; fluxos críticos passam em viewport móvel e desktop; orçamento de bundle é registrado.

## Fase 6 — consolidação arquitetural e operação

**Dependência:** segurança e contratos estabilizados.

1. Definir fronteiras por domínio (`students`, `appointments`, `clinical`, `nutrition`, `documents`, `admin`).
2. Manter no backend regras de autoridade, integrações de terceiros e operações com service role.
3. Substituir o gateway monolítico por serviços tipados e pequenos, preservando adaptadores temporários.
4. Definir estratégia única de deploy para SPA e API, incluindo ordem de migração.
5. Criar observabilidade com correlação, métricas e alertas sem registrar conteúdo sensível.
6. Atualizar README/runbooks e instituir revisão periódica de RLS, dependências e acesso.

**Aceite:** cada domínio tem proprietário, contrato e runbook; Express/Vercel não divergem; deploy e rollback são reproduzíveis.

## Sequência mínima de cada entrega

1. Abrir issue vinculada a um achado da auditoria.
2. Documentar estado atual, hipótese, impacto, migrações e consumidores.
3. Criar teste que demonstre a falha ou a negativa esperada.
4. Implementar a menor mudança compatível.
5. Executar typecheck, testes, RLS em ambiente de teste e build real.
6. Revisar logs, privacidade, rollout e rollback.
7. Atualizar os quatro documentos técnicos quando a arquitetura mudar.

Não misture rotação de segredo, migração destrutiva, refatoração ampla e alteração visual no mesmo deploy.
