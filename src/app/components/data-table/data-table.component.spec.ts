import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';
import { DataTableItemDirective } from './data-table-item.directive';
import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { DataTableCellDirective } from './data-table-cell.directive';
import { DataTableComponent } from './data-table.component';
import { DataTableActionEvent, DataTableFilterState } from './data-table.models';

interface TestRow extends Record<string, unknown> {
  id: number;
  name: string;
  status: string;
}

@Component({
  standalone: true,
  imports: [DataTableComponent, DataTableCellDirective, DataTableItemDirective],
  template: `
    <app-data-table
      [columns]="columns"
      [data]="data"
      [filters]="filters"
      [filterState]="filterState"
      [search]="search"
      [pagination]="pagination"
      [loading]="loading" [refreshing]="refreshing" [error]="error" [forbidden]="forbidden"
      [expandable]="expandable" (retry)="retries = retries + 1"
      [actions]="actions"
      [sort]="sort"
      [emptyState]="emptyState"
      filtersLabel="Filtros"
      clearFiltersLabel="Limpar filtros"
      (searchChange)="searchValue = $event"
      (filterChange)="lastFilters = $event"
      (clearFilters)="clearCalled = true"
      (pageChange)="lastPage = $event"
      (sortChange)="lastSort = $event"
      (action)="lastAction = $event">
      <ng-template appDataTableCell="name" let-row>
        <span class="custom-name">Produto: {{ row.name }}</span>
      </ng-template>
      <button data-table-toolbar-actions>Importar</button>
      <ng-template appDataTableCell="__expandedDetail" let-row><span class="details">Detalhe {{ row.name }}</span></ng-template>
      @if (mobile) {
        <ng-template [appDataTableItem]="data" let-row let-actions="actions" let-emit="emitAction" let-toggle="toggle" let-expanded="expanded">
          <span class="mobile-name">{{ row.name }}</span>
          @for (action of actions; track action.id) {
            <button class="mobile-action" [disabled]="action.disabled?.(row)" (click)="emit(row, action.id)">{{ action.label }}</button>
          }
          <button class="mobile-expand" (click)="toggle(row)">{{ expanded ? 'Recolher' : 'Expandir' }}</button>
        </ng-template>
      }
    </app-data-table>
  `,
})
class HostComponent {
  columns = [
    { key: 'name', label: 'Nome', sortable: true },
    { key: 'status', label: 'Status' },
  ];
  data: TestRow[] = [{ id: 1, name: 'Panfleto', status: 'Ativo' }];
  filters = [
    {
      key: 'materialId',
      label: 'Material',
      type: 'select' as const,
      options: [{ value: 10, label: 'Couchê 150g' }],
    },
    {
      key: 'acabamentoIds',
      label: 'Acabamentos',
      type: 'multi-select' as const,
      options: [
        { value: 20, label: 'Laminação' },
        { value: 30, label: 'Verniz' },
      ],
    },
  ];
  filterState: DataTableFilterState = {};
  search = { enabled: true, label: 'Buscar produtos', placeholder: 'Buscar por nome', debounceMs: 300 };
  pagination = { pageIndex: 0, pageSize: 10, totalItems: 1, pageSizeOptions: [10, 20] };
  loading = false;
  refreshing = false;
  error: string | null = null;
  forbidden = false;
  expandable = false;
  mobile = false;
  retries = 0;
  sort: Sort = { active: '', direction: '' };
  actions = [
    { id: 'edit', label: 'Editar', icon: 'edit' },
    { id: 'delete', label: 'Excluir', icon: 'delete', visible: (row: TestRow) => row.status === 'Ativo' },
    { id: 'archive', label: 'Arquivar', icon: 'archive', disabled: () => true },
  ];
  emptyState = {
    title: 'Nenhum cadastro',
    description: 'Cadastre um item.',
    filteredTitle: 'Nenhum resultado',
    filteredDescription: 'Altere os filtros.',
  };

  searchValue = '';
  lastFilters: DataTableFilterState | null = null;
  clearCalled = false;
  lastPage: PageEvent | null = null;
  lastSort: Sort | null = null;
  lastAction: DataTableActionEvent<TestRow> | null = null;
}

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let table: DataTableComponent<TestRow>;
  let viewport: BehaviorSubject<{ matches: boolean; breakpoints: Record<string, boolean> }>;

  beforeEach(() => {
    viewport = new BehaviorSubject<{ matches: boolean; breakpoints: Record<string, boolean> }>({ matches: false, breakpoints: {} });
    TestBed.configureTestingModule({
      imports: [HostComponent, NoopAnimationsModule],
      providers: [{ provide: BreakpointObserver, useValue: { observe: () => viewport } }],
    });

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    table = fixture.debugElement.children[0].componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renderiza colunas, dados e template customizado', () => {
    expect(fixture.nativeElement.textContent).toContain('Nome');
    expect(fixture.nativeElement.textContent).toContain('Status');
    expect(fixture.nativeElement.querySelector('.custom-name')?.textContent).toContain('Produto: Panfleto');
  });

  it('renderiza busca e filtros dentro do section card padrao', () => {
    expect(fixture.nativeElement.querySelector('app-section-card.data-table-toolbar-card')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-section-card.data-table-toolbar-card--compact')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.section-card__title')?.textContent).toContain('Buscar produtos');
    expect(fixture.nativeElement.querySelector('mat-divider')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Filtros');
    expect(fixture.nativeElement.querySelector('.data-table-toolbar__search')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.data-table-toolbar__filter-toggle')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.data-table__header-row')).toBeTruthy();
  });

  it('emite busca com debounce', fakeAsync(() => {
    table.searchControl.setValue('panfleto');
    tick(299);
    expect(host.searchValue).toBe('');

    tick(1);

    expect(host.searchValue).toBe('panfleto');
  }));

  it('emite filtros e remove valores vazios ao limpar', () => {
    table.onFilterValueChange('materialId', 10);
    table.onFilterValueChange('acabamentoIds', [20, 30]);
    fixture.detectChanges();

    expect(host.lastFilters).toEqual({ materialId: 10, acabamentoIds: [20, 30] });
    expect(fixture.nativeElement.textContent).toContain('Filtros (3)');
    expect(fixture.nativeElement.textContent).toContain('Limpar filtros');
    expect(fixture.nativeElement.textContent).toContain('Material: Couchê 150g');
    expect(fixture.nativeElement.textContent).toContain('Acabamentos: Laminação');
    expect(fixture.nativeElement.textContent).toContain('Acabamentos: Verniz');
    expect(fixture.nativeElement.querySelector('app-section-card.data-table-toolbar-card--has-active')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-section-card.data-table-toolbar-card--compact')).toBeFalsy();

    table.onRemoveFilterChip(table.activeFilterChips[1]);
    fixture.detectChanges();

    expect(host.lastFilters).toEqual({ materialId: 10, acabamentoIds: [30] });
    expect(fixture.nativeElement.textContent).not.toContain('Acabamentos: Laminação');
    expect(fixture.nativeElement.textContent).toContain('Acabamentos: Verniz');

    table.onClearFilters();
    fixture.detectChanges();

    expect(host.clearCalled).toBeTrue();
    expect(host.lastFilters).toEqual({});
    expect(fixture.nativeElement.textContent).not.toContain('Filtros (2)');
    expect(fixture.nativeElement.textContent).not.toContain('Limpar filtros');
  });

  it('mantem multi-select com valor em array mesmo se estado externo vier escalar', () => {
    host.filterState = { acabamentoIds: 20 };
    fixture.detectChanges();

    expect(table.selectedFilterValue(host.filters[1])).toEqual([20]);
    expect(table.activeFilterChips.map((chip) => chip.optionLabel)).toEqual(['Laminação']);
  });

  it('exibe filtros dentro do accordion quando expandido', () => {
    const toggle = fixture.nativeElement.querySelector('.data-table-toolbar__filter-toggle') as HTMLElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    table.toggleFilters();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('.data-table-toolbar__filter')).toHaveSize(2);
  });

  it('emite sort e paginacao para o container', () => {
    table.onSortChange({ active: 'name', direction: 'asc' });
    table.onPageChange({ pageIndex: 1, pageSize: 20, length: 30 });

    expect(host.lastSort).toEqual({ active: 'name', direction: 'asc' });
    expect(host.lastPage?.pageIndex).toBe(1);
    expect(host.lastPage?.pageSize).toBe(20);
  });

  it('emite acoes visiveis e respeita disabled', () => {
    const row = host.data[0];

    table.emitAction(row, host.actions[0]);
    expect(host.lastAction).toEqual({ action: 'edit', row });

    table.emitAction(row, host.actions[2]);
    expect(host.lastAction).toEqual({ action: 'edit', row });
    expect(table.visibleActions({ ...row, status: 'Inativo' })).toHaveSize(2);
  });

  it('exibe loading e empty state filtrado', () => {
    host.loading = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.data-table-loading')).toBeTruthy();

    host.loading = false;
    host.data = [];
    table.searchControl.setValue('sem resultado');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhum resultado');
    expect(fixture.nativeElement.textContent).toContain('Altere os filtros.');
  });
  it('prioriza forbidden, loading inicial e erro antes de vazio e paginacao', () => {
    host.data = []; host.error = 'Falha de conexão'; host.loading = true; host.forbidden = true; fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(fixture.nativeElement.querySelector('mat-paginator')).toBeNull();
    expect(fixture.nativeElement.querySelector('.data-table-loading')).toBeNull();
    host.forbidden = false; fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carregando registros');
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull();
    host.loading = false; fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Falha de conexão');
    expect(fixture.nativeElement.textContent).not.toContain('Nenhum cadastro');
    fixture.nativeElement.querySelector('[role=alert] button').click(); expect(host.retries).toBe(1);
  });
  it('mantem dados durante refresh e erro de atualizacao', () => {
    host.refreshing = true; fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.custom-name').textContent).toContain('Panfleto');
    expect(fixture.nativeElement.textContent).toContain('Atualizando registros');
    host.refreshing = false; host.error = 'Tente novamente'; fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.custom-name')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível atualizar');
    expect(fixture.nativeElement.querySelector('mat-paginator')).toBeTruthy();
  });
  it('preserva false e zero e remove somente filtros vazios no contrato legado', () => {
    table.onFilterValueChange('active', false); table.onFilterValueChange('number', 0); table.onFilterValueChange('all', null);
    expect(host.lastFilters).toEqual({ active: false, number: 0 });
  });
  it('projeta toolbar e detalhe expandido sem expor acao invisivel', () => {
    // Expansion is configured before the first table render, as in consumers.
    fixture.destroy();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    host.expandable = true;
    fixture.detectChanges();
    table = fixture.debugElement.children[0].componentInstance;
    table.toggleRow(host.data[0]); fixture.detectChanges();
    expect(table.isExpanded(host.data[0])).toBeTrue();
    expect(fixture.nativeElement.querySelector('.details').textContent).toContain('Panfleto');
    expect(fixture.nativeElement.textContent).toContain('Importar');
    table.emitAction({ ...host.data[0], status: 'Inativo' }, host.actions[1]); expect(host.lastAction).toBeNull();
  });
  it('usa item mobile opcional com mesmos dados, acoes, expansao e paginator', () => {
    host.mobile = true; host.expandable = true; fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    expect(fixture.nativeElement.querySelector('.mobile-name').textContent).toBe('Panfleto');
    expect(fixture.nativeElement.querySelector('mat-paginator')).toBeTruthy();
    fixture.nativeElement.querySelector('.mobile-action').click(); expect(host.lastAction?.action).toBe('edit');
    fixture.nativeElement.querySelector('.mobile-expand').click(); fixture.detectChanges();
    expect(table.isExpanded(host.data[0])).toBeTrue();
    host.forbidden = true; fixture.detectChanges(); expect(fixture.nativeElement.querySelector('.mobile-name')).toBeNull();
  });
  it('mantem tabela no mobile quando nao existe item projetado', () => {
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
  });

});
