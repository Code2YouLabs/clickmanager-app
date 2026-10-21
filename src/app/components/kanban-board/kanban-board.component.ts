import { BreakpointObserver } from '@angular/cdk/layout';
import { Subject, takeUntil } from 'rxjs';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
import { CommonModule } from '@angular/common';
import {
  AfterContentInit,
  Component,
  ContentChild,
  EventEmitter,
  Input,
  Output,
  OnDestroy,
  inject,
  ViewChild,
  ViewChildren,
  ElementRef,
  QueryList,
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
export class KanbanBoardComponent<T = unknown> implements AfterContentInit, OnDestroy {
  @Input() mobileNavigation = false;
  @Input() mobileCardActionLabel = 'Mover';
  @Input() forbiddenMessage = 'Você não possui permissão para visualizar este conteúdo.';
  @Output() mobileCardAction = new EventEmitter<T>();
  isMobile = false;
  @ViewChild('boardScroll') private boardScroll?: ElementRef<HTMLElement>;
  @ViewChildren('kanbanColumn') private columnElements?: QueryList<ElementRef<HTMLElement>>;
  private reducedMotion = false;
  private selectedColumnId: string | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly breakpoints = inject(BreakpointObserver);

  constructor() {
    this.breakpoints.observe([MOBILE_FOUNDATION_QUERY, '(prefers-reduced-motion: reduce)']).pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.isMobile = state.breakpoints[MOBILE_FOUNDATION_QUERY] ?? state.matches;
      this.reducedMotion = state.breakpoints['(prefers-reduced-motion: reduce)'] ?? false;
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
  get activeColumnIndex(): number { return Math.max(0, this.columns.findIndex(column => column.id === this.selectedColumnId)); }
  get activeColumnId(): string | undefined { return this.columns[this.activeColumnIndex]?.id; }
  selectColumn(id: string): void {
    const index = this.columns.findIndex(column => column.id === id);
    if (index < 0) return;
    this.selectedColumnId = id;
    const elements = this.columnElements?.toArray() || [];
    const target = elements[index]?.nativeElement;
    const first = elements[0]?.nativeElement;
    if (target && first && this.mobileNavigation && this.isMobile) {
      this.boardScroll?.nativeElement.scrollTo({ left: target.offsetLeft - first.offsetLeft, behavior: this.reducedMotion ? 'auto' : 'smooth' });
    }
  }
  navigateColumn(offset: number): void {
    const column = this.columns[this.activeColumnIndex + offset];
    if (column) this.selectColumn(column.id);
  }
  onBoardScroll(): void {
    if (!this.mobileNavigation || !this.isMobile || !this.boardScroll) return;
    const elements = this.columnElements?.toArray() || [];
    const first = elements[0]?.nativeElement;
    if (!first) return;
    const left = this.boardScroll.nativeElement.scrollLeft;
    let nearest = 0;
    elements.forEach((element, index) => {
      if (Math.abs(element.nativeElement.offsetLeft - first.offsetLeft - left)
        < Math.abs(elements[nearest].nativeElement.offsetLeft - first.offsetLeft - left)) nearest = index;
    });
    this.selectedColumnId = this.columns[nearest]?.id || null;
  }
  onMobileCardAction(item: T, column: KanbanColumnState<T>): void {
    if (this.mobileNavigation && this.isMobile && !column.forbidden && !this.cardDisabled(item, column)) this.mobileCardAction.emit(item);
  }
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
      && this.columns.every((column) => !column.forbidden && !column.loading && !column.error && !column.items.length);
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
