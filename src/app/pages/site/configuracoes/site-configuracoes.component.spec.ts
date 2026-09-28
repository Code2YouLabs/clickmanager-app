import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SiteConfigResponse } from '../models/site-config.models';
import { SiteConfigService } from '../services/site-config.service';
import { SiteConfiguracoesComponent } from './site-configuracoes.component';

const config = (overrides: Partial<SiteConfigResponse> = {}): SiteConfigResponse => ({
  siteAtivo: true,
  slugPublico: 'santa-luzia',
  dominioCustom: 'santaluzia.com.br',
  dominioCustomAtivo: true,
  faviconUrl: 'https://cdn/favicon.png',
  orcamentoAtivo: true,
  whatsappAtivo: true,
  whatsappExibicao: 'ICONE_TEXTO',
  whatsappTexto: 'Fale conosco',
  whatsappTelefone: '5511999998888',
  whatsappMensagemInicial: 'Olá! Acessei o site e gostaria de mais informações.',
  ...overrides,
});

describe('SiteConfiguracoesComponent', () => {
  let fixture: ComponentFixture<SiteConfiguracoesComponent>;
  let component: SiteConfiguracoesComponent;
  let service: jasmine.SpyObj<SiteConfigService>;
  let auth: jasmine.SpyObj<AuthService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let buscar$: Subject<SiteConfigResponse>;

  function createComponent(canEdit = true): void {
    buscar$ = new Subject<SiteConfigResponse>();
    service = jasmine.createSpyObj<SiteConfigService>('SiteConfigService', ['buscar', 'atualizar']);
    service.buscar.and.returnValue(buscar$);
    service.atualizar.and.returnValue(of(config()));
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['temPermissao']);
    auth.temPermissao.and.callFake((permissao: string) => permissao === 'SITE_CONFIG_EDITAR' ? canEdit : true);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'warning', 'error']);

    TestBed.configureTestingModule({
      imports: [SiteConfiguracoesComponent, NoopAnimationsModule, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: SiteConfigService, useValue: service },
        { provide: AuthService, useValue: auth },
        { provide: ToastrService, useValue: toastr },
      ],
    });

    fixture = TestBed.createComponent(SiteConfiguracoesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function resolveConfig(value = config()): void {
    buscar$.next(value);
    fixture.detectChanges();
  }

  function text(): string {
    return fixture.nativeElement.textContent as string;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renderiza loading sem mostrar defaults como configuração real', () => {
    createComponent();

    expect(text()).toContain('Carregando configurações');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(text()).not.toContain('Fale conosco');
    expect(text()).not.toContain('Olá! Acessei o site');
  });

  it('carrega configuração e preserva separação de presença pública e identidade', () => {
    createComponent();
    resolveConfig();

    expect(service.buscar).toHaveBeenCalledTimes(1);
    expect(text()).toContain('Endereço público');
    expect(text()).toContain('https://santaluzia.com.br');
    expect(text()).toContain('https://santa-luzia.clickmanager.com.br');
    expect(text()).toContain('Gerenciar Presença Pública');
    expect(text()).toContain('Gerenciar Identidade Pública');
    expect(text()).not.toContain('Slug público');
    expect(text()).not.toContain('Escolher favicon');
    expect(text()).not.toContain('Salvar favicon');
    expect(text()).not.toContain('Testar domínio próprio');
  });

  it('mostra erro recuperável com retry sem renderizar formulário', () => {
    createComponent();
    buscar$.error({ status: 500, userMessage: 'Falha controlada' });
    fixture.detectChanges();

    expect(text()).toContain('Não foi possível carregar as configurações');
    expect(text()).toContain('Falha controlada');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();

    service.buscar.and.returnValue(of(config({ whatsappTexto: 'Depois do retry' })));
    fixture.nativeElement.querySelector('.site-config-state button').click();
    fixture.detectChanges();

    expect(component.whatsappTextoControl.value).toBe('Depois do retry');
  });

  it('mostra estado forbidden quando o GET retorna 403', () => {
    createComponent();
    buscar$.error({ status: 403 });
    fixture.detectChanges();

    expect(text()).toContain('Acesso restrito');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('usuário sem edição visualiza dados, formulário disabled e sem footer editável', () => {
    createComponent(false);
    resolveConfig();

    expect(text()).toContain('Você pode visualizar estas configurações, mas não possui permissão para editar.');
    expect(component.form.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('.page-card__footer')).toBeNull();
  });

  it('usa PageCard com footer canônico e submit associado ao form id', () => {
    createComponent();
    resolveConfig();

    const pageCard = fixture.debugElement.query(By.directive(PageCardComponent));
    expect(pageCard).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.site-config-footer')).toBeNull();

    const buttons = [...fixture.nativeElement.querySelectorAll('.page-card__footer button')] as HTMLButtonElement[];
    const cancel = buttons.find((button) => button.textContent?.includes('Cancelar'));
    const save = buttons.find((button) => button.type === 'submit');
    expect(cancel).toBeTruthy();
    expect(save?.textContent).toContain('Salvar');
    expect(save?.textContent).not.toContain('Salvar configurações');
    expect(save?.form?.id).toBe('site-config-form');
  });

  it('submete pelo form id sem click duplicado e impede duplo submit', () => {
    createComponent();
    resolveConfig();
    const save$ = new Subject<SiteConfigResponse>();
    service.atualizar.and.returnValue(save$);
    const save: HTMLButtonElement = fixture.nativeElement.querySelector('button[type=submit]');

    document.body.appendChild(fixture.nativeElement);
    save.click();
    save.click();
    fixture.nativeElement.remove();

    expect(service.atualizar).toHaveBeenCalledTimes(1);
  });

  it('cancelar restaura snapshot carregado sem novo GET, navegação ou perda de toggles e textos', () => {
    createComponent();
    resolveConfig(config({
      siteAtivo: true,
      orcamentoAtivo: false,
      whatsappAtivo: true,
      whatsappTexto: 'Texto A',
      whatsappMensagemInicial: 'Mensagem A',
      whatsappTelefone: '5511988887777',
    }));

    component.siteAtivoControl.setValue(false);
    component.orcamentoAtivoControl.setValue(true);
    component.whatsappAtivoControl.setValue(false);
    component.whatsappTelefoneControl.setValue('11977776666');
    component.whatsappTextoControl.setValue('Texto alterado');
    component.whatsappMensagemInicialControl.setValue('Mensagem alterada');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.page-card__footer button[type=button]').click();
    fixture.detectChanges();

    expect(service.buscar).toHaveBeenCalledTimes(1);
    expect(component.siteAtivoControl.value).toBeTrue();
    expect(component.orcamentoAtivoControl.value).toBeFalse();
    expect(component.whatsappAtivoControl.value).toBeTrue();
    expect(component.whatsappTelefoneControl.value).toBe('11988887777');
    expect(component.whatsappTextoControl.value).toBe('Texto A');
    expect(component.whatsappMensagemInicialControl.value).toBe('Mensagem A');
  });

  it('envia payload permitido, salva, permanece na tela e atualiza baseline com a resposta do PUT', () => {
    createComponent();
    resolveConfig(config({ whatsappTexto: 'A', whatsappMensagemInicial: 'Mensagem A' }));
    service.atualizar.and.returnValue(of(config({
      siteAtivo: false,
      orcamentoAtivo: false,
      whatsappAtivo: true,
      whatsappTelefone: '5511977776666',
      whatsappExibicao: 'ICONE',
      whatsappTexto: 'B',
      whatsappMensagemInicial: 'Mensagem B',
    })));

    component.siteAtivoControl.setValue(false);
    component.orcamentoAtivoControl.setValue(false);
    component.whatsappTelefoneControl.setValue('11977776666');
    component.whatsappExibicaoControl.setValue('ICONE');
    component.whatsappTextoControl.setValue('B');
    component.whatsappMensagemInicialControl.setValue('Mensagem B');
    component.salvar();

    expect(service.atualizar).toHaveBeenCalledWith({
      siteAtivo: false,
      orcamentoAtivo: false,
      whatsappAtivo: true,
      whatsappTelefone: '11977776666',
      whatsappExibicao: 'ICONE',
      whatsappTexto: 'B',
      whatsappMensagemInicial: 'Mensagem B',
    });
    component.whatsappTelefoneControl.setValue('(11) 97777-6666');
    expect((component as any).buildPayload().whatsappTelefone).toBe('11977776666');
    expect(service.atualizar.calls.mostRecent().args[0] as any).not.toEqual(jasmine.objectContaining({
      slugPublico: jasmine.anything(),
      dominioCustom: jasmine.anything(),
      faviconUrl: jasmine.anything(),
    }));
    expect(toastr.success).toHaveBeenCalledWith('Configurações do site salvas com sucesso!');

    component.whatsappTextoControl.setValue('C');
    component.formState.reset();
    expect(component.whatsappTextoControl.value).toBe('B');
    expect(component.siteAtivoControl.value).toBeFalse();
    expect(component.whatsappTelefoneControl.value).toBe('11977776666');
  });

  it('mantém alterações no formulário quando salvar falha e libera nova tentativa', () => {
    createComponent();
    resolveConfig();
    service.atualizar.and.returnValue(throwError(() => ({ userMessage: 'Não salvou' })));
    component.whatsappTextoControl.setValue('Texto não salvo');

    component.salvar();

    expect(component.salvando).toBeFalse();
    expect(component.whatsappTextoControl.value).toBe('Texto não salvo');
    expect(toastr.error).toHaveBeenCalledWith('Não salvou');
  });

  it('bloqueia salvar sem permissão mesmo se chamado diretamente', () => {
    createComponent(false);
    resolveConfig();

    component.salvar();

    expect(service.atualizar).not.toHaveBeenCalled();
    expect(toastr.warning).toHaveBeenCalledWith('Você não tem permissão para editar as configurações do site.');
  });

  it('normaliza telefone do backend e aceita ICONE/ICONE_TEXTO', () => {
    createComponent();
    resolveConfig(config({ whatsappTelefone: '551188887777', whatsappExibicao: 'ICONE' }));

    expect(component.whatsappTelefoneControl.value).toBe('1188887777');
    expect(component.whatsappExibicaoControl.value).toBe('ICONE');

    component.whatsappExibicaoControl.setValue('ICONE_TEXTO');
    component.whatsappTelefoneControl.setValue('');
    component.salvar();

    expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({
      whatsappTelefone: null,
      whatsappExibicao: 'ICONE_TEXTO',
    }));
  });

  it('abre site ativo e bloqueia abertura quando inativo mantendo URL coerente', () => {
    createComponent();
    resolveConfig(config({ siteAtivo: true, dominioCustom: null, dominioCustomAtivo: false, slugPublico: 'loja' }));
    const open = spyOn(window, 'open');

    component.abrirSite();
    expect(open).toHaveBeenCalledWith('https://loja.clickmanager.com.br', '_blank', 'noopener,noreferrer');

    component.siteAtivoControl.setValue(false);
    fixture.detectChanges();
    component.abrirSite();

    expect(open).toHaveBeenCalledTimes(1);
    expect(toastr.warning).toHaveBeenCalledWith('O site está desativado. Ative o site para abrir o endereço público.');
    expect(component.enderecoPublicoPrincipal).toBe('https://loja.clickmanager.com.br');
  });
});
