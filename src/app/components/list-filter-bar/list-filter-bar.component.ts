import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog, MatDialogRef, MatDialogState } from '@angular/material/dialog';
import { fromEvent, merge, Subject, takeUntil } from 'rxjs';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
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
export interface ListFilterTemplateContext {
  $implicit: DataTableFilterState;
  change: (key: string, value: DataTableFilterValue) => void;
}

export interface ListFilterChip { filterKey: string; filterLabel: string; value: string | number | boolean; optionLabel: string; }

@Component({
  selector: 'app-list-filter-bar', standalone: true,
  imports: [CommonModule, MaterialModule, SectionCardComponent, InputPesquisaComponent],
  templateUrl: './list-filter-bar.component.html', styleUrl: './list-filter-bar.component.scss',
})
export class ListFilterBarComponent implements OnChanges, OnDestroy {
  @Input() mobileCompact = true;
  // 'sheet' remains an API alias for consumers; the only overlay presentation is the full-screen panel.
  @Input() mobileFilterPresentation: 'sheet' | 'inline' = 'sheet';
  @Input() customFilterTemplate?: TemplateRef<ListFilterTemplateContext>;
  readonly changeCustomFilter = (key: string, value: DataTableFilterValue): void => this.onFieldChange(key, value);
  get customFilterContext(): ListFilterTemplateContext {
    return { $implicit: this.mobileFiltersOpen ? this.draftFilters : this.internalFilters, change: this.changeCustomFilter };
  }
  @Input() mobileShowTitle = false;
  @ViewChild('mobileFilterTrigger', { read: ElementRef }) private mobileFilterTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('mobileFilterPanel', { static: true }) private mobileFilterPanel!: TemplateRef<unknown>;
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly destroy$ = new Subject<void>();
  private panelRef: MatDialogRef<unknown> | null = null;
  private draftFilters: DataTableFilterState = {};
  private draftCleared = false;
  private readonly draftKeys = new Set<string>();
  isMobile = false;
  get useMobilePanel(): boolean { return this.isMobile && this.mobileFilterPresentation === 'sheet'; }
  get mobileFiltersOpen(): boolean { return !!this.panelRef; }
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
    if (!this.useMobilePanel || this.panelRef) return;
    this.draftFilters = this.copyState(this.internalFilters); this.draftKeys.clear(); this.draftCleared = false;
    this.mobileFilterTrigger?.nativeElement.focus({ preventScroll: true });
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ref = this.dialog.open(this.mobileFilterPanel, {
      viewContainerRef: this.viewContainerRef, panelClass: 'list-filter-mobile-panel', ariaLabel: this.filtersLabel,
      autoFocus: 'first-tabbable', delayFocusTrap: false, restoreFocus: true, closeOnNavigation: true,
      width: '100vw', maxWidth: '100vw', height: '100dvh', maxHeight: '100dvh',
      position: { top: '0', right: '0' }, enterAnimationDuration: reducedMotion ? 0 : 360, exitAnimationDuration: reducedMotion ? 0 : 300,
    });
    this.panelRef = ref;
    // Virtual keyboards resize the visual viewport even when the layout viewport stays unchanged.
    const viewport = window.visualViewport;
    if (viewport) {
      const fitViewport = () => ref.updateSize('100vw', `${viewport.height}px`).updatePosition({ top: `${viewport.offsetTop}px`, right: '0' });
      fitViewport();
      merge(fromEvent(viewport, 'resize'), fromEvent(viewport, 'scroll'))
        .pipe(takeUntil(merge(ref.afterClosed(), this.destroy$))).subscribe(fitViewport);
    }
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.panelRef === ref) { this.panelRef = null; this.draftKeys.clear(); }
    });
  }
  closeMobileFilters(): void {
    this.panelRef?.close();
  }
  applyMobileFilters(): void {
    if (!this.panelRef || this.panelRef.getState() !== MatDialogState.OPEN) return;
    const changed = [...this.draftKeys];
    const cleared = this.draftCleared;
    const next = this.copyState(this.draftFilters);
    this.closeMobileFilters(); this.internalFilters = next;
    if (!changed.length && !cleared) return;
    if (cleared) this.clear.emit();
    if (this.presentation === 'flat') {
      changed.forEach(key => { const value = next[key]; if (typeof value === 'string') this.filterChange.emit({ key, value }); });
    }
    this.emitState();
  }
  clearMobileFilters(): void {
    if (!this.mobileFiltersOpen) return;
    Object.keys(this.draftFilters).forEach(key => this.draftKeys.add(key));
    this.draftFilters = {}; this.draftCleared = true;
  }
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
    if (changes['filterState'] || changes['filters'] || changes['customFilterTemplate']) {
      this.internalFilters = this.presentation === 'flat'
        ? { ...(this.customFilterTemplate ? this.filterState : {}), ...Object.fromEntries(this.filters.map(filter => [filter.key, 'value' in filter ? filter.value : this.filterState[filter.key]])) }
        : { ...this.filterState };
      if (this.mobileFiltersOpen) {
        const pending = Object.fromEntries([...this.draftKeys].map(key => [key, this.draftFilters[key]]));
        this.draftFilters = this.draftCleared ? { ...this.draftFilters } : { ...this.copyState(this.internalFilters), ...pending };
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
    if (this.useMobilePanel) {
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
