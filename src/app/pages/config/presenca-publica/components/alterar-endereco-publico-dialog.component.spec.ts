import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, throwError } from 'rxjs';
import { AlterarEnderecoPublicoDialogComponent, AlterarEnderecoPublicoDialogData } from './alterar-endereco-publico-dialog.component';
import { PresencaPublicaResponse } from '../presenca-publica.models';
import { PresencaPublicaService } from '../presenca-publica.service';

describe('AlterarEnderecoPublicoDialogComponent', () => {
  let fixture: ComponentFixture<AlterarEnderecoPublicoDialogComponent>;
  let component: AlterarEnderecoPublicoDialogComponent;
  let service: jasmine.SpyObj<PresencaPublicaService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AlterarEnderecoPublicoDialogComponent, PresencaPublicaResponse | undefined>>;
  let toastr: jasmine.SpyObj<ToastrService>;

  const data: AlterarEnderecoPublicoDialogData = {
    presenca: {
      slugPublico: 'santa-luzia',
      dominioProprio: null,
      dominioProprioAtivo: false,
    },
    dominioPublico: 'clickmanager.com.br',
    urlAtual: 'https://santa-luzia.clickmanager.com.br',
  };

  const presencaAlterada: PresencaPublicaResponse = {
    slugPublico: 'nova-loja',
    dominioProprio: null,
    dominioProprioAtivo: false,
  };

  function setup(): void {
    service = jasmine.createSpyObj<PresencaPublicaService>('PresencaPublicaService', [
      'buscar',
      'consultarSlugDisponivel',
      'alterarSlug',
      'configurarDominioProprio',
      'removerDominioProprio',
    ]);
    dialogRef = {
      close: jasmine.createSpy('close'),
      disableClose: false,
    } as unknown as jasmine.SpyObj<MatDialogRef<AlterarEnderecoPublicoDialogComponent, PresencaPublicaResponse | undefined>>;
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'warning', 'error']);

    service.consultarSlugDisponivel.and.returnValue(of({ slug: 'nova-loja', disponivel: true }));
    service.alterarSlug.and.returnValue(of(presencaAlterada));

    TestBed.configureTestingModule({
      imports: [AlterarEnderecoPublicoDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: PresencaPublicaService, useValue: service },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: ToastrService, useValue: toastr },
      ],
    });

    fixture = TestBed.createComponent(AlterarEnderecoPublicoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function buttonByText(text: string): HTMLButtonElement | undefined {
    return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find((button) => button.textContent?.includes(text));
  }

  function closeButton(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('button[aria-label="Fechar"]');
  }

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  it('abre limpo com endereço atual e ação de uso desabilitada', () => {
    setup();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Alterar endereço público');
    expect(text).toContain('Consulte um novo endereço antes de aplicá-lo à sua empresa.');
    expect(text).toContain('Endereço atual');
    expect(text).toContain('Novo subdomínio');
    expect(text).toContain('santa-luzia.clickmanager.com.br');
    expect(fixture.nativeElement.querySelector('.dialog-head')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('mat-divider')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('mat-dialog-content.dialog-content')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('mat-dialog-actions.dialog-actions')).not.toBeNull();
    expect(closeButton()).not.toBeNull();
    expect(component.slugControl.value).toBe('');
    expect(component.slugConsultado).toBeNull();
    expect(buttonByText('Cancelar')).not.toBeNull();
    expect(buttonByText('Usar este endereço')?.disabled).toBeTrue();
  });

  it('botão X fecha sem consultar ou salvar na etapa de pesquisa', () => {
    setup();

    closeButton()?.click();

    expect(service.consultarSlugDisponivel).not.toHaveBeenCalled();
    expect(service.alterarSlug).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledOnceWith(undefined);
  });

  it('valida campo vazio, maxlength e pattern', () => {
    setup();

    component.verificarDisponibilidade();
    expect(component.slugControl.hasError('required')).toBeTrue();
    expect(service.consultarSlugDisponivel).not.toHaveBeenCalled();

    component.slugControl.setValue('a'.repeat(81));
    expect(component.slugControl.hasError('maxlength')).toBeTrue();

    component.slugControl.setValue('-invalido');
    expect(component.slugControl.hasError('pattern')).toBeTrue();
  });

  it('normaliza com slugify antes de consultar', () => {
    setup();

    component.slugControl.setValue('Minha Gráfica');
    component.verificarDisponibilidade();

    expect(component.slugControl.value).toBe('minha-grafica');
    expect(service.consultarSlugDisponivel).toHaveBeenCalledOnceWith('minha-grafica');
  });

  it('mostra pending e impede segunda consulta concorrente', () => {
    const pending$ = new Subject<{ slug: string; disponivel: boolean }>();
    setup();
    service.consultarSlugDisponivel.and.returnValue(pending$.asObservable());

    component.slugControl.setValue('nova-loja');
    component.verificarDisponibilidade();
    fixture.detectChanges();
    component.verificarDisponibilidade();

    expect(component.consultando).toBeTrue();
    expect(service.consultarSlugDisponivel).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('Verificando...');

    pending$.next({ slug: 'nova-loja', disponivel: true });
    fixture.detectChanges();

    expect(component.consultando).toBeFalse();
    expect(component.resultadoDisponivel).toBeTrue();
  });

  it('ignora resposta stale quando o campo muda antes do retorno', () => {
    const pending$ = new Subject<{ slug: string; disponivel: boolean }>();
    setup();
    service.consultarSlugDisponivel.and.returnValue(pending$.asObservable());

    component.slugControl.setValue('consulta-a');
    component.verificarDisponibilidade();
    component.slugControl.setValue('consulta-b');
    pending$.next({ slug: 'consulta-a', disponivel: true });
    fixture.detectChanges();

    expect(component.slugConsultado).toBeNull();
    expect(component.resultadoDisponivel).toBeFalse();
  });

  it('mostra indisponível e permite editar para consultar novamente', () => {
    setup();
    service.consultarSlugDisponivel.and.returnValue(of({ slug: 'ocupado', disponivel: false }));

    component.slugControl.setValue('ocupado');
    component.verificarDisponibilidade();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Esse endereço já está em uso.');
    expect(buttonByText('Usar este endereço')?.disabled).toBeTrue();

    service.consultarSlugDisponivel.and.returnValue(of({ slug: 'livre', disponivel: true }));
    component.slugControl.setValue('livre');
    component.verificarDisponibilidade();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('livre.clickmanager.com.br está disponível');
    expect(buttonByText('Usar este endereço')?.disabled).toBeFalse();
  });

  it('alteração do campo invalida consulta disponível', () => {
    setup();

    component.slugControl.setValue('nova-loja');
    component.verificarDisponibilidade();
    expect(component.resultadoDisponivel).toBeTrue();

    component.slugControl.setValue('outra-loja');

    expect(component.slugConsultado).toBeNull();
    expect(component.resultadoDisponivel).toBeFalse();
  });

  it('usar este endereço troca para confirmação sem salvar', () => {
    setup();

    component.slugControl.setValue('nova-loja');
    component.verificarDisponibilidade();
    component.irParaConfirmacao();
    fixture.detectChanges();

    expect(component.etapa).toBe('confirmacao');
    expect(service.alterarSlug).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Confirmar alteração');
    expect(fixture.nativeElement.textContent).toContain('Revise o novo endereço antes de concluir.');
    expect(fixture.nativeElement.textContent).toContain('Endereço atual');
    expect(fixture.nativeElement.textContent).toContain('santa-luzia.clickmanager.com.br');
    expect(fixture.nativeElement.textContent).toContain('Novo endereço');
    expect(fixture.nativeElement.textContent).toContain('nova-loja.clickmanager.com.br');
    expect(fixture.nativeElement.textContent).toContain('Links compartilhados com o endereço anterior podem deixar de funcionar.');
    expect(buttonByText('Voltar')).not.toBeNull();
    expect(buttonByText('Confirmar alteração')).not.toBeNull();
    expect(buttonByText('Cancelar')).toBeUndefined();
  });

  it('voltar preserva a consulta sem consultar novamente', () => {
    setup();

    component.slugControl.setValue('nova-loja');
    component.verificarDisponibilidade();
    component.irParaConfirmacao();
    component.voltarParaPesquisa();
    fixture.detectChanges();

    expect(component.etapa).toBe('pesquisa');
    expect(component.slugControl.value).toBe('nova-loja');
    expect(component.resultadoDisponivel).toBeTrue();
    expect(service.consultarSlugDisponivel).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('nova-loja.clickmanager.com.br está disponível');
  });

  it('cancelar fecha sem PUT', () => {
    setup();

    component.cancelar();

    expect(service.alterarSlug).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledOnceWith(undefined);
  });

  it('confirmar chama PUT uma vez com payload sem empresaId e retorna response', () => {
    setup();

    component.slugControl.setValue('nova-loja');
    component.verificarDisponibilidade();
    component.irParaConfirmacao();
    component.confirmarAlteracao();

    expect(service.alterarSlug).toHaveBeenCalledOnceWith({ slug: 'nova-loja' });
    expect(service.alterarSlug.calls.mostRecent().args[0]).not.toEqual(jasmine.objectContaining({ empresaId: jasmine.anything() }));
    expect(dialogRef.close).toHaveBeenCalledOnceWith(presencaAlterada);
  });

  it('pending do PUT impede double-submit, voltar e fechar', () => {
    const pending$ = new Subject<PresencaPublicaResponse>();
    setup();
    service.alterarSlug.and.returnValue(pending$.asObservable());

    component.slugControl.setValue('nova-loja');
    component.verificarDisponibilidade();
    component.irParaConfirmacao();
    component.confirmarAlteracao();
    component.confirmarAlteracao();
    component.voltarParaPesquisa();
    component.cancelar();
    fixture.detectChanges();

    expect(component.confirmando).toBeTrue();
    expect(component.etapa).toBe('confirmacao');
    expect(dialogRef.disableClose).toBeTrue();
    expect(service.alterarSlug).toHaveBeenCalledTimes(1);
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(closeButton()?.disabled).toBeTrue();
    expect(buttonByText('Voltar')?.disabled).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Confirmando...');

    pending$.next(presencaAlterada);

    expect(dialogRef.disableClose).toBeFalse();
    expect(dialogRef.close).toHaveBeenCalledOnceWith(presencaAlterada);
  });

  it('erro no PUT mantém dialog aberto, preserva slug e libera retry', () => {
    setup();
    service.alterarSlug.and.returnValues(
      throwError(() => ({ error: { message: 'Slug indisponível' } })),
      of(presencaAlterada)
    );

    component.slugControl.setValue('nova-loja');
    component.verificarDisponibilidade();
    component.irParaConfirmacao();
    component.confirmarAlteracao();
    fixture.detectChanges();

    expect(component.confirmando).toBeFalse();
    expect(component.etapa).toBe('confirmacao');
    expect(component.slugControl.value).toBe('nova-loja');
    expect(component.erroAlteracao).toBe('Slug indisponível');
    expect(dialogRef.close).not.toHaveBeenCalled();

    component.confirmarAlteracao();

    expect(service.alterarSlug).toHaveBeenCalledTimes(2);
    expect(dialogRef.close).toHaveBeenCalledOnceWith(presencaAlterada);
  });
});
