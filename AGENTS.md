# Avunara: preservar os dados em todas as versões

Esta é uma exigência permanente do proprietário: publicar atualizações mantendo os registros das pessoas que já usam o sistema.

- Preserve o projeto Supabase configurado, a tabela `vertice_states`, a função `vertice_save_state`, a chave de sessão `vertice-auth-session-v1` e a chave local `vertice-financas-v1`. Uma mudança de nome ou visual não muda a identidade do armazenamento.
- Publicar o site atualiza os arquivos estáticos. Não execute SQL, apague registros, carregue demonstrações em contas reais nem recrie o banco como etapa de publicação.
- Preserve os campos, IDs, pagamentos, perfis, categorias, revisões e valores de backups anteriores. Evoluções de formato devem ser aditivas e ter testes com dados anteriores preenchidos.
- Nunca substitua dados online existentes por um estado vazio em falhas de leitura, validação, autenticação ou rede. Preserve rascunhos e a resolução explícita de conflitos.
- Se uma futura alteração exigir migração do banco, prepare uma migração que preserve dados, um backup verificável e uma forma de recuperação antes de aplicá-la. Não execute migrações destrutivas como parte de uma atualização visual.
- Antes de publicar, execute `node tests.cjs`, `node tests-theme.cjs`, `node tests-cloud.cjs`, `node tests-auth.cjs`, `node tests-security.cjs` e `node build-web.cjs`. Confirme a compatibilidade dos dados anteriores e o resultado da publicação.
