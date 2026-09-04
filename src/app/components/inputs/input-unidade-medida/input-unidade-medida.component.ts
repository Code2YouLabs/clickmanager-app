import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl } from '@angular/forms';

import { InputOptionsComponent } from '../input-options/input-options.component';

export interface UnidadeMedidaOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-input-unidade-medida',
  standalone: true,
  imports: [CommonModule, InputOptionsComponent],
  template: `
    <app-input-options
      [control]="control"
      [label]="label"
      [placeholder]="placeholder"
      [options]="options"
      labelKey="label"
      valueKey="value"
      [showNull]="false" />
  `
})
export class InputUnidadeMedidaComponent {
  @Input() control!: FormControl;
  @Input() label = 'Unidade de Medida';
  @Input() placeholder = '- Selecione -';
  @Input() options: UnidadeMedidaOption[] = [];
}
