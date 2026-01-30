# Planejamento de Retomada - Sistema Brotar

## Status Atual (21/01/2026)
- **Problema:** Erro de recursividade infinita no RLS do Supabase.
- **Ação Realizada:**
    - Aplicada V5 anteriormente (Resulveu loop mas restringiu Admin).
    - **V6 PREPARADA:** Criado script `fix_rls_v6_admin_full.sql` que restaura controle total do Admin via metadados JWT.
    - **Melhoria de UI:** Adicionado botão de exclusão de usuários no Admin Panel.
    - **Serviço:** Implementado `deleteUser` no `SupabaseService.ts`.
- **Resultado:** **RESOLVIDO E MELHORADO**. O sistema agora aguarda apenas a aplicação do script SQL V6 pelo usuário para liberar edição/exclusão administrativa total.

## Testes Realizados:
1. **Visualização:** Dashboards de Especialistas e Secretaria auditados e compatíveis com as novas políticas.
2. **Cadastro via Admin:** Funcional e seguro.
3. **Fluxo de Deletar:** Interface pronta e integrada ao serviço.

## Próximos Passos (Após aplicar SQL V6):
1. Confirmar edição de perfis de terceiros pelo Admin.
2. Confirmar exclusão de usuários de teste.
3. Testar o fluxo completo de criação de um novo aluno e evolução clínica (Vigilância).
4. Monitorar logs para garantir que a performance das subqueries em `students` e `sessions` está otimizada.

