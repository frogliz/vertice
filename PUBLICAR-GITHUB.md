# Publicar o Avunara

O Avunara é a nova versão do Vértice. O repositório existente é `frogliz/vertice`; o caminho `/vertice/` continua válido. Renomear o aplicativo não exige criar outro repositório nem outra conta de usuário.

## Atualizar o repositório existente

1. Execute `node export-github.cjs` para preparar `entrega/avunara-github`.
2. Abra [o repositório](https://github.com/frogliz/vertice) e use **Add file → Upload files**.
3. Envie o conteúdo da pasta preparada, com `index.html` na raiz. Inclua `assets`, `vendor`, `database` e `.github`. Não envie a pasta de entrega como um diretório extra.
4. Confira os arquivos e conclua o commit em `main`.
5. Acompanhe a execução em **Actions**. O workflow **Publicar Avunara** roda os testes, prepara `dist/` e publica pelo GitHub Pages.

Também é possível copiar os arquivos para um clone autenticado, conferir `git diff`, criar um commit e executar `git push`. A entrega exclui histórico Git, identidade do Sites, imagens de referência e backups financeiros.

O site existente é [frogliz.github.io/vertice](https://frogliz.github.io/vertice/). Use o endereço mostrado em **Settings → Pages** se a configuração de hospedagem mudar. Para projetos novos, escolha GitHub Actions como fonte de publicação.

## Dados, contas e preferências

`config.js` contém a URL e a chave publicável do Supabase. Nunca adicione chave secreta, `service_role`, senha de banco ou credencial pessoal. Os nomes internos `vertice_states` e `vertice-*` foram mantidos para compatibilidade.

O projeto configurado é `kdngcqztmimqzwckwzje`. O banco precisa ter `database/SETUP.sql` aplicado. A publicação do site não executa SQL. Antes de qualquer alteração no banco, confira o projeto e leia o README.

A proteção adicional da área do proprietário está em `database/SECURITY-HARDENING.sql`, seguida de `database/VERIFY.sql`. Ela não foi aplicada nem verificada em produção nesta entrega por falta de acesso ao projeto configurado. O metadado de proprietário deve ser atribuído apenas ao UUID verificado do dono.

No painel do Supabase, configure Site URL e Redirect URLs com o endereço completo, incluindo `/vertice/`. Para confirmação e recuperação por e-mail de usuários externos, confira o provedor SMTP. Não altere configurações globais de autenticação sem considerar os outros aplicativos do projeto.

O Ateliê salva estilo, modo, cor, densidade, movimento e privacidade inicial. Na conta, essas escolhas fazem parte dos registros sincronizados e do backup. No modo local, ficam no navegador. A atualização mantém backups anteriores compatíveis.

## Conferir a publicação

- Abra o site e confirme a marca Avunara.
- Mude o estilo no Ateliê, recarregue e confira a escolha.
- Entre com sua conta e aguarde o status de salvamento. Confira outro dispositivo quando a sincronização estiver disponível.
- Uma segunda conta deve ter seus próprios registros e preferências.

Referências: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [URLs de retorno do Supabase](https://supabase.com/docs/guides/auth/redirect-urls) e [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
