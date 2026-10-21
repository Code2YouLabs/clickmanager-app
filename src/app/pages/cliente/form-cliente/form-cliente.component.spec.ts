import { BreakpointObserver } from '@angular/cdk/layout';
import { ClienteCreateFormComponent } from '../cliente-create-form/cliente-create-form.component';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { CepUtilService } from 'src/app/utils/cep-util.service';
import { InputCepComponent } from 'src/app/components/inputs/input-cep/input-cep.component';
import { MobileTotalBarComponent } from 'src/app/components/mobile-total-bar/mobile-total-bar.component';
import { ClienteService } from '../cliente.service';
import { FormClienteComponent } from './form-cliente.component';

const endereco = { cep: '01001000', logradouro: 'Praça da Sé', numero: '10', complemento: 'Sala 2', bairro: 'Sé', cidade: 'São Paulo', estado: 'SP' };
const cliente = { id: 7, nome: 'Ana', email: 'ana@example.com', telefone: '11987654321', documento: '', endereco };
const viaCep = { cep: '01001-000', logradouro: 'Rua nova', bairro: 'Centro', localidade: 'São Paulo', uf: 'SP' };
describe('Clientes — formulário e fluxo mobile', () => {
  let fixture: ComponentFixture<FormClienteComponent>;
  let component: FormClienteComponent;
  let service: jasmine.SpyObj<ClienteService>;
  let cep: jasmine.SpyObj<CepUtilService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let params: BehaviorSubject<any>;
  let query: BehaviorSubject<any>;
  let load: Subject<any>;
  let save: Subject<any>;
  let navigate: jasmine.Spy;
  let originalWidth: number;
  let viewport: BehaviorSubject<any>;
  const text = () => fixture.nativeElement.textContent as string;
  const create = (edit = false, mobile = false) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: mobile ? 390 : 1280 });
    viewport.next({ matches: mobile, breakpoints: {} });
    if (edit) params.next(convertToParamMap({ id: '7' }));
    fixture = TestBed.createComponent(FormClienteComponent); component = fixture.componentInstance;
    fixture.detectChanges();
  };
  const fill = () => { component.form.patchValue(cliente); fixture.detectChanges(); };
  const submit = () => fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  const mobileBar = () => fixture.debugElement.query(By.directive(MobileTotalBarComponent)).componentInstance as MobileTotalBarComponent;
  beforeEach(() => {
    originalWidth = window.innerWidth;
    viewport = new BehaviorSubject({ matches: false, breakpoints: {} });
    params = new BehaviorSubject(convertToParamMap({})); query = new BehaviorSubject(convertToParamMap({}));
    load = new Subject(); save = new Subject();
    service = jasmine.createSpyObj('ClienteService', ['buscarPorId', 'salvar', 'atualizar']);
    service.buscarPorId.and.returnValue(load); service.salvar.and.returnValue(save); service.atualizar.and.returnValue(save);
    cep = jasmine.createSpyObj('CepUtilService', ['buscarEndereco']); cep.buscarEndereco.and.returnValue(of(viaCep as any));
    toastr = jasmine.createSpyObj('ToastrService', ['error', 'success']);
    TestBed.configureTestingModule({ imports: [FormClienteComponent, NoopAnimationsModule], providers: [provideRouter([]),
      { provide: BreakpointObserver, useValue: { observe: () => viewport } },
      { provide: ActivatedRoute, useValue: { paramMap: params, queryParamMap: query } },
      { provide: ClienteService, useValue: service }, { provide: CepUtilService, useValue: cep }, { provide: ToastrService, useValue: toastr },
      { provide: AuthService, useValue: { temPermissao: () => true } }
    ] });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });
  afterEach(() => {
    fixture?.destroy(); Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
  });
  it('cria via submit nativo do footer uma única vez e mantém payload completo', () => {
    create(); fill(); document.body.appendChild(fixture.nativeElement);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type=submit]');
    expect(button.form?.id).toBe('cliente-form'); button.click(); button.click(); submit();
    expect(service.salvar).toHaveBeenCalledOnceWith({ nome: cliente.nome, email: cliente.email, telefone: cliente.telefone, documento: '', endereco });
    fixture.detectChanges(); expect(button.disabled).toBeTrue(); expect(text()).toContain('Salvando');
    save.next(cliente); save.complete(); expect(navigate).toHaveBeenCalledOnceWith(['/page/cliente']); fixture.nativeElement.remove();
  });
  it('mantém campos obrigatórios, email válido e documento/endereço opcionais', () => {
    create(); submit(); expect(service.salvar).not.toHaveBeenCalled(); expect(component.nomeControl.touched).toBeTrue();
    component.form.patchValue({ nome: 'Ana', telefone: '11987654321', email: 'inválido' }); submit();
    expect(component.emailControl.invalid).toBeTrue(); expect(service.salvar).not.toHaveBeenCalled();
    component.emailControl.setValue('ana@example.com'); submit(); expect(service.salvar).toHaveBeenCalledTimes(1);
    expect(component.documentoControl.valid).toBeTrue(); expect(component.enderecoGroup.valid).toBeTrue();
  });
  it('mantém máscara e validação de telefone, documento e CEP', () => {
    create(); fill();
    component.telefoneControl.setValue('1'); component.documentoControl.setValue('123'); component.cepControl.setValue('123');
    expect(component.telefoneControl.invalid).toBeTrue(); expect(component.documentoControl.invalid).toBeTrue(); expect(component.cepControl.invalid).toBeTrue();
    submit(); expect(service.salvar).not.toHaveBeenCalled();
  });
  it('não mostra formulário vazio durante carregamento da edição e preserva endereço carregado', () => {
    create(true); expect(text()).toContain('Carregando cliente'); expect(fixture.nativeElement.querySelector('form')).toBeNull();
    component.onSubmit(); expect(service.atualizar).not.toHaveBeenCalled();
    load.next(cliente); fixture.detectChanges();
    expect(component.form.value.endereco).toEqual(endereco); expect(component.nomeControl.value).toBe('Ana');
    expect(fixture.nativeElement.querySelector('app-endereco-form input').value).toBeTruthy();
  });
  it('edita com PUT único mesmo com Enter repetido', () => {
    create(true); load.next(cliente); fixture.detectChanges(); submit(); submit();
    expect(service.atualizar).toHaveBeenCalledTimes(1); expect(service.atualizar.calls.mostRecent().args[0]).toBe(7);
    expect(service.salvar).not.toHaveBeenCalled(); save.next(cliente); save.complete(); expect(navigate).toHaveBeenCalledWith(['/page/cliente']);
  });
  for (const edit of [false, true]) {
    it(`preserva retorno após ${edit ? 'edição' : 'criação'}`, () => {
      query.next(convertToParamMap({ retorno: '/page/pedido/criar' })); create(edit);
      if (edit) { load.next(cliente); fixture.detectChanges(); } else fill();
      submit(); save.next(cliente); save.complete(); expect(navigate).toHaveBeenCalledOnceWith(['/page/pedido/criar']);
    });
  }
  it('mostra erro de edição e retry carrega o formulário', () => {
    create(true); load.error({ status: 500 }); fixture.detectChanges();
    expect(text()).toContain('Não foi possível carregar'); expect(fixture.nativeElement.querySelector('form')).toBeNull();
    load = new Subject(); service.buscarPorId.and.returnValue(load);
    fixture.nativeElement.querySelector('.cliente-form-state button').click(); expect(service.buscarPorId.calls.count()).toBe(2);
    load.next(cliente); fixture.detectChanges(); expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
  });
  it('representa 403 sem formulário nem botão de salvar', () => {
    create(true); load.error({ status: 403 }); fixture.detectChanges(); expect(text()).toContain('Acesso restrito');
    expect(fixture.nativeElement.querySelector('form')).toBeNull(); expect(fixture.nativeElement.querySelector('[type=submit]')).toBeNull();
  });
  it('cancela edição obsoleta em troca de ID', () => {
    create(true); const newer = new Subject<any>(); service.buscarPorId.and.returnValue(newer);
    params.next(convertToParamMap({ id: '8' })); expect(load.observed).toBeFalse(); newer.next({ ...cliente, id: 8, nome: 'Outro' });
    load.next(cliente); fixture.detectChanges(); expect(component.nomeControl.value).toBe('Outro');
    submit(); expect(service.atualizar.calls.mostRecent().args[0]).toBe(8);
  });
  it('falha de salvamento libera nova tentativa e preserva formulário', () => {
    create(); fill(); submit(); save.error({ status: 500 }); fixture.detectChanges();
    expect(component.saving).toBeFalse(); expect(toastr.error).toHaveBeenCalled(); expect(component.nomeControl.value).toBe('Ana');
    save = new Subject(); service.salvar.and.returnValue(save); submit(); expect(service.salvar.calls.count()).toBe(2);
  });
  it('cancelar criação limpa dados e endereço sem navegar nem salvar', () => {
    create(); fill(); component.form.markAllAsTouched(); component.form.markAsDirty();
    fixture.nativeElement.querySelector('.page-card__footer button[type=button]').click();
    expect(component.nomeControl.value).toBe(''); expect(component.emailControl.value).toBe('');
    expect(component.enderecoGroup.value).toEqual({ cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' });
    expect(component.form.pristine).toBeTrue(); expect(component.form.untouched).toBeTrue();
    expect(navigate).not.toHaveBeenCalled(); expect(service.salvar).not.toHaveBeenCalled();
  });
  it('cancelar edição restaura cliente e endereço do backend sem nova consulta', () => {
    create(true); load.next(cliente); fixture.detectChanges();
    component.form.patchValue({ nome: 'Alterado', endereco: { numero: '99', cidade: 'Outra' } });
    fixture.nativeElement.querySelector('.page-card__footer button[type=button]').click();
    expect(component.nomeControl.value).toBe('Ana'); expect(component.enderecoGroup.value).toEqual(endereco);
    expect(service.buscarPorId).toHaveBeenCalledTimes(1); expect(navigate).not.toHaveBeenCalled();
    expect(service.atualizar).not.toHaveBeenCalled();
  });
  it('busca CEP no desktop e preserva número/complemento', () => {
    create(); fill(); const input = fixture.debugElement.query(By.directive(InputCepComponent)).componentInstance as InputCepComponent;
    input.onBlur(); expect(cep.buscarEndereco).toHaveBeenCalledOnceWith('01001000');
    expect(component.enderecoGroup.value).toEqual({ ...endereco, logradouro: 'Rua nova', bairro: 'Centro' });
  });
  it('preserva endereço ao alternar desktop/mobile/desktop', () => {
    create(true); load.next(cliente); fixture.detectChanges();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 }); component.onWindowResize(); fixture.detectChanges();
    component.numeroControl.setValue('20');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 }); component.onWindowResize(); fixture.detectChanges();
    expect(component.enderecoGroup.value).toEqual({ ...endereco, numero: '20' });
  });
  const shared = () => fixture.debugElement.query(By.directive(ClienteCreateFormComponent)).componentInstance as ClienteCreateFormComponent;

  it('mobile usa o formulário compartilhado sem wizard e salva sem adicionais ou email', () => {
    create(false, true); document.body.appendChild(fixture.nativeElement);
    expect(component.useSharedMobileCreate).toBeTrue(); expect(fixture.nativeElement.querySelector('.cliente-mobile-hero')).toBeNull();
    expect(text()).not.toContain('Etapa'); expect(text()).not.toContain('Continuar');
    expect(fixture.nativeElement.querySelector('#novo-cliente-adicionais').hidden).toBeTrue();
    expect(text()).toContain('CPF/CNPJ e endereço'); expect(text()).toContain('Opcional');
    shared().form.patchValue({ nome: 'Ana', telefone: '11987654321' });
    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.form?.id).toBe('novo-cliente-page-form'); button.click(); button.click(); submit(); fixture.detectChanges();
    expect(service.salvar).toHaveBeenCalledTimes(1); expect(service.salvar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ nome: 'Ana', telefone: '11987654321', email: null, documento: null }));
    expect(button.disabled).toBeTrue(); expect(mobileBar().secondaryActionDisabled).toBeTrue();
    expect(navigate).not.toHaveBeenCalled(); save.next(cliente); save.complete(); expect(navigate).toHaveBeenCalledOnceWith(['/page/cliente']);
    fixture.nativeElement.remove();
  });

  it('mobile valida essenciais, mantém valores em erros, expande opcionais e busca CEP', fakeAsync(() => {
    create(false, true); document.body.appendChild(fixture.nativeElement);
    shared().salvar(); fixture.detectChanges();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('[data-client-field="nome"] input'));
    shared().form.patchValue({ nome: 'Ana', telefone: '11987654321', email: 'inválido' }); shared().salvar(); fixture.detectChanges();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('[data-client-field="email"] input'));
    expect(service.salvar).not.toHaveBeenCalled(); shared().emailControl.setValue('');
    fixture.nativeElement.querySelector('.cliente-additional-toggle').click(); fixture.detectChanges();
    const input = fixture.debugElement.query(By.directive(InputCepComponent)).componentInstance as InputCepComponent;
    shared().cepControl.setValue('01001000'); shared().numeroControl.setValue('42'); tick(60); input.onBlur(); expect(cep.buscarEndereco).not.toHaveBeenCalled(); input.buscarEndereco();
    expect(shared().enderecoGroup.value.logradouro).toBe('Rua nova'); expect(shared().numeroControl.value).toBe('42');
    fixture.nativeElement.querySelector('.cliente-additional-toggle').click(); fixture.detectChanges();
    shared().salvar(); save.error({ error: { message: 'Falha no cadastro' } }); fixture.detectChanges();
    expect(toastr.error).toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled(); expect(shared().salvando).toBeFalse(); expect(shared().nomeControl.value).toBe('Ana'); expect(shared().numeroControl.value).toBe('42');
    save = new Subject(); service.salvar.and.returnValue(save); shared().salvar(); expect(service.salvar).toHaveBeenCalledTimes(2);
    tick(100); fixture.nativeElement.remove();
  }));

  it('preserva o rascunho ao alternar mobile/desktop sem mudar validadores desktop', () => {
    create(false, true); shared().form.patchValue({ nome: 'Ana', telefone: '11987654321', email: '', endereco: { numero: '42' } });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 }); viewport.next({ matches: false, breakpoints: {} }); component.onWindowResize(); fixture.detectChanges();
    expect(component.nomeControl.value).toBe('Ana'); expect(component.numeroControl.value).toBe('42'); expect(component.emailControl.hasError('required')).toBeTrue();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 }); viewport.next({ matches: true, breakpoints: {} }); component.onWindowResize(); fixture.detectChanges();
    expect(shared().nomeControl.value).toBe('Ana'); expect(shared().numeroControl.value).toBe('42'); expect(shared().emailControl.valid).toBeTrue(); expect(service.salvar).not.toHaveBeenCalled();
  });

  it('mobile cancela para a listagem sem salvar e respeita loading', () => {
    create(false, true); mobileBar().secondaryAction.emit(); expect(navigate).toHaveBeenCalledWith(['/page/cliente']); expect(service.salvar).not.toHaveBeenCalled();
    navigate.calls.reset(); shared().form.patchValue({ nome: 'Ana', telefone: '11987654321' }); shared().salvar(); fixture.detectChanges();
    component.cancelarCadastroMobile(); shared().cancelar(); expect(navigate).not.toHaveBeenCalled();
  });

  for (const width of [360, 390, 430, 1024, 1440]) {
    it(`mantém apresentação adequada em viewport Chromium de ${width}px`, () => {
      create(false, width <= 760);
      const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:800px;border:0`;
      document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!; document.querySelectorAll('style').forEach(style => doc.head.appendChild(style.cloneNode(true)));
        doc.body.style.cssText = 'margin:0;--mobile-bottom-nav-height:80px'; doc.body.appendChild(fixture.nativeElement.cloneNode(true));
        if (width <= 760) {
          expect(doc.querySelector('app-cliente-create-form')).not.toBeNull(); expect(doc.querySelector('.cliente-mobile-form')).toBeNull();
          expect(doc.querySelector('mat-dialog-content')).toBeNull(); expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width);
          const inputs = ['nome', 'telefone', 'email'].map(name => doc.querySelector<HTMLElement>(`[data-client-field="${name}"] input`)!.getBoundingClientRect());
          inputs.forEach(rect => { expect(rect.width).toBeGreaterThan(200); expect(rect.right).toBeLessThanOrEqual(width); });
          expect(inputs[1].top).toBeGreaterThan(inputs[0].bottom); expect(inputs[2].top).toBeGreaterThan(inputs[1].bottom);
          expect(mobileBar().reserveSpace).toBeTrue(); expect(mobileBar().avoidKeyboard).toBeTrue(); expect(mobileBar().bottomAnchorSelector).toBe('.mobile-bottom-nav');
          const bar = doc.querySelector<HTMLElement>('.mobile-total-bar')!.getBoundingClientRect(); expect(bar.bottom).toBeLessThanOrEqual(720);
          expect(doc.querySelector('.mobile-total-bar__summary')).toBeNull();
        } else {
          expect(doc.querySelector('app-cliente-create-form')).toBeNull(); expect(doc.querySelector('app-mobile-total-bar')).toBeNull();
          expect(doc.querySelector('app-endereco-form')).not.toBeNull(); expect(doc.querySelector('#cliente-form')).not.toBeNull();
          expect(doc.querySelector('app-card-header')!.textContent).toContain('Novo Cliente');
          expect(doc.querySelectorAll('.page-card__footer button').length).toBe(2); expect(component.emailControl.hasError('required')).toBeTrue();
        }
      } finally { frame.remove(); }
    });
  }
  it('mobile edição aguarda carregamento antes de montar etapas', fakeAsync(() => {
    create(true, true); expect(fixture.nativeElement.querySelector('.cliente-mobile-form')).toBeNull();
    load.next(cliente); fixture.detectChanges(); tick(80); expect(component.nomeControl.value).toBe('Ana');
    expect(fixture.nativeElement.querySelector('app-mobile-total-bar')).not.toBeNull();
  }));
});
