# Colocar o Vértice no seu GitHub e deixar online

Você vai usar dois serviços: **GitHub Pages** serve o site; **Supabase** cuida do cadastro, login e dados de cada pessoa. Seus amigos acessam o mesmo endereço, mas cada conta enxerga os próprios registros.

## 1. Conferir o Supabase configurado

O site aponta para o projeto **`kdngcqztmimqzwckwzje`**, com a URL e a chave publicável informadas pelo proprietário. O serviço de autenticação desse projeto respondeu normalmente, sem o bloqueio de cota do projeto anterior.

No [SQL Editor do projeto novo](https://supabase.com/dashboard/project/kdngcqztmimqzwckwzje/sql/new), execute todo o conteúdo de `database/SETUP.sql`. Esse script cria a tabela `vertice_states`, as políticas por proprietário e a função de salvamento. Confira o projeto selecionado no topo antes de executar. O cadastro pode funcionar sem essa tabela, mas o painel não conseguirá carregar nem salvar os registros até o banco estar pronto.

Para confirmar a criação, execute `select to_regclass('public.vertice_states') as tabela;`. O resultado deve ser `vertice_states` ou `public.vertice_states`, não `NULL`. Se a tabela existir e a API ainda não encontrá-la, execute `notify pgrst, 'reload schema';` e aguarde a atualização do cache.

## 2. Usar a pasta preparada para o GitHub

Use **`entrega/vertice-github`** dentro da pasta do projeto, ou extraia `entrega/vertice-github.zip`.

Essa pasta já contém o site, configuração pública, banco, testes, guia e `.github/workflows/pages.yml`. Ela não contém o histórico Git do Sites, sua pasta `.openai`, imagens de referência ou arquivos de backup financeiro.

Se editar o projeto principal e quiser gerar uma entrega nova, execute:

```sh
node export-github.cjs
```

## 3. Criar e enviar o repositório

1. Entre em [github.com](https://github.com) e clique no **+ → New repository**.
2. Nome sugerido: **vertice**. Escolha **Public** se quiser usar GitHub Pages com uma conta gratuita. O código será público; os dados financeiros continuam protegidos no Supabase.
3. Crie o repositório vazio.
4. Clique em **uploading an existing file** ou **Add file → Upload files**.
5. Arraste **o conteúdo** de `entrega/vertice-github`, incluindo a pasta `.github`. O `index.html` precisa ficar na raiz do repositório, e não dentro de uma pasta extra.
6. Clique em **Commit changes**, usando o branch **main**.

Alternativa por terminal, usando somente a pasta limpa da entrega:

```powershell
cd C:\Users\guini\Videos\CODEX\entrega\vertice-github
git init -b main
git add .
git commit -m "Adicionar sistema Vertice"
git remote add origin https://github.com/SEU-USUARIO/vertice.git
git push -u origin main
```

Troque `SEU-USUARIO` pelo seu usuário. O GitHub poderá solicitar autenticação. Não use a pasta `.git` do projeto principal para seguir este exemplo.

## 4. Ativar o site

1. Abra **Settings → Pages** no seu repositório.
2. Em **Build and deployment → Source**, selecione **GitHub Actions**.
3. Abra **Actions → Publicar Vértice**. Se a primeira execução falhou porque Pages ainda não estava ativado, use **Re-run all jobs**. Você também pode usar **Run workflow** depois que a automação estiver disponível.
4. Aguarde a execução ficar verde. Os testes rodam antes da publicação.
5. O endereço normalmente será **`https://SEU-USUARIO.github.io/vertice/`**. Use o endereço exato mostrado em **Settings → Pages**.

A automação publica somente `dist/`, e não toda a documentação e o SQL. Cada novo envio para `main` atualiza o site.

Referência: [documentação oficial de workflows do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## 5. Configurar os links de confirmação e recuperação

Depois de saber o endereço publicado:

1. No Supabase, abra **Authentication → URL Configuration**.
2. Em **Site URL**, coloque o endereço completo do seu site, incluindo `/vertice/` se esse for o nome do repositório.
3. Em **Redirect URLs**, adicione esse mesmo endereço. Se também usar outro domínio ou o endereço do Sites, adicione cada endereço utilizado.
4. Em **Authentication → Sign In / Providers → Email**, confira que o acesso por e-mail está habilitado. O cadastro usa nome, e-mail e senha; o nome é apenas de exibição, não controla permissões.

O código usa o próprio endereço da página como retorno, sem rotas especiais. A recuperação de senha mostra um formulário para escolher a nova senha depois que a pessoa abre o link.

Referência: [URLs de redirecionamento do Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

## 6. Permitir e-mails para seus amigos

Se o projeto ainda usa o envio de e-mails padrão do Supabase, ele é restrito a endereços autorizados da equipe e não serve como serviço de e-mail para usuários externos. Para enviar confirmações e recuperação de senha aos amigos, configure um provedor **SMTP** em **Authentication → Email / SMTP Settings**.

Use um remetente validado pelo provedor e os dados de host, porta, usuário e senha fornecidos por ele. Esses dados ficam no painel do Supabase; não vão para `config.js` ou GitHub. Os detalhes dos menus podem variar conforme a versão do painel.

Este Supabase também atende outros aplicativos. Não desative a confirmação de e-mail nem altere configurações globais sem considerar os outros usos do projeto.

Referência: [envio com SMTP próprio no Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

## 7. Conferir antes de compartilhar

1. Abra o endereço do GitHub Pages e crie sua conta com um e-mail seu.
2. Confirme o e-mail, quando solicitado, e entre.
3. Cadastre uma receita pequena de teste e aguarde **Salvo na sua conta** no rodapé.
4. Entre com a mesma conta em outro navegador ou celular: o registro deve aparecer.
5. Crie uma segunda conta sua para teste: ela deve começar vazia e não enxergar os dados da primeira.
6. Teste **Esqueci minha senha**.
7. Nas configurações, use **Importar dados locais** ou restaure seu backup se já usava o Vértice antes das contas online.
8. Compartilhe o endereço publicado. Seus amigos não precisam de conta no GitHub nem acesso ao painel do Supabase para usar o Vértice.

## Se algo não funcionar

- **Cadastro/login diz que o serviço está bloqueado:** resolva a cota do Supabase.
- **E-mail não chega ou endereço não autorizado:** confira SMTP, remetente, spam e limites do provedor.
- **Link abre no lugar errado:** confira Site URL e Redirect URLs com o caminho completo do repositório.
- **Página 404:** confira Source = GitHub Actions, branch `main` e execução do workflow.
- **Site abre, mas o banco retorna permissão negada ou tabela inexistente:** confira `config.js` e se `database/SETUP.sql` foi executado no projeto apontado por ele.
- **Aparecem duas versões da conta:** escolha a versão online ou suas alterações locais. Exporte um backup antes de substituir algo que queira preservar.
- **Dados do modo local não aparecem na conta:** a importação é explícita para impedir que outra pessoa usando o computador receba seus registros por acidente.
