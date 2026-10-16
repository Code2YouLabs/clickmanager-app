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

O **ListFilterBar** utiliza um **MatDialog de tela inteira**, substituindo o bottom sheet. Não há biblioteca nova nem conteúdo específico de Pedidos. O overlay Material fica acima do shell, bloqueia interação/scroll subjacentes, contém e restaura o foco e fecha com Escape/backdrop. `closeOnNavigation` fecha na navegação de histórico suportada pelo Material, inclusive Voltar do Android; abrir não adiciona entradas ao histórico nem altera a rota.

A superfície entra pela direita com `translateX(100%) → translateX(0)` em 180 ms; a preferência por movimento reduzido desativa a animação. Cabeçalho com Voltar, título e Limpar, corpo rolável e rodapé com **Aplicar filtros**. Safe areas são consideradas nas quatro bordas. A altura acompanha `visualViewport` (inclusive teclado), com fallback `100dvh`; listeners são removidos ao fechar/destruir. Cabeçalho e rodapé ficam fora da área central de scroll. A validação real em dispositivo continua manual.

- Abrir copia os filtros aplicados para o rascunho, sem emissão/consulta. Um ou vários filtros declarativos usam a mesma grade de uma coluna, sem preenchimento artificial.
- Editar preserva strings, números, zero, booleanos, `null` e arrays, sem emitir até Aplicar. Aplicar emite o estado tipado; o modo flat mantém também o evento string legado. Sem alterações, apenas fecha.
- Voltar, Escape, backdrop, navegação, resize para desktop e destruição descartam edições não confirmadas. Reabrir reflete o estado aplicado.
- **Limpar** altera somente o rascunho e mantém o painel aberto. Aplicar confirma a limpeza pelos eventos `clear` e `stateChange` existentes. Cancelar a limpeza preserva os filtros aplicados. Limpar e depois editar aplica o novo rascunho.
- Atualizações externas são mescladas com campos editados; uma limpeza explícita mantém o rascunho limpo até a confirmação.

Filtros declarativos continuam fornecidos por `filters`/`filterState`. A projeção `[list-filter-custom]` é compatível. A investigação não encontrou consumidores de produção com controles customizados próprios emitindo consultas imediatamente. Para controles futuros, `customFilterTemplate` oferece o contexto `{ $implicit: valores, change }`, usando **o mesmo rascunho** do componente; `change(chave, valor)` fica imediato no desktop e pendente no painel. Esse input pertence ao ListFilterBar; não foi adicionada API no DataTable. Conteúdo arbitrário legado continua responsável pelos próprios eventos; para participar de Aplicar/Cancelar deve usar o callback compartilhado, sem emitir consultas diretamente.

```html
<app-list-filter-bar presentation="section" [filters]="filters"
  [filterState]="state" [customFilterTemplate]="periodo"
  (stateChange)="onFiltersChange($event)"></app-list-filter-bar>
<ng-template #periodo let-values let-change="change">
  <label>Período
    <input type="date" [value]="values.period || ''"
      (input)="change('period', $any($event.target).value)" />
  </label>
</ng-template>
```

Grupos podem ser compostos nesse template com os controles e expansões Material existentes. Nenhum filtro de domínio ou agrupamento artificial foi acrescentado. A estilização do overlay é restrita a `list-filter-mobile-panel` e ao breakpoint mobile; o ramo desktop foi preservado.

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
| DataTable / ListFilterBar `mobileFilterPresentation` | `sheet` | `sheet` é um alias legado que agora abre somente o painel lateral; `inline` preserva filtros inline quando necessário. |
| DataTable `mobileShowToolbarTitle` / ListFilterBar `mobileShowTitle` | `false` | Permite título visual em contexto mobile especial. |
| DataTable `mobilePagination` | `compact` | `material` mantém o paginator Material no mobile quando necessário. |
| `mobileCompact` dos componentes envolvidos | `true` | Mantido como override de apresentação; não muda o comportamento desktop. |

As colunas, sort, ações, expansão, `appDataTableItem`, filtros e fontes de dados permanecem com seus consumidores. As APIs de eventos anteriores continuam disponíveis. O DataTable continua oferecendo tabela com overflow quando uma página não fornece template de item; esta tarefa não migrou esses templates.

Nenhum arquivo de PageCard, shell, Dashboard, SmartCalc, onboarding, backend ou serviço foi alterado. Não houve alteração de endpoints, regras comerciais, permissões ou lógica de Kanban.

## Validação anterior da fundação

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

## Validação do painel lateral — 16/10/2026

- **17 casos do ListFilterBar aprovados** na suíte completa, incluindo o contrato customizado nos modos section e flat. A execução isolada anterior também passou (16 casos antes da adição do caso flat customizado).
- `npm test -- --watch=false --browsers=ChromeHeadless`: **1.088/1.089 passaram**; única falha é a preexistente do onboarding (`onboarding-flow.spec.ts:333`, `Expected 303 to be less than or equal 298`).
- Cobertura: um/vários filtros, projeção/template customizado, tipos/arrays, abertura sem emissão, Aplicar, Limpar pendente, cancelar/reabrir, foco inicial/contido/restaurado, Escape/backdrop, navegação Material, viewport do teclado e limpeza de listeners, resize e compatibilidade desktop/flat. Integração DataTable e consumidores foi verificada pela suíte existente, sem modificar esses arquivos.
- `npm run build:prod`: concluído com sucesso, sem erros; avisos existentes de orçamento/otimização/depreciação permanecem.
- Sem testes visuais ou screenshots. Teclado, animação e safe areas em aparelho real dependem da validação manual solicitada.
- Arquivos desta entrega: `src/app/components/list-filter-bar/list-filter-bar.component.{ts,html,scss,spec.ts}` e este documento. Nenhum arquivo de DataTable, paginação, Kanban, PageCard, FAB, shell, API ou regra de negócio foi alterado.
