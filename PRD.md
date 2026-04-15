# PRD — Sistema Brotar v2.x

**Documento de Requisitos de Produto (engenharia reversa)**  
**Última atualização:** abril de 2026  
**Escopo:** plataforma web de gestão escolar e clínica multidisciplinar (frontend React, backend Supabase/Postgres).

---

## 1. Visão geral

O **Sistema Brotar** é uma plataforma que **unifica a gestão educacional e o atendimento clínico terapêutico** em um único ecossistema digital. O propósito central é permitir que a rede escolar e as equipes de saúde/educação especializada trabalhem sobre o **mesmo cadastro de alunos** e o **mesmo calendário operacional**, sem misturar indevidamente **dados administrativos** com **informações clínicas confidenciais**.

Na prática, o sistema oferece:

- Cadastro e acompanhamento de **alunos** vinculados a **escolas** (INEP, distrito, turno, série etc.).
- **Agendamentos** por unidade (Sede/Cocal), especialidade e profissional.
- **Prontuários e evoluções** por área (psicologia, fonoaudiologia, nutrição, entre outras), com regras de acesso diferenciadas.
- **Geração e arquivo de documentos** institucionais (declarações, relatórios, encaminhamentos), com apoio de IA quando disponível e fallback por templates.
- Painéis e fluxos específicos por **perfil de usuário** (administração, secretarias, escola, recepção, especialistas).

O título da aplicação autenticada reflete o posicionamento: **gestão multidisciplinar** integrada à operação diária do centro.

---

## 2. Perfis de usuário

Os perfis são modelados em código (`UserRole` em `types.ts`) e espelhados no banco (`profiles.role`, enums evolutivos em scripts SQL). Abaixo, a visão de produto consolidada.

### 2.1 Administração e governança

| Perfil | Função típica |
|--------|----------------|
| **Administrador (`ADMIN`)** | Configuração global, usuários, visão ampla de indicadores, exclusões críticas (ex.: agendamentos), permissões sensíveis (`can_access_security_data`, `can_access_backup_restore`). |
| **Coordenador (`COORDENADOR`)** | Visão ampliada da rede de alunos (alinhado a `podeVerTodosAlunosNaRede` no serviço). |

### 2.2 Educação e unidades

| Perfil | Função típica |
|--------|----------------|
| **Secretaria de Educação (`EDUCATION_SECRETARY`)** | Gestão cadastral e operacional no âmbito educacional. |
| **Secretaria Sede / Cocal (`SECRETARIA_SEDE`, `SECRETARIA_COCAL`)** | Operação por **escopo geográfico/unidade** (`UserScope`: `GLOBAL`, `SEDE`, `COCAL`). |
| **Perfil Escola (`ESCOLA`)** | Acesso amarrado à **escola** via INEP/`schoolId`, para visão local do estabelecimento. |

### 2.3 Operacional e clínico

| Perfil | Função típica |
|--------|----------------|
| **Assistente / Recepção (`ASSISTANT`)** | Apoio operacional; incluído entre perfis com visão de **todos os alunos da rede** no carregamento por perfil. |
| **Especialista (`SPECIALIST`)** | Profissional com **especialidade** obrigatória para o módulo clínico. Especialidades previstas no produto (enum `Specialty` / `specialty_type`): **Psicologia**, **Serviço Social**, **Psicopedagogia**, **Terapia Ocupacional**, **Fonoaudiologia**, **Fisioterapia**, **Nutrição**. O schema SQL histórico também prevê **Enfermagem** como tipo de especialidade no banco; o front atual enumera as sete primeiras de forma consistente com os dashboards. |

Cada especialista possui, quando aplicável, **especialidade** (`profiles.specialty`), **escopo** de unidade e vínculo com agendas e prontuários conforme as regras da seção 4.

---

## 3. Funcionalidades principais

### 3.1 Agendamento unificado

**Objetivo:** um único modelo de **compromisso clínico/pedagógico** ligando aluno, profissional, especialidade, data, horário e unidade física/organizacional.

**Modelo de dados:** tabela `appointments` (vide `create_missing_tables.sql`): `student_id`, `professional_id`, `specialty` (enum alinhado às áreas), `unit` (`SEDE` \| `COCAL`), `date`, `start_time`, `end_time`, `status` (ex.: agendado, atendido, faltou, remarcar).

**Experiência de uso:**

- **Central de Agendamentos** (`SchedulingCenter`): visão por dia ou próximos compromissos, filtros por **unidade** e perfil (administradores enxergam `ALL`; demais respeitam `scope`).
- **Formulário de agendamento** (`AppointmentForm`): escolha de profissional, checagem de conflitos de horário do aluno (incluindo confirmação quando há sobreposição com outro profissional).
- Rotas dedicadas (`SchedulingRoutePage`) e integração com fluxos de **remarcação** a partir do estado da aplicação.

**Segurança (RLS):** políticas indicam que administradores têm poder amplo sobre agendamentos; especialistas **consultam** compromissos em que são o profissional **ou** da mesma especialidade, e **criam** registros apenas na própria área — reforçando o alinhamento entre agenda e **parede de concreto** por especialidade.

### 3.2 Gerador de documentos e cofre

**Gerador (`DocumentGenerator`):**

- Seleção de aluno e **tipo de documento** (listas comuns e por especialidade: psicologia, serviço social, psicopedagogia etc.).
- Geração principal via **serviço de IA** (`GeminiService.generateOfficialDocument`), com contexto livre e dados atualizados do aluno (incluindo instrumentos como IPO quando existentes).
- **Fallback** automático por **templates institucionais** (`TemplateService`) se a IA falhar.
- Cada emissão recebe **código** institucional (padrão `BRT-ANO-#####`) e é persistida como documento gerado (`generated_documents` via `SupabaseService.saveDocument`).
- Histórico por aba e exportação/fluxo de impressão alinhados a **papel timbrado** configurável (`PapelTimbradoConfig`).

**Cofre (`DocumentVault` + áreas “Cofre” nos painéis):**

- **Cofre de documentos** como “central de inteligência documental”: **modelos** de declarações, **normativas/tutoriais** (com camada de dados ainda parcialmente ilustrativa no front) e área de **arquivos escaneados** ligados ao aluno, com ênfase em **sigilo** e rastreabilidade (selos/hashes apresentados na UI onde aplicável).
- No módulo psicológico, a interface reforça **PDF auditado** com menção a **hash** e trilha de conformidade.

Em conjunto, gerador e cofre cobrem o ciclo **produzir → numerar → armazenar → recuperar** documentação oficial e de suporte.

### 3.3 Gestão de alunos

**Ficha cadastral e rede escolar:**

- **Cadastro/edição** (`RegistrationForm`): identificação civil, responsáveis, endereço, dados escolares, documentos anexados (`StudentDocument`), informações sociais (NIS, programas), vínculo com **escola** e unidade.
- **Lista e perfil** (`PatientList`, `PatientProfile`): busca, visualização e navegação para atendimento.
- **Escolas** (`SchoolManagement`): ficha da unidade escolar, conectividade, impressão de ficha em PDF (`pdfExport`).

**Profissionais de apoio escolar** (`SupportProfessionalManagement`): cadastro de profissionais vinculados a escola e aluno, com anexos categorizados (RG, CPF, certificados etc.).

**Regras de listagem por perfil (`getAlunosPorPerfil`):**

- Perfis **administrativos/recepção/secretarias/coordenador** carregam a **rede completa** de alunos (sujeito a RLS no banco).
- **Especialistas** em áreas configuradas como **restritas** (`src/config/perfilRestrito.ts`) veem alunos com os quais possuem **vínculo via agendamento** (`appointments` com status válidos: agendado, confirmado, em atendimento, atendido, encerrado), reduzindo exposição desnecessária da carteira inteira.

**Dados clínicos no objeto `Student`:** o tipo `Student` agrega `clinical` (`ClinicalInfo`) e `history` (`Session[]`), alimentados a partir de `clinical_sessions` e estruturas JSON por especialidade — a separação lógica **ficha âncora × clínico** permanece obrigatória no desenho (ver seção 4).

---

## 4. Regras de negócio e segurança

### 4.1 Ficha âncora (cadastro universal)

A **Ficha Âncora** é o registro do aluno na tabela `students`: identificação, filiação/responsáveis, endereço, vínculo escolar (série, turno, escola), documentos administrativos e metadados de status. O schema documenta explicitamente que **nenhum dado clínico sensível** deve permanecer nessa tabela; ela existe para ser o **ponto de referência único** compartilhado entre educação e saúde.

**RLS exemplificada no schema:** leitura para usuários ativos autenticados; escrita restrita a **ADMIN** e **EDUCATION_SECRETARY** (papéis com função institucional de cadastro).

Assim, a “âncora” é o que todos os módulos podem ver para **identificar e localizar** o aluno na rede; não é o repositório de evoluções terapêuticas.

### 4.2 Isolamento (módulos profissionais)

**Isolamento** é a estratégia de separar o conteúdo clínico em **módulos/tabelas próprias**, ligados ao aluno por chave estrangeira mas **não copiados** indiscriminadamente para a ficha cadastral.

Implementação principal:

- Tabela **`clinical_sessions`**: cada linha é uma sessão/atendimento com `student_id`, `professional_id`, **`specialty`**, `content` (JSON por área), `private_notes` e metadados de auditoria (evoluções como `status`, `hash_auditoria` em scripts de endurecimento).
- Tabela **`student_documents`**: documentos clínicos/oficiais armazenados com **especialidade** e profissional responsável, além de tipo e referência de arquivo.

O **aplicativo** ainda consolida parte dessas informações no objeto `Student.clinical` para formulários ricos (psicopedagogia, psicologia, etc.), mas a **política de produto** permanece: dados sensíveis fluem por **sessões e documentos clínicos**, com políticas de acesso específicas.

### 4.3 “Parede de concreto” (por especialidade)

A **Parede de Concreto** é o princípio pelo qual o **especialista só enxerga e opera dados clínicos da sua área**, materializado no banco pela coluna **`specialty`** em `clinical_sessions` (comentário literal no `supabase_schema.sql`: um fonoaudiólogo só enxerga linhas da sua especialidade).

**Políticas iniciais do schema (conceito):**

- **SELECT:** o registro é visível se o usuário é o **autor** (`professional_id`), **ou** a sessão pertence à **mesma especialidade** do perfil, **ou** o usuário é **ADMIN** (auditoria — configurável para sigilo absoluto removendo esse ramo).
- **INSERT:** somente com `specialty` igual à do perfil e `professional_id = auth.uid()`.
- **UPDATE:** somente o **próprio autor** (`professional_id`), impedindo que dois profissionais da mesma área alterem o prontuário um do outro.
- **DELETE:** ausência intencional de política de delete via API — **imutabilidade/auditoria** no histórico clínico.

Script adicional (`update_psychology_security.sql`) endurece o modelo para **“isolamento de namespace”** em psicologia (e pode servir de padrão): o especialista vê **apenas sessões em que é o profissional**, não mais toda a especialidade; **ADMIN** mantém visão; **updates** são bloqueados quando `status = 'FINALIZADA'`. Isso refinou a “parede” de **área** para **prontuário individual** onde aplicado.

### 4.4 Separação ficha âncora × dados confidenciais (síntese)

| Camada | Onde vive | Quem acessa (regra de produto) |
|--------|-----------|--------------------------------|
| Identificação, escola, responsáveis, documentos administrativos | `students`, anexos cadastrais, escolas | Equipe com papel de cadastro + usuários autorizados pela RLS de leitura |
| Evoluções, anamneses, notas de sessão, campos por especialidade | `clinical_sessions`, JSON especializado, `private_notes` | Autor da sessão; opcionalmente colegas da mesma área ou apenas autor conforme política vigente; admin para auditoria se habilitado |
| Documentos gerados / laudos vinculados à prática | `student_documents`, `generated_documents` | Profissional gerador + regras de cofre/listagem; administrador conforme política |

**Agendamento como trilho de acesso:** para especialistas em perfis “restritos”, a lista de alunos no prontuário deriva de **compromissos reais** com o profissional, alinhando **exposição de dados** ao **fluxo de atendimento**.

**Permissões extras:** apenas **ADMIN** possui flags explícitas de **dados de segurança** e **backup/restauração** (`hasPermission` em `types.ts`).

**Auditoria:** trilhas de **audit log** e códigos/hashes em documentos e sessões reforçam **rastreabilidade** e **não repúdio** operacional.

---

## 5. Fora do escopo deste PRD

Este documento foi produzido por **engenharia reversa** do repositório; não substitui contratos formais com órgãos públicos, LGPD/HIPAA-like por jurisdição, nem DPA com provedores de IA. Evoluções futuras (compartilhamento tipo “estudo de caso”, RLS final em homologação) devem ser rastreadas em ADRs ou migrations versionadas.

---

## 6. Referências internas (código)

- Tipos e papéis: `types.ts`
- Schema e comentários de RLS: `supabase_schema.sql`, `create_missing_tables.sql`, `update_psychology_security.sql`
- Perfis com lista restrita: `src/config/perfilRestrito.ts`
- Agendamentos e alunos: `services/SupabaseService.ts` (`getAlunosPorPerfil`, políticas de vínculo)
- UI: `components/SchedulingCenter.tsx`, `components/AppointmentForm.tsx`, `components/DocumentGenerator.tsx`, `components/DocumentVault.tsx`, `components/RegistrationForm.tsx`
