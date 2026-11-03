# Vértice

Finanças pessoais em português: receitas, contas do mês, parcelas, metas, reservas e as despesas da casa divididas entre pessoas. Site estático (HTML, CSS e JavaScript puro), com conta online pelo Supabase ou uso sem conta, só no navegador.

Publicado em https://frogliz.github.io/vertice/

## Visual

Vidro líquido em preto e branco, com três acabamentos escolhidos no Ateliê visual:

- **Prisma**: borda iridescente e luz colorida atrás do vidro.
- **Névoa**: vidro fosco, com a cor de destaque no brilho.
- **Grafite**: só preto e branco.

Cada um funciona no claro, no escuro e no automático (segue o aparelho), em duas versões de desempenho: **Vidro completo** e **Leve e rápido** (sem desfoque real nem efeitos animados, para computador simples e celular). A fonte é a Mona Sans (licença OFL), servida localmente pelo arquivo `mona-sans.woff2` (licença em `MonaSans-OFL.txt`). Tudo fica em um único `vertice.css`.

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `engine.js`, `shared-engine.js` | Cálculos: meses, recorrências, parcelas, divisão entre perfis, validação. Sem interface. |
| `catalog.js`, `security.js` | Categorias e validação de segurança dos dados e backups. |
| `cloud-store.js`, `auth.js`, `auth-errors.js` | Conta, login e sincronização com controle de versão. |
| `appearance-model.js`, `theme.js`, `icons.js` | Aparência (estilo, tema, cor) e ícones. |
| `ui.js` | Funções de interface usadas por todas as telas. |
| `home.js` | Início, gráfico, Ateliê e Ajuda. |
| `goals.js` | Metas: cartões com foto (busca na Wikipédia ou envio), prazo, ritmo, guardar e retirar. |
| `profile.js` | Perfil: nome e foto (Gravatar do e-mail ou foto enviada). |
| `experience.js` | Lançamentos, Categorias e Configurações. |
| `shared.js` | Pessoas e carteiras, contas divididas e exclusão de perfis. |
| `monthly.js` | Relatórios, escolha de mês, ajustes de contas mensais e cópia entre meses. |
| `growth.js` | Parcelamentos e Reservas. |
| `app.js` | Estado, navegação, diálogos, lançamentos, metas e plantões. |

## Testes e publicação

Node.js 22 ou superior:

```sh
node tests.cjs && node tests-theme.cjs && node tests-cloud.cjs && node tests-auth.cjs && node tests-security.cjs
node build-web.cjs     # gera dist/
node export-github.cjs # gera entrega/vertice-github para subir no GitHub
```

O GitHub Actions (`.github/workflows/pages.yml`) roda os testes e publica a cada push em `main`.

## Dados e compatibilidade

- Os dados de cada conta ficam na tabela `vertice_states` (uma linha por usuário, protegida por RLS). No modo sem conta, em `localStorage` (`vertice-financas-v1`).
- O formato dos dados não mudou de versão (`version: 1`). Backups antigos, inclusive da época do Avunara, continuam válidos.
- Os identificadores de aparência (`fluid`, `editorial`, `precision`, `mint`, `blue`…) são os mesmos de antes; só os nomes e o visual mudaram. Preferências salvas continuam valendo.
- Novidade no formato, opcional e compatível: lançamentos de perfil podem ter `skip: ["AAAA-MM"]` para ficarem ocultos em meses específicos.

## Backup

O banco copia os dados de todos os usuários duas vezes por dia (6h e 18h de Brasília), com 30 dias de histórico. Como ver, restaurar e guardar uma cópia fora do Supabase: `database/BACKUP.md`.

## Segurança

`config.js` tem apenas a URL e a chave **publicável** do Supabase. Nunca coloque `service_role`, senha do banco ou chave secreta no código. A política de segurança de conteúdo (CSP) está no `index.html` e bloqueia scripts, fontes e conexões de fora, exceto o Supabase do projeto.

Plantões aparecem só para a conta com `app_metadata.vertice_owner = true` (já marcada na conta do Russo; o modelo está em `database/DONO-PLANTOES.sql`). Para quem não é o dono, plantões também não entram nos totais. Com `shiftPay = { day, offset }`, os plantões de um mês entram juntos no dia da folha (`offset` 1 = mês seguinte, 0 = mesmo mês).
