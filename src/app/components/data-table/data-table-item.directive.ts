import { Directive, Input, TemplateRef } from '@angular/core';
import { DataTableAction } from './data-table.models';

export interface DataTableItemContext<T> {
  $implicit: T;
  row: T;
  actions: DataTableAction<T>[];
  emitAction: (row: T, actionId: string) => void;
  expanded: boolean;
  toggle: (row: T) => void;
}
/** Optional alternate item. Data, actions, states and paginator remain owned by DataTable. */
@Directive({ selector: 'ng-template[appDataTableItem]', standalone: true })
export class DataTableItemDirective<T = unknown> {
  /** Optional data binding is a type witness for strict Angular templates; rendering uses DataTable.data. */
  @Input() appDataTableItem: readonly T[] = [];
  constructor(public readonly template: TemplateRef<DataTableItemContext<T>>) {}
  static ngTemplateContextGuard<T>(_directive: DataTableItemDirective<T>, context: unknown): context is DataTableItemContext<T> { return true; }
}
