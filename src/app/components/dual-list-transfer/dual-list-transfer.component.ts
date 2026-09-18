import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { InputPesquisaComponent } from '../inputs/input-pesquisa/input-pesquisa.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

export interface DualListTransferItem {
  id: number;
  label: string;
  group?: string;
  status?: string;
  details?: string[];
  editRoute?: (string | number)[];
}

type Pane = 'left' | 'right';
export type DualListLayout = 'SPLIT' | 'LEFT_EXPANDED' | 'RIGHT_EXPANDED';

@Component({
  selector: 'app-dual-list-transfer',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatButtonToggleModule,
    MatIconModule, InputPesquisaComponent, StatusBadgeComponent],
  templateUrl: './dual-list-transfer.component.html',
  styleUrls: ['./dual-list-transfer.component.scss'],
})
export class DualListTransferComponent {
  @Input() items: DualListTransferItem[] = [];
  @Input() selectedIds: number[] = [];
  @Input() disabled = false;
  @Input() leftTitle = 'Disponíveis';
  @Input() rightTitle = 'Selecionados';
  @Input() editActionLabel = 'Editar item';
  @Output() selectedIdsChange = new EventEmitter<number[]>();

  leftSearch = '';
  rightSearch = '';
  layout: DualListLayout = 'SPLIT';
  mobilePane: Pane = 'left';

  get availableCount(): number {
    return this.items.filter(item => !this.selectedIds.includes(item.id)).length;
  }

  get selectedCount(): number {
    return this.items.filter(item => this.selectedIds.includes(item.id)).length;
  }

  groups(pane: Pane): { name: string; items: DualListTransferItem[] }[] {
    const selected = pane === 'right';
    const term = (selected ? this.rightSearch : this.leftSearch).trim().toLocaleLowerCase('pt-BR');
    const groups = new Map<string, DualListTransferItem[]>();
    for (const item of this.items) {
      if (this.selectedIds.includes(item.id) !== selected) continue;
      const group = item.group || 'Outros';
      if (term && !`${group} ${item.label}`.toLocaleLowerCase('pt-BR').includes(term)) continue;
      groups.set(group, [...(groups.get(group) || []), item]);
    }
    return [...groups].map(([name, items]) => ({ name, items }));
  }

  move(item: DualListTransferItem, pane: Pane): void {
    if (this.disabled) return;
    const ids = new Set(this.selectedIds);
    if (pane === 'left') ids.add(item.id);
    else ids.delete(item.id);
    this.selectedIdsChange.emit([...ids]);
  }

  toggleExpanded(pane: Pane): void {
    const expanded = pane === 'left' ? 'LEFT_EXPANDED' : 'RIGHT_EXPANDED';
    this.layout = this.layout === expanded ? 'SPLIT' : expanded;
  }
}
