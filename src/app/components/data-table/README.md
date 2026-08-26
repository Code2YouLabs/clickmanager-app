# DataTableComponent

Componente genérico para listagens backend-first do ClickManager. Ele renderiza tabela Angular Material no padrão Spike (`mat-table`, `.table-responsive`, `mat-paginator`, `mat-sort-header`) e não conhece regras de domínio.

## Uso

```html
<app-data-table
  [columns]="columns"
  [data]="items"
  [filters]="filters"
  [filterState]="filterState"
  [search]="{ enabled: true, placeholder: 'Buscar...', debounceMs: 300 }"
  [pagination]="pagination"
  [loading]="loading"
  [actions]="actions"
  [sort]="sort"
  (searchChange)="onSearch($event)"
  (filterChange)="onFilter($event)"
  (pageChange)="onPage($event)"
  (sortChange)="onSort($event)"
  (action)="onAction($event)">
  <ng-template appDataTableCell="produto" let-row>
    <strong>{{ row.nome }}</strong>
  </ng-template>
</app-data-table>
```

## Contratos

- `columns`: define chave, label, largura, alinhamento e se a coluna emite sort.
- `filters`: aceita inicialmente `select` e `multi-select`; novos tipos devem nascer de casos reais.
- `filterState`: estado controlado pela tela/container.
- `search`: busca textual com debounce; o componente apenas emite o valor.
- `pagination` e `sort`: preparados para backend; a tela decide buscar novamente.
- `actions`: menu por linha com `visible` e `disabled` opcionais; a tabela só emite `{ action, row }`.
- `appDataTableCell`: permite conteúdo customizado por coluna sem `switch` de domínio.

Regra de evolução: este componente deve crescer conforme novas listagens reais exigirem recursos como seleção, ações em lote, filtros de data ou colunas configuráveis por usuário. Não duplicar outro componente de tabela para esses casos.
