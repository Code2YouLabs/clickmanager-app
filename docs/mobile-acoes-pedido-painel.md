# Ações do Pedido mobile — Fase 2

## Diagnóstico e contratos existentes

- Início na branch `feature/mobile-comercial-adicionar-item-painel`, HEAD `dd36aaa`,
  árvore limpa. Os commits anteriores foram preservados.
- PedidoFluxoControlesComponent é proprietário dos três pontos. Seu MatMenu oferece
  troca de status, cancelamento e, conforme opções, finalizar. A movimentação principal
  já possui botões por transição no próprio fluxo.
- Trocar status utiliza PedidoTrocarStatusDialogComponent; os eventos existentes
  atualizam statusControl e chamam alterarStatusSelecionado/alterarStatus no editor.
  O destino e o bloqueio vêm das transições/permissões retornadas pelo backend.
- Diferença encontrada: Cancelar no popover chamava diretamente o evento/handler,
  sem confirmação própria. A movimentação principal para CANCELADO já oferecia o
  diálogo de confirmação. O novo painel mobile reutiliza esse caminho confirmado;
  o popover desktop mantém exatamente seu comportamento anterior.
- PedidoDocumentosAcoesComponent emite quatro eventos. Os handlers do editor
  abrirImpressaoPedido / abrirWhatsAppPedido navegam para rotas existentes; não
  geram PDF ou mensagem diretamente. As páginas destino continuam responsáveis
  por carregamento, autorização, impressão e compartilhamento.
- WhatsApp usa uma página de revisão: carrega o pedido real, monta a mensagem pelo
  utilitário existente e valida telefone ao abrir o destino wa.me. Não há nova aba
  ou abertura externa no acionador do editor; isso permanece inalterado.
- openMobileSidePanel oferece viewport inteira, entrada/saída pela direita, safe
  areas, corpo rolável, foco/restoreFocus, bloqueio de scroll e closeOnNavigation.
  Não foi necessário alterar a infraestrutura global.
- Primeiro Pedido movimenta pelo Kanban da listagem (kanbanCard / pedidoMovido),
  conforme já diagnosticado na Fase 1. Não há checkpoint novo neste painel.

## Apresentação e integração

- `mobileActionsPanel` é opt-in em PedidoFluxoControlesComponent. Quando combinado
  com mobileCompact, os mesmos três pontos emitem abrirAcoesMobile; os demais usos
  mantêm o MatMenu. O acesso ao painel não depende da permissão de alterar status,
  pois pedidos entregues/cancelados ainda podem ter documentos disponíveis.
- ComercialEditorComponent abre o mesmo painel global com TemplateRef e
  ViewContainerRef próprios: título Ações do pedido, Pedido #id real, X e grupos
  Gerenciamento, Documentos e compartilhamento e Cancelamento. Linhas usam ícone,
  texto e indicador, área de toque mínima de 56px e cor semântica de erro no cancelar.
- PageCard, Voltar, ajuda, fluxo principal, responsável e demais seções não foram
  redesenhados. O fluxo mantém todas as movimentações principais fora do painel.
- Trocar status chama o método existente do componente de fluxo. Cancelar chama
  avancarMobile(CANCELADO), que usa a mesma confirmação com destino travado. Não
  houve criação de endpoint, regra de status, motivo obrigatório ou componente de confirmação paralelo.
  Finalizar permanece acessível pelas movimentações e seleção de status existentes.
- Os métodos de confirmação retornam a referência do diálogo existente, permitindo
  controlar seu ciclo de vida. A confirmação fica acima do painel, com foco próprio;
  cancelar retorna ao painel sem operar o pedido. Não é aberto outro formulário de status.
- Permissões e transições bloqueadas são respeitadas antes da ação e novamente na
  confirmação existente. O cancelamento só fica disponível se a transição real para
  CANCELADO permitir. Não são fabricadas ações em Orçamentos/Rascunhos/criação.
- Durante confirmação, requisição ou navegação, cliques duplicados e fechamento do
  painel são bloqueados. Alteração de status mantém o painel aberto até o resultado;
  sucesso atualiza pedido/fluxo pelos handlers atuais, erro mantém status anterior e
  oferece nova tentativa. Não há sucesso antecipado ou salvamento novo.
- PedidoDocumentosAcoesComponent recebeu `actionList` opt-in e `disabled`; card e
  linhas compartilham uma única definição de quatro ações e os mesmos eventos.
  Template e SCSS foram separados, conservando variantes/cores do card desktop.
- Um único template do editor conecta os quatro eventos aos handlers existentes.
  No pedido mobile persistido, é instanciado somente dentro do painel. O card final
  desaparece; desktop e o bloco de Orçamentos continuam usando a apresentação atual.
- Os handlers de navegação agora devolvem a Promise existente do Router, sem alterar
  seus comandos. O dispatcher mobile bloqueia repetição, invoca o handler no clique
  e fecha somente após navegação bem-sucedida. Cancelamento de navegação preserva o
  painel; rejeição mostra feedback e reabilita as linhas para tentar novamente.
- Nenhuma operação começa ao abrir. Não foi adicionada restrição de telefone no
  acionador WhatsApp: a validação permanece na página de revisão, inclusive quando
  não há cliente/telefone. Destinatário/mensagem e código de abertura externa não mudaram.
- X/Escape/backdrop devolvem foco aos três pontos. O helper mantém o tratamento de
  navegação/Voltar; mudança para desktop e destruição fecham painel e confirmação.
  Não há novo elemento fixo no shell, alteração na navegação inferior ou espaço
  reservado para o card removido.

## Verificação

- Suíte focada final: **40/40 aprovados**, incluindo painel, foco, grupos, identificação,
  X/Escape/backdrop, cliques duplicados, quatro destinos, falha/cancelamento de navegação,
  confirmação/cancelamento, status pendente/erro/retry/sucesso, permissões, transição
  bloqueada, entregue/cancelado, ausência de cliente/telefone, desktop e WhatsApp.
- Rodada ampliada: **396 aprovados e 1 falha preexistente NG0205** em
  “Resumo financeiro e ajustes mobile descarta o rascunho por Escape sem alterar
  os valores aplicados”. Stack: MatAutocompleteTrigger / _CdkPrivateStyleLoader /
  injector destruído. É a instabilidade de foco/teardown já reproduzida no commit
  anterior durante Pagamentos, documentada em [mobile-painel-pagamentos.md](mobile-painel-pagamentos.md).
  Nenhum teste novo falhou nessa rodada; a suíte focada final passou integralmente.
- A rodada ampliada inclui criação/detalhes do Editor, Orçamentos/Rascunhos,
  Fluxo/Itens, tutorial Primeiro Pedido, cadastro, configurador, filtros, boas-vindas,
  Observações/Ajustes/Pagamentos, documentos e utilitários de WhatsApp.
- `npm run build:prod`: aprovado, com os mesmos **38 avisos existentes**.
- `git diff --check`: aprovado.

Comandos executados:

```sh
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/pages/grafica/comercial/comercial-editor-acoes-painel-mobile.spec.ts' --include='src/app/pages/grafica/comercial/pedido-documentos-acoes.component.spec.ts' --include='src/app/components/pedido-fluxo-controles/*.spec.ts' --include='src/app/pages/grafica/comercial/pedido-comercial-whatsapp*.spec.ts'
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/pages/grafica/comercial/comercial-editor*.spec.ts' --include='src/app/pages/grafica/comercial/pedido-documentos-acoes.component.spec.ts' --include='src/app/pages/grafica/comercial/pedido-comercial-whatsapp*.spec.ts' --include='src/app/components/pedido-fluxo-controles/*.spec.ts' --include='src/app/components/itens-pedido-section/*.spec.ts' --include='src/app/pages/grafica/comercial/primeiro-pedido/*.spec.ts' --include='src/app/pages/cliente/cliente-create-dialog/*.spec.ts' --include='src/app/pages/grafica/comercial/adicionar-item-mobile.spec.ts' --include='src/app/pages/grafica/comercial/grafica-produto-wizard-*.spec.ts' --include='src/app/components/list-filter-bar/*.spec.ts' --include='src/app/shared/boas-vindas-primeiro-pedido/*.spec.ts'
npm run build:prod
```
Sem testes visuais nem screenshots. Aparência em 360/390/430px, paisagem e pouca
altura permanece para validação manual. A abertura real do WhatsApp e impressão
não foram disparadas pelos testes; a integração foi verificada pelos handlers,
rotas e contratos originais, incluindo ausência de telefone e erros da revisão.

## Arquivos modificados

- `src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.ts`
- `src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.html`
- `src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.spec.ts`
- `src/app/pages/grafica/comercial/comercial-editor.component.ts`
- `src/app/pages/grafica/comercial/comercial-editor.component.html`
- `src/app/pages/grafica/comercial/comercial-editor.component.scss`
- `src/app/pages/grafica/comercial/comercial-editor-detalhe-mobile.spec.ts`
- `src/app/pages/grafica/comercial/comercial-editor-acoes-painel-mobile.spec.ts` (novo)
- `src/app/pages/grafica/comercial/pedido-documentos-acoes.component.ts`
- `src/app/pages/grafica/comercial/pedido-documentos-acoes.component.html` (extraído)
- `src/app/pages/grafica/comercial/pedido-documentos-acoes.component.scss` (extraído)
- `src/app/pages/grafica/comercial/pedido-documentos-acoes.component.spec.ts` (novo)
- `src/app/pages/grafica/comercial/pedido-comercial-whatsapp-page.component.spec.ts` (novo)
- `docs/mobile-acoes-pedido-painel.md` (novo)

## Refinamento final do painel

- WhatsApp mobile reutiliza `IconBrandWhatsapp` da biblioteca Tabler já instalada,
  registrado como SVG estático em MatIconRegistry (`comercial:whatsapp`). Não há
  busca externa, dependência nova ou alteração no compartilhamento. O traço e a
  cor são herdados pelo SVG; verde discreto `#15803d`, já usado no Comercial, afeta
  somente o ícone ativo. Texto, fundo, dimensões e o botão desktop permanecem iguais.
- As seis linhas compartilham a estrutura ícone / texto / indicador. Os slots
  existentes de 24px e 20px, gap de 12px e padding foram preservados; os ícones
  iniciais ancoram à esquerda e as setas à direita. Trocar status conserva descrição;
  Cancelar mantém separação, vermelho semântico e confirmação.
- A auditoria confirmou que não era necessário alterar handlers ou fechamento:
  documentos e WhatsApp disparam a navegação no clique, bloqueiam duplicidade e
  fecham após sucesso do Router. Navegação cancelada mantém o painel; rejeição
  apresenta erro e permite retry. A página WhatsApp continua responsável pelo
  destinatário, mensagem, validação e abertura externa.
- Trocar status e Cancelar usam a confirmação existente, permanecem no painel
  durante a requisição e atualizam somente após sucesso real. Fechar a confirmação
  não opera o pedido; erro preserva status e permite nova tentativa. Depois de
  sucesso, o painel permanece acessível até o usuário retornar pelo fechamento.
- Cabeçalho, grupos, safe areas, foco, animação, fluxo e desktop não foram alterados.
- Verificação do refinamento: **42 testes focados aprovados** (dois cenários novos),
  incluindo estrutura, SVG, desktop, seis ações, confirmações, permissões, foco,
  loading, erros e repetição. Sem testes visuais ou screenshots; validação de
  aparência e abertura real de aplicativos/documentos permanece manual.
- `npm run build:prod` do refinamento: aprovado, com 38 avisos existentes.
  `git diff --check`: aprovado. Nenhum teste falhou nesta rodada focada.
- Arquivos deste refinamento: `pedido-documentos-acoes.component.ts/.html/.scss/.spec.ts`,
  `comercial-editor.component.html/.scss`, `comercial-editor-acoes-painel-mobile.spec.ts`
  e este registro técnico. Os arquivos de handlers permanecem sem alteração.
