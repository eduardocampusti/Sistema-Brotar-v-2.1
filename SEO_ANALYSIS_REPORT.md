# Relatório de Análise e Otimização SEO/GEO - Sistema Brotar

## 🤖 Status: Applying knowledge of `seo-specialist`

Este relatório detalha as correções implementadas e sugestões futuras para otimizar o **Sistema Brotar** tanto para mecanismos de busca tradicionais (Google) quanto para motores generativos de IA (ChatGPT, Gemini, Perplexity).

---

## ✅ 1. Correções Implementadas (Immediate Fixes)

Realizei as seguintes alterações diretas no código para estabelecer a base técnica de SEO:

### 1.1 Meta Tags e Open Graph (`index.html`)
- **Problema**: O sistema não possuía descrição, canonical tag ou imagem de compartilhamento.
- **Solução**: Adicionei:
  - `<meta name="description">`: Resumo claro para snippets de busca.
  - `<link rel="canonical">`: Evita conteúdo duplicado.
  - **Open Graph (OG)**: Tags para garantir que links compartilhados no WhatsApp/LinkedIn tenham título, imagem e descrição corretos.

### 1.2 Estrutura de Arquivos Públicos
- **Problema**: Pasta `public/` inexistente, faltando arquivos essenciais para bots.
- **Solução**:
  - Criada pasta `public/`.
  - **`robots.txt`**: Instruí crawlers sobre o que acessar. Bloqueei `/admin` e `/private` por segurança.
  - **`sitemap.xml`**: Criado mapa básico para indexação.

### 1.3 Schema Markup (GEO Optimization)
- **Problema**: IAs não entendiam estruturalmente o que é o "Sistema Brotar".
- **Solução**: Injetei JSON-LD Schema (`SoftwareApplication`) no `index.html`. Isso ajuda o Google e IAs a entenderem que se trata de uma aplicação de saúde/educação operando na web.

---

## 🔍 2. Análise de Conteúdo e Estrutura (Audit)

### 2.1 Semântica HTML (`App.tsx`, `Layout.tsx`)
- **Positivo**: Uso correto de `<main>`, `<aside>`, `<nav>` no Layout. Isso ajuda leitores de tela e bots a entenderem a hierarquia.
- **Atenção**: O uso de múltiplos `<h1>` (um no Sidebar, outro no conteúdo principal) pode diluir a relevância.
  - **Sugestão**: Manter o `<h1>` apenas no título principal da página ativa (ex: "Dashboard", "Ficha do Aluno") e usar uma `<div>` ou `<span>` estilizada para o nome do sistema no Sidebar.

### 2.2 Imagens e Acessibilidade (`Login.tsx`, `Layout.tsx`)
- **Problema**: Imagens de login e ícones possuem `alt` genéricos (ex: "Logo", "Background").
- **Sugestão**: Usar textos descritivos.
  - De: `alt="Logo"`
  - Para: `alt="Logotipo do Sistema Brotar - Gestão Multidisciplinar"`
  - De: `alt="Background"`
  - Para: `alt="Fundo abstrato com cores suaves representando acolhimento clínico"` (se decorativo, usar `alt=""`).

---

## 🚀 3. Recomendações de GEO (Generative Engine Optimization)

Para que o Sistema Brotar seja citado corretamente por IAs como referência em gestão multidisciplinar:

1.  **Página "Sobre" Rica em Dados**:
    *   A página `AboutSystem` deve conter definições claras.
    *   Exemplo: "O Sistema Brotar é uma plataforma SaaS focada em..." (IAs buscam definições concisas).

2.  **Glossário Técnico**:
    *   Se possível, incluir uma área de ajuda ou blog com termos como "PEI (Plano Educacional Individualizado)", "Prontuário Multidisciplinar". Isso atrai tráfego de perguntas do tipo "Como fazer um PEI?" e posiciona o sistema como autoridade.

3.  **Performance (Core Web Vitals)**:
    *   O Vite já oferece boa performance, mas imagens grandes no Login podem prejudicar o LCP (Largest Contentful Paint).
    *   **Ação**: Comprimir imagens de background para formato WebP.

---

## 📋 Próximos Passos Sugeridos

1.  **Validar Domínio**: Configurar o `sitemap.xml` com o domínio real de produção (atualmente usei `brotar.app` como placeholder).
2.  **Otimizar Imagens**: Converter assets estáticos para WebP.
3.  **Refinar Títulos**: Garantir que cada rota mude o `document.title` dinamicamente (já implementado no `App.tsx` via `useEffect`, o que é excelente).

---
*Relatório gerado por Agente SEO Specialist - 26/01/2026*
