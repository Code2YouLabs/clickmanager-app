import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { InputPesquisaComponent } from './input-pesquisa.component';

describe('InputPesquisaComponent', () => {
  let fixture: ComponentFixture<InputPesquisaComponent>;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InputPesquisaComponent, NoopAnimationsModule] });
    fixture = TestBed.createComponent(InputPesquisaComponent);
    fixture.detectChanges();
  });
  afterEach(() => fixture.destroy());

  it('preserva debounce legado de 400ms e o texto digitado', fakeAsync(() => {
    const emit = spyOn(fixture.componentInstance.valorAlterado, 'emit');
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = ' papel '; input.dispatchEvent(new Event('input'));
    tick(399); expect(emit).not.toHaveBeenCalled();
    tick(1); expect(emit).toHaveBeenCalledOnceWith(' papel ');
  }));

  it('cancela busca pendente ao receber valor externo sem emitir novamente', fakeAsync(() => {
    const emit = spyOn(fixture.componentInstance.valorAlterado, 'emit');
    fixture.componentInstance.pesquisaControl.setValue('antigo'); tick(100);
    fixture.componentRef.setInput('value', 'externo'); fixture.detectChanges(); tick(500);
    expect(fixture.nativeElement.querySelector('input').value).toBe('externo');
    expect(emit).not.toHaveBeenCalled();
    fixture.componentInstance.pesquisaControl.setValue('novo'); tick(400);
    expect(emit).toHaveBeenCalledOnceWith('novo');
  }));

  it('cancela emissao pendente ao destruir o componente', fakeAsync(() => {
    const emit = spyOn(fixture.componentInstance.valorAlterado, 'emit');
    fixture.componentInstance.pesquisaControl.setValue('pendente');
    fixture.destroy(); tick(500);
    expect(emit).not.toHaveBeenCalled();
  }));
});
