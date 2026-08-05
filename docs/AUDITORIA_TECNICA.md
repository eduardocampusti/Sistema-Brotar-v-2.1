# Auditoria Técnica

**Data:** 5 de agosto de 2026

**Escopo:** análise estática completa do repositório e verificações locais seguras.

**Regra desta etapa:** nenhuma correção funcional, instalação, migração, deploy ou alteração de produção foi realizada.

## A. Resumo executivo

O produto possui cobertura funcional ampla e um frontend operacionalmente estruturado em módulos, mas sua maturidade de segurança e governança é **baixa para dados escolares, pessoais e clínicos**. Foram identificados caminhos plausíveis de elevação de privilégio, operações privilegiadas sem validação suficiente, endpoints de WhatsApp expostos, certificados forjáveis e segredos/dados sensíveis em artefatos rastreados. Esses pontos devem ser tratados como incidentes potenciais até que o estado remoto, os logs e o histórico Git sejam verificados.

O build Vite termina, porém a checagem TypeScript falha com 14 diagnósticos. Os testes locais passam, mas 7 testes de RLS foram ignorados por ausência das credenciais de integração. Assim, o resultado não valida a autorização efetiva do banco remoto.

Prioridade imediata: revogar/rotacionar credenciais expostas, restringir temporariamente operações privilegiadas, conferir grants/RLS no Supabase e preservar evidências. A implementação deve seguir `PLANO_DE_CORRECAO.md`.

## B. Escopo, método e limitações

Foram lidos código frontend, serviços, rotas, backends WhatsApp, scripts SQL, migrações, testes, configurações de build/deploy e histórico de convenções. Também foram feitos inventário de arquivos, busca de padrões sensíveis sem revelar valores, typecheck, testes, build e auditoria offline de dependências.

Não houve acesso ao painel, schema, políticas, logs ou segredos do Supabase/Meta/Google em produção. Portanto, achados ligados a SQLs são confirmados como risco no repositório, mas sua explorabilidade atual depende de quais scripts foram realmente aplicados. A ausência de uma migração no Git não prova ausência no banco remoto.

### Resultado dos comandos

| Comando | Resultado | Observação |
|---|---|---|
| `npm.cmd ls --depth=0` | passou | árvore instalada consistente no nível superior |
| `npm.cmd exec tsc -- --noEmit` | falhou | 14 diagnósticos de tipos em 6 áreas |
| `npm.cmd test -- --run` | passou parcialmente | 23 passaram; 7 testes RLS ignorados |
| `npm.cmd run build:vite -- --outDir C:\tmp\brotar-audit-dist` | passou | 2.264 módulos; chunks grandes e chunk vazio |
| `npm.cmd audit --offline --omit=dev` | 0 vulnerabilidades | resultado limitado ao cache offline; não conclusivo |
| lint | indisponível | não há script nem configuração de lint |

O ambiente local usou Node 24.13.1, enquanto o projeto declara Node 22.x. `package.json` e o metadado raiz de `package-lock.json` também apresentam versões de aplicação diferentes.

## C. Arquitetura e fluxos

O fluxo predominante é `tela React → SupabaseService/supabase-js → Auth/PostgREST/Storage → PostgreSQL/RLS`. Somente o WhatsApp passa por backend próprio. O Gemini é chamado diretamente pelo cliente. A descrição completa está em `ARQUITETURA_ATUAL.md`; a rastreabilidade por tela e dado está em `MAPA_FRONTEND_BACKEND.md`.

Autenticação é carregada em `src/App.tsx`. `ProtectedRoute` verifica sessão, não papel. O escopo funcional mistura `profiles`, metadata do Auth e políticas RLS. Não foi encontrado módulo financeiro/caixa.

## D. Achados priorizados

### Visão consolidada

| ID | Severidade | Área | Resumo |
|---|---|---|---|
| SEC-01 | Crítica | Segredos/dados | chave de API, tokens aparentes e dados pessoais em arquivos rastreados |
| AUTH-01 | Crítica | Autorização | políticas e fallbacks confiam em `user_metadata` controlável pelo usuário |
| DB-01 | Crítica | RPC/Auth | `delete_user_complete` não valida administrador internamente |
| INT-01 | Crítica | WhatsApp | webhook sem assinatura usa service role e registra PII |
| DB-02 | Crítica | Atestados | qualquer autenticado pode ler/forjar atestados no SQL versionado |
| INT-02 | Alta | WhatsApp | endpoints de envio sem autenticação obrigatória/rate limit |
| AUTH-02 | Alta | Sessão | logout manual não encerra a sessão Supabase |
| AUTH-03 | Alta | Conta | login não bloqueia perfil inativo e há fallback para metadata |
| AUTH-04 | Alta | Rotas | páginas administrativas dependem de UI e RLS, sem gate central por papel |
| DB-03 | Alta | RLS regional | atualização de alunos permite papéis amplos sem limite regional |
| DB-04 | Alta | Dados clínicos | inserção de sessão não valida especialidade nem vínculo com aluno |
| DB-05 | Alta | Nutrição | RLS confia em metadata e não amarra atendimento ao escopo esperado |
| DB-06 | Alta | Governança | schema, migrações, SQLs avulsos e RPCs usados estão divergentes |
| DATA-01 | Alta | Privacidade | dados clínicos duplicados em JSON e possível exposição por Storage público |
| AI-01 | Alta | IA | Gemini é chamado no navegador com chave e dados potencialmente sensíveis |
| FE-01 | Alta | Compatibilidade | typecheck falha e navegação para perfil perde o aluno selecionado |
| AUD-01 | Média/Alta | Auditoria | logs podem ser forjados e contêm dados pessoais em texto |
| FE-02 | Média | Manutenção | arquivos monolíticos, `any`, duplicações e cobertura muito baixa |
| FE-03 | Média | Segurança UI | HTML de impressão interpola dados sem escape sistemático |
| FE-04 | Média | Acessibilidade | controles não semânticos, imagens sem `alt` e efeitos frágeis |
| OPS-01 | Média | Entrega | sem CI/lint/typecheck no build; artefato `dist` rastreado |
| PERF-01 | Média | Performance | chunks de UI, clínica e PDF entre aproximadamente 423–599 kB |

### SEC-01 — segredos e dados rastreados

**Evidência:** `vite.config.ts` injeta `GEMINI_API_KEY` no bundle; `services/geminiService.ts` consome essa variável. O `dist/` rastreado contém uma chave Google com formato válido. A varredura também detectou padrões JWT em bundles e scripts de `scratch/`. Arquivos como `audit_logs_debug.json`, `backup_students_unit_null_2026-05-12.json` e `user_meta_report.json` possuem estrutura de dados reais/pessoais.

**Impacto:** uso indevido de APIs, exposição histórica de credenciais, alunos, usuários, telefones ou dados clínicos; incidente LGPD.

**Reprodução segura:** inspecionar histórico e artefatos com scanner de segredos que masque os valores.

**Recomendação:** preservar evidência, revogar e rotacionar chaves, remover dados da árvore atual, avaliar expurgo do histórico com plano coordenado e impedir novos commits via CI/pre-commit. Mover segredos para backend.

**Risco da correção:** rotação sem mapear consumidores pode interromper integrações. Depende de inventário de ambientes e plano de deploy.

### AUTH-01 — papel confiado a metadata editável

**Evidência:** políticas SQL, `SupabaseService.authenticate` e `getUserProfile` usam `auth.jwt()->'user_metadata'->>'role'` ou fallback equivalente. `signUp` aceita papel em metadata e possui padrão `ADMIN`.

**Impacto:** um usuário pode tentar promover o próprio papel e alcançar políticas que confiem nessa claim.

**Reprodução segura:** em homologação descartável, alterar apenas metadata de um usuário de teste e executar matriz de acessos negativos.

**Recomendação:** usar `profiles` protegido ou `app_metadata` emitida exclusivamente por backend; remover fallbacks; reconstruir todas as policies com funções auxiliares testadas.

**Risco da correção:** bloqueio de usuários legítimos se perfis estiverem incompletos. Requer saneamento prévio e migração gradual.

### DB-01 — RPC privilegiada de exclusão

**Evidência:** `fix_delete_user.sql` define `delete_user_complete(target_user_id)` como `SECURITY DEFINER`, apaga `auth.users` e não verifica o papel do chamador. Comentários deixam revogação/grant incompletos; `fix_user_management_rls.sql` concede execução a `authenticated`.

**Impacto:** exclusão arbitrária de contas, caso essa versão esteja aplicada.

**Reprodução segura:** consultar definição e ACL da função no banco; não executar exclusão.

**Recomendação:** revogar execução imediatamente, substituir por função com validação interna, `search_path` fixo, auditoria e grant apenas ao papel necessário.

**Risco da correção:** administração de usuários ficará indisponível até o novo caminho estar implantado.

### INT-01 e INT-02 — integração WhatsApp

**Evidência:** os webhooks em `server.mjs` e `api/whatsapp/webhook.ts` não validam `X-Hub-Signature-256`; usam service role para alterar agendamentos e registram payload, telefone e conteúdo. Existe token de verificação padrão no código. A função Vercel de envio não autentica chamadores; no Express a proteção é opcional e `/send-test` permanece aberta. Não há rate limit ou idempotência.

**Impacto:** falsificação de confirmações/cancelamentos, envio abusivo, custo, spam e vazamento de PII.

**Reprodução segura:** revisar requisições em homologação com assinatura inválida, sem permitir mutação real.

**Recomendação:** desabilitar/restringir endpoints até validar assinatura HMAC, segredo server-side obrigatório, autorização, rate limit, idempotência e logs redigidos. Unificar Express/Vercel.

**Risco da correção:** mensagens legítimas podem ser rejeitadas se a configuração Meta divergir.

### DB-02 — atestados sem autoridade server-side

**Evidência:** `V43_atestado_comparecimento.sql` permite `SELECT` e `INSERT` a qualquer autenticado, sem vínculo por papel, aluno ou emissor e sem FKs. O hash/código e a validação são produzidos no navegador; o QR não aponta para verificador confiável.

**Impacto:** leitura de CPF de responsáveis e emissão/forja de documento com aparência oficial.

**Reprodução segura:** inspecionar as policies e constraints; em teste, verificar que um usuário sem vínculo não consegue ler/inserir.

**Recomendação:** suspender emissão até RPC/backend transacional validar agendamento, emissor e escopo, assinar dados canônicos e oferecer verificação pública mínima sem PII.

**Risco da correção:** documentos existentes precisam de regra de transição e talvez reemissão.

### AUTH-02 a AUTH-04 — sessão, conta inativa e rotas

**Evidência:** o logout manual em `src/App.tsx` limpa somente estado/navegação, sem `supabase.auth.signOut()`. O login não rejeita `profiles.is_active = false`. Rotas `/app/*` usam proteção genérica e várias telas administrativas não têm gate uniforme por papel.

**Impacto:** sessão reaparece após atualização, contas desativadas continuam operando e páginas sensíveis ficam acessíveis quando RLS estiver incompleta.

**Recomendação:** centralizar sessão e RBAC, encerrar sessão no provedor, recusar conta inativa e adicionar testes de rota; manter RLS como autoridade final.

**Risco da correção:** alterações de bootstrap podem causar loops ou expulsar perfis inconsistentes.

### DB-03 a DB-05 — lacunas de RLS por domínio

**Evidência:** `V36_students_update_rls_clinical.sql` concede atualização ampla a secretarias/coordenação sem aplicar sempre o recorte regional. `V39_fix_clinical_sessions_rls.sql` exige apenas `professional_id = auth.uid()` para inserir sessão. `V40_modulo_nutricionista.sql` repete confiança em metadata e não valida integralmente especialidade, aluno e região. Policies permissivas do PostgreSQL se combinam por `OR`.

**Impacto:** alteração cross-region e lançamento clínico/nutricional em aluno sem vínculo.

**Recomendação:** modelar matriz papel × ação × região × aluno × especialidade, consolidar policies e testar tentativas negativas.

**Risco da correção:** policies restritivas podem interromper fluxos legítimos não documentados.

### DB-06 e DATA-01 — fonte de verdade do banco e dados clínicos

**Evidência:** existem 37 arquivos em `db/migrations/`, 42 SQLs na raiz, duas migrações V38 e uma baseline antiga. Tabelas/RPCs usadas pelo app não têm definição canônica encontrada, incluindo `generated_documents`, `set_user_password` e `merge_students`. Dados clínicos também estão em `students.clinical_info`. O código usa `getPublicUrl` para documentos/fotos, mas as políticas de bucket não estão integralmente versionadas.

**Impacto:** deploy não reproduzível, correções aplicadas fora de ordem e acesso clínico além da especialidade. Se buckets forem públicos, URLs podem expor documentos.

**Recomendação:** extrair schema remoto somente leitura, criar ledger de migrações, reconciliar drift e normalizar dados sensíveis. Confirmar buckets privados e URLs assinadas.

**Risco da correção:** migração de JSON e Storage exige compatibilidade, backup e rollback.

### AI-01 — Gemini no cliente

**Evidência:** `services/geminiService.ts` chama o provedor diretamente e a chave é injetada pelo Vite. Contextos podem conter informações de alunos.

**Impacto:** chave pública, consumo não controlado e transferência de dados pessoais a terceiro sem filtro central.

**Recomendação:** mover para backend autenticado, limitar contexto, redigir PII, aplicar quota/auditoria e revisar base legal/contrato.

**Risco da correção:** mudança de contrato e latência da funcionalidade.

### FE-01 — incompatibilidades confirmadas

**Evidência:** o typecheck aponta erros em `AboutSystem`, `NutritionAssessment`, `NutritionReportsModule`, `PatientList`, `RoleDashboards` e `LancamentoRetroativoPage`. Em `RoleDashboards`, a navegação envia um segundo argumento com ID, mas o callback aceita um; `PatientProfile` pode abrir sem aluno e permanecer carregando. Rotas de edição dependem de estado volátil.

**Impacto:** fluxos quebrados em navegação direta/refresh e contratos inconsistentes entre UI e modelos.

**Recomendação:** estabelecer baseline TypeScript limpa e usar parâmetros de rota persistentes para entidades.

**Risco da correção:** mudar assinatura de navegação afeta vários dashboards.

### AUD-01 e FE-02 a FE-04

`V28_audit_logs.sql` permite inserção por qualquer autenticado, comprometendo integridade do log; textos também podem conter PII. Há aproximadamente 61 mil linhas TypeScript, 534 ocorrências explícitas de `any`, 318 chamadas `console` e somente três arquivos de teste. `ClinicalPages.tsx` tem cerca de 8.900 linhas e `SupabaseService.ts`, 4.400. Foram encontrados componentes duplicados/legados, efeitos com dependências desabilitadas, um fluxo de exclusão TODO, elementos clicáveis sem semântica de teclado e imagens sem `alt`. Templates de impressão interpolam dados em HTML sem mecanismo uniforme de escape.

**Recomendação:** tornar auditoria append-only via funções controladas, redigir PII, modularizar por domínio, adicionar lint/a11y/testes e escapar templates. Mudanças devem ser incrementais para evitar regressões em telas extensas.

### OPS-01 e PERF-01

Não há CI/CD no repositório, lint nem typecheck acoplado ao build. O build Vite não detecta os erros TypeScript. `dist` está rastreado, aumentando drift e risco de segredo. O build gerou chunks aproximados de 599 kB (`vendor-ui`), 462 kB (`ClinicalPages`) e 423 kB (`vendor-pdf`), além de `vendor-react` vazio.

**Recomendação:** gate de CI com Node 22, typecheck, testes, build, scanner de segredos e validação de migrações; depois medir e dividir bundles por fluxo.

## E. Matriz de integração

A matriz detalhada está em `MAPA_FRONTEND_BACKEND.md`. Em síntese:

- Supabase Auth/PostgREST está conectado, mas autorização não é confiável até revisar RLS/claims.
- Usuários/RPCs e atestados estão incompatíveis com requisitos mínimos de autoridade.
- Nutrição e navegação de pacientes apresentam erros de contrato TypeScript.
- WhatsApp está duplicado e inseguro nos dois backends.
- Gemini funciona arquiteturalmente, mas o desenho atual expõe segredo e dados.
- Storage e alguns objetos do banco não podem ser classificados definitivamente sem inspeção remota.

## F. Plano de correção

O plano em fases está em `PLANO_DE_CORRECAO.md`. A ordem é: contenção de incidentes; identidade/RBAC; contratos frontend/backend; reconciliação do banco; regras de negócio; qualidade/performance; consolidação arquitetural. Não se recomenda começar por refatoração visual enquanto os riscos críticos permanecerem abertos.

## G. Arquivos alterados nesta auditoria

Somente documentação:

- `AGENTS.md`
- `docs/ARQUITETURA_ATUAL.md`
- `docs/AUDITORIA_TECNICA.md`
- `docs/PLANO_DE_CORRECAO.md`
- `docs/MAPA_FRONTEND_BACKEND.md`

Nenhum bug foi corrigido nesta etapa.

O texto acima registra o estado da auditoria antes da correção. O tratamento posterior de `SEC-01` está resumido na seção I.

## H. Perguntas pendentes antes da implementação

1. Qual é o inventário oficial de ambientes Supabase e qual histórico de migrações cada um possui?
2. As versões vulneráveis de `delete_user_complete`, V36, V39, V40 e V43 estão aplicadas em produção?
3. Quais chaves detectadas ainda estão ativas e desde quando os artefatos/dumps são acessíveis no Git?
4. Os buckets de documentos e fotos são públicos? Quais objetos contêm dados reais?
5. Qual fonte de verdade deve definir papel, unidade e região? Há usuários sem `profiles` válido?
6. Qual backend WhatsApp está ativo em cada ambiente: Express, Vercel ou ambos?
7. Existe obrigação legal de validade/verificação dos atestados já emitidos?
8. Quais fluxos regionais e de especialidade são realmente autorizados pelo negócio?
9. Há consentimento/base legal e contrato para enviar dados de alunos ao provedor de IA?
10. Os arquivos JSON rastreados são dados reais, anonimizados ou sintéticos? Quem deve participar da resposta a incidente?

## I. Estado da correção SEC-01

Na árvore de trabalho atual, o Gemini passou a usar um endpoint autenticado e a chave deixou de ser injetada pelo Vite. O envio de WhatsApp também passou a exigir sessão Supabase, sem segredo compartilhado público. Variáveis de integrações opcionais são validadas quando a rota correspondente é chamada.

Arquivos de ambiente, `dist/`, dumps, backups, relatórios pessoais e diagnósticos locais foram protegidos pelo `.gitignore`. Os 78 arquivos já rastreados foram removidos apenas do índice e devem permanecer preservados localmente. O `.env.example` contém somente nomes de variáveis e valores vazios.

Rotação manual continua obrigatória para credenciais potencialmente expostas anteriormente: chave Gemini presente no bundle histórico, chave Supabase `service_role` encontrada em scripts/artefatos, credenciais de WhatsApp que tenham sido rastreadas ou distribuídas e senha de conta de teste caso o exemplo removido corresponda a uma credencial real. Nenhum valor é registrado aqui. Esta entrega não rotaciona credenciais nem reescreve o histórico Git.
