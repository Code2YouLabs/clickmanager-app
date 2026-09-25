import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { CardHeaderComponent } from '../card-header/card-header.component';

export type PageCardAction = {
  id: string; label: string; disabled?: boolean; pendingLabel?: string;
  color?: 'primary' | 'accent' | 'warn'; primary?: boolean;
} & ({ type: 'submit'; form: string } | { type?: 'button'; form?: never });

@Component({
  selector: 'app-page-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatButtonModule, CardHeaderComponent],
  templateUrl: './page-card.component.html',
  styleUrls: ['./page-card.component.scss'],
})
export class PageCardComponent {
  @Input() saving = false;
  @Input() savingText = 'Salvando...';
  @Input() actionsDisabled = false;
  @Input() headerActionDisabled = false;
  @Input() footerActions: PageCardAction[] = [];
  @Output() footerAction = new EventEmitter<string>();
  onFooterAction(action: PageCardAction): void {
    // Native submit is the only path for submit actions; do not emit a duplicate command.
    if (action.type !== 'submit' && !this.saving && !this.actionsDisabled && !action.disabled) this.footerAction.emit(action.id);
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
