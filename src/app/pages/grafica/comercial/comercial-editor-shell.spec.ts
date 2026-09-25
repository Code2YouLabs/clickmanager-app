import { registerLocaleData } from '@angular/common';
import ptBr from '@angular/common/locales/pt';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { GraficaProdutoService } from '../shared/grafica.service';
import { ClienteService } from '../../cliente/cliente.service';
import { ComercialEditorComponent } from './comercial-editor.component';

describe('ComercialEditorComponent shell e formulário nativo', () => {
  let fixture: ComponentFixture<ComercialEditorComponent>;
  beforeEach(() => {
    registerLocaleData(ptBr, 'pt-BR');
    TestBed.configureTestingModule({ imports: [ComercialEditorComponent, NoopAnimationsModule], providers: [
      provideRouter([]), provideHttpClient(),
      { provide: GraficaProdutoService, useValue: {} },
      { provide: ClienteService, useValue: { buscarPorNome: () => of({ content: [] }) } },
      { provide: ToastrService, useValue: { error: jasmine.createSpy() } },
      { provide: AuthService, useValue: { getUsuario: () => ({ proprietario: true }), temPermissao: () => true } },
    ] });
    // Angular captures lifecycle hooks from the prototype on first view creation.
    // Domain loading is covered separately; this fixture exercises the actual form/footer.
    spyOn(ComercialEditorComponent.prototype, 'ngOnInit');
    fixture = TestBed.createComponent(ComercialEditorComponent);
    fixture.componentInstance.tipo = 'pedidos';
  });
  afterEach(() => TestBed.resetTestingModule());
  it('associa o footer ao formulário sem forms aninhados ou submit duplicado', () => {
    const editor = fixture.componentInstance;
    spyOnProperty(editor, 'podeSalvar', 'get').and.returnValue(true);
    const salvar = spyOn(editor, 'salvar'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form form')).toBeNull();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[form="comercial-editor-form"]');
    expect(button.type).toBe('submit'); expect(button.form?.id).toBe('comercial-editor-form');
    const payment = fixture.nativeElement.querySelector('.payment-form');
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    payment.querySelector('input').dispatchEvent(enter); expect(enter.defaultPrevented).toBeTrue();
    const buttonEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    payment.querySelector('button').dispatchEvent(buttonEnter); expect(buttonEnter.defaultPrevented).toBeFalse();
    expect(salvar).not.toHaveBeenCalled();
    button.click(); expect(salvar).toHaveBeenCalledTimes(1);
    editor.salvando = true; fixture.detectChanges(); expect(button.disabled).toBeTrue();
  });
  it('não oferece um formulário vazio como detalhe em carregamento ou sem acesso', () => {
    const editor = fixture.componentInstance; editor.pedidoId = 22; editor.carregando = true; fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carregando registro');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    editor.carregando = false; editor.acessoNegado = true; fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('não possui permissão');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
});
