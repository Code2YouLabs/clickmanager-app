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
  imports: [DataTableComponent, DataTableCellDirective],
  template: `
    <app-data-table
      [columns]="columns"
      [data]="data"
      [filters]="filters"
      [filterState]="filterState"
      [search]="search"
      [pagination]="pagination"
      [loading]="loading"
      [actions]="actions"
      [sort]="sort"
      [emptyState]="emptyState"
      (searchChange)="searchValue = $event"
      (filterChange)="lastFilters = $event"
      (clearFilters)="clearCalled = true"
      (pageChange)="lastPage = $event"
      (sortChange)="lastSort = $event"
      (action)="lastAction = $event">
      <ng-template appDataTableCell="name" let-row>
        <span class="custom-name">Produto: {{ row.name }}</span>
      </ng-template>
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
      options: [{ value: 20, label: 'Laminação' }],
    },
  ];
  filterState: DataTableFilterState = {};
  search = { enabled: true, placeholder: 'Buscar produtos', debounceMs: 300 };
  pagination = { pageIndex: 0, pageSize: 10, totalItems: 1, pageSizeOptions: [10, 20] };
  loading = false;
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent, NoopAnimationsModule],
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

  it('emite busca com debounce', fakeAsync(() => {
    table.searchControl.setValue('panfleto');
    tick(299);
    expect(host.searchValue).toBe('');

    tick(1);

    expect(host.searchValue).toBe('panfleto');
  }));

  it('emite filtros e remove valores vazios ao limpar', () => {
    table.onFilterValueChange('materialId', 10);
    table.onFilterValueChange('acabamentoIds', [20]);

    expect(host.lastFilters).toEqual({ materialId: 10, acabamentoIds: [20] });

    table.onClearFilters();

    expect(host.clearCalled).toBeTrue();
    expect(host.lastFilters).toEqual({});
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
});
