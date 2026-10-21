import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { InputPesquisaComponent } from './input-pesquisa.component';

describe('InputPesquisaComponent', () => {
  let viewport: BehaviorSubject<any>;
  let fixture: ComponentFixture<InputPesquisaComponent>;
  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: false, breakpoints: {} });
    TestBed.configureTestingModule({ imports: [InputPesquisaComponent, NoopAnimationsModule], providers: [{ provide: BreakpointObserver, useValue: { observe: () => viewport } }] });
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
  it('foca o input na primeira interação mobile sem alterar valor ou debounce', fakeAsync(() => {
    viewport.next({ matches: true, breakpoints: {} }); fixture.componentRef.setInput('compact', true); fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const emit = spyOn(fixture.componentInstance.valorAlterado, 'emit');
    fixture.nativeElement.querySelector('mat-icon').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('inputmode')).toBe('text');
    expect(input.getAttribute('enterkeyhint')).toBe('search');
    expect(input.getAttribute('autocomplete')).toBe('off');
    tick(500); expect(emit).not.toHaveBeenCalled();
    viewport.next({ matches: false, breakpoints: {} }); fixture.detectChanges();
    expect(input.getAttribute('autocomplete')).toBeNull(); fixture.nativeElement.remove();
  }));

});
