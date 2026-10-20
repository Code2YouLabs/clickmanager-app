# Cadastro mobile de Clientes compartilhado

Branch: `feature/mobile-comercial-adicionar-item-painel`. HEAD inicial: `e1fb97c`; árvore de trabalho inicialmente limpa. Commits locais anteriores preservados.

## Diagnóstico

O cadastro rápido do Pedido estava implementado em `ClienteCreateDialogComponent`, reunindo campos, validações, POST, feedback e fechamento do diálogo. A página `FormClienteComponent` tinha formulário desktop e um wizard mobile próprio. Ambos usam `ClienteService.salvar(ClienteRequest)`, mas as regras do cadastro rápido são nome e telefone obrigatórios, e-mail opcional com validação de formato, documento e endereço opcionais.

## Implementação

- `ClienteCreateFormComponent` contém a única implementação dos campos, validadores, consulta de CEP, normalização do payload, salvamento, mensagens e foco no primeiro campo inválido do cadastro rápido. Foi extraído da implementação existente, sem regras específicas de Pedido ou rota.
- Inputs: `initialValue`, `mobileMode` e `formId`. Outputs: `created`, `cancelled`, `savingChange` e `valueChange` (rascunho). O contêiner decide como encerrar o fluxo.
- O diálogo comercial mantém título, footer, modo completo desktop, painel lateral mobile e contrato de retorno. Os pontos de entrada existentes `salvar`, `cancelar`, `form`, `nomeControl` e `telefoneControl` continuam disponíveis. Ao salvar, fecha com o cliente retornado pelo backend; o Editor continua selecionando-o pelo handler existente.
- A página de criação até 760px renderiza o mesmo formulário em `PageCard`, sem modal, hero ou etapas de wizard. Informações adicionais começam recolhidas, com CPF/CNPJ e endereço identificados como opcionais.
- A página preserva o preenchimento ao alternar mobile/desktop: sincroniza apenas os valores do rascunho, conservando os validadores próprios de cada apresentação.
- Cancelar e sucesso retornam à listagem de Clientes. A nova instância da listagem mantém sua consulta existente, exibindo o cliente criado. O feedback é emitido pelo formulário compartilhado, uma única vez.
- `MobileTotalBar` em `appearance="actions"` fornece Cancelar e Salvar cliente. Reutiliza submit nativo, bloqueio de duplicidade, acompanhamento de `visualViewport`, âncora da navegação inferior e reserva de espaço para rolagem.
- A página desktop conserva integralmente o bloco de template e os estilos anteriores, seus campos, obrigatoriedade do e-mail, botões, rodapé e submit. A edição também mantém o fluxo anterior. Não houve alterações na listagem, navegação global, endpoints, DTOs, guards ou outros cadastros.

## Validação

Testes automatizados com a configuração `application-theme` e ChromeHeadless. Cobertura da página nos viewports 360/390/430px e 1024/1440px; adicionais recolhidos, expansão/retorno, CEP, validação, foco, campos opcionais, payload, erro/retry sem perda de dados, submit único, cancelamento, navegação, diálogo comercial e seleção do cliente no Pedido. Os testes do rodapé cobrem área reservada, âncora inferior e teclado virtual simulado.

O bloco legado de template da página foi comparado com o HEAD inicial e permaneceu idêntico; seu SCSS não foi alterado. Não foram produzidas capturas nem realizada validação em aparelho físico; as verificações de layout e teclado são automatizadas em Chromium.

A execução combinada encontrou a instabilidade preexistente `NG0205` em `MatAutocompleteTrigger` / `_CdkPrivateStyleLoader` após destruição do injector. A ocorrência já está documentada em [mobile-painel-pagamentos.md](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/docs/mobile-painel-pagamentos.md) e [mobile-observacoes-paineis.md](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/docs/mobile-observacoes-paineis.md). Não foi alterada a infraestrutura de autocomplete para tratar essa falha fora de escopo; a regressão comercial foi executada isoladamente.

## Arquivos

- [src/app/pages/cliente/cliente-create-form/cliente-create-form.component.ts](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/pages/cliente/cliente-create-form/cliente-create-form.component.ts)
- [src/app/pages/cliente/cliente-create-form/cliente-create-form.component.html](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/pages/cliente/cliente-create-form/cliente-create-form.component.html)
- [src/app/pages/cliente/cliente-create-form/cliente-create-form.component.scss](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/pages/cliente/cliente-create-form/cliente-create-form.component.scss)
- [src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component.ts](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component.ts)
- [src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component.html](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component.html)
- [src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component.scss](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component.scss)
- [src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component.spec.ts](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component.spec.ts)
- [src/app/pages/cliente/form-cliente/form-cliente.component.ts](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/pages/cliente/form-cliente/form-cliente.component.ts)
- [src/app/pages/cliente/form-cliente/form-cliente.component.html](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/pages/cliente/form-cliente/form-cliente.component.html)
- [src/app/pages/cliente/form-cliente/form-cliente.component.spec.ts](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/src/app/pages/cliente/form-cliente/form-cliente.component.spec.ts)
- [docs/mobile-cadastro-cliente-compartilhado.md](/Users/leonardo.barros/dev/ClickManager/clickmanager-app/docs/mobile-cadastro-cliente-compartilhado.md)

## Resultado final

- **124 testes focados aprovados**: página de Cliente, formulário compartilhado no diálogo, listagem preservada, guards de rotas, PageCard e MobileTotalBar.
- **14 testes aprovados** na suíte isolada `comercial-editor-cliente-mobile.spec.ts`.
- **35 testes aprovados** em `comercial-editor-mobile.spec.ts` e nos consumidores existentes de formulário/detalhes de Orçamento.
- Total dessas execuções finais: **173 aprovados**, sem falhas ou erros de execução nos logs. As rodadas combinadas anteriores tiveram a instabilidade NG0205 descrita acima.
- **Build de produção aprovado**, com os mesmos 38 avisos preexistentes. `git diff --check` aprovado.
- Sem push, PR ou deploy.
