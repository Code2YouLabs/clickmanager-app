# Detalhes do Pedido mobile — Fase 1

## Diagnóstico

- Início na branch `feature/mobile-comercial-adicionar-item-painel`, HEAD `13c95ef`,
  árvore limpa. Os commits locais anteriores foram preservados.
- A rota `grafica/comercial/pedidos/:id`, em `pages.routes.ts`, usa
  ComercialEditorComponent com documento persistido. Pedidos novos usam outra
  configuração de rota; Orçamentos/Rascunhos mantêm seus próprios contratos.
- carregarPedido busca documento, resumo financeiro, recebimentos e fluxo. Status,
  descrição, permissões, próximas transições e sequência vêm de PedidoFluxoResponse.
  A interface atual admite AGUARDANDO_PAGAMENTO, PENDENTE, EM_PRODUCAO, PRONTO,
  ENTREGUE e CANCELADO; estes nomes não determinam as próximas ações no novo mobile.
- PedidoFluxoControlesComponent já oferece confirmação de troca de status, ajuda e
  menu. O desktop escolhe uma ação existente e mostra toda a sequência; isso permanece.
- Cliente, Observações e Financeiro já possuíam contratos compactos/recolhíveis.
  Itens ainda recebia `mobileCompact` somente na criação do Pedido.
- Primeiro Pedido orienta a movimentação no Kanban da listagem, pelo alvo kanbanCard
  e evento pedidoMovido. Não há checkpoint de movimentação neste componente de fluxo.

## Implementação e regras preservadas

- `mobilePedidoDetalhe` limita a nova organização a Pedidos existentes no breakpoint
  compartilhado de até 760px. PageCard/CardHeader mantêm o contrato global, título
  Pedido #id e uma ação Voltar projetada à direita; não há outro cabeçalho.
- PedidoFluxoControlesComponent recebe `mobileCompact` opt-in e o label real do
  status. StatusBadge preserva cores/ícone existentes, com `fullLabel` opt-in para
  texto integral e quebra, sem afetar os badges abreviados dos outros consumidores.
- Ações mobile são todas as transições recebidas, na ordem recebida. Transições
  bloqueadas continuam visíveis e disabled, com motivo associado por aria-describedby.
  Sem transições, não é fabricada uma ação com base na posição de um status.
- Cada botão Avançar para abre PedidoTrocarStatusDialogComponent com o destino
  escolhido e as mesmas opções. Ao confirmar, os eventos existentes atualizam o
  statusControl e chamam alterarStatusSelecionado/alterarStatus. Permissões e estado
  ocupado são verificados antes de abrir e novamente ao confirmar no mobile.
- Loading bloqueia movimentação inclusive durante recarregamento. Não há atualização
  otimista: sucesso usa aplicarPedido e recarrega financeiro/fluxo; erro restaura
  o controle ao status anterior, mantém feedback existente e permite tentar novamente.
  Backend, endpoints, DTOs e regras comerciais permanecem intactos.
- Ver fluxo completo expande/recolhe a sequência existente no local, sem modal.
  O botão tem aria-expanded/aria-controls; a região fechada usa hidden/inert.
  O status atual tem aria-current=step e concluído é exclusivamente o flag recebido.
  No mobile, ausência de sequência não gera um histórico presumido pelo frontend.
- Ordem mobile: Fluxo, Cliente, Itens, Observações, Financeiro, Responsável,
  Documentos e compartilhamento. A coluna de resumo se torna continuação natural
  do conteúdo, com superfícies leves e divisores, usando mobilePlain somente onde
  foi solicitado. O bloco de documentos mantém integralmente sua apresentação.
- Seções iniciam uma vez por documento: Cliente confirmado recolhido, Itens
  expandido, Observações e Financeiro recolhidos. Cliente ausente permanece aberto
  para permitir seleção. Recarregar/movimentar o mesmo pedido preserva escolhas de
  expansão; carregar outro pedido reinicializa. A criação mantém seus estados atuais.
- Cliente reutiliza resumo com nome/telefone, documento, cidade/UF, dados adicionais
  e troca conforme permissão. Itens utiliza a lista compacta aprovada com composição,
  valores, detalhes de preço, subtotal e ações existentes. Não há outra lista.
- Observações reutiliza resumos e o mesmo editor/painel lateral; Financeiro conserva
  valores, Pago/Saldo no cabeçalho recolhido e painéis de Ajustes/Pagamentos persistidos.
- Responsável utiliza SectionCard mobilePlain, nome real sem ícone ou subtítulo
  redundante. Quando não informado no documento, o mobile exibe Não informado,
  sem confundir o atendente com o usuário atualmente conectado. Não há atribuição nova.
- Documentos mantêm os quatro botões, eventos, permissões e rotas existentes.
  A Fase 2 de painel de documentos não foi implementada.
- Tutorial não recebe novos alvos/checkpoints nem mudanças de conclusão/retomada.
  As ações de movimentação permanecem visíveis; recolher a sequência não as esconde.
- CSS usa o breakpoint existente, uma coluna, quebra em textos/botões e alvos de
  44px. Não há nova área fixa sobre o conteúdo, alteração de navegação/safe area,
  shell ou painel inferior. Desktop mantém cards, colunas e fluxo originais.

## Verificação

- **369 testes aprovados na rodada final**, incluindo 29 cenários novos desta fase.
  Cobertura: status/descrição, todas as transições e bloqueios, ausência de transições,
  confirmação/cancelamento, loading, erro/retry, atualização real, sequência recolhível,
  permissões, organização inicial, persistência das expansões, responsável, documentos,
  pedido ausente/sem cliente/com muitos itens, quitado/entregue/cancelado e desktop.
  A rodada também inclui criação, Orçamentos/Rascunhos, tutorial Primeiro Pedido,
  Cliente/Itens, Observações, Ajustes/Pagamentos e demais consumidores do painel global.
- Antes da ampliação, os 26 cenários iniciais de fluxo/detalhes passaram isoladamente.
- `npm run build:prod`: **aprovado**, com os mesmos 38 avisos existentes.
- `git diff --check`: aprovado. Não houve falha preexistente na rodada final.

Comandos:

```sh
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/pages/grafica/comercial/comercial-editor*.spec.ts' --include='src/app/components/pedido-fluxo-controles/*.spec.ts' --include='src/app/components/itens-pedido-section/*.spec.ts' --include='src/app/pages/grafica/comercial/primeiro-pedido/*.spec.ts' --include='src/app/pages/cliente/cliente-create-dialog/*.spec.ts' --include='src/app/pages/grafica/comercial/adicionar-item-mobile.spec.ts' --include='src/app/pages/grafica/comercial/grafica-produto-wizard-*.spec.ts' --include='src/app/components/list-filter-bar/*.spec.ts' --include='src/app/shared/boas-vindas-primeiro-pedido/*.spec.ts'
npm run build:prod
```
Sem testes visuais nem screenshots. A validação manual deve cobrir aparência em
360/390/430px, paisagem e pouca altura. Teclado nativo e dispositivos reais não
foram exercitados automaticamente.

## Arquivos

- `src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.ts`
- `src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.html`
- `src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.scss`
- `src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.spec.ts` (novo)
- `src/app/components/status-badge/status-badge.component.ts`
- `src/app/components/status-badge/status-badge.component.html`
- `src/app/components/status-badge/status-badge.component.scss`
- `src/app/pages/grafica/comercial/comercial-editor.component.ts`
- `src/app/pages/grafica/comercial/comercial-editor.component.html`
- `src/app/pages/grafica/comercial/comercial-editor.component.scss`
- `src/app/pages/grafica/comercial/comercial-editor-detalhe-mobile.spec.ts` (novo)
- `docs/mobile-detalhes-pedido-fluxo.md` (novo)
