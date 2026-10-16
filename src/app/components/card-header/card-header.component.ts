import { PageCardPrimaryAction } from '../page-card/page-card-primary-action';
import { TutorialTargetDirective } from 'src/app/shared/tutorial/tutorial-target.directive';
import { NgTemplateOutlet } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { MatDivider } from "@angular/material/divider";

@Component({
  selector: 'app-card-header',
  standalone: true,
  imports: [
    RouterLink,
    NgTemplateOutlet,
    TutorialTargetDirective,
    NgIf,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TemPermissaoDirective,
    MatDivider
],
  templateUrl: './card-header.component.html',
  styleUrls: ['./card-header.component.scss'],
})
export class CardHeaderComponent {
  @Input() mobileCompact = false;
  @Input() titleOnly = false;
  @Input() primaryAction: PageCardPrimaryAction | null = null;
  @Output() primaryActionClick = new EventEmitter<void>();
  onPrimaryAction(): void {
    if (this.primaryAction && !this.actionDisabled && !this.actionPending && !this.primaryAction.disabled) this.primaryActionClick.emit();
  }
  @Input() actionDisabled = false;
  @Input() actionPending = false;
  @Input() actionPendingText = 'Aguarde...';
  @Input() titulo!: string;
  @Input() subtitulo?: string;

  @Input() botaoTexto?: string;
  @Input() botaoIcone: string = 'add';
  @Input() botaoRota?: string | any[];
  @Input() mostrarDivisor: boolean = false;
  @Input() helpTexto: string = 'Ajuda';
  @Input() helpIcone: string = 'help_outline';
  @Input() helpRota?: string | any[];
  @Input() helpFragment?: string;
  @Input() helpExterno: boolean = false;

  // cor do botão, default = 'primary'
  @Input() botaoCor: 'primary' | 'accent' | 'warn' = 'primary';

  // compatível com a sua directive (sem `?`)
  @Input() permissao: string | string[] = '';
}
