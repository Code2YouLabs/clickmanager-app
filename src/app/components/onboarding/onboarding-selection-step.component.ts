import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { SectionCardComponent } from '../section-card/section-card.component';

export interface OnboardingSelectionOption {
  id: number;
  nome: string;
  descricao?: string;
}

@Component({
  selector: 'app-onboarding-selection-step',
  standalone: true,
  imports: [CommonModule, MaterialModule, SectionCardComponent],
  templateUrl: './onboarding-selection-step.component.html',
  styleUrls: ['./onboarding-selection-step.component.scss'],
})
export class OnboardingSelectionStepComponent {
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input() ajuda = '';
  @Input() featuredTitle = 'Mais usados';
  @Input() items: OnboardingSelectionOption[] = [];
  @Input() loading = false;
  @Input() selectedIds = new Set<number>();

  @Output() toggleAll = new EventEmitter<boolean>();
  @Output() toggleItem = new EventEmitter<{ checked: boolean; id: number }>();

  get quantidadeSelecionada(): number {
    return this.selectedIds.size;
  }

  get contadorSelecionados(): string {
    return `${this.quantidadeSelecionada} de ${this.items.length} selecionados`;
  }

  get allSelected(): boolean {
    return this.items.length > 0 && this.items.every((item) => this.selectedIds.has(item.id));
  }

  get sugestoes(): OnboardingSelectionOption[] {
    return this.items.slice(0, 4);
  }

  get temSelecao(): boolean {
    return this.quantidadeSelecionada > 0;
  }

  get textoSelecionarTodos(): string {
    const quantidade = this.items.length;
    const item = quantidade === 1 ? 'item' : 'itens';
    return `Selecionar todos os ${quantidade} ${item}`;
  }

  isSelecionado(id: number): boolean {
    return this.selectedIds.has(id);
  }

  onToggleSuggestion(id: number): void {
    this.toggleItem.emit({ checked: !this.isSelecionado(id), id });
  }
}
