import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { PRIMEIRO_PEDIDO_JORNADA } from '../jornadas/jornada.constants';
import { JornadaService } from '../jornadas/jornada.service';
import { PrimeiroPedidoBoasVindasComponent } from './primeiro-pedido-boas-vindas.component';

describe('PrimeiroPedidoBoasVindasComponent', () => {
  let fixture: ComponentFixture<PrimeiroPedidoBoasVindasComponent>;
  let component: PrimeiroPedidoBoasVindasComponent;
  let jornada: jasmine.SpyObj<JornadaService>;
  let router: jasmine.SpyObj<Router>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<PrimeiroPedidoBoasVindasComponent>>;
  let toastr: jasmine.SpyObj<ToastrService>;

  const response = { jornada: 'PRIMEIRO_PEDIDO', versao: 1, status: 'NAO_INICIADO' as const };

  function create(): void {
    fixture = TestBed.createComponent(PrimeiroPedidoBoasVindasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    jornada = jasmine.createSpyObj<JornadaService>('JornadaService', ['oferecer', 'iniciar', 'ignorar']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<PrimeiroPedidoBoasVindasComponent>>('MatDialogRef', ['close']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['warning', 'error']);

    jornada.oferecer.and.returnValue(of(response));
    jornada.iniciar.and.returnValue(of({ ...response, status: 'EM_ANDAMENTO' }));
    jornada.ignorar.and.returnValue(of({ ...response, status: 'IGNORADO' }));

    TestBed.configureTestingModule({
      imports: [PrimeiroPedidoBoasVindasComponent, NoopAnimationsModule],
      providers: [
        { provide: JornadaService, useValue: jornada },
        { provide: Router, useValue: router },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: ToastrService, useValue: toastr },
        { provide: MAT_DIALOG_DATA, useValue: { empresaNome: 'Grafica Azul' } },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('registra oferta quando o modal e renderizado, sem iniciar automaticamente', () => {
    create();

    expect(jornada.oferecer).toHaveBeenCalledOnceWith(PRIMEIRO_PEDIDO_JORNADA);
    expect(jornada.iniciar).not.toHaveBeenCalled();
    expect(text()).toContain('Bem-vindo ao ClickManager');
    expect(text()).toContain('Criar meu primeiro pedido');
    expect(text()).toContain('Explorar sozinho');
  });

  it('inicia a jornada e navega para pedidos somente apos sucesso', fakeAsync(() => {
    create();

    component.criarPrimeiroPedido();
    tick();

    expect(jornada.iniciar).toHaveBeenCalledWith(PRIMEIRO_PEDIDO_JORNADA, { etapa: PRIMEIRO_PEDIDO_JORNADA.etapaInicial });
    expect(dialogRef.close).toHaveBeenCalledWith('iniciado');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/page/grafica/comercial/pedidos');
  }));

  it('mantem modal aberto e permite retry quando iniciar falha', fakeAsync(() => {
    jornada.iniciar.and.returnValues(
      throwError(() => new Error('falha')),
      of({ ...response, status: 'EM_ANDAMENTO' }),
    );
    create();

    component.criarPrimeiroPedido();
    tick();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(toastr.error).toHaveBeenCalled();
    expect(component.erroAcao).toContain('Não foi possível iniciar');

    component.criarPrimeiroPedido();
    tick();

    expect(dialogRef.close).toHaveBeenCalledWith('iniciado');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/page/grafica/comercial/pedidos');
  }));

  it('ignora a jornada, fecha e permanece no fluxo atual', fakeAsync(() => {
    create();

    component.explorarSozinho();
    tick();

    expect(jornada.ignorar).toHaveBeenCalledOnceWith(PRIMEIRO_PEDIDO_JORNADA);
    expect(dialogRef.close).toHaveBeenCalledWith('ignorado');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  }));

  it('mantem modal aberto quando ignorar falha', fakeAsync(() => {
    jornada.ignorar.and.returnValue(throwError(() => new Error('falha')));
    create();

    component.explorarSozinho();
    tick();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(toastr.error).toHaveBeenCalled();
    expect(component.erroAcao).toContain('Não foi possível salvar');
  }));

  it('falha ao oferecer nao bloqueia as acoes do usuario', fakeAsync(() => {
    jornada.oferecer.and.returnValue(throwError(() => new Error('falha')));
    create();
    tick();

    expect(toastr.warning).toHaveBeenCalled();
    expect(component.erroOferta).toContain('registrar esta apresentação');

    component.criarPrimeiroPedido();
    tick();

    expect(jornada.iniciar).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith('iniciado');
  }));

  it('permanece utilizavel em viewport pequeno', () => {
    create();
    fixture.nativeElement.style.width = '390px';
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.map((button) => button.textContent?.trim()).join(' ')).toContain('Criar meu primeiro pedido');
    expect(buttons.length).toBe(2);
    expect(buttons.every((button) => button.disabled === false)).toBeTrue();
  });

  function text(): string {
    return (fixture.nativeElement.textContent || '').replace(/\s+/g, ' ').trim();
  }
});
