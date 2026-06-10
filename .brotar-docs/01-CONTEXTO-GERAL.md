# 01 — Contexto Geral — Sistema Brotar

> Leia este arquivo quando precisar de visão geral do projeto, histórico ou contexto para tomar decisões técnicas.

---

## O que é o Sistema Brotar

O **Sistema Brotar** é uma plataforma SaaS (software como serviço) desenvolvida para a **Secretaria Municipal de Educação de Brotas de Macaúbas – Bahia**.

Seu objetivo é unificar, em um único sistema digital, a **gestão educacional** e o **atendimento clínico multiprofissional** dos alunos com necessidades especiais da rede pública municipal.

Antes do sistema, tudo era feito em papel, planilhas Excel e WhatsApp. Agendamentos se perdiam, documentos sumiam e nenhum profissional sabia o que o outro estava fazendo com o mesmo aluno.

---

## Quem usa o sistema

| Perfil | Quem é na vida real |
|---|---|
| ADMIN | Gestor técnico do sistema (você, Eduardo, ou técnico de TI) |
| EDUCATION_SECRETARY | Secretária Municipal de Educação |
| SECRETARIA_SEDE | Servidores do setor central (Brotas de Macaúbas) |
| SECRETARIA_COCAL | Servidores do distrito de Cocal |
| SPECIALIST | Psicólogos, fonoaudiólogos, psicopedagogos, terapeutas ocupacionais, assistentes sociais, fisioterapeutas, nutricionistas |
| SOCIAL_WORKER | Assistente social com acesso dedicado ao módulo social |
| SCHOOL | Diretor ou secretário de cada uma das ~30 escolas municipais |
| SUPPORT_PROFESSIONAL | Cuidadores e profissionais de apoio vinculados a alunos específicos |

---

## Como o sistema foi construído (decisão arquitetural)

O sistema foi desenvolvido inteiramente com **IA assistida** (Claude, Antigravity, Cursor) por alguém sem experiência prévia em programação. Isso significa:

- O código funciona, mas pode ter inconsistências de estilo entre partes antigas e novas.
- Algumas decisões foram tomadas "no momento" para resolver problemas urgentes, sem planejamento de longo prazo.
- Há arquivos de diagnóstico (`.mjs`, `.sql`, `.ps1`) espalhados pela raiz — são scripts de debugging que podem ser ignorados ou arquivados.

---

## Linha do tempo do projeto

| Período | O que aconteceu |
|---|---|
| Início (dez/2025) | Versão 1.0 — sistema básico de cadastro de alunos e agendamentos |
| jan/2026 | Crise de RLS: loop infinito no banco. Resolvido com migrações V11–V12 |
| fev/2026 | Upgrade do Supabase Free → PRO (resolveu timeouts definitivamente) |
| mar/2026 | Expansão: prontuário clínico, módulo de psicologia, serviço social |
| abr/2026 | RLS refinado para isolamento por especialidade ("parede de concreto") |
| mai/2026 | Versão 2.4 — auditoria de responsividade, SEO, migration V39 |
| jun/2026 | Estado atual: sistema em produção, estável, foco em melhorias de UX |

---

## Princípios que guiam o desenvolvimento

### 1. Ficha Âncora
Todo aluno tem uma "ficha âncora" na tabela `students`. Essa ficha contém apenas dados administrativos (nome, escola, responsável, CPF, endereço). **Dados clínicos nunca ficam nessa tabela.**

### 2. Parede de Concreto
Cada especialista só vê e edita os dados da **sua especialidade**. Um fonoaudiólogo não vê as notas do psicólogo do mesmo aluno, e vice-versa. Isso é garantido pelo RLS do Supabase.

### 3. Nunca quebrar o que funciona
Antes de qualquer alteração, fazer commit. Qualquer mudança em arquivo crítico deve ser testada em ambiente local antes de ir para produção.

### 4. Auditoria total
Toda ação relevante (criação, edição, exclusão) gera registro em `audit_logs`. Documentos gerados recebem código institucional (formato `BRT-ANO-#####`).

---

## Estrutura de pastas explicada de forma simples

```
Sistema-Brotar-v-2.1/
│
├── src/                  → Código principal do sistema (React + TypeScript)
│   ├── App.tsx           → "Mapa" do sistema — define quais páginas existem
│   ├── main.tsx          → Ponto de entrada do aplicativo
│   └── routes/           → Controle de quem pode acessar cada página
│
├── components/           → Todas as telas do sistema (cada arquivo = uma tela)
│
├── services/             → Comunicação com o banco de dados (Supabase)
│   ├── supabaseClient.ts → Configuração da conexão
│   └── SupabaseService.ts→ Todas as funções de busca/salvar/deletar dados
│
├── contexts/             → Informações globais (usuário logado, notificações)
│
├── db/migrations/        → Histórico de todas as mudanças no banco de dados
│                           (V11 a V39 — nunca deletar, são o histórico oficial)
│
├── design-system/        → Guia visual: cores, fontes, componentes padrão
│
├── public/               → Arquivos estáticos (logo, robots.txt, sitemap)
│
├── dist/                 → Versão compilada para produção (não editar direto)
│
├── .env.local            → Senhas e chaves de API (NUNCA versionar este arquivo)
│
└── [arquivos .mjs/.sql   → Scripts de diagnóstico e correção (podem ser
    na raiz]                arquivados na pasta /scratch após uso)
```

---

## Variáveis de ambiente (resumo sem senhas)

| Variável | Para que serve |
|---|---|
| `VITE_SUPABASE_URL` | Endereço do banco de dados |
| `VITE_SUPABASE_ANON_KEY` | Chave pública do Supabase (acesso anônimo) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave administrativa do Supabase (acesso total — nunca expor no frontend) |
| `VITE_API_URL` | URL da API Express (local: 3000, produção: api-brotar.smebrotas.com.br) |
| `GEMINI_API_KEY` | Chave da IA Gemini para geração de documentos |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número WhatsApp Business |
| `WHATSAPP_TOKEN` | Token da API do WhatsApp |

> ⚠️ **ATENÇÃO:** O arquivo `.env.local` contém todas essas chaves e **nunca deve ser enviado ao GitHub**. Ele já está no `.gitignore`.
