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
  const text = () => fixture.nativeElement.textContent as string;
  const create = (edit = false, mobile = false) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: mobile ? 390 : 1280 });
    if (edit) params.next(convertToParamMap({ id: '7' }));
    fixture = TestBed.createComponent(FormClienteComponent); component = fixture.componentInstance;
    fixture.detectChanges();
  };
  const fill = () => { component.form.patchValue(cliente); fixture.detectChanges(); };
  const submit = () => fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  const mobileBar = () => fixture.debugElement.query(By.directive(MobileTotalBarComponent)).componentInstance as MobileTotalBarComponent;
  beforeEach(() => {
    originalWidth = window.innerWidth;
    params = new BehaviorSubject(convertToParamMap({})); query = new BehaviorSubject(convertToParamMap({}));
    load = new Subject(); save = new Subject();
    service = jasmine.createSpyObj('ClienteService', ['buscarPorId', 'salvar', 'atualizar']);
    service.buscarPorId.and.returnValue(load); service.salvar.and.returnValue(save); service.atualizar.and.returnValue(save);
    cep = jasmine.createSpyObj('CepUtilService', ['buscarEndereco']); cep.buscarEndereco.and.returnValue(of(viaCep as any));
    toastr = jasmine.createSpyObj('ToastrService', ['error', 'success']);
    TestBed.configureTestingModule({ imports: [FormClienteComponent, NoopAnimationsModule], providers: [provideRouter([]),
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
  it('mobile valida dados básicos antes de avançar e permite voltar mantendo valores', fakeAsync(() => {
    create(false, true); mobileBar().action.emit(); fixture.detectChanges();
    expect(component.mobileStep).toBe(0); expect(component.nomeControl.touched).toBeTrue();
    fill(); mobileBar().action.emit(); fixture.detectChanges(); tick(80);
    expect(component.mobileStep).toBe(1); expect(service.salvar).not.toHaveBeenCalled();
    mobileBar().secondaryAction.emit(); fixture.detectChanges(); tick(80);
    expect(component.mobileStep).toBe(0); expect(component.nomeControl.value).toBe('Ana');
  }));
  it('mobile mantém foco por etapa, busca explícita de CEP e salva uma única vez', fakeAsync(() => {
    create(false, true); document.body.appendChild(fixture.nativeElement); tick(80);
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('app-input-texto-restrito input'));
    fill(); submit(); fixture.detectChanges(); tick(80);
    const input = fixture.debugElement.query(By.directive(InputCepComponent)).componentInstance as InputCepComponent;
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('app-input-cep input'));
    input.onBlur(); expect(cep.buscarEndereco).not.toHaveBeenCalled(); input.buscarEndereco();
    expect(component.enderecoGroup.value.logradouro).toBe('Rua nova'); expect(component.numeroControl.value).toBe('10');
    mobileBar().action.emit(); mobileBar().action.emit(); submit(); fixture.detectChanges();
    expect(service.salvar).toHaveBeenCalledTimes(1); expect(mobileBar().loading).toBeTrue(); expect(mobileBar().secondaryActionDisabled).toBeTrue();
    tick(100); fixture.nativeElement.remove();
  }));
  it('mobile edição aguarda carregamento antes de montar etapas', fakeAsync(() => {
    create(true, true); expect(fixture.nativeElement.querySelector('.cliente-mobile-form')).toBeNull();
    load.next(cliente); fixture.detectChanges(); tick(80); expect(component.nomeControl.value).toBe('Ana');
    expect(fixture.nativeElement.querySelector('app-mobile-total-bar')).not.toBeNull();
  }));
});
