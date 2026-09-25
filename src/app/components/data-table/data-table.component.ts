import { CommonModule } from '@angular/common';
import { animate, state, style, transition, trigger } from '@angular/animations';
import {
  AfterContentInit,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Subject, takeUntil } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import { ListFilterBarComponent, ListFilterChip } from '../list-filter-bar/list-filter-bar.component';
import { BreakpointObserver } from '@angular/cdk/layout';
import { DataTableItemDirective } from './data-table-item.directive';
import { DataTableCellDirective } from './data-table-cell.directive';
import {
  DataTableAction,
  DataTableActionEvent,
  DataTableActionsMode,
  DataTableColumn,
  DataTableEmptyState,
  DataTableFilter,
  DataTableFilterState,
  DataTableFilterValue,
  DataTablePagination,
  DataTableSearchConfig,
  DataTableSort,
} from './data-table.models';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialModule, ListFilterBarComponent],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0', visibility: 'hidden' })),
      state('expanded', style({ height: '*', visibility: 'visible' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class DataTableComponent<T = unknown>
  implements AfterContentInit, OnChanges, OnDestroy {

  @Input() columns: DataTableColumn<T>[] = [];
  @Input() data: T[] = [];
  @Input() filters: DataTableFilter[] = [];
  @Input() filterState: DataTableFilterState = {};
  @Input() search: DataTableSearchConfig = { enabled: false };
  @Input() pagination: DataTablePagination | null = null;
  @Input() loading = false;
  @Input() showTable = true;
  @Input() refreshing = false;
  @Input() error: string | null = null;
  @Input() forbidden = false;
  @Input() forbiddenMessage = 'Você não possui permissão para visualizar este conteúdo.';
  @Input() retryEnabled = true;
  @Input() hasCustomFilters = false;
  @Input() filtered = false;
  @Input() tableLabel = 'Resultados';
  @Output() retry = new EventEmitter<void>();
  @Input() actions: DataTableAction<T>[] = [];
  @Input() actionsMode: DataTableActionsMode = 'menu';
  @Input() expandable = false;
  @Input() expandOnRowClick = false;
  @Input() expandAriaLabel = 'Expandir linha';
  @Input() sort: DataTableSort = { active: '', direction: '' };
  @Input() emptyState: DataTableEmptyState = {};
  @Input() rowKey: keyof T | string | ((row: T) => unknown) = 'id';
  @Input() filtersLabel = 'Filtros';
  @Input() clearFiltersLabel = 'Limpar filtros';

  @Output() searchChange = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<DataTableFilterState>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() sortChange = new EventEmitter<Sort>();
  @Output() action = new EventEmitter<DataTableActionEvent<T>>();

  @ViewChild(ListFilterBarComponent) filterBar?: ListFilterBarComponent;
  @ContentChildren(DataTableItemDirective) itemTemplates?: QueryList<DataTableItemDirective<T>>;
  private readonly breakpoints = inject(BreakpointObserver);
  isMobile = false;
  reducedMotion = false;

  @ContentChildren(DataTableCellDirective) cellTemplates?: QueryList<DataTableCellDirective<T>>;

  readonly searchControl = new FormControl('', { nonNullable: true });
  displayedColumns: string[] = [];
  templateMap = new Map<string, DataTableCellDirective<T>>();
  expandedRow: T | null = null;
  private currentFilters: DataTableFilterState = {};

  private readonly destroy$ = new Subject<void>();
  constructor() {
    this.breakpoints.observe(['(max-width: 760px)', '(prefers-reduced-motion: reduce)']).pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.isMobile = result.breakpoints['(max-width: 760px)'] ?? result.matches;
        this.reducedMotion = result.breakpoints['(prefers-reduced-motion: reduce)'] ?? false;
      });
  }
  get mobileTemplate(): DataTableItemDirective<T> | undefined { return this.itemTemplates?.first; }
  get useMobileItems(): boolean { return this.isMobile && !!this.mobileTemplate; }
  get busy(): boolean { return this.loading || this.refreshing; }
  get initialLoading(): boolean { return this.busy && !this.data.length; }
  get hasBlockingError(): boolean { return !!this.error && !this.data.length; }
  get canShowContent(): boolean { return !this.forbidden && !this.initialLoading && !this.hasBlockingError; }
  get internalFilters(): DataTableFilterState { return this.filterBar?.internalFilters || this.filterState; }
  get filtersExpanded(): boolean { return this.filterBar?.filtersExpanded || false; }
  get activeFilterChips(): ListFilterChip[] { return this.filterBar?.activeFilterChips || []; }
  get hasActiveFilters(): boolean {
    return Object.values(this.currentFilters).some(value => value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0));
  }
  get isFilteredEmpty(): boolean { return this.filtered || this.searchControl.value.trim().length > 0 || this.hasActiveFilters; }
  onSearch(value: string): void { this.searchChange.emit(value); }
  onFilterStateChange(value: DataTableFilterState): void {
    // Preserve the existing DataTable contract: null/empty clear a filter; false and zero survive.
    this.currentFilters = { ...value };
    this.filterChange.emit(Object.fromEntries(Object.entries(value).filter(([, item]) =>
      item !== null && item !== undefined && item !== '' && (!Array.isArray(item) || item.length > 0))));
  }
  onFilterValueChange(key: string, value: DataTableFilterValue): void { this.filterBar?.onFilterValueChange(key, value); }
  onClearFilters(): void { this.filterBar?.onClearFilters(); }
  onRemoveFilterChip(chip: ListFilterChip): void { this.filterBar?.onRemoveFilterChip(chip); }
  toggleFilters(): void { this.filterBar?.toggleFilters(); }
  selectedFilterValue(filter: DataTableFilter): DataTableFilterValue { return this.filterBar?.selectedFilterValue(filter) ?? null; }
  readonly emitItemAction = (row: T, actionId: string): void => {
    const action = this.actions.find(item => item.id === actionId);
    if (action) this.emitAction(row, action);
  };
  readonly toggleItem = (row: T): void => this.toggleRow(row);

  ngAfterContentInit(): void {
    this.rebuildTemplateMap();
    this.cellTemplates?.changes.pipe(takeUntil(this.destroy$)).subscribe(() => this.rebuildTemplateMap());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filterState']) this.currentFilters = { ...this.filterState };
    if (changes['columns'] || changes['actions'] || changes['expandable']) {
      this.displayedColumns = [
        ...this.columns.map((column) => column.key),
        ...(this.actions.length || this.expandable ? ['__actions'] : []),
      ];
    }

    if (changes['search'] && changes['search'].currentValue?.value !== changes['search'].previousValue?.value) {
      this.searchControl.setValue(this.search?.value ?? '', { emitEvent: false });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPageChange(event: PageEvent): void {
    this.pageChange.emit(event);
  }

  onSortChange(event: Sort): void {
    this.sortChange.emit(event);
  }

  emitAction(row: T, tableAction: DataTableAction<T>): void {
    if (this.forbidden || this.isActionDisabled(row, tableAction) || (tableAction.visible && !tableAction.visible(row))) {
      return;
    }
    this.action.emit({ action: tableAction.id, row });
  }

  toggleRow(row: T, event?: Event): void {
    event?.stopPropagation();
    if (!this.expandable) return;
    this.expandedRow = this.isExpanded(row) ? null : row;
  }

  onRowClick(row: T): void {
    if (this.expandOnRowClick) {
      this.toggleRow(row);
    }
  }

  isExpanded(row: T): boolean {
    return this.expandedRow === row;
  }

  visibleActions(row: T): DataTableAction<T>[] {
    return this.actions.filter((item) => item.visible ? item.visible(row) : true);
  }

  isActionDisabled(row: T, tableAction: DataTableAction<T>): boolean {
    return tableAction.disabled ? tableAction.disabled(row) : false;
  }

  cellTemplate(key: string): DataTableCellDirective<T> | undefined {
    return this.templateMap.get(key);
  }

  get expandedTemplate(): DataTableCellDirective<T> | undefined {
    return this.templateMap.get('__expandedDetail');
  }

  cellValue(row: T, column: DataTableColumn<T>): unknown {
    if (column.value) {
      return column.value(row);
    }
    return (row as Record<string, unknown>)[column.key];
  }

  columnAlignClass(column: DataTableColumn<T>): string {
    return column.align ? `data-table__cell--${column.align}` : '';
  }

  trackByRow = (_index: number, row: T): unknown => {
    return typeof this.rowKey === 'function' ? this.rowKey(row) : (row as Record<string, unknown>)[this.rowKey as string];
  };

  private rebuildTemplateMap(): void {
    this.templateMap.clear();
    this.cellTemplates?.forEach((template) => {
      if (template.key) {
        this.templateMap.set(template.key, template);
      }
    });
  }

}
