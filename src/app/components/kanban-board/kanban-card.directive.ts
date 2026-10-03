import { Directive, TemplateRef } from '@angular/core';

@Directive({
  selector: 'ng-template[appKanbanCard]',
  standalone: true,
})
export class KanbanCardDirective<T = unknown> {
  constructor(public readonly template: TemplateRef<{ $implicit: T; item: T; columnId: string }>) {}
}
