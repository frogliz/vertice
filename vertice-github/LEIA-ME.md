# Vértice — Finanças pessoais

## Contas e salvamento online

Agora existe cadastro, login, recuperação de senha e sincronização por usuário com Supabase. O modo local permanece como opção explícita. Quando estiver conectado, aguarde **Salvo na sua conta** antes de contar com a disponibilidade em outro dispositivo. A cópia offline é separada por usuário; alterações concorrentes geram um aviso para escolher a versão, sem sobrescrita silenciosa.

Para levar registros anteriores à conta, entre e use **Configurações → Importar dados locais**, ou restaure um backup. Os detalhes de hospedagem e ativação estão em [PUBLICAR-GITHUB.md](PUBLICAR-GITHUB.md). As seções antigas sobre armazenamento apenas local descrevem o modo local, não o modo de conta online.

## Ajustes independentes por mês

O **Resumo do mês** distingue dinheiro disponível agora, entradas previstas, despesas previstas e fechamento esperado. Os valores incluem o saldo inicial informado e, quando indicado, aportes e resgates. O mês selecionado fica visível em todas as telas e é lembrado durante a sessão.

- Clique no nome do mês para escolher mês e ano diretamente, inclusive digitando o ano. Há um botão para voltar ao mês atual.
- Em **Ajustar mês**, informe saldo inicial disponível fora das caixinhas, limite de despesas e um lembrete. Esses valores pertencem somente ao período escolhido. Saldo inicial vazio não fixa o saldo na simulação; zero preenchido é um saldo explícito e reinicia o transporte da simulação nesse mês.
- Ao editar uma conta recorrente, o padrão é **somente este mês**. A opção **este mês e os próximos** preserva o histórico anterior e vale até a próxima alteração futura já programada. Ajustes pontuais futuros têm prioridade sobre a série.
- Ao remover uma conta recorrente, escolha ocultar só o mês, encerrar a partir dele ou excluir a série inteira. Contas ocultas podem ser restauradas em **Ajustar mês**.
- **Copiar de outro mês** traz apenas avulsos e/ou a escala, conforme sua escolha. Confirmações de pagamento e feriados não são copiados. Recorrentes e parcelas não são duplicados. Vencimentos de avulsos são ajustados ao último dia quando necessário; dias inexistentes de plantão são ignorados.
- Em **Visão anual**, os 12 cartões abrem os respectivos meses. Cada cartão usa o saldo próprio do mês, sem transporte automático. A tabela de projeção abaixo simula o transporte de saldo por seis meses, respeitando os saldos iniciais explícitos.

O limite global de backups antigos é mantido como padrão até definir um limite específico em cada mês. Os saldos de reserva e investimentos representam o patrimônio atual, independentemente do filtro mensal; os aportes e resgates entram no caixa do mês em que foram registrados.

Arquivos adicionais: `monthly.js` organiza as ações e telas; `monthly.css` ajusta a interface; `engine.js` calcula ajustes pontuais, alterações futuras e projeções.

## Versão web

O sistema agora usa toda a página, com navegação lateral no computador, adaptação para tablet e menu retrátil no celular. Preto e branco são as cores padrão. Pelo botão de paleta no cabeçalho, escolha tema escuro, claro ou automático, uma das cores de destaque ou uma cor personalizada. As preferências ficam salvas neste navegador, separadamente dos registros financeiros. As transições e animações respeitam a configuração de movimento reduzido do dispositivo.

Os dados financeiros continuam locais ao navegador, inclusive na versão publicada. Para transferir o histórico do arquivo local para o endereço web, exporte o backup JSON nas configurações da versão local e restaure no site. Não há sincronização automática entre dispositivos. O acesso inicial do site hospedado é privado ao proprietário.

Arquivos web adicionais: `web.css`, `theme.js` e `favicon.svg`. `build-web.cjs` copia os arquivos necessários para `dist/`, diretório utilizado na hospedagem estática. As imagens de referência e os testes não são publicados como recursos do site.

As instruções abaixo descrevem as funções originais; a versão web substitui o tamanho fixo de 800 × 600 por um layout responsivo.

Abra `index.html` no Edge, Chrome ou Firefox. Não exige instalação, internet, conta ou servidor. O painel foi desenhado em 800 × 600 pixels, com rolagem nas áreas de conteúdo e adaptação para telas menores. As três imagens originais foram preservadas.

## Como começar

1. Clique em **+ Lançamento** e cadastre sua renda. Marque **Repetir todo mês** para salário ou receitas recorrentes.
2. Em **Contas fixas**, cadastre aluguel, internet e outras despesas. A recorrência começa na data informada; o último mês é opcional. Datas como dia 31 são ajustadas ao último dia de meses menores.
3. Em **Plantões**, selecione as datas no calendário: segunda a sexta R$ 50; sábado, domingo ou feriado R$ 100. Ative **Marcar/desmarcar feriados**, marque as datas locais desejadas e desative a opção para continuar selecionando plantões. Feriados não são preenchidos automaticamente.
4. Confirme os recebimentos e pagamentos pelo botão circular nos lançamentos e por **Receber** nos plantões. Uma confirmação de conta fixa vale somente para aquele mês.
5. Em **Planejamento**, confira o orçamento e os próximos três meses. Mude o mês no cabeçalho para cadastrar lançamentos futuros e selecionar a próxima escala.
6. Em **Metas**, acompanhe seus valores guardados. O acompanhamento é manual e não movimenta automaticamente o saldo.
7. Em **Configurações**, defina seu limite mensal e exporte backups JSON. O CSV exporta o mês selecionado e pode ser aberto em uma planilha.

## O que os números representam

- **Saldo previsto:** receitas cadastradas e plantões selecionados menos despesas cadastradas no mês.
- **Disponível recebido:** apenas receitas e plantões confirmados como recebidos, menos despesas confirmadas como pagas. Não inclui saldo bancário anterior.
- **Projeção:** inclui recorrências e lançamentos já cadastrados. Não estima automaticamente gastos variáveis nem repete escalas não selecionadas. O acumulado parte do saldo previsto do mês selecionado.
- **Valores monetários:** calculados em centavos inteiros, exibidos em reais.

## Armazenamento e backup

Os registros ficam no armazenamento local do navegador. Use sempre o mesmo navegador e o mesmo arquivo. Limpar os dados do navegador, usar janela privada, mudar de navegador ou mover o projeto pode impedir o acesso ao histórico. Exporte o backup regularmente. O arquivo JSON contém seus dados e pode ser restaurado em outro navegador pelo painel. A importação valida o formato e pede confirmação antes de substituir os registros.

O sistema inicia vazio. Há uma demonstração opcional em Configurações; ela substitui o conjunto de dados após confirmação. Os registros não são enviados a serviços externos.

## Arquivos

- `growth.js` e `growth.css`: dívidas, parcelas, conselhos e organização da reserva e dos investimentos.

- `index.html`: entrada do sistema.
- `style.css`: visual baseado nas três referências.
- `engine.js`: cálculo de recorrências, plantões, saldos e validação dos backups.
- `app.js`: interface, ações, armazenamento e exportação.
- `tests.cjs`: verificação das regras financeiras e interações usando Node.js, quando disponível.

Para abrir em uma janela separada de 800 × 600 no Windows, use `ABRIR.ps1` pelo PowerShell. Também é possível simplesmente dar dois cliques em `index.html`.

## Dívidas e parcelas

Em **Dívidas e parcelas**, informe o nome, o credor, a contratação, o primeiro vencimento, o total parcelado já com os encargos contratados e o número de parcelas. Informe também o valor original à vista se quiser comparar os dois totais. Exemplo: para 12 parcelas de R$ 100, preencha total parcelado de R$ 1.200 e quantidade 12. O total é dividido exatamente em centavos; centavos restantes são distribuídos nas primeiras parcelas.

O vencimento segue o dia da primeira parcela, ajustado para o último dia nos meses menores. Você pode informar quantas parcelas iniciais já pagou ao cadastrar. Depois, use **Ver parcelas** para confirmar ou desmarcar cada pagamento. As parcelas entram automaticamente nos lançamentos, totais, exportação CSV e previsão dos respectivos meses; não as cadastre de novo como despesas comuns. Dívidas vencidas usam a data atual para os avisos.

Editar nome ou credor preserva os pagamentos. Alterar total, quantidade ou primeiro vencimento exige confirmar o recálculo da série e limpar os pagamentos anteriores. Juros de atraso e multas não são estimados automaticamente.

## Conselhos

A área **Conselhos** apresenta avisos baseados nos registros: parcelas vencidas, despesas acima da renda, orçamento ultrapassado, comprometimento da renda e aportes que não cabem na previsão. O alerta de 30% de renda em parcelas é uma heurística do painel, não um limite universal. A maior categoria é apresentada como ponto de revisão, sem pressupor que gastos essenciais sejam supérfluos. O painel principal também mostra um desses recados.

## Reserva e investimentos

Crie caixinhas com finalidade **Reserva de emergência** ou **Outro investimento**, nome, local/produto, saldo inicial, risco e liquidez informados por você. Use **Guardar**, **Resgatar** e **Atualizar saldo** para registrar movimentações e conciliar o saldo real, inclusive ganhos ou perdas. Não há conexão bancária, cotação ou compra de ativos.

Em **Ajustar plano**, defina o custo mensal essencial, quantos meses deseja cobrir e o aporte mensal desejado. O painel acompanha a meta e apresenta como espaço para novo aporte o menor valor entre o plano mensal, a sobra prevista após aportes e o caixa já recebido livre. Quando não há dados suficientes, o valor é zero. Um aporte superior ao caixa registrado exige conferir se existe saldo anterior fora do painel.

Aportes reduzem o caixa livre e aumentam o saldo da caixinha; resgates fazem o inverso. Não contam como receita ou despesa de consumo. A projeção acumulada considera esses movimentos registrados. O CSV continua destinado aos lançamentos e plantões; o backup JSON inclui caixinhas, movimentações, dívidas e plano da reserva.

A orientação de baixo risco e liquidez diária para emergências é baseada no [Portal do Investidor da CVM](https://www.gov.br/investidor/pt-br/investir/antes-de-investir/defina-seus-objetivos/emergencias-e-aposentadoria). As condições reais de cada produto devem ser conferidas na instituição. Os backups da primeira versão continuam compatíveis, com as novas áreas inicialmente vazias.
