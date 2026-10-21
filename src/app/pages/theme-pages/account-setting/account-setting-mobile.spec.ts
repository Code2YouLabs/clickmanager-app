import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { ImagemUtil } from 'src/app/utils/imagem-util';
import { AppNotificacoesComponent } from '../../notificacoes/notificacoes.component';
import { NotificacaoEnviarDialogComponent } from '../../notificacoes/components/notificacao-enviar-dialog.component';
import { NotificacaoService } from '../../notificacoes/services/notificacao.service';
import { UsuarioService } from '../../usuarios/services/usuario.service';
import { AppAccountSettingComponent } from './account-setting.component';
import { AccountSettingService } from './account-setting.service';

const usuario: any = { id: 7, nome: 'Ana Silva', telefone: '31999999999', email: 'ana@example.com', proprietario: true, empresa: { id: 1, tipoEmpresa: TipoEmpresa.GRAFICA }, endereco: { cep: '30000000', logradouro: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'Belo Horizonte', estado: 'MG' } };
const aviso: any = { id: 11, titulo: 'Atualização do sistema', resumo: 'Novidades disponíveis', conteudo: 'Conteúdo completo da notificação.', link: '/page/ajuda', nivel: 'INFO', tipoDestino: 'EMPRESA_INTEIRA', criadaEm: '2026-10-21T08:00:00', lida: true };
function frameCopy(root: HTMLElement, width: number): HTMLIFrameElement {
  const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:900px;border:0`; document.body.appendChild(frame);
  const doc = frame.contentDocument!; const style = doc.createElement('style');
  style.textContent = Array.from(document.styleSheets).map(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n')).join('\n') + '\nbody { margin:0; --mobile-bottom-nav-height:80px; } .mobile-side-panel .mat-mdc-dialog-inner-container { animation:none!important; transform:none!important; }';
  doc.head.appendChild(style); doc.body.appendChild(root.cloneNode(true)); return frame;
}
describe('Meu perfil — fundação mobile', () => {
  let fixture: ComponentFixture<AppAccountSettingComponent>, viewport: BehaviorSubject<any>, params: BehaviorSubject<any>, user: BehaviorSubject<any>;
  let account: any, notifications: any, auth: any, toastr: any, navigate: jasmine.Spy, navigateByUrl: jasmine.Spy;
  const root = () => fixture.nativeElement as HTMLElement;
  const component = () => fixture.componentInstance;
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const inbox = () => fixture.debugElement.query(By.directive(AppNotificacoesComponent)).componentInstance as AppNotificacoesComponent;
  async function create(tab = 'conta', id?: number): Promise<void> {
    params.next(convertToParamMap({ tab, ...(id ? { notificacaoId: String(id) } : {}) }));
    fixture = TestBed.createComponent(AppAccountSettingComponent); await settle();
  }
  beforeAll(() => registerLocaleData(localePt));
  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} }); params = new BehaviorSubject(convertToParamMap({})); user = new BehaviorSubject(usuario);
    account = jasmine.createSpyObj('AccountSettingService', ['buscarUsuarioPorId', 'atualizarDadosUsuario', 'buscarEndereco']); account.buscarUsuarioPorId.and.returnValue(of(usuario)); account.atualizarDadosUsuario.and.returnValue(of(undefined)); account.buscarEndereco.and.returnValue(of({ logradouro: 'Rua B', bairro: 'Centro', localidade: 'São Paulo', uf: 'SP' }));
    notifications = jasmine.createSpyObj('NotificacaoService', ['listar$', 'buscarPorId$', 'marcarComoLida$', 'marcarTodasComoLidas$', 'enviar$']); notifications.listar$.and.returnValue(of({ itens: [aviso], naoLidas: 2 })); notifications.buscarPorId$.and.returnValue(of(aviso)); notifications.marcarComoLida$.and.returnValue(of(undefined)); notifications.marcarTodasComoLidas$.and.returnValue(of(undefined)); notifications.enviar$.and.returnValue(of({ destinatariosCriados: 2, notificacoesCriadas: 1 }));
    auth = { usuario$: user, temAlgumaPermissao: jasmine.createSpy().and.returnValue(true), temPermissao: () => true, getTipoEmpresa: () => TipoEmpresa.GRAFICA, carregarUsuarioCompleto: jasmine.createSpy(), getOnboardingRouteForUsuario: jasmine.createSpy().and.returnValue('/onboarding') };
    toastr = jasmine.createSpyObj('ToastrService', ['success', 'warning', 'error']);
    TestBed.configureTestingModule({ imports: [AppAccountSettingComponent, NoopAnimationsModule, TablerIconsModule.pick(TablerIcons)], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { queryParamMap: params, snapshot: { paramMap: convertToParamMap({ id: '7' }) } } }, { provide: BreakpointObserver, useValue: { observe: () => viewport } }, { provide: AuthService, useValue: auth }, { provide: AccountSettingService, useValue: account }, { provide: NotificacaoService, useValue: notifications }, { provide: UsuarioService, useValue: { listar: () => of({ content: [usuario] }) } }, { provide: ToastrService, useValue: toastr }] });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true); navigateByUrl = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
  });
  afterEach(async () => { TestBed.inject(MatDialog).closeAll(); if (fixture) { await fixture.whenStable(); fixture.destroy(); } TestBed.inject(OverlayContainer).ngOnDestroy(); });

  it('usa PageCard, seletor global, quatro seções e um rodapé sem perder controles ao recolher ou mudar de aba', async () => {
    await create(); expect(root().querySelector('app-page-card')).not.toBeNull(); expect(root().querySelector('mat-tab-group')).toBeNull(); expect(root().querySelectorAll('app-section-card').length).toBe(4); expect(root().querySelectorAll('app-mobile-total-bar').length).toBe(1);
    const nome = root().querySelector('[formControlName="nome"]'); component().form.get('nome')!.setValue('Nome editado'); component().expandirSecao('senha', true); await settle();
    expect(root().querySelector('[formControlName="nome"]')).toBe(nome); expect(root().querySelectorAll('.section-card__toggle[aria-expanded="true"]').length).toBe(1);
    component().selecionarAbaMobile('preferencias'); await settle(); expect(root().querySelector('app-mobile-total-bar')).toBeNull(); component().selecionarAbaMobile('conta'); await settle(); expect(component().form.get('nome')!.value).toBe('Nome editado'); expect(component().form.get('email')!.disabled).toBeTrue();
  });
  it('revela a seção inválida, preserva confirmação de senha e envia o mesmo FormData com submit nativo', async () => {
    await create(); component().salvarMobile(); await settle(); expect(component().mobileSection).toBe('senha'); expect(account.atualizarDadosUsuario).not.toHaveBeenCalled();
    component().form.patchValue({ senhaAtual: 'atual', novaSenha: 'nova', confirmarNovaSenha: 'diferente' }); component().salvarMobile(); expect(toastr.error).toHaveBeenCalledWith('As novas senhas não conferem.');
    component().form.patchValue({ confirmarNovaSenha: 'nova' });
    root().querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const [id, payload] = account.atualizarDadosUsuario.calls.mostRecent().args; expect(id).toBe('7'); expect(payload.get('nome')).toBe(usuario.nome); expect(payload.get('email')).toBe(usuario.email); expect(payload.get('enderecoRequest.cep')).toBe('30000000'); expect(payload.get('senhaAtual')).toBe('atual'); expect(payload.get('novaSenha')).toBe('nova'); expect(auth.carregarUsuarioCompleto).toHaveBeenCalled(); expect(component().form.get('senhaAtual')!.value).toBe('');
  });
  it('bloqueia reenvio mobile e mantém edições após erro', async () => {
    const pending = new Subject(); account.atualizarDadosUsuario.and.returnValue(pending); await create(); component().form.patchValue({ senhaAtual: 'atual', nome: 'Edição' }); component().salvarMobile(); component().salvarMobile(); await settle(); expect(account.atualizarDadosUsuario).toHaveBeenCalledTimes(1); expect(root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.disabled).toBeTrue(); pending.error({}); await settle(); expect(component().salvando).toBeFalse(); expect(component().form.get('nome')!.value).toBe('Edição');
  });
  it('preserva cancelamento, foto, CEP e acesso ao onboarding', async () => {
    await create(); component().form.patchValue({ nome: 'Alterado', senhaAtual: 'atual' }); component().cancelar(); expect(component().form.get('nome')!.value).toBe(usuario.nome); expect(component().form.get('senhaAtual')!.value).toBe(''); component().buscarEnderecoPorCep(); expect(account.buscarEndereco).toHaveBeenCalledWith('30000000'); expect(component().form.get('enderecoRequest.cidade')!.value).toBe('São Paulo');
    const blob = new Blob(['foto'], { type: 'image/jpeg' }); spyOn(ImagemUtil, 'processarImagemSelecionada').and.resolveTo({ preview: 'data:image/jpeg;base64,abc', blob }); component().onFileSelected({ target: { files: [new File([blob], 'foto.jpg')] } } as any); await settle(); expect(component().imagemBlob).not.toBeNull(); component().resetarImagem(root().querySelector('input[type="file"]')!); expect(component().imagemBlob).toBeNull();
    component().selecionarAbaMobile('preferencias'); await settle(); Array.from(root().querySelectorAll<HTMLButtonElement>('app-section-card button')).find(button => button.textContent?.trim() === 'Abrir onboarding')!.click(); expect(navigate).toHaveBeenCalledWith(['/onboarding'], { queryParams: { reabrir: '1' } });
    user.next({ ...usuario, proprietario: false }); await settle(); expect(root().textContent).toContain('Disponível apenas para o proprietário.');
  });
  it('preserva busca, filtro de leitura e marcar todas sem navegar para fora do perfil', async () => {
    await create('notificacoes'); const n = inbox(); expect(root().querySelector('.notifications-shell')).toBeNull(); n.aplicarFiltroTexto('inexistente'); await settle(); expect(root().textContent).toContain('Nenhuma notificação'); n.aplicarFiltroTexto('Atualização'); expect(n.notificacoesFiltradas().length).toBe(1); n.aplicarFiltroMobile({ naoLidas: true }); expect(notifications.listar$).toHaveBeenCalledWith(true, 0, 50); n.marcarTodasComoLidas(); expect(notifications.marcarTodasComoLidas$).toHaveBeenCalledTimes(1); expect(navigate).not.toHaveBeenCalled();
  });
  it('abre notificação no painel global, marca como lida e preserva link interno e fechamento', async () => {
    await create('notificacoes'); notifications.buscarPorId$.and.returnValue(of({ ...aviso, lida: false })); inbox().abrirNotificacaoMobile(aviso); await settle(); expect(notifications.marcarComoLida$).toHaveBeenCalledWith(11); expect(document.querySelector('.mobile-side-panel__body')?.textContent).toContain(aviso.conteudo);
    const footer = document.querySelector('.mobile-side-panel__footer')!; Array.from(footer.querySelectorAll('button')).find(b => b.textContent?.includes('Abrir link'))!.click(); expect(navigateByUrl).toHaveBeenCalledWith('/page/ajuda'); inbox().fecharDetalheMobile(); await settle(); expect(document.querySelector('.mobile-side-panel')).toBeNull();
  });
  it('deep link mantém a aba e abre a notificação selecionada sem usar id do perfil na navegação', async () => {
    await create('notificacoes', 11); expect(component().selectedTabIndex).toBe(2); expect(inbox().selecionada()?.id).toBe(11); expect(document.querySelector('.mobile-side-panel')).not.toBeNull(); expect(navigate).not.toHaveBeenCalled();
  });
  it('falha no detalhe mostra tentativa novamente e preserva o estado loading', async () => {
    await create('notificacoes'); const pending = new Subject<any>(); notifications.buscarPorId$.and.returnValue(pending); inbox().abrirNotificacaoMobile(aviso); await settle(); expect(document.querySelector('.mobile-side-panel__body')?.textContent).toContain('Carregando detalhe'); pending.error({ userMessage: 'Falha temporária' }); await settle(); expect(document.querySelector('[role="alert"]')?.textContent).toContain('Falha temporária'); notifications.buscarPorId$.and.returnValue(of(aviso)); inbox().tentarDetalheMobile(); await settle(); expect(document.querySelector('.mobile-side-panel__body')?.textContent).toContain(aviso.conteudo);
  });
  it('envio usa painel compartilhado, valida destinatários e preserva permissões e handlers', async () => {
    await create('notificacoes'); auth.temAlgumaPermissao.and.returnValue(false); user.next(usuario); inbox().abrirDialogEnvio(); expect(document.querySelector('.mobile-side-panel')).toBeNull(); auth.temAlgumaPermissao.and.returnValue(true); user.next(usuario); inbox().abrirDialogEnvio(); await settle();
    const ref = TestBed.inject(MatDialog).openDialogs[0]; const dialog = ref.componentInstance as NotificacaoEnviarDialogComponent; expect(dialog.mobilePanel).toBeTrue(); dialog.form.patchValue({ titulo: 'Aviso', conteudo: 'Mensagem', tipoDestino: 'USUARIOS_ESPECIFICOS' }); dialog.enviar(); expect(notifications.enviar$).not.toHaveBeenCalled(); dialog.form.patchValue({ usuarioIds: [7] }); dialog.enviar(); await settle(); expect(notifications.enviar$).toHaveBeenCalledWith({ titulo: 'Aviso', conteudo: 'Mensagem', nivel: 'INFO', tipoDestino: 'USUARIOS_ESPECIFICOS', usuarioIds: [7] }); expect(document.querySelector('.mobile-side-panel')).toBeNull();
  });


  it('fechar painel durante carregamento não o reabre e sair da aba cancela a leitura pendente', async () => {
    await create('notificacoes', 11); inbox().fecharDetalheMobile(); await settle();
    const pending = new Subject<any>(); notifications.buscarPorId$.and.returnValue(pending);
    inbox().abrirNotificacaoMobile(aviso); await settle(); inbox().fecharDetalheMobile(); await settle(); pending.next(aviso); pending.complete(); await settle(); expect(document.querySelector('.mobile-side-panel')).toBeNull();
    const another = new Subject<any>(); notifications.buscarPorId$.and.returnValue(another); inbox().abrirNotificacaoMobile(aviso); await settle(); expect(another.observed).toBeTrue(); component().selecionarAbaMobile('conta'); await settle(); expect(another.observed).toBeFalse(); expect(document.querySelector('.mobile-side-panel')).toBeNull();
  });
  it('desktop conserva abas, controles, submit e modal de envio original', async () => {
    viewport.next({ matches: false, breakpoints: {} }); await create();
    component().form.patchValue({ senhaAtual: 'atual' }); root().querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(account.atualizarDadosUsuario.calls.mostRecent().args[1].get('nome')).toBe(usuario.nome);
    params.next(convertToParamMap({ tab: 'notificacoes' })); await settle(); expect(root().querySelector('.notifications-shell')).not.toBeNull();
    inbox().abrirDialogEnvio(); await settle(); expect(document.querySelector('.mobile-side-panel')).toBeNull();
    const dialog = TestBed.inject(MatDialog).openDialogs[0].componentInstance as NotificacaoEnviarDialogComponent; expect(dialog.mobilePanel).toBeFalse(); dialog.cancelar();
  });
  it('menu de notificações não oferece envio sem permissão', async () => {
    auth.temAlgumaPermissao.and.returnValue(false); await create('notificacoes');
    root().querySelector<HTMLButtonElement>('[aria-label="Ações das notificações"]')!.click(); await settle();
    const menu = document.querySelector('.mat-mdc-menu-panel')!; expect(menu.textContent).not.toContain('Enviar notificação'); expect(menu.textContent).toContain('Marcar todas como lidas');
  });
  it('envio protege fechamento durante request e permite tentar novamente sem perder conteúdo', async () => {
    await create('notificacoes'); inbox().abrirDialogEnvio(); await settle(); const ref = TestBed.inject(MatDialog).openDialogs[0]; const dialog = ref.componentInstance as NotificacaoEnviarDialogComponent;
    const pending = new Subject<any>(); notifications.enviar$.and.returnValue(pending); dialog.form.patchValue({ titulo: 'Aviso', conteudo: 'Mensagem' }); dialog.enviar(); dialog.enviar(); dialog.cancelar(); await settle();
    expect(notifications.enviar$).toHaveBeenCalledTimes(1); expect(document.querySelector<HTMLButtonElement>('[aria-label="Fechar envio de notificação"]')!.disabled).toBeTrue();
    pending.error({ userMessage: 'Falha no envio' }); await settle(); expect(dialog.form.controls.conteudo.value).toBe('Mensagem'); expect(dialog.salvando).toBeFalse(); dialog.cancelar(); await settle(); expect(document.querySelector('.mobile-side-panel')).toBeNull();
  });
  for (const width of [360, 390, 430, 1024, 1440]) for (const tab of ['conta', 'preferencias', 'notificacoes']) it(`${tab} preserva largura útil e desktop em ${width}px`, async () => {
    viewport.next({ matches: width <= 760, breakpoints: {} }); await create(tab); const frame = frameCopy(root(), width);
    try { const doc = frame.contentDocument!;
      if (width <= 760) {
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); expect(doc.querySelector('mat-tab-group')).toBeNull(); expect(doc.querySelectorAll('mat-button-toggle').length).toBe(3);
        for (const toggle of Array.from(doc.querySelectorAll('mat-button-toggle'))) { const label = toggle.querySelector('.mat-button-toggle-label-content span')!; expect(label.getBoundingClientRect().width).toBeLessThanOrEqual(toggle.getBoundingClientRect().width - 8); }
        const bar = doc.querySelector('.mobile-total-bar'); if (bar) expect(bar.getBoundingClientRect().bottom).toBeLessThanOrEqual(820);
        if (tab === 'conta') for (const section of ['endereco', 'foto', 'senha'] as const) { component().expandirSecao(section, true); await settle(); doc.body.replaceChildren(root().cloneNode(true)); expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); }
      } else { expect(doc.querySelectorAll('[role="tab"]').length).toBe(3); expect(doc.querySelector('app-page-card')).toBeNull(); expect(doc.querySelector('app-mobile-total-bar')).toBeNull(); if (tab === 'notificacoes') expect(doc.querySelector('.notifications-shell')).not.toBeNull(); }
    } finally { frame.remove(); }
  });
  for (const width of [360, 390, 430]) for (const kind of ['detalhe', 'envio']) it(`painel ${kind} mantém corpo e ações acessíveis em ${width}px`, async () => {
    await create('notificacoes'); if (kind === 'envio') inbox().abrirDialogEnvio(); else inbox().abrirNotificacaoMobile(aviso); await settle();
    const pane = document.querySelector<HTMLElement>('.mobile-side-panel')!.cloneNode(true) as HTMLElement; pane.style.cssText = 'position:fixed;top:0;right:0;width:100vw;height:100dvh;max-width:100vw;max-height:100dvh'; const frame = frameCopy(pane, width);
    try { const doc = frame.contentDocument!; expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); const body = doc.querySelector<HTMLElement>('.mobile-side-panel__body')!; expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth); expect(frame.contentWindow!.getComputedStyle(body).overflowY).toBe('auto'); expect(doc.querySelector('.mobile-side-panel__footer')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(900); } finally { frame.remove(); }
  });
});
