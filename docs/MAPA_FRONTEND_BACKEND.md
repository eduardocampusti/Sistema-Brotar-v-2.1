# Mapa Frontend–Backend

## Como ler

Na maior parte do sistema, “backend” significa Supabase PostgREST/RPC/Storage acessado diretamente pelo navegador. O status reflete compatibilidade e segurança observáveis no repositório, não disponibilidade do ambiente remoto.

- **Conectado:** contrato identificável e sem quebra estática confirmada, embora possa herdar riscos gerais de RLS.
- **Parcial:** fluxo existe, mas depende de estado, objeto não versionado, teste ausente ou contrato inconsistente.
- **Incompatível:** existe falha confirmada de tipo, navegação ou autoridade.
- **Não verificável:** depende de configuração/schema remoto ausente do repositório.

## Identidade e administração

| Tela/rota | Chamada frontend | Backend/serviço | Dados | Status e evidência |
|---|---|---|---|---|
| `/login` | `authenticate`, `getUserProfile` | Supabase Auth + PostgREST | `profiles`, `schools` | **Incompatível em segurança:** não bloqueia perfil inativo e aceita fallback de metadata. |
| logout no layout | `handleLogout` | deveria chamar Supabase Auth | sessão local | **Incompatível:** limpa estado, mas não encerra sessão remota. |
| `/app/my-access` | consulta/alteração de acesso | `SupabaseService` + Auth/RPC | `profiles`, `clear_must_change_password` | **Parcial:** RPC aparece em uso, mas governança completa não está versionada. |
| `/app/admin` | listar/criar/editar/excluir usuário | Auth + `SupabaseService` + RPC | `profiles`, `delete_user_complete`, `set_user_password` | **Incompatível/Crítico:** rota sem gate central; exclusão versionada não valida admin; uma RPC não tem definição encontrada. |
| `/app/audit-logs` | listar logs | PostgREST | `audit_logs` | **Parcial:** tela restringe papéis, mas INSERT SQL é forjável por qualquer autenticado. |
| `/app/settings` | ler/salvar configurações | PostgREST | `system_settings`, `system_messages` | **Parcial:** tabelas surgem em SQLs avulsos; autorização remota precisa ser confirmada. |
| `/app/letterhead-config` | ler/salvar papel timbrado | PostgREST | `letterhead_config` | **Parcial:** definição está fora da cadeia canônica e há erro de tipo em consumidor nutricional. |
| `/app/backup` | exportação/importação no cliente | Supabase + arquivos locais | várias tabelas | **Parcial/alto risco:** depende de papel interno do componente e pode materializar PII no navegador. |

## Alunos e escolas

| Tela/rota | Chamada frontend | Backend/serviço | Dados | Status e evidência |
|---|---|---|---|---|
| `/app/dashboard` | consultas agregadas | `SupabaseService` | `students`, `appointments`, `profiles`, `schools` | **Parcial:** dashboards existem; escopo depende de RLS divergente. |
| `/app/list` | listar, buscar e excluir | PostgREST/RPC | `students`, `schools`, `merge_students` | **Parcial:** modelo da UI usa campos ausentes no tipo e RPC de merge não foi encontrada no schema versionado. |
| `/app/register` | insert/upsert + uploads | PostgREST + Storage | `students`, `students-photos`, `student-documents` | **Não verificável em privacidade:** usa URL pública; políticas/bucket remoto precisam ser auditados. |
| `/app/profile` | aluno selecionado/consulta | PostgREST | `students`, sessões/documentos | **Incompatível:** dashboard envia ID em argumento ignorado; refresh/URL direta podem perder o aluno e ficar carregando. |
| `/app/edit-student` | update | PostgREST | `students` | **Parcial:** depende de `selectedStudent` volátil e policies de update permissivas/sobrepostas. |
| `/app/schools` | CRUD de escolas | PostgREST | `schools` | **Parcial:** rota não tem gate central; segurança depende integralmente de RLS. |

## Agenda, clínica e serviço social

| Tela/rota | Chamada frontend | Backend/serviço | Dados | Status e evidência |
|---|---|---|---|---|
| `/app/scheduling` | listar/alterar agenda | PostgREST | `appointments`, `students`, `profiles` | **Parcial:** fluxo conectado; escopo e transições não têm suíte completa. |
| `/app/new-appointment` | criar agendamento/notificar | PostgREST + API WhatsApp | `appointments`, Meta Graph API | **Parcial/inseguro:** persistência existe; envio usa endpoint sem proteção uniforme. |
| `/app/retroativo` | lançamento retroativo | PostgREST | `appointments`/sessões | **Incompatível estático:** comparação impossível com valor `todos` falha no typecheck. |
| `/app/psychology*` | listar/gravar sessões | PostgREST | `clinical_sessions`, `students.clinical_info` | **Incompatível em autorização:** INSERT versionado valida apenas o próprio profissional, não aluno/especialidade. |
| `/app/psychopedagogy*` | listar/gravar sessões | PostgREST | `clinical_sessions`, `students` | **Parcial/inseguro:** compartilha a mesma policy clínica e JSON do aluno. |
| `/app/occupational-therapy*` | listar/gravar sessões | PostgREST | `clinical_sessions`, `students` | **Parcial/inseguro:** mesma lacuna de vínculo/especialidade. |
| `/app/speech-therapy*` | listar/gravar sessões | PostgREST | `clinical_sessions`, `students` | **Parcial/inseguro:** mesma lacuna de vínculo/especialidade. |
| `/app/physiotherapy*` | listar/gravar sessões | PostgREST | `clinical_sessions`, `students` | **Parcial/inseguro:** mesma lacuna de vínculo/especialidade. |
| `/app/social-service-hub`, `social-service-list`, `social-interview`, `social-service/new-session` | consultas e registros sociais | PostgREST | `clinical_sessions`, `students` | **Parcial:** fluxo distribuído em módulo clínico extenso; RLS e segregação de dados precisam validação. |

## Nutrição e profissionais de apoio

| Tela/rota | Chamada frontend | Backend/serviço | Dados | Status e evidência |
|---|---|---|---|---|
| `/app/nutrition` | portal clínico | `SupabaseService` | `students`, tabelas `nutrition_*` | **Parcial:** duas famílias de rotas nutricionais coexistem. |
| `/app/nutricion/dashboard` | métricas | PostgREST | avaliações, NAE, alunos | **Parcial:** contrato existe; isolamento regional/especialidade é insuficiente no SQL. |
| `/app/nutricion/avaliacao/:id?` | CRUD de avaliação/antropometria | PostgREST | `nutrition_assessments`, `nutrition_anthropometry_history`, `students` | **Incompatível estático:** UI referencia `nome_completo`/`turma` fora dos tipos esperados. |
| `/app/nutricion/nae` | CRUD NAE | PostgREST | `nutrition_nae` | **Parcial/inseguro:** policy não comprova integralmente vínculo do aluno e região. |
| `/app/nutricion/ean` | atividades EAN | PostgREST | `nutrition_ean_activities` | **Parcial:** contrato identificado, poucos testes. |
| `/app/nutricion/relatorios` | agregação e papel timbrado | PostgREST | `nutrition_*`, `students`, `letterhead_config` | **Incompatível estático:** argumento numérico é passado onde o tipo `Unit` é exigido. |
| `/app/support-professionals*` | CRUD, documentos e relatórios | PostgREST + Storage | `support_professionals`, `student-documents` | **Parcial:** implementação possui fallbacks de schema e efeito com dependências desabilitadas. |

## Documentos, relatórios e IA

| Tela/rota | Chamada frontend | Backend/serviço | Dados | Status e evidência |
|---|---|---|---|---|
| `/app/documents` | gerar e registrar documento | frontend + PostgREST | `generated_documents`, aluno, papel timbrado | **Parcial:** tabela é usada, mas sua definição canônica não foi encontrada; templates precisam escape. |
| `/app/vault` | listar/excluir/baixar | PostgREST + Storage | `generated_documents`, `student-documents` | **Não verificável:** depende do schema e da privacidade do bucket remoto. |
| geração de atestado | `gerarAtestadoComparecimento` | lógica no navegador + PostgREST | `attendance_certificates`, `appointments` | **Incompatível/Crítico:** inserção/leitura abertas a autenticados, sem autoridade server-side ou FKs. |
| `/app/relatorios-gerenciais` | agregações locais | PostgREST | `students`, `appointments`, sessões | **Parcial:** alto volume processado no cliente; autorização herda consultas de origem. |
| `/app/relatorio-tea` | relatório especializado | PostgREST | alunos/dados clínicos | **Parcial:** componente ativo coexistindo com versão legada; restrição também é prop de UI. |
| `/app/relatorio-anual-tcm` | relatório anual | PostgREST | múltiplas entidades | **Parcial:** contrato é majoritariamente client-side e sem teste de integração dedicado. |
| recursos Gemini | `geminiService` → `POST /api/gemini/generate` | Express/Vercel → Google Gemini | prompt/contexto de aluno | **Parcial:** proxy exige sessão Supabase e mantém chave/modelo no servidor; minimização de PII, quota e observabilidade continuam pendentes. |

## WhatsApp

| Origem | Endpoint | Mutação/destino | Status e evidência |
|---|---|---|---|
| frontend | `POST /api/whatsapp/send` | Meta Graph API | **Conectado:** Express e Vercel exigem sessão Supabase válida; nenhum segredo compartilhado é enviado pelo bundle. |
| teste/manual | `POST /api/whatsapp/send-test` no Express | Meta Graph API | **Incompatível:** endpoint sem autenticação. |
| Meta | `GET /api/whatsapp/webhook` | verificação | **Parcial:** token padrão existe no código. |
| Meta | `POST /api/whatsapp/webhook` | update de `appointments` via service role | **Incompatível/Crítico:** não valida assinatura, não garante idempotência e registra PII. |

## Objetos sem contrato canônico confirmado

Antes de modificar consumidores, extrair o schema remoto e reconciliar: `generated_documents`, `set_user_password`, `merge_students`, políticas dos buckets `student-documents`/`students-photos` e a versão efetivamente implantada de `delete_user_complete`. Tabelas de configuração, mensagens, atestados e parte da agenda aparecem em SQLs fora da cadeia principal, portanto também precisam de ledger.

## Direção de compatibilização

1. Estabilizar identidade/RLS e RPCs privilegiadas.
2. Criar contratos TypeScript gerados a partir do schema reconciliado.
3. Persistir IDs de entidade nas URLs, não apenas em estado React.
4. Colocar integrações e documentos de autoridade atrás de backend autenticado.
5. Transformar cada linha **Parcial/Incompatível** em teste de integração com caso permitido e negado.
