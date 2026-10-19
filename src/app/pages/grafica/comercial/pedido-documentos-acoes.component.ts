import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';

@Component({
  selector: 'app-pedido-documentos-acoes',
  standalone: true,
  imports: [CommonModule, SectionCardComponent, MatButtonModule, MatIconModule],
  templateUrl: './pedido-documentos-acoes.component.html',
  styleUrl: './pedido-documentos-acoes.component.scss',
})
export class PedidoDocumentosAcoesComponent {
  @Input() contexto: 'pedido' | 'orcamento' = 'pedido';
  @Input() actionList = false;
  @Input() disabled = false;
  @Output() pedidoCompleto = new EventEmitter<void>();
  @Output() duasVias = new EventEmitter<void>();
  @Output() etiqueta = new EventEmitter<void>();
  @Output() whatsapp = new EventEmitter<void>();

  readonly documentActions = [
    { id: 'completo', label: 'Pedido completo', icon: 'description', flat: true, color: 'primary' as const },
    { id: 'duas-vias', label: 'Duas vias', icon: 'content_copy', flat: false, color: 'primary' as const },
    { id: 'etiqueta', label: 'Etiqueta', icon: 'label', flat: false, color: 'accent' as const },
    { id: 'whatsapp', label: 'WhatsApp', icon: 'chat', flat: true, color: undefined },
  ] as const;

  get actions() { return this.documentActions.filter(action => this.contexto === 'pedido' || action.id === 'completo' || action.id === 'whatsapp'); }

  executarDocumento(id: string): void {
    if (this.actionList && this.disabled) return;
    switch (id) {
      case 'completo': this.pedidoCompleto.emit(); break;
      case 'duas-vias': this.duasVias.emit(); break;
      case 'etiqueta': this.etiqueta.emit(); break;
      case 'whatsapp': this.whatsapp.emit(); break;
    }
  }
}
