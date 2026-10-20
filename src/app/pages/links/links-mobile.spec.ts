import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { PresencaPublicaService } from '../config/presenca-publica/presenca-publica.service';
import { EmpresaIdentidadePublicaService } from '../empresa/empresa-identidade-publica.service';
import { EmpresaFormService } from '../empresa/empresa-form.service';
import { LinksService } from './services/links.service';
import { LinksListaComponent } from './pages/lista/links-lista.component';
import { LinksEditorComponent } from './pages/editor/links-editor.component';
import { LinksAnalyticsComponent } from './pages/analytics/links-analytics.component';
import { LinksItemDialogComponent } from './components/item-dialog/links-item-dialog.component';

const item = { id: 3, tipo: 'LINK', titulo: 'Portfólio com um nome longo para conferir a largura útil', subtitulo: 'Conheça nossos trabalhos', url: 'https://example.com/portfolio', ativo: true, ordem: 0 };
const identidade = { nome: 'Clickarte', slug: 'clickarte', logoUrl: null };
const pagina = { id: 7, titulo: 'Canais da empresa', slug: 'canais', descricao: 'Fale com a equipe', ativa: true, publicada: true, principal: true, tema: 'CLARO', corPrincipal: '#0D6EFD', corFundo: '#F6F8FB', formatoBotao: 'ARREDONDADO', quantidadeItens: 1, identidade, itens: [item] };
function frameCopy(root: HTMLElement, width: number): HTMLIFrameElement {
  const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:900px;border:0`; document.body.appendChild(frame); const doc = frame.contentDocument!;
  Array.from(document.styleSheets).forEach(sheet => { const style = doc.createElement('style'); style.textContent = Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); doc.head.appendChild(style); }); doc.body.style.cssText = 'margin:0;--mobile-bottom-nav-height:80px'; doc.body.appendChild(root.cloneNode(true)); return frame;
}
describe('ClickLink — fundação mobile', () => {
  let fixture: ComponentFixture<any>, viewport: BehaviorSubject<any>, api: any, auth: any, navigate: jasmine.Spy;
  let snapshot: { routeConfig: { path: string }; paramMap: any };
  const root = () => fixture.nativeElement as HTMLElement;
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const create = async (component: any) => { fixture = TestBed.createComponent(component); await settle(); };
  const dialog = () => TestBed.inject(MatDialog);
  const action = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-panel button')).find(b => b.textContent?.includes(label))!;
  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} }); snapshot = { routeConfig: { path: ':id' }, paramMap: convertToParamMap({ id: '7' }) };
    api = jasmine.createSpyObj('LinksService', ['listarPaginas', 'buscarPagina', 'criarPagina', 'editarPagina', 'adicionarItem', 'editarItem', 'alterarPublicacao', 'tornarPrincipal', 'excluirPagina', 'removerItem', 'alterarStatusItem', 'buscarAnalytics']); api.listarPaginas.and.returnValue(of([pagina])); api.buscarPagina.and.returnValue(of(structuredClone(pagina))); for (const key of ['criarPagina', 'editarPagina', 'adicionarItem', 'editarItem', 'alterarPublicacao', 'tornarPrincipal', 'alterarStatusItem']) api[key].and.returnValue(of(pagina)); api.excluirPagina.and.returnValue(of(undefined)); api.removerItem.and.returnValue(of(pagina)); api.buscarAnalytics.and.returnValue(of({ periodo: '30d', visualizacoes: 30, cliques: 15, taxaClique: 50, ranking: [{ itemId: 3, tipo: 'LINK', titulo: item.titulo, cliques: 15, percentual: 100 }] }));
    auth = { usuario$: of({ empresa: { id: 1 } }), temPermissao: jasmine.createSpy('temPermissao').and.returnValue(true) };
    TestBed.configureTestingModule({ imports: [NoopAnimationsModule, TablerIconsModule.pick(TablerIcons), LinksListaComponent, LinksEditorComponent, LinksAnalyticsComponent], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot } }, { provide: BreakpointObserver, useValue: { observe: () => viewport, isMatched: () => viewport.value.matches } }, { provide: LinksService, useValue: api }, { provide: AuthService, useValue: auth }, { provide: EmpresaIdentidadePublicaService, useValue: { buscar: () => of(identidade) } }, { provide: EmpresaFormService, useValue: { buscarEmpresa: () => of({ id: 1, nome: 'Clickarte' }) } }, { provide: PresencaPublicaService, useValue: { buscar: () => of({ slugPublico: 'clickarte' }) } }, { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'info', 'warning', 'error']) }] }); navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });
  afterEach(async () => { dialog().closeAll(); if (fixture) { await fixture.whenStable(); fixture.destroy(); } TestBed.inject(OverlayContainer).ngOnDestroy(); });
  it('usa FAB e menu compacto com edição, compartilhamento e confirmação de exclusão', async () => {
    await create(LinksListaComponent); expect(root().querySelector('.links-mobile-card__actions')).toBeNull(); root().querySelector<HTMLButtonElement>('app-mobile-fab-action button')!.click(); expect(navigate).toHaveBeenCalledWith(['/page/links/nova']);
    root().querySelector<HTMLButtonElement>('.links-mobile-card__head button')!.click(); await settle(); action('Editar').click(); await settle(); expect(navigate).toHaveBeenCalledWith(['/page/links', 7]);
    root().querySelector<HTMLButtonElement>('.links-mobile-card__head button')!.click(); await settle(); action('Compartilhar').click(); await settle(); expect(document.querySelector('.mobile-side-panel')).not.toBeNull(); expect(dialog().openDialogs[0].componentInstance.data.url).toBe(fixture.componentInstance.urlPublica(pagina)); dialog().closeAll(); await settle();
    root().querySelector<HTMLButtonElement>('.links-mobile-card__head button')!.click(); await settle(); action('Excluir').click(); await settle(); expect(api.excluirPagina).not.toHaveBeenCalled(); document.querySelector<HTMLButtonElement>('.confirmation-submit')!.click(); await settle(); expect(api.excluirPagina).toHaveBeenCalledWith(7);
  });
  it('oculta FAB e ações de gestão sem permissão preservando abertura e compartilhamento', async () => {
    auth.temPermissao.and.callFake((p: string) => p === 'LINKS_VER'); await create(LinksListaComponent); expect(root().querySelector('app-mobile-fab-action')).toBeNull(); root().querySelector<HTMLButtonElement>('.links-mobile-card__head button')!.click(); await settle(); expect(action('Editar')).toBeUndefined(); expect(action('Excluir')).toBeUndefined(); expect(action('Compartilhar')).toBeDefined();
  });
  for (const edit of [false, true]) it(`salva ${edit ? 'edição' : 'criação'} pelo rodapé global e mantém reset e validações`, async () => {
    snapshot.routeConfig.path = edit ? ':id' : 'nova'; await create(LinksEditorComponent); document.body.appendChild(root());
    try { const c = fixture.componentInstance as LinksEditorComponent; const before = c.form.getRawValue(); c.tituloControl.setValue('Alterado'); fixture.detectChanges(); root().querySelector<HTMLButtonElement>('.mobile-total-bar__secondary')!.click(); fixture.detectChanges(); expect(c.form.getRawValue()).toEqual(before); expect(root().querySelector('.page-card__footer')).toBeNull();
      c.tituloControl.setValue(''); fixture.detectChanges(); expect(root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.disabled).toBeTrue(); c.tituloControl.setValue('Página atualizada'); const response = new Subject<any>(); const request = edit ? api.editarPagina : api.criarPagina; request.and.returnValue(response); fixture.detectChanges(); root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.click(); fixture.detectChanges(); expect(request).toHaveBeenCalledTimes(1); expect(request.calls.mostRecent().args[edit ? 1 : 0]).toEqual(jasmine.objectContaining({ titulo: 'Página atualizada', corPrincipal: '#0D6EFD' })); expect(root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.disabled).toBeTrue(); response.next(pagina); response.complete(); await settle();
    } finally { root().remove(); }
  });
  it('edita link no painel lateral preservando destino, tipo e metadados', async () => {
    await create(LinksEditorComponent); fixture.componentInstance.abrirItem(item); await settle(); const editor = dialog().openDialogs[0].componentInstance as LinksItemDialogComponent; expect(document.querySelectorAll('.mobile-side-panel').length).toBe(1); expect(editor.urlControl.value).toBe(item.url); editor.tituloControl.setValue('Portfólio atualizado'); document.querySelector<HTMLButtonElement>('.links-item-dialog__mobile-actions button:last-child')!.click(); await settle(); expect(api.editarItem).toHaveBeenCalledWith(7, 3, jasmine.objectContaining({ titulo: 'Portfólio atualizado', url: item.url, tipo: 'LINK' }));
  });
  it('preview usa painel global com modelo em edição e fecha sem salvar', async () => {
    await create(LinksEditorComponent); fixture.componentInstance.tituloControl.setValue('Prévia atual'); fixture.componentInstance.visualizarMobile(); await settle(); expect(document.querySelector('.mobile-side-panel')).not.toBeNull(); expect(dialog().openDialogs[0].componentInstance.data.titulo).toBe('Prévia atual'); document.querySelector<HTMLButtonElement>('.links-preview-dialog__bar button')!.click(); await settle(); expect(api.editarPagina).not.toHaveBeenCalled();
  });

  for (const width of [360, 390, 430]) for (const kind of ['item', 'compartilhar', 'preview']) it(`painel ${kind} não transborda em ${width}px`, async () => {
    if (kind === 'compartilhar') { await create(LinksListaComponent); fixture.componentInstance.compartilhar(pagina); }
    else { await create(LinksEditorComponent); if (kind === 'item') fixture.componentInstance.abrirItem(item); else fixture.componentInstance.visualizarMobile(); }
    await settle(); const pane = document.querySelector<HTMLElement>('.mobile-side-panel')!.cloneNode(true) as HTMLElement; pane.style.cssText = 'position:fixed;top:0;right:0;width:100vw;height:100dvh;max-width:100vw;max-height:100dvh'; const frame = frameCopy(pane, width);
    try { const doc = frame.contentDocument!; const style = doc.createElement('style'); style.textContent = '.mobile-side-panel .mat-mdc-dialog-inner-container { animation:none!important;transform:none!important; }'; doc.head.appendChild(style);
      expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); const body = doc.querySelector<HTMLElement>('.mobile-side-panel__body')!; expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth); if (kind !== 'preview') expect(doc.querySelector('.mobile-side-panel__footer')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(900);
    } finally { frame.remove(); }
  });
  for (const width of [360, 390, 430, 1024, 1440]) for (const component of [LinksListaComponent, LinksEditorComponent, LinksAnalyticsComponent]) it(`${component.name} preserva layout e desktop em ${width}px`, async () => {
    viewport.next({ matches: width <= 760, breakpoints: {} }); await create(component); const frame = frameCopy(root(), width);
    try { const doc = frame.contentDocument!; if (width <= 760) { expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); expect(doc.querySelector('table')).toBeNull(); expect(doc.querySelector('.page-card__footer')).toBeNull();
        if (component === LinksListaComponent) { expect(doc.querySelector('app-mobile-fab-action button')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(804); expect(doc.querySelector('.links-mobile-card__head button')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44); }
        if (component === LinksEditorComponent) expect(doc.querySelector('.mobile-total-bar')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(820); if (component === LinksAnalyticsComponent) expect(doc.querySelector('.links-ranking-item')).not.toBeNull();
      } else { expect(doc.querySelector('app-mobile-fab-action')).toBeNull(); expect(doc.querySelector('app-mobile-total-bar')).toBeNull(); if (component === LinksEditorComponent) expect(doc.querySelector('.page-card__footer')).not.toBeNull(); else expect(doc.querySelector('table')).not.toBeNull(); }
    } finally { frame.remove(); }
    if (component === LinksEditorComponent && width <= 760) for (const tab of [1, 2, 3]) {
      fixture.componentInstance.abaSelecionada = tab; await settle(); const tabFrame = frameCopy(root(), width);
      try { expect(tabFrame.contentDocument!.documentElement.scrollWidth).toBeLessThanOrEqual(width); } finally { tabFrame.remove(); }
    }
  });
});
