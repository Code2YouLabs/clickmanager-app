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
  No painel, usa labels compactas e mostra o nome completo da etapa atual.
- Funil em uma coluna, opções com nomes completos e listas sem rolagem própria.
- Busca rápida continua existente; seus resultados abrem os respectivos wizards
  no painel mobile. A apresentação da busca rápida não foi migrada nesta fase.

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
