# Matriz funcional do perfil ESCOLA — Web × Mobile

**Sistema analisado:** Sistema Brotar v2.4.161  
**Data da análise:** 07/08/2026  
**Escopo:** exclusivamente o perfil `ESCOLA`  
**Fonte da verdade:** código, tipos, serviços, rotas e migrations presentes neste repositório local  
**Natureza do trabalho:** análise documental; nenhuma funcionalidade foi implementada

## Como ler as evidências

Cada conclusão funcional vem acompanhada de arquivo, símbolo ou trecho, linhas e confiança:

- **Confirmada:** comportamento expresso diretamente no código local.
- **Provável:** o código e o histórico local de migrations apontam para o comportamento, mas a confirmação integral dependeria do estado remoto do banco ou do Storage, que não foi consultado.
- **Não confirmada:** faltam policies, configuração externa ou evidência executável no repositório.

As linhas citadas correspondem ao estado do repositório em 07/08/2026. A migration V46 foi ignorada como regra efetiva porque a documentação do projeto declara que ela não foi aplicada.

---

## 1. Resumo do perfil ESCOLA

O perfil `ESCOLA` é autenticado por uma conta Supabase vinculada a um registro ativo em `profiles`. Um identificador numérico sem `@` é convertido para o e-mail técnico `<INEP>@escola.brotar`; depois do login, o sistema carrega `school_id` diretamente do perfil ou o resolve pelo `school_inep`. A entrada bem-sucedida leva a `/app/dashboard`. **[Confirmada — `services/SupabaseService.ts`, `authenticate`, linhas 384–455; `src/App.tsx`, `handleLogin`, linhas 288–291; confiança alta]**

Na navegação principal, a escola vê três módulos: `Visão Geral`, `Alunos / Prontuários` e `Profissionais de Apoio`. O rodapé oferece ainda `Sobre` e `Sair`. **[Confirmada — `components/Layout.tsx`, definição e renderização do menu, linhas 297–310, 515–519, 610–629 e 715–719; confiança alta]**

O perfil não é somente leitura no sistema inteiro. A interface e as policies locais permitem cadastrar e editar alunos da própria escola e cadastrar/editar profissionais de apoio vinculados a ela. A expressão “somente leitura” existe apenas no cabeçalho do dashboard e não representa as permissões dos demais módulos. **[Confirmada — `components/RoleDashboards.tsx`, `SchoolDashboard`, linhas 3823–3846 e 4134–4136; `components/PatientList.tsx`, linhas 132–143 e 739–771; `components/RegistrationForm.tsx`, linhas 403–528; `db/migrations/V26_students_insert_update_rls.sql`, linhas 11–65; `db/migrations/V36_students_update_rls_clinical.sql`, linhas 12–104; confiança alta]**

O escopo pretendido para alunos e profissionais de apoio é a própria escola. A aplicação filtra pelo `school_id` e as migrations locais também incluem restrições por escola. **[Confirmada no cliente e provável no ambiente efetivo — `services/SupabaseService.ts`, `getStudents`, linhas 897–985, e `getSupportProfessionals`, linhas 3582–3725; `db/migrations/V27_regional_scope_rls.sql`, linhas 130–227 e 357–367; `db/migrations/V30_support_professionals_escola_write_rls.sql`, linhas 10–53; confiança alta no código, média no banco remoto]**

Há quatro divergências relevantes no estado atual:

1. A agenda não aparece no menu da escola, mas é acessível pelo dashboard e por URL direta. **[Confirmada — `components/RoleDashboards.tsx`, linhas 3878–3886 e 4020–4026; `src/App.tsx`, linhas 480–510; confiança alta]**
2. A tela da agenda consulta compromissos sem filtro de escola no cliente; a policy local de leitura aparenta liberar todas as agendas não excluídas para perfis sem restrição regional, o que inclui `ESCOLA`. **[Provável — `services/SupabaseService.ts`, `getAppointments`, linhas 2630–2677; `components/SchedulingCenter.tsx`, linhas 195–310; `db/migrations/V27_regional_scope_rls.sql`, linhas 329–355; confiança média]**
3. A lista permite abrir cadastro, edição, importação CSV e mesclagem de alunos para `ESCOLA`; o formulário expõe inclusive dados clínicos básicos que o prontuário de leitura esconde desse perfil. **[Confirmada — `components/PatientList.tsx`, linhas 132–143, 739–771, 1056–1122 e 1217–1226; `components/RegistrationForm.tsx`, linhas 86–110, 616–622 e 823–887; `components/PatientProfile.tsx`, linhas 64–68 e 898–945; confiança alta]**
4. A maioria das rotas internas não possui guarda por papel: estar fora do menu não impede a abertura por URL. Só Administração e Auditoria têm condição explícita de autorização em `src/App.tsx`. **[Confirmada — `src/routes/ProtectedRoute.tsx`, linhas 12–29; `src/App.tsx`, linhas 436–547; confiança alta]**

---

## 2. Login atual da escola

### 2.1 Fluxo de autenticação

1. A tela solicita um campo textual com placeholder `Email` e uma senha. Não há rótulo específico “INEP” para a escola. **[Confirmada — `components/Login.tsx`, linhas 419–488; confiança alta]**
2. O formulário remove espaços nas extremidades e chama `SupabaseService.authenticate`. Há timeout visual de 15 segundos e mensagem genérica quando o login falha. **[Confirmada — `components/Login.tsx`, `handleSubmit`, linhas 274–313; confiança alta]**
3. Se o identificador não contém `@` e é numérico, o serviço acrescenta `@escola.brotar`. Se não é numérico, acrescenta `@brotar.com`. Um e-mail completo é usado sem conversão. **[Confirmada — `services/SupabaseService.ts`, `authenticate`, linhas 384–402; confiança alta]**
4. O serviço chama `signInWithPassword`, lê `profiles`, exige perfil existente, `is_active === true` e papel confiável, e encerra a sessão se alguma dessas verificações falhar. O papel efetivo vem de `profiles`, não do valor fornecido pela tela. **[Confirmada — `services/SupabaseService.ts`, `authenticate`, linhas 403–445; confiança alta]**
5. Para `ESCOLA`, o serviço usa `school_id` do perfil. Se ele estiver vazio e houver `school_inep`, consulta `schools.id` pelo INEP. **[Confirmada — `services/SupabaseService.ts`, `authenticate`, linhas 433–455; confiança alta]**
6. Após sucesso, o login registra evento de auditoria e o aplicativo navega para `/app/dashboard`. **[Confirmada — `components/Login.tsx`, linhas 295–304; `src/App.tsx`, linhas 288–291; confiança alta]**

### 2.2 Sessão e persistência

O cliente Supabase usa armazenamento local quando disponível, com `persistSession`, renovação automática de token e detecção de sessão em URL habilitados. Se o navegador bloquear o armazenamento local, há fallback em memória, que não persiste após fechar a página. **[Confirmada — `services/supabaseClient.ts`, linhas 14–33; confiança alta]**

Na inicialização, o aplicativo reaproveita a sessão Supabase e volta a carregar o perfil ativo. **[Confirmada — `src/App.tsx`, efeito de bootstrap da sessão, linhas 147–196; confiança alta]**

O perfil `ESCOLA` não está na lista de papéis administrativos do controle de inatividade. Por isso, recebe a janela “clínica” de 60 minutos, com aviso nos 60 segundos finais; atividade de mouse, teclado, toque, rolagem e navegação reinicia a contagem. Ao expirar, o hook executa `supabase.auth.signOut`. **[Confirmada — `src/hooks/useSessionTimeout.ts`, linhas 6–10, 25–75 e 91–124; confiança alta]**

### 2.3 Primeiro acesso e troca obrigatória

Se `profiles.must_change_password` chegar como verdadeiro, o aplicativo interrompe a navegação normal e mostra `ChangePassword`. A nova senha precisa ter pelo menos oito caracteres e coincidir com a confirmação. O serviço atualiza a senha no Auth e limpa a flag por RPC, com fallback de atualização do perfil. **[Confirmada — `src/App.tsx`, linhas 333–341; `components/ChangePassword.tsx`, linhas 11–43 e 46–130; `services/SupabaseService.ts`, `changeMandatoryPassword`, linhas 599–655; confiança alta]**

Entretanto, o fluxo local de criação de conta escolar usa o INEP, papel `ESCOLA` e senha inicial `123456`, mas não grava explicitamente `must_change_password` nem `school_id` no payload do perfil. Assim, a tela de troca obrigatória existe, porém não foi possível confirmar pelo repositório que toda conta escolar recém-criada receba a flag. **[Confirmada quanto ao payload; não confirmada quanto a trigger/default remoto — `services/SupabaseService.ts`, `createAccountAsAdmin`, linhas 677–885, especialmente 803–813 e 861–875; `saveSchool`, linhas 2157–2200; `components/SchoolManagement.tsx`, linhas 229–264; confiança média]**

### 2.4 Recuperação de senha

A tela “Esqueci minha senha” exige um campo HTML do tipo e-mail chamado `Email Cadastrado`; portanto, ela não apresenta recuperação por INEP. **[Confirmada — `components/Login.tsx`, `ForgotPassword`, linhas 61–125; confiança alta]**

O serviço de recuperação acrescenta `@brotar.com` a qualquer valor sem `@`. Isso difere do login escolar, que usa `@escola.brotar` para um INEP numérico. Consequentemente, um INEP isolado não resolve para a conta escolar nesse fluxo; o e-mail técnico completo pode ser usado. **[Confirmada — `services/SupabaseService.ts`, `resetPassword`, linhas 657–669; comparação com `authenticate`, linhas 384–402; confiança alta]**

O retorno do link de recuperação é detectado pela URL/sessão, e o formulário de redefinição exige oito caracteres e confirmação. **[Confirmada — `components/Login.tsx`, linhas 150–185, 210–266 e 315–366; confiança alta]**

### 2.5 Logout e bloqueios

O botão de saída recebido por `Layout` chama o `handleLogout` de `App`, que limpa apenas o usuário React e navega para `/`; ele não chama `SupabaseService.logout` nem `supabase.auth.signOut`. Como a sessão é persistida, existe risco de o bootstrap reconhecer a sessão novamente. **[Confirmada no código; efeito de reentrada provável — `src/App.tsx`, `handleLogout`, linhas 293–296; `services/SupabaseService.ts`, `logout`, linhas 560–565; `services/supabaseClient.ts`, linhas 24–29; confiança alta no defeito, média no efeito observado]**

O bloqueio de login é feito por `profiles.is_active`. Não foi encontrada verificação equivalente de `schools.is_active` durante a autenticação; uma escola desativada na tabela `schools` não está, por si só, comprovadamente impedida de entrar se o perfil continuar ativo. **[Confirmada quanto à ausência no fluxo — `services/SupabaseService.ts`, `authenticate`, linhas 403–455; `getSchools`, linhas 2057–2091; confiança alta]**

---

## 3. Tela inicial da escola

A tela inicial é o `SchoolDashboard`. Ela filtra os alunos recebidos pelo `currentUser.schoolId` e carrega profissionais de apoio, agendamentos e cadastro de escolas. **[Confirmada — `components/RoleDashboards.tsx`, `SchoolDashboard`, linhas 3641–3688; confiança alta]**

### Conteúdo exibido

- Cabeçalho com nome da escola, INEP e a indicação “somente leitura”. **[Confirmada — `components/RoleDashboards.tsx`, linhas 3823–3846; confiança alta]**
- Indicadores de alunos ativos, cobertura por profissional de apoio, agendamentos da semana e alunos com TEA. **[Confirmada — `components/RoleDashboards.tsx`, linhas 3719–3787 e 3855–3903; confiança alta]**
- Até oito cartões de alunos, ordenados, com foto, nome, série, turno, modalidade, diagnóstico/CID/necessidades e situação do apoio. **[Confirmada — `components/RoleDashboards.tsx`, linhas 3762–3787 e 3905–3974; confiança alta]**
- Resumo dos profissionais de apoio ativos da escola, incluindo formação, carga horária, aluno e regente vinculados. **[Confirmada — `components/RoleDashboards.tsx`, linhas 3690–3704 e 3977–4013; confiança alta]**
- Próximos agendamentos dos alunos da própria escola, excluindo cancelados, com data, hora, unidade, status, aluno, especialidade e profissional. **[Confirmada — `components/RoleDashboards.tsx`, linhas 3706–3717 e 4016–4054; confiança alta]**
- Alertas de alunos sem apoio, avaliações pendentes, consultas na semana e TEA. **[Confirmada — `components/RoleDashboards.tsx`, linhas 4056–4088; confiança alta]**
- Dados cadastrais da escola: nome, INEP, direção, telefone, distrito e internet. **[Confirmada — `components/RoleDashboards.tsx`, linhas 4091–4132; confiança alta]**

O cartão de agendamentos e o link “Ver agenda completa” levam a `/app/scheduling`, embora a agenda não apareça no menu. **[Confirmada — `components/RoleDashboards.tsx`, linhas 3878–3886 e 4020–4026; confiança alta]**

O botão “Ver prontuário” do cartão de aluno usa um callback opcional. Como `App` não fornece `onOpenPatient` ao dashboard da escola, o fallback atual navega para a lista geral, não diretamente para o aluno selecionado. **[Confirmada — `components/RoleDashboards.tsx`, `openReadonlyRecord`, linhas 3810–3816; `src/App.tsx`, renderização do dashboard, linhas 363–367; confiança alta]**

---

## 4. Menus e rotas acessíveis

### 4.1 Navegação apresentada ao usuário

| Entrada | Rota | Onde aparece | Resultado para ESCOLA | Evidência e confiança |
|---|---|---|---|---|
| Visão Geral | `/app/dashboard` | Menu desktop e mobile | Dashboard da escola | `components/Layout.tsx:297–310, 515–519, 715–719`; `src/App.tsx:363–367` — **alta** |
| Alunos / Prontuários | `/app/list` | Menu desktop e mobile | Lista de alunos da escola | `components/Layout.tsx:297–310`; `src/App.tsx:436` — **alta** |
| Profissionais de Apoio | `/app/support-professionals` | Menu desktop e mobile | Gestão dos profissionais da escola | `components/Layout.tsx:297–310`; `src/App.tsx:517–519` — **alta** |
| Sobre | `/app/about` | Rodapé desktop e mobile | Informações do sistema | `components/Layout.tsx:610–629, 799–812`; `src/App.tsx:534` — **alta** |
| Sair | ação, sem rota própria | Rodapé desktop e mobile | Limpa usuário local e navega ao início; não encerra explicitamente o Auth | `components/Layout.tsx:610–629, 799–812`; `src/App.tsx:293–296` — **alta** |
| Agenda | `/app/scheduling` | Atalhos no dashboard, não no menu | Abre a central de agendamentos | `components/RoleDashboards.tsx:3878–3886, 4020–4026`; `src/App.tsx:480–487` — **alta** |

### 4.2 Rotas derivadas de ações legítimas

| Rota | Como é alcançada | Situação | Evidência e confiança |
|---|---|---|---|
| `/app/register` | Botão `Cadastrar Aluno` | Permitida pela interface e pelo RLS local para aluno da escola | `components/PatientList.tsx:739–771`; `src/App.tsx:437`; `db/migrations/V26_students_insert_update_rls.sql:11–65` — **alta/média** |
| `/app/profile` | Abrir aluno na lista | Perfil do aluno; clínica e histórico clínico ficam bloqueados | `src/App.tsx:438`; `components/PatientProfile.tsx:64–68, 792–801, 898–945` — **alta** |
| `/app/edit-student` | Editar na lista ou no perfil | Formulário completo de edição | `src/App.tsx:439`; `components/PatientList.tsx:1056–1122, 1217–1226` — **alta** |
| `/app/support-professionals/new` | Novo profissional | Cadastro da própria escola | `src/App.tsx:517`; `components/SupportProfessionalManagement.tsx:1340–1370` — **alta** |
| `/app/support-professionals/edit/:profId` | Abrir/editar profissional | Edição da própria escola | `src/App.tsx:518`; `components/SupportProfessionalManagement.tsx:1770–1885` — **alta** |
| `/app/new-appointment` | Nova consulta/reagendamento na agenda | Formulário aparece, mas a escrita de ESCOLA tende a ser negada pelas policies locais | `src/App.tsx:493–510`; `components/AppointmentForm.tsx:258–269, 1007–1025`; `db/migrations/V23_appointments_exclusao_logica_rls.sql:51–116` — **média** |

### 4.3 Rotas fora do menu, mas registradas para qualquer usuário autenticado

`ProtectedRoute` verifica somente se existe usuário. Assim, as rotas abaixo não têm bloqueio de papel no roteador e podem ser tentadas por URL direta: painéis e formulários clínicos, serviço social, nutrição, lançamento retroativo, relatórios gerenciais e TEA, gerador e cofre de documentos, relatório anual TCM, escolas, configurações, papel timbrado, backup e `my-access`. O resultado interno pode variar conforme filtros de cada componente e RLS. **[Confirmada — `src/routes/ProtectedRoute.tsx`, linhas 12–29; `src/App.tsx`, linhas 441–519 e 531–535; confiança alta]**

As únicas exceções explícitas no roteador são `/app/admin`, limitado a `ADMIN`, e `/app/audit-logs`, condicionado a `canViewSystemAuditLogs`. **[Confirmada — `src/App.tsx`, linhas 520–530 e 536–547; confiança alta]**

Ocultar itens do menu é uma guarda visual, não uma autorização. A autorização efetiva precisa vir dos componentes, serviços e RLS, e não é uniforme nas rotas registradas. **[Confirmada — comparação entre `components/Layout.tsx:297–310`, `src/routes/ProtectedRoute.tsx:12–29` e `src/App.tsx:436–547`; confiança alta]**

---

## 5. Alunos

### 5.1 Listagem e escopo

`getStudents` obtém o perfil da sessão e, quando o papel é `ESCOLA` e há `school_id`, adiciona `.eq('school_id', profileSchoolId)`. Também exige `status = 'Active'`, o que exclui alunos inativos, pendentes e duplicados. **[Confirmada — `services/SupabaseService.ts`, `getStudents`, linhas 897–985; confiança alta]**

A lista aplica uma segunda filtragem pelo `currentUser.schoolId`; se o perfil escolar não tiver esse ID, a lista fica vazia. **[Confirmada — `components/PatientList.tsx`, linhas 275–388; confiança alta]**

O filtro padrão de vínculo é ativo. A pesquisa alcança nome, escola, diagnóstico, CPF e outros termos normalizados; há filtros de escola, diagnóstico, cadastro/sessão, unidade e ordenação por nome, idade ou última sessão. A paginação visual usa dez alunos por página. **[Confirmada — `components/PatientList.tsx`, linhas 56–104 e 275–388; confiança alta]**

Na listagem e na expansão aparecem dados pessoais e sensíveis: foto, nome, cartão SUS, escola, situação, diagnóstico, idade, série, última sessão, CID, responsável, telefone, nascimento e CPF. **[Confirmada — `components/PatientList.tsx`, linhas 1056–1282; confiança alta]**

### 5.2 Visualização do prontuário

O perfil do aluno carrega o registro completo, sessões e atendimentos de apoio antes de aplicar bloqueios de apresentação. **[Confirmada — `components/PatientProfile.tsx`, linhas 119–183; confiança alta]**

Para `ESCOLA`, a tela mostra dados pessoais, responsáveis, endereço, vínculo escolar, apoio, dificuldades, NIS/benefícios e documentos. A seção clínica detalhada e o histórico de atendimentos clínicos ficam escondidos/bloqueados. **[Confirmada — `components/PatientProfile.tsx`, linhas 64–68, 676–801 e 898–1064; confiança alta]**

O botão de editar continua disponível. **[Confirmada — `components/PatientProfile.tsx`, linhas 684–691; confiança alta]**

### 5.3 Cadastro e edição

`ESCOLA` está incluída em `canRegister`, e a lista exibe `Cadastrar Aluno`. No mesmo agrupamento, também exibe `Importar CSV` e `Mesclar Alunos`; apenas `Cadastro Rápido` exclui a escola. **[Confirmada — `components/PatientList.tsx`, linhas 132–143 e 739–771; confiança alta]**

Os botões de edição nos cartões mobile e nas linhas desktop não possuem condição adicional de papel. **[Confirmada — `components/PatientList.tsx`, linhas 1056–1122 e 1217–1226; confiança alta]**

O formulário apresenta cinco abas: dados pessoais, clínicos, família/social, escola e documentos. Para `ESCOLA`, `isClinicalBlocked` é falso; logo, ela pode preencher ou alterar diagnóstico, CID, peso, altura, necessidades, medicamentos, alergias e histórico terapêutico, embora a visualização do prontuário esconda esses dados. **[Confirmada — `components/RegistrationForm.tsx`, linhas 86–110, 616–622 e 823–887; confiança alta]**

No salvamento, o formulário força o `school_id` do perfil escolar ou tenta resolvê-lo pelo INEP. O serviço volta a forçar o vínculo antes do `upsert`. **[Confirmada — `components/RegistrationForm.tsx`, linhas 403–528, especialmente 441–469; `services/SupabaseService.ts`, `saveStudent`, linhas 1515–1792, especialmente 1580–1592 e 1741–1747; confiança alta]**

As migrations locais permitem `INSERT` e `UPDATE` de alunos apenas quando a escola do perfil coincide com a do registro. Não foi encontrada autorização de exclusão para `ESCOLA`; a interface também restringe excluir e desvincular a papéis de gestão. **[Provável no banco efetivo e confirmada na interface — `db/migrations/V26_students_insert_update_rls.sql`, linhas 11–65; `db/migrations/V36_students_update_rls_clinical.sql`, linhas 12–104; `components/PatientList.tsx`, linhas 132–143; confiança média/alta]**

### 5.4 Validações, erros e auditoria

O formulário verifica campos obrigatórios e procura duplicidade usando a lista acessível ao usuário. Para a escola, essa lista já é limitada à própria unidade; duplicidades em outra escola podem não ser detectadas pelo cliente. O usuário pode confirmar a continuidade quando há possível duplicidade. **[Confirmada — `components/RegistrationForm.tsx`, linhas 403–440; `services/SupabaseService.ts`, linhas 897–985; confiança alta]**

Após `saveStudent`, o formulário registra auditoria de `CREATE` ou `UPDATE` para o aluno e mostra modal de sucesso; falhas exibem mensagem de erro. **[Confirmada — `components/RegistrationForm.tsx`, linhas 497–527 e 1276–1293; confiança alta]**

Não há auditoria específica por campo sensível alterado, foto enviada ou documento anexado; o registro observado é da ação global sobre o aluno. **[Confirmada quanto ao fluxo observado — `components/RegistrationForm.tsx`, linhas 497–506; `services/SupabaseService.ts`, linhas 1540–1777; confiança alta]**

---

## 6. Fotos

### 6.1 Foto do aluno

O cadastro/edição permite escolher, substituir e remover a foto. O input aceita `image/*`, o que em navegadores móveis pode oferecer câmera e galeria sem mudar o contrato do backend. **[Confirmada — `components/RegistrationForm.tsx`, linhas 630–662; confiança alta]**

O handler usa `FileReader` para gerar pré-visualização em data URL. Não há validação JavaScript explícita de tamanho, resolução ou MIME além do atributo `accept`. **[Confirmada — `components/RegistrationForm.tsx`, `handlePhotoChange`, linhas 347–365; confiança alta]**

Ao salvar, o serviço tenta enviar o arquivo ao bucket `students-photos`, em um caminho com timestamp e nome original, e grava a URL pública em `students.photo_url`. **[Confirmada — `services/SupabaseService.ts`, `saveStudent`, linhas 1540–1563 e 1594–1677; confiança alta]**

Se o upload falhar, o erro é capturado sem interromper necessariamente o salvamento do aluno. Como `finalPhotoUrl` pode ainda conter a prévia em data URL, existe risco de persistir base64 no campo ou de reportar sucesso com a foto não enviada ao Storage. **[Confirmada no fluxo; efeito dependente do erro — `services/SupabaseService.ts`, linhas 1540–1563; confiança alta/média]**

### 6.2 Fotos na consulta

A foto aparece no dashboard, na lista e no perfil do aluno. **[Confirmada — `components/RoleDashboards.tsx`, linhas 3905–3974; `components/PatientList.tsx`, linhas 1056–1248; `components/PatientProfile.tsx`, linhas 694–784; confiança alta]**

### 6.3 Foto do profissional de apoio

O cadastro de profissional aceita `image/*` e converte a imagem para data URL. Não foi encontrado upload específico dessa foto para Storage; `photo_url` é enviado junto ao registro. **[Confirmada — `components/SupportProfessionalManagement.tsx`, linhas 628–644 e 1018; `services/SupabaseService.ts`, `saveSupportProfessional`, linhas 3728–3815; confiança alta]**

### 6.4 Segurança não confirmada

Não foram encontradas no diretório de migrations policies efetivas para o bucket `students-photos`. Portanto, limite de arquivo, antivírus, privacidade do bucket, autorização de leitura, retenção e remoção física das fotos não podem ser confirmados localmente. **[Não confirmada — busca local em `db/migrations`; confiança alta sobre a ausência de evidência, nenhuma conclusão sobre o remoto]**

---

## 7. Relatórios e documentos

### 7.1 Documentos anexados ao aluno

No cadastro/edição do aluno, a escola pode anexar Laudo Médico, Receita Médica, Cartão de Vacina, Cartão SUS, Certidão de Nascimento, PEI, Autorização de Uso de Imagem, RG, CPF e um arquivo classificado como “Outro”. Os tipos fixos aceitam imagem ou PDF; o input genérico não possui `accept`. **[Confirmada — `components/RegistrationForm.tsx`, linhas 1142–1260; confiança alta]**

O handler mantém os arquivos em fila local e permite remover metadados. Não há validação JavaScript explícita de tamanho ou MIME. **[Confirmada — `components/RegistrationForm.tsx`, linhas 367–401 e 1195–1254; confiança alta]**

No salvamento, cada documento é enviado ao bucket `student-documents`, na pasta `docs/`, e os metadados `id`, tipo, nome, URL e data ficam no JSONB `students.documents`. Não há tabela `student_documents` usada por esse fluxo. **[Confirmada — `services/SupabaseService.ts`, `saveStudent`, linhas 1691–1731; `types.ts`, `StudentDocument` e `Student`, linhas 286–292 e 311–340; confiança alta]**

Falhas individuais de upload são capturadas e o restante do salvamento continua. Isso pode produzir sucesso do aluno com um ou mais anexos ausentes. **[Confirmada — `services/SupabaseService.ts`, linhas 1691–1731 e 1753–1777; confiança alta]**

Remover um documento pelo formulário altera a lista de metadados, mas não foi encontrada chamada para excluir o objeto correspondente no Storage. **[Confirmada quanto à ausência no fluxo — `components/RegistrationForm.tsx`, linhas 1233–1254; `services/SupabaseService.ts`, linhas 1691–1731; confiança alta]**

No perfil do aluno, `ESCOLA` pode ver e baixar todos os documentos listados, inclusive os de natureza clínica, pois o bloqueio clínico dessa tela não envolve a lista documental. **[Confirmada — `components/PatientProfile.tsx`, linhas 1033–1064; confiança alta]**

### 7.2 Cofre de documentos por URL direta

`/app/vault` não aparece no menu, mas a rota não tem guarda de papel. Ela recebe os alunos já carregados para a escola, permite selecionar um deles, enviar PDF/JPG/JPEG/PNG e visualizar ou baixar anexos. **[Confirmada — `src/App.tsx`, linha 514; `components/DocumentVault.tsx`, linhas 30–49, 81–125 e 246–368; confiança alta]**

O bloqueio de laudos/receitas no cofre se aplica somente às secretarias; `ESCOLA` não é incluída e, portanto, consegue abrir e baixar esses arquivos se acessar a rota. **[Confirmada — `components/DocumentVault.tsx`, linhas 315–357; confiança alta]**

As “normativas” do cofre são dados mockados no próprio componente, e o hash exibido é uma composição simulada, não um SHA-256 calculado. **[Confirmada — `components/DocumentVault.tsx`, linhas 38–55 e 371–379; confiança alta]**

### 7.3 Gerador de documentos por URL direta

`/app/documents` também não aparece no menu e não possui guarda de papel. Na carga inicial, `ESCOLA` cai em `getStudents()` e tende a receber seus alunos; a lista de modelos, por não possuir ramo para escola, cai no conjunto amplo usado como fallback. **[Confirmada — `src/App.tsx`, linha 512; `components/DocumentGenerator.tsx`, linhas 68–83 e 270–303; confiança alta]**

Contudo, ao gerar, o componente refaz a consulta por `getStudentsForUser`. Esse método só trata papéis administrativos e `SPECIALIST`; `ESCOLA` cai em `getAlunosDaProfissional(currentUser.id)`. Assim, a geração pode falhar por não reencontrar o aluno escolar selecionado. **[Confirmada no fluxo; resultado depende dos vínculos de agenda — `components/DocumentGenerator.tsx`, linhas 87–104; `services/SupabaseService.ts`, `getStudentsForUser`, linhas 992–1008; confiança alta/média]**

O Atestado de Comparecimento exclui `ESCOLA` explicitamente. As permissões da tabela `generated_documents` não aparecem nas migrations locais, portanto leitura, gravação e exclusão efetivas para a escola não podem ser confirmadas. **[Confirmada no cliente e não confirmada no banco — `components/DocumentGenerator.tsx`, linhas 68–70; `services/SupabaseService.ts`, linhas 3398–3432; confiança alta sobre o código]**

### 7.4 Relatórios disponíveis no módulo de apoio

Dentro de `Profissionais de Apoio`, a aba `Relatórios` é exibida para a escola e recebe apenas os profissionais, escolas e alunos já carregados no contexto do módulo. A escola também pode exportar a lista. **[Confirmada — `components/SupportProfessionalManagement.tsx`, linhas 1425–1507; confiança alta]**

Os relatórios gerenciais gerais, TEA e anual TCM não aparecem no menu escolar, embora as rotas estejam registradas sem guarda de papel. Seu uso direto não deve ser considerado uma função oficialmente exposta da escola. **[Confirmada — `components/Layout.tsx`, linhas 297–310; `src/App.tsx`, linhas 489–514; confiança alta]**

### 7.5 Storage e auditoria documental

As únicas policies de Storage encontradas para anexos de profissionais estão comentadas como instrução manual na V16 e não são DDL efetivo. Não há evidência local suficiente para confirmar as policies atuais dos buckets, se os objetos são públicos/privados, limites, retenção ou exclusão. **[Não confirmada — `db/migrations/V16_support_professionals_rls_staff.sql`, linhas 55–80; confiança alta sobre a lacuna]**

Não foi encontrada auditoria específica de upload, abertura, download ou remoção de documento. O formulário registra apenas a criação/edição global do aluno ou profissional. **[Confirmada quanto ao fluxo observado — `components/RegistrationForm.tsx`, linhas 497–506; `components/SupportProfessionalManagement.tsx`, linhas 368–450; confiança alta]**

---

## 8. Agendamentos

### 8.1 O que o dashboard mostra

O dashboard filtra localmente os agendamentos para os IDs dos alunos da escola e exclui cancelados. Mostra os próximos compromissos e indicadores semanais. **[Confirmada — `components/RoleDashboards.tsx`, linhas 3706–3717, 3762–3776 e 4016–4054; confiança alta]**

### 8.2 O que a central de agenda mostra

A central chama `getAppointments` sem passar escola ou aluno para `ESCOLA`. O serviço executa `select('*')` e só adiciona filtros quando eles são fornecidos. A tela atualiza os dados a cada 30 segundos. **[Confirmada — `components/SchedulingCenter.tsx`, linhas 195–277; `services/SupabaseService.ts`, `getAppointments`, linhas 2630–2677; confiança alta]**

Para a escola, o estado inicial de unidade é `ALL`. A tela oferece filtros de unidade, especialidade e status e calcula totais sobre tudo o que a consulta retornar. **[Confirmada — `components/SchedulingCenter.tsx`, linhas 195–310 e 665–727; confiança alta]**

Segundo a V27 local, a policy de `SELECT` permite compromissos não excluídos quando `regional_district_cap()` é nulo. Como o papel `ESCOLA` não recebe capacidade regional nessa função, a expressão aparenta liberar todos os agendamentos não excluídos, e não apenas os alunos da escola. A documentação local declara V11–V45 aplicadas, mas o banco remoto não foi consultado. **[Provável — `db/migrations/V27_regional_scope_rls.sql`, linhas 11–128 e 329–355; `.brotar-docs/00-LEIA-PRIMEIRO.md`, inventário de migrations aplicadas; confiança média]**

### 8.3 Ações exibidas e autorização provável

A tela mostra para `ESCOLA` o botão de nova consulta e, em cada agendamento, ações de confirmar, iniciar, finalizar, reagendar e marcar falta. Cancelar é limitado a papéis de gestão e excluir a `ADMIN`. **[Confirmada — `components/SchedulingCenter.tsx`, linhas 386–393, 494–602 e 635–648; confiança alta]**

O formulário de agendamento fixa a escola do perfil e carrega alunos dela, mas não bloqueia o papel `ESCOLA` no cliente. **[Confirmada — `components/AppointmentForm.tsx`, linhas 258–269, 330–344 e 1007–1025; confiança alta]**

As policies locais de `INSERT` e `UPDATE` de agendamentos autorizam equipe de agenda ou especialista da especialidade; `ESCOLA` não integra esses conjuntos. Portanto, nova consulta, reagendamento ou mudança de status tende a falhar por RLS, apesar dos botões visíveis. **[Provável — `db/migrations/V15_appointments_rls.sql`, linhas 31–60; `db/migrations/V23_appointments_exclusao_logica_rls.sql`, linhas 51–116; `services/SupabaseService.ts`, `saveAppointment` e `updateAppointmentStatus`, linhas 2979–3035 e 3155–3165; confiança média]**

Não existe no fluxo observado uma ação específica para a escola apenas “solicitar” agendamento. A UI oferece ações de gestão direta, e o banco provavelmente as rejeita. **[Confirmada quanto à UI; provável quanto à rejeição — mesmos arquivos e linhas acima; confiança média]**

---

## 9. Profissionais de apoio

### 9.1 Escopo e consulta

Ao entrar no módulo, `ESCOLA` aguarda `schoolId`, consulta profissionais filtrados por essa escola e usa a lista de alunos já limitada à unidade. **[Confirmada — `components/SupportProfessionalManagement.tsx`, linhas 290–360 e 658–672; `services/SupabaseService.ts`, `getSupportProfessionals`, linhas 3582–3725; confiança alta]**

A listagem inclui dados pessoais e funcionais como nome, CPF, telefone, e-mail, endereço, formação, carga horária, escola, aluno e regente vinculados, além de anexos. **[Confirmada — `services/SupabaseService.ts`, linhas 3582–3725; `types.ts`, estrutura de profissional e anexos, linhas 75–156; confiança alta]**

### 9.2 Cadastro, edição e situação

`ESCOLA` vê `Novo Profissional`, importação CSV, exportação e edição. Nome e escola são obrigatórios; aluno é opcional; há verificação de CPF duplicado. **[Confirmada — `components/SupportProfessionalManagement.tsx`, linhas 368–450, 1340–1370 e 1770–1885; confiança alta]**

A V30 permite `INSERT` e `UPDATE` pela escola apenas quando `school_id` coincide com o do perfil. A V31 mantém atualização somente de vínculo ativo, bloqueando o uso escolar para desvincular/reativar. **[Provável no banco efetivo — `db/migrations/V30_support_professionals_escola_write_rls.sql`, linhas 10–53; `db/migrations/V31_support_professionals_soft_delete_rls_align.sql`, linhas 46–61; confiança média]**

A interface confirma essa separação: `ESCOLA` não vê histórico de inativos nem controles de desvincular/reativar; esses poderes pertencem a papéis de gestão de rede. **[Confirmada — `types.ts`, helpers de acesso, linhas 112–136; `components/SupportProfessionalManagement.tsx`, linhas 1425–1463, 1508–1520 e 1646–1652; confiança alta]**

### 9.3 Anexos e relatórios

O formulário aceita RG, comprovante de CPF, certificado/diploma, comprovante bancário e histórico escolar, nos formatos PDF, imagem, DOC ou DOCX. Não há validação JavaScript explícita de tamanho ou MIME. **[Confirmada — `components/SupportProfessionalManagement.tsx`, linhas 117–127 e 1242–1315; confiança alta]**

Os anexos são enviados para o bucket `student-documents`, sob `support_professional/`, com URL pública gravada no registro. As policies sugeridas para essa pasta estão apenas comentadas na V16; o funcionamento efetivo do upload para `ESCOLA` não pode ser garantido sem verificar o Storage remoto. **[Confirmada no serviço e não confirmada no Storage — `services/SupabaseService.ts`, `uploadSupportProfessionalAttachmentFile`, linhas 3435–3465; `db/migrations/V16_support_professionals_rls_staff.sql`, linhas 55–80; confiança média]**

A aba `Relatórios` e a exportação da lista são visíveis para a escola; a aba `Histórico` não é. **[Confirmada — `components/SupportProfessionalManagement.tsx`, linhas 1425–1507; confiança alta]**

---

## 10. Mensagens e notificações

O `NotificationContext` carrega mensagens recebidas e enviadas do usuário conectado e assina eventos Realtime em que ele é destinatário ou remetente. Também oferece marcar como lida e excluir. Não há filtro específico por papel no contexto. **[Confirmada — `contexts/NotificationContext.tsx`, linhas 27–135; confiança alta]**

O `NotificationBell` mostra somente itens do tipo `ALERT`, com título, conteúdo, remetente, data, leitura e exclusão. **[Confirmada — `components/NotificationBell.tsx`, linhas 12–165; confiança alta]**

Esse sino é renderizado no cabeçalho mobile do `Layout`, mas não foi encontrada renderização equivalente no desktop. Portanto, a escola tem uma caixa visual de alertas no layout compacto/mobile, mas não no layout desktop atual. **[Confirmada — `components/Layout.tsx`, linhas 634–647; busca de uso de `NotificationBell` no arquivo; confiança alta]**

Existe um componente `MessagingSystem` com caixa de entrada, enviados e composição para usuários cadastrados. Porém, ele não é importado nem montado nas rotas ou no menu atuais. Assim, `ESCOLA` não dispõe hoje de uma caixa de mensagens completa navegável, nem de criar/responder mensagens por um fluxo visível. **[Confirmada — `components/MessagingSystem.tsx`, linhas 13–68, 102–160 e 239–300; ausência em `src/App.tsx` e `components/Layout.tsx`; confiança alta]**

O serviço de notificações filtra recebidas pelo `recipient_id` exato e enviadas pelo `sender_id`; enviar cria um registro com remetente, destinatário, título, conteúdo e tipo. **[Confirmada — `services/SupabaseService.ts`, linhas 2479–2593; confiança alta]**

Não foram encontradas migrations locais com as policies de `system_messages`. Logo, não é possível confirmar autorização de leitura, envio, exclusão, destinatários permitidos, mensagens em massa ou isolamento por escola. **[Não confirmada — `.brotar-docs/00-LEIA-PRIMEIRO.md`, inventário da tabela; ausência de DDL correspondente em `db/migrations`; confiança alta sobre a lacuna]**

O alerta automático observado na criação de agendamento é enviado ao profissional vinculado, não à escola. **[Confirmada — `services/SupabaseService.ts`, `saveAppointment`, linhas 3019–3029; confiança alta]**

---

## 11. Permissões

### 11.1 Camadas existentes

1. **Autenticação:** exige sessão e perfil ativo. **[Confirmada — `services/SupabaseService.ts:384–455`; confiança alta]**
2. **Vínculo escolar no cliente:** alunos e profissionais são filtrados por `school_id`. **[Confirmada — `services/SupabaseService.ts:897–985, 3582–3725`; confiança alta]**
3. **Menu por papel:** reduz as entradas visíveis a três módulos principais. **[Confirmada — `components/Layout.tsx:297–310`; confiança alta]**
4. **Guarda de rota:** verifica autenticação, mas em geral não verifica papel. **[Confirmada — `src/routes/ProtectedRoute.tsx:12–29`; confiança alta]**
5. **Condições de componente:** bloqueiam algumas seções e botões, mas são inconsistentes entre telas. **[Confirmada — comparação entre `components/PatientProfile.tsx:64–68` e `components/RegistrationForm.tsx:86–110`; confiança alta]**
6. **RLS:** as migrations locais restringem várias operações por escola ou papel, mas o estado remoto não foi consultado. **[Provável — V26, V27, V30, V31 e V36; confiança média]**

### 11.2 Regra funcional observada por domínio

| Domínio | Ler | Criar | Editar | Excluir/desvincular | Escopo observado |
|---|---|---|---|---|---|
| Alunos | Sim | Sim | Sim | Não | Própria escola; ativos |
| Dados clínicos do aluno | Parcial na lista; ocultos no perfil | Sim pelo formulário | Sim pelo formulário | Não isoladamente | Própria escola |
| Fotos do aluno | Sim | Sim | Sim/remover referência | Remoção física não confirmada | Própria escola |
| Documentos do aluno | Sim/baixar | Sim | Substituir/remover metadado | Exclusão física não confirmada | Própria escola |
| Agendamentos | Dashboard: próprios; central: possivelmente todos | UI sim; RLS tende a negar | UI sim; RLS tende a negar | Cancelar/excluir não | Escopo de leitura central é risco |
| Profissionais de apoio | Sim | Sim | Sim, enquanto ativos | Não | Própria escola |
| Relatórios de apoio | Sim | N/A | N/A | N/A | Dados carregados no módulo |
| Alertas | Mobile | Não por UI visível | Marcar lido | Sim pelo sino | Usuário destinatário; RLS não confirmada |
| Mensagens completas | Sem UI atual | Sem UI atual | Sem UI atual | Sem UI atual | Componente órfão |

**Evidência consolidada:** `components/PatientList.tsx:132–143, 739–771`; `components/RegistrationForm.tsx:86–110, 403–528`; `components/PatientProfile.tsx:64–68, 898–1064`; `components/SchedulingCenter.tsx:386–393, 494–648`; `components/SupportProfessionalManagement.tsx:368–450, 1340–1507`; `components/Layout.tsx:634–647` — **confiança alta no cliente; média onde depende de RLS remoto**.

### 11.3 Diferenças entre documentação e implementação

A documentação funcional local descreve agenda, prontuário/cadastro e profissionais de apoio sem incluir `ESCOLA` em vários quadros de papéis. O código e migrations mais recentes, porém, incluem a escola em cadastro/edição de alunos e profissionais, além de disponibilizar a agenda por atalho/rota. **[Confirmada — `.brotar-docs/02-MODULOS-DO-SISTEMA.md`, linhas 20–34, 68–71 e 114–117; comparação com os arquivos citados nas seções 5, 8 e 9; confiança alta]**

Também há documentação antiga que cita papéis `SCHOOL` e `SUPPORT_PROFESSIONAL`, enquanto o tipo vigente usa `ESCOLA` e não possui esses dois papéis. **[Confirmada — `.brotar-docs/01-CONTEXTO-GERAL.md`, linhas 20–28; `types.ts`, linha 19; confiança alta]**

Para esta matriz, prevalece a implementação vigente, conforme solicitado.

---

## 12. Matriz funcional consolidada

| Função | Entrada atual | Resultado para ESCOLA | Serviço/dado | Restrição efetiva | Confiança |
|---|---|---|---|---|---|
| Entrar com INEP | Login | INEP vira `<INEP>@escola.brotar` | Auth + `profiles` + `schools` | Perfil precisa estar ativo | Alta |
| Entrar com e-mail | Login | E-mail usado diretamente | Auth + `profiles` | Perfil precisa estar ativo | Alta |
| Recuperar senha | Esqueci minha senha | Exige e-mail; INEP isolado usa domínio errado | Auth reset | E-mail técnico completo necessário para escola | Alta |
| Trocar senha inicial | Gate pós-login | Aparece se `must_change_password=true` | Auth + RPC/perfil | Flag na criação escolar não confirmada | Média |
| Encerrar por inatividade | Automático | 60 min, aviso final de 60 s | Auth | Executa `signOut` | Alta |
| Sair manualmente | Rodapé | Volta ao início | Estado React | Não chama `signOut` | Alta |
| Ver dashboard | Menu | Indicadores e dados da própria escola | Alunos, apoio, agenda, escolas | Filtros locais | Alta |
| Listar alunos | Menu | Somente ativos da escola | `students` | Cliente + RLS local | Alta/média |
| Abrir prontuário | Lista | Dados pessoais/escolares/social/docs; clínica bloqueada | `students`, sessões | Bloqueio visual parcial | Alta |
| Cadastrar aluno | Lista | Formulário completo | `students` | Própria escola | Alta/média |
| Editar aluno | Lista/perfil | Formulário completo, inclusive clínica | `students` | Própria escola | Alta/média |
| Excluir/desvincular aluno | Lista | Não disponível | `students` | Papéis de gestão | Alta |
| Importar CSV de alunos | Lista | Botão visível | Fluxo da lista | Escopo/efeitos devem respeitar salvamento e RLS | Alta/média |
| Mesclar alunos | Lista | Botão visível | Fluxo da lista | Permissão específica não comprovada | Média |
| Enviar foto de aluno | Cadastro/edição | Imagem para `students-photos` | Storage + `photo_url` | Policies/limites não confirmados | Média |
| Anexar documento | Cadastro/edição | Envia a `student-documents/docs` | Storage + JSONB | Policies/limites não confirmados | Média |
| Ver/baixar documento | Perfil; cofre por URL | Permitido, inclusive clínico | URL armazenada | Cofre não bloqueia ESCOLA | Alta |
| Remover documento | Edição | Remove metadado | JSONB | Objeto no Storage pode permanecer | Alta/média |
| Ver agenda própria | Dashboard | Próximos agendamentos dos alunos da escola | `appointments` | Filtro local | Alta |
| Abrir central de agenda | Dashboard/URL | Consulta ampla sem filtro escolar | `appointments` | Possível leitura de toda a rede | Média |
| Criar/reagendar/alterar status | Central | Botões e formulário visíveis | `appointments` | RLS local tende a negar | Média |
| Ver profissionais de apoio | Menu | Ativos da escola | `support_professionals` | Cliente + RLS local | Alta/média |
| Cadastrar/editar apoio | Módulo | Permitido para própria escola | `support_professionals` | Não pode desvincular/reativar | Alta/média |
| Anexar documento de apoio | Cadastro/edição | Upload para pasta de apoio | Storage + registro | Policies de Storage não confirmadas | Média |
| Relatório de apoio | Aba Relatórios | Disponível | Dados já carregados | Própria escola pelo contexto | Alta |
| Receber alertas | Sino mobile | Lê, marca e exclui alertas | `system_messages` | RLS não confirmada | Média |
| Trocar mensagens | Nenhuma entrada | Componente existe, mas não está montado | `system_messages` | Sem fluxo atual | Alta |

**Rastreabilidade da matriz:** autenticação em `services/SupabaseService.ts:384–669`; alunos em `components/PatientList.tsx:132–143, 739–1282`, `components/RegistrationForm.tsx:347–528, 616–1260` e `services/SupabaseService.ts:897–985, 1515–1792`; agenda em `components/SchedulingCenter.tsx:195–727`; apoio em `components/SupportProfessionalManagement.tsx:290–450, 1242–1507, 1770–1885`; mensagens em `contexts/NotificationContext.tsx:27–162` — **confiança conforme cada linha da tabela**.

---

## 13. Matriz Web × Mobile

O mobile deve manter exatamente as mesmas regras, serviços, dados e RLS. A equivalência abaixo descreve adaptação de interface, não uma autorização para criar novos fluxos.

| Função Web atual | Equivalente mobile fiel | Recursos nativos aceitáveis sem mudar regra | Regra que deve permanecer |
|---|---|---|---|
| Login por campo textual + senha | Tela de login com teclado apropriado e preenchimento seguro | Gerenciador de senhas do SO | Conversão INEP/e-mail e validação por perfil ativo |
| Sessão persistente | Sessão restaurada em armazenamento seguro | Cofre seguro do SO | Mesmos tokens, expiração e perfil efetivo |
| Troca obrigatória | Tela bloqueante antes do app | Sugestão de senha forte | Mínimo de 8 e flag `must_change_password` |
| Dashboard em cards | Cards verticais e seções recolhíveis | Pull-to-refresh | Dados e cálculos da própria escola |
| Menu lateral | Navegação inferior ou gaveta com 3 entradas | Gestos de navegação | Não expor módulos adicionais só por estarem roteados na Web |
| Lista de alunos | Lista virtualizada, busca e filtros em bottom sheet | Busca nativa | Somente ativos e da própria escola |
| Perfil do aluno | Seções/abas responsivas | Compartilhamento apenas onde já houver download | Mesmos bloqueios clínicos atuais |
| Cadastro/edição | Formulário por etapas com salvamento final | Teclados por tipo de campo | Mesmos campos e validações; vínculo forçado à escola |
| Foto de aluno | Capturar ou selecionar imagem | Câmera/galeria e compactação local | Mesmo `students-photos` e `photo_url`; sem novo dado |
| Documento do aluno | Selecionar arquivo, fotografar página ou usar scanner do SO | Câmera e seletor de documentos | Mesmos tipos, bucket, metadados e permissões |
| Agenda do dashboard | Lista dos próximos compromissos | Calendário visual local | Somente os compromissos que a função atual entrega ao dashboard |
| Central de agenda | Tela adaptada somente se o produto decidir preservar esse acesso atual | Seletor nativo de data/hora | Não ampliar escrita; RLS continua soberana |
| Profissionais de apoio | Lista, detalhe e formulário em etapas | Câmera/scanner para anexos | Própria escola; sem desvincular/reativar |
| Relatórios de apoio | Filtros e visualização/arquivo | Visualizador/compartilhamento do SO | Mesmo conjunto de dados já carregado |
| Alertas | Central de alertas dentro do app | Push como espelho opcional do mesmo evento | Mesmo destinatário e conteúdo; sem criar mensageria nova |
| Logout/inatividade | Ação de sair e bloqueio automático | Bloqueio local ao ir para background | O logout deve respeitar a sessão Supabase existente |

**Evidência da equivalência funcional:** componentes e serviços descritos nas seções 2–10. **Confiança alta** quanto ao que precisa ser preservado; escolha de componentes nativos é uma decisão de implementação futura, não validada nesta análise.

Biometria pode ser usada somente como desbloqueio local de uma sessão válida já autenticada, nunca como substituição do login Supabase, do perfil ativo, do papel ou do vínculo escolar. Isso é um limite de equivalência, não uma função atualmente existente. **[Inferência de arquitetura baseada em `services/supabaseClient.ts:14–33` e `services/SupabaseService.ts:384–455`; confiança média]**

O seletor mobile de câmera/galeria é compatível com os inputs Web `image/*`; um scanner que gere PDF/imagem é compatível com os anexos já aceitos. O mobile não deve introduzir áudio, vídeo, localização ou outros dados não existentes. **[Confirmada quanto aos formatos atuais — `components/RegistrationForm.tsx:630–662, 1142–1260`; `components/SupportProfessionalManagement.tsx:1242–1315`; confiança alta]**

---

## 14. Telas equivalentes no mobile

| Tela Web | Tela mobile equivalente | Conteúdo mínimo preservado | Observação funcional |
|---|---|---|---|
| Login | Acesso | Identificador/e-mail, senha, recuperar senha | Não renomear o campo para “INEP” sem também admitir e-mail completo |
| Recuperar Senha | Recuperação | E-mail cadastrado, estado de envio e erros | O fluxo atual não recupera por INEP isolado |
| Trocar Senha | Primeiro Acesso | Nova senha, confirmação, erros | Bloqueante quando a flag existir |
| SchoolDashboard | Início | Indicadores, alunos, apoio, agenda, alertas e escola | “Somente leitura” refere-se ao dashboard, não ao perfil inteiro |
| PatientList | Alunos | Busca, filtros, cartões/linhas e ações atuais | Importar/mesclar são funções atuais, mesmo que arriscadas |
| PatientProfile | Detalhe do Aluno | Dados pessoais, escolares, sociais, apoio e documentos | Clínica/histórico seguem bloqueados na apresentação |
| RegistrationForm | Cadastro/Edição de Aluno | Cinco grupos de dados, foto, anexos e validações | Hoje permite clínica para ESCOLA; não alterar silenciosamente |
| SchedulingCenter | Agenda | Resumo, filtros, compromissos e ações existentes | Acesso vem do dashboard/URL, não do menu |
| AppointmentForm | Agendamento | Escola fixa, aluno, profissional, data/hora | Escrita provavelmente negada por RLS |
| SupportProfessionalManagement | Apoio | Lista, filtros, cadastro, edição, anexos e relatórios | Sem histórico/desvinculação para ESCOLA |
| NotificationBell | Alertas | Não lidos/lidos, remetente, data e exclusão | Hoje visível somente no layout mobile/compacto |
| AboutSystem | Sobre | Versão e informações existentes | Entrada de rodapé |

**Rastreabilidade:** rotas em `src/App.tsx:344–550`, navegação em `components/Layout.tsx:297–310, 610–647, 715–812` e componentes citados nas seções anteriores — **confiança alta**.

Não há tela mobile equivalente para `MessagingSystem` porque esse componente não participa do fluxo Web vigente. Incluí-lo seria implementação de uma função não exposta hoje. **[Confirmada — ausência de importação/rota para `components/MessagingSystem.tsx`; confiança alta]**

---

## 15. Riscos e inconsistências

| Prioridade | Risco | Impacto | Evidência | Confiança |
|---|---|---|---|---|
| Crítica | Central de agenda pode retornar compromissos de toda a rede para ESCOLA | Exposição de aluno, especialidade, profissional, unidade e status | `components/SchedulingCenter.tsx:195–310`; `services/SupabaseService.ts:2630–2677`; `db/migrations/V27_regional_scope_rls.sql:329–355` | Média |
| Alta | Rotas internas, inclusive clínicas e administrativas, usam apenas guarda de autenticação | Acesso por URL a superfícies fora do menu; efeito depende da defesa interna/RLS | `src/routes/ProtectedRoute.tsx:12–29`; `src/App.tsx:441–535` | Alta |
| Alta | ESCOLA edita dados clínicos que o prontuário esconde | Regra de apresentação contraditória e alteração de dado sensível | `components/RegistrationForm.tsx:86–110, 823–887`; `components/PatientProfile.tsx:64–68, 898–945` | Alta |
| Alta | Logout manual não encerra a sessão Supabase | Possível restauração da sessão após “Sair” | `src/App.tsx:293–296`; `services/supabaseClient.ts:24–29` | Alta/média |
| Alta | Recuperação converte valor sem `@` para domínio não escolar | INEP isolado não recupera a conta da escola | `services/SupabaseService.ts:657–669` versus `services/SupabaseService.ts:384–402` | Alta |
| Alta | Uploads não têm limites/tipos validados no código e policies de Storage não estão versionadas | Arquivo indevido, falha, exposição ou comportamento diferente por ambiente | `components/RegistrationForm.tsx:347–401`; `db/migrations/V16_support_professionals_rls_staff.sql:55–80` | Alta sobre a lacuna |
| Alta | Documentos clínicos ficam acessíveis a ESCOLA no perfil e cofre | Exposição incompatível com o bloqueio clínico do prontuário | `components/PatientProfile.tsx:1033–1064`; `components/DocumentVault.tsx:315–357` | Alta |
| Média | Botões de criar/alterar agenda são exibidos, mas RLS tende a negar | Erro operacional e expectativa incorreta | `components/SchedulingCenter.tsx:386–648`; `db/migrations/V23_appointments_exclusao_logica_rls.sql:51–116` | Média |
| Média | Falha individual em foto/documento pode ser engolida | Mensagem de sucesso com arquivo ausente ou base64 persistido | `services/SupabaseService.ts:1540–1563, 1691–1731` | Alta/média |
| Média | Remover anexo altera metadado sem remover objeto do Storage | Retenção órfã de dados pessoais | `components/RegistrationForm.tsx:1233–1254`; ausência de `storage.remove` no fluxo | Alta |
| Média | Criação escolar não grava explicitamente a troca obrigatória | Conta pode manter senha padrão `123456` se não houver trigger/default | `services/SupabaseService.ts:677–885, 2157–2200` | Média |
| Média | `schools.is_active` não participa da autenticação | Escola desativada pode continuar acessando se o perfil estiver ativo | `services/SupabaseService.ts:403–455, 2057–2091` | Média |
| Média | Importar CSV e mesclar alunos aparecem para ESCOLA | Operações em massa/identidade expostas sem regra documental clara | `components/PatientList.tsx:739–771` | Alta no cliente |
| Média | Mensageria completa existe, mas não está integrada; alertas só aparecem no layout compacto | Experiência Web desktop e mobile divergente | `components/MessagingSystem.tsx`; `components/Layout.tsx:634–647` | Alta |
| Média | Documentação de papéis e módulos diverge do código | Decisões mobile podem copiar regras obsoletas | `.brotar-docs/01-CONTEXTO-GERAL.md:20–28`; `.brotar-docs/02-MODULOS-DO-SISTEMA.md:20–34, 68–71, 114–117` | Alta |
| Baixa | Botão “Ver prontuário” do dashboard cai na lista | Mais etapas e perda de contexto | `components/RoleDashboards.tsx:3810–3816`; `src/App.tsx:363–367` | Alta |
| Baixa | Cofre mostra normativas e hash simulados como se fossem reais | Usuário pode interpretar demonstração como controle de autenticidade | `components/DocumentVault.tsx:38–55, 371–379` | Alta |

Nenhum desses riscos foi corrigido neste trabalho, porque o escopo solicitado é exclusivamente documental.

---

## 16. Informações não confirmadas

1. **Estado real do banco remoto e das policies atuais.** A análise usou somente migrations locais e o ledger documental; nenhuma consulta foi feita ao Supabase remoto. **[Não confirmada — limitação deliberada do escopo]**
2. **Aplicação efetiva e ordem final das policies V26, V27, V30, V31 e V36 no ambiente publicado.** O repositório declara V11–V45 aplicadas, mas isso não foi validado externamente. **[Provável — `.brotar-docs/00-LEIA-PRIMEIRO.md`; confiança média]**
3. **V46.** O arquivo local existe, mas a instrução do projeto declara que não foi aplicado; ele não foi usado como regra vigente. **[Confirmada quanto ao status documental; sem consulta remota]**
4. **Policies dos buckets `students-photos` e `student-documents`.** Não há DDL efetivo suficiente nas migrations locais. **[Não confirmada]**
5. **Privacidade dos buckets e URLs públicas.** O código chama `getPublicUrl`, mas a configuração e a efetiva legibilidade externa não foram consultadas. **[Não confirmada — `services/SupabaseService.ts:1540–1563, 1691–1731, 3435–3465`]**
6. **Limites, antivírus, compressão, retenção, backup e exclusão física de arquivos.** Não há regra completa no código analisado. **[Não confirmada]**
7. **Policies de `system_messages` e `generated_documents`.** As tabelas são usadas pelo serviço, mas suas policies não estão presentes nas migrations locais encontradas. **[Não confirmada — `services/SupabaseService.ts:2479–2593, 3398–3432`]**
8. **Se algum trigger/default define `must_change_password=true` para contas escolares.** O payload de criação não define a flag. **[Não confirmada — `services/SupabaseService.ts:677–885`]**
9. **Se desativar uma escola também desativa automaticamente seu perfil.** Não foi encontrada essa ligação no fluxo de autenticação. **[Não confirmada]**
10. **Comportamento final de importação CSV e mesclagem para ESCOLA em todos os casos.** Os botões estão visíveis, mas não foi executado teste integrado nem consultado o banco. **[Não confirmada além da UI]**
11. **Se a leitura ampla da agenda ocorre no ambiente publicado.** A expressão da V27 indica que sim, mas a confirmação exigiria consulta remota, proibida neste trabalho. **[Provável, não verificada]**
12. **Entrega de alertas por push, e-mail ou mensageria externa.** O sistema analisado só comprova contexto Web/Realtime; não há push mobile vigente. **[Não confirmada]**

---

## 17. Perguntas para a proprietária do sistema

Estas perguntas não propõem novos fluxos; elas resolvem ambiguidades entre o comportamento atual e a intenção de negócio:

1. A escola deve realmente cadastrar alunos novos ou apenas atualizar alunos já vinculados?
2. A escola deve editar diagnóstico, CID, medicamentos, alergias e histórico terapêutico, apesar de não enxergar esses campos no prontuário?
3. A escola deve visualizar e baixar laudos e receitas anexados ao aluno?
4. `Importar CSV` e `Mesclar Alunos` são funções intencionais para `ESCOLA`?
5. A agenda deve estar disponível para a escola pelo dashboard, embora não esteja no menu?
6. Na agenda, a escola deve ver somente compromissos dos próprios alunos?
7. A escola deve confirmar, iniciar, finalizar, reagendar e marcar falta, ou apenas consultar?
8. A escola deve poder criar um agendamento direto, ou a presença atual do botão é acidental?
9. A escola deve cadastrar e editar profissionais de apoio ou apenas consultar os vínculos?
10. A aba de relatórios de profissionais de apoio é intencional para a escola?
11. Quais tipos de documentos de aluno e de profissional a escola pode anexar, ver, baixar e remover?
12. Existe limite formal de tamanho e formato para fotos e documentos?
13. A remoção de um documento deve apagar também o arquivo físico do Storage?
14. Toda conta escolar nova deve ser forçada a trocar a senha padrão no primeiro acesso?
15. O identificador oficial comunicado às escolas é o INEP, o e-mail técnico `<INEP>@escola.brotar` ou ambos?
16. A recuperação de senha deve aceitar o INEP, ou a escola sempre receberá/conhecerá seu e-mail técnico?
17. Desativar uma escola deve bloquear automaticamente todas as contas vinculadas?
18. A escola deve ter caixa completa de mensagens ou somente alertas recebidos?
19. Os alertas devem aparecer também no desktop ou a disponibilidade apenas no layout compacto é deliberada?
20. O texto “somente leitura” no dashboard deve descrever só aquela tela ou todo o papel `ESCOLA`?
21. As normativas e o “selo de autenticidade” simulados do cofre são conteúdo de demonstração ou são apresentados em produção?
22. Qual é a regra oficial de auditoria para abertura, download, substituição e remoção de arquivos sensíveis?

**Origem das perguntas:** inconsistências e lacunas comprovadas nas seções 2–16. **Confiança alta** de que as respostas são necessárias para uma equivalência mobile sem alterar regras de negócio.

---

## 18. Conclusão

O perfil `ESCOLA` vigente possui um núcleo funcional claro: autenticação vinculada ao INEP/escola, dashboard próprio, consulta e manutenção de alunos ativos da unidade, gestão de profissionais de apoio da unidade, anexos e relatórios de apoio. O dashboard oferece ainda consulta de agenda. **[Confirmada — `services/SupabaseService.ts:384–455, 897–985, 3582–3725`; `components/Layout.tsx:297–310`; `components/RoleDashboards.tsx:3641–4138`; confiança alta]**

A equivalência mobile é tecnicamente viável sem alterar banco, login, papéis ou regras: as telas podem ser reorganizadas para toque e telas pequenas e podem usar câmera, galeria e seletor/scanner de documentos apenas como formas nativas de fornecer os mesmos arquivos já aceitos. **[Inferência de arquitetura baseada nos contratos atuais; confiança alta]**

Antes de implementar, porém, a proprietária precisa validar as divergências que já existem no Web: edição clínica pela escola, acesso a documentos clínicos, importação/mesclagem, agenda fora do menu com possível leitura ampla, ações de agenda provavelmente negadas pelo RLS, rotas sem guarda de papel, logout incompleto e recuperação de senha incompatível com INEP isolado. Copiar o Web sem essa decisão também copiaria suas inconsistências. **[Confirmada/provável conforme seção 15]**

### Declaração de conformidade deste trabalho

- Nenhum arquivo existente foi alterado.
- Somente este relatório foi criado: `docs/analise-mobile/MATRIZ_ESCOLA_WEB_MOBILE.md`.
- Nenhum banco remoto foi acessado.
- Nenhuma migration foi aplicada ou alterada.
- Nenhuma dependência foi instalada.
- Nenhuma funcionalidade foi implementada.
- A migration V46 não foi aplicada nem usada como regra vigente.
