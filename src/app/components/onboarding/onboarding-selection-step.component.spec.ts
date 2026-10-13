import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { OnboardingSelectionStepComponent } from './onboarding-selection-step.component';

describe('OnboardingSelectionStepComponent', () => {
  let fixture: ComponentFixture<OnboardingSelectionStepComponent>;
  let component: OnboardingSelectionStepComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingSelectionStepComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingSelectionStepComponent);
    component = fixture.componentInstance;
    component.titulo = 'Produtos iniciais';
    component.items = [
      { id: 1, nome: 'Cartão de visita' },
      { id: 2, nome: 'Banner' },
      { id: 3, nome: 'Adesivo' },
    ];
    component.selectedIds = new Set<number>();
    fixture.detectChanges();
  });

  it('mostra acao em massa explicita antes da lista e contador total', () => {
    const text = fixture.nativeElement.textContent;
    const bulkIndex = text.indexOf('Selecionar todos os 3 itens');
    const firstItemIndex = text.indexOf('Cartão de visita');

    expect(bulkIndex).toBeGreaterThan(-1);
    expect(firstItemIndex).toBeGreaterThan(bulkIndex);
    expect(text).toContain('0 de 3 selecionados');
  });

  it('emite selecionar todos, desmarcar todos e preserva selecao parcial', () => {
    spyOn(component.toggleAll, 'emit');
    spyOn(component.toggleItem, 'emit');

    const selectAll = fixture.debugElement.query(By.css('.selection-step__quick-buttons button'));
    selectAll.triggerEventHandler('click');
    expect(component.toggleAll.emit).toHaveBeenCalledOnceWith(true);

    component.selectedIds = new Set([1, 2, 3]);
    fixture.detectChanges();
    const clearAll = fixture.debugElement.query(By.css('.selection-step__quick-buttons button'));
    clearAll.triggerEventHandler('click');
    expect(component.toggleAll.emit).toHaveBeenCalledWith(false);

    component.selectedIds = new Set([1]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1 de 3 selecionados');

    const itemCheckbox = fixture.debugElement.query(By.css('.selection-step__grid mat-checkbox'));
    itemCheckbox.triggerEventHandler('change', { checked: false });
    expect(component.toggleItem.emit).toHaveBeenCalledWith({ checked: false, id: 1 });
  });
});
