import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { CardHeaderComponent } from '../card-header/card-header.component';

@Component({
  selector: 'app-page-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, CardHeaderComponent],
  templateUrl: './page-card.component.html',
  styleUrls: ['./page-card.component.scss'],
})
export class PageCardComponent {
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
