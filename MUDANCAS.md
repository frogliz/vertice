# O que mudou

## Versão de 03/11/2026 (segurança e parcelas)
- **Revisão de segurança completa**, com relatório. Nenhuma chave secreta exposta, nenhum ataque de XSS funcionou e cada conta só acessa os próprios dados.
- **Senha forte no cadastro**: letras e números, sem senhas comuns nem o próprio e-mail.
- **Espera progressiva** depois de 5 senhas erradas em 15 minutos.
- **Trocar a senha encerra as sessões** em outros aparelhos, e há o botão **Sair de todos os aparelhos** em Configurações.
- **Proteção contra o site ser embutido** escondido dentro de outro site (clickjacking).
- Mensagens claras quando o servidor recusa dados ou limita gravações.
- **Parcelas em quadradinhos**: cada parcela mostra número, mês, valor e situação (paga, atrasada, do mês ou a vencer). Um toque marca como paga.
- **Nova compra parcelada** com botões rápidos (2x a 24x) e prévia ao vivo de todas as parcelas antes de salvar.
- **Nova receita ou despesa** com atalhos prontos (Salário, Freelance, Aluguel, Mercado…) que já preenchem descrição, categoria e repetição, e prévia dos meses em que vai entrar ou sair.

## Versão de 03/11/2026 (plantões)
- **Plantões liberados só para a conta do Russo** (permissão marcada no banco; nenhuma outra conta vê a tela, nem a folha nos totais).
- **Folha de plantões**: você toca nos dias em que pegou plantão e o total entra de uma vez, como uma receita só, no dia do pagamento. Dá para escolher o dia e se é na folha do mesmo mês ou do mês seguinte.
- Valores: segunda a sexta R$ 50; sábado, domingo e feriado R$ 100 (feriado só muda o valor em dia de semana).
- A folha aparece em Lançamentos, em Próximos vencimentos no Início, no gráfico do saldo e na planilha do mês. Um toque em Receber marca a folha inteira como recebida.
- A tela mostra o total do mês, quantos plantões foram em dia de semana, fim de semana e feriado, e qual folha cai neste mês.

## Versão de 03/11/2026 (noite)
- **Cartão da meta neon**: anel com a porcentagem no centro, arco em degradê neon, um cometa de luz dando voltas e o brilho "respirando". Ao passar o mouse, a borda acende em neon girando, o cartão sobe, a foto aproxima e um segundo cometa gira ao contrário. Meta concluída fica neon verde.
- **Muito mais leve, até na versão completa**: o desfoque real ficou só onde faz diferença (barra do celular e janelas). Em aparelho fraco simulado, as telas passaram de 7 a 21 para perto de 60 quadros por segundo.
- **Ajuste automático**: se o aparelho engasga na primeira animação, os efeitos contínuos param naquela visita, sem mudar a escolha da pessoa.
- As animações pausam com a aba escondida, e as de entrada rodam só no que está na tela.
- **Celular**: auditoria em 8 larguras (de 320 px ao computador) sem nada vazando. Botões com tamanho de dedo, campos que não fazem o iPhone dar zoom, barra de baixo com nomes curtos em telas pequenas, celular deitado e entalhe do iPhone tratados.
- **Tablet**: barra lateral só com ícones, sobrando espaço para o conteúdo.

## Versão de 03/11/2026 (tarde)
- **Mais animações na versão completa**: os números contam até o valor, as barras crescem e ganham um brilho que passa, o fundo tem luzes que flutuam, os cartões entram em sequência, sobem e acendem onde o mouse passa, as faixas de aviso ganham reflexo, o gráfico se desenha sozinho, a pizza gira ao entrar e as barras do ano sobem. Uma barra colorida no topo mostra quando está salvando.
- No **modo leve** nada disso roda, e também não roda se a pessoa desligar o "Movimento suave" ou se o aparelho pedir menos movimento.
- **Muito mais fotos nas metas**: busca na Wikipédia, no Wikimedia Commons e no Openverse ao mesmo tempo, com até 24 fotos. Elas aparecem logo abaixo enquanto você digita, com um campo para procurar outra palavra.
- **Se a pessoa não escolher, fica a primeira foto relacionada**, mesmo se ela salvar antes de a busca terminar.

## Versão de 03/11/2026
- **Backup automático** dos dados de todos os usuários, duas vezes por dia, com 30 dias de histórico e restauração com um comando. Veja `database/BACKUP.md`.
- **Modo leve** para computador simples e celular: o mesmo visual, sem os efeitos que pesam. Dá para trocar a qualquer momento no Ateliê visual ou em Configurações.
- **Escolha de visual no primeiro acesso**: Vidro completo ou Leve e rápido, mais claro ou escuro. Aparece uma vez por pessoa. Aparelhos mais simples já vêm com o modo leve indicado.
- **Foto de perfil**: puxa sozinha a foto do e-mail (Gravatar), ou a pessoa envia a própria foto. O nome também pode ser trocado e vale na saudação do Início.
- **Metas em cartão com foto**: escreva "PS5" e o Vértice busca fotos na Wikipédia para você escolher, ou envie uma sua. O cartão mostra quanto falta, o prazo, quanto guardar por mês e, pelo seu ritmo, quando você chega lá.
- **Guardar e Retirar** direto no cartão da meta, com histórico.
- **Atalhos no computador**: N cria um lançamento, as setas trocam o mês e / busca nos lançamentos.

## Versão de 02/11/2026

## Pedidos do cliente
- **Excluir lançamento em qualquer lugar.** Toda linha em Lançamentos e em Próximos vencimentos tem lixeira, inclusive as contas de perfis e as divididas (antes, só tinham Pagar e Editar). Toda janela de edição também tem Excluir.
- **Excluir perfil com lançamentos.** Em vez de só avisar que não pode, o Vértice mostra a lista do que está ligado ao perfil, para apagar um por um ou o perfil junto com tudo.
- **Contas mensais de perfis** agora podem ser removidas só de um mês, a partir de um mês ou de todos.

## Erros corrigidos
- Desfazer um aporte em Reservas travava a tela.
- Plantões escondidos somavam na renda de quem não era o dono.
- "Ocultar valores" não escondia os valores das listas.
- O mês aparecia como "Novembro De 2026".
- A tela de login mostrava "Voltar para entrar" no próprio login.
- Valores digitados com vírgula ou ponto de milhar (1.500,00) podiam falhar.
- Excluir uma parcela pela lista levava para outra tela em vez de excluir.

## Novo visual e novidades
- Vidro líquido em preto e branco, com três estilos (Prisma, Névoa, Grafite), claro, escuro ou automático.
- Nome de volta para **Vértice**, igual ao repositório e ao endereço.
- Celular com barra de navegação embaixo e botão de novo lançamento no centro.
- Gráfico do saldo com cursor que mostra o valor de cada dia, e visão de 6 meses.
- Próximos vencimentos com aviso de atrasado, vence hoje e vence amanhã.
- Página Ajuda com as dúvidas mais comuns.
- Pode ser instalado na tela inicial do celular, com ícone próprio e imagem para compartilhar o link.
- Primeiro acesso com um passo a passo de três etapas.
