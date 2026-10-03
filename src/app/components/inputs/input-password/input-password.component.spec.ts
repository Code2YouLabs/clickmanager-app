import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormControl, Validators } from '@angular/forms';
import { InputPasswordComponent } from './input-password.component';
describe('InputPassword compartilhado', () => {
  it('alterna visibilidade sem submit e mantém valor e autocomplete', () => {
    TestBed.configureTestingModule({ imports: [InputPasswordComponent, NoopAnimationsModule] });
    const fixture = TestBed.createComponent(InputPasswordComponent);
    fixture.componentRef.setInput('control', new FormControl('segredo')); fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(input.type).toBe('password'); expect(input.autocomplete).toBe('new-password'); expect(button.type).toBe('button');
    button.click(); fixture.detectChanges(); expect(input.type).toBe('text'); expect(input.value).toBe('segredo');
    expect(button.getAttribute('aria-label')).toBe('Ocultar senha');
    button.click(); fixture.detectChanges(); expect(input.type).toBe('password');
    fixture.componentInstance.control.disable(); fixture.detectChanges(); expect(input.disabled).toBeTrue(); expect(button.disabled).toBeTrue();
  });
  it('usa apenas validators fornecidos pelo consumidor', () => {
    const component = new InputPasswordComponent(); component.control = new FormControl(''); component.ngOnInit();
    expect(component.control.valid).toBeTrue(); expect(component.isRequired).toBeFalse();
    component.control.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(10)]); component.control.updateValueAndValidity();
    expect(component.isRequired).toBeTrue(); expect(component.errorMessage()).toBe('Campo obrigatório');
    component.control.setValue('abc'); expect(component.errorMessage()).toBe('Mínimo de 6 caracteres');
    component.control.setValue('x'.repeat(11)); expect(component.errorMessage()).toBe('Máximo de 10 caracteres');
  });
});
