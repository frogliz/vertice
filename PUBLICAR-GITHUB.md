# Colocar o Vértice no ar

## 1. Subir os arquivos

O repositório é `frogliz/vertice`. O endereço continua https://frogliz.github.io/vertice/.

**Importante:** esta versão apaga os arquivos antigos de estilo e scripts (`style.css`, `premium.css`, `avunara.js` e outros). Por isso, suba os arquivos substituindo tudo:

1. No computador, clone o repositório ou baixe-o como zip.
2. Apague todos os arquivos dele, **menos a pasta `.git`**.
3. Copie para dentro todo o conteúdo desta entrega, inclusive as pastas ocultas `.github` e o arquivo `.gitignore`.
4. Faça o commit e o push para `main`.

Pelo site do GitHub também dá: apague os arquivos antigos pelo próprio site e depois use **Add file > Upload files** com o conteúdo desta pasta.

Em **Actions**, o fluxo **Publicar Vértice** roda os testes e publica. Em **Settings > Pages**, a fonte precisa estar como **GitHub Actions**.

## 2. Conferir o Supabase (uma vez)

Nada no banco precisa mudar: a tabela e a função de salvar continuam as mesmas, e os dados de todos os usuários são lidos do jeito que estão.

No painel do projeto `kdngcqztmimqzwckwzje`:

- **Authentication > URL Configuration**: Site URL `https://frogliz.github.io/vertice/` e o mesmo endereço em Redirect URLs. Sem isso, os links de confirmação e de recuperação de senha podem abrir no lugar errado.
- **Authentication > Providers > Email**: ligue a proteção contra senhas vazadas.
- **Authentication > SMTP**: para enviar e-mails para muita gente, configure um SMTP próprio. O envio padrão do Supabase tem limite baixo por hora.
- **Plantões**: para liberar só para você, abra `database/DONO-PLANTOES.sql`, troque o e-mail pelo seu e rode no SQL Editor. Depois saia e entre de novo.

O complemento `database/SECURITY-HARDENING.sql` é opcional e não foi aplicado.

## 3. Testar depois de publicar

- Abra o site em uma aba anônima: deve aparecer a tela de entrada do Vértice.
- Entre com uma conta que já tinha dados: os lançamentos e perfis devem estar lá.
- Em Lançamentos, exclua um lançamento de teste pela lixeira.
- Mude o estilo no Ateliê, recarregue e veja se continua.
- No celular, adicione à tela inicial e abra pelo ícone.

Se o navegador mostrar o visual antigo, recarregue forçando (Ctrl + Shift + R) ou espere alguns minutos: o GitHub Pages guarda arquivos em cache.
