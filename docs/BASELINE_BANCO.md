# Baseline do Banco

## Estado da análise

Foram inventariados os 80 arquivos SQL do repositório: 38 em
`db/migrations/` e 42 scripts na raiz. A sequência versionada não é uma
baseline executável desde o zero. Ela começa com objetos dependentes de uma
instalação anterior e mistura nomes `Vxx` com
`20260306_normalize_ats.sql`. Nenhuma migration foi aplicada durante esta
análise.

Não é seguro criar uma migration `V45_x` automaticamente. Ela seria executada
depois dos primeiros pontos de falha e dois contratos essenciais não possuem
DDL suficiente no repositório: `support_professionals` e
`profiles.school_id`.

## Inventário dos pré-requisitos

| Objeto | Tipo | Evidência disponível | Migration que deveria criar | Dependências | Situação |
|---|---|---|---|---|---|
| `uuid-ossp` | extensão | `supabase_schema.sql` | bootstrap anterior à primeira migration | PostgreSQL | avulso |
| `specialty_type` | enum | `supabase_schema.sql` | bootstrap anterior a `appointments` | nenhuma | avulso |
| `user_role_type` | enum | `supabase_schema.sql` | bootstrap anterior a `profiles` | nenhuma | avulso e incompatível |
| `auth.users`, `auth.uid()`, `auth.role()` | schema/tabela/funções | fornecidos pelo Supabase, sem DDL local | infraestrutura local Supabase | stack Auth | ausente no PostgreSQL puro |
| `authenticated`, `service_role` | roles | exigidos por grants e pela V46 | infraestrutura local Supabase | PostgreSQL roles | ausente no PostgreSQL puro |
| `public.schools` | tabela | `supabase_schema.sql` | bootstrap anterior à V11 | `uuid-ossp` | avulso |
| `public.students` | tabela | `supabase_schema.sql` | bootstrap anterior à V11 | `schools`, `uuid-ossp` | avulso |
| `students.clinical_info` | coluna | `SQL_MIGRATION_V10_FIX_MISSING_COLUMNS.sql` | anterior à V32 | `students` | avulso |
| `public.profiles` | tabela | `supabase_schema.sql` | bootstrap anterior à V11 | `auth.users`, enums | avulso/duplicado |
| `profiles.scope` | coluna | `fix_profiles_v3_complete.sql` | anterior à V27 | `profiles` | avulso |
| `profiles.must_change_password` | coluna | `add_must_change_password.sql` | anterior à V17 | `profiles` | avulso; script também altera dados |
| `profiles.email`, `profiles.username` | colunas | `fix_profiles_v3_complete.sql` | anterior à V33 | `profiles` | avulso |
| `profiles.school_id` | coluna/FK | apenas referências em V18–V46 | anterior à V18 | decisão entre escola, unidade e tenant | **ausente** |
| `profiles.school_inep` | coluna | `table_structure_inspection.json` | indefinida | `schools.inep` presumido, não comprovado | estrutural avulso |
| `public.support_professionals` | tabela | apenas lista de colunas em `table_structure_inspection.json` | anterior a `20260306...` e V11 | escolas/alunos; tipos e constraints desconhecidos | **ausente** |
| `public.appointments` | tabela | `create_missing_tables.sql` | anterior à V15 | `students`, `auth.users`, `specialty_type` | avulso |
| `public.audit_logs` | tabela | `setup_audit_logs.sql`; renomes em `SQL_MIGRATION_V7_DEFINITIVE.sql` | anterior à V28 | contrato de colunas não canônico | avulso/duplicado |
| `public.clinical_sessions` | tabela | `supabase_schema.sql` | anterior à V39 | `students`, `auth.users`, `specialty_type` | avulso |
| `public.student_documents` | tabela | `supabase_schema.sql` | bootstrap | `students`, `auth.users`, `specialty_type` | avulso |
| `public.profissional_aluno_vinculo` | tabela/policies | V18 | V18 | `students`, `auth.users` | versionado |
| `prontuario_status_agendamento_vinculo()` | função | V20, V22 e V45 | V20; versão final em V45 | nenhuma | versionado/duplicado por substituição |
| cinco tabelas `nutrition_*` usadas pela V46 | tabelas/policies/triggers | V40 | V40 | `students`, `profiles` | versionado |
| atributos de antropometria | colunas | V44 | V44 | tabelas V40 | versionado |
| helpers e policies server-controlled | funções/policies/triggers | V46 | V46 | todos os objetos acima | versionado, não aplicado |

## Conflitos que impedem instalação limpa

1. `20260306_normalize_ats.sql` e V11 consultam ou alteram
   `support_professionals`, mas não existe DDL dessa tabela. O inventário JSON
   não informa tipos, nulabilidade, defaults, FKs ou constraints.
2. V18 já consulta `profiles.school_id`; nenhum SQL cria a coluna. O snapshot
   estrutural registra somente `school_inep`. Converter INEP em UUID ou manter
   ambos exige decisão de modelo e mapeamento de dados, não inferência.
3. V15 exige `appointments`, disponível somente no script avulso
   `create_missing_tables.sql`.
4. V17, V27, V28, V32 e V33 dependem, respectivamente, de
   `must_change_password`, `scope`, `audit_logs`, `clinical_info` e
   `email`/`username`, todos fora da sequência versionada.
5. `user_role_type` contém somente quatro valores em `supabase_schema.sql`,
   mas V41 compara a coluna enum com `SECRETARIA_SEDE`, `SECRETARIA_COCAL` e
   `COORDENADOR`. Não existe `ALTER TYPE ... ADD VALUE` versionado.
6. Existem duas migrations V38 e um arquivo com prefixo de data. A ordem real
   não pode ser inferida apenas por ordenação lexical ou numérica.
7. O schema inicial não define grants reproduzíveis para todas as tabelas; uma
   instância PostgreSQL comum também não fornece o schema Auth e os roles do
   Supabase.
8. Scripts avulsos não podem ser aplicados em lote: há `TRUNCATE`, `DROP TABLE
   ... CASCADE`, desativação de RLS, mutações de dados e policies baseadas em
   `user_metadata`.

## Decisão de formalização

Nenhuma migration de pré-requisitos foi criada. Uma `V45_x` não resolveria a
instalação desde o zero porque as falhas ocorrem entre o bootstrap e a V33.
Criar uma migration anterior à V11 também não é seguro enquanto faltarem os
contratos autoritativos de `support_professionals`, `profiles.school_id`, roles
e Auth local.

Para desbloquear a baseline, é necessário obter um dump **somente de schema**
de uma homologação conhecida, sem owners, ACLs, dados ou secrets, e decidir:

- o contrato canônico de `support_professionals`;
- se o escopo escolar de `profiles` é `school_id`, `school_inep` ou ambos;
- se `profiles.role` será enum expandido ou texto com constraint;
- qual migration foi aplicada primeiro e como ordenar as duas V38;
- se o ambiente local usará a stack Supabase ou stubs explícitos de Auth.

Somente depois dessas decisões deve ser criada uma baseline anterior à V11 e,
se ainda necessário, uma migration idempotente entre V45 e V46. O ambiente
Docker, scripts de aplicação/destruição e `docs/VALIDACAO_LOCAL_RLS.md` devem
ser gerados a partir dessa baseline confirmada. Criá-los agora produziria uma
falsa reprodutibilidade.

## V46 e rollback

A V46 permanece **não validada em PostgreSQL real**. Seu preflight evita
alteração parcial quando a estrutura V45 esperada estiver ausente, mas não
substitui uma baseline.

- Instalação do zero: bloqueada pelos conflitos acima.
- Atualização de banco existente até V45: primeiro comparar um dump estrutural
  com este inventário e executar em cópia descartável.
- Aplicação da V46: somente após snapshot e testes RLS em ambiente local ou
  homologação confirmada.
- Rollback: restaurar o snapshot pré-V46 ou aplicar migration corretiva revisada;
  nunca reativar policies baseadas em `user_metadata`.
