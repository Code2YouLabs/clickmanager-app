import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';

@Component({
  selector: 'app-pedido-documentos-acoes',
  standalone: true,
  imports: [CommonModule, SectionCardComponent, MatButtonModule, MatIconModule],
  template: `
    <app-section-card titulo="Documentos e compartilhamento" [divider]="true" class="documents-card">
      <div class="document-actions">
        <button mat-flat-button color="primary" type="button" (click)="pedidoCompleto.emit()">
          <mat-icon>description</mat-icon>
          {{ contexto === 'orcamento' ? 'Orçamento PDF' : 'Pedido completo' }}
        </button>
        <button *ngIf="contexto === 'pedido'" mat-stroked-button color="primary" type="button" (click)="duasVias.emit()">
          <mat-icon>content_copy</mat-icon>
          Duas vias
        </button>
        <button *ngIf="contexto === 'pedido'" mat-stroked-button color="accent" type="button" (click)="etiqueta.emit()">
          <mat-icon>label</mat-icon>
          Etiqueta
        </button>
        <button mat-flat-button class="btn-whatsapp" type="button" (click)="whatsapp.emit()">
          <mat-icon>chat</mat-icon>
          WhatsApp
        </button>
      </div>
    </app-section-card>
  `,
  styles: [`
    .document-actions {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }

    .document-actions button {
      width: 100%;
      min-height: 38px;
      border-radius: 999px;
    }

    .document-actions mat-icon {
      width: 18px;
      height: 18px;
      margin-right: 4px;
      font-size: 18px;
    }

    .btn-whatsapp {
      background: #25d366;
      color: #0f172a;
    }
  `],
})
export class PedidoDocumentosAcoesComponent {
  @Input() contexto: 'pedido' | 'orcamento' = 'pedido';
  @Output() pedidoCompleto = new EventEmitter<void>();
  @Output() duasVias = new EventEmitter<void>();
  @Output() etiqueta = new EventEmitter<void>();
  @Output() whatsapp = new EventEmitter<void>();
}
