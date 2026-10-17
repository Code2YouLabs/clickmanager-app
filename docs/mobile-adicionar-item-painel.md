# Adicionar item: painel mobile — Fase 1

O `ComercialEditorComponent` mantém o `GraficaProdutoWizardDialogComponent`
e o `GraficaServicoWizardDialogComponent` existentes. Até 760px, os abre por
`openMobileSidePanel`, a mesma infraestrutura de Filtros e Novo cliente,
com `data.mobilePanel: true`. Desktop mantém a configuração anterior do MatDialog.
A branch parte da base mobile atual, incluindo os commits locais aprovados.

## Estrutura

- Cabeçalho único Adicionar item + Fechar.
- Corpo central rolável e sem alturas ou larguras do modal desktop.
- Rodapé externo ao corpo, com handlers e estados originais.
- Safe areas, visualViewport, foco, Escape, navegação e movimento reduzido
  continuam sob responsabilidade do painel compartilhado, que não foi alterado.
- O stepper Material mantém as mesmas etapas, controles, conclusão e navegação.
  Mobile e desktop usam os mesmos rótulos e posição inferior: Produto/serviço,
  Preço, Adicionais e Revisão. Adicionais não começa concluído; o indicador
  acompanha a etapa ativa e reinicia os estados ao configurar outro item.
- Funil mobile com um quadro por vez e transição lateral entre Produto/Serviço,
  Material, Formato e Cor, conforme as opções reais. Escolhas únicas continuam
  seguindo o avanço automático existente. Voltar revisita o quadro anterior.
- Quadros fora de vista usam aria-hidden e inert; o foco acompanha o título do
  quadro ativo sem abrir o teclado. Movimento reduzido desativa a transição.
- A seleção ocupa a altura central, sem empilhar quadros ou rolar verticalmente.
  A paginação soma a altura individual das opções e os espaçamentos reais de
  cada coluna. O mesmo cálculo atende mobile e desktop, sem limite fixo de seis.
  Alterações na largura descartam medidas antigas; novas medições substituem
  alturas transitórias. Um nome longo não reserva espaço extra para os demais.
  O primeiro resultado continua acessível ao redimensionar ou aprender alturas.
- Busca vazia não remove o quadro; novas escolhas limpam pesquisas dependentes
  no mobile. Desktop mantém as colunas, com paginação conforme a altura útil.
- Busca rápida continua existente; seus resultados abrem os respectivos wizards
  no painel mobile. A apresentação da busca rápida não foi migrada nesta fase.
- Preço no mobile usa cards compactos, sem a altura mínima desktop. No preço
  fixo, quantidade e Calcular ficam lado a lado; item, regra e total permanecem
  no corpo, com o rodapé acessível. Não há corte de conteúdo por overflow:
  teclado aberto ou conteúdo excepcional ainda permitem rolagem de segurança.

## Fluxo e tutorial

Precificação, composição e seleção continuam no wizard atual. O resultado sai
pelo `afterClosed`, e o editor inclui os itens no mesmo ponto para Pedidos,
Orçamentos e Rascunhos. Cancelar/Fechar não retornam composição e não alteram o pedido.
As âncoras `PRIMEIRO_PEDIDO_TARGETS`, o overlay embutido e os checkpoints
`registrarConfiguradorAberto`/`registrarItemAdicionado` foram preservados.

## Fase 2 e validação manual

Refinar o conteúdo das etapas e as relações entre colunas do funil, sem alterar
as dependências reais. O rodapé final conserva o rótulo original Concluir.
Aparência, teclado virtual, paisagem e animações devem ser conferidos manualmente
em 360, 390 e 430px. Não foram executados testes visuais ou screenshots.

## Regressão com a skin real

A configuração de testes `application-theme` carrega `src/styles.scss` e
`src/assets/scss/style.scss`. Os testes verificam a utilização da altura no DOM,
nomes com alturas diferentes e preenchimento desktop, sem screenshots.
