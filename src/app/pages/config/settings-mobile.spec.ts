import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { AuthService } from 'src/app/services/auth.service';
import { ConfiguracaoAplicativosService } from 'src/app/services/configuracao-aplicativos.service';
import { CepUtilService } from 'src/app/utils/cep-util.service';
import { EmpresaFormComponent } from '../empresa/empresa-form.component';
import { EmpresaFormService } from '../empresa/empresa-form.service';
import { EmpresaIdentidadePublicaService } from '../empresa/empresa-identidade-publica.service';
import { MinhaAssinaturaComponent } from '../billing/minha-assinatura/minha-assinatura.component';
import { BillingService } from '../billing/services/billing.service';
import { BillingStateService } from '../billing/services/billing-state.service';
import { CalculadoraConfigComponent } from '../smart-calc-config/smart-calc-config/smart-calc-config.component';
import { CalculadoraConfigService } from '../smart-calc-config/calculadora-config.service';
import { CalculadoraMateriaisComponent } from '../calculadora-materiais/calculadora-materiais.component';
import { CalculadoraMaterialService } from '../calculadora-materiais/shared/calculadora-material.service';
import { SiteConfigService } from '../site/services/site-config.service';
import { AplicativosAtalhosComponent } from './aplicativos-atalhos/aplicativos-atalhos.component';
import { EmailServidorComponent } from './email-servidor/email-servidor.component';
import { EmailServidorService } from './email-servidor/email-servidor.service';
import { PresencaPublicaComponent } from './presenca-publica/presenca-publica.component';
import { PresencaPublicaService } from './presenca-publica/presenca-publica.service';

const empresa = { id: 1, nome: 'Clickarte', telefone: '31999999999', email: 'contato@clickarte.com.br', cnpj: '11222333000181', inscricaoEstadual: 'ISENTO', horario: 'Segunda a sexta', ativa: true, instagramUrl: '@clickarte', siteUrl: 'https://clickarte.com.br', endereco: { cep: '30000000', logradouro: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'BH', estado: 'MG', complemento: '' } };
const identidade = { nome: 'Clickarte', slug: 'clickarte', logoUrl: 'https://cdn.example/logo.png', faviconUrl: 'https://cdn.example/favicon.png' };
const email = { id: 1, host: 'smtp.example.com', porta: 587, usuario: 'contato@example.com', remetente: 'contato@example.com', senha: 'segredo', usarSsl: true };
const config = { aplicativos: [{ aplicativo: 'SMARTCALC', ativo: true }], atalhos: [{ id: 1, nome: 'Fornecedor', url: 'https://example.com', ativo: true, novaAba: true, ordem: 0 }] };
const presenca = { slugPublico: 'clickarte', dominioProprio: null, dominioProprioAtivo: false };
const resumo = { status: 'ATIVA', planoNome: 'Pro', planoCodigo: 'PRO', periodicidade: 'MENSAL', moeda: 'BRL', valor: 99, emailCobranca: 'financeiro@clickarte.com.br', pagamentos: [{ id: 1, valor: 99, status: 'PENDENTE', criadoEm: '2026-10-20', referenciaExterna: 'referencia-completa-da-cobranca', invoiceUrl: 'https://example.com/cobranca' }] };
function frameCopy(root: HTMLElement, width: number): HTMLIFrameElement {
  const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:900px;border:0`; document.body.appendChild(frame); const doc = frame.contentDocument!;
  Array.from(document.styleSheets).forEach(sheet => { const style = doc.createElement('style'); style.textContent = Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); doc.head.appendChild(style); }); doc.body.style.cssText = 'margin:0;--mobile-bottom-nav-height:80px'; doc.body.appendChild(root.cloneNode(true)); return frame;
}
describe('Empresa, assinatura e configurações — fundação mobile', () => {
  let fixture: ComponentFixture<any>, viewport: BehaviorSubject<any>, user: BehaviorSubject<any>, auth: any;
  let empresas: any, identidades: any, emails: any, apps: any, publico: any, billing: any, smart: any, materiais: any, navigate: jasmine.Spy;
  const root = () => fixture.nativeElement as HTMLElement;
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const create = async (component: any) => { fixture = TestBed.createComponent(component); await settle(); };
  const dialog = () => TestBed.inject(MatDialog);
  beforeAll(() => registerLocaleData(localePt));
  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} }); user = new BehaviorSubject({ id: 1, proprietario: true, email: 'operador@example.com', empresa: { id: 1 } }); auth = { usuario$: user, getJwtId: () => 1, getTipoEmpresa: () => TipoEmpresa.GRAFICA, temPermissao: jasmine.createSpy('temPermissao').and.returnValue(true) };
    empresas = jasmine.createSpyObj('EmpresaFormService', ['buscarEmpresa', 'cadastrarEmpresaFormData']); empresas.buscarEmpresa.and.returnValue(of(empresa)); empresas.cadastrarEmpresaFormData.and.returnValue(of(undefined));
    identidades = jasmine.createSpyObj('Identidade', ['buscar', 'alterarLogo', 'removerLogo', 'alterarFavicon', 'removerFavicon']); identidades.buscar.and.returnValue(of(identidade)); for (const name of ['alterarLogo', 'removerLogo', 'alterarFavicon', 'removerFavicon']) identidades[name].and.returnValue(of(identidade));
    emails = jasmine.createSpyObj('Email', ['obter', 'atualizar', 'testarEnvio']); emails.obter.and.returnValue(of(email)); emails.atualizar.and.returnValue(of(undefined)); emails.testarEnvio.and.returnValue(of(undefined));
    apps = jasmine.createSpyObj('Apps', ['carregar', 'salvar']); apps.carregar.and.returnValue(of(config)); apps.salvar.and.returnValue(of(config));
    publico = jasmine.createSpyObj('Publico', ['buscar', 'consultarSlugDisponivel', 'alterarSlug']); publico.buscar.and.returnValue(of(presenca)); publico.consultarSlugDisponivel.and.returnValue(of({ slug: 'nova-loja', disponivel: true })); publico.alterarSlug.and.returnValue(of({ ...presenca, slugPublico: 'nova-loja' }));
    billing = jasmine.createSpyObj('Billing', ['resumoAssinatura', 'obterStatus']); billing.resumoAssinatura.and.returnValue(of(resumo)); billing.obterStatus.and.returnValue(of({ allowed: true, warning: false, days: -10 }));
    smart = jasmine.createSpyObj('Smart', ['getConfigCompleta', 'salvar']); smart.getConfigCompleta.and.returnValue(of({ config: { id: 1, ativo: true }, produtosDisponiveis: [] })); smart.salvar.and.returnValue(of({ config: { id: 1, ativo: false }, produtosDisponiveis: [] }));
    materiais = jasmine.createSpyObj('Materiais', ['listarHabilitados', 'pesquisarDisponiveis']); materiais.listarHabilitados.and.returnValue(of([])); materiais.pesquisarDisponiveis.and.returnValue(of([]));
    TestBed.configureTestingModule({ imports: [NoopAnimationsModule, TablerIconsModule.pick(TablerIcons), EmpresaFormComponent, MinhaAssinaturaComponent, AplicativosAtalhosComponent, EmailServidorComponent, PresencaPublicaComponent, CalculadoraConfigComponent, CalculadoraMateriaisComponent], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { routeConfig: { path: 'criar' } } } }, { provide: BreakpointObserver, useValue: { observe: () => viewport } }, { provide: AuthService, useValue: auth }, { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'warning', 'error', 'info']) }, { provide: CepUtilService, useValue: { buscarEndereco: () => of(null) } }, { provide: EmpresaFormService, useValue: empresas }, { provide: EmpresaIdentidadePublicaService, useValue: identidades }, { provide: EmailServidorService, useValue: emails }, { provide: ConfiguracaoAplicativosService, useValue: apps }, { provide: PresencaPublicaService, useValue: publico }, { provide: SiteConfigService, useValue: { buscar: () => of({ siteAtivo: true }) } }, { provide: BillingService, useValue: billing }, { provide: BillingStateService, useValue: { setFromResponse: () => {}, formatDaysLabel: () => 'Vence em 10 dias' } }, { provide: CalculadoraConfigService, useValue: smart }, { provide: CalculadoraMaterialService, useValue: materiais }] }); navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });
  afterEach(async () => { dialog().closeAll(); if (fixture) { await fixture.whenStable(); fixture.destroy(); } TestBed.inject(OverlayContainer).ngOnDestroy(); });
  it('Empresa mantém grupos e reset independentes com um rodapé, preservando os controles', async () => {
    await create(EmpresaFormComponent); const c = fixture.componentInstance as EmpresaFormComponent; expect(root().querySelector('mat-tab-group')).toBeNull(); const field = root().querySelector('#empresa-dados-form input'); c.nomeControl.setValue('Nome em edição'); c.instagramUrlControl.setValue('@novo'); c.setMobileSection(2, true); await settle(); root().querySelector<HTMLButtonElement>('.mobile-total-bar__secondary')!.click(); await settle(); expect(c.instagramUrlControl.value).toBe('@clickarte'); expect(c.nomeControl.value).toBe('Nome em edição'); c.setMobileSection(0, true); await settle(); expect(root().querySelector('#empresa-dados-form input')).toBe(field); root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.click(); await settle(); expect(empresas.cadastrarEmpresaFormData).toHaveBeenCalledTimes(1); const payload = empresas.cadastrarEmpresaFormData.calls.mostRecent().args[0] as FormData; expect(payload.get('nome')).toBe('Nome em edição'); expect(root().querySelectorAll('app-mobile-total-bar').length).toBe(1);
  });
  it('Identidade usa o handler e snapshot próprios sem salvar dados cadastrais', async () => {
    await create(EmpresaFormComponent); const c = fixture.componentInstance as EmpresaFormComponent; c.setMobileSection(1, true); c.removerFavicon(); await settle(); expect(c.identidadeDirty).toBeTrue(); root().querySelector<HTMLButtonElement>('.mobile-total-bar__secondary')!.click(); await settle(); expect(c.identidadeDirty).toBeFalse(); c.removerFavicon(); await settle(); root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.click(); await settle(); expect(identidades.removerFavicon).toHaveBeenCalledTimes(1); expect(empresas.cadastrarEmpresaFormData).not.toHaveBeenCalled();
  });
  it('onboarding conserva formulário e ações originais sem rodapé novo', async () => {
    fixture = TestBed.createComponent(EmpresaFormComponent); fixture.componentInstance.modoOnboarding = true; await settle(); expect(root().querySelector('.empresa-onboarding-form')).not.toBeNull(); expect(root().querySelector('app-page-card')).toBeNull(); expect(root().querySelector('app-mobile-total-bar')).toBeNull();
  });
  it('atalhos preserva validação, payload, cancelamento e permissão de edição', async () => {
    await create(AplicativosAtalhosComponent); const c = fixture.componentInstance as AplicativosAtalhosComponent; c.atalhos.at(0).controls.nome.setValue('Alteração'); c.form.markAsDirty(); await settle(); root().querySelector<HTMLButtonElement>('.mobile-total-bar__secondary')!.click(); await settle(); expect(c.atalhos.at(0).controls.nome.value).toBe('Fornecedor'); c.atalhos.at(0).controls.nome.setValue('Novo nome'); c.form.markAsDirty(); await settle(); document.body.appendChild(root()); try { root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.click(); await settle(); expect(apps.salvar).toHaveBeenCalledWith(jasmine.objectContaining({ atalhos: [jasmine.objectContaining({ id: 1, nome: 'Novo nome' })] })); } finally { root().remove(); }
  });
  it('e-mail usa valores não salvos no painel de teste e impede salvamentos duplicados', async () => {
    await create(EmailServidorComponent); const c = fixture.componentInstance as EmailServidorComponent; c.hostControl.setValue('smtp.novo.example'); c.form.markAsDirty(); c.testar(); await settle(); expect(document.querySelector('.mobile-side-panel')).not.toBeNull(); const editor = dialog().openDialogs[0].componentInstance; expect(editor.emailControl.value).toBe('operador@example.com'); editor.enviar(); await settle(); expect(emails.testarEnvio).toHaveBeenCalledWith(jasmine.objectContaining({ host: 'smtp.novo.example', emailDestino: 'operador@example.com' })); const response = new Subject<void>(); emails.atualizar.and.returnValue(response); c.salvar(); c.salvar(); await settle(); expect(emails.atualizar).toHaveBeenCalledTimes(1); expect(root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.disabled).toBeTrue(); response.error({ status: 500 }); await settle(); expect(c.hostControl.value).toBe('smtp.novo.example');
  });
  it('Presença Pública abre painel com confirmação antes de alterar o endereço', async () => {
    await create(PresencaPublicaComponent); fixture.componentInstance.abrirAlteracaoEndereco(); await settle(); expect(document.querySelectorAll('.mobile-side-panel').length).toBe(1); const editor = dialog().openDialogs[0].componentInstance; editor.slugControl.setValue('nova-loja'); editor.verificarDisponibilidade(); await settle(); expect(publico.consultarSlugDisponivel).toHaveBeenCalledWith('nova-loja'); expect(publico.alterarSlug).not.toHaveBeenCalled(); editor.fechar(); await settle(); expect(publico.alterarSlug).not.toHaveBeenCalled();
  });
  it('assinatura mantém restrição ao proprietário e ação fixa apenas navega para planos', async () => {
    await create(MinhaAssinaturaComponent); root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.click(); expect(navigate).toHaveBeenCalledWith(['/billing/pagamento']); expect(billing.resumoAssinatura).toHaveBeenCalledTimes(1); user.next({ id: 2, proprietario: false, empresa: { id: 1 } }); await settle(); expect(root().textContent).toContain('Acesso restrito'); expect(root().querySelector('app-mobile-total-bar')).toBeNull();
  });
  it('SmartCalc conserva seleção, ativação e reset no rodapé compartilhado', async () => {
    await create(CalculadoraConfigComponent); const c = fixture.componentInstance as CalculadoraConfigComponent; c.form.controls.ativo.setValue(false); c.atualizarSelecao([7]); await settle(); root().querySelector<HTMLButtonElement>('.mobile-total-bar__secondary')!.click(); await settle(); expect(c.form.controls.ativo.value).toBeTrue(); expect(c.selectedIds).toEqual([]); c.form.controls.ativo.setValue(false); document.body.appendChild(root()); try { await settle(); root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.click(); await settle(); expect(smart.salvar).toHaveBeenCalledWith({ ativo: false, produtoGraficoIds: [] }); } finally { root().remove(); }
  });
  it('não oferece salvar atalhos sem permissão nem durante erro de carregamento', async () => {
    auth.temPermissao.and.returnValue(false); await create(AplicativosAtalhosComponent); expect(root().querySelector('app-mobile-total-bar')).toBeNull(); fixture.componentInstance.salvar(); expect(apps.salvar).not.toHaveBeenCalled(); apps.carregar.and.returnValue(throwError(() => ({ status: 403 }))); fixture.componentInstance.carregar(); await settle(); expect(root().textContent).toContain('Acesso restrito');
  });

  it('Empresa bloqueia reenvio durante salvamento e mantém dados após erro', async () => {
    const response = new Subject<any>(); empresas.cadastrarEmpresaFormData.and.returnValue(response); await create(EmpresaFormComponent); const c = fixture.componentInstance as EmpresaFormComponent; c.nomeControl.setValue('Alteração pendente'); c.salvarMobile(); c.salvarMobile(); await settle(); expect(empresas.cadastrarEmpresaFormData).toHaveBeenCalledTimes(1); expect(root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.disabled).toBeTrue(); response.error({ status: 500 }); await settle(); expect(c.nomeControl.value).toBe('Alteração pendente'); expect(c.salvandoEmpresa).toBeFalse();
  });
  for (const width of [360, 390, 430]) for (const component of [EmailServidorComponent, PresencaPublicaComponent]) it(`painel de ${component.name} mantém corpo rolável e ações em ${width}px`, async () => {
    await create(component); if (component === EmailServidorComponent) fixture.componentInstance.testar(); else fixture.componentInstance.abrirAlteracaoEndereco(); await settle(); const pane = document.querySelector<HTMLElement>('.mobile-side-panel')!.cloneNode(true) as HTMLElement;
    pane.style.cssText = 'position:fixed;top:0;right:0;width:100vw;height:100dvh;max-width:100vw;max-height:100dvh'; const frame = frameCopy(pane, width);
    try { const doc = frame.contentDocument!; const style = doc.createElement('style'); style.textContent = '.mobile-side-panel .mat-mdc-dialog-inner-container { animation:none!important;transform:none!important; }'; doc.head.appendChild(style); expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); const body = doc.querySelector<HTMLElement>('.mobile-side-panel__body')!; expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth); expect(frame.contentWindow!.getComputedStyle(body).overflowY).toBe('auto'); expect(doc.querySelector('.mobile-side-panel__footer')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(900);
    } finally { frame.remove(); }
  });
  for (const width of [360, 390, 430, 1024, 1440]) for (const component of [EmpresaFormComponent, MinhaAssinaturaComponent, AplicativosAtalhosComponent, EmailServidorComponent, PresencaPublicaComponent, CalculadoraConfigComponent, CalculadoraMateriaisComponent]) it(`${component.name} preserva área útil e desktop em ${width}px`, async () => {
    viewport.next({ matches: width <= 760, breakpoints: {} }); await create(component); const frame = frameCopy(root(), width);
    try { const doc = frame.contentDocument!; if (width <= 760) { expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); expect(doc.querySelector('.page-card__footer')).toBeNull(); const bar = doc.querySelector('.mobile-total-bar'); if (bar) expect(bar.getBoundingClientRect().bottom).toBeLessThanOrEqual(820); if (component === EmpresaFormComponent) expect(doc.querySelector('mat-tab-group')).toBeNull(); if (component === MinhaAssinaturaComponent) expect(frame.contentWindow!.getComputedStyle(doc.querySelector('.assinatura-payment-item--pending')!).backgroundColor).toBe('rgb(255, 250, 240)'); }
      else { expect(doc.querySelector('app-mobile-total-bar')).toBeNull(); if (component === EmpresaFormComponent) expect(doc.querySelectorAll('[role="tab"]').length).toBe(3); }
    } finally { frame.remove(); }
    if (component === EmpresaFormComponent && width <= 760) for (const index of [1, 2]) {
      fixture.componentInstance.setMobileSection(index, true); await settle(); const sectionFrame = frameCopy(root(), width);
      try { expect(sectionFrame.contentDocument!.documentElement.scrollWidth).toBeLessThanOrEqual(width); expect(sectionFrame.contentDocument!.querySelectorAll('.section-card__toggle[aria-expanded="true"]').length).toBe(1); } finally { sectionFrame.remove(); }
    }
  });
});
