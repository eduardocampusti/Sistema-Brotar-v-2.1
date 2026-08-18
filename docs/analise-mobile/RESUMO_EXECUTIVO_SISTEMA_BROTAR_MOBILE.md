# Resumo Executivo - Sistema Brotar para Aplicativo Mobile

**Data:** 06 de agosto de 2026  
**Fonte:** análise estática dos arquivos locais em `D:\OneDrive\SISTEMA BROTAR\Sistema-Brotar-v-2.1`

## Síntese

O Sistema Brotar é uma aplicação web municipal funcional para gestão educacional e atendimento multiprofissional. O produto possui módulos reais de alunos, escolas, agenda, prontuários, especialidades clínicas, nutrição, profissionais de apoio, documentos, inteligência artificial, WhatsApp, mensagens, relatórios, auditoria e administração.

A prontidão atual para compartilhar o backend com um aplicativo Android/iOS é **baixa**. O principal impedimento não é falta de funcionalidades, mas a necessidade de estabilizar segurança, autorização e contratos de dados.

## Pontos favoráveis

- Supabase Auth já implantado.
- RLS presente nos principais domínios.
- Perfis e escopos por escola, região, profissional e especialidade.
- APIs autenticadas para Gemini e envio de WhatsApp.
- Casos mobile claros em agenda, atendimento, cadastro rápido e nutrição.
- Regras e tipos de domínio reaproveitáveis.

## Bloqueadores

- Produção documentada até V45 ainda depende de `user_metadata` em policies.
- V46 está bloqueada e não aplicada.
- Baseline do banco não é reproduzível integralmente.
- Storage usa URLs públicas e policies não reconciliadas.
- Sessões clínicas e nutrição têm lacunas de RLS.
- Webhook WhatsApp não valida assinatura nem idempotência.
- Auditoria e operações sensíveis ainda dependem do cliente.
- Homologação não foi confirmada.
- Não existe infraestrutura push, device registry, offline ou sincronização.

## Maior potencial mobile

1. Agenda do dia.
2. Confirmação de chegada/presença.
3. Início e encerramento de atendimento.
4. Consulta mínima do aluno vinculado.
5. Registro de evolução clínica.
6. Cadastro rápido.
7. Câmera/scanner de documentos.
8. Mensagens e pendências.
9. Antropometria, NAE e atividades nutricionais de campo.

## Manter no web inicialmente

- gestão de usuários e roles;
- backup e restauração;
- merge e exclusões;
- configurações globais;
- papel timbrado;
- relatórios extensos TEA/TCM;
- operações privilegiadas de banco.

## Pré-requisitos

1. Reconciliar o schema e as migrations.
2. Substituir metadata editável por autorização server-controlled.
3. Criar homologação e testes RLS negativos.
4. Tornar buckets privados e adotar URLs assinadas.
5. Colocar sessões, atestados, auditoria e administração atrás de API/RPC.
6. Proteger e tornar idempotente o webhook WhatsApp.
7. Definir gestão de dispositivos, push, cache e política offline.

## Conclusão

Há valor comprovável em um aplicativo interno, voltado a profissionais e fluxos rápidos. A definição de React Native, Flutter, Expo, PWA ou aplicativo nativo deve ocorrer somente depois da estabilização técnica e da validação das necessidades de campo.

Nenhum banco remoto foi acessado, nenhuma migration foi executada e nenhuma implementação mobile foi iniciada durante esta análise.
