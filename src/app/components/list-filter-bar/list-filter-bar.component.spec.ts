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
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Host, NoopAnimationsModule] });
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
});
