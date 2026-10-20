# Confirmação de troca de status do pedido

## Diagnóstico

Branch inicial: `feature/mobile-comercial-adicionar-item-painel`; HEAD inicial: `170c35c`; árvore de trabalho inicialmente limpa. Os commits anteriores foram preservados.

`Cancelar pedido` já utiliza `ConfirmDialogComponent`, `ConfirmDialogData` e `ResponsiveConfirmationService`. O avanço operacional ainda abria `PedidoTrocarStatusDialogComponent`, que misturava seleção e confirmação. `PedidoFluxoControlesComponent` é consumido pelo Editor Comercial; o seletor também é utilizado pelo Kanban. O backend fornece status, rótulos, permissões e transições; o Editor mantém o handler e a atualização após sucesso.

## Implementação

- Avançar abre diretamente `ConfirmDialogComponent`. Trocar status preserva o seletor existente, em modo de seleção, e abre a mesma confirmação global após escolher o destino. A seleção não altera o pedido.
- Título: **Alterar status do pedido?**; mensagem: **Confirme a alteração antes de continuar.**; ações: **Voltar** e **Confirmar alteração**, com variante comum e cor primária.
- Os detalhes mostram os rótulos reais de **Status atual** e **Novo status**. A extensão opcional e genérica `details[].emphasis` destaca o destino sem afetar consumidores existentes.
- O seletor opt-in reutiliza o serviço e os estilos responsivos existentes, inclusive animação, handle, limite de altura e safe-area. Seu modo legado, utilizado pelo Kanban, permanece intacto.
- Apenas o resultado booleano `true` da confirmação autoriza o handler existente. Permissões e transições são revalidadas ao fechar. A referência ativa evita aberturas simultâneas; o loading existente impede requisições repetidas.
- As linhas de avanço mantêm identidade por código de status para preservar os botões durante a renderização e permitir retorno de foco. O painel Ações do pedido acompanha a passagem seletor → confirmação por referência. O fechamento do seletor não libera indevidamente o painel enquanto a confirmação seguinte estiver aberta. Ao desistir, o painel permanece aberto e o foco retorna ao botão de origem quando habilitado.
- `CANCELADO` continua sendo identificado pelo código real e encaminhado exclusivamente para a confirmação destrutiva aprovada, sem mudar mensagens, validações ou handler.
- Desktop mantém apresentação centralizada, largura de 440px e limite de largura anterior. Não foram alterados backend, DTOs, financeiro, tutorial ou implementação do Kanban. O tutorial mantém seu checkpoint na movimentação real do Kanban após sucesso.

## Arquivos

- [src/app/components/dialog/confirm-dialog/confirm-dialog.models.ts](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/components/dialog/confirm-dialog/confirm-dialog.models.ts)
- [src/app/components/dialog/confirm-dialog/confirm-dialog.component.html](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/components/dialog/confirm-dialog/confirm-dialog.component.html)
- [src/app/components/dialog/confirm-dialog/confirm-dialog.component.scss](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/components/dialog/confirm-dialog/confirm-dialog.component.scss)
- [src/app/components/dialog/confirm-dialog/_responsive-confirmation.scss](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/components/dialog/confirm-dialog/_responsive-confirmation.scss)
- [src/app/components/dialog/confirm-dialog/confirm-dialog-responsive.spec.ts](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/components/dialog/confirm-dialog/confirm-dialog-responsive.spec.ts)
- [src/app/components/pedido-fluxo-controles/pedido-status-confirmacao.ts](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/components/pedido-fluxo-controles/pedido-status-confirmacao.ts)
- [src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.ts](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.ts)
- [src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.html](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.html)
- [src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.spec.ts](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.spec.ts)
- [src/app/components/pedido-fluxo-controles/pedido-trocar-status-dialog.component.ts](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/components/pedido-fluxo-controles/pedido-trocar-status-dialog.component.ts)
- [src/app/components/pedido-fluxo-controles/pedido-trocar-status-dialog.component.html](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/components/pedido-fluxo-controles/pedido-trocar-status-dialog.component.html)
- [src/app/pages/grafica/comercial/comercial-editor.component.ts](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/pages/grafica/comercial/comercial-editor.component.ts)
- [src/app/pages/grafica/comercial/comercial-editor.component.html](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/pages/grafica/comercial/comercial-editor.component.html)
- [src/app/pages/grafica/comercial/comercial-editor-acoes-painel-mobile.spec.ts](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/pages/grafica/comercial/comercial-editor-acoes-painel-mobile.spec.ts)
- [src/app/pages/grafica/comercial/comercial-editor-detalhe-mobile.spec.ts](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/pages/grafica/comercial/comercial-editor-detalhe-mobile.spec.ts)
- [docs/mobile-confirmacao-status-pedido.md](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/docs/mobile-confirmacao-status-pedido.md)

## Validação

Testes automatizados com `npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless` e inclusões das suítes de confirmação global, controles de fluxo, detalhes/painel mobile, Editor, shell, Kanban, Primeiro Pedido, notificações e consumidores de Clientes, Usuários, Produtos, Categorias, Onboarding e Suporte. Cobertura de retorno booleano estrito, sem movimentação ao selecionar/desistir, estados bloqueados/loading, permissão revogada, falha/retry, confirmação comum/destrutiva, contexto/foco e desktop.

Não foram executados testes visuais nem produzidas capturas. A validação visual permanece manual.

Resultado final: **265 testes aprovados**, sem falhas e sem erros de execução nos logs. `git diff --check` aprovado. `npm run build:prod` aprovado; 38 avisos preexistentes de build (budgets e dependências CommonJS), sem erros. Nenhuma falha preexistente de testes permaneceu na seleção executada.
