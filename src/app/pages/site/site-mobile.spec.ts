import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { ListarBannersComponent } from './banners/listar-banners/listar-banners.component';
import { FormBannerComponent } from './banners/form-banner/form-banner.component';
import { ListarPaginasComponent } from './paginas/listar-paginas/listar-paginas.component';
import { FormPaginaComponent } from './paginas/form-pagina/form-pagina.component';
import { ListarBlocosComponent } from './paginas/blocos/listar-blocos/listar-blocos.component';
import { FormBlocoComponent } from './paginas/blocos/form-bloco/form-bloco.component';
import { SiteConfiguracoesComponent } from './configuracoes/site-configuracoes.component';
import { SiteBannerService } from './services/site-banner.service';
import { SitePaginaService } from './services/site-pagina.service';
import { SitePaginaBlocoService } from './services/site-pagina-bloco.service';
import { SiteConfigService } from './services/site-config.service';

const banner = { id: 1, titulo: 'Banner com título longo para verificar a largura disponível no celular', ativo: true, ordem: 1 };
const pagina = { id: 5, titulo: 'Página personalizada', tipo: 'PERSONALIZADA', codigo: null, slug: 'pagina', ativa: true, exibirNoMenu: true, ordemMenu: 1, exibirNaHome: false, ordemHome: 1 };
const bloco = { id: 8, titulo: 'Conteúdo da página', tipo: 'TEXTO', ordem: 1, ativo: true, conteudoJson: '{"html":"Conteúdo original"}' };
const config = { siteAtivo: true, slugPublico: 'loja', orcamentoAtivo: true, whatsappAtivo: true, whatsappExibicao: 'ICONE_TEXTO', whatsappTelefone: '5511999998888', whatsappTexto: 'Fale conosco' };
function frameCopy(root: HTMLElement, width: number): HTMLIFrameElement {
  const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:900px;border:0`; document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  Array.from(document.styleSheets).forEach(sheet => { const style = doc.createElement('style'); style.textContent = Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); doc.head.appendChild(style); });
  doc.body.style.cssText = 'margin:0;--mobile-bottom-nav-height:80px'; doc.body.appendChild(root.cloneNode(true)); return frame;
}
describe('Meu Site — fundação mobile', () => {
  let fixture: ComponentFixture<any>;
  let viewport: BehaviorSubject<any>, params: BehaviorSubject<any>;
  let banners: any, paginas: any, blocos: any, configs: any;
  let auth: jasmine.SpyObj<AuthService>, toast: jasmine.SpyObj<ToastrService>, navigate: jasmine.Spy;
  const root = () => fixture.nativeElement as HTMLElement;
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const create = async (component: any) => { fixture = TestBed.createComponent(component); await settle(); };
  const menuAction = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-panel button')).find(b => b.textContent?.includes(label))!;
  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} }); params = new BehaviorSubject(convertToParamMap({}));
    banners = jasmine.createSpyObj('SiteBannerService', ['listar', 'buscarPorId', 'criar', 'atualizar', 'alterarStatus', 'excluir', 'reordenar']);
    banners.listar.and.returnValue(of({ content: [banner, { ...banner, id: 2, ordem: 2 }], totalElements: 31 })); banners.buscarPorId.and.returnValue(of(banner)); banners.criar.and.returnValue(of(banner)); banners.atualizar.and.returnValue(of(banner)); banners.alterarStatus.and.returnValue(of(banner)); banners.excluir.and.returnValue(of(undefined)); banners.reordenar.and.returnValue(of(undefined));
    paginas = jasmine.createSpyObj('SitePaginaService', ['listar', 'buscarPorId', 'criar', 'atualizar', 'alterarStatus', 'excluir']); paginas.listar.and.returnValue(of({ content: [pagina], totalElements: 1 })); paginas.buscarPorId.and.returnValue(of(pagina)); paginas.criar.and.returnValue(of(pagina)); paginas.atualizar.and.returnValue(of(pagina));
    blocos = jasmine.createSpyObj('SitePaginaBlocoService', ['listar', 'buscarPorId', 'criar', 'atualizar', 'excluir', 'alterarStatus', 'reordenar']); blocos.listar.and.returnValue(of([bloco])); blocos.buscarPorId.and.returnValue(of(bloco)); blocos.criar.and.returnValue(of(bloco)); blocos.atualizar.and.returnValue(of(bloco));
    configs = jasmine.createSpyObj('SiteConfigService', ['buscar', 'atualizar']); configs.buscar.and.returnValue(of(config)); configs.atualizar.and.returnValue(of(config));
    auth = jasmine.createSpyObj('AuthService', ['temPermissao']); auth.temPermissao.and.returnValue(true); toast = jasmine.createSpyObj('ToastrService', ['success', 'warning', 'error']);
    TestBed.configureTestingModule({ imports: [NoopAnimationsModule, TablerIconsModule.pick(TablerIcons), ListarBannersComponent, FormBannerComponent, ListarPaginasComponent, FormPaginaComponent, ListarBlocosComponent, SiteConfiguracoesComponent], providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: params } }, { provide: BreakpointObserver, useValue: { observe: () => viewport, isMatched: () => viewport.value.matches } },
      { provide: AuthService, useValue: auth }, { provide: ToastrService, useValue: toast }, { provide: SiteBannerService, useValue: banners }, { provide: SitePaginaService, useValue: paginas }, { provide: SitePaginaBlocoService, useValue: blocos }, { provide: SiteConfigService, useValue: configs },
    ] }); navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });
  afterEach(async () => { TestBed.inject(MatDialog).closeAll(); if (fixture) { await fixture.whenStable(); fixture.destroy(); } TestBed.inject(OverlayContainer).ngOnDestroy(); });

  it('Banners usa PageCard, busca e paginação compartilhados, menu autorizado e FAB', async () => {
    await create(ListarBannersComponent); expect(root().querySelector('.card-header')!.textContent).toContain('Banners do site'); expect(root().querySelector('table')).toBeNull(); expect(root().querySelectorAll('.banner-mobile-item').length).toBe(2);
    root().querySelector<HTMLButtonElement>('app-mobile-fab-action button')!.click(); expect(navigate).toHaveBeenCalledWith(['/page/site/banners/novo']);
    const table = fixture.debugElement.query(By.directive(DataTableComponent)).componentInstance as DataTableComponent<any>;
    table.searchChange.emit('promoção'); expect(banners.listar).toHaveBeenCalledWith(jasmine.objectContaining({ page: 0, textoPesquisa: 'promoção', sort: 'ordem,asc' }));
    table.pageChange.emit({ pageIndex: 1, pageSize: 20, length: 31 }); expect(banners.listar).toHaveBeenCalledWith(jasmine.objectContaining({ page: 1, size: 20 }));
    root().querySelector<HTMLButtonElement>('.banner-mobile-item__head button')!.click(); await settle(); expect(menuAction('Mover para cima').disabled).toBeTrue(); menuAction('Editar banner').click(); await settle(); expect(navigate).toHaveBeenCalledWith(['/page/site/banners/editar', 1]);
    root().querySelector<HTMLButtonElement>('.banner-mobile-item__head button')!.click(); await settle(); menuAction('Mover para baixo').click(); await settle(); expect(banners.reordenar).toHaveBeenCalledWith({ banners: [{ id: 2, ordem: 21 }, { id: 1, ordem: 22 }] });
    root().querySelector<HTMLButtonElement>('.banner-mobile-item__head button')!.click(); await settle(); menuAction('Ativar/desativar').click(); await settle(); expect(banners.alterarStatus).toHaveBeenCalledWith(1, false);
    root().querySelector<HTMLButtonElement>('.banner-mobile-item__head button')!.click(); await settle(); menuAction('Excluir banner').click(); await settle(); expect(banners.excluir).not.toHaveBeenCalled();
    document.querySelector<HTMLButtonElement>('.confirmation-submit')!.click(); await settle(); expect(banners.excluir).toHaveBeenCalledWith(1);
  });
  it('Banners oculta ações e FAB sem permissão e preserva estados vazio, erro e restrito', async () => {
    auth.temPermissao.and.returnValue(false); await create(ListarBannersComponent); expect(root().querySelector('app-mobile-fab-action')).toBeNull(); expect(root().querySelector('.banner-mobile-item__head button')).toBeNull();
    fixture.componentInstance.onAcao({ action: 'editar', row: banner }); expect(navigate).not.toHaveBeenCalled();
    for (const status of [500, 403]) { banners.listar.and.returnValue(throwError(() => ({ status }))); fixture.componentInstance.carregarBanners(); await settle(); expect(root().textContent).toContain(status === 403 ? 'Acesso restrito' : 'Não foi possível carregar'); if (status === 403) expect(root().querySelector('.banner-mobile-item')).toBeNull(); }
    banners.listar.and.returnValue(of({ content: [], totalElements: 0 })); fixture.componentInstance.carregarBanners(); await settle(); expect(root().textContent).toContain('Nenhum banner cadastrado');
  });
  it('Páginas mantém ações, regras HOME/sistema e criação pelo FAB', async () => {
    paginas.listar.and.returnValue(of({ content: [{ ...pagina, codigo: 'HOME', tipo: 'SISTEMA' }], totalElements: 1 })); await create(ListarPaginasComponent);
    root().querySelector<HTMLButtonElement>('app-mobile-fab-action button')!.click(); expect(navigate).toHaveBeenCalledWith(['/page/site/paginas/nova']);
    root().querySelector<HTMLButtonElement>('.pagina-mobile-card__head button')!.click(); await settle(); expect(menuAction('Excluir')).toBeUndefined(); expect(menuAction('Ativar/desativar').disabled).toBeTrue();
  });
  for (const edit of [false, true]) it(`Banner ${edit ? 'edição' : 'criação'} preserva imagem, validação, payload e um único rodapé`, async () => {
    if (edit) params.next(convertToParamMap({ id: '1' })); await create(FormBannerComponent); document.body.appendChild(root());
    try { const c = fixture.componentInstance as FormBannerComponent; expect(root().querySelectorAll('app-mobile-total-bar').length).toBe(1); expect(root().querySelector('.page-card__footer')).toBeNull();
      if (!edit) { root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.click(); expect(banners.criar).not.toHaveBeenCalled(); expect(toast.warning).toHaveBeenCalled(); }
      const file = new File(['image'], 'banner.webp', { type: 'image/webp' }); c.onImagemSelecionada(file); c.onPreviewChange('blob:preview'); c.tituloControl.setValue('Promoção'); c.formState.reset(); expect(c.imagemSelecionada).toBeNull(); expect(c.tituloControl.value).toBe(edit ? banner.titulo : '');
      c.onImagemSelecionada(file); c.form.patchValue({ titulo: 'Promoção', ctaUrl: 'https://example.com', dataInicio: '2026-10-20', ordem: 4 });
      const response = new Subject<any>(); const request = edit ? banners.atualizar : banners.criar; request.and.returnValue(response); fixture.detectChanges(); root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.click(); fixture.detectChanges(); c.onSubmit();
      expect(request).toHaveBeenCalledTimes(1); expect(request.calls.mostRecent().args[edit ? 1 : 0]).toEqual(jasmine.objectContaining({ titulo: 'Promoção', imagem: file, ordem: 4 })); expect(root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.disabled).toBeTrue(); response.next(banner); response.complete(); await settle(); expect(navigate).toHaveBeenCalledWith(['/page/site/banners']);
    } finally { root().remove(); }
  });
  it('Página salva e restaura edição pelo rodapé, mantendo campos condicionais e conteúdo', async () => {
    params.next(convertToParamMap({ id: '5' })); await create(FormPaginaComponent); document.body.appendChild(root());
    try { const c = fixture.componentInstance as FormPaginaComponent; const before = c.form.getRawValue(); c.form.patchValue({ titulo: 'Alteração', exibirNaHome: true }); fixture.detectChanges(); root().querySelector<HTMLButtonElement>('.mobile-total-bar__secondary')!.click(); fixture.detectChanges(); expect(c.form.getRawValue()).toEqual(before); expect(c.tituloHomeControl.disabled).toBeTrue();
      c.tituloControl.setValue('Página atualizada'); fixture.detectChanges(); root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.click(); expect(paginas.atualizar).toHaveBeenCalledWith(5, jasmine.objectContaining({ titulo: 'Página atualizada', slug: 'pagina', ativa: true })); expect(root().querySelector('app-listar-blocos')).not.toBeNull();
    } finally { root().remove(); }
  });
  it('Configurações respeita edição, reset e normalização do WhatsApp com único rodapé', async () => {
    await create(SiteConfiguracoesComponent); document.body.appendChild(root());
    try { const c = fixture.componentInstance as SiteConfiguracoesComponent; c.form.patchValue({ siteAtivo: false, whatsappAtivo: false }); fixture.detectChanges(); root().querySelector<HTMLButtonElement>('.mobile-total-bar__secondary')!.click(); fixture.detectChanges(); expect(c.siteAtivoControl.value).toBeTrue(); expect(c.whatsappAtivoControl.value).toBeTrue();
      c.whatsappTextoControl.setValue('Atendimento'); fixture.detectChanges(); root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.click(); expect(configs.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ whatsappTelefone: '11999998888', whatsappTexto: 'Atendimento', siteAtivo: true })); expect(root().querySelector('.page-card__footer')).toBeNull();
    } finally { root().remove(); }
  });
  it('Configurações de somente leitura não cria rodapé e mantém bloqueio do salvamento', async () => {
    auth.temPermissao.and.callFake(p => p !== 'SITE_CONFIG_EDITAR'); await create(SiteConfiguracoesComponent); expect(root().querySelector('app-mobile-total-bar')).toBeNull(); expect(fixture.componentInstance.form.disabled).toBeTrue(); fixture.componentInstance.salvar(); expect(configs.atualizar).not.toHaveBeenCalled();
  });
  it('formulários não exibem ações durante carregamento, erro e acesso restrito', async () => {
    const response = new Subject<any>(); configs.buscar.and.returnValue(response); await create(SiteConfiguracoesComponent); expect(root().querySelector('app-mobile-total-bar')).toBeNull(); response.error({ status: 403 }); await settle(); expect(root().querySelector('app-mobile-total-bar')).toBeNull(); expect(root().textContent).toContain('Acesso restrito');
  });
  it('blocos abre painel compartilhado, mantém JSON e salva sem duplicar o editor', async () => {
    await create(ListarBlocosComponent); fixture.componentInstance.paginaId = 5; fixture.componentInstance.carregarBlocos(); await settle(); fixture.componentInstance.editar(bloco); await settle();
    const dialog = TestBed.inject(MatDialog), ref = dialog.openDialogs[0], editor = ref.componentInstance as FormBlocoComponent;
    expect(document.querySelectorAll('.mobile-side-panel').length).toBe(1); expect(document.querySelectorAll('[role="dialog"]').length).toBe(1); expect(editor.mobilePanel).toBeTrue(); expect(editor.htmlControl.value).toBe('Conteúdo original');
    editor.htmlControl.setValue('Conteúdo revisado'); document.querySelector<HTMLButtonElement>('.mobile-side-panel__footer button:last-child')!.click(); await settle(); expect(blocos.atualizar).toHaveBeenCalledWith(5, 8, jasmine.objectContaining({ conteudoJson: '{"html":"Conteúdo revisado"}' })); expect(blocos.listar.calls.count()).toBe(2);
  });
  it('blocos mantém modal desktop e fechar painel não salva', async () => {
    viewport.next({ matches: false, breakpoints: {} }); await create(ListarBlocosComponent); fixture.componentInstance.paginaId = 5; fixture.componentInstance.adicionar(); await settle(); expect(document.querySelector('.mobile-side-panel')).toBeNull(); const ref = TestBed.inject(MatDialog).openDialogs[0]; expect(ref.componentInstance.mobilePanel).toBeFalse(); ref.close(); await settle();
    viewport.next({ matches: true, breakpoints: {} }); fixture.componentInstance.adicionar(); await settle(); document.querySelector<HTMLButtonElement>('.mobile-side-panel__header button')!.click(); await settle(); expect(blocos.criar).not.toHaveBeenCalled(); expect(blocos.atualizar).not.toHaveBeenCalled();
  });

  it('Página nova preserva validação e criação usando o formulário original', async () => {
    await create(FormPaginaComponent); document.body.appendChild(root());
    try { const c = fixture.componentInstance as FormPaginaComponent; fixture.detectChanges(); expect(root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.disabled).toBeTrue();
      c.form.patchValue({ titulo: 'Nossa equipe', slug: 'nossa-equipe' }); fixture.detectChanges(); root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.click(); expect(paginas.criar).toHaveBeenCalledWith(jasmine.objectContaining({ titulo: 'Nossa equipe', slug: 'nossa-equipe', ativa: true })); expect(root().querySelector('app-listar-blocos')).toBeNull();
    } finally { root().remove(); }
  });
  it('blocos mantém edição de FAQ, validação de imagem e recuperação de JSON inválido', async () => {
    await create(ListarBlocosComponent); fixture.componentInstance.paginaId = 5; blocos.buscarPorId.and.returnValue(of({ ...bloco, conteudoJson: 'inválido' })); fixture.componentInstance.editar(bloco); await settle();
    const editor = TestBed.inject(MatDialog).openDialogs[0].componentInstance as FormBlocoComponent; expect(editor.avisoJsonInvalido).toBeTrue();
    editor.form.patchValue({ tipo: 'IMAGEM' }); editor.imagemAtualUrl = ''; editor.salvar(); expect(blocos.atualizar).toHaveBeenCalledWith(5, 8, jasmine.objectContaining({ tipo: 'IMAGEM' }));
    await settle(); fixture.componentInstance.adicionar(); await settle(); const next = TestBed.inject(MatDialog).openDialogs[0].componentInstance as FormBlocoComponent;
    next.form.patchValue({ tipo: 'IMAGEM' }); next.salvar(); expect(blocos.criar).not.toHaveBeenCalled(); expect(toast.warning).toHaveBeenCalled();
    next.form.patchValue({ tipo: 'FAQ' }); next.faqItens.at(0).patchValue({ pergunta: ' Prazo? ', resposta: ' Dois dias ' }); next.salvar(); await settle(); expect(blocos.criar).toHaveBeenCalledWith(5, jasmine.objectContaining({ conteudoJson: '{"itens":[{"pergunta":"Prazo?","resposta":"Dois dias"}]}' }));
  });
  for (const width of [360, 390, 430]) it(`painel de blocos ocupa ${width}px com corpo rolável e rodapé acessível`, async () => {
    await create(ListarBlocosComponent); fixture.componentInstance.paginaId = 5; fixture.componentInstance.adicionar(); await settle(); const pane = document.querySelector<HTMLElement>('.mobile-side-panel')!.cloneNode(true) as HTMLElement;
    // The shared opener measures visualViewport in the live document; resolve the clone against the test viewport.
    pane.style.cssText = 'position:fixed;top:0;right:0;width:100vw;height:100dvh;max-width:100vw;max-height:100dvh'; const frame = frameCopy(pane, width);
    try { const doc = frame.contentDocument!; const style = doc.createElement('style'); style.textContent = '.mobile-side-panel .mat-mdc-dialog-inner-container { animation:none!important;transform:none!important; }'; doc.head.appendChild(style);
      expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); const panel = doc.querySelector('.mobile-side-panel')!.getBoundingClientRect(); expect(Math.round(panel.width)).toBe(width); expect(Math.round(panel.height)).toBe(900);
      const body = doc.querySelector('.mobile-side-panel__body')!; expect(frame.contentWindow!.getComputedStyle(body).overflowY).toBe('auto'); const footer = doc.querySelector('.mobile-side-panel__footer')!.getBoundingClientRect(); expect(footer.bottom).toBeLessThanOrEqual(901); expect(footer.height).toBeGreaterThanOrEqual(44);
    } finally { frame.remove(); }
  });

  for (const width of [360, 390, 430, 1024, 1440]) {
    for (const component of [ListarBannersComponent, ListarPaginasComponent, FormBannerComponent, FormPaginaComponent, SiteConfiguracoesComponent]) it(`${component.name} preserva área útil e contrato em ${width}px`, async () => {
      viewport.next({ matches: width <= 760, breakpoints: {} }); await create(component); const frame = frameCopy(root(), width);
      try { const doc = frame.contentDocument!; const list = component === ListarBannersComponent || component === ListarPaginasComponent;
        if (width <= 760) { expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); expect(doc.querySelector('table')).toBeNull(); expect(doc.querySelector('.page-card__footer')).toBeNull();
          if (list) { expect(doc.querySelector('app-mobile-fab-action button')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(804); expect(doc.querySelector('[mat-icon-button]')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44); }
          else { expect(doc.querySelectorAll('app-mobile-total-bar').length).toBe(1); expect(doc.querySelector('.mobile-total-bar')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(820); }
        } else { expect(doc.querySelector('app-mobile-fab-action')).toBeNull(); expect(doc.querySelector('app-mobile-total-bar')).toBeNull();
          if (list) expect(doc.querySelectorAll('thead th').length).toBe(component === ListarBannersComponent ? 6 : 9); else expect(doc.querySelector('.page-card__footer')).not.toBeNull();
        }
      } finally { frame.remove(); }
    });
  }
});
