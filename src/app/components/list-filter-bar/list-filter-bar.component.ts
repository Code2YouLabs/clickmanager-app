import { BreakpointObserver } from '@angular/cdk/layout';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { Subject, takeUntil } from 'rxjs';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
import { MobileSheetHeaderComponent } from '../mobile-sheet-header/mobile-sheet-header.component';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, TemplateRef, ViewContainerRef, ElementRef, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { SectionCardComponent } from '../section-card/section-card.component';
import { InputPesquisaComponent } from '../inputs/input-pesquisa/input-pesquisa.component';
import { DataTableFilter, DataTableFilterValue, DataTableFilterState, DataTableSearchConfig } from '../data-table/data-table.models';

// Compatibility types for the existing flat/string filter consumer.
export type ListFilterOption = { value: string; label: string };
export type ListFilterDefinition = { key: string; label: string; value: string; options: ListFilterOption[] };
export type ListFilterChange = { key: string; value: string };
export interface ListFilterChip { filterKey: string; filterLabel: string; value: string | number | boolean; optionLabel: string; }

@Component({
  selector: 'app-list-filter-bar', standalone: true,
  imports: [CommonModule, MaterialModule, SectionCardComponent, InputPesquisaComponent, MobileSheetHeaderComponent],
  templateUrl: './list-filter-bar.component.html', styleUrl: './list-filter-bar.component.scss',
})
export class ListFilterBarComponent implements OnChanges, OnDestroy {
  @Input() mobileCompact = true;
  @Input() mobileFilterPresentation: 'sheet' | 'inline' = 'sheet';
  @Input() mobileShowTitle = false;
  @ViewChild('mobileFilterTrigger', { read: ElementRef }) private mobileFilterTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('mobileFilterSheet', { static: true }) private mobileFilterSheet!: TemplateRef<unknown>;
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly destroy$ = new Subject<void>();
  private sheetRef: MatBottomSheetRef<unknown> | null = null;
  private draftFilters: DataTableFilterState = {};
  private readonly draftKeys = new Set<string>();
  isMobile = false;
  get useMobileSheet(): boolean { return this.isMobile && this.mobileFilterPresentation === 'sheet'; }
  get mobileFiltersOpen(): boolean { return !!this.sheetRef; }
  get hasDraftFilters(): boolean { return Object.keys(this.withoutEmptyFilters(this.draftFilters)).length > 0; }

  constructor() {
    this.breakpoints.observe(MOBILE_FOUNDATION_QUERY).pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.isMobile = state.breakpoints[MOBILE_FOUNDATION_QUERY] ?? state.matches;
      if (!this.isMobile) this.closeMobileFilters();
    });
  }
  ngOnDestroy(): void {
    this.closeMobileFilters(); this.destroy$.next(); this.destroy$.complete();
  }
  private copyState(state: DataTableFilterState): DataTableFilterState {
    return Object.fromEntries(Object.entries(state).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]));
  }
  openMobileFilters(): void {
    if (!this.useMobileSheet || this.sheetRef) return;
    this.draftFilters = this.copyState(this.internalFilters); this.draftKeys.clear();
    this.mobileFilterTrigger?.nativeElement.focus({ preventScroll: true });
    const ref = this.bottomSheet.open(this.mobileFilterSheet, {
      viewContainerRef: this.viewContainerRef, panelClass: 'list-filter-mobile-panel', ariaLabel: this.filtersLabel,
      autoFocus: 'first-tabbable', restoreFocus: true,
    });
    this.sheetRef = ref;
    ref.afterDismissed().pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.sheetRef === ref) { this.sheetRef = null; this.draftKeys.clear(); }
    });
  }
  closeMobileFilters(): void {
    const ref = this.sheetRef; this.sheetRef = null; ref?.dismiss(); this.draftKeys.clear();
  }
  applyMobileFilters(): void {
    if (!this.sheetRef) return;
    const changed = [...this.draftKeys];
    const next = this.copyState(this.draftFilters);
    this.closeMobileFilters(); this.internalFilters = next;
    if (!changed.length) return;
    if (this.presentation === 'flat') {
      changed.forEach(key => { const value = next[key]; if (typeof value === 'string') this.filterChange.emit({ key, value }); });
    }
    this.emitState();
  }
  clearMobileFilters(): void { this.onClearFilters(); this.closeMobileFilters(); }
  onFieldChange(key: string, value: DataTableFilterValue): void {
    if (this.presentation === 'flat') this.onFilterChange(key, value);
    else this.onFilterValueChange(key, value);
  }
  @Input() placeholder = 'Digite para pesquisar...';
  @Input() searchValue = '';
  @Input() showSearchLabel = false;
  @Input() filters: Array<DataTableFilter | ListFilterDefinition> = [];
  @Input() showClear = false;
  @Input() presentation: 'flat' | 'section' = 'flat';
  @Input() search: DataTableSearchConfig = { enabled: true };
  @Input() filterState: DataTableFilterState = {};
  @Input() filtersLabel = 'Filtros';
  @Input() clearFiltersLabel = 'Limpar filtros';
  @Input() hasCustomFilters = false;
  @Input() searchControl = new FormControl('', { nonNullable: true });
  @Output() searchChange = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<ListFilterChange>();
  @Output() stateChange = new EventEmitter<DataTableFilterState>();
  @Output() clear = new EventEmitter<void>();
  internalFilters: DataTableFilterState = {};
  filtersExpanded = false;

  get definitions(): DataTableFilter[] {
    return this.filters.map(filter => ({ ...filter, type: 'type' in filter ? filter.type : 'select' }));
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mobileFilterPresentation'] && this.mobileFilterPresentation === 'inline') this.closeMobileFilters();
    if (changes['filterState'] || changes['filters']) {
      this.internalFilters = this.presentation === 'flat'
        ? Object.fromEntries(this.filters.map(filter => [filter.key, 'value' in filter ? filter.value : this.filterState[filter.key]]))
        : { ...this.filterState };
      if (this.mobileFiltersOpen) {
        const pending = Object.fromEntries([...this.draftKeys].map(key => [key, this.draftFilters[key]]));
        this.draftFilters = { ...this.copyState(this.internalFilters), ...pending };
      }
    }
  }
  onSearchChange(value: string): void { this.searchChange.emit(value || ''); }
  onFilterChange(key: string, value: DataTableFilterValue): void {
    if (!this.mobileFiltersOpen && typeof value === 'string') this.filterChange.emit({ key, value });
    this.onFilterValueChange(key, value);
  }
  private emitState(): void { this.stateChange.emit({ ...this.internalFilters }); }
  get toolbarTitle(): string { return this.search.enabled ? (this.search.label || 'Buscar') : this.filtersLabel; }
  onFilterValueChange(key: string, value: DataTableFilterValue): void {
    if (this.mobileFiltersOpen) {
      this.draftFilters = { ...this.draftFilters, [key]: this.normalizeFilterValue(value) };
      this.draftKeys.add(key); return;
    }
    this.internalFilters = {
      ...this.internalFilters,
      [key]: this.normalizeFilterValue(value),
    };
    this.emitState();
  }

  onClearFilters(): void {
    this.internalFilters = {}; this.draftFilters = {}; this.draftKeys.clear();
    this.clear.emit();
    this.stateChange.emit({});
  }

  onRemoveFilterChip(chip: ListFilterChip): void {
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
    this.emitState();
  }

  toggleFilters(): void {
    if (this.useMobileSheet) {
      if (this.mobileFiltersOpen) this.closeMobileFilters(); else this.openMobileFilters();
      return;
    }
    this.filtersExpanded = !this.filtersExpanded;
  }

  filterWidth(filter: DataTableFilter): string | null {
    return filter.width || null;
  }

  isMultiSelectFilter(filter: DataTableFilter): boolean {
    return filter.type === 'multi-select';
  }

  selectedFilterValue(filter: DataTableFilter): DataTableFilterValue {
    const value = (this.mobileFiltersOpen ? this.draftFilters : this.internalFilters)[filter.key];
    if (this.isMultiSelectFilter(filter)) {
      if (Array.isArray(value)) {
        return value;
      }
      return value === null || value === undefined || value === '' ? [] : [value];
    }
    return value ?? null;
  }

  get hasActiveFilters(): boolean {
    return Object.keys(this.withoutEmptyFilters(this.internalFilters)).length > 0;
  }

  get activeFilterCount(): number {
    return Object.values(this.withoutEmptyFilters(this.internalFilters)).reduce<number>((count, value) => {
      return count + (Array.isArray(value) ? value.length : 1);
    }, 0);
  }

  get activeFilterChips(): ListFilterChip[] {
    const normalized = this.withoutEmptyFilters(this.internalFilters);
    return this.definitions.flatMap((filter) => {
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

  private toFilterChip(filter: DataTableFilter, value: string | number | boolean): ListFilterChip {
    return {
      filterKey: filter.key,
      filterLabel: filter.label,
      value,
      optionLabel: filter.options.find((option) => option.value === value)?.label || String(value),
    };
  }
}
