import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { BehaviorSubject } from 'rxjs';
import { ApplicationRef, Component } from '@angular/core';
import { Location } from '@angular/common';
import { provideLocationMocks, SpyLocation } from '@angular/common/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BrowserAnimationsModule, NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { ListFilterBarComponent } from './list-filter-bar.component';
import { DataTableFilter, DataTableFilterState } from '../data-table/data-table.models';

@Component({ standalone: true, imports: [ListFilterBarComponent], template: `
  <app-list-filter-bar [presentation]="presentation" [filters]="filters" [filterState]="state" [search]="search"
    [hasCustomFilters]="true" [customFilterTemplate]="useCustomTemplate ? periodFields : undefined" (stateChange)="last = $event" (searchChange)="searches.push($event)" (clear)="clears = clears + 1">
    <button list-filter-actions>Biblioteca</button>
    <label list-filter-custom>Período<input type="date" /></label>
  </app-list-filter-bar>
  <ng-template #periodFields let-values let-change="change">
    <label>Período<input type="date" [value]="values.period || ''" (input)="change('period', $any($event.target).value)" /></label>
  </ng-template>` })
class Host {
  filters: DataTableFilter[] = [
    { key: 'active', label: 'Status', type: 'select', options: [{ value: false, label: 'Inativo' }, { value: true, label: 'Ativo' }] },
    { key: 'ids', label: 'Itens', type: 'multi-select', options: [{ value: 0, label: 'Zero' }, { value: 2, label: 'Dois' }] },
  ];
  state: DataTableFilterState = {};
  last: DataTableFilterState = {};
  searches: string[] = [];
  clears = 0;
  useCustomTemplate = false;
  presentation: 'section' | 'flat' = 'section';
  search = { enabled: true, value: '', debounceMs: 300 };
}
describe('ListFilterBarComponent', () => {
  let fixture: ComponentFixture<Host>;
  let bar: ListFilterBarComponent;
  let viewport: BehaviorSubject<any>;
  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: false, breakpoints: {} });
    TestBed.configureTestingModule({ imports: [Host, NoopAnimationsModule], providers: [provideLocationMocks(), { provide: BreakpointObserver, useValue: { observe: () => viewport, isMatched: () => false } }] });
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
    expect(overlay.querySelector('mat-dialog-container')).toBeTruthy();
    expect(overlay.querySelector('mat-bottom-sheet-container')).toBeNull();
    const pane = overlay.querySelector<HTMLElement>('.cdk-overlay-pane')!;
    expect(pane.style.width).toBe('100vw'); expect(pane.style.maxWidth).toBe('100vw');
    expect(pane.parentElement?.style.justifyContent).toBe('flex-start'); // CDK flushes a 100vw overlay to both edges.
    expect(overlay.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Filtros');
    expect(overlay.querySelector('.list-filter-panel__header h2')?.textContent).toBe('Filtros');
    expect(overlay.querySelector('.list-filter-panel__footer')?.textContent).toContain('Aplicar filtros');
    expect(overlay.querySelector('input[type=date]')).toBeTruthy();
    expect(overlay.querySelectorAll('mat-select').length).toBe(2);
    bar.onFieldChange('active', false); bar.onFieldChange('ids', [0, 2]); fixture.detectChanges();
    expect(state).not.toHaveBeenCalled();
    expect(bar.selectedFilterValue(bar.definitions[0])).toBe(false);
    const buttons = overlay.querySelectorAll<HTMLButtonElement>('.list-filter-panel__footer button');
    buttons[buttons.length - 1].click(); tick(500); fixture.detectChanges();
    expect(state).toHaveBeenCalledOnceWith({ active: false, ids: [0, 2] });
    expect(bar.mobileFiltersOpen).toBeFalse();
    expect(fixture.nativeElement.querySelector('.list-mobile-toolbar__filter-button').textContent).toContain('(3)');
    expect(fixture.nativeElement.textContent).toContain('Biblioteca');
  }));

  it('fecha sem aplicar o rascunho e restaura o foco no botão de filtros', async () => {
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('.list-mobile-toolbar__filter-button');
    trigger.focus(); trigger.click(); fixture.detectChanges(); await fixture.whenStable(); TestBed.inject(ApplicationRef).tick();
    const emit = spyOn(bar.stateChange, 'emit');
    expect(document.activeElement?.getAttribute('role')).toBe('dialog');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Filtros');
    expect(TestBed.inject(OverlayContainer).getContainerElement().querySelectorAll('.cdk-focus-trap-anchor').length).toBe(2);
    bar.onFieldChange('active', true);
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    overlay.querySelector<HTMLButtonElement>('[aria-label="Voltar à listagem"]')!.click();
    fixture.detectChanges(); await fixture.whenStable();
    expect(emit).not.toHaveBeenCalled(); expect(document.activeElement).toBe(trigger);
    expect(overlay.querySelector('[role="dialog"]')).toBeNull();
    bar.openMobileFilters(); fixture.detectChanges(); await fixture.whenStable();
    expect(bar.selectedFilterValue(bar.definitions[0])).toBeNull();
    bar.closeMobileFilters(); fixture.detectChanges(); await fixture.whenStable(); fixture.nativeElement.remove();
  });

  it('Limpar edita apenas o rascunho; Aplicar confirma pelo contrato existente', fakeAsync(() => {
    fixture.componentInstance.state = { active: false, ids: [0] }; fixture.detectChanges();
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    bar.openMobileFilters(); tick(); fixture.detectChanges();
    const state = spyOn(bar.stateChange, 'emit');
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    overlay.querySelector<HTMLButtonElement>('[aria-label="Limpar filtros"]')!.click(); fixture.detectChanges();
    expect(bar.mobileFiltersOpen).toBeTrue(); expect(bar.hasDraftFilters).toBeFalse();
    expect(bar.activeFilterCount).toBe(2);
    expect(state).not.toHaveBeenCalled(); expect(fixture.componentInstance.clears).toBe(0);
    overlay.querySelector<HTMLButtonElement>('.list-filter-panel__footer button')!.click(); tick(500); fixture.detectChanges();
    expect(state).toHaveBeenCalledOnceWith({}); expect(fixture.componentInstance.clears).toBe(1);
    bar.openMobileFilters(); tick(); fixture.detectChanges();
    expect(bar.selectedFilterValue(bar.definitions[0])).toBeNull();
    expect(bar.selectedFilterValue(bar.definitions[1])).toEqual([]);
  }));

  it('cancelar Limpar e mudar para desktop descartam o rascunho', fakeAsync(() => {
    fixture.componentInstance.state = { active: false, ids: [0] }; fixture.detectChanges();
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    bar.openMobileFilters(); tick(); bar.clearMobileFilters(); bar.closeMobileFilters(); tick(500);
    bar.openMobileFilters(); tick(); fixture.detectChanges();
    expect(bar.selectedFilterValue(bar.definitions[0])).toBeFalse();
    expect(bar.selectedFilterValue(bar.definitions[1])).toEqual([0]);
    bar.onFieldChange('active', true);
    viewport.next({ matches: false, breakpoints: {} }); tick(500); fixture.detectChanges();
    expect(bar.mobileFiltersOpen).toBeFalse();
    expect(fixture.nativeElement.querySelector('app-section-card')).toBeTruthy();
    expect(TestBed.inject(OverlayContainer).getContainerElement().querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.componentInstance.clears).toBe(0);
    expect(bar.internalFilters).toEqual({ active: false, ids: [0] });
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

  it('suporta um filtro e reabre com o valor aplicado sem nova emissão', fakeAsync(() => {
    fixture.componentInstance.filters = [fixture.componentInstance.filters[0]];
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    const emit = spyOn(bar.stateChange, 'emit');
    bar.openMobileFilters(); tick(); fixture.detectChanges();
    expect(TestBed.inject(OverlayContainer).getContainerElement().querySelectorAll('mat-select').length).toBe(1);
    expect(emit).not.toHaveBeenCalled();
    bar.onFieldChange('active', false); bar.applyMobileFilters(); tick(500);
    bar.openMobileFilters(); tick(); fixture.detectChanges();
    expect(bar.selectedFilterValue(bar.definitions[0])).toBeFalse();
    bar.applyMobileFilters(); tick(500); expect(emit).toHaveBeenCalledTimes(1);
  }));

  it('controles de template customizado editam o mesmo rascunho e preservam emissão imediata no desktop', fakeAsync(() => {
    fixture.componentInstance.useCustomTemplate = true; fixture.componentInstance.filters = [];
    fixture.componentInstance.state = { period: '2026-10-01' }; fixture.detectChanges();
    const emit = spyOn(bar.stateChange, 'emit');
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    const edit = (root: ParentNode, value: string) => {
      const input = root.querySelector<HTMLInputElement>('input[type=date]')!;
      input.value = value; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    };
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    bar.openMobileFilters(); tick(); fixture.detectChanges();
    edit(overlay, '2026-10-16'); expect(emit).not.toHaveBeenCalled();
    bar.closeMobileFilters(); tick(500); bar.openMobileFilters(); tick(); fixture.detectChanges();
    expect(overlay.querySelector<HTMLInputElement>('input[type=date]')!.value).toBe('2026-10-01');
    bar.clearMobileFilters(); fixture.detectChanges();
    expect(overlay.querySelector<HTMLInputElement>('input[type=date]')!.value).toBe('');
    edit(overlay, '2026-10-20'); bar.applyMobileFilters(); tick(500);
    expect(emit).toHaveBeenCalledOnceWith({ period: '2026-10-20' });
    viewport.next({ matches: false, breakpoints: {} }); fixture.detectChanges(); bar.toggleFilters(); fixture.detectChanges();
    edit(fixture.nativeElement, '2026-10-21');
    expect(emit).toHaveBeenCalledWith({ period: '2026-10-21' });
  }));

  it('template customizado flat também abre com o estado aplicado e confirma pelo contrato string', fakeAsync(() => {
    fixture.componentInstance.presentation = 'flat'; fixture.componentInstance.useCustomTemplate = true;
    fixture.componentInstance.filters = []; fixture.componentInstance.state = { period: '2026-10-01' }; fixture.detectChanges();
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    const legacy = spyOn(bar.filterChange, 'emit');
    const emit = spyOn(bar.stateChange, 'emit');
    bar.openMobileFilters(); tick(); fixture.detectChanges();
    const input = TestBed.inject(OverlayContainer).getContainerElement().querySelector<HTMLInputElement>('input[type=date]')!;
    expect(input.value).toBe('2026-10-01');
    input.value = '2026-10-16'; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(emit).not.toHaveBeenCalled(); expect(legacy).not.toHaveBeenCalled();
    bar.applyMobileFilters(); tick(500);
    expect(legacy).toHaveBeenCalledOnceWith({ key: 'period', value: '2026-10-16' });
    expect(emit).toHaveBeenCalledOnceWith({ period: '2026-10-16' });
  }));

  it('acompanha o teclado pela viewport visível e remove listeners ao fechar', fakeAsync(() => {
    const visible = Object.assign(new EventTarget(), { height: 640, offsetTop: 0 });
    spyOnProperty(window, 'visualViewport', 'get').and.returnValue(visible as VisualViewport);
    const remove = spyOn(visible, 'removeEventListener').and.callThrough();
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    bar.openMobileFilters(); tick(); fixture.detectChanges();
    const pane = TestBed.inject(OverlayContainer).getContainerElement().querySelector<HTMLElement>('.cdk-overlay-pane')!;
    expect(pane.style.height).toBe('640px');
    visible.height = 280; visible.offsetTop = 40; visible.dispatchEvent(new Event('resize'));
    expect(pane.style.height).toBe('280px');
    expect(pane.parentElement?.style.alignItems).toBe('flex-start');
    bar.closeMobileFilters(); tick(500);
    expect(remove).toHaveBeenCalledWith('resize', jasmine.any(Function), undefined);
    expect(remove).toHaveBeenCalledWith('scroll', jasmine.any(Function), undefined);
  }));

  it('não muda a rota ao abrir e descarta o rascunho na navegação Voltar do Material', fakeAsync(() => {
    const location = TestBed.inject(Location) as SpyLocation;
    const originalPath = location.path();
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    const emit = spyOn(bar.stateChange, 'emit');
    bar.openMobileFilters(); tick(); fixture.detectChanges();
    expect(location.path()).toBe(originalPath);
    bar.onFieldChange('active', false);
    location.simulateUrlPop('/anterior'); tick(500); fixture.detectChanges();
    expect(bar.mobileFiltersOpen).toBeFalse(); expect(emit).not.toHaveBeenCalled();
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

// Check lifecycle/timing without visual assertions or screenshots.
describe('ListFilterBarComponent — transição lateral', () => {
  let fixture: ComponentFixture<Host>;
  let bar: ListFilterBarComponent;
  let overlay: HTMLElement;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Host, BrowserAnimationsModule], providers: [
      { provide: BreakpointObserver, useValue: { observe: () => new BehaviorSubject({ matches: true, breakpoints: {} }), isMatched: () => true } },
    ] });
    fixture = TestBed.createComponent(Host); fixture.detectChanges();
    bar = fixture.debugElement.query(By.directive(ListFilterBarComponent)).componentInstance;
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
  });
  afterEach(() => TestBed.resetTestingModule());

  it('mantém o mesmo estado aberto e o foco no dialog ao terminar e repetir a entrada', fakeAsync(() => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    for (let attempt = 0; attempt < 3; attempt++) {
      bar.openMobileFilters(); fixture.detectChanges(); tick(20); fixture.detectChanges();
      TestBed.inject(ApplicationRef).tick();
      const container = overlay.querySelector<HTMLElement>('mat-dialog-container')!;
      expect(container.classList.contains('mdc-dialog--open')).toBeTrue();
      expect(container.classList.contains('mdc-dialog--opening')).toBeTrue();
      expect(document.activeElement).toBe(container);
      tick(340); fixture.detectChanges();
      expect(container.classList.contains('mdc-dialog--opening')).toBeFalse();
      expect(container.classList.contains('mdc-dialog--open')).toBeTrue();
      expect(overlay.querySelector('mat-dialog-container')).toBe(container);
      tick(400); fixture.detectChanges();
      expect(document.activeElement).toBe(container);
      expect(container.classList.contains('mdc-dialog--open')).toBeTrue();
      bar.closeMobileFilters(); tick(320); fixture.detectChanges();
      expect(overlay.querySelector('mat-dialog-container')).toBeNull();
    }
  }));

  for (const close of ['voltar', 'Escape', 'backdrop', 'aplicar'] as const) {
    it(`aguarda o recolhimento antes de remover o painel por ${close}`, fakeAsync(() => {
      spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
      const emit = spyOn(bar.stateChange, 'emit');
      bar.openMobileFilters(); fixture.detectChanges(); tick(400); fixture.detectChanges();
      const container = overlay.querySelector<HTMLElement>('mat-dialog-container')!;
      expect(container.classList.contains('mdc-dialog--open')).toBeTrue();
      bar.onFieldChange('active', false); fixture.detectChanges();
      if (close === 'Escape') {
        overlay.querySelector('.cdk-overlay-pane')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      } else if (close === 'backdrop') {
        overlay.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click();
      } else if (close === 'aplicar') {
        bar.applyMobileFilters(); bar.applyMobileFilters();
      } else {
        bar.closeMobileFilters();
      }
      // The exit must already be selected synchronously, before Material's next frame.
      expect(overlay.querySelector('.list-filter-mobile-panel--closing')).toBeTruthy();
      expect(overlay.querySelector('mat-dialog-container')).toBe(container);
      tick(20); fixture.detectChanges();
      expect(container.classList.contains('mdc-dialog--closing')).toBeTrue();
      expect(overlay.querySelector('mat-dialog-container')).toBe(container);
      expect(bar.selectedFilterValue(bar.definitions[0])).toBeFalse();
      tick(279); expect(overlay.querySelector('mat-dialog-container')).toBe(container);
      tick(2); fixture.detectChanges();
      expect(overlay.querySelector('mat-dialog-container')).toBeNull();
      expect(bar.mobileFiltersOpen).toBeFalse();
      if (close === 'aplicar') expect(emit).toHaveBeenCalledOnceWith({ active: false });
      else expect(emit).not.toHaveBeenCalled();
    }));
  }

  it('não aguarda a transição quando movimento reduzido está ativado', fakeAsync(() => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    bar.openMobileFilters(); fixture.detectChanges(); tick();
    bar.closeMobileFilters(); tick(); fixture.detectChanges();
    expect(overlay.querySelector('mat-dialog-container')).toBeNull();
    expect(bar.mobileFiltersOpen).toBeFalse();
  }));
});
