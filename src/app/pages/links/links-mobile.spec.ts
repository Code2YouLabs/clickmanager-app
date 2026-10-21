import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
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


  for (const nova of [false, true]) it(`inicia ${nova ? 'criação' : 'edição'} em Geral e navega sem perder controles nem salvar`, async () => {
    snapshot.routeConfig.path = nova ? 'nova' : ':id'; await create(LinksEditorComponent); const c = fixture.componentInstance as LinksEditorComponent;
    const sections = root().querySelectorAll('[data-mobile-section]'); expect(sections.length).toBe(3); expect(root().querySelector('mat-tab-group')).toBeNull(); expect(c.mobileSection).toBe('geral');
    const field = root().querySelector<HTMLInputElement>('[data-mobile-section="geral"] app-input-texto-restrito input')!; const control = c.tituloControl;
    field.value = 'Título em edição'; field.dispatchEvent(new Event('input')); fixture.detectChanges();
    root().querySelector<HTMLButtonElement>('[data-mobile-section="aparencia"] .section-card__toggle')!.click(); await settle(); expect(c.mobileSection).toBe('aparencia'); expect(root().querySelector<HTMLElement>('[data-mobile-section="geral"] .section-card__body')!.hidden).toBeTrue();
    const picker = root().querySelector<HTMLInputElement>('[aria-label="Selecionar cor de destaque"]')!; picker.value = '#123abc'; picker.dispatchEvent(new Event('input')); await settle(); expect(c.corPrincipalControl.value).toBe('#123ABC');
    root().querySelector<HTMLButtonElement>('[data-mobile-section="geral"] .section-card__toggle')!.click(); await settle(); expect(c.tituloControl).toBe(control); expect(root().querySelector('[data-mobile-section="geral"] app-input-texto-restrito input')).toBe(field); expect(field.value).toBe('Título em edição'); expect(c.corPrincipalControl.value).toBe('#123ABC');
    root().querySelector<HTMLButtonElement>('[data-mobile-section="geral"] .section-card__toggle')!.click(); await settle(); expect(c.mobileSection).toBeNull(); expect(root().querySelectorAll('.section-card__body[hidden]').length).toBe(3); expect(api.criarPagina).not.toHaveBeenCalled(); expect(api.editarPagina).not.toHaveBeenCalled();
  });
  it('mantém identidade global, logo compacto e destino Gerenciar dados da empresa', async () => {
    await create(LinksEditorComponent); expect(root().querySelector('.links-identity__main strong')!.textContent).toBe(identidade.nome); expect(root().querySelector<HTMLAnchorElement>('.links-identity a')!.getAttribute('href')).toBe('/page/empresa');
    expect(root().querySelectorAll('.links-identity').length).toBe(1); expect(root().querySelectorAll('app-mobile-total-bar').length).toBe(1); expect(root().querySelectorAll('app-section-card').length).toBe(3);
  });
  it('Links oferece primeiro salvamento com validação e encaminha à edição com a seção indicada', async () => {
    snapshot.routeConfig.path = 'nova'; const response = new Subject<any>(); api.criarPagina.and.returnValue(response); await create(LinksEditorComponent); const c = fixture.componentInstance as LinksEditorComponent;
    root().querySelector<HTMLButtonElement>('[data-mobile-section="links"] .section-card__toggle')!.click(); await settle(); expect(root().textContent).toContain('Primeiro, salve sua página');
    c.tituloControl.setValue(''); fixture.detectChanges(); root().querySelector<HTMLButtonElement>('.links-mobile-save-first button')!.click(); await settle(); expect(api.criarPagina).not.toHaveBeenCalled(); expect(c.mobileSection).toBe('geral'); expect(c.tituloControl.touched).toBeTrue(); expect(root().querySelector('[data-mobile-section="geral"] mat-error')!.textContent).toContain('Campo obrigatório');
    c.form.patchValue({ titulo: 'Nova página', tema: 'ESCURO', corPrincipal: '#123ABC', corFundo: '#000000', formatoBotao: 'SUAVE' }); c.setMobileSection('links', true); await settle(); root().querySelector<HTMLButtonElement>('.links-mobile-save-first button')!.click(); fixture.detectChanges(); c.salvarOuCriar(true); expect(api.criarPagina).toHaveBeenCalledTimes(1); expect(root().querySelector<HTMLButtonElement>('.links-mobile-save-first button')!.disabled).toBeTrue();
    expect(api.criarPagina).toHaveBeenCalledWith(jasmine.objectContaining({ titulo: 'Nova página', tema: 'ESCURO', corPrincipal: '#123ABC', corFundo: '#000000', formatoBotao: 'SUAVE' })); response.next(pagina); response.complete(); await settle(); expect(navigate).toHaveBeenCalledWith(['/page/links', 7], { state: { clickLinkMobileSection: 'links' } }); expect(api.alterarPublicacao).not.toHaveBeenCalled();
  });
  it('falha no primeiro salvamento mantém valores e permite tentar novamente sem herdar continuidade no Salvar comum', async () => {
    snapshot.routeConfig.path = 'nova'; api.criarPagina.and.returnValue(throwError(() => ({ status: 500 }))); await create(LinksEditorComponent); const c = fixture.componentInstance as LinksEditorComponent; c.form.patchValue({ titulo: 'Minha página', descricao: 'Conteúdo preservado', corFundo: '#AABBCC' }); c.setMobileSection('links', true); await settle(); root().querySelector<HTMLButtonElement>('.links-mobile-save-first button')!.click(); await settle(); expect(c.salvandoPagina).toBeFalse(); expect(c.descricaoControl.value).toBe('Conteúdo preservado'); expect(c.corFundoControl.value).toBe('#AABBCC'); expect(c.mobileSection).toBe('links'); expect(navigate).not.toHaveBeenCalled();
    api.criarPagina.and.returnValue(of(pagina)); c.salvarOuCriar(); await settle(); expect(navigate).toHaveBeenCalledWith(['/page/links', 7]); expect(api.criarPagina).toHaveBeenCalledTimes(2);
  });
  it('aparência continua acessível com Geral inválida e identifica a seção de cada erro', async () => {
    await create(LinksEditorComponent); const c = fixture.componentInstance as LinksEditorComponent; c.tituloControl.setValue(''); c.setMobileSection('aparencia', true); await settle(); expect(c.mobileSection).toBe('aparencia'); expect(root().querySelector('[data-mobile-section="geral"] .section-card__toggle')!.textContent).toContain('Revise');
    c.tituloControl.setValue('Título válido'); c.corPrincipalControl.setValue('inválida'); c.corPrincipalControl.markAsTouched(); c.setMobileSection('geral', true); await settle(); expect(root().querySelector('[data-mobile-section="aparencia"] .section-card__toggle')!.textContent).toContain('Revise'); c.salvarOuCriar(); await settle(); expect(c.mobileSection).toBe('aparencia'); expect(root().querySelector('[data-mobile-section="aparencia"] mat-error')!.textContent).toContain('#RRGGBB'); expect(api.editarPagina).not.toHaveBeenCalled();
  });
  it('prévia da nova página mantém formulário ainda não salvo e usa o renderer/painel existentes', async () => {
    snapshot.routeConfig.path = 'nova'; await create(LinksEditorComponent); const c = fixture.componentInstance as LinksEditorComponent; c.form.patchValue({ titulo: 'Rascunho', descricao: 'Sem salvar', tema: 'ESCURO', corPrincipal: '#123ABC', corFundo: '#000000', formatoBotao: 'QUADRADO' }); c.setMobileSection('aparencia', true); await settle(); expect(root().querySelector('app-links-public-preview')).toBeNull(); root().querySelector<HTMLButtonElement>('.links-mobile-preview')!.click(); await settle(); expect(document.querySelector('.mobile-side-panel__header')!.textContent).toContain('Prévia da página'); expect(document.querySelectorAll('.mobile-side-panel app-links-public-preview').length).toBe(1); expect(dialog().openDialogs[0].componentInstance.data).toEqual(jasmine.objectContaining({ titulo: 'Rascunho', descricao: 'Sem salvar', tema: 'ESCURO', corPrincipal: '#123ABC', corFundo: '#000000', formatoBotao: 'QUADRADO' }));
    document.querySelector<HTMLButtonElement>('.links-preview-dialog__bar button')!.click(); await settle(); expect(c.tituloControl.value).toBe('Rascunho'); expect(c.mobileSection).toBe('aparencia'); expect(api.criarPagina).not.toHaveBeenCalled(); expect(api.editarPagina).not.toHaveBeenCalled();
  });
  it('Links existente mantém o DataTable e abre edição pelo menu, sem salvar o formulário ao expandir', async () => {
    await create(LinksEditorComponent); root().querySelector<HTMLButtonElement>('[data-mobile-section="links"] .section-card__toggle')!.click(); await settle(); expect(root().querySelector('.links-mobile-save-first')).toBeNull(); expect(root().querySelector('.links-mobile-add')).not.toBeNull(); root().querySelector<HTMLButtonElement>('.links-item__menu')!.click(); await settle(); action('Editar').click(); await settle(); expect(dialog().openDialogs[0].componentInstance.data.item.id).toBe(3); expect(api.editarPagina).not.toHaveBeenCalled();
  });
  it('compartilhamento permanece em Geral pelo painel reutilizável sem publicar a página', async () => {
    await create(LinksEditorComponent); root().querySelector<HTMLButtonElement>('.links-mobile-share')!.click(); await settle(); expect(document.querySelector('.mobile-side-panel app-links-share-panel')).not.toBeNull(); expect(dialog().openDialogs[0].componentInstance.data.url).toBe(fixture.componentInstance.urlPublica()); expect(api.editarPagina).not.toHaveBeenCalled(); expect(api.alterarPublicacao).not.toHaveBeenCalled();
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
    if (component === LinksEditorComponent && width <= 760) for (const section of ['geral', 'links', 'aparencia']) {
      fixture.componentInstance.setMobileSection(section, true); await settle(); const tabFrame = frameCopy(root(), width);
      try { const doc = tabFrame.contentDocument!; expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width);
        expect(doc.querySelector('mat-tab-group')).toBeNull(); expect(doc.querySelectorAll('.section-card__toggle[aria-expanded="true"]').length).toBe(1);
        if (section === 'aparencia') {
          for (const inputId of ['clicklink-primary-input', 'clicklink-background-input']) {
            const field = doc.getElementById(inputId)!; const label = doc.querySelector(`label[for="${inputId}"]`)!; expect(label.getBoundingClientRect().bottom).toBeLessThanOrEqual(field.getBoundingClientRect().top);
          }
          expect(doc.querySelector<HTMLInputElement>('[type="color"]')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
        }
      } finally { tabFrame.remove(); }
    }
  });
});
