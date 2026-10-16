# Fundação mobile de listagens — piloto Pedidos

## Escopo e preparação

Rota: `/page/grafica/comercial/pedidos`. Referências consultadas em 16/10/2026: [fundação #86](https://github.com/Code2YouLabs/clickmanager-app/issues/86), [épico #135](https://github.com/Code2YouLabs/clickmanager-app/issues/135) e histórias #136–#140. Todas estavam **OPEN**; não foram alteradas. Contratos locais: [fundação existente](frontend-screen-pattern-foundation.md) e [Comercial](frontend-screen-pattern-comercial.md). O inventário da rota foi apresentado no chat antes desta implementação.

Branch `feature/mobile-fundacao-listagem-pedidos`, criada do HEAD `2aae451` de `feature/mobile-dashboard-grafica`, com árvore limpa. Após fetch, `origin/develop` estava em `c623050`: somente dois commits de merge não ancestrais do HEAD, sem diferenças de conteúdo no lado develop (`git diff HEAD...origin/develop --stat` vazio). A base escolhida conserva os 17 commits exclusivos de shell, Dashboard e SmartCalc; nenhuma alteração deles foi removida ou reimplementada.

[Consumidores identificados](validation/mobile-fundacao-listagem-pedidos/consumidores.md): levantamento por selector/import em HTML e TS, sem leitura funcional de outras telas. As novas variantes permanecem desligadas por padrão. Orçamentos e Rascunhos têm testes explícitos de não adoção.

## Direção e contratos

A composição preserva a tipografia, Material Icons e tokens de superfície/contorno da skin existente. No mobile, referência/status identificam o pedido; cliente vem em seguida; data e total fecham o resumo. Ações e financeiro ficam abaixo, em fluxo vertical. Não foi criado outro design system, lista ou cabeçalho concorrente.

| Componente | Contrato mobile |
|---|---|
| PageCard | `mobileCompact=false`: opt-in de espaçamento do cabeçalho, conteúdo e footer. Encaminha o modo ao CardHeader. `contentPadding=false`, ações e projeções continuam disponíveis. Estados de listagem permanecem no DataTable; o contêiner não os duplica. |
| CardHeader | `mobileCompact=false`: título compacto, subtítulo preservado, ações com área de toque de 44 px. O marcador opcional `page-header-primary` permite à ação projetada ocupar a linha. Slots e permissões existentes não mudam. |
| SectionCard | `mobilePlain=false`: remove borda, sombra e padding do card aninhado somente no mobile. Título, subtítulo, divisor e conteúdo projetado permanecem. |
| DataTable | Reutiliza `appDataTableItem`, seu contexto (`actions`, `emitAction`, `expanded`, `toggle`) e a mesma propriedade `data`. `mobileCompact=false` encaminha o modo à barra e habilita paginação compacta: página atual, total, anterior/próxima e tamanhos permitidos. Desktop conserva MatPaginator completo. Quando há colunas ordenáveis, o item mobile oferece os mesmos eventos `sortChange`; a tabela não ordena nem consulta outra fonte. |
| ListFilterBar | `mobileCompact=false`: composição `section` usa SectionCard leve e pesquisa com área de toque ampliada. Painel recolhível, contador, chips e limpar existentes são reaproveitados. Foi avaliado um overlay, mas o filtro único de status não exige outro diálogo nem transferência das projeções. |
| InputPesquisa | `mobileCompact=false`: largura fluida e área de toque no campo. Debounce, trim, controle, foco Material e sincronização externa preservados. Piloto permanece com 250 ms. |
| ViewModeToggle | `mobileCompact=false`: opções lado a lado, altura de 44 px e largura responsiva, sem nova preferência persistida. Lista continua sendo o modo inicial. |
| KanbanBoard | `mobileNavigation=false`: seletor de etapa, anterior/próxima e sincronização com rolagem horizontal. `mobileCardAction` emite o item; `mobileCardActionLabel` fornece o texto. A ação é irmã do botão do card, evitando botões aninhados, e respeita o mesmo bloqueio configurado pelo consumidor para drag. `forbidden` opcional por coluna identifica 403 na apresentação mobile do piloto. Nenhuma transição comercial pertence ao shared. |
| ConfirmDialog | CSS apenas mobile: conteúdo rolável, limite pela altura dinâmica da viewport e botões empilhados com área de toque. Mensagens, retorno, foco restaurado, Escape e configuração desktop preservados. |

`shared/responsive/mobile-foundation.ts` e `_mobile-foundation.scss` centralizam o breakpoint **760 px**, preservando o contrato de itens da #86. Os breakpoints legados de 768 px e de outros módulos não foram migrados. Acima de 760 px, o piloto mantém tabela e apresentação desktop. A avaliação visual em 768 px também deve considerar esse limite existente.

## Integração do piloto e estados

Somente `tipo === 'pedidos'` fornece `appDataTableItem` e ativa os modos compactos. Referência, cliente, status, data e total são projetados a partir do mesmo conjunto paginado. Ver chama o emissor existente da tabela; Financeiro utiliza a mesma expansão e o mesmo template de responsável, total pago e saldo do desktop.

Loading inicial, atualização com dados, vazio, vazio filtrado, erro/retry e acesso restrito continuam centralizados no DataTable. Busca local e filtro de status/URL não mudam. No mobile, a comunicação do Kanban explicita que a pesquisa alcança somente cards carregados. Totais são os retornados pelo servidor; paginação não foi convertida em rolagem infinita.

O Kanban mantém todas as colunas, rolagem horizontal com snap, drag por toque (180 ms) e lotes de 20 por coluna. A navegação auxilia chegar à etapa e acompanha a rolagem; não cria outra consulta. Loading, erro/retry, vazio e carregar mais continuam por coluna, com distinção adicional de 403 no mobile.

`Mover pedido` consulta o fluxo e as permissões existentes, oferece as transições pelo `PedidoTrocarStatusDialogComponent` já existente e encaminha a seleção aos mesmos handlers do arraste. O fluxo é consultado novamente antes de persistir para verificar a validade atual da etapa. Atualização otimista, restauração em erro, confirmação adicional de cancelamento e `registrarPedidoMovido` são os existentes. Filtro ativo, status final e operação em curso mantêm os bloqueios.

A lista, Novo pedido, toggle e cards mantêm `TutorialTargetDirective` e seus IDs; não foram alteradas regras de progresso, retomada ou checkpoints. O modo ampliado fica disponível no desktop. No mobile o quadro já usa a largura disponível e a página não ativa `cm-kanban-focus-mode`, preservando a navegação global; a mudança de viewport também remove a classe. Nenhum arquivo do shell global foi alterado.

## Validação automatizada

Não foram realizados testes visuais nem produzidas screenshots. ChromeHeadless foi usado como runner dos testes automatizados. Não se declara aprovação visual de mobile ou desktop.

| Execução | Resultado |
|---|---|
| Baseline: `npm test -- --watch=false --browsers=ChromeHeadless` | 1.037 testes; 1.036 passaram, uma falha preexistente. Exit 1. |
| Baseline: `npm run build:prod` | Exit 0; 38 avisos, nenhum erro. |
| Etapa A: page-card, card-header, section-card (`--include` por diretório) | 24/24 passaram. |
| Etapa B: data-table, list-filter-bar, input-pesquisa, view-mode-toggle | 29/29 passaram. |
| Etapa C: kanban-board, confirm-dialog | 14/14 passaram. |
| Etapa D: `src/app/pages/grafica/comercial/**/*.spec.ts` | 124/124 passaram. |
| Suíte completa final | 1.060 testes; 1.059 passaram, mesma falha preexistente. Exit 1. Novas falhas: zero. |
| Build de produção final | Exit 0; mesmos 38 avisos, nenhum erro. |
| `git diff --check` | Sem erros. |

Falha idêntica no baseline e na suíte final: **“Narrativa do onboarding acomoda stepper, árvore e ações em 360px sem rolagem horizontal”**, `Expected 303 to be less than or equal 298`. Não foi corrigida por estar fora do escopo. Os testes novos são estruturais/funcionais e não fazem asserções de pixels. Na primeira integração, três testes existentes dependeram do viewport real do runner; o setup foi atualizado para simular explicitamente desktop/mobile com BreakpointObserver.

O sandbox bloqueou a porta local do Karma (`EPERM`) e abortou o primeiro build com exit 134. Execuções autorizadas fora do sandbox concluíram. Node 26.4.0 é reportado como não suportado pelo Angular CLI 19; não houve troca de runtime ou dependências. Os avisos de compilação são os mesmos do baseline.

Evidências em [validation/mobile-fundacao-listagem-pedidos](validation/mobile-fundacao-listagem-pedidos): extratos do runner sem linhas repetidas de progresso e logs dos builds. Logs completos das execuções permanecem temporariamente em `/tmp/clickmanager-mobile-*.log`.

## Pendências e adoção futura

Validação visual manual pelo responsável em 360/390/430/768 px e desktop: densidade, labels extensos, toque/arraste, navegação por etapa, teclado virtual, diálogos e âncoras do tutorial. Sem backend, APIs, regras financeiras, precificação, permissões, transições, editor, Dashboard, SmartCalc, onboarding ou shell alterados. Sem novas bibliotecas, push, PR ou merge.

Orçamentos, Rascunhos, Clientes e Produtos podem adotar os mesmos inputs e `appDataTableItem` em entregas posteriores, fornecendo apenas dados e ações do domínio. Não foram migrados nesta branch.

## Arquivos de implementação e testes alterados

- [src/app/components/card-header/card-header.component.html](../src/app/components/card-header/card-header.component.html)
- [src/app/components/card-header/card-header.component.scss](../src/app/components/card-header/card-header.component.scss)
- [src/app/components/card-header/card-header.component.ts](../src/app/components/card-header/card-header.component.ts)
- [src/app/components/data-table/data-table.component.html](../src/app/components/data-table/data-table.component.html)
- [src/app/components/data-table/data-table.component.scss](../src/app/components/data-table/data-table.component.scss)
- [src/app/components/data-table/data-table.component.spec.ts](../src/app/components/data-table/data-table.component.spec.ts)
- [src/app/components/data-table/data-table.component.ts](../src/app/components/data-table/data-table.component.ts)
- [src/app/components/dialog/confirm-dialog/confirm-dialog.component.scss](../src/app/components/dialog/confirm-dialog/confirm-dialog.component.scss)
- [src/app/components/dialog/confirm-dialog/confirm-dialog.component.spec.ts](../src/app/components/dialog/confirm-dialog/confirm-dialog.component.spec.ts)
- [src/app/components/dialog/confirm-dialog/confirm-dialog.component.ts](../src/app/components/dialog/confirm-dialog/confirm-dialog.component.ts)
- [src/app/components/inputs/input-pesquisa/input-pesquisa.component.scss](../src/app/components/inputs/input-pesquisa/input-pesquisa.component.scss)
- [src/app/components/inputs/input-pesquisa/input-pesquisa.component.ts](../src/app/components/inputs/input-pesquisa/input-pesquisa.component.ts)
- [src/app/components/kanban-board/kanban-board.component.html](../src/app/components/kanban-board/kanban-board.component.html)
- [src/app/components/kanban-board/kanban-board.component.scss](../src/app/components/kanban-board/kanban-board.component.scss)
- [src/app/components/kanban-board/kanban-board.component.spec.ts](../src/app/components/kanban-board/kanban-board.component.spec.ts)
- [src/app/components/kanban-board/kanban-board.component.ts](../src/app/components/kanban-board/kanban-board.component.ts)
- [src/app/components/kanban-board/kanban-board.models.ts](../src/app/components/kanban-board/kanban-board.models.ts)
- [src/app/components/list-filter-bar/list-filter-bar.component.html](../src/app/components/list-filter-bar/list-filter-bar.component.html)
- [src/app/components/list-filter-bar/list-filter-bar.component.scss](../src/app/components/list-filter-bar/list-filter-bar.component.scss)
- [src/app/components/list-filter-bar/list-filter-bar.component.ts](../src/app/components/list-filter-bar/list-filter-bar.component.ts)
- [src/app/components/page-card/page-card.component.html](../src/app/components/page-card/page-card.component.html)
- [src/app/components/page-card/page-card.component.scss](../src/app/components/page-card/page-card.component.scss)
- [src/app/components/page-card/page-card.component.spec.ts](../src/app/components/page-card/page-card.component.spec.ts)
- [src/app/components/page-card/page-card.component.ts](../src/app/components/page-card/page-card.component.ts)
- [src/app/components/section-card/section-card.component.html](../src/app/components/section-card/section-card.component.html)
- [src/app/components/section-card/section-card.component.scss](../src/app/components/section-card/section-card.component.scss)
- [src/app/components/section-card/section-card.component.spec.ts](../src/app/components/section-card/section-card.component.spec.ts)
- [src/app/components/section-card/section-card.component.ts](../src/app/components/section-card/section-card.component.ts)
- [src/app/components/view-mode-toggle/view-mode-toggle.component.scss](../src/app/components/view-mode-toggle/view-mode-toggle.component.scss)
- [src/app/components/view-mode-toggle/view-mode-toggle.component.ts](../src/app/components/view-mode-toggle/view-mode-toggle.component.ts)
- [src/app/pages/grafica/comercial/comercial-beta-list.component.spec.ts](../src/app/pages/grafica/comercial/comercial-beta-list.component.spec.ts)
- [src/app/pages/grafica/comercial/comercial-list.component.html](../src/app/pages/grafica/comercial/comercial-list.component.html)
- [src/app/pages/grafica/comercial/comercial-list.component.scss](../src/app/pages/grafica/comercial/comercial-list.component.scss)
- [src/app/pages/grafica/comercial/comercial-list.component.spec.ts](../src/app/pages/grafica/comercial/comercial-list.component.spec.ts)
- [src/app/pages/grafica/comercial/comercial-list.component.ts](../src/app/pages/grafica/comercial/comercial-list.component.ts)
- [src/app/shared/responsive/_mobile-foundation.scss](../src/app/shared/responsive/_mobile-foundation.scss)
- [src/app/shared/responsive/mobile-foundation.ts](../src/app/shared/responsive/mobile-foundation.ts)

Além destes arquivos: este relatório e as evidências em `docs/validation/mobile-fundacao-listagem-pedidos/`.
