import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';

export interface ViewModeToggleOption<T extends string = string> {
  value: T;
  label: string;
  icon?: string;
  ariaLabel?: string;
}

@Component({
  selector: 'app-view-mode-toggle',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './view-mode-toggle.component.html',
  styleUrl: './view-mode-toggle.component.scss',
})
export class ViewModeToggleComponent<T extends string = string> {
  @Input() value: T | null = null;
  @Input() options: ViewModeToggleOption<T>[] = [];
  @Input() ariaLabel = 'Alternar visualização';

  @Output() valueChange = new EventEmitter<T>();

  onChange(value: T): void {
    if (!value || value === this.value) {
      return;
    }
    this.valueChange.emit(value);
  }
}
