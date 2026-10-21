import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MobileFabActionComponent } from './mobile-fab-action.component';

describe('MobileFabActionComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [MobileFabActionComponent], providers: [provideRouter([])] }));
  it('preserva a apresentação legada e a ação nomeada', () => {
    const f = TestBed.createComponent(MobileFabActionComponent);
    f.componentInstance.label = 'Novo produto'; f.detectChanges();
    const click = spyOn(f.componentInstance.action, 'emit');
    const button = f.nativeElement.querySelector('button');
    expect(button.classList.contains('mobile-fab-action--page')).toBeFalse();
    expect(button.getAttribute('aria-label')).toBe('Novo produto');
    expect(button.type).toBe('button'); button.click(); expect(click).toHaveBeenCalledTimes(1);
  });
  it('oferece posicionamento de página opt-in e bloqueia ação desabilitada', () => {
    const f = TestBed.createComponent(MobileFabActionComponent);
    Object.assign(f.componentInstance, { label: 'Novo', placement: 'page', compact: true, disabled: true }); f.detectChanges();
    const click = spyOn(f.componentInstance.action, 'emit');
    const button = f.nativeElement.querySelector('button');
    expect(button.classList.contains('mobile-fab-action--page')).toBeTrue();
    expect(button.classList.contains('mobile-fab-action--compact')).toBeTrue();
    expect(button.disabled).toBeTrue(); button.click(); f.componentInstance.emitAction();
    expect(click).not.toHaveBeenCalled();
  });
});
