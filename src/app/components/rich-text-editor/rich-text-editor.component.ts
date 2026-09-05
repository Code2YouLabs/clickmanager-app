import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input, OnDestroy, OnInit } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Editor, NgxEditorComponent, NgxEditorMenuComponent, Toolbar } from 'ngx-editor';
import { MaterialModule } from 'src/app/material.module';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, NgxEditorComponent, NgxEditorMenuComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
  template: `
    <div class="rich-editor" [class.rich-editor--disabled]="disabled" [class.rich-editor--error]="!!error">
      <div class="NgxEditor__Wrapper" [style.min-height.px]="minHeight" [style.--rich-editor-min-height.px]="minHeight">
        <ngx-editor-menu [editor]="editor" [toolbar]="toolbar"></ngx-editor-menu>
        <ngx-editor
          [editor]="editor"
          [ngModel]="value"
          [disabled]="disabled"
          [placeholder]="placeholder"
          (ngModelChange)="onValueChange($event)"
          (blur)="onTouched()">
        </ngx-editor>
      </div>
    </div>
    <div class="rich-editor__footer">
      <span class="error" *ngIf="error">{{ error }}</span>
      <span class="counter" *ngIf="maxLength">{{ plainTextLength }} / {{ maxLength }}</span>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .rich-editor {
      border: 1px solid #d7dde4;
      border-radius: 8px;
      background: #fff;
      overflow: hidden;
    }
    .rich-editor--error { border-color: #d32f2f; }
    .rich-editor--disabled { opacity: .7; background: #f8fafc; }
    :host ::ng-deep .NgxEditor__Wrapper {
      border: 0;
      border-radius: 8px;
      overflow: hidden;
    }
    :host ::ng-deep .NgxEditor__MenuBar {
      border-bottom: 1px solid #e5eaef;
      background: #f8fafc;
      flex-wrap: wrap;
    }
    :host ::ng-deep .NgxEditor {
      border: 0;
      min-height: inherit;
      color: #263238;
    }
    :host ::ng-deep .NgxEditor__Content {
      min-height: calc(var(--rich-editor-min-height, 180px) - 44px);
      padding: 12px 14px;
      line-height: 1.55;
    }
    .rich-editor__footer {
      min-height: 22px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 4px;
      font-size: 12px;
      color: #6b7280;
    }
    .error { color: #d32f2f; }
    .counter { margin-left: auto; }
  `],
})
export class RichTextEditorComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @Input() placeholder = 'Digite o conteudo';
  @Input() minHeight = 180;
  @Input() maxLength?: number;
  @Input() error?: string | null;

  editor!: Editor;
  disabled = false;
  plainTextLength = 0;
  value = '';
  toolbar: Toolbar = [
    ['bold', 'italic'],
    ['underline'],
    ['ordered_list', 'bullet_list'],
    [{ heading: ['h2', 'h3', 'h4', 'h5', 'h6'] }],
    ['link'],
    ['text_color', 'background_color'],
    ['align_left', 'align_center', 'align_right', 'align_justify'],
  ];
  private onChange: (value: string | null) => void = () => {};
  onTouched: () => void = () => {};

  ngOnInit(): void {
    this.editor = new Editor();
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }

  writeValue(value: string | null): void {
    this.value = value || '';
    this.updateCounter(this.value);
  }

  registerOnChange(fn: (value: string | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onValueChange(value: string): void {
    const html = value || '';
    this.value = html;
    this.updateCounter(html);
    this.onChange(html.trim() ? html : null);
  }

  private updateCounter(value: string): void {
    const doc = new DOMParser().parseFromString(value || '', 'text/html');
    this.plainTextLength = (doc.body.textContent || '').trim().length;
  }
}
