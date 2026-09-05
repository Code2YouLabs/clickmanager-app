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
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import { SectionCardComponent } from '../section-card/section-card.component';
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

interface DataTableFilterChip {
  filterKey: string;
  filterLabel: string;
  value: string | number | boolean;
  optionLabel: string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialModule, SectionCardComponent],
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

  @ContentChildren(DataTableCellDirective) cellTemplates?: QueryList<DataTableCellDirective<T>>;

  readonly searchControl = new FormControl('', { nonNullable: true });
  displayedColumns: string[] = [];
  templateMap = new Map<string, DataTableCellDirective<T>>();
  internalFilters: DataTableFilterState = {};
  filtersExpanded = false;
  expandedRow: T | null = null;

  private readonly destroy$ = new Subject<void>();
  private searchChanges$ = new Subject<string>();
  private searchInitialized = false;

  ngAfterContentInit(): void {
    this.rebuildTemplateMap();
    this.cellTemplates?.changes.pipe(takeUntil(this.destroy$)).subscribe(() => this.rebuildTemplateMap());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns'] || changes['actions'] || changes['expandable']) {
      this.displayedColumns = [
        ...this.columns.map((column) => column.key),
        ...(this.actions.length || this.expandable ? ['__actions'] : []),
      ];
    }

    if (changes['filterState']) {
      this.internalFilters = { ...(this.filterState || {}) };
    }

    if (changes['search']) {
      this.setupSearchDebounce(this.search?.debounceMs ?? 300);
      this.searchControl.setValue(this.search?.value ?? '', { emitEvent: false });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFilterValueChange(key: string, value: DataTableFilterValue): void {
    this.internalFilters = {
      ...this.internalFilters,
      [key]: this.normalizeFilterValue(value),
    };
    this.filterChange.emit(this.withoutEmptyFilters(this.internalFilters));
  }

  onClearFilters(): void {
    this.internalFilters = {};
    this.clearFilters.emit();
    this.filterChange.emit({});
  }

  onRemoveFilterChip(chip: DataTableFilterChip): void {
    const value = this.internalFilters[chip.filterKey];
    const nextFilters = { ...this.internalFilters };

    if (Array.isArray(value)) {
      const values = value.filter((item) => item !== chip.value);
      if (values.length) {
        nextFilters[chip.filterKey] = values;
      } else {
        delete nextFilters[chip.filterKey];
      }
    } else {
      delete nextFilters[chip.filterKey];
    }

    this.internalFilters = nextFilters;
    this.filterChange.emit(this.withoutEmptyFilters(this.internalFilters));
  }

  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
  }

  onPageChange(event: PageEvent): void {
    this.pageChange.emit(event);
  }

  onSortChange(event: Sort): void {
    this.sortChange.emit(event);
  }

  emitAction(row: T, tableAction: DataTableAction<T>): void {
    if (this.isActionDisabled(row, tableAction)) {
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

  filterWidth(filter: DataTableFilter): string | null {
    return filter.width || null;
  }

  isMultiSelectFilter(filter: DataTableFilter): boolean {
    return filter.type === 'multi-select';
  }

  selectedFilterValue(filter: DataTableFilter): DataTableFilterValue {
    const value = this.internalFilters[filter.key];
    if (this.isMultiSelectFilter(filter)) {
      if (Array.isArray(value)) {
        return value;
      }
      return value === null || value === undefined || value === '' ? [] : [value];
    }
    return value ?? null;
  }

  trackByRow = (_index: number, row: T): unknown => {
    return typeof this.rowKey === 'function' ? this.rowKey(row) : (row as Record<string, unknown>)[this.rowKey as string];
  };

  get hasActiveFilters(): boolean {
    return Object.keys(this.withoutEmptyFilters(this.internalFilters)).length > 0;
  }

  get activeFilterCount(): number {
    return Object.values(this.withoutEmptyFilters(this.internalFilters)).reduce<number>((count, value) => {
      return count + (Array.isArray(value) ? value.length : 1);
    }, 0);
  }

  get activeFilterChips(): DataTableFilterChip[] {
    const normalized = this.withoutEmptyFilters(this.internalFilters);
    return this.filters.flatMap((filter) => {
      const value = normalized[filter.key];
      if (Array.isArray(value)) {
        return value.map((item) => this.toFilterChip(filter, item));
      }
      if (value === null || value === undefined || value === '') {
        return [];
      }
      return [this.toFilterChip(filter, value)];
    });
  }

  get hasSearchValue(): boolean {
    return this.searchControl.value.trim().length > 0;
  }

  get isFilteredEmpty(): boolean {
    return this.hasSearchValue || this.hasActiveFilters;
  }

  get toolbarTitle(): string {
    return this.search.enabled ? (this.search.label || 'Buscar') : this.filtersLabel;
  }

  private setupSearchDebounce(debounceMs: number): void {
    if (this.searchInitialized) {
      return;
    }
    this.searchInitialized = true;
    this.searchControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => this.searchChanges$.next(value));
    this.searchChanges$
      .pipe(debounceTime(debounceMs), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value) => this.searchChange.emit(value.trim()));
  }

  private rebuildTemplateMap(): void {
    this.templateMap.clear();
    this.cellTemplates?.forEach((template) => {
      if (template.key) {
        this.templateMap.set(template.key, template);
      }
    });
  }

  private normalizeFilterValue(value: DataTableFilterValue): DataTableFilterValue {
    if (Array.isArray(value)) {
      return value;
    }
    return value === undefined ? null : value;
  }

  private withoutEmptyFilters(filters: DataTableFilterState): DataTableFilterState {
    return Object.entries(filters || {}).reduce<DataTableFilterState>((acc, [key, value]) => {
      if (value === null || value === undefined || value === '') {
        return acc;
      }
      if (Array.isArray(value) && value.length === 0) {
        return acc;
      }
      acc[key] = value;
      return acc;
    }, {});
  }

  private toFilterChip(filter: DataTableFilter, value: string | number | boolean): DataTableFilterChip {
    return {
      filterKey: filter.key,
      filterLabel: filter.label,
      value,
      optionLabel: filter.options.find((option) => option.value === value)?.label || String(value),
    };
  }
}
