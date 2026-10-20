import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { InputMoedaComponent } from './input-moeda.component';

@Component({ standalone: true, imports: [InputMoedaComponent], template: `
  <app-input-moeda [control]="control" label="Valor" [showControlErrors]="errors" [inputMode]="mode" />
` })
class Host {
  control = new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]);
  errors = false;
  mode: 'decimal' | null = null;
}

describe('InputMoeda: validação acessível opt-in', () => {
  let fixture: ComponentFixture<Host>;
  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Host], providers: [provideNoopAnimations()] });
    fixture = TestBed.createComponent(Host); fixture.detectChanges();
  });

  it('preserva o comportamento padrão sem ativar erro nem teclado opt-in', () => {
    fixture.componentInstance.control.markAsTouched(); fixture.detectChanges();
    expect(input().getAttribute('inputmode')).toBeNull();
    expect(input().getAttribute('aria-invalid')).toBe('false');
    expect(fixture.nativeElement.querySelector('mat-error')).toBeNull();
  });

  it('exibe obrigatoriedade após blur e vincula a mensagem acessível ao input', () => {
    fixture.componentInstance.errors = true; fixture.componentInstance.mode = 'decimal'; fixture.detectChanges();
    input().dispatchEvent(new Event('blur')); fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('mat-error') as HTMLElement;
    expect(error.textContent).toContain('Campo obrigatório');
    expect(input().getAttribute('aria-describedby')).toContain(error.id);
    expect(input().getAttribute('aria-label')).toBe('Valor');
    expect(input().getAttribute('aria-required')).toBe('true');
    // Material exposes aria-required + the described error for empty required fields.
    expect(input().getAttribute('aria-invalid')).toBeNull();
    expect(input().getAttribute('inputmode')).toBe('decimal');
  });

  it('acompanha alterações externas e touched em OnPush sem modificar máscara ou duplicar emissão', () => {
    fixture.componentInstance.errors = true; fixture.detectChanges();
    const control = fixture.componentInstance.control;
    control.markAsTouched(); fixture.detectChanges(); expect(fixture.nativeElement.querySelector('mat-error')).not.toBeNull();
    const changes = jasmine.createSpy(); control.valueChanges.subscribe(changes);
    input().value = '12345'; input().dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(control.value).toBe(123.45); expect(changes).toHaveBeenCalledOnceWith(123.45);
    expect(input().value).toContain('123,45'); expect(fixture.nativeElement.querySelector('mat-error')).toBeNull();
    control.setValue(0); fixture.detectChanges(); expect(input().getAttribute('aria-invalid')).toBe('true');
    control.setValue(1000000000000); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-error').textContent).toContain('Valor máximo permitido');
  });

  it('mantém o controle desabilitado sem habilitá-lo durante a apresentação de erro', () => {
    fixture.componentInstance.errors = true; fixture.detectChanges();
    fixture.componentInstance.control.disable(); fixture.detectChanges();
    expect(input().disabled).toBeTrue(); expect(fixture.componentInstance.control.disabled).toBeTrue();
  });
});
