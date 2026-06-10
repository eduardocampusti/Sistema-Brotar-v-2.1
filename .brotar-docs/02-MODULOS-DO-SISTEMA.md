# 02 — Módulos do Sistema — Sistema Brotar

> Use este arquivo quando precisar saber o que cada módulo faz, qual arquivo ele corresponde e quem pode acessá-lo.

---

## Mapa de módulos por arquivo

### 🏠 Dashboard
- **Arquivo:** `components/Dashboard.tsx`
- **Quem acessa:** Todos os perfis (cada um vê seu painel específico)
- **O que faz:** Tela inicial após login. Exibe métricas, resumos e gráficos do Recharts.
- **Painéis específicos por role:** `components/RoleDashboards.tsx` e `components/PsychologyDashboard.tsx`
- **Hook de dados:** `hooks/useEducationSecretaryPanelData.ts`

---

### 📅 Central de Agendamentos ← PRIORIDADE ATUAL
- **Arquivo principal:** `components/SchedulingCenter.tsx`
- **Formulário:** `components/AppointmentForm.tsx`
- **Rota dedicada:** `components/SchedulingRoutePage.tsx`
- **Página minha agenda:** `src/pages/MinhaAgendaPage.tsx`
- **Quem acessa:** ADMIN, EDUCATION_SECRETARY, SECRETARIA_SEDE, SECRETARIA_COCAL, SPECIALIST
- **O que faz:** Criação, edição e visualização de agendamentos multiprofissionais. Filtro por unidade (SEDE/COCAL), profissional e especialidade. Checagem de conflito de horário do aluno.
- **Tabela no banco:** `appointments` — campos: `student_id`, `professional_id`, `specialty`, `unit`, `date`, `start_time`, `end_time`, `status`
- **Status possíveis:** `AGENDADO`, `CONFIRMADO`, `EM_ATENDIMENTO`, `ATENDIDO`, `FALTOU`, `CANCELADO`, `ENCERRADO`

---

### 👤 Prontuário do Aluno
- **Arquivo:** `components/PatientProfile.tsx`
- **Quem acessa:** SPECIALIST (apenas alunos com vínculo), ADMIN, EDUCATION_SECRETARY
- **O que faz:** Ficha completa do aluno — dados cadastrais, histórico clínico, evoluções por especialidade, documentos, agendamentos passados e futuros.
- **Tabelas no banco:** `students`, `clinical_sessions`, `student_documents`, `generated_documents`

---

### 📋 Lista de Alunos
- **Arquivo:** `components/PatientList.tsx`
- **Quem acessa:** Conforme `src/config/perfilRestrito.ts` — especialistas restritos veem apenas alunos com agendamento ativo
- **O que faz:** Busca e listagem de alunos com filtros. Ponto de entrada para o prontuário.
- **⚠️ Bug pendente:** Tabela quebra em celular (ver BUG-04 no arquivo `04-BUGS-E-PENDENCIAS.md`)

---

### 📝 Ficha Clínica por Especialidade
- **Arquivo:** `components/ClinicalPages.tsx`
- **Quem acessa:** SPECIALIST (cada um vê apenas sua área)
- **O que faz:** Formulários de anamnese e evolução por especialidade. Inclui:
  - Psicopedagogia (Anamnese V3 — stepper em 4 etapas)
  - Psicologia
  - Fonoaudiologia
  - Serviço Social
  - Terapia Ocupacional
  - Fisioterapia / Nutrição
- **⚠️ Bug pendente:** Mistura componentes antigos e novos (ver BUG-06)

---

### 📊 Agenda do Profissional
- **Arquivo:** `components/AgendaProfissional.tsx`
- **Agenda social:** `components/SocialWorkerAgenda.tsx`
- **Quem acessa:** SPECIALIST, SOCIAL_WORKER
- **O que faz:** Visualização da agenda pessoal do profissional — compromissos do dia, da semana, alertas de horário.

---

### 📁 Cadastro de Alunos
- **Arquivo:** `components/RegistrationForm.tsx`
- **Quem acessa:** ADMIN, EDUCATION_SECRETARY, SECRETARIA_SEDE, SECRETARIA_COCAL
- **O que faz:** Formulário de criação e edição da ficha âncora do aluno — dados pessoais, escola, responsáveis, documentos, informações sociais (NIS).

---

### 🏫 Gestão de Escolas
- **Arquivo:** `components/SchoolManagement.tsx`
- **Quem acessa:** ADMIN, EDUCATION_SECRETARY
- **O que faz:** Cadastro e edição de unidades escolares. Vinculação com alunos. Exportação de ficha em PDF.

---

### 👥 Gestão de Usuários
- **Arquivo:** `components/UserManagement.tsx`
- **Quem acessa:** Apenas ADMIN
- **O que faz:** Criar, editar, ativar/desativar e excluir usuários do sistema. Definir roles e especialidades.
- **⚠️ Bug pendente:** Admin não consegue editar/excluir (ver BUG-01)

---

### 📄 Gerador de Documentos
- **Arquivo:** `components/DocumentGenerator.tsx`
- **PDF componente:** `components/DocumentPDF.tsx`
- **Quem acessa:** SPECIALIST, ADMIN
- **O que faz:** Gera documentos oficiais (declarações, relatórios, encaminhamentos) usando IA Gemini. Fallback automático por templates se a IA falhar. Código institucional automático (formato `BRT-ANO-#####`).

---

### 🗄️ Cofre de Documentos
- **Arquivo:** `components/DocumentVault.tsx`
- **Quem acessa:** SPECIALIST, ADMIN
- **O que faz:** Armazenamento e recuperação de documentos gerados, laudos, modelos de declaração. Exibe hash de auditoria para rastreabilidade.

---

### 🤝 Serviço Social
- **Arquivo principal:** `components/SocialServiceHub.tsx`
- **Entrevista:** `components/SocialServiceInterviewHub.tsx`
- **Dashboard:** `components/SocialWorkerDashboard.tsx`
- **Quem acessa:** SOCIAL_WORKER, ADMIN
- **O que faz:** Fichas de acompanhamento social, entrevistas estruturadas, anotações e relatórios da área de serviço social.

---

### 👨‍🏫 Profissionais de Apoio
- **Arquivo:** `components/SupportProfessionalManagement.tsx`
- **Quem acessa:** ADMIN, EDUCATION_SECRETARY, SECRETARIA_SEDE, SECRETARIA_COCAL
- **O que faz:** Cadastro e vinculação de profissionais de apoio (cuidadores) a alunos específicos. Gestão de documentos do profissional (RG, CPF, certificados).

---

### 📈 Relatórios Gerenciais
- **Arquivo:** `components/RelatoriosGerenciais.tsx`
- **Arquivo TCM:** `components/RelatorioAnualTCM.tsx`
- **Arquivo TEA:** `components/RelatorioTEAPage.tsx` e `src/pages/RelatorioTEAPage.tsx`
- **Quem acessa:** ADMIN, EDUCATION_SECRETARY
- **O que faz:** Geração de relatórios gerenciais, exportação CSV e PDF. Relatório anual para o TCM (Tribunal de Contas Municipal). Rastreamento de alunos com TEA.

---

### 🧮 Calculadora Portage
- **Arquivo:** `components/PortageCalculator.tsx`
- **Lógica:** `utils/PortageLogic.ts`, `utils/PortageItems.ts`
- **Quem acessa:** SPECIALIST
- **O que faz:** Avaliação do desenvolvimento infantil pelo protocolo Portage. Calcula nível de desenvolvimento nas áreas: socialização, linguagem, cognição, autocuidado, desenvolvimento motor.

---

### ⚙️ Configurações do Sistema
- **Arquivo:** `components/SystemSettings.tsx`
- **Papel timbrado:** `components/PapelTimbradoConfig.tsx`
- **Quem acessa:** Apenas ADMIN
- **O que faz:** Configurações gerais — nome da instituição, configuração do papel timbrado para documentos, temas visuais.

---

### 🔔 Notificações
- **Arquivo:** `components/NotificationBell.tsx`
- **Contexto:** `contexts/NotificationContext.tsx`
- **Quem acessa:** Todos
- **O que faz:** Sino de notificações na barra superior. Alertas de agendamentos, avisos do sistema.

---

### 🔐 Autenticação
- **Login:** `components/Login.tsx`
- **Contexto:** `contexts/AuthContext.tsx`
- **Hook:** `src/hooks/useAuth.ts`
- **Proteção de rotas:** `src/routes/ProtectedRoute.tsx`
- **Troca de senha:** `components/ChangePassword.tsx`
- **Força troca:** `components/ForcePasswordChange.tsx`
- **O que faz:** Login com e-mail e senha via Supabase Auth. Sessão persistente. Proteção de rotas por role. Fluxo de troca de senha obrigatória no primeiro acesso.

---

### 💾 Backup e Auditoria
- **Backup:** `components/BackupSystem.tsx` — serviço: `services/backupService.ts`
- **Auditoria:** `components/AuditLogs.tsx`
- **Quem acessa:** Apenas ADMIN
- **O que faz:** Backup manual dos dados. Visualização do log de auditoria (quem fez o quê e quando).

---

### 📥 Importador CSV
- **Arquivo:** `components/CSVImporter.tsx`
- **Utilitário:** `utils/csvNormalization.ts`
- **Quem acessa:** ADMIN, EDUCATION_SECRETARY
- **O que faz:** Importação em massa de alunos via arquivo CSV (planilha Excel exportada).

---

## Tabelas principais no banco de dados Supabase

| Tabela | O que armazena |
|---|---|
| `profiles` | Dados dos usuários (nome, role, especialidade, escopo) |
| `students` | Ficha âncora dos alunos |
| `appointments` | Agendamentos multiprofissionais |
| `clinical_sessions` | Evoluções e sessões clínicas por especialidade |
| `student_documents` | Documentos vinculados ao aluno |
| `generated_documents` | Documentos gerados pelo sistema com código institucional |
| `schools` | Unidades escolares cadastradas |
| `support_professionals` | Profissionais de apoio e seus vínculos |
| `audit_logs` | Trilha de auditoria de todas as ações |
| `system_messages` | Mensagens internas e notificações |
