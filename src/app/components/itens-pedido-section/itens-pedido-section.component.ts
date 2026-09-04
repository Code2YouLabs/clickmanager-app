import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SectionCardComponent } from '../section-card/section-card.component';

export interface ItemPedidoView {
  descricao: string;
  especificacao?: string | null;
  detalhes?: string[];
  tipoLinha?: 'PRINCIPAL' | 'ADICIONAL' | 'SERVICO' | 'ACABAMENTO';
  valorContexto?: string | null;
  subtotalResumo?: string | null;
  quantidade: number;
  valor: number;
  subTotal?: number;
  sourceIndex?: number;
}

@Component({
  selector: 'app-itens-pedido-section',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    SectionCardComponent
  ],
  templateUrl: './itens-pedido-section.component.html',
  styleUrls: ['./itens-pedido-section.component.scss']
})
export class ItensPedidoSectionComponent {
  @Input() titulo = 'Itens do pedido';
  @Input() itemContextoLabel = 'pedido';
  @Input() itens: ItemPedidoView[] = [];
  @Input() subtotal: number = 0;
  @Input() permitirAlterarQuantidade: boolean = true;
  @Input() mostrarAcoes: boolean = true;
  @Input() mostrarDescreverItens: boolean = true;
  @Input() mostrarBuscaRapida: boolean = false;
  @Input() buscarProdutosLabel = 'Buscar produtos';
  @Input() buscaRapidaLabel = 'Busca rápida';
  @Input() descreverItensLabel = 'Descrever itens';
  @Input() inativo = false;

  @Output() buscarProdutos = new EventEmitter<void>();
  @Output() buscaRapida = new EventEmitter<void>();
  @Output() descreverItens = new EventEmitter<void>();
  @Output() removerItem = new EventEmitter<number>();
  @Output() alterarQuantidade = new EventEmitter<{ index: number; quantidade: number }>();

  private ultimaRemocao?: { index: number; timestamp: number };

  get emptyDescription(): string {
    if (this.mostrarBuscaRapida) {
      return 'Use “Adicionar produto” ou “Busca rápida” para incluir produtos.';
    }
    return this.mostrarDescreverItens
      ? `Use “Buscar produtos” ou “Descrever itens” para incluir itens no ${this.itemContextoLabel}.`
      : `Use “Adicionar produto” para incluir itens no ${this.itemContextoLabel}.`;
  }

  onQtdChange(index: number, valor: any): void {
    if (!this.permitirAlterarQuantidade) return;
    const qtd = Math.max(1, Number(valor) || 1);
    this.alterarQuantidade.emit({ index, quantidade: qtd });
  }

  onRemoverItem(item: ItemPedidoView, index: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.inativo) return;
    const sourceIndex = item.sourceIndex ?? index;
    const agora = Date.now();
    if (this.ultimaRemocao?.index === sourceIndex && agora - this.ultimaRemocao.timestamp < 300) return;
    this.ultimaRemocao = { index: sourceIndex, timestamp: agora };
    this.removerItem.emit(sourceIndex);
  }
}
