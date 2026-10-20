import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { KanbanBoardComponent } from './kanban-board.component';
import { KanbanCardDirective } from './kanban-card.directive';
import { KanbanColumnState, KanbanDropEvent } from './kanban-board.models';

interface TaskFixture {
  id: number;
  title: string;
}

@Component({
  standalone: true,
  imports: [KanbanBoardComponent, KanbanCardDirective],
  template: `
    <app-kanban-board
      [mobileNavigation]="mobileNavigation"
      [columns]="columns"
      [trackBy]="trackBy"
      [cardAriaLabel]="cardAriaLabel"
      [dragEnabled]="dragEnabled"
      [isDragDisabled]="isDragDisabled"
      (cardClick)="clicked = $event"
      (mobileCardAction)="moved = $event"
      (cardDropped)="dropped = $event"
      (retryColumn)="retried = $event"
      (loadMore)="loadedMore = $event">
      <ng-template appKanbanCard let-task>
        <strong>{{ task.title }}</strong>
      </ng-template>
    </app-kanban-board>
  `,
})
class HostComponent {
  columns: KanbanColumnState<TaskFixture>[] = [
    { id: 'todo', title: 'A fazer', count: 4, items: [{ id: 1, title: 'Revisar' }], hasMore: true },
    { id: 'done', title: 'Feito', count: 0, items: [], loading: false },
  ];
  clicked: TaskFixture | null = null;
  dropped: KanbanDropEvent<TaskFixture> | null = null;
  retried: string | null = null;
  loadedMore: string | null = null;
  mobileNavigation = false;
  moved: TaskFixture | null = null;
  dragEnabled = false;
  disabledIds = new Set<number>();
  trackBy = (task: TaskFixture) => task.id;
  cardAriaLabel = (task: TaskFixture) => `Abrir tarefa ${task.title}`;
  isDragDisabled = (task: TaskFixture) => this.disabledIds.has(task.id);
}

describe('KanbanBoardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let viewport: BehaviorSubject<any>;

  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: false, breakpoints: {} });
    TestBed.configureTestingModule({
      imports: [HostComponent, NoopAnimationsModule],
      providers: [{ provide: BreakpointObserver, useValue: { observe: () => viewport } }],
    });

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renderiza colunas genéricas, contador total e card projetado', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('A fazer');
    expect(element.textContent).toContain('4');
    expect(element.textContent).toContain('Revisar');
    expect(element.textContent).toContain('Nenhum registro nesta etapa.');
  });

  it('emite clique do card com acessibilidade por botão', () => {
    const card = fixture.debugElement.query(By.css('.kanban-card'));

    expect(card.nativeElement.getAttribute('aria-label')).toBe('Abrir tarefa Revisar');
    card.nativeElement.click();

    expect(host.clicked).toEqual({ id: 1, title: 'Revisar' });
  });

  it('mantém drag desabilitado por padrão', () => {
    const board = fixture.debugElement.query(By.directive(KanbanBoardComponent)).componentInstance as KanbanBoardComponent<TaskFixture>;

    expect(board.cardDisabled(host.columns[0].items[0], host.columns[0])).toBeTrue();
  });

  it('habilita drag de forma opt-in e respeita item disabled', () => {
    host.dragEnabled = true;
    host.disabledIds.add(1);
    fixture.detectChanges();
    const board = fixture.debugElement.query(By.directive(KanbanBoardComponent)).componentInstance as KanbanBoardComponent<TaskFixture>;

    expect(board.cardDisabled(host.columns[0].items[0], host.columns[0])).toBeTrue();

    host.disabledIds.clear();
    fixture.detectChanges();

    expect(board.cardDisabled(host.columns[0].items[0], host.columns[0])).toBeFalse();
  });

  it('drop entre colunas emite intenção sem mutar dados', () => {
    host.dragEnabled = true;
    fixture.detectChanges();
    const board = fixture.debugElement.query(By.directive(KanbanBoardComponent)).componentInstance as KanbanBoardComponent<TaskFixture>;
    const sourceItems = [...host.columns[0].items];
    const targetItems = [...host.columns[1].items];

    board.onDrop({
      previousContainer: { id: board.dropListId(host.columns[0]), data: host.columns[0].items },
      container: { id: board.dropListId(host.columns[1]), data: host.columns[1].items },
      item: { data: host.columns[0].items[0] },
      previousIndex: 0,
      currentIndex: 0,
    } as CdkDragDrop<TaskFixture[]>);

    expect(host.dropped?.item).toEqual({ id: 1, title: 'Revisar' });
    expect(host.dropped?.sourceColumn.id).toBe('todo');
    expect(host.dropped?.targetColumn.id).toBe('done');
    expect(host.columns[0].items).toEqual(sourceItems);
    expect(host.columns[1].items).toEqual(targetItems);
  });

  it('drop na mesma coluna não emite mudança comercial', () => {
    host.dragEnabled = true;
    fixture.detectChanges();
    const board = fixture.debugElement.query(By.directive(KanbanBoardComponent)).componentInstance as KanbanBoardComponent<TaskFixture>;

    const container = { id: board.dropListId(host.columns[0]), data: host.columns[0].items };
    board.onDrop({
      previousContainer: container,
      container,
      item: { data: host.columns[0].items[0] },
      previousIndex: 0,
      currentIndex: 0,
    } as CdkDragDrop<TaskFixture[]>);

    expect(host.dropped).toBeNull();
  });

  it('emite carregar mais por coluna', () => {
    const button = fixture.debugElement.query(By.css('.kanban-column__load-more'));

    button.nativeElement.click();

    expect(host.loadedMore).toBe('todo');
  });

  it('emite retry por coluna com erro independente', () => {
    host.columns = [{ id: 'blocked', title: 'Bloqueado', items: [], error: 'Falha de rede' }];
    fixture.detectChanges();

    const retry = fixture.debugElement.query(By.css('.kanban-state--error button'));
    retry.nativeElement.click();

    expect(host.retried).toBe('blocked');
  });
  it('oferece navegação e ação mobile opt-in sem remover colunas ou drag', () => {
    host.mobileNavigation = true; host.dragEnabled = true;
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    const board = fixture.debugElement.query(By.directive(KanbanBoardComponent)).componentInstance as KanbanBoardComponent<TaskFixture>;
    expect(fixture.nativeElement.querySelectorAll('.kanban-column').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.kanban-mobile-nav')).toBeTruthy();
    board.navigateColumn(1); fixture.detectChanges(); expect(board.activeColumnId).toBe('done');
    board.navigateColumn(1); expect(board.activeColumnId).toBe('done');
    board.selectColumn('todo'); fixture.detectChanges();
    fixture.nativeElement.querySelector('.kanban-card-action').click();
    expect(host.moved?.id).toBe(1); expect(host.clicked).toBeNull();
    host.moved = null; host.disabledIds.add(1); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kanban-card-action').disabled).toBeTrue();
    board.onMobileCardAction(host.columns[0].items[0], host.columns[0]); expect(host.moved).toBeNull();
    viewport.next({ matches: false, breakpoints: {} }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kanban-mobile-nav')).toBeNull();
    expect(fixture.nativeElement.querySelector('.kanban-card-action')).toBeNull();
  });

  it('403 mobile tem precedência sobre dados e erro e não oferece movimentação', () => {
    host.mobileNavigation = true; host.dragEnabled = true;
    viewport.next({ matches: true, breakpoints: {} });
    host.columns[0].forbidden = true; host.columns[0].error = 'Erro'; fixture.detectChanges();
    const column = fixture.nativeElement.querySelector('.kanban-column');
    expect(column.textContent).toContain('Acesso restrito');
    expect(column.querySelector('.kanban-card')).toBeNull();
    expect(column.querySelector('.kanban-state--error')).toBeNull();
    expect(fixture.nativeElement.querySelector('.kanban-board__empty')).toBeNull();
  });

  it('mantém estados e bloqueia carregar mais durante a requisição', () => {
    host.columns[0].loadingMore = true; fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kanban-column__load-more').disabled).toBeTrue();
    host.columns[0] = { ...host.columns[0], items: [], loading: true }; fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kanban-skeleton')).toBeTruthy();
  });

});
