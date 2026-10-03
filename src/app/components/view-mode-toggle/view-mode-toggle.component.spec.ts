import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ViewModeToggleComponent } from './view-mode-toggle.component';

describe('ViewModeToggleComponent', () => {
  let fixture: ComponentFixture<ViewModeToggleComponent<'lista' | 'kanban'>>;
  let component: ViewModeToggleComponent<'lista' | 'kanban'>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ViewModeToggleComponent, NoopAnimationsModule],
    });

    fixture = TestBed.createComponent(ViewModeToggleComponent<'lista' | 'kanban'>);
    component = fixture.componentInstance;
    component.value = 'lista';
    component.ariaLabel = 'Visualização dos pedidos';
    component.options = [
      { value: 'lista', label: 'Lista', icon: 'view_list' },
      { value: 'kanban', label: 'Kanban', icon: 'view_kanban' },
    ];
    fixture.detectChanges();
  });

  it('renderiza opções com labels, ícones e aria-label', () => {
    const host: HTMLElement = fixture.nativeElement;

    expect(host.querySelector('[aria-label="Visualização dos pedidos"]')).toBeTruthy();
    expect(host.textContent).toContain('Lista');
    expect(host.textContent).toContain('Kanban');
    expect(host.querySelectorAll('mat-icon').length).toBe(2);
  });

  it('emite mudança quando seleciona outro modo', () => {
    spyOn(component.valueChange, 'emit');

    component.onChange('kanban');

    expect(component.valueChange.emit).toHaveBeenCalledOnceWith('kanban');
  });

  it('não emite mudança redundante', () => {
    spyOn(component.valueChange, 'emit');

    component.onChange('lista');

    expect(component.valueChange.emit).not.toHaveBeenCalled();
  });
});
