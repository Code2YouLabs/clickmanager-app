import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { EnderecoFormComponent } from 'src/app/components/endereco-form/endereco-form.component';
import { AuthService } from 'src/app/services/auth.service';
import { CepUtilService } from 'src/app/utils/cep-util.service';
import { ImagemUtil } from 'src/app/utils/imagem-util';
import { EmpresaIdentidadePublicaService } from './empresa-identidade-publica.service';
import { EmpresaFormComponent } from './empresa-form.component';
import { EmpresaFormService } from './empresa-form.service';

describe('EmpresaFormComponent', () => {
  let empresaService: jasmine.SpyObj<EmpresaFormService>;
  let identidadeService: jasmine.SpyObj<EmpresaIdentidadePublicaService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let cepService: jasmine.SpyObj<CepUtilService>;

  const empresaMock = {
    id: 1,
    nome: 'Santa Luzia',
    telefone: '31999999999',
    email: 'contato@santaluzia.com.br',
    cnpj: '11222333000181',
    inscricaoEstadual: 'ISENTO',
    horario: 'Seg a Sex, 08h às 18h',
    logoUrl: 'https://cdn/logo.png',
    instagramUrl: '@santaluzia',
    facebookUrl: 'https://facebook.com/santaluzia',
    siteUrl: 'https://santaluzia.com.br',
    youtubeUrl: 'https://youtube.com/@santaluzia',
    ativa: true,
    endereco: {
      cep: '30000000',
      logradouro: 'Rua A',
      numero: '10',
      complemento: 'Sala 1',
      bairro: 'Centro',
      cidade: 'BH',
      estado: 'MG',
    },
  };
  const identidadeMock = {
    nome: 'Santa Luzia',
    slug: 'santa-luzia',
    logoUrl: 'https://cdn/logo.png',
    faviconUrl: 'https://cdn/favicon.png',
  };

  function setup(options: {
    modoOnboarding?: boolean;
    esconderAcoesOnboarding?: boolean;
    onboardingSection?: 'all' | 'empresa' | 'logo' | 'endereco';
    empresaError?: boolean;
    identidadeError?: boolean;
  } = {}): ComponentFixture<EmpresaFormComponent> {
    TestBed.resetTestingModule();
    empresaService = jasmine.createSpyObj<EmpresaFormService>('EmpresaFormService', ['buscarEmpresa', 'cadastrarEmpresaFormData']);
    empresaService.buscarEmpresa.and.returnValue(options.empresaError ? throwError(() => new Error('empresa')) : of(empresaMock as any));
    empresaService.cadastrarEmpresaFormData.and.returnValue(of(empresaMock as any));

    identidadeService = jasmine.createSpyObj<EmpresaIdentidadePublicaService>('EmpresaIdentidadePublicaService', [
      'buscar',
      'alterarLogo',
      'removerLogo',
      'alterarFavicon',
      'removerFavicon',
    ]);
    identidadeService.buscar.and.returnValue(options.identidadeError ? throwError(() => new Error('identidade')) : of(identidadeMock as any));
    identidadeService.alterarLogo.and.returnValue(of({ ...identidadeMock, logoUrl: 'https://cdn/nova-logo.png' } as any));
    identidadeService.removerLogo.and.returnValue(of({ ...identidadeMock, logoUrl: null } as any));
    identidadeService.alterarFavicon.and.returnValue(of({ ...identidadeMock, faviconUrl: 'https://cdn/novo-favicon.png' } as any));
    identidadeService.removerFavicon.and.returnValue(of({ ...identidadeMock, faviconUrl: null } as any));

    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'warning', 'error', 'info']);
    cepService = jasmine.createSpyObj<CepUtilService>('CepUtilService', ['buscarEndereco']);
    cepService.buscarEndereco.and.returnValue(of(null));

    TestBed.configureTestingModule({
      imports: [EmpresaFormComponent, NoopAnimationsModule, TablerIconsModule.pick(TablerIcons)],
      providers: [
        { provide: EmpresaFormService, useValue: empresaService },
        { provide: EmpresaIdentidadePublicaService, useValue: identidadeService },
        { provide: AuthService, useValue: { usuario$: of({ empresa: { id: 1 } }), getJwtId: () => 1 } },
        { provide: CepUtilService, useValue: cepService },
        { provide: ToastrService, useValue: toastr },
      ],
    });

    const fixture = TestBed.createComponent(EmpresaFormComponent);
    fixture.componentInstance.modoOnboarding = !!options.modoOnboarding;
    fixture.componentInstance.esconderAcoesOnboarding = !!options.esconderAcoesOnboarding;
    fixture.componentInstance.onboardingSection = options.onboardingSection || 'all';
    fixture.detectChanges();
    return fixture;
  }

  function footerButtons(fixture: ComponentFixture<EmpresaFormComponent>): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.page-card__footer button'));
  }

  function clickFooterCancel(fixture: ComponentFixture<EmpresaFormComponent>): void {
    const cancel = footerButtons(fixture).find((button) => button.textContent?.includes('Cancelar'));
    expect(cancel).toBeTruthy();
    cancel!.click();
    fixture.detectChanges();
  }

  function selecionarAba(fixture: ComponentFixture<EmpresaFormComponent>, label: string): void {
    const index = ['Empresa', 'Identidade Pública', 'Redes Sociais'].indexOf(label);
    expect(index).toBeGreaterThanOrEqual(0);
    fixture.componentInstance.abaSelecionada = index;
    const tabGroup = fixture.debugElement.query(By.css('mat-tab-group'))?.componentInstance as { selectedIndex: number } | undefined;
    if (tabGroup) tabGroup.selectedIndex = index;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renderiza modo padrão com PageCard único, tabs, seções compartilhadas e footer do PageCard', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent;

    expect(fixture.debugElement.queryAll(By.directive(PageCardComponent)).length).toBe(1);
    expect(fixture.debugElement.queryAll(By.directive(SectionCardComponent)).length).toBe(2);
    expect(fixture.debugElement.queryAll(By.directive(EnderecoFormComponent)).length).toBe(1);
    expect(text).toContain('Dados da empresa');
    expect(text).toContain('Empresa');
    expect(text).toContain('Identidade Pública');
    expect(text).toContain('Redes Sociais');
    expect(fixture.nativeElement.querySelector('.empresa-form-actions')).toBeNull();
    expect(footerButtons(fixture).map((button) => button.textContent?.trim())).toEqual(['Cancelar', 'saveSalvar']);
  });

  it('preenche dados, preserva validators e aplica CEP via evento compartilhado', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    expect(component.nomeControl.value).toBe('Santa Luzia');
    component.nomeControl.setValue('AB');
    expect(component.nomeControl.invalid).toBeTrue();
    component.telefoneControl.setValue('');
    expect(component.telefoneControl.invalid).toBeTrue();
    component.emailControl.setValue('email-invalido');
    expect(component.emailControl.invalid).toBeTrue();
    component.cnpjControl.setValue('');
    expect(component.cnpjControl.invalid).toBeTrue();

    component.preencherEnderecoViaCep({ cep: '30140071', logradouro: 'Av Brasil', bairro: 'Funcionários', localidade: 'Belo Horizonte', uf: 'MG' });
    expect(component.logradouroControl.value).toBe('Av Brasil');
    expect(component.bairroControl.value).toBe('Funcionários');
    expect(component.cidadeControl.value).toBe('Belo Horizonte');
    expect(component.estadoControl.value).toBe('MG');
  });

  it('mostra erro e retry independente da aba Empresa sem renderizar formulário vazio', () => {
    const fixture = setup({ empresaError: true });

    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar os dados da empresa.');
    expect(fixture.nativeElement.textContent).not.toContain('Nome da Empresa');

    empresaService.buscarEmpresa.and.returnValue(of(empresaMock as any));
    fixture.componentInstance.carregarEmpresa();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nome da Empresa');
    expect(fixture.componentInstance.nomeControl.value).toBe('Santa Luzia');
  });

  it('submete Empresa pelo form id, envia FormData e atualiza somente baseline da Empresa', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.instagramUrlControl.setValue('@alterado');
    component.nomeControl.setValue('Santa Luzia Atualizada');
    fixture.detectChanges();

    expect(component.empresaDirty).toBeTrue();
    expect(component.redesDirty).toBeTrue();
    const save = fixture.nativeElement.querySelector('.page-card__footer button[type=submit]') as HTMLButtonElement;
    expect(save.getAttribute('form')).toBe('empresa-dados-form');
    save.click();
    fixture.detectChanges();

    const formData = empresaService.cadastrarEmpresaFormData.calls.mostRecent().args[0] as FormData;
    expect(formData.get('nome')).toBe('Santa Luzia Atualizada');
    expect(formData.get('instagramUrl')).toBe('@alterado');
    expect(component.empresaDirty).toBeFalse();
    expect(component.redesDirty).toBeTrue();
  });

  it('cancela somente Empresa pelo PageCard mantendo Redes alterada', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.nomeControl.setValue('Nome alterado');
    component.instagramUrlControl.setValue('@alterado');
    fixture.detectChanges();
    clickFooterCancel(fixture);

    expect(component.nomeControl.value).toBe('Santa Luzia');
    expect(component.instagramUrlControl.value).toBe('@alterado');
    expect(component.empresaDirty).toBeFalse();
    expect(component.redesDirty).toBeTrue();
  });

  it('mantém Identidade Pública independente com endereço, copiar, mídia e erro/retry próprios', () => {
    const fixture = setup({ identidadeError: true });
    const component = fixture.componentInstance;

    selecionarAba(fixture, 'Identidade Pública');
    expect(component.erroIdentidade).toBe('Não foi possível carregar a identidade pública.');
    expect(component.nomeControl.value).toBe('Santa Luzia');

    identidadeService.buscar.and.returnValue(of(identidadeMock as any));
    component.carregarIdentidadePublica();
    fixture.detectChanges();

    expect(component.nomePublico).toBe('Santa Luzia');
    expect(component.enderecoClickManager).toBe('santa-luzia.clickmanager.com.br');
    expect(component.imagemPreview).toBe('https://cdn/logo.png');
    expect(component.faviconPreview).toBe('https://cdn/favicon.png');
    expect(fixture.nativeElement.textContent).not.toContain('Slug público');
    expect(fixture.nativeElement.textContent).not.toContain('Alterar endereço');
  });

  it('valida favicon, cancela identidade pelo PageCard e preserva Empresa alterada', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    selecionarAba(fixture, 'Identidade Pública');
    component.nomeControl.setValue('Empresa editada');

    component.removerFavicon();
    fixture.detectChanges();
    expect(component.faviconPreview).toBe('favicon.ico');
    expect(component.identidadeDirty).toBeTrue();

    clickFooterCancel(fixture);
    expect(component.faviconPreview).toBe('https://cdn/favicon.png');
    expect(component.identidadeDirty).toBeFalse();
    expect(component.nomeControl.value).toBe('Empresa editada');
    expect(component.empresaDirty).toBeTrue();

    component.onFaviconSelecionado({ target: { files: [new File(['x'.repeat(1024 * 1024 + 1)], 'favicon.png', { type: 'image/png' })], value: 'x' } } as any);
    expect(component.faviconErro).toBe('O favicon deve ter até 1 MB.');
  });

  it('salva logo, favicon ou ambos por footerAction usando forkJoin', fakeAsync(() => {
    const fixture = setup();
    const component = fixture.componentInstance;
    selecionarAba(fixture, 'Identidade Pública');

    component.removerLogoIdentidadeAtual();
    fixture.detectChanges();
    footerButtons(fixture).find((button) => button.textContent?.includes('Salvar'))!.click();
    tick();
    expect(identidadeService.removerLogo).toHaveBeenCalledTimes(1);
    expect(identidadeService.removerFavicon).not.toHaveBeenCalled();

    component.removerFavicon();
    fixture.detectChanges();
    footerButtons(fixture).find((button) => button.textContent?.includes('Salvar'))!.click();
    tick();
    expect(identidadeService.removerFavicon).toHaveBeenCalledTimes(1);

    spyOn(ImagemUtil, 'processarImagemSelecionada').and.returnValue(Promise.resolve({ preview: 'data:image/png;base64,logo', blob: new Blob(['logo'], { type: 'image/png' }) }));
    component.onLogoIdentidadeSelecionada({ target: { files: [new File(['logo'], 'logo.png', { type: 'image/png' })], value: 'x' } } as any);
    tick();
    component.onFaviconSelecionado({ target: { files: [new File(['icon'], 'favicon.ico', { type: 'image/x-icon' })], value: 'x' } } as any);
    tick();
    fixture.detectChanges();
    footerButtons(fixture).find((button) => button.textContent?.includes('Salvar'))!.click();
    tick();

    expect(identidadeService.alterarLogo).toHaveBeenCalled();
    expect(identidadeService.alterarFavicon).toHaveBeenCalled();
  }));

  it('mantém Website em Redes, salva por form id e cancela sem alterar Empresa', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    selecionarAba(fixture, 'Redes Sociais');

    expect(component.footerActions[0]).toEqual(jasmine.objectContaining({ id: 'salvar-redes', type: 'submit', form: 'empresa-redes-form' }));
    component.nomeControl.setValue('Empresa editada');
    component.siteUrlControl.setValue('https://novo-site.com.br');
    empresaService.cadastrarEmpresaFormData.and.returnValue(of({ ...empresaMock, siteUrl: 'https://novo-site.com.br' } as any));
    fixture.detectChanges();

    component.salvarRedes();
    fixture.detectChanges();
    expect(component.redesDirty).toBeFalse();
    expect(component.empresaDirty).toBeTrue();

    component.siteUrlControl.setValue('https://outro-site.com.br');
    fixture.detectChanges();
    clickFooterCancel(fixture);
    expect(component.siteUrlControl.value).toBe('https://novo-site.com.br');
    expect(component.nomeControl.value).toBe('Empresa editada');
  });

  it('renderiza modo onboarding sem PageCard, tabs ou footer padrão e preserva submit/evento', () => {
    const fixture = setup({ modoOnboarding: true, onboardingSection: 'empresa' });
    const component = fixture.componentInstance;
    spyOn(component.empresaSalva, 'emit');

    expect(fixture.debugElement.query(By.directive(PageCardComponent))).toBeNull();
    expect(fixture.nativeElement.querySelector('mat-tab-group')).toBeNull();
    expect(fixture.nativeElement.querySelector('.page-card__footer')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Nome da Empresa');
    expect(fixture.nativeElement.textContent).not.toContain('CEP');
    expect(component.isCurrentSectionValid()).toBeTrue();

    component.onSubmit();
    expect(empresaService.cadastrarEmpresaFormData).toHaveBeenCalled();
    expect(component.empresaSalva.emit).toHaveBeenCalled();
  });

  it('preserva seções e ações do onboarding legado', () => {
    const fixtureLogo = setup({ modoOnboarding: true, onboardingSection: 'logo', esconderAcoesOnboarding: true });
    expect(fixtureLogo.nativeElement.textContent).toContain('Selecionar');
    expect(fixtureLogo.nativeElement.textContent).toContain('Redefinir');
    expect(fixtureLogo.nativeElement.textContent).not.toContain('Salvar dados da empresa');

    const fixtureEndereco = setup({ modoOnboarding: true, onboardingSection: 'endereco' });
    expect(fixtureEndereco.nativeElement.textContent).toContain('CEP');
    expect(fixtureEndereco.nativeElement.textContent).toContain('Logradouro');
  });
});
