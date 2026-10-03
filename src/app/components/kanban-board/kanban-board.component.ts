import { CommonModule } from '@angular/common';
import {
  AfterContentInit,
  Component,
  ContentChild,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CdkDragDrop, CdkDragEnd, CdkDragStart, DragDropModule } from '@angular/cdk/drag-drop';
import { MaterialModule } from 'src/app/material.module';
import { KanbanCardDirective } from './kanban-card.directive';
import { KanbanColumnState, KanbanDragEvent, KanbanDropEvent, KanbanDropState } from './kanban-board.models';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, MaterialModule, DragDropModule],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss',
})
export class KanbanBoardComponent<T = unknown> implements AfterContentInit {
  @Input() columns: KanbanColumnState<T>[] = [];
  @Input() boardLabel = 'Quadro Kanban';
  @Input() emptyTitle = 'Nenhum registro encontrado';
  @Input() emptyDescription = 'Os registros aparecerão aqui quando forem adicionados.';
  @Input() retryLabel = 'Tentar novamente';
  @Input() loadMoreLabel = 'Carregar mais';
  @Input() trackBy: (item: T) => unknown = (item) => (item as Record<string, unknown>)?.['id'] ?? item;
  @Input() cardAriaLabel: (item: T, column: KanbanColumnState<T>) => string = () => 'Abrir item';
  @Input() dragEnabled = false;
  @Input() dragStartDelay: number | { touch: number; mouse: number } = { touch: 180, mouse: 0 };
  @Input() isDragDisabled: (item: T, column: KanbanColumnState<T>) => boolean = () => false;
  @Input() dropState: (column: KanbanColumnState<T>) => KanbanDropState = () => 'neutral';
  @Input() dropHint: (column: KanbanColumnState<T>) => string | null = () => null;

  @Output() retryColumn = new EventEmitter<string>();
  @Output() loadMore = new EventEmitter<string>();
  @Output() cardClick = new EventEmitter<T>();
  @Output() dragStarted = new EventEmitter<KanbanDragEvent<T>>();
  @Output() dragEnded = new EventEmitter<KanbanDragEvent<T>>();
  @Output() cardDropped = new EventEmitter<KanbanDropEvent<T>>();

  @ContentChild(KanbanCardDirective) cardTemplate?: KanbanCardDirective<T>;
  hasProjectedCard = false;
  private dragging = false;

  ngAfterContentInit(): void {
    this.hasProjectedCard = !!this.cardTemplate;
  }

  get allEmpty(): boolean {
    return !!this.columns.length
      && this.columns.every((column) => !column.loading && !column.error && !column.items.length);
  }

  itemTrackBy = (_index: number, item: T): unknown => this.trackBy(item);
  columnTrackBy = (_index: number, column: KanbanColumnState<T>): string => column.id;
  dropListId(column: KanbanColumnState<T>): string {
    return `kanban-drop-${column.id}`;
  }

  cardDisabled(item: T, column: KanbanColumnState<T>): boolean {
    return !this.dragEnabled || this.isDragDisabled(item, column);
  }

  columnDropState(column: KanbanColumnState<T>): KanbanDropState {
    return this.dragEnabled ? this.dropState(column) : 'neutral';
  }

  columnDropHint(column: KanbanColumnState<T>): string {
    return this.dragEnabled ? (this.dropHint(column) || '') : '';
  }

  onCardClick(item: T): void {
    if (this.dragging) {
      return;
    }
    this.cardClick.emit(item);
  }

  onDragStarted(event: CdkDragStart<T>, item: T, column: KanbanColumnState<T>, index: number): void {
    this.dragging = true;
    this.dragStarted.emit({ item, column, index });
  }

  onDragEnded(_event: CdkDragEnd<T>, item: T, column: KanbanColumnState<T>, index: number): void {
    this.dragEnded.emit({ item, column, index });
    setTimeout(() => {
      this.dragging = false;
    });
  }

  onDrop(event: CdkDragDrop<T[]>): void {
    if (!this.dragEnabled || event.previousContainer === event.container) {
      return;
    }

    const sourceColumn = this.columnByDropListId(event.previousContainer.id);
    const targetColumn = this.columnByDropListId(event.container.id);
    if (!sourceColumn || !targetColumn) {
      return;
    }

    this.cardDropped.emit({
      item: event.item.data,
      sourceColumn,
      targetColumn,
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
    });
  }

  private columnByDropListId(id: string): KanbanColumnState<T> | undefined {
    return this.columns.find((column) => this.dropListId(column) === id);
  }
}
