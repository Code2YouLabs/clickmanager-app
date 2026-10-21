import { BreakpointObserver } from '@angular/cdk/layout';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { InputCepComponent } from 'src/app/components/inputs/input-cep/input-cep.component';
import { TutorialService } from 'src/app/shared/tutorial/tutorial.service';
import { CepUtilService } from 'src/app/utils/cep-util.service';
import { ClienteService } from '../cliente.service';
import { ClienteCreateFormComponent } from '../cliente-create-form/cliente-create-form.component';
import { ClienteCreateDialogComponent, ClienteCreateDialogData } from './cliente-create-dialog.component';

describe('ClienteCreateDialogComponent — cadastro rápido mobile', () => {
  let fixture: ComponentFixture<ClienteCreateDialogComponent>;
  let component: ClienteCreateFormComponent;
  let viewport: BehaviorSubject<any>;
  let save: Subject<any>;
  let lookup: Subject<any>;
  let service: jasmine.SpyObj<ClienteService>;
  let cep: jasmine.SpyObj<CepUtilService>;
  let dialog: jasmine.SpyObj<MatDialogRef<ClienteCreateDialogComponent>>;
  let toastr: jasmine.SpyObj<ToastrService>;
  const client = { id: 7, nome: 'Ana', telefone: '11987654321' };
  const query = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const input = (name: string) => query(`[data-client-field="${name}"] input`) as HTMLInputElement;
  const fill = () => component.form.patchValue({ nome: 'Ana', telefone: '11987654321' });
  const toggle = () => { query('.cliente-additional-toggle').click(); fixture.detectChanges(); };
  function create(data: ClienteCreateDialogData = { mobileMode: 'quick' }, mobile = true): void {
    viewport.next({ matches: mobile, breakpoints: {} });
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    fixture = TestBed.createComponent(ClienteCreateDialogComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    component = fixture.debugElement.query(By.directive(ClienteCreateFormComponent)).componentInstance;
  }
  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} });
    save = new Subject(); lookup = new Subject();
    service = jasmine.createSpyObj('ClienteService', ['salvar']); service.salvar.and.returnValue(save);
    cep = jasmine.createSpyObj('CepUtilService', ['buscarEndereco']); cep.buscarEndereco.and.returnValue(lookup);
    dialog = jasmine.createSpyObj('MatDialogRef', ['close']);
    toastr = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    TestBed.configureTestingModule({ imports: [ClienteCreateDialogComponent, NoopAnimationsModule], providers: [
      { provide: MAT_DIALOG_DATA, useValue: null }, { provide: MatDialogRef, useValue: dialog },
      { provide: BreakpointObserver, useValue: { observe: () => viewport } },
      { provide: ClienteService, useValue: service }, { provide: CepUtilService, useValue: cep },
      { provide: ToastrService, useValue: toastr },
      { provide: TutorialService, useValue: { registerTarget: () => () => {} } },
    ] });
  });
  afterEach(() => { fixture?.nativeElement.remove(); });

  it('simplifica o cabeçalho, exibe essenciais uma vez e recolhe somente adicionais', () => {
    create();
    expect(query('.dialog-head').textContent).toContain('Novo cliente');
    expect(query('.dialog-head__copy span')).toBeNull();
    expect(query('.dialog-head button').getAttribute('aria-label')).toBe('Fechar');
    expect(fixture.nativeElement.querySelectorAll('input').length).toBe(11);
    for (const name of ['nome', 'telefone', 'email']) {
      expect(input(name).closest('[hidden]')).toBeNull();
      expect(input(name).getAttribute('aria-labelledby')).toBeTruthy();
    }
    expect(input('nome').getAttribute('inputmode')).toBe('text');
    expect(input('telefone').getAttribute('type')).toBe('tel');
    expect(input('email').getAttribute('type')).toBe('email');
    expect(query('#novo-cliente-adicionais').hidden).toBeTrue();
    expect(query('.cliente-additional-toggle').getAttribute('aria-expanded')).toBe('false');
    expect(query('.cliente-dialog-section__header')).toBeNull();
    expect(query('button[form="novo-cliente-dialog-form"]').textContent).toContain('Salvar cliente');
  });

  it('expande por botão nativo e preserva controles e valores ao recolher', fakeAsync(() => {
    create(); toggle();
    const original = input('documento');
    component.documentoControl.setValue('12345678901');
    component.enderecoGroup.patchValue({ numero: '12', complemento: 'Casa', cidade: 'São Paulo' });
    tick(60); toggle();
    expect(query('#novo-cliente-adicionais').hidden).toBeTrue();
    toggle();
    expect(query('.cliente-additional-toggle').getAttribute('aria-expanded')).toBe('true');
    expect(input('documento')).toBe(original);
    expect(component.documentoControl.value).toBe('12345678901');
    expect(component.numeroControl.value).toBe('12');
    expect(component.complementoControl.value).toBe('Casa');
    expect(component.cidadeControl.value).toBe('São Paulo');
  }));

  it('mantém obrigatórios, email opcional e direciona foco ao primeiro erro', () => {
    create(); component.salvar(); fixture.detectChanges();
    expect(component.nomeControl.hasError('required')).toBeTrue();
    expect(component.telefoneControl.hasError('required')).toBeTrue();
    expect(document.activeElement).toBe(input('nome'));
    fill(); component.emailControl.setValue('inválido'); component.salvar(); fixture.detectChanges();
    expect(document.activeElement).toBe(input('email'));
    expect(service.salvar).not.toHaveBeenCalled();
    component.emailControl.reset(''); expect(component.emailControl.valid).toBeTrue();
  });

  for (const name of ['documento', 'endereco.cep']) {
    it(`abre adicionais e foca ${name} inválido sem ocultar a mensagem ao recolher`, () => {
      create(); fill(); component.form.get(name)!.setValue('123');
      component.salvar(); fixture.detectChanges();
      expect(query('#novo-cliente-adicionais').hidden).toBeFalse();
      expect(document.activeElement).toBe(input(name));
      expect(query('mat-error, .cliente-field-error')).toBeTruthy();
      expect(service.salvar).not.toHaveBeenCalled();
      toggle(); expect(component.additionalExpanded).toBeTrue();
    });
  }

  it('preserva consulta CEP, carregamento, preenchimento e edição manual', fakeAsync(() => {
    create(); toggle(); input('endereco.cep').value = '01001000';
    input('endereco.cep').dispatchEvent(new Event('input', { bubbles: true })); fixture.detectChanges();
    component.numeroControl.setValue('42'); component.complementoControl.setValue('Casa'); tick(60);
    const field = fixture.debugElement.query(By.directive(InputCepComponent)).componentInstance as InputCepComponent;
    (query('app-input-cep button') as HTMLButtonElement).click(); fixture.detectChanges();
    expect(cep.buscarEndereco).toHaveBeenCalledOnceWith('01001000'); expect(field.carregando).toBeTrue();
    lookup.next({ logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP' });
    lookup.complete(); tick(60); fixture.detectChanges();
    expect(field.carregando).toBeFalse(); expect(component.logradouroControl.value).toBe('Praça da Sé');
    expect(component.cidadeControl.value).toBe('São Paulo'); expect(component.estadoControl.value).toBe('SP');
    expect(component.numeroControl.value).toBe('42'); expect(component.complementoControl.value).toBe('Casa');
    component.logradouroControl.setValue('Endereço corrigido'); toggle(); toggle();
    expect(component.logradouroControl.value).toBe('Endereço corrigido');
    component.onEnderecoEncontrado(null); expect(component.cidadeControl.value).toBe('São Paulo');
  }));

  it('salva uma vez, mantém estado pendente e retorna apenas o cliente confirmado', () => {
    create(); fill(); component.salvar(); component.salvar(); fixture.detectChanges();
    expect(service.salvar).toHaveBeenCalledTimes(1);
    expect(service.salvar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ nome: 'Ana', telefone: '11987654321', email: null, documento: null }));
    expect(component.salvando).toBeTrue();
    expect((query('button[type="submit"]') as HTMLButtonElement).disabled).toBeTrue();
    expect(dialog.close).not.toHaveBeenCalled();
    save.next(client); save.complete(); expect(dialog.close).toHaveBeenCalledOnceWith(client);
  });

  it('mantém valores e painel aberto no erro de API e permite tentar novamente', () => {
    create(); fill(); component.salvar(); save.error({ status: 500 }); fixture.detectChanges();
    expect(dialog.close).not.toHaveBeenCalled(); expect(component.salvando).toBeFalse();
    expect(component.nomeControl.value).toBe('Ana'); expect(toastr.error).toHaveBeenCalled();
    save = new Subject(); service.salvar.and.returnValue(save); component.salvar();
    expect(service.salvar).toHaveBeenCalledTimes(2); save.next(client);
    expect(dialog.close).toHaveBeenCalledOnceWith(client);
  });

  it('cancela pelo botão sem cadastrar', () => {
    create(); query('.dialog-actions button[type="button"]').click();
    expect(service.salvar).not.toHaveBeenCalled(); expect(dialog.close).toHaveBeenCalledOnceWith(null);
  });

  for (const context of ['desktop', 'outro consumidor'] as const) {
    it(`preserva cadastro completo em ${context}`, () => {
      create(context === 'desktop' ? { mobileMode: 'quick' } : {}, context !== 'desktop');
      expect(component.quickMobile).toBeFalse();
      expect(query('.dialog-head__copy span').textContent).toContain('Cadastre os dados essenciais');
      expect(query('.cliente-additional-toggle')).toBeNull();
      expect(query('#novo-cliente-adicionais').hidden).toBeFalse();
      expect(input('documento').closest('section')!.textContent).toContain('Dados básicos');
      expect(fixture.nativeElement.querySelectorAll('input').length).toBe(11);
    });
  }
});
