# Avanço operacional e cancelamento — Pedidos mobile

## Diagnóstico

- Início na branch `feature/mobile-comercial-adicionar-item-painel`, HEAD `113fc92`,
  árvore limpa. Commits anteriores preservados.
- `PedidoFluxoControlesComponent` tem um consumidor em produção: o Editor Comercial.
  O piloto ativa `mobileCompact`/`mobileActionsPanel` apenas no detalhe mobile de Pedido.
- As opções vêm de `GET api/comercial/pedidos/{id}/fluxo`, por
  `GraficaProdutoService.buscarFluxoPedidoComercial`. O Editor transforma
  `proximasTransicoes` em `transicoesFluxo`, mantendo identificador/label/motivo e
  mapeando `permitida` para `!bloqueado`. `permissoes.alterarStatus` controla acesso.
- O DTO `PedidoFluxoTransicao` contém status, label, permitida e motivo; não contém
  categoria de apresentação. A leitura do backend confirmou os seis identificadores
  de `PedidoStatus`: AGUARDANDO_PAGAMENTO, PENDENTE, EM_PRODUCAO, PRONTO, ENTREGUE,
  CANCELADO. `PedidoFluxoService` fornece as transições e listas vazias nos estados
  finais. Nenhum arquivo do backend foi alterado.
- O mobile iterava todas as transições como “Avançar para...”, incluindo CANCELADO.
  “Trocar status” também recebia a lista inteira. “Cancelar pedido” do painel já
  abria `PedidoTrocarStatusDialogComponent` com destino CANCELADO fixado, confirmava
  e utilizava `alterarStatusSelecionado`/`alterarStatus`. Não havia um formulário
  adicional de motivo nesse caminho. Ambos usavam o mesmo PATCH de status.
- O Kanban tem caminho próprio: revalida o fluxo, pede confirmação destrutiva por
  `ConfirmDialogComponent` ao cancelar, persiste e restaura o card em falha. Essa
  diferença preexistente de apresentação foi preservada, assim como o desktop.

## Implementação

- `pedido-transicao-apresentacao.ts` centraliza a classificação **de apresentação**:
  os cinco identificadores operacionais, CANCELADO como cancelamento e identificadores
  desconhecidos como excepcionais. Não usa labels, não avalia origem/destino,
  permissões ou finanças e não calcula transições. O backend continua como autoridade.
- O componente filtra somente a lista exibida como avanço mobile, preservando ordem,
  todas as alternativas operacionais, bloqueios e motivos. Os arrays recebidos não
  são modificados. Sem avanço, mostra “Nenhum avanço operacional disponível.”
- “Trocar status” mobile recebe as opções gerais exceto cancelamento. Identificadores
  excepcionais eventualmente recebidos continuam acessíveis por essa troca geral,
  sem serem rotulados como avanço. Hoje não há outro status excepcional no contrato.
- `confirmarCancelamentoMobile` é uma entrada semântica para a mesma confirmação
  privada existente, com destino fixo e opções de cancelamento. O painel continua
  usando os mesmos outputs, handler, PATCH, permissões, loading, erro e atualização.
  Não há segundo implementador de cancelamento nem execução direta ao tocar na linha.
- “Cancelar pedido” permanece separado e identificado por texto/ícone destrutivos.
  Quando só há cancelamento autorizado, “Trocar status” fica desabilitado e cancelar
  continua disponível. A opção bloqueada continua visível/desabilitada quando fornecida.
- Uma confirmação mobile em andamento bloqueia nova abertura. Ao confirmar, o destino
  deve pertencer às opções daquele diálogo e continuar permitido nas transições
  atuais. A assinatura da confirmação é consumida uma vez; cancelamento/revogação
  não emitem alteração. A troca geral não pode emitir CANCELADO por resultado adulterado.

## Preservação

- O ramo desktop, opções completas do seu modal, menu, confirmação, ação principal,
  layout e CSS continuam iguais. Não houve alteração em `PedidoTrocarStatusDialogComponent`.
- “Ver fluxo completo” continua renderizando `fluxoSteps` recebidos, inclusive
  CANCELADO quando presente. Histórico e etapas não passam pelo filtro de ações.
  Estados finais dependem das listas/permissões reais; não há nova regra terminal.
- Após confirmação, o status apresentado continua vindo do sucesso real da operação
  e do recarregamento de fluxo. Falha preserva o pedido e permite retry, pelo handler
  existente. Cliente, itens, financeiro, observações e documentos ficam intactos.
- Primeiro Pedido: a movimentação do tutorial aponta para `primeiro-pedido-kanban-card`,
  na listagem, e o checkpoint `movimentado` é registrado após persistir o movimento.
  Não havia alvo de tutorial no botão de avanço deste componente. Alvos, retomada,
  checkpoints e conclusão não foram modificados.
- O helper é reutilizável por contrato, mas não foi aplicado ao Kanban: sua lista de
  destinos, drag-and-drop, confirmação e tratamento de erros continuam iguais.
  Outros consumidores não foram migrados; não foi criado componente mobile paralelo.

## Arquivos modificados

- `src/app/components/pedido-fluxo-controles/pedido-transicao-apresentacao.ts`
- `src/app/components/pedido-fluxo-controles/pedido-transicao-apresentacao.spec.ts`
- `src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.ts`
- `src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.html`
- `src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.spec.ts`
- `src/app/pages/grafica/comercial/comercial-editor.component.ts`
- `src/app/pages/grafica/comercial/comercial-editor.component.html`
- `src/app/pages/grafica/comercial/comercial-editor-acoes-painel-mobile.spec.ts`
- `docs/mobile-fluxo-avanco-cancelamento.md`

## Validação e limites

- Rodada focada: **65 aprovados**, incluindo classificação, fluxo compartilhado,
  painel Ações e detalhes do Editor. Cobre múltiplas opções, somente cancelamento,
  estados reais, ausência de avanço, confirmações, duplicidade, permissões revogadas,
  sucesso/erro/retry, fluxo completo e desktop.
- Rodada ampliada: **298 aprovados e 1 falha preexistente NG0205**, no teste
  “Financeiro e pagamentos do editor mobile mantém ajustes, Pago e Saldo sincronizados
  com o painel inferior e preserva os campos ao recolher”. A stack é
  `MatAutocompleteTrigger` / `_CdkPrivateStyleLoader`, com injector destruído.
  A mesma instabilidade de foco/teardown já foi reproduzida no baseline anterior,
  conforme [registro de Pagamentos](mobile-painel-pagamentos.md). Nenhum teste novo
  ou de fluxo/painel falhou nessa rodada; o Financeiro não foi modificado.
- Build de produção aprovado (exit 0), com **38 avisos existentes**.
- Regressão final separada: **156/156 aprovados**, incluindo componentes de fluxo,
  painel/detalhes do Editor, consumidores desktop, Kanban (confirmação, rollback,
  permissões e movimentos mobile) e tutorial Primeiro Pedido. `git diff --check`
  aprovado.
- Sem testes visuais ou screenshots. Aparência e interação em dispositivos físicos
  continuam para validação manual. Não foram criadas regras para estados que não
  existem no contrato; a categoria excepcional é somente fallback de apresentação.

Comandos:

```sh
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/components/pedido-fluxo-controles/*.spec.ts' --include='src/app/pages/grafica/comercial/comercial-editor-acoes-painel-mobile.spec.ts' --include='src/app/pages/grafica/comercial/comercial-editor-detalhe-mobile.spec.ts'
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/components/pedido-fluxo-controles/*.spec.ts' --include='src/app/pages/grafica/comercial/comercial-editor*.spec.ts' --include='src/app/pages/grafica/comercial/comercial-list.component.spec.ts' --include='src/app/pages/grafica/comercial/comercial-beta-list.component.spec.ts' --include='src/app/components/kanban-board/*.spec.ts' --include='src/app/pages/grafica/comercial/primeiro-pedido/*.spec.ts'
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/components/pedido-fluxo-controles/*.spec.ts' --include='src/app/pages/grafica/comercial/comercial-editor-acoes-painel-mobile.spec.ts' --include='src/app/pages/grafica/comercial/comercial-editor-detalhe-mobile.spec.ts' --include='src/app/pages/grafica/comercial/comercial-editor.component.spec.ts' --include='src/app/pages/grafica/comercial/comercial-editor-shell.spec.ts' --include='src/app/pages/grafica/comercial/comercial-beta-list.component.spec.ts' --include='src/app/components/kanban-board/*.spec.ts' --include='src/app/pages/grafica/comercial/primeiro-pedido/*.spec.ts'
npm run build:prod
git diff --check
```
