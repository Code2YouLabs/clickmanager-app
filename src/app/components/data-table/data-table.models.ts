import { Sort } from '@angular/material/sort';

export type DataTableAlign = 'start' | 'center' | 'end';
export type DataTableFilterType = 'select' | 'multi-select';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  sortKey?: string;
  width?: string;
  align?: DataTableAlign;
  value?: (row: T) => unknown;
}

export interface DataTableFilterOption {
  value: string | number | boolean;
  label: string;
  disabled?: boolean;
}

export interface DataTableFilter {
  key: string;
  label: string;
  type: DataTableFilterType;
  placeholder?: string;
  width?: string;
  options: DataTableFilterOption[];
}

export interface DataTableSearchConfig {
  enabled: boolean;
  label?: string;
  placeholder?: string;
  debounceMs?: number;
  value?: string;
}

export interface DataTablePagination {
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
}

export interface DataTableAction<T> {
  id: string;
  label: string;
  icon?: string;
  color?: 'primary' | 'accent' | 'warn';
  visible?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
}

export interface DataTableActionEvent<T> {
  action: string;
  row: T;
}

export type DataTableActionsMode = 'menu' | 'buttons';

export interface DataTableEmptyState {
  title?: string;
  description?: string;
  filteredTitle?: string;
  filteredDescription?: string;
}

export type DataTableFilterValue = string | number | boolean | Array<string | number | boolean> | null;
export type DataTableFilterState = Record<string, DataTableFilterValue>;
export type DataTableSort = Sort;
