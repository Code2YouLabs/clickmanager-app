import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { ListFilterBarComponent } from 'src/app/components/list-filter-bar/list-filter-bar.component';
import { AuthService } from 'src/app/services/auth.service';
import { CatalogoCategoria } from '../../catalogo/shared/models/catalogo.models';
import { CatalogoCategoriaService } from '../../catalogo/shared/services/catalogo.service';
import { GraficaCategoriasComponent } from './grafica-categorias.component';

const category: CatalogoCategoria = { id: 1, codigo: 'ADESIVOS', nome: 'Adesivos', slug: 'adesivos', categoriaPaiId: 2, categoriaPaiNome: 'Comunicação visual', descricaoCurta: 'Materiais adesivos para impressão', ativo: true };
describe('Categorias gráficas — fundação mobile', () => {
  let fixture: ComponentFixture<GraficaCategoriasComponent>;
  let api: jasmine.SpyObj<CatalogoCategoriaService>;
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let viewport: BehaviorSubject<any>;
  const root = () => fixture.nativeElement as HTMLElement;
  const component = () => fixture.componentInstance;
  const render = () => { fixture.detectChanges(); fixture.detectChanges(); };
  const settle = async () => { render(); await fixture.whenStable(); render(); };
  const table = () => fixture.debugElement.query(By.directive(DataTableComponent)).componentInstance as DataTableComponent<CatalogoCategoria>;
  const filter = () => fixture.debugElement.query(By.directive(ListFilterBarComponent)).componentInstance as ListFilterBarComponent;
  const page = (content = [category]) => ({ content, totalElements: 31, pageNumber: 0, pageSize: 10, totalPages: 4, last: false });
  const menuAction = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-panel button')).find(b => b.querySelector('.mat-mdc-menu-item-text')?.textContent?.trim() === label)!;
  const openMenu = async () => { root().querySelector<HTMLButtonElement>('.categoria-mobile-item__menu')!.click(); await settle(); };
  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} });
    api = jasmine.createSpyObj('CatalogoCategoriaService', ['listar', 'listarTodas', 'excluir']);
    api.listar.and.returnValue(of(page())); api.listarTodas.and.returnValue(of([category])); api.excluir.and.returnValue(of(void 0));
    auth = jasmine.createSpyObj('AuthService', ['temAlgumaPermissao', 'temPermissao']); auth.temAlgumaPermissao.and.returnValue(true); auth.temPermissao.and.returnValue(true);
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({ imports: [GraficaCategoriasComponent, NoopAnimationsModule], providers: [
      { provide: BreakpointObserver, useValue: { observe: () => viewport } }, { provide: CatalogoCategoriaService, useValue: api },
      { provide: Router, useValue: router }, { provide: AuthService, useValue: auth },
      { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error', 'warning']) },
    ] });
    fixture = TestBed.createComponent(GraficaCategoriasComponent);
  });
  afterEach(async () => { TestBed.inject(MatDialog).closeAll(); await fixture.whenStable(); fixture.destroy(); TestBed.inject(OverlayContainer).ngOnDestroy(); });
  it('reutiliza cards, filtro de ordenação e FAB sem ação grande ou botão Voltar no topo', async () => {
    await settle(); expect(table().useMobileItems).toBeTrue(); expect(root().querySelector('table')).toBeNull();
    expect(root().querySelector('.card-header')!.textContent).toContain('Filtros'); expect(root().querySelector('.card-header')!.textContent).not.toContain('Nova categoria');
    expect(root().querySelector('.card-header')!.textContent).not.toContain('Voltar'); expect(root().querySelector('.data-table-mobile-sort')).toBeNull();
    const card = root().querySelector('.categoria-mobile-item')!; expect(card.textContent).toContain('Adesivos'); expect(card.textContent).toContain('Comunicação visual'); expect(card.textContent).toContain('Materiais adesivos');
    expect(card.querySelectorAll('button').length).toBe(1); root().querySelector<HTMLButtonElement>('app-mobile-fab-action button')!.click();
    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/categorias/novo']);
  });
  it('mantém busca no servidor com debounce, ordenação aplicada uma vez e paginação real', fakeAsync(() => {
    render(); const input = root().querySelector<HTMLInputElement>('app-input-pesquisa input')!; api.listar.calls.reset();
    input.value = 'adesivo'; input.dispatchEvent(new Event('input')); tick(299); expect(api.listar).not.toHaveBeenCalled(); tick(1); render();
    expect(api.listar).toHaveBeenCalledOnceWith(jasmine.objectContaining({ texto: 'adesivo', page: 0 }));
    table().pageChange.emit({ pageIndex: 2, pageSize: 20, length: 31 }); expect(api.listar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ page: 2, size: 20 }));
    filter().openMobileFilters(); tick(); render(); filter().draftSort = { active: 'nome', direction: 'desc' }; const loads = api.listar.calls.count();
    filter().applyMobileFilters(); tick(); render(); expect(api.listar.calls.count()).toBe(loads + 1);
    expect(api.listar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ texto: 'adesivo', page: 0, sort: 'nome,desc' }));
    expect(filter().activeFilterCount).toBe(0);
  }));
  it('preserva Lista/Árvore e ações de editar, clonar e excluir com confirmação', async () => {
    await settle(); await openMenu(); menuAction('Editar').click(); await settle(); expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/categorias', 1, 'editar']);
    await openMenu(); menuAction('Clonar').click(); await settle(); expect(document.querySelector('app-confirm-dialog')!.textContent).toContain('Adesivos');
    document.querySelector<HTMLButtonElement>('.confirmation-submit')!.click(); await settle(); expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/categorias/novo'], { queryParams: { cloneFrom: 1 } });
    await openMenu(); menuAction('Excluir').click(); await settle(); expect(api.excluir).not.toHaveBeenCalled(); expect(document.querySelector('.confirmation--destructive')).not.toBeNull();
    document.querySelector<HTMLButtonElement>('.confirmation-back')!.click(); await settle(); expect(api.excluir).not.toHaveBeenCalled();
    await openMenu(); menuAction('Excluir').click(); await settle(); document.querySelector<HTMLButtonElement>('.confirmation-submit')!.click(); await settle(); expect(api.excluir).toHaveBeenCalledOnceWith(1);
    component().alterarVisualizacao('arvore'); await settle(); expect(root().querySelector('app-hierarchy-tree')).not.toBeNull(); expect(api.listarTodas).toHaveBeenCalled(); expect(root().querySelector('.card-header .list-mobile-toolbar__filter-button')).toBeNull();
    component().alterarVisualizacao('lista'); await settle(); expect(root().querySelector('.categoria-mobile-item')).not.toBeNull();
  });
  it('oculta ações sem permissão e mantém loading, erro/retry, vazio e acesso restrito', () => {
    auth.temAlgumaPermissao.and.returnValue(false); auth.temPermissao.and.returnValue(false);
    const pending = new Subject<any>(); api.listar.and.returnValue(pending); render(); expect(root().textContent).toContain('Carregando registros');
    pending.error({ status: 500 }); render(); expect(root().querySelector('[role="alert"]')).not.toBeNull();
    api.listar.and.returnValue(of(page([]))); root().querySelector<HTMLButtonElement>('[role="alert"] button')!.click(); render(); expect(root().textContent).toContain('Nenhuma categoria encontrada');
    api.listar.and.returnValue(of(page())); component().carregar(); render(); expect(root().querySelector('.categoria-mobile-item__menu')).toBeNull(); expect(root().querySelector('app-mobile-fab-action')).toBeNull();
    component().novoMobile(); expect(router.navigate).not.toHaveBeenCalled();
    api.listar.and.returnValue(throwError(() => ({ status: 403 }))); component().carregar(); render(); expect(root().textContent).toContain('Acesso restrito');
  });
  for (const width of [360, 390, 430, 1024, 1440]) {
    it(`preserva estrutura e largura útil em ${width}px`, async () => {
      viewport.next({ matches: width <= 760, breakpoints: {} }); await settle();
      const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:800px;border:0`; document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!; Array.from(document.styleSheets).forEach(sheet => { const style = doc.createElement('style'); style.textContent = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n'); doc.head.appendChild(style); });
        doc.body.style.cssText = 'margin:0;--mobile-bottom-nav-height:80px'; doc.body.appendChild(root().cloneNode(true));
        if (width <= 760) {
          expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); expect(doc.querySelector('table')).toBeNull();
          const card = doc.querySelector('.categoria-mobile-item')!; expect(card.getBoundingClientRect().right).toBeLessThanOrEqual(width); expect(card.querySelector('button')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
          const fab = doc.querySelector('app-mobile-fab-action button')!.getBoundingClientRect(); expect(fab.width).toBe(56); expect(fab.bottom).toBeLessThanOrEqual(704);
          expect(doc.querySelector('.page-card__fab-clearance')!.getBoundingClientRect().height).toBeGreaterThan(fab.height);
        } else {
          expect(doc.querySelector('.categoria-mobile-item')).toBeNull(); expect(doc.querySelector('app-mobile-fab-action')).toBeNull();
          expect(Array.from(doc.querySelectorAll('thead th')).map(th => th.textContent!.trim())).toEqual(['Nome', 'Categoria pai', 'Descrição', 'Ações']);
          expect(doc.querySelector('.card-header')!.textContent).toContain('Nova categoria'); expect(doc.querySelectorAll('.acoes-cell button').length).toBe(3);
          expect(doc.querySelector('mat-paginator')).not.toBeNull();
        }
      } finally { frame.remove(); }
    });
  }
});
