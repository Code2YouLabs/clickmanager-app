# Confirmações compartilhadas e cancelamento de pedidos

## Diagnóstico

- Início na branch `feature/mobile-comercial-adicionar-item-painel`, HEAD `82c9f92`,
  árvore limpa. Melhorias anteriores preservadas.
- A infraestrutura simples existente era `ConfirmDialogComponent`, aberto por
  `MatDialog`, com título, mensagem, textos dos botões, `confirmColor` e retorno
  booleano. MatDialog/CDK já fornecem backdrop, foco, Escape, restauração do foco,
  bloqueio de scroll e fechamento por navegação. Não havia serviço de apresentação
  responsiva nem tipos semânticos; MatBottomSheet consta do MaterialModule, mas não
  era necessário introduzir outro ciclo de vida ou contrato de referência.
- A busca encontrou cerca de 50 arquivos consumidores/importadores em Comercial,
  Gráfica, Catálogo, Clientes, Usuários, Suporte, Onboarding, Storage, Pedidos legados,
  Orçamentos, Folha, Depósito, ClickTV e Site. Suas chamadas continuam iguais.
- No piloto, cancelar abria `PedidoTrocarStatusDialogComponent` com destino fixo.
  O menu desktop emitia cancelar diretamente, sem essa confirmação; a troca geral
  desktop também podia escolher CANCELADO. O Kanban já usava ConfirmDialogComponent
  após revalidar o fluxo, mas trazia outro texto. Esses caminhos foram investigados
  antes de unificar a linguagem e a confirmação.

## Fundação e contrato

- `ConfirmDialogComponent` permanece o componente global, com o mesmo MatDialogRef
  e resultados. Template extraído para HTML; nenhum formulário de outro diálogo
  foi convertido em confirmação simples.
- `ConfirmDialogData` preserva title/message/confirmText/cancelText/confirmColor e
  acrescenta `type: default | warning | destructive`, ícone opcional, detalhes
  label/value, disabled, processing, processingText, closable, showClose e erro.
  Opções novas são opt-in; cores/rótulos legados e layout desktop padrão continuam.
- `ResponsiveConfirmationService` observa o breakpoint existente de 760px e aplica
  a classe de apresentação ao pane/wrapper **da própria confirmação**. O componente
  se integra ao serviço automaticamente, inclusive nas chamadas antigas a
  `dialog.open(ConfirmDialogComponent, ...)`. Páginas não informam viewport nem modo.
- O bottom sheet é uma apresentação do mesmo MatDialog, não uma segunda infraestrutura
  baseada em outro overlay/ref. No mobile, alinha abaixo com largura da viewport,
  altura automática, cantos superiores de 16px, handle discreto, safe-area e entrada/
  saída vertical ligadas ao ciclo de vida Material. Movimento reduzido remove a
  animação. O desktop mantém posição/dimensões/transformações Material originais.
- Texto longo rola somente no conteúdo; título e ações não encolhem. Botões têm
  altura mínima de 44px e podem acomodar rótulos completos. `visualViewport` limita
  a altura e posiciona acima do teclado, sem scrollIntoView ou mutação de formulários.
  A confirmação é modal e fica acima da navegação inferior, bloqueada pelo backdrop;
  não adiciona uma faixa vazia com a altura da navegação. Nenhum z-index foi aumentado.
- A semântica usa botões/tokens/ícones da skin Material. Tipo destrutivo usa perigo;
  atenção usa a hierarquia accent/tertiary; comum usa primary. Título Material e
  mensagem possuem associação acessível. O foco inicial padrão cai em X/Voltar,
  e não diretamente na ação destrutiva. Não há focus trap adicional ao do Material.

## Resultados, processamento e fechamento

- Confirmar retorna **true**. Voltar/X retornam false; Escape/backdrop/navegação
  mantêm o resultado de dispensa do Material (undefined). Apenas true autoriza
  cancelamento de pedido. Não há confirmação implícita por valores truthy.
- O serviço rejeita abertura simultânea de uma confirmação idêntica com resultado
  false. Cada componente bloqueia confirmação repetida durante fechamento/processamento.
  Dados distintos continuam independentes; a identidade usa título/mensagem/tipo/
  detalhes/textos/cores, sem regras comerciais.
- Por padrão, confirmar fecha e o consumidor executa sua operação, preservando as
  chamadas existentes. Para trabalho assíncrono dentro da confirmação, `deferClose`
  emite `confirmRequested`, ativa processing e bloqueia dispensas; o dono executa a
  operação, chama `setProcessing(false, erro)` para retry ou `finish(true)` no sucesso.
  A UI não chama APIs. `disableClose` explícito do consumidor é preservado.
- Listeners de viewport e assinaturas são removidos na destruição. MatDialog continua
  responsável por foco, backdrop, Escape e navegação.

## Cancelamento de Pedidos

- `confirmacaoCancelamentoPedido` prepara o contrato fora da fundação genérica:
  **Cancelar pedido?**, “Deseja realmente cancelar o Pedido <referência>?”,
  **Voltar** / **Cancelar pedido**, tipo destrutivo. Usa número comercial real quando
  disponível, senão #id real. Status atual vem do fluxo recebido. Não afirma
  irreversibilidade nem inventa consequências financeiras. Sem referência, não fabrica
  um número: usa “este pedido”.
- O painel mobile abre esse componente global. Desistir preserva pedido/painel e
  restaura o contexto. Confirmar passa pelos mesmos outputs e por
  `alterarStatusSelecionado`/`alterarStatus`, com destino CANCELADO e endpoint intactos.
  O diálogo fecha; o painel Ações permanece aberto, com “Atualizando pedido...” e
  ações bloqueadas durante a API. Portanto o fechamento não perde feedback de trabalho.
  Falha mantém status real anterior e permite retry; sucesso atualiza pedido e fluxo.
- O menu desktop também exige a confirmação destrutiva, preservando o output
  `cancelarPedido` e seu handler original. O modal usa largura 440px/posição central,
  coerentes com a confirmação anterior de status; só a linguagem/intenção mudou.
- Na troca geral desktop, selecionar Cancelado encaminha imediatamente à confirmação
  destrutiva; não executa a operação pela confirmação genérica. Opções operacionais
  e o seletor de status continuam com seus contratos/layouts. Cancelado não é escolhido
  automaticamente como destino inicial do seletor que faz esse encaminhamento.
- O seletor mobile do Kanban encaminha da mesma forma. A revalidação, confirmação
  compartilhada, PATCH, loading, rollback e checkpoint seguem o fluxo existente. Só
  true confirma. A linguagem é a mesma, sem uma nova operação de cancelamento.
- Bloqueios/permissões são revalidados antes de abrir e após confirmar. Backend,
  transições, motivo enviado, histórico, financeiro e demais dados não foram alterados.

## Fora da migração

- `PedidoTrocarStatusDialogComponent` com seleção de opções continua um diálogo de
  transição, não um consumidor do contrato de confirmação simples. Configuradores,
  cadastros e demais formulários não recebem a classe responsiva desta fundação.
- Confirmadores fora da fundação ficam para investigação futura: `confirm-rascunho.dialog.ts`
  do SmartCalc, `confirm-delete-dialog.component.ts` do exemplo Invoice e usos de
  `window.confirm` em Pedidos legados, Fiscal e pending-changes.guard do Catálogo.
  Billing confirmation é uma tela/fluxo próprio, não foi migrado.
- Não houve testes visuais, screenshots ou comparação de imagens. Testes usam DOM,
  referências e viewport simulada. Aparelhos físicos, leitor de tela, teclado nativo,
  gesto Voltar do dispositivo e qualidade da animação exigem validação manual.

## Arquivos modificados

- `src/app/components/dialog/confirm-dialog/confirm-dialog.models.ts`
- `src/app/components/dialog/confirm-dialog/responsive-confirmation.service.ts`
- `src/app/components/dialog/confirm-dialog/confirm-dialog.component.ts`
- `src/app/components/dialog/confirm-dialog/confirm-dialog.component.html`
- `src/app/components/dialog/confirm-dialog/confirm-dialog.component.scss`
- `src/app/components/dialog/confirm-dialog/_responsive-confirmation.scss`
- `src/app/components/dialog/confirm-dialog/confirm-dialog-responsive.spec.ts`
- `src/styles.scss`
- `src/app/components/pedido-fluxo-controles/pedido-cancelamento-confirmacao.ts`
- `src/app/components/pedido-fluxo-controles/pedido-cancelamento-confirmacao.spec.ts`
- `src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.ts`
- `src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.html`
- `src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.spec.ts`
- `src/app/components/pedido-fluxo-controles/pedido-trocar-status-dialog.component.ts`
- `src/app/components/pedido-fluxo-controles/pedido-trocar-status-dialog.component.html`
- `src/app/pages/grafica/comercial/comercial-editor.component.html`
- `src/app/pages/grafica/comercial/comercial-editor-acoes-painel-mobile.spec.ts`
- `src/app/pages/grafica/comercial/comercial-list.component.ts`
- `docs/mobile-confirmacoes-compartilhadas.md`

## Validação

- Integração: **138/138 aprovados**, incluindo fundação, fluxo, painel/detalhes,
  Kanban e toasts compartilhados.
- Regressão ampliada: **248/248 aprovados**, acrescentando Editor, Primeiro Pedido,
  Clientes, Usuários, Produtos, Categorias, Onboarding e Suporte. Nenhuma falha
  preexistente foi observada nesta rodada final. Falhas durante o desenvolvimento
  nos novos testes (associação da descrição e espera do ciclo Material) foram corrigidas.
- Verificação final da fundação após isolar a animação vertical mobile: **15/15
  aprovados**. Build de produção final aprovado (exit 0), com os mesmos **38 avisos
  existentes**; `git diff --check` aprovado.
- A fundação cobre os três tipos, booleanos, X/Voltar/Escape/backdrop, foco,
  texto longo, teclado simulado, limpeza, disabled/loading, retry assíncrono,
  duplicidade e desktop. O cancelamento cobre referência/status reais, permissão,
  recusa, erro/retry/sucesso, requisição única, painel e linguagem desktop.

Comandos principais:

```sh
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/components/dialog/confirm-dialog/*.spec.ts'
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/components/dialog/confirm-dialog/*.spec.ts' --include='src/app/components/pedido-fluxo-controles/*.spec.ts' --include='src/app/pages/grafica/comercial/comercial-editor-acoes-painel-mobile.spec.ts' --include='src/app/pages/grafica/comercial/comercial-editor-detalhe-mobile.spec.ts' --include='src/app/pages/grafica/comercial/comercial-editor.component.spec.ts' --include='src/app/pages/grafica/comercial/comercial-beta-list.component.spec.ts' --include='src/app/pages/grafica/comercial/primeiro-pedido/*.spec.ts' --include='src/app/shared/notifications/*.spec.ts' --include='src/app/pages/cliente/listar-cliente/listar-cliente.component.spec.ts' --include='src/app/pages/usuarios/listar-usuarios/listar-usuarios.component.spec.ts' --include='src/app/pages/grafica/produtos/grafica-produtos.component.spec.ts' --include='src/app/pages/grafica/categorias/grafica-categorias.component.spec.ts' --include='src/app/pages/onboarding/onboarding-page.component.spec.ts' --include='src/app/pages/suporte/suporte.component.spec.ts'
npm run build:prod
git diff --check
```
