import { TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { InputNumericoComponent } from './input-numerico.component';

describe('InputNumericoComponent: decimal opt-in', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [InputNumericoComponent], providers: [provideNoopAnimations()] }));
  afterEach(() => TestBed.resetTestingModule());

  it('mantém o input inteiro e o filtro de teclas para consumidores existentes', () => {
    const fixture = TestBed.createComponent(InputNumericoComponent);
    fixture.componentRef.setInput('control', new FormControl(1)); fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('text'); expect(input.inputMode).toBe('numeric');
    const key = new KeyboardEvent('keydown', { key: '.', cancelable: true }); input.dispatchEvent(key);
    expect(key.defaultPrevented).toBeTrue();
  });

  it('usa o value accessor numérico do Angular somente com decimal habilitado', () => {
    const fixture = TestBed.createComponent(InputNumericoComponent);
    const control = new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]);
    fixture.componentRef.setInput('control', control); fixture.componentRef.setInput('decimal', true); fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('number'); expect(input.inputMode).toBe('decimal'); expect(input.step).toBe('any');
    input.value = '1.25'; input.dispatchEvent(new Event('input'));
    expect(control.value).toBe(1.25); expect(control.valid).toBeTrue();
    input.value = ''; input.dispatchEvent(new Event('input'));
    expect(control.value).toBeNull(); expect(control.hasError('required')).toBeTrue();
  });

  it('respeita validators e mensagem externos, sem adicionar regras financeiras', () => {
    const fixture = TestBed.createComponent(InputNumericoComponent);
    const control = new FormControl(4, [Validators.max(3)]);
    fixture.componentRef.setInput('control', control); fixture.componentRef.setInput('decimal', true);
    fixture.componentRef.setInput('errorText', 'Máximo: 3 cm'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-error')).toBeNull();
    control.markAsTouched(); fixture.componentRef.setInput('label', 'Largura'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-error').textContent).toContain('Máximo: 3 cm');
    expect(control.value).toBe(4);
  });
});
