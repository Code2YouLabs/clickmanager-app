import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { BehaviorSubject } from 'rxjs';
import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { ListFilterBarComponent } from './list-filter-bar.component';
import { DataTableFilter, DataTableFilterState } from '../data-table/data-table.models';

@Component({ standalone: true, imports: [ListFilterBarComponent], template: `
  <app-list-filter-bar presentation="section" [filters]="filters" [filterState]="state" [search]="search"
    [hasCustomFilters]="true" (stateChange)="last = $event" (searchChange)="searches.push($event)" (clear)="clears = clears + 1">
    <button list-filter-actions>Biblioteca</button>
    <label list-filter-custom>Período<input type="date" /></label>
  </app-list-filter-bar>` })
class Host {
  filters: DataTableFilter[] = [
    { key: 'active', label: 'Status', type: 'select', options: [{ value: false, label: 'Inativo' }, { value: true, label: 'Ativo' }] },
    { key: 'ids', label: 'Itens', type: 'multi-select', options: [{ value: 0, label: 'Zero' }, { value: 2, label: 'Dois' }] },
  ];
  state: DataTableFilterState = {};
  last: DataTableFilterState = {};
  searches: string[] = [];
  clears = 0;
  search = { enabled: true, value: '', debounceMs: 300 };
}
describe('ListFilterBarComponent', () => {
  let fixture: ComponentFixture<Host>;
  let bar: ListFilterBarComponent;
  let viewport: BehaviorSubject<any>;
  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: false, breakpoints: {} });
    TestBed.configureTestingModule({ imports: [Host, NoopAnimationsModule], providers: [{ provide: BreakpointObserver, useValue: { observe: () => viewport, isMatched: () => false } }] });
    fixture = TestBed.createComponent(Host); fixture.detectChanges();
    bar = fixture.debugElement.query(By.directive(ListFilterBarComponent)).componentInstance;
  });
  afterEach(() => TestBed.resetTestingModule());
  it('preserva string, zero, false, null e arrays sem converter tipos', () => {
    for (const [key, value] of Object.entries({ text: 'abc', number: 0, active: false, absent: null, ids: [0, 2] })) bar.onFilterValueChange(key, value);
    expect(fixture.componentInstance.last).toEqual({ text: 'abc', number: 0, active: false, absent: null, ids: [0, 2] });
    expect(bar.activeFilterChips.map(chip => chip.optionLabel)).toEqual(['Inativo', 'Zero', 'Dois']);
    bar.onRemoveFilterChip(bar.activeFilterChips[1]);
    expect(fixture.componentInstance.last['ids']).toEqual([2]);
    bar.onClearFilters();
    expect(fixture.componentInstance.last).toEqual({}); expect(fixture.componentInstance.clears).toBe(1);
  });
  it('projeta acoes e filtros de dominio mesmo sem selects', () => {
    fixture.componentInstance.filters = []; fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Biblioteca');
    bar.toggleFilters(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type=date]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.data-table-toolbar__filter-toggle').getAttribute('aria-expanded')).toBe('true');
  });
  it('emite uma busca no debounce e sincroniza valor externo sem nova emissao', fakeAsync(() => {
    const input = fixture.nativeElement.querySelector('input[type=search]');
    input.value = '  papel '; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    tick(299); expect(fixture.componentInstance.searches).toEqual([]);
    tick(1); expect(fixture.componentInstance.searches).toEqual(['papel']);
    tick(400); expect(fixture.componentInstance.searches).toEqual(['papel']);
    fixture.componentInstance.search = { enabled: true, value: 'externo', debounceMs: 300 }; fixture.detectChanges(); tick(500);
    expect(input.value).toBe('externo'); expect(fixture.componentInstance.searches).toEqual(['papel']);
  }));
  it('cancela busca pendente quando a feature substitui o valor', fakeAsync(() => {
    bar.searchControl.setValue('antigo'); tick(100);
    fixture.componentInstance.search = { enabled: true, value: 'novo', debounceMs: 300 }; fixture.detectChanges(); tick(500);
    expect(fixture.componentInstance.searches).toEqual([]);
    bar.searchControl.setValue('final'); tick(300); expect(fixture.componentInstance.searches).toEqual(['final']);
  }));
  it('mantem contrato string e layout flat dos consumidores existentes', () => {
    const flat = TestBed.createComponent(ListFilterBarComponent);
    flat.componentRef.setInput('filters', [{ key: 'status', label: 'Status', value: 'ABERTO', options: [{ value: 'ABERTO', label: 'Aberto' }] }]);
    flat.detectChanges(); const spy = spyOn(flat.componentInstance.filterChange, 'emit');
    flat.componentInstance.onFilterChange('status', 'FECHADO');
    expect(spy).toHaveBeenCalledWith({ key: 'status', value: 'FECHADO' });
    expect(flat.nativeElement.querySelector('.list-filter-bar')).toBeTruthy(); flat.destroy();
  });
  it('abre painel mobile sem título redundante e aplica os filtros tipados uma única vez', fakeAsync(() => {
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-section-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.list-mobile-toolbar__title')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('input[type=search]').length).toBe(1);
    const state = spyOn(bar.stateChange, 'emit');
    fixture.nativeElement.querySelector('.list-mobile-toolbar__filter-button').click(); tick(); fixture.detectChanges();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(overlay.querySelector('mat-bottom-sheet-container')).toBeTruthy();
    expect(overlay.querySelector('input[type=date]')).toBeTruthy();
    expect(overlay.querySelectorAll('mat-select').length).toBe(2);
    bar.onFieldChange('active', false); bar.onFieldChange('ids', [0, 2]); fixture.detectChanges();
    expect(state).not.toHaveBeenCalled();
    expect(bar.selectedFilterValue(bar.definitions[0])).toBe(false);
    const buttons = overlay.querySelectorAll<HTMLButtonElement>('.list-filter-sheet__footer button');
    buttons[buttons.length - 1].click(); tick(500); fixture.detectChanges();
    expect(state).toHaveBeenCalledOnceWith({ active: false, ids: [0, 2] });
    expect(bar.mobileFiltersOpen).toBeFalse();
    expect(fixture.nativeElement.querySelector('.list-mobile-toolbar__filter-button').textContent).toContain('(3)');
    expect(fixture.nativeElement.textContent).toContain('Biblioteca');
  }));

  it('fecha sem aplicar o rascunho e restaura o foco no botão de filtros', fakeAsync(() => {
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('.list-mobile-toolbar__filter-button');
    trigger.focus(); trigger.click(); tick(); fixture.detectChanges();
    const emit = spyOn(bar.stateChange, 'emit');
    bar.onFieldChange('active', true);
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    overlay.querySelector<HTMLButtonElement>('[aria-label="Fechar filtros"]')!.click(); tick(500); fixture.detectChanges();
    expect(emit).not.toHaveBeenCalled(); expect(document.activeElement).toBe(trigger);
    bar.openMobileFilters(); tick(); fixture.detectChanges();
    expect(bar.selectedFilterValue(bar.definitions[0])).toBeNull();
    bar.closeMobileFilters(); tick(500); fixture.nativeElement.remove();
  }));

  it('limpa pelo contrato existente e fecha o painel; resize fecha sem aplicar', fakeAsync(() => {
    fixture.componentInstance.state = { active: false, ids: [0] }; fixture.detectChanges();
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    bar.openMobileFilters(); tick(); fixture.detectChanges();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    overlay.querySelector<HTMLButtonElement>('.list-filter-sheet__footer button')!.click(); tick(500); fixture.detectChanges();
    expect(fixture.componentInstance.last).toEqual({}); expect(fixture.componentInstance.clears).toBe(1);
    bar.openMobileFilters(); tick(); bar.onFieldChange('active', true);
    viewport.next({ matches: false, breakpoints: {} }); tick(500); fixture.detectChanges();
    expect(bar.mobileFiltersOpen).toBeFalse();
    expect(fixture.nativeElement.querySelector('app-section-card')).toBeTruthy();
    expect(fixture.componentInstance.last).toEqual({});
  }));

  it('preserva projeção e mescla atualizações externas sem perder seleções em edição', fakeAsync(() => {
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    bar.openMobileFilters(); tick(); bar.onFieldChange('active', false);
    fixture.componentInstance.state = { period: '2026-10-16' }; fixture.detectChanges();
    bar.applyMobileFilters(); tick(500);
    expect(fixture.componentInstance.last).toEqual({ period: '2026-10-16', active: false });
  }));

  it('Escape e backdrop fecham sem aplicar; inline permanece uma exceção explícita', fakeAsync(() => {
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    const emit = spyOn(bar.stateChange, 'emit');
    bar.openMobileFilters(); tick(); fixture.detectChanges();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    overlay.querySelector('.cdk-overlay-pane')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    tick(500); expect(bar.mobileFiltersOpen).toBeFalse(); expect(emit).not.toHaveBeenCalled();
    bar.openMobileFilters(); tick(); fixture.detectChanges();
    overlay.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click(); tick(500);
    expect(bar.mobileFiltersOpen).toBeFalse(); expect(emit).not.toHaveBeenCalled();
    bar.mobileFilterPresentation = 'inline'; fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-section-card')).toBeTruthy();
    bar.toggleFilters(); expect(bar.filtersExpanded).toBeTrue();
  }));

  it('flat mobile conserva o evento string ao aplicar e não emite ao fechar sem mudanças', fakeAsync(() => {
    viewport.next({ matches: true, breakpoints: {} });
    const flat = TestBed.createComponent(ListFilterBarComponent);
    flat.componentRef.setInput('filters', [{ key: 'status', label: 'Status', value: 'ABERTO', options: [{ value: 'ABERTO', label: 'Aberto' }, { value: 'FECHADO', label: 'Fechado' }] }]);
    flat.detectChanges();
    const legacy = spyOn(flat.componentInstance.filterChange, 'emit');
    const state = spyOn(flat.componentInstance.stateChange, 'emit');
    flat.componentInstance.openMobileFilters(); tick();
    flat.componentInstance.onFieldChange('status', 'FECHADO'); expect(legacy).not.toHaveBeenCalled();
    flat.componentInstance.applyMobileFilters(); tick(500);
    expect(legacy).toHaveBeenCalledOnceWith({ key: 'status', value: 'FECHADO' });
    expect(state).toHaveBeenCalledOnceWith({ status: 'FECHADO' });
    flat.componentInstance.openMobileFilters(); tick(); flat.componentInstance.applyMobileFilters(); tick(500);
    expect(state).toHaveBeenCalledTimes(1); flat.destroy();
  }));

});
