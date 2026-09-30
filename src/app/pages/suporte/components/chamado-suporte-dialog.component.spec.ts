import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { of, Subject, throwError } from 'rxjs';
import { ChamadoSuporteDialogComponent } from './chamado-suporte-dialog.component';
import { SuporteService } from '../services/suporte.service';
import { ChamadoSuporteDetalhe } from '../models/chamado-suporte.model';

describe('ChamadoSuporteDialogComponent', () => {
  let fixture: ComponentFixture<ChamadoSuporteDialogComponent>;
  let component: ChamadoSuporteDialogComponent;
  let service: jasmine.SpyObj<SuporteService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ChamadoSuporteDialogComponent>>;
  let toastr: jasmine.SpyObj<ToastrService>;

  function setup(): void {
    service = jasmine.createSpyObj<SuporteService>('SuporteService', ['criar$']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<ChamadoSuporteDialogComponent>>('MatDialogRef', ['close']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    service.criar$.and.returnValue(of(chamadoDetalhe()));

    TestBed.configureTestingModule({
      imports: [ChamadoSuporteDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: SuporteService, useValue: service },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: ToastrService, useValue: toastr },
      ],
    });

    fixture = TestBed.createComponent(ChamadoSuporteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  it('inicializa defaults de categoria e prioridade', () => {
    setup();

    expect(component.categoriaControl.value).toBe('DUVIDA');
    expect(component.prioridadeControl.value).toBe('MEDIA');
  });

  it('usa inputs compartilhados e submit associado ao form id', () => {
    setup();

    expect(fixture.debugElement.query(By.css('app-input-texto-restrito'))).toBeTruthy();
    expect(fixture.debugElement.queryAll(By.css('app-input-options')).length).toBe(2);
    expect(fixture.debugElement.query(By.css('app-input-textarea'))).toBeTruthy();
    expect(fixture.nativeElement.querySelector('form')?.getAttribute('id')).toBe('novo-chamado-form');
    expect(fixture.nativeElement.querySelector('button[type="submit"]')?.getAttribute('form')).toBe('novo-chamado-form');
  });

  it('preserva validators obrigatórios e maxlength', () => {
    setup();

    component.assuntoControl.setValue('');
    component.mensagemControl.setValue('x'.repeat(3001));
    component.salvar();

    expect(service.criar$).not.toHaveBeenCalled();
    expect(component.assuntoControl.hasError('required')).toBeTrue();
    expect(component.mensagemControl.hasError('maxlength')).toBeTrue();
  });

  it('envia payload trimado pelo submit nativo e fecha com o chamado criado', () => {
    setup();
    component.form.patchValue({
      assunto: '  Assunto de teste  ',
      categoria: 'ERRO',
      prioridade: 'ALTA',
      mensagem: '  Mensagem inicial  ',
    });
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(service.criar$).toHaveBeenCalledOnceWith({
      assunto: 'Assunto de teste',
      categoria: 'ERRO',
      prioridade: 'ALTA',
      mensagem: 'Mensagem inicial',
    });
    expect(toastr.success).toHaveBeenCalledWith('Chamado aberto com sucesso.');
    expect(dialogRef.close).toHaveBeenCalledWith(chamadoDetalhe());
  });

  it('bloqueia duplo submit enquanto cria chamado', () => {
    const criar$ = new Subject<ChamadoSuporteDetalhe>();
    setup();
    service.criar$.and.returnValue(criar$.asObservable());
    component.form.patchValue({
      assunto: 'Assunto',
      categoria: 'DUVIDA',
      prioridade: 'MEDIA',
      mensagem: 'Mensagem',
    });

    component.salvar();
    component.salvar();

    expect(service.criar$).toHaveBeenCalledTimes(1);
  });

  it('preserva dados em erro e libera nova tentativa', () => {
    setup();
    service.criar$.and.returnValue(throwError(() => ({ userMessage: 'Falha ao criar' })));
    component.form.patchValue({
      assunto: 'Assunto',
      categoria: 'DUVIDA',
      prioridade: 'MEDIA',
      mensagem: 'Mensagem',
    });

    component.salvar();

    expect(component.assuntoControl.value).toBe('Assunto');
    expect(component.salvando).toBeFalse();
    expect(toastr.error).toHaveBeenCalledWith('Falha ao criar');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('cancelar fecha sem request quando não está salvando', () => {
    setup();

    component.cancelar();

    expect(service.criar$).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });
});

function chamadoDetalhe(): ChamadoSuporteDetalhe {
  return {
    id: 12,
    assunto: 'Assunto de teste',
    categoria: 'ERRO',
    prioridade: 'ALTA',
    status: 'ABERTO',
    criadoEm: '2026-09-29T10:00:00',
    atualizadoEm: '2026-09-29T10:00:00',
    fechadoEm: null,
    usuarioSolicitanteId: 1,
    usuarioSolicitanteNome: 'Cliente',
    mensagens: [],
  };
}
