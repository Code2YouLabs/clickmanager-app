import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';
import { DataTableComponent } from '../data-table/data-table.component';
import { DataTableFilter, DataTableFilterState } from '../data-table/data-table.models';
import { ListFilterBarComponent } from '../list-filter-bar/list-filter-bar.component';
import { PageCardComponent } from './page-card.component';

@Component({ standalone: true, imports: [PageCardComponent, DataTableComponent], template: `
  <app-page-card titulo="Inventário" subtitulo="Descrição desktop" [mobileHeaderMode]="mode"
    [primaryAction]="primary ? { label: 'Novo registro' } : null" (primaryActionClick)="creates = creates + 1">
    @if (extraActions) {
      <div page-mobile-header-actions><button>Ajuda contextual</button><button>Outra ação</button></div>
    }
    @if (showList) {
      <app-data-table [filters]="filters" [filterState]="state" [data]="[]" [columns]="[]"
        [search]="{ enabled: true, placeholder: 'Pesquisar no inventário' }"
        (filterChange)="state = $event; changes = changes + 1"></app-data-table>
    }
  </app-page-card>` })
class Host {
  mode: 'standard' | 'legacy' = 'standard';
  primary = true;
  creates = 0;
  extraActions = false;
  showList = true;
  changes = 0;
  state: DataTableFilterState = { status: 'A' };
  filters: DataTableFilter[] = [{ key: 'status', label: 'Status', type: 'select', options: [{ value: 'A', label: 'Ativo' }, { value: 'I', label: 'Inativo' }] }];
}

describe('PageCard e ListFilterBar — cabeçalho contextual mobile', () => {
  let fixture: ComponentFixture<Host>;
  let viewport: BehaviorSubject<any>;
  let overlay: HTMLElement;
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  beforeEach(async () => {
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} });
    TestBed.configureTestingModule({ imports: [Host, NoopAnimationsModule], providers: [
      { provide: BreakpointObserver, useValue: { observe: () => viewport, isMatched: () => true } },
    ] });
    fixture = TestBed.createComponent(Host);
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
    document.body.appendChild(fixture.nativeElement);
    await settle();
  });
  afterEach(() => { fixture.nativeElement.remove(); TestBed.resetTestingModule(); });

  it('renderiza um acionador à direita do título com o mesmo estado/painel e restaura o foco', async () => {
    const header = fixture.nativeElement.querySelector('.card-header');
    expect(header.classList.contains('card-header--mobile-contextual')).toBeTrue();
    const trigger: HTMLButtonElement = header.querySelector('.list-mobile-toolbar__filter-button');
    expect(trigger.textContent).toContain('Filtros (1)');
    expect(fixture.nativeElement.querySelectorAll('.list-mobile-toolbar__filter-button').length).toBe(1);
    expect(fixture.nativeElement.querySelector('mat-card-content .list-mobile-toolbar__filter-button')).toBeNull();
    const bar: ListFilterBarComponent = fixture.debugElement.query(By.directive(ListFilterBarComponent)).componentInstance;
    trigger.click(); await settle();
    expect(bar.mobileFiltersOpen).toBeTrue();
    expect(overlay.querySelectorAll('[role="dialog"]').length).toBe(1);
    expect(fixture.componentInstance.changes).toBe(0);
    bar.onFieldChange('status', 'I');
    bar.applyMobileFilters(); await settle();
    expect(fixture.componentInstance.state).toEqual({ status: 'I' });
    expect(fixture.componentInstance.changes).toBe(1);
    expect(document.activeElement).toBe(trigger);
    trigger.click(); await settle();
    expect(bar.selectedFilterValue(bar.definitions[0])).toBe('I');
    bar.clearMobileFilters(); await settle();
    expect(fixture.componentInstance.changes).toBe(1);
    bar.closeMobileFilters(); await settle();
    expect(fixture.componentInstance.state).toEqual({ status: 'I' });
    trigger.click(); await settle(); bar.clearMobileFilters(); bar.applyMobileFilters(); await settle();
    expect(fixture.componentInstance.state).toEqual({});
    expect(fixture.componentInstance.changes).toBe(2);
    expect(trigger.textContent).not.toContain('(1)');
  });

  it('não inventa filtros e preserva ações contextuais e FAB independentes', async () => {
    fixture.componentInstance.filters = []; fixture.componentInstance.extraActions = true; await settle();
    expect(fixture.nativeElement.querySelector('.list-mobile-toolbar__filter-button')).toBeNull();
    const context = fixture.nativeElement.querySelector('.card-header [card-header-contextual-actions]');
    expect(context.textContent).toContain('Ajuda contextual'); expect(context.textContent).toContain('Outra ação');
    expect(fixture.nativeElement.querySelector('mat-card-content input[type=search]')).toBeTruthy();
    fixture.nativeElement.querySelector('.mobile-fab-action').click();
    expect(fixture.componentInstance.creates).toBe(1);
    fixture.componentInstance.primary = false; await settle();
    expect(fixture.nativeElement.querySelector('.mobile-fab-action')).toBeNull();
    expect(context.textContent).toContain('Ajuda contextual');
  });

  it('mantém desktop inline e retorna ao cabeçalho sem duplicar acionadores', async () => {
    viewport.next({ matches: false, breakpoints: {} }); await settle();
    expect(fixture.nativeElement.querySelector('.card-header--mobile-contextual')).toBeNull();
    expect(fixture.nativeElement.querySelector('.card-header').textContent).toContain('Descrição desktop');
    expect(fixture.nativeElement.querySelector('.card-header__primary-action')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.data-table-toolbar__filter-toggle')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.list-mobile-toolbar__filter-button')).toBeNull();
    viewport.next({ matches: true, breakpoints: {} }); await settle();
    expect(fixture.nativeElement.querySelectorAll('.list-mobile-toolbar__filter-button').length).toBe(1);
  });

  it('legacy mantém o acionador local e remover a listagem remove a ação registrada', async () => {
    fixture.componentInstance.mode = 'legacy'; await settle();
    expect(fixture.nativeElement.querySelector('.card-header .list-mobile-toolbar__filter-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('mat-card-content .list-mobile-toolbar__filter-button')).toBeTruthy();
    fixture.componentInstance.mode = 'standard'; await settle();
    fixture.componentInstance.showList = false; await settle();
    expect(fixture.nativeElement.querySelector('.list-mobile-toolbar__filter-button')).toBeNull();
    const card: PageCardComponent = fixture.debugElement.query(By.directive(PageCardComponent)).componentInstance;
    expect(card.contextualActions().length).toBe(0);
  });
});
