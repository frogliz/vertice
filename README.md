# Vértice

Finanças pessoais em português: receitas, despesas, recorrências por mês, plantões, parcelas, orçamento, metas e reserva. Interface responsiva com temas e cores personalizáveis.

**Contas online:** cadastro por nome, e-mail e senha, login, recuperação de senha, salvamento automático por usuário e controle de conflitos entre dispositivos. Autenticação e banco: Supabase. Hospedagem: GitHub Pages ou qualquer serviço estático HTTPS.

Se um link de e-mail estiver inválido ou expirado, use **Reenviar confirmação**. Quando a autenticação funciona mas o banco falha, o site mantém a sessão e oferece **Tentar abrir meus dados**, sem pedir outro cadastro. Falhas de cache da API, permissões e links de confirmação têm mensagens diferentes. Não compartilhe links completos de confirmação ou recuperação, pois eles podem conter credenciais temporárias.

## Publicar

Siga [PUBLICAR-GITHUB.md](PUBLICAR-GITHUB.md). A automação `.github/workflows/pages.yml` testa e publica o site ao enviar alterações para `main`.

O `config.js` desta entrega aponta para o projeto Supabase escolhido pelo proprietário. Ele contém somente URL e chave **publicável**, que podem aparecer no frontend. Nunca coloque senha do banco, `service_role`, `sb_secret_...` ou tokens pessoais no código.

Para usar um projeto próprio, copie `config.example.js` para `config.js`, preencha os dois campos públicos e execute `database/SETUP.sql` no SQL Editor desse projeto.

## Desenvolvimento

Requer Node.js 22 ou superior apenas para testes e preparação dos arquivos:

```sh
node tests.cjs
node tests-theme.cjs
node tests-cloud.cjs
node tests-auth.cjs
node build-web.cjs
```

O site final fica em `dist/`. Os recursos usam caminhos relativos e funcionam em `https://usuario.github.io/vertice/`. Para login e links de confirmação, acesse por HTTP/HTTPS; abrir `index.html` diretamente é destinado ao modo local.

## Como os dados ficam separados

- Autenticação gerenciada pelo Supabase, sem armazenamento de senha no banco da aplicação.
- Uma linha JSON por conta em `public.vertice_states`, preservando os registros e cálculos existentes.
- RLS limita leitura, inserção e atualização ao `auth.uid()` correspondente. Não há permissão de exclusão direta para o cliente.
- A gravação usa uma revisão esperada e o identificador do proprietário. Uma versão desatualizada ou troca de conta é recusada.
- Rascunhos offline ficam separados por usuário neste navegador. Somente a própria sessão carrega o cache correspondente.
- Conflitos exigem escolher a versão online ou a local; não há mesclagem automática de registros financeiros.
- Dados antigos do modo local só vão para a conta após a ação explícita **Importar dados locais**, nas configurações.
- Sair remove a sessão deste dispositivo. Outros dispositivos continuam conectados. Rascunhos offline permanecem no navegador por conta e não aparecem no modo local.

Computadores compartilhados podem manter cópias locais no armazenamento do navegador. Use **Sair da conta** ao terminar; para remover também cópias locais, limpe os dados do site pelo navegador depois de confirmar a sincronização ou exportar um backup.

## Dependências

O SDK `@supabase/supabase-js` 2.118.0 está em `vendor/`, com versão fixa, licença e SHA-256 documentados. Não é necessário instalar pacotes para servir o site.

Os detalhes das funções financeiras estão em [LEIA-ME.md](LEIA-ME.md). O teste transacional do banco está em `database/VERIFY.sql`: ele verifica isolamento, acesso anônimo, revisão e troca de proprietário e reverte todos os dados sintéticos.
