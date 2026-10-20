import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { HttpEventType } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { ListFilterBarComponent } from 'src/app/components/list-filter-bar/list-filter-bar.component';
import { ClickTvTelasComponent } from './components/telas/clicktv-telas.component';
import { ClickTvPlaylistsComponent } from './components/playlists/clicktv-playlists.component';
import { ClickTvMidiasComponent } from './components/midias/clicktv-midias.component';
import { ClickTvPlaylistEditorComponent } from './components/playlist-editor/clicktv-playlist-editor.component';
import { ClickTvService } from './services/clicktv.service';

const midia = { id: 10, nome: 'Campanha com nome longo para verificar a largura útil do celular', tipo: 'IMAGEM', status: 'DISPONIVEL', orientacao: 'HORIZONTAL', tamanhoBytes: 1000, nomeArquivoOriginal: 'campanha.webp', mimeType: 'image/webp' };
const item = { id: 100, midiaId: 10, midiaNome: midia.nome, midiaTipo: 'IMAGEM', midiaStatus: 'DISPONIVEL', ordem: 1, duracaoSegundos: 10, ativo: true };
const playlist = { id: 1, nome: 'Vitrine', descricao: 'Recepção', orientacao: 'HORIZONTAL', ativa: true, versao: 1, quantidadeItens: 2, quantidadeItensAtivos: 2, itens: [item, { ...item, id: 101, ordem: 2 }] };
const tela = { id: 2, nome: 'TV Recepção', descricaoLocal: 'Entrada', orientacao: 'HORIZONTAL', status: 'ONLINE', ativa: true, playlistPadraoId: 1 };
const page = (content: any[]) => ({ content, totalElements: 31, totalPages: 4, number: 0, size: 10 });
function frameCopy(root: HTMLElement, width: number): HTMLIFrameElement {
  const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:900px;border:0`; document.body.appendChild(frame); const doc = frame.contentDocument!;
  Array.from(document.styleSheets).forEach(sheet => { const style = doc.createElement('style'); style.textContent = Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); doc.head.appendChild(style); }); doc.body.style.cssText = 'margin:0;--mobile-bottom-nav-height:80px'; doc.body.appendChild(root.cloneNode(true)); return frame;
}
describe('ClickTV — fundação mobile', () => {
  let fixture: ComponentFixture<any>, viewport: BehaviorSubject<any>, api: any, auth: jasmine.SpyObj<AuthService>, navigate: jasmine.Spy;
  const root = () => fixture.nativeElement as HTMLElement;
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const create = async (component: any) => { fixture = TestBed.createComponent(component); await settle(); };
  const dialog = () => TestBed.inject(MatDialog);
  const editor = () => dialog().openDialogs[0].componentInstance as any;
  const action = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-panel button')).find(b => b.textContent?.includes(label))!;
  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} }); auth = jasmine.createSpyObj('AuthService', ['temPermissao']); auth.temPermissao.and.returnValue(true);
    api = jasmine.createSpyObj('ClickTvService', ['listarTelas', 'listarPlaylists', 'listarMidias', 'detalharPlaylist', 'detalharMidia', 'utilizacoesMidia', 'vincularTela', 'editarTela', 'alterarPlaylistPadrao', 'criarPlaylist', 'editarPlaylist', 'duplicarPlaylist', 'uploadMidia', 'renomearMidia', 'adicionarItem', 'editarItem', 'reordenarItens', 'removerItem']);
    api.listarTelas.and.returnValue(of(page([tela]))); api.listarPlaylists.and.returnValue(of(page([playlist]))); api.listarMidias.and.returnValue(of(page([midia]))); api.detalharPlaylist.and.returnValue(of(structuredClone(playlist))); api.detalharMidia.and.returnValue(of(midia)); api.utilizacoesMidia.and.returnValue(of([]));
    for (const name of ['vincularTela', 'editarTela', 'criarPlaylist', 'editarPlaylist', 'duplicarPlaylist', 'adicionarItem', 'editarItem', 'reordenarItens']) api[name].and.returnValue(of(playlist)); api.alterarPlaylistPadrao.and.returnValue(of(undefined)); api.removerItem.and.returnValue(of(undefined)); api.renomearMidia.and.returnValue(of(midia));
    TestBed.configureTestingModule({ imports: [NoopAnimationsModule, ClickTvTelasComponent, ClickTvPlaylistsComponent, ClickTvMidiasComponent, ClickTvPlaylistEditorComponent], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } }, { provide: BreakpointObserver, useValue: { observe: () => viewport, isMatched: () => viewport.value.matches } }, { provide: AuthService, useValue: auth }, { provide: ClickTvService, useValue: api }, { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'warning', 'error', 'info']) }] }); navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });
  afterEach(async () => { dialog().closeAll(); if (fixture) { await fixture.whenStable(); fixture.destroy(); } TestBed.inject(OverlayContainer).ngOnDestroy(); });
  it('vincula tela pelo FAB e painel global preservando código e payload', async () => {
    await create(ClickTvTelasComponent); root().querySelector<HTMLButtonElement>('app-mobile-fab-action button')!.click(); await settle(); expect(document.querySelectorAll('.mobile-side-panel').length).toBe(1); expect(editor().form.invalid).toBeTrue(); editor().form.patchValue({ codigo: '123456', nome: 'TV Loja', orientacao: 'VERTICAL' }); await settle(); document.querySelector<HTMLButtonElement>('.mobile-side-panel__footer button:last-child')!.click(); await settle(); expect(api.vincularTela).toHaveBeenCalledWith(jasmine.objectContaining({ codigo: '123456', nome: 'TV Loja', orientacao: 'VERTICAL' }));
    root().querySelector<HTMLButtonElement>('.clicktv-list-item__head button')!.click(); await settle(); action('Editar').click(); await settle(); expect(editor().data.tela.id).toBe(2); expect(editor().data.vincular).toBeFalse();
  });
  it('cria playlist no painel global sem confundir criação com edição', async () => {
    await create(ClickTvPlaylistsComponent); root().querySelector<HTMLButtonElement>('app-mobile-fab-action button')!.click(); await settle(); expect(document.querySelector('.mobile-side-panel__header')!.textContent).toContain('Nova playlist'); editor().form.patchValue({ nome: 'Nova sequência', orientacao: 'VERTICAL' }); await settle(); document.querySelector<HTMLButtonElement>('.mobile-side-panel__footer button:last-child')!.click(); await settle(); expect(api.criarPlaylist).toHaveBeenCalledWith({ nome: 'Nova sequência', descricao: '', orientacao: 'VERTICAL', ativa: true }); expect(navigate).toHaveBeenCalledWith(['/page/clicktv/playlists', 1]);
    root().querySelector<HTMLButtonElement>('.clicktv-list-item__head button')!.click(); await settle(); action('Editar dados').click(); await settle(); expect(editor().form.controls.nome.value).toBe('Vitrine');
  });
  it('mantém filtros e paginação no backend, com ações e FAB autorizados', async () => {
    await create(ClickTvPlaylistsComponent); const bar = fixture.debugElement.query(By.directive(ListFilterBarComponent)).componentInstance as ListFilterBarComponent; const count = api.listarPlaylists.calls.count(); bar.openMobileFilters(); await settle(); bar.onFieldChange('orientacao', 'VERTICAL'); expect(api.listarPlaylists.calls.count()).toBe(count); bar.applyMobileFilters(); await settle(); expect(api.listarPlaylists).toHaveBeenCalledWith(jasmine.objectContaining({ orientacao: 'VERTICAL', page: 0 }));
    fixture.debugElement.query(By.directive(DataTableComponent)).componentInstance.pageChange.emit({ pageIndex: 1, pageSize: 20, length: 31 }); expect(api.listarPlaylists).toHaveBeenCalledWith(jasmine.objectContaining({ page: 1, size: 20 }));

  });
  it('não oferece ações de gestão nem criação sem permissão', async () => {
    auth.temPermissao.and.callFake(p => p === 'CLICKTV_VER'); await create(ClickTvPlaylistsComponent); expect(root().querySelector('app-mobile-fab-action')).toBeNull(); root().querySelector<HTMLButtonElement>('.clicktv-list-item__head button')!.click(); await settle(); expect(action('Editar dados')).toBeUndefined(); expect(action('Duplicar')).toBeUndefined(); expect(action('Editar conteúdo')).toBeDefined();
  });
  it('envia mídia no painel sem mudar arquivo, duração e progresso', async () => {
    const events = new Subject<any>(); api.uploadMidia.and.returnValue(events); await create(ClickTvMidiasComponent); root().querySelector<HTMLButtonElement>('app-mobile-fab-action button')!.click(); await settle(); const file = new File(['image'], 'campanha.webp', { type: 'image/webp' }); editor().selecionar({ target: { files: [file] } }); editor().form.patchValue({ duracaoImagem: 12 }); editor().confirmar(); await settle(); expect(api.uploadMidia).toHaveBeenCalledWith(file, 'campanha', 12); expect(root().querySelector<HTMLButtonElement>('app-mobile-fab-action button')!.disabled).toBeTrue(); events.next({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 }); await settle(); expect(root().textContent).toContain('50%'); events.next({ type: HttpEventType.Response, body: midia }); events.complete(); await settle(); expect(fixture.componentInstance.uploadEmAndamento).toBeFalse(); expect(root().querySelectorAll('mat-paginator').length).toBe(0);
  });
  it('prévia e renomeação de mídia usam o painel mantendo dados existentes', async () => {
    await create(ClickTvMidiasComponent); fixture.componentInstance.visualizar(midia); await settle(); expect(editor().data.midia.id).toBe(10); expect(document.querySelector('.mobile-side-panel')).not.toBeNull(); dialog().closeAll(); await settle(); fixture.componentInstance.renomear(midia); await settle(); editor().form.controls.nome.setValue('Campanha nova'); editor().confirmar(); await settle(); expect(api.renomearMidia).toHaveBeenCalledWith(10, 'Campanha nova');
  });
  it('editor prioriza sequência e abre biblioteca no painel mantendo adição, duração e ordem', async () => {
    await create(ClickTvPlaylistEditorComponent); expect(root().querySelector('.library')).toBeNull(); root().querySelector<HTMLButtonElement>('app-mobile-fab-action button')!.click(); await settle(); expect(document.querySelector('.mobile-side-panel__header')!.textContent).toContain('Biblioteca de mídias'); document.querySelector<HTMLButtonElement>('.mobile-side-panel .library-item')!.click(); await settle(); expect(api.adicionarItem).toHaveBeenCalledWith(1, 10, 10); dialog().closeAll(); await settle();
    const input = root().querySelector<HTMLInputElement>('.duration input')!; input.value = '15'; input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('change')); await settle(); expect(api.editarItem).toHaveBeenCalledWith(1, 100, 15, true);
    root().querySelector<HTMLButtonElement>('.sequence-menu')!.click(); await settle(); expect(action('Mover para cima').disabled).toBeTrue(); action('Mover para baixo').click(); await settle(); expect(api.reordenarItens).toHaveBeenCalledWith(1, [101, 100]);
    root().querySelector<HTMLButtonElement>('.sequence-menu')!.click(); await settle(); action('Remover mídia').click(); await settle(); expect(api.removerItem).not.toHaveBeenCalled(); document.querySelector<HTMLButtonElement>('.confirmation-submit')!.click(); await settle(); expect(api.removerItem).toHaveBeenCalledWith(1, 100);
  });

  for (const width of [360, 390, 430]) for (const kind of ['upload', 'playlist', 'tela']) it(`painel ${kind} usa toda a área útil em ${width}px`, async () => {
    await create(kind === 'upload' ? ClickTvMidiasComponent : kind === 'playlist' ? ClickTvPlaylistsComponent : ClickTvTelasComponent);
    root().querySelector<HTMLButtonElement>('app-mobile-fab-action button')!.click(); await settle();
    const pane = document.querySelector<HTMLElement>('.mobile-side-panel')!.cloneNode(true) as HTMLElement;
    pane.style.cssText = 'position:fixed;top:0;right:0;width:100vw;height:100dvh;max-width:100vw;max-height:100dvh'; const frame = frameCopy(pane, width);
    try { const doc = frame.contentDocument!; const style = doc.createElement('style'); style.textContent = '.mobile-side-panel .mat-mdc-dialog-inner-container { animation:none!important;transform:none!important; }'; doc.head.appendChild(style);
      expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); const body = doc.querySelector<HTMLElement>('.mobile-side-panel__body')!; expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth); expect(frame.contentWindow!.getComputedStyle(body).overflowY).toBe('auto'); expect(doc.querySelector('.mobile-side-panel__footer')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(900); expect(doc.querySelector('.mobile-side-panel__header button')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    } finally { frame.remove(); }
  });
  for (const width of [360, 390, 430, 1024, 1440]) for (const component of [ClickTvTelasComponent, ClickTvPlaylistsComponent, ClickTvMidiasComponent, ClickTvPlaylistEditorComponent]) it(`${component.name} mantém área útil e desktop em ${width}px`, async () => {
    viewport.next({ matches: width <= 760, breakpoints: {} }); await create(component); const frame = frameCopy(root(), width);
    try { const doc = frame.contentDocument!; if (width <= 760) { expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); expect(doc.querySelector('table')).toBeNull(); expect(doc.querySelector('app-mobile-fab-action button')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(804); if (component === ClickTvPlaylistEditorComponent) expect(doc.querySelector('.library')).toBeNull(); }
      else { expect(doc.querySelector('app-mobile-fab-action')).toBeNull(); if (component === ClickTvPlaylistEditorComponent) expect(doc.querySelector('.library')).not.toBeNull(); else if (component === ClickTvMidiasComponent) expect(doc.querySelector('.clicktv-grid')).not.toBeNull(); else expect(doc.querySelector('table')).not.toBeNull(); }
    } finally { frame.remove(); }
  });
});
