import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-input-options',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './input-options.component.html'
})
export class InputOptionsComponent {
  @Input() control!: FormControl;
  @Input() label: string = 'Selecione uma opção';
  @Input() placeholder: string = '- Selecione -';
  @Input() options: any[] = [];
  @Input() labelKey: string = 'nome';
  @Input() valueKey: string = 'id';
  @Input() showNull: boolean = true;
  @Input() nullLabel: string = '-- Selecione --';
  @Input() disabled: boolean = false;
  @Input() createLabel: string | null = null;
  @Input() createDisabled: boolean = false;
  @Output() createClick = new EventEmitter<void>();

  get isRequired(): boolean {
    return this.control?.validator?.({} as any)?.['required'] ?? false;
  }

  asLabel(opt: any): string {
    if (opt == null) return '';
    if (typeof opt === 'string' || typeof opt === 'number') return String(opt);
    return opt?.[this.labelKey] ?? '';
  }

  asValue(opt: any): any {
    if (opt == null) return null;
    if (typeof opt === 'string' || typeof opt === 'number') return opt;
    return opt?.[this.valueKey] ?? opt;
  }

  onCreateClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.createDisabled) {
      this.createClick.emit();
    }
  }

  errorMessage(): string {
    if (this.control.hasError('required')) {
      return 'Campo obrigatório';
    }
    return 'Valor inválido';
  }
}
