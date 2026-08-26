import { Directive, Input, TemplateRef } from '@angular/core';

@Directive({
  selector: 'ng-template[appDataTableCell]',
  standalone: true,
})
export class DataTableCellDirective<T = unknown> {
  @Input('appDataTableCell') key = '';

  constructor(public readonly template: TemplateRef<{ $implicit: T; row: T }>) {}
}
