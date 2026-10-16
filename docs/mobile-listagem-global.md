# Fundação global de listagens mobile

## Escopo e diagnóstico

A composição anterior mantinha título da busca, filtros inline e paginação Material no celular. Os ajustes compactos ainda dependiam de inputs no piloto. Esta entrega evolui **DataTable, ListFilterBar, InputPesquisa e ViewModeToggle**, preservando a composição desktop e o contrato `appDataTableItem`.

[Inventário dos consumidores](validation/mobile-listagem-global/consumidores.md): usos reais dos selectors, inclusive templates inline. O padrão é compartilhado; não houve migração de novas telas para itens mobile nem alteração de regras de dados. Em Comercial foram removidos somente os dois `mobileCompact` redundantes do DataTable/toggle.

## Composição mobile padrão

Até **760 px**, a barra oferece:

1. Campo de pesquisa como primeira linha, sem título redundante.
2. Botão Filtros com contador de valores ativos e ações projetadas, incluindo o toggle Lista/Kanban, na segunda linha. A linha pode quebrar em telas estreitas ou quando houver mais ações.

O conteúdo é projetado uma única vez. A barra passa a apresentação compacta ao campo de pesquisa; o toggle compartilhado mantém o modo ativo e oferece altura de toque de 44 px, com padding menor no mobile. No desktop permanecem SectionCard, título, busca, ações, filtros recolhíveis e chips existentes.

## Pesquisa e foco

InputPesquisa encaminha o foco ao input real de forma síncrona no `pointerdown` da área do campo ou do ícone, apenas no mobile. Não utiliza atraso ou refoco após atualizar a lista. O input continua sendo o mesmo enquanto a apresentação mobile não muda.

A área do campo possui altura mínima de 44 px, texto de 16 px e ícone alinhado. No mobile são usados `inputmode="text"`, `enterkeyhint="search"` e `autocomplete="off"`. Esses atributos não são acrescentados no desktop. O foco e os valores emitidos são testados; a abertura efetiva do teclado nativo permanece para avaliação manual no aparelho.

Debounce, trim e deduplicação permanecem os anteriores: modo `section` preserva trim/deduplicação; modo `flat` preserva seu comportamento legado. Pedidos continua com 250 ms e pesquisa somente nos registros/cards carregados. Não foram criadas consultas nem busca global.

## Painel de filtros

Foi avaliado o MobileSummarySheet existente. Para os filtros foi utilizado o **MatBottomSheet já exportado pelo MaterialModule**, que oferece gerenciamento de foco, Escape, backdrop e bloqueio de scroll, combinado com o **MobileSheetHeader existente**. Nenhum desses componentes auxiliares foi modificado; não há biblioteca nova nem painel específico de Pedidos.

O painel tem título, fechamento explícito, corpo rolável e footer com Aplicar e Limpar filtros quando há valores ativos ou em edição. O footer considera safe area e o painel limita sua altura por viewport dinâmica. A estilização do overlay está restrita à classe `list-filter-mobile-panel` e ao breakpoint mobile.

- Filtros declarativos são copiados para um rascunho ao abrir. As escolhas preservam strings, números, zero, booleanos, `null` e arrays. **Aplicar** emite o mesmo estado tipado uma vez; no modo flat, mantém também o evento string legado dos campos alterados. Aplicar sem alterações apenas fecha, sem nova emissão.
- **Fechar**, Escape e backdrop descartam escolhas declarativas não aplicadas. O foco retorna ao botão Filtros. Ao voltar para desktop ou destruir o componente, o painel é fechado sem aplicar.
- **Limpar filtros** usa os eventos existentes de limpeza e fecha o painel.
- A projeção de filtros de domínio é reutilizada no mesmo painel. Seus bindings/eventos continuam sob controle do consumidor. Atualizações externas são mescladas sem perder as escolhas declarativas em edição.

**Limite do contrato projetado:** os eventos próprios de controles projetados continuam imediatos, como já eram. Fechar o painel não desfaz alterações que a feature já aplicou por esses eventos. Uma transação única envolvendo controles arbitrários exigiria um contrato futuro explícito com o consumidor; não foi simulada interceptando eventos ou alterando regras de dados.

## Paginação e vazio

DataTable apresenta paginação mobile própria na camada de apresentação:

- Página atual e quantidade de páginas.
- Faixa exibida e total de registros.
- Anterior/próxima com área de toque de 44 px.
- Menu de itens por página, preservando opções e tamanho atual, sem ocupar uma linha permanente com select.

O componente emite **PageEvent**, sem consultar ou paginar outra fonte. Alterar tamanho mantém a âncora do primeiro item visível, como `MatPaginator._changePageSize` da versão instalada. Loading bloqueia navegação e emissão. Sem dados, mostra página 1 de 1, faixa 0–0 de 0 e botões de navegação desabilitados. No desktop, MatPaginator permanece com seus controles, tamanhos e eventos originais. Não houve conversão para scroll infinito.

No mobile vazio, o componente omite o cabeçalho de tabela e apresenta a mensagem e apoio em um bloco compacto alinhado ao fluxo. Vazio real e filtrado mantêm seus textos e critérios. O slot opcional `[data-table-empty-actions]` permite ação contextual do consumidor. Loading inicial, refreshing, erro/retry e 403 mantêm a precedência e os bloqueios existentes.

## Configuração e compatibilidade

| Componente / opção | Padrão | Uso |
|---|---|---|
| DataTable / ListFilterBar `mobileFilterPresentation` | `sheet` | `inline` preserva a apresentação de filtros inline quando necessária. |
| DataTable `mobileShowToolbarTitle` / ListFilterBar `mobileShowTitle` | `false` | Permite título visual em contexto mobile especial. |
| DataTable `mobilePagination` | `compact` | `material` mantém o paginator Material no mobile quando necessário. |
| `mobileCompact` dos componentes envolvidos | `true` | Mantido como override de apresentação; não muda o comportamento desktop. |

As colunas, sort, ações, expansão, `appDataTableItem`, filtros e fontes de dados permanecem com seus consumidores. As APIs de eventos anteriores continuam disponíveis. O DataTable continua oferecendo tabela com overflow quando uma página não fornece template de item; esta tarefa não migrou esses templates.

Nenhum arquivo de PageCard, shell, Dashboard, SmartCalc, onboarding, backend ou serviço foi alterado. Não houve alteração de endpoints, regras comerciais, permissões ou lógica de Kanban.

## Validação

- Suíte completa final: **1.082 passaram de 1.083**; exit 1 somente pela falha preexistente do onboarding em 360 px (`Expected 303 to be less than or equal 298`). Nenhuma falha nova.
- Build de produção: **exit 0**, os mesmos 38 avisos existentes, nenhum erro.
- Cobertura nova: foco na primeira interação, atributos do input, painel/fechamento/foco restaurado, rascunho/aplicar/limpar, projeção, tipos/arrays, compatibilidade flat, integração do painel com DataTable, vazio com ação contextual e paginação sem dados/com dados/busy.
- Quatro suítes existentes que verificam especificamente MatPaginator/selects desktop (Clientes, Usuários e duas do ClickTV) passaram a simular explicitamente desktop. Seus testes e expectativas funcionais foram preservados; seus componentes não foram modificados.
- [Comandos, resultados e extrato da falha](validation/mobile-listagem-global/resultados.md).
- Sem testes visuais nem screenshots.

## Arquivos modificados

- `src/app/components/data-table/data-table.component.{ts,html,scss,spec.ts}`
- `src/app/components/list-filter-bar/list-filter-bar.component.{ts,html,scss,spec.ts}`
- `src/app/components/inputs/input-pesquisa/input-pesquisa.component.{ts,html,scss,spec.ts}`
- `src/app/components/view-mode-toggle/view-mode-toggle.component.{ts,scss}`
- `src/app/pages/grafica/comercial/comercial-list.component.{html,spec.ts}`
- Somente testes: `pages/cliente/listar-cliente/listar-cliente.component.spec.ts`, `pages/usuarios/listar-usuarios/listar-usuarios.component.spec.ts`, `pages/clicktv/components/playlists/clicktv-playlists.component.spec.ts` e `pages/clicktv/components/telas/clicktv-telas.component.spec.ts`, todos sob `src/app/`.
- Este relatório, inventário e registro de validação.

## Refinamento manual posterior

Validar em 360/390/430/768 px e desktop: teclado real e foco por toque, labels extensos, quebra da segunda linha, painel com muitos filtros, footer sob teclado, retorno de foco, rolagem e safe areas. Com dados reais, revisar faixa/total e navegação em páginas intermediárias/finais, além do menu de tamanhos. Não se declara aprovação visual ou operação em aparelho real nesta entrega.
