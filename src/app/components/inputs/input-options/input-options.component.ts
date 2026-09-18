import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
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
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './input-options.component.html',
  encapsulation: ViewEncapsulation.None,
  styles: [`
    .input-options__trigger {
      display: block;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .input-options-panel .input-options__search-option {
      height: auto;
      min-height: 52px;
      padding: 8px 12px;
      cursor: default;
    }

    .input-options-panel .input-options__search-option.mdc-list-item--selected {
      background: transparent;
    }

    .input-options__search-field {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #d6e0ee;
      border-radius: 8px;
      outline: none;
      padding: 8px 10px;
      color: #1f2937;
      font: inherit;
      background: #fff;
    }

    .input-options__search-field:focus {
      border-color: #2f66e8;
    }

    .input-options-panel .input-options__option {
      height: auto;
      min-height: 48px;
      line-height: 1.25;
    }

    .input-options__option-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      padding-top: 6px;
      padding-bottom: 6px;
    }

    .input-options__option-main,
    .input-options__option-subtitle {
      display: block;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .input-options__option-main {
      color: #1f2937;
      font-size: 0.92rem;
      font-weight: 500;
    }

    .input-options__option-subtitle {
      color: #64748b;
      font-size: 0.78rem;
      font-weight: 400;
    }
  `]
})
export class InputOptionsComponent {
  @Input() control!: FormControl;
  @Input() label: string = 'Selecione uma opção';
  @Input() placeholder: string = '- Selecione -';
  @Input() options: any[] = [];
  @Input() labelKey: string = 'nome';
  @Input() valueKey: string = 'id';
  @Input() showNull: boolean = true;
  @Input() clearable: boolean = false;
  @Input() nullLabel: string = '-- Selecione --';
  @Input() disabled: boolean = false;
  @Input() createLabel: string | null = null;
  @Input() createDisabled: boolean = false;
  @Input() hierarchical: boolean = false;
  @Input() searchable: boolean = false;
  @Input() optionSubtitleKey: string = 'subtitle';
  @Input() optionLevelKey: string = 'level';
  @Input() optionPathKey: string = 'path';
  @Input() selectedLabelKey: string | null = null;
  @Input() searchKeys: string[] = [];
  @Output() createClick = new EventEmitter<void>();

  searchControl = new FormControl('', { nonNullable: true });

  get isRequired(): boolean {
    return this.control?.validator?.({} as any)?.['required'] ?? false;
  }

  get nullOptionDisabled(): boolean {
    return !this.clearable || this.isRequired || this.disabled;
  }

  get panelClass(): string | string[] {
    return this.hierarchical || this.isSearchEnabled ? ['input-options-panel'] : [];
  }

  get isSearchEnabled(): boolean {
    return this.searchable || this.hierarchical;
  }

  get filteredOptions(): any[] {
    const term = this.normalize(this.searchControl.value);
    if (!this.isSearchEnabled || !term) {
      return this.options || [];
    }
    return (this.options || []).filter((option) => this.normalize(this.optionSearchText(option)).includes(term));
  }

  get selectedLabel(): string {
    const selected = this.selectedOption();
    if (!selected) return '';
    if (!this.hierarchical) return this.asLabel(selected);
    const explicitKey = this.selectedLabelKey;
    const explicitLabel = explicitKey ? selected?.[explicitKey] : null;
    return explicitLabel || this.optionPath(selected) || this.asLabel(selected);
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

  optionSubtitle(opt: any): string {
    if (!this.hierarchical || opt == null || typeof opt === 'string' || typeof opt === 'number') return '';
    return opt?.[this.optionSubtitleKey] ?? '';
  }

  optionPath(opt: any): string {
    if (opt == null || typeof opt === 'string' || typeof opt === 'number') return '';
    return opt?.[this.optionPathKey] ?? '';
  }

  optionIndent(opt: any): number {
    if (!this.hierarchical || opt == null || typeof opt === 'string' || typeof opt === 'number') return 0;
    const level = Number(opt?.[this.optionLevelKey] ?? 0);
    return Number.isFinite(level) ? Math.min(Math.max(level, 0), 5) * 14 : 0;
  }

  onSelectOpened(opened: boolean): void {
    if (!opened) {
      this.searchControl.setValue('', { emitEvent: false });
    }
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

  private selectedOption(): any {
    const value = this.control?.value;
    return (this.options || []).find((option) => this.valuesMatch(this.asValue(option), value));
  }

  private valuesMatch(a: any, b: any): boolean {
    return a === b || String(a ?? '') === String(b ?? '');
  }

  private optionSearchText(option: any): string {
    if (option == null) return '';
    if (typeof option === 'string' || typeof option === 'number') return String(option);
    const defaultKeys = [this.labelKey, this.optionSubtitleKey, this.optionPathKey, this.selectedLabelKey].filter(Boolean) as string[];
    return [...new Set([...defaultKeys, ...this.searchKeys])]
      .map((key) => option?.[key])
      .filter((value) => value != null)
      .join(' ');
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
