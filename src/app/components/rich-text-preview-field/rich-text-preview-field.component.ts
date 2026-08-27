import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';

@Component({
  selector: 'app-rich-text-preview-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, RichTextEditorComponent],
  template: `
    <div class="rich-preview-field">
      <div class="rich-preview-field__header">
        <div>
          <label class="rich-preview-field__label">{{ label }}</label>
          <p class="rich-preview-field__hint" *ngIf="hint">{{ hint }}</p>
        </div>
        <button mat-stroked-button type="button" (click)="visualizando = !visualizando">
          <mat-icon>{{ visualizando ? 'visibility_off' : 'visibility' }}</mat-icon>
          {{ visualizando ? 'Ocultar' : 'Visualizar' }}
        </button>
      </div>

      <app-rich-text-editor
        [formControl]="control"
        [placeholder]="placeholder"
        [minHeight]="minHeight"
        [maxLength]="maxLength"
        [error]="error">
      </app-rich-text-editor>

      <div class="rich-preview-field__preview" *ngIf="visualizando" [innerHTML]="previewHtml"></div>
    </div>
  `,
  styles: [`
    .rich-preview-field {
      display: grid;
      gap: 10px;
    }

    .rich-preview-field__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .rich-preview-field__label {
      display: block;
      color: #111827;
      font-weight: 700;
      line-height: 1.25;
    }

    .rich-preview-field__hint {
      margin: 4px 0 0;
      color: #6b7280;
      font-size: 0.86rem;
      line-height: 1.35;
    }

    .rich-preview-field__preview {
      min-height: 92px;
      padding: 12px 14px;
      border: 1px solid #e5eaef;
      border-radius: 8px;
      background: #f8fafc;
      color: #111827;
      line-height: 1.55;
    }

    .rich-preview-field__preview :first-child {
      margin-top: 0;
    }

    .rich-preview-field__preview :last-child {
      margin-bottom: 0;
    }

    @media (max-width: 700px) {
      .rich-preview-field__header {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `],
})
export class RichTextPreviewFieldComponent {
  @Input({ required: true }) control!: FormControl<string | null>;
  @Input() label = 'Texto formatado';
  @Input() hint?: string;
  @Input() placeholder = 'Digite o conteúdo';
  @Input() minHeight = 180;
  @Input() maxLength?: number;
  @Input() error?: string | null;

  visualizando = false;

  get previewHtml(): string {
    return this.control?.value?.trim() || '<p>Nenhum conteúdo informado.</p>';
  }
}
