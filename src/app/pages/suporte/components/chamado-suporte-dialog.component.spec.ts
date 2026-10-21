import { OverlayContainer } from '@angular/cdk/overlay';
import { openMobileSidePanel } from 'src/app/components/mobile-side-panel/mobile-side-panel';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
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

  function setup(mobilePanel = false): void {
    service = jasmine.createSpyObj<SuporteService>('SuporteService', ['criar$']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<ChamadoSuporteDialogComponent>>('MatDialogRef', ['close']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    service.criar$.and.returnValue(of(chamadoDetalhe()));

    TestBed.configureTestingModule({
      imports: [ChamadoSuporteDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { mobilePanel } },
        { provide: SuporteService, useValue: service },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: ToastrService, useValue: toastr },
      ],
    });

    fixture = TestBed.createComponent(ChamadoSuporteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }


  it('mobile reutiliza shell lateral, mantém submit e protege cancelar/fechar durante envio', () => {
    setup(true);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.classList.contains('mobile-side-panel__layout')).toBeTrue();
    expect(root.querySelector('.mobile-side-panel__header h2')?.textContent).toBe('Novo chamado');
    expect(root.querySelector('.mobile-side-panel__body form')?.id).toBe('novo-chamado-form');
    expect(root.querySelector('.mobile-side-panel__footer [type="submit"]')?.getAttribute('form')).toBe('novo-chamado-form');
    component.salvando = true; fixture.detectChanges();
    expect(root.querySelector<HTMLButtonElement>('[aria-label="Fechar novo chamado"]')!.disabled).toBeTrue();
    component.cancelar(); expect(dialogRef.close).not.toHaveBeenCalled();
    component.salvando = false; fixture.detectChanges(); root.querySelector<HTMLButtonElement>('[aria-label="Fechar novo chamado"]')!.click();
    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });


  for (const width of [360, 390, 430]) it(`painel compartilhado mantém formulário e ações acessíveis em ${width}px`, async () => {
    setup(true);
    const ref = openMobileSidePanel(TestBed.inject(MatDialog), ChamadoSuporteDialogComponent, { data: { mobilePanel: true }, disableClose: true });
    fixture.detectChanges(); await fixture.whenStable();
    const pane = document.querySelector<HTMLElement>('.mobile-side-panel')!.cloneNode(true) as HTMLElement;
    pane.style.cssText = 'position:fixed;top:0;right:0;width:100vw;height:100dvh;max-width:100vw;max-height:100dvh';
    const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:900px;border:0`; document.body.appendChild(frame);
    try {
      const doc = frame.contentDocument!; const style = doc.createElement('style');
      style.textContent = Array.from(document.styleSheets).map(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n')).join('\n') + '\nbody { margin:0; } .mobile-side-panel .mat-mdc-dialog-inner-container { animation:none!important;transform:none!important; }';
      doc.head.appendChild(style); doc.body.appendChild(pane);
      const body = doc.querySelector<HTMLElement>('.mobile-side-panel__body')!;
      expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
      expect(frame.contentWindow!.getComputedStyle(body).overflowY).toBe('auto');
      expect(doc.querySelector('.mobile-side-panel__footer')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(900);
      expect(doc.querySelector('[aria-label="Fechar novo chamado"]')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    } finally { frame.remove(); ref.close(); await fixture.whenStable(); TestBed.inject(OverlayContainer).ngOnDestroy(); }
  });

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
