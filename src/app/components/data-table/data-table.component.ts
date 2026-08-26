import { CommonModule } from '@angular/common';
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
import { DataTableCellDirective } from './data-table-cell.directive';
import {
  DataTableAction,
  DataTableActionEvent,
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
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
  @Input() sort: DataTableSort = { active: '', direction: '' };
  @Input() emptyState: DataTableEmptyState = {};
  @Input() rowKey: keyof T | string | ((row: T) => unknown) = 'id';

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

  private readonly destroy$ = new Subject<void>();
  private searchChanges$ = new Subject<string>();
  private searchInitialized = false;

  ngAfterContentInit(): void {
    this.rebuildTemplateMap();
    this.cellTemplates?.changes.pipe(takeUntil(this.destroy$)).subscribe(() => this.rebuildTemplateMap());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns'] || changes['actions']) {
      this.displayedColumns = [...this.columns.map((column) => column.key), ...(this.actions.length ? ['__actions'] : [])];
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

  visibleActions(row: T): DataTableAction<T>[] {
    return this.actions.filter((item) => item.visible ? item.visible(row) : true);
  }

  isActionDisabled(row: T, tableAction: DataTableAction<T>): boolean {
    return tableAction.disabled ? tableAction.disabled(row) : false;
  }

  cellTemplate(key: string): DataTableCellDirective<T> | undefined {
    return this.templateMap.get(key);
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

  get hasActiveFilters(): boolean {
    return Object.keys(this.withoutEmptyFilters(this.internalFilters)).length > 0;
  }

  get activeFilterCount(): number {
    return Object.values(this.withoutEmptyFilters(this.internalFilters)).reduce<number>((count, value) => {
      return count + (Array.isArray(value) ? value.length : 1);
    }, 0);
  }

  get hasSearchValue(): boolean {
    return this.searchControl.value.trim().length > 0;
  }

  get isFilteredEmpty(): boolean {
    return this.hasSearchValue || this.hasActiveFilters;
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
}
