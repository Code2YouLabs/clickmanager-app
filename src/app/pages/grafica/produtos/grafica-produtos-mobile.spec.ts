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
import { STORAGE_IMAGE_PLACEHOLDER } from '../../storage/utils/storage-media-url.util';
import { BibliotecaDialogComponent } from '../biblioteca/biblioteca-dialog.component';
import { BibliotecaService, BibliotecaItem } from '../biblioteca/biblioteca.service';
import { SetupProgress } from 'src/app/components/setup-progress/setup-progress.component';
import { GraficaProduto } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';
import { GraficaProdutosComponent } from './grafica-produtos.component';

const product: GraficaProduto = {
  id: 7, catalogoProdutoId: 70, catalogoProdutoNome: 'Panfleto', catalogoProdutoDescricao: 'Impressão colorida em papel couchê.',
  material: { id: 1, nome: 'Couchê', codigo: 'COUCHE', ativo: true }, formato: { id: 2, nome: 'A4', codigo: 'A4', ativo: true },
  cor: { id: 3, nome: '4x4', codigo: '4X4', ativo: true }, ativo: true, acabamentos: [], parametros: [],
  imagens: [{ arquivoId: 9, principal: true, ativo: true, arquivo: { variantes: { THUMBNAIL: { url: '/assets/images/svgs/icon-connect.svg' } } } }],
};

describe('Produtos gráficos — listagem mobile compartilhada', () => {
  let fixture: ComponentFixture<GraficaProdutosComponent>;
  let component: GraficaProdutosComponent;
  let service: jasmine.SpyObj<GraficaProdutoService>;
  let router: jasmine.SpyObj<Router>;
  let auth: jasmine.SpyObj<AuthService>;
  let library: jasmine.SpyObj<BibliotecaService>;
  let viewport: BehaviorSubject<any>;
  const page = (content: GraficaProduto[] = [product], totalElements = 31) => ({ content, totalElements, pageNumber: 0, pageSize: 10, totalPages: 4, last: false });
  const root = () => fixture.nativeElement as HTMLElement;
  const table = () => fixture.debugElement.query(By.directive(DataTableComponent)).componentInstance as DataTableComponent<GraficaProduto>;
  const filter = () => fixture.debugElement.query(By.directive(ListFilterBarComponent)).componentInstance as ListFilterBarComponent;
  const render = () => { fixture.detectChanges(); fixture.detectChanges(); };
  const settle = async () => { render(); await fixture.whenStable(); await fixture.whenRenderingDone(); render(); };
  const menuAction = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-panel button')).find(button => button.querySelector('.mat-mdc-menu-item-text')?.textContent?.trim() === label)!;
  const openMenu = async () => { root().querySelector<HTMLButtonElement>('.produto-mobile-item__menu')!.click(); await settle(); };

  beforeEach(() => {
    library = jasmine.createSpyObj('BibliotecaService', ['ultima', 'listar', 'importar', 'acompanhar']);
    library.ultima.and.returnValue(of(null)); library.listar.and.returnValue(of([]));
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} });
    service = jasmine.createSpyObj('GraficaProdutoService', ['listar', 'listarMateriais', 'listarFormatos', 'listarCores', 'listarPrecos', 'excluir']);
    service.listar.and.returnValue(of(page())); service.listarPrecos.and.returnValue(of([])); service.excluir.and.returnValue(of(void 0));
    service.listarMateriais.and.returnValue(of([product.material!])); service.listarFormatos.and.returnValue(of([product.formato!])); service.listarCores.and.returnValue(of([product.cor!]));
    router = jasmine.createSpyObj('Router', ['navigate']); router.navigate.and.resolveTo(true);
    auth = jasmine.createSpyObj('AuthService', ['temPermissao']); auth.temPermissao.and.returnValue(true);
    TestBed.configureTestingModule({ imports: [GraficaProdutosComponent, NoopAnimationsModule], providers: [
      { provide: BreakpointObserver, useValue: { observe: () => viewport } }, { provide: GraficaProdutoService, useValue: service },
      { provide: BibliotecaService, useValue: library },
      { provide: Router, useValue: router }, { provide: AuthService, useValue: auth },
      { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
    ] });
    fixture = TestBed.createComponent(GraficaProdutosComponent); component = fixture.componentInstance;
  });
  afterEach(async () => { TestBed.inject(MatDialog).closeAll(); await fixture.whenStable(); fixture.destroy(); TestBed.inject(OverlayContainer).ngOnDestroy(); });

  it('usa cards e placeholder existentes, com Filtros no header e Biblioteca após a busca', async () => {
    service.listar.and.returnValue(of(page([product, { ...product, id: 8, imagens: [] }]))); await settle();
    expect(table().useMobileItems).toBeTrue(); expect(root().querySelector('table')).toBeNull();
    expect(root().querySelectorAll('[role="listitem"]').length).toBe(2);
    const images = root().querySelectorAll<HTMLImageElement>('.produto-mobile-item img');
    expect(images[0].getAttribute('src')).toBe('/assets/images/svgs/icon-connect.svg'); expect(images[1].getAttribute('src')).toBe(STORAGE_IMAGE_PLACEHOLDER);
    expect(root().querySelector('.produto-mobile-item')!.textContent).toContain('Panfleto');
    expect(root().querySelector('.produto-mobile-item')!.textContent).toContain('Couchê · A4 · 4x4');
    expect(root().textContent).toContain('Impressão colorida');
    const header = root().querySelector('.card-header')!;
    expect(header.textContent).toContain('Produtos gráficos'); expect(header.textContent).toContain('Filtros');
    expect(header.textContent).not.toContain('Voltar'); expect(header.textContent).not.toContain('Novo produto'); expect(header.querySelector('[aria-label="Ajuda"]')).toBeNull();
    expect(root().querySelector('.list-mobile-toolbar__actions')!.textContent).toContain('Biblioteca de produtos');
    expect(root().querySelectorAll('[aria-label="Ajuda"]').length).toBe(1); expect(root().querySelector('app-mobile-fab-action')).not.toBeNull();
  });

  it('preserva criação, ajuda e o fluxo existente de Biblioteca com recarga após importação', () => {
    render(); root().querySelector<HTMLButtonElement>('app-mobile-fab-action button')!.click();
    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/produtos/novo']);
    root().querySelector<HTMLButtonElement>('[aria-label="Ajuda"]')!.click(); expect(router.navigate).toHaveBeenCalledWith(['/page/ajuda'], { fragment: 'produtos-graficos' });
    const decision = new Subject<boolean>(); const open = spyOn(fixture.debugElement.injector.get(MatDialog), 'open').and.returnValue({ afterClosed: () => decision, beforeClosed: () => new Subject(), updateSize() { return this; }, updatePosition() { return this; } } as any);
    const loads = service.listar.calls.count(); root().querySelector<HTMLButtonElement>('.produto-list-toolbar button')!.click();
    expect(open).toHaveBeenCalledWith(BibliotecaDialogComponent, jasmine.objectContaining({ data: { mobilePanel: true }, panelClass: ['mobile-side-panel'], width: '100vw', height: '100dvh', restoreFocus: true }));
    expect(service.listar.calls.count()).toBe(loads); decision.next(true); expect(service.listar.calls.count()).toBe(loads + 1);
  });

  it('reúne as três ações existentes no MatMenu e mantém edição e confirmação destrutiva', async () => {
    render(); await openMenu();
    expect(document.querySelectorAll('.mat-mdc-menu-panel button').length).toBe(3);
    menuAction('Editar produto').click(); await settle(); expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/produtos', 7, 'editar']);
    expect(document.querySelector('.mat-mdc-menu-panel')).toBeNull();
    await openMenu(); menuAction('Excluir produto').click(); await settle();
    const confirmation = document.querySelector<HTMLElement>('app-confirm-dialog')!;
    expect(confirmation.classList.contains('confirmation--destructive')).toBeTrue(); expect(confirmation.textContent).toContain('Panfleto'); expect(service.excluir).not.toHaveBeenCalled();
    confirmation.querySelector<HTMLButtonElement>('.confirmation-submit')!.click(); await settle(); expect(service.excluir).toHaveBeenCalledOnceWith(7);
  });

  for (const action of ['Clonar produto', 'Excluir produto']) {
    it(`desistir de ${action} não executa operações`, async () => {
      render(); await openMenu(); menuAction(action).click(); await settle();
      document.querySelector<HTMLButtonElement>('.confirmation-back')!.click(); await settle();
      expect(service.excluir).not.toHaveBeenCalled(); expect(router.navigate).not.toHaveBeenCalled();
    });
  }
  it('clonar mantém confirmação comum e queryParams cloneFrom', async () => {
    render(); await openMenu(); menuAction('Clonar produto').click(); await settle();
    expect(document.querySelector('app-confirm-dialog')!.textContent).toContain('Clonar produto'); expect(router.navigate).not.toHaveBeenCalled();
    document.querySelector<HTMLButtonElement>('.confirmation-submit')!.click(); await settle();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/page/grafica/produtos/novo'], { queryParams: { cloneFrom: 7 } });
  });
  it('respeita a permissão existente de escrita sem expor FAB ou ações não autorizadas', () => {
    auth.temPermissao.and.returnValue(false); render();
    expect(auth.temPermissao).toHaveBeenCalledWith('GRAFICA_PRODUTOS_EDITAR');
    expect(root().querySelector('app-mobile-fab-action')).toBeNull(); expect(root().querySelector('.produto-mobile-item__menu')).toBeNull();
    expect(root().textContent).toContain('Biblioteca de produtos'); component.novoMobile(); component.onMobileAction({ row: product, action: 'excluir' });
    expect(service.excluir).not.toHaveBeenCalled(); expect(router.navigate).not.toHaveBeenCalled();
  });
  it('usa busca no servidor com debounce de 300ms e limpa na primeira página', fakeAsync(() => {
    render(); component.pagina = 2; service.listar.calls.reset();
    const input = root().querySelector<HTMLInputElement>('app-input-pesquisa input')!;
    input.value = 'descrição'; input.dispatchEvent(new Event('input')); tick(299); expect(service.listar).not.toHaveBeenCalled(); tick(1); render();
    expect(service.listar).toHaveBeenCalledOnceWith(jasmine.objectContaining({ page: 0, search: 'descrição', size: 10 }));
    input.value = ''; input.dispatchEvent(new Event('input')); tick(300); render();
    expect(service.listar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ page: 0, search: '' }));
  }));
  it('reutiliza o painel de filtros com rascunho, aplicação, persistência e limpeza', async () => {
    await settle(); const loads = service.listar.calls.count();
    root().querySelector<HTMLButtonElement>('.card-header .list-mobile-toolbar__filter-button')!.click(); await settle();
    expect(document.querySelector('.list-filter-mobile-panel.mobile-side-panel')).not.toBeNull();
    filter().onFieldChange('materialIds', [1]); filter().onFieldChange('formatoIds', [2]); filter().onFieldChange('corIds', [3]); render();
    expect(service.listar.calls.count()).toBe(loads);
    document.querySelector<HTMLButtonElement>('.list-filter-panel__footer button')!.click(); await settle();
    expect(service.listar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ page: 0, materialIds: [1], formatoIds: [2], corIds: [3] }));
    expect(root().querySelector('.card-header')!.textContent).toContain('Filtros (3)');
    root().querySelector<HTMLButtonElement>('.card-header .list-mobile-toolbar__filter-button')!.click(); await settle();
    expect(filter().selectedFilterValue(component.tableFilters[0])).toEqual([1]);
    document.querySelector<HTMLButtonElement>('.list-filter-panel [aria-label="Limpar filtros"]')!.click(); render();
    document.querySelector<HTMLButtonElement>('.list-filter-panel__footer button')!.click(); await settle();
    expect(service.listar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ materialIds: [], formatoIds: [], corIds: [], page: 0 }));
  });
  it('mantém paginação e ordenação no DataTable sem duplicar controles', () => {
    render(); expect(root().querySelectorAll('.data-table-mobile-pagination').length).toBe(1); expect(root().querySelector('mat-paginator')).toBeNull();
    table().pageChange.emit({ pageIndex: 2, pageSize: 20, length: 31 });
    expect(service.listar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ page: 2, size: 20, sort: 'nome,asc' }));
    table().toggleMobileSortDirection(); expect(service.listar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ page: 0, sort: 'nome,desc' }));
  });
  it('preserva loading, erro com retry, vazio e acesso restrito compartilhados', () => {
    const response = new Subject<any>(); service.listar.and.returnValue(response); render(); expect(root().textContent).toContain('Carregando registros');
    response.error({ status: 500 }); render(); expect(root().querySelector('[role="alert"]')).not.toBeNull();
    service.listar.and.returnValue(of(page([], 0))); root().querySelector<HTMLButtonElement>('[role="alert"] button')!.click(); render();
    expect(root().textContent).toContain('Nenhum produto gráfico encontrado');
    service.listar.and.returnValue(of(page())); component.carregar(); render();
    service.listar.and.returnValue(throwError(() => ({ status: 403 }))); component.carregar(); render();
    expect(root().textContent).toContain('Acesso restrito'); expect(root().querySelector('[role="listitem"]')).toBeNull();
  });

  it('aplica ordenação e filtros atomicamente, preservando busca e resetando a página', async () => {
    await settle(); component.pagina = 2; component.termo = 'panfleto';
    expect(root().querySelector('.data-table-mobile-sort')).toBeNull();
    expect(filter().activeFilterCount).toBe(0);
    const loads = service.listar.calls.count();
    root().querySelector<HTMLButtonElement>('.list-mobile-toolbar__filter-button')!.click(); await settle();
    expect(filter().draftSort).toEqual({ active: 'nome', direction: 'asc' });
    const controls = document.querySelectorAll<HTMLElement>('.list-filter-panel mat-select');
    controls[controls.length - 1].click(); await settle();
    const option = Array.from(document.querySelectorAll<HTMLElement>('mat-option')).find(o => o.textContent!.includes('decrescente'))!;
    option.click(); await settle(); filter().onFieldChange('materialIds', [1]);
    expect(service.listar.calls.count()).toBe(loads);
    document.querySelector<HTMLButtonElement>('.list-filter-panel__footer button')!.click(); await settle();
    expect(service.listar.calls.count()).toBe(loads + 1);
    expect(service.listar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ sort: 'nome,desc', materialIds: [1], search: 'panfleto', page: 0 }));
    expect(filter().activeFilterCount).toBe(1);
    root().querySelector<HTMLButtonElement>('.list-mobile-toolbar__filter-button')!.click(); await settle();
    expect(filter().draftSort).toEqual({ active: 'nome', direction: 'desc' });
    filter().draftSort = { active: 'nome', direction: 'asc' }; filter().closeMobileFilters(); await settle();
    expect(component.sort.direction).toBe('desc'); expect(service.listar.calls.count()).toBe(loads + 1);
    root().querySelector<HTMLButtonElement>('.list-mobile-toolbar__filter-button')!.click(); await settle();
    filter().clearMobileFilters(); filter().applyMobileFilters(); await settle();
    expect(component.sort.direction).toBe('desc'); expect(filter().activeFilterCount).toBe(0);
    expect(service.listar.calls.count()).toBe(loads + 2);
    root().querySelector<HTMLButtonElement>('.list-mobile-toolbar__filter-button')!.click(); await settle();
    filter().applyMobileFilters(); await settle(); expect(service.listar.calls.count()).toBe(loads + 2);
  });

  for (const closeViaBackdrop of [false, true]) {
  it(`Biblioteca real mantém pesquisa, seleção, importação e foco ao fechar por ${closeViaBackdrop ? 'backdrop' : 'botão'}`, async () => {
    const item: BibliotecaItem = { id: 1, tipo: 'PRODUTO', nome: 'Vinil', descricao: 'Impressão', categoria: 'Adesivos', tiposPreco: ['FIXO'], acabamentos: [], jaExiste: true };
    library.listar.and.returnValue(of([item, { ...item, id: 2, nome: 'Panfleto' }]));
    const job: SetupProgress = { id: 12, status: 'CONCLUIDO', fase: 'CONCLUIDO', total: 1, processados: 1, criados: 0, duplicados: 1, erros: 0, tempoEstimadoRestanteSegundos: null,
      itens: [{ id: 1, tipo: 'PRODUTO', templateId: 1, status: 'DUPLICADO', nome: 'Vinil', mensagem: 'Já cadastrado', criadoId: null }] };
    library.importar.and.returnValue(of(job)); library.acompanhar.and.returnValue(of(job));
    await settle(); document.body.appendChild(root());
    try {
      const trigger = root().querySelector<HTMLButtonElement>('.produto-list-toolbar button')!;
      expect(trigger.hasAttribute('mat-button')).toBeTrue(); trigger.focus(); trigger.click(); await settle();
      const panel = document.querySelector<HTMLElement>('.mobile-side-panel')!;
      expect(panel).not.toBeNull(); expect(document.querySelectorAll('[role="dialog"]').length).toBe(1);
      expect(panel.querySelector('.mobile-side-panel__header')!.textContent).toContain('Biblioteca de produtos');
      const selector = TestBed.inject(MatDialog).openDialogs[0].componentInstance as BibliotecaDialogComponent;
      const input = panel.querySelector<HTMLInputElement>('.biblioteca-toolbar input')!;
      input.value = 'vinil'; input.dispatchEvent(new Event('input')); await new Promise(resolve => setTimeout(resolve, 320)); await settle();
      const tree = panel.querySelector('.biblioteca-mobile-list')!; expect(tree.textContent).toContain('Vinil'); expect(tree.textContent).not.toContain('Panfleto');
      const add = panel.querySelector<HTMLButtonElement>('.mobile-side-panel__footer button')!; expect(add.disabled).toBeTrue();
      tree.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(); await settle(); expect(add.disabled).toBeFalse();
      const loads = service.listar.calls.count(); add.click(); await settle();
      expect(library.importar).toHaveBeenCalledOnceWith([item], false); expect(selector.alterado).toBeTrue();
      expect(panel.textContent).toContain('Vinil'); expect(panel.textContent).toContain('1 já existiam');
      expect(service.listar.calls.count()).toBe(loads);
      if (closeViaBackdrop) document.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click();
      else panel.querySelector<HTMLButtonElement>('[aria-label="Fechar biblioteca"]')!.click();
      await settle();
      expect(document.querySelector('.mobile-side-panel')).toBeNull(); expect(service.listar.calls.count()).toBe(loads + 1);
      expect(document.activeElement).toBe(trigger);
    } finally { root().remove(); }
  });

  }

  it('fechar Biblioteca sem importar preserva a listagem e desktop continua usando o diálogo original', async () => {
    await settle(); const loads = service.listar.calls.count(); component.abrirBiblioteca(); await settle();
    document.querySelector<HTMLButtonElement>('[aria-label="Fechar biblioteca"]')!.click(); await settle();
    expect(service.listar.calls.count()).toBe(loads);
    viewport.next({ matches: false, breakpoints: {} }); await settle();
    const open = spyOn(fixture.debugElement.injector.get(MatDialog), 'open').and.returnValue({ afterClosed: () => of(false) } as any);
    component.abrirBiblioteca(); expect(open).toHaveBeenCalledWith(BibliotecaDialogComponent, { width: '1120px', maxWidth: '96vw', maxHeight: '94vh' });
  });

  for (const width of [360, 390, 430]) {
    it(`Biblioteca mantém rolagem interna, rodapé acessível e ausência de overflow em ${width}px`, async () => {
      library.listar.and.returnValue(of(Array.from({ length: 20 }, (_, id) => ({
        id, tipo: 'PRODUTO' as const, nome: 'Produto com nome longo para conferir a área útil', descricao: 'Descrição',
        categoria: 'Produtos > Adesivos', tiposPreco: [], acabamentos: [], jaExiste: false,
      }))));
      await settle(); component.abrirBiblioteca(); await settle();
      const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:800px;border:0`; document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!;
        Array.from(document.styleSheets).forEach(sheet => {
          const style = doc.createElement('style'); style.textContent = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n'); doc.head.appendChild(style);
        });
        // Measure the final layout; slide animation is exercised by the shared opener.
        const finalFrame = doc.createElement('style'); finalFrame.textContent = '.mobile-side-panel .mat-mdc-dialog-inner-container { animation: none !important; transform: none !important; }'; doc.head.appendChild(finalFrame);
        doc.body.style.margin = '0'; const pane = document.querySelector<HTMLElement>('.mobile-side-panel')!.cloneNode(true) as HTMLElement;
        // The shared opener resizes these dimensions on visualViewport changes.
        pane.style.cssText = 'position:fixed;top:0;right:0;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh'; doc.body.appendChild(pane);
        const body = pane.querySelector<HTMLElement>('.mobile-side-panel__body')!;
        const footer = pane.querySelector<HTMLElement>('.mobile-side-panel__footer')!;
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width);
        expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
        expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
        expect(pane.querySelector('app-hierarchy-tree')).toBeNull(); expect(pane.querySelector('mat-button-toggle-group')).toBeNull();
        expect(pane.querySelector('.mobile-side-panel__header')!.getBoundingClientRect().height).toBeLessThanOrEqual(80);
        const rows = pane.querySelectorAll<HTMLElement>('.biblioteca-mobile-item'); expect(rows.length).toBe(20);
        expect(rows[0].getBoundingClientRect().height).toBeLessThanOrEqual(100);
        expect(rows[0].querySelector('mat-checkbox')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
        body.scrollTop = body.scrollHeight;
        expect(rows[rows.length - 1].getBoundingClientRect().bottom).toBeLessThanOrEqual(body.getBoundingClientRect().bottom);
        expect(footer.getBoundingClientRect().bottom).toBeLessThanOrEqual(800);
        expect(footer.getBoundingClientRect().top).toBeGreaterThan(0);
        expect(footer.querySelector('button')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
        pane.querySelectorAll('mat-form-field, mat-button-toggle-group').forEach(control => {
          expect(control.getBoundingClientRect().right).toBeLessThanOrEqual(width);
          expect(control.getBoundingClientRect().left).toBeGreaterThanOrEqual(0);
        });
      } finally { frame.remove(); }
    });
  }

  for (const width of [360, 390, 430]) {
    it(`menu com alvos de toque permanece dentro do card de ${width}px e fecha ao tocar fora`, async () => {
      render(); root().style.cssText = `display:block;width:${width}px`; document.body.appendChild(root());
      try {
        await openMenu(); const menu = document.querySelector<HTMLElement>('.mat-mdc-menu-panel')!; const bounds = menu.getBoundingClientRect(); const card = root().getBoundingClientRect();
        expect(bounds.left).toBeGreaterThanOrEqual(card.left); expect(bounds.right).toBeLessThanOrEqual(card.right);
        menu.querySelectorAll('button').forEach(button => expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44));
        (document.querySelector('.cdk-overlay-backdrop') as HTMLElement).click(); await settle(); expect(document.querySelector('.mat-mdc-menu-panel')).toBeNull();
      } finally { root().remove(); }
    });
  }
  for (const width of [360, 390, 430, 1024, 1440]) {
    it(`preserva estrutura e área útil em viewport Chromium de ${width}px`, () => {
      viewport.next({ matches: width <= 760, breakpoints: {} });
      service.listar.and.returnValue(of(page([{ ...product, catalogoProdutoNome: 'Produto com nome longo para conferir a quebra de texto no card', catalogoProdutoDescricao: 'Descrição longa sem perder a identificação do produto. '.repeat(8) }]))); render();
      const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:800px;border:0`; document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!; document.querySelectorAll('style').forEach(style => doc.head.appendChild(style.cloneNode(true)));
        doc.body.style.cssText = 'margin:0;--mobile-bottom-nav-height:80px'; doc.body.appendChild(root().cloneNode(true));
        if (width <= 760) {
          expect(doc.querySelector('table')).toBeNull(); expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width);
          const item = doc.querySelector<HTMLElement>('.produto-mobile-item')!; expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(width);
          const image = item.querySelector('img')!.getBoundingClientRect(); const name = item.querySelector('strong')!.getBoundingClientRect();
          expect(image.right).toBeLessThanOrEqual(name.left); expect(item.querySelectorAll('button').length).toBe(1);
          const fab = doc.querySelector<HTMLElement>('app-mobile-fab-action button')!.getBoundingClientRect(); expect(fab.width).toBe(56); expect(fab.bottom).toBeLessThanOrEqual(720 - 16);
          expect(doc.querySelector<HTMLElement>('.page-card__fab-clearance')!.getBoundingClientRect().height).toBeGreaterThan(fab.height);
          const search = doc.querySelector('app-input-pesquisa')!.getBoundingClientRect(); const library = doc.querySelector('.produto-list-toolbar')!.getBoundingClientRect();
          expect(library.top).toBeGreaterThanOrEqual(search.bottom); expect(library.bottom).toBeLessThanOrEqual(item.getBoundingClientRect().top);
        } else {
          expect(doc.querySelector('.produto-mobile-item')).toBeNull(); expect(doc.querySelector('app-mobile-fab-action')).toBeNull();
          expect(doc.querySelector('app-card-header')!.textContent).toContain('Novo produto'); expect(doc.querySelector('app-card-header [aria-label="Ajuda"]')).not.toBeNull();
          expect(Array.from(doc.querySelectorAll('thead th')).map(cell => cell.textContent?.trim())).toEqual(['Imagem', 'Produto', 'Categoria', 'Descrição', 'Preço', 'Publicação', 'Ações']);
          expect(doc.querySelectorAll('.acoes-cell button').length).toBe(3); expect(doc.querySelector('mat-paginator')).not.toBeNull(); expect(doc.querySelector('.produto-thumb')!.getBoundingClientRect().width).toBe(42);
        }
      } finally { frame.remove(); }
    });
  }
});
