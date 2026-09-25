import { Component, ContentChildren, Input, Output, EventEmitter, QueryList } from '@angular/core';
import { FormGroupDirective } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageFormState } from './page-form-state';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { CardHeaderComponent } from '../card-header/card-header.component';

export type PageCardAction = {
  id: string; label: string; icon?: string; disabled?: boolean; pendingLabel?: string;
  color?: 'primary' | 'accent' | 'warn'; primary?: boolean;
} & ({ type: 'submit'; form: string; intent?: never } | { type?: 'button'; form?: never; intent?: 'cancel' });

@Component({
  selector: 'app-page-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatButtonModule, MatIconModule, CardHeaderComponent],
  templateUrl: './page-card.component.html',
  styleUrls: ['./page-card.component.scss'],
})
export class PageCardComponent {
  @Input() saving = false;
  @Input() savingText = 'Salvando...';
  @Input() actionsDisabled = false;
  @Input() headerActionDisabled = false;
  @Input() footerActions: PageCardAction[] = [];
  @Input() formState?: PageFormState<any>;
  @ContentChildren(FormGroupDirective, { descendants: true }) private forms?: QueryList<FormGroupDirective>;
  @Output() footerAction = new EventEmitter<string>();

  /** Cancelar é gerado pelo componente; consumidores só declaram ações de domínio. */
  get resolvedFooterActions(): PageCardAction[] {
    const actions = this.footerActions.filter(action => action.intent !== 'cancel');
    return this.formState
      ? [{ id: 'cancel', label: 'Cancelar', intent: 'cancel' }, ...actions]
      : actions;
  }

  actionDisabled(action: PageCardAction): boolean {
    return this.saving || this.actionsDisabled || !!action.disabled ||
      (action.intent === 'cancel' && !this.formState?.ready);
  }

  onFooterAction(action: PageCardAction): void {
    if (this.actionDisabled(action) || action.type === 'submit') return;
    if (action.intent === 'cancel') {
      this.formState!.reset();
      // Também limpa o estado submitted do Angular, sem submeter ou navegar.
      this.forms?.filter(item => item.form === this.formState!.form)
        .forEach(item => item.resetForm(item.form.getRawValue()));
      return;
    }
    this.footerAction.emit(action.id);
  }
  @Input() titulo: string = '';
  @Input() subtitulo?: string;
  @Input() botaoTexto?: string;
  @Input() botaoIcone: string = 'arrow_back';
  @Input() botaoCor: 'primary' | 'accent' | 'warn' = 'primary';
  @Input() botaoRota?: string | any[];
  @Input() permissao: string | string[] = '';
  @Input() mostrarDivisor: boolean = true;
  @Input() headerDivider?: boolean;
  @Input() contentPadding: boolean = true;
  @Input() showFooter: boolean = false;
  @Input() footerDivider: boolean = true;
  @Input() helpTexto: string = 'Ajuda';
  @Input() helpIcone: string = 'help_outline';
  @Input() helpRota?: string | any[];
  @Input() helpFragment?: string;
  @Input() helpExterno: boolean = false;

  get showHeaderDivider(): boolean {
    return this.headerDivider ?? this.mostrarDivisor;
  }
}
