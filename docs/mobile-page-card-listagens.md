# PageCard e listagens mobile — contrato global

## Composição e responsabilidades

Até 760 px, PageCard padrão oferece título à esquerda, ações contextuais à direita e divisor. O slot `[page-mobile-header-actions]` aceita uma ou mais ações secundárias; CardHeader recebe essa projeção em `[card-header-contextual-actions]`, ativada por `mobileContextualActionsEnabled`. Ambos continuam sem regras de filtros, Comercial ou navegação. O slot anterior `[page-header-actions]` mantém compatibilidade e sua composição existente.

A ação `primaryAction` permanece a mesma: FAB no mobile, ação de header no desktop, preservando permissões, disabled, tutorial e posicionamento. O novo slot não substitui o FAB. Consumidores sem ação principal não recebem FAB; consumidores sem filtros não recebem botão Filtros.

## Acionador único de filtros

`MOBILE_HEADER_ACTIONS` é um token de apresentação provido pelo PageCard mais próximo, sem serviço de comunicação. O contrato aceita um `TemplateRef` e uma condição de visibilidade. ListFilterBar registra seu próprio template depois do primeiro render e remove o registro ao ser destruído. PageCard usa `ngTemplateOutlet`; não há busca de elementos no DOM nem movimentação por seletores CSS.

O template é instanciado em **um só lugar**: no cabeçalho mobile compatível ou no local original como fallback. O mesmo ListFilterBar continua dono do botão, contador, estado aplicado, rascunho e painel. A relação funciona também quando ListFilterBar é criado na view interna do DataTable, sem nova API no DataTable e sem wiring por página. A projeção conserva o contexto e o foco de retorno ao botão. Filtros declarativos, custom templates e eventos permanecem os existentes.

Busca/debounce, escopo local, tabela/itens, estados, paginação e filtros desktop não foram modificados. A linha de controles vazia é omitida no mobile. O painel lateral aprovado e suas animações não foram redesenhados: apenas o acionador mudou de posição.

```html
<app-page-card titulo="Registros" [primaryAction]="createAction"
  (primaryActionClick)="create()">
  <button page-mobile-header-actions mat-icon-button aria-label="Mais opções">
    <mat-icon>more_vert</mat-icon>
  </button>
  <app-data-table [filters]="filters" [filterState]="state"
    (filterChange)="onFilters($event)"></app-data-table>
</app-page-card>
```

## Piloto Comercial e movimentação

Pedidos abre em Lista no mobile; o seletor Lista/Kanban permanece apenas no desktop. A pesquisa é o primeiro conteúdo operacional, com seu placeholder, foco e debounce de 250 ms preservados. Ao entrar no mobile, o modo desktop e a ampliação do Kanban ficam guardados apenas em memória; ao retornar ao desktop são restaurados, recarregando a apresentação quando necessário. Mudança de viewport não registra uma seleção de Kanban no tutorial. Não foi criada preferência persistida, rota ou tela nova.

O menu secundário **Abrir Kanban** foi removido do mobile a pedido do responsável. O Kanban e a movimentação por cards permanecem no desktop. A Lista mantém **Ver pedido**, que abre o editor existente com **Fluxo do pedido**, seleção de status e ações operacionais, respeitando `permissoesFluxo.alterarStatus`, transições e validações já implementadas. Não foi criada uma nova operação de movimentação na Lista nem alterada a lógica do editor.

O alvo de tutorial de alternância permanece no seletor desktop; não há mais acionador de Kanban no mobile. Novo pedido e o FAB não mudaram. O slot genérico continua disponível para outras ações contextuais futuras. O botão Filtros usa ícone `tune`, fundo de tom primário suave, tipografia mais legível, cantos de 12 px e área de toque de 44 px. Quando existem filtros ativos, usa cor primária preenchida e mantém o contador. Estilos limitados ao breakpoint mobile.

## Adoção e exceções

[Inventário completo](validation/mobile-page-card-listagens/consumidores.md): 77 arquivos com PageCard, 21 com CardHeader direto, 19 com DataTable, 2 com ListFilterBar direto e 2 com ViewModeToggle.

A composição automática com filtros declarados alcança **Comercial** (Pedidos, Orçamentos e Rascunhos), **Produtos gráficos**, **Usuários**, **Playlists**, **Telas** e **Mídias do ClickTV**. Nenhuma cópia de implementação foi criada nessas páginas. Clientes e outras listagens com DataTable sem filtros continuam apenas com busca; o contrato está disponível quando passarem a declarar filtros.

Exceções preservadas:

- Dashboard e SmartCalc usam `mobileHeaderMode="legacy"`; não adotam o novo cabeçalho.
- Orçamentos legados (`pages/orcamentos/listar-orcamentos`) usa CardHeader direto e ListFilterBar: conserva o acionador local, pois não há PageCard ancestral. Blocos de páginas usa DataTable sem PageCard e permanece com composição própria.
- Produtos do Catálogo administrativo (`pages/catalogo/produtos`) e outros formulários de filtros próprios não usam ListFilterBar: não foram migrados nem tiveram consultas interceptadas.
- `mobileFilterPresentation="inline"` mantém filtros inline. Ações legadas `[page-header-actions]`/`botaoTexto` não são convertidas silenciosamente em novos contratos.

Nenhum arquivo de Dashboard, SmartCalc, onboarding, shell, navegação inferior, backend, API ou serviço foi alterado.

## Arquivos desta entrega

- `components/page-card/mobile-header-actions.ts`: token e contrato genéricos.
- `components/page-card/page-card.component.{ts,html,scss}`: host e slot contextual.
- `components/card-header/card-header.component.{ts,html,scss}`: apresentação contextual mobile.
- `components/list-filter-bar/list-filter-bar.component.{ts,html,scss}`: template do acionador e integração opcional.
- `components/page-card/page-card-list-filter-integration.spec.ts`: integração via DataTable, foco, estado, compatibilidade e ações independentes.
- `pages/grafica/comercial/comercial-list.component.{ts,html,spec.ts}`: composição mobile, menu secundário, viewport e cobertura do piloto.
- Este relatório e inventário. Caminhos de implementação relativos a `src/app/`.

## Validação

A suíte direcionada inicial aprovou **103 testes**, incluindo PageCard, ListFilterBar, integração por DataTable, Comercial e os testes existentes do fluxo Kanban (permissões, cancelamento, rollback e status). Após o ajuste final para não repetir o tutorial nas trocas de viewport, a suíte completa aprovou **1.100/1.100 testes** (exit 0). A falha conhecida do onboarding em 360 px não se reproduziu nesta execução; não foi tratada como correção desta entrega. O build `npm run build:prod` terminou com **exit 0**, 38 avisos existentes e nenhum erro.

Sem testes visuais nem screenshots. Alinhamento, quebra de títulos longos, teclado/safe areas e operação por toque ficam para a validação manual solicitada.

Comandos executados:

```sh
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/components/page-card/*.spec.ts' --include='src/app/components/list-filter-bar/list-filter-bar.component.spec.ts' --include='src/app/pages/grafica/comercial/comercial-list.component.spec.ts' --include='src/app/pages/grafica/comercial/comercial-beta-list.component.spec.ts'
npm test -- --watch=false --browsers=ChromeHeadless
npm run build:prod
```

## Refinamento do cabeçalho — 16/10/2026

Removido o menu mobile Abrir Kanban conforme solicitação posterior. Botão Filtros refinado com tokens da skin, contraste de estado ativo, ícone de ajustes de 20 px e texto de 14 px. Painel lateral, FAB e desktop preservados. Movimentação de status continua acessível pelo editor aberto em Ver pedido.

Validação: **103/103 testes direcionados aprovados**, incluindo integração do cabeçalho e preservação do Kanban desktop. Build de produção com sucesso, 38 avisos existentes e nenhum erro. Sem testes visuais ou screenshots.
