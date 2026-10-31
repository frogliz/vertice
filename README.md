# Avunara

Finanças pessoais em português, com um início que reúne os saldos do mês, próximos vencimentos, categorias, pessoas e carteiras. Aplicação estática, responsiva e sem instalação para uso no navegador.

## Uma nova identidade

- **Início:** reúne o antigo espaço compartilhado e o resumo financeiro, sem somar o mesmo lançamento duas vezes.
- **Lançamentos:** receitas, despesas avulsas, contas mensais e compras parceladas no mesmo lugar. Filtros por tipo, situação, categoria, frequência e perfil; busca, paginação e exportação CSV.
- **Categorias:** cadastrar nome, cor e tipo; editar, arquivar e reativar. Categorias em uso preservam o histórico e não podem ser excluídas. Os nomes anteriores são recuperados dos dados existentes.
- **Relatórios:** visão anual e projeções baseadas nos registros.
- **Metas e reservas:** progresso de objetivos, caixinhas e movimentações de patrimônio. Aportes não viram despesas duplicadas.
- **Menu:** removidos Conselhos, Contas recorrentes e Dívidas e parcelas. As operações mensais e parceladas continuam em Lançamentos.
- **Plantões:** interface oculta para contas comuns e modo local. A conta autorizada usa a área do proprietário.
- **Novo painel:** saldo confirmado em destaque, evolução diária com registros reais, distribuição por categoria e próximos vencimentos. A interface se adapta a celular e desktop.
- **Ateliê visual:** estilos Fluido, Editorial e Precisão, modos claro/escuro/automático, cores prontas ou personalizadas, leitura confortável ou compacta e controle de movimento.
- **Preferências salvas:** escolhas independentes por conta e para o modo local. As preferências da conta fazem parte da sincronização e do backup; escolhas válidas da versão anterior são migradas. A opção de iniciar com valores ocultos também fica salva.

## Desenvolvimento e validação

Node.js 22 ou superior para testes e preparação:

```sh
node tests.cjs
node tests-theme.cjs
node tests-cloud.cjs
node tests-auth.cjs
node tests-security.cjs
node build-web.cjs
```

O conteúdo publicável fica em `dist/`. Os caminhos são relativos, inclusive em GitHub Pages com subdiretório `/vertice/`. A automação `.github/workflows/pages.yml` executa os testes e publica ao receber um push em `main`.

## Contas e segurança

A autenticação e o armazenamento online usam o Supabase configurado em `config.js`. O frontend contém apenas URL e chave publicável. Nunca adicionar `service_role`, chave secreta, senha do banco ou credencial pessoal ao código.

`database/SETUP.sql` contém a tabela isolada por `auth.uid()`, RLS e a função com controle de revisão. A aplicação preserva rascunhos por usuário e exige uma decisão explícita em conflitos de sincronização. Respostas antigas não substituem alterações recentes.

Há validação de backups e dos dados antes de salvar, limites de registros, bloqueio de chaves de poluição de protótipo, escape de texto e proteção contra fórmulas em CSV. A política CSP está no HTML. `_headers` fornece também cabeçalhos adicionais para hospedagens que suportam esse arquivo; GitHub Pages não permite configurá-los pelo arquivo.

Ocultar valores reduz a exposição visual da tela; não criptografa os dados locais. Encerrar a sessão não apaga automaticamente cópias offline do navegador. Em dispositivos compartilhados, confirmar sincronização ou exportar um backup antes de limpar os dados do site.

## Permissão exclusiva de plantões

A interface só habilita a função após `auth.getUser()` confirmar `app_metadata.vertice_owner === true`. Nome, e-mail digitado e `user_metadata` não concedem permissão.

**A proteção no banco precisa ser aplicada separadamente:** executar `database/SECURITY-HARDENING.sql` no projeto correto, depois do SETUP, e atribuir o metadado somente ao UUID verificado do dono. A alteração não foi aplicada nem verificada no banco de produção nesta entrega porque a conexão disponível não tem acesso ao projeto configurado. Até a atribuição, Plantões permanece oculto inclusive para o dono. Não promover o primeiro cadastro automaticamente.

O SQL complementar limita alterações em escalas, confirmações e feriados também por acesso direto à API. Preserva dados antigos e não concede acesso a nenhuma conta por conta própria. Depois de aplicar, executar `database/VERIFY.sql` e validar a proteção adicional em sessões de usuário comum e proprietário.

## Dados anteriores

Backups versão 1 continuam suportados. Categorias, perfis e confirmações ficam no mesmo backup. Renomear categoria atualiza seus registros associados. Arquivar retira a categoria das novas escolhas sem apagar registros. Copiar um mês mantém as responsabilidades das despesas divididas e cria confirmações independentes no destino.

O modo local é exclusivo deste navegador e não sincroniza. Dados locais só são enviados a uma conta mediante importação explícita. Nenhum serviço bancário é conectado; registrar um pagamento no painel não movimenta dinheiro de verdade.

## Dependências

O SDK Supabase 2.118.0 permanece fixado em `vendor/`, com licença e verificação existentes. A fonte Manrope é servida localmente em `assets/fonts/`, com licença OFL. Não foram adicionados scripts de CDN nem bibliotecas de interface.

## Compatibilidade da atualização

Avunara é o novo nome do Vértice. O repositório, o caminho publicado e os identificadores internos `vertice-*` e `vertice_states` são preservados para manter sessões, registros e backups compatíveis. Não é necessário criar outra conta.

As preferências são validadas antes de entrar no CSS ou no backup. A saída de uma conta remove seu contexto de aparência; entrar em outra conta recupera a escolha dessa outra pessoa. O funcionamento com múltiplas contas e conflitos de sincronização é coberto pelos testes. A configuração do banco de produção continua dependendo do acesso ao projeto correto.
