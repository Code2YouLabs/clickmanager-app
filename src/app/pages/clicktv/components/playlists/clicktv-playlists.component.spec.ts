import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, Subject, throwError } from 'rxjs';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { AuthService } from 'src/app/services/auth.service';
import { ClickTvPage, ClickTvPlaylistResumo } from '../../models/clicktv.models';
import { ClickTvService } from '../../services/clicktv.service';
import { ClickTvNameDialogComponent, ClickTvPlaylistDialogComponent } from '../dialogs/clicktv-dialogs.component';
import { ClickTvPlaylistsComponent } from './clicktv-playlists.component';

describe('ClickTvPlaylistsComponent', () => {
  let service: jasmine.SpyObj<ClickTvService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let router: jasmine.SpyObj<Router>;
  let auth: jasmine.SpyObj<AuthService>;

  const ativa: ClickTvPlaylistResumo = {
    id: 1,
    nome: 'Vitrine principal',
    descricao: 'Conteúdo da recepção',
    orientacao: 'HORIZONTAL',
    ativa: true,
    versao: 4,
    quantidadeItens: 5,
    quantidadeItensAtivos: 3,
    criadoEm: '',
    atualizadoEm: '',
  };
  const inativa: ClickTvPlaylistResumo = {
    ...ativa,
    id: 2,
    nome: 'Campanha antiga',
    ativa: false,
    versao: 1,
    quantidadeItens: 2,
    quantidadeItensAtivos: 0,
  };

  function pagina(content: ClickTvPlaylistResumo[] = [ativa, inativa], page = 0, size = 10): ClickTvPage<ClickTvPlaylistResumo> {
    return { content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: page, size };
  }

  function setup(options: {
    listar$?: Observable<ClickTvPage<ClickTvPlaylistResumo>>;
    listarFake?: (filtro: { nome?: string; orientacao?: string; ativa?: boolean; page?: number; size?: number }) => Observable<ClickTvPage<ClickTvPlaylistResumo>>;
    podeGerenciar?: boolean;
    dialogResult?: unknown;
  } = {}): ComponentFixture<ClickTvPlaylistsComponent> {
    TestBed.resetTestingModule();
    service = jasmine.createSpyObj<ClickTvService>('ClickTvService', [
      'listarPlaylists',
      'criarPlaylist',
      'editarPlaylist',
      'duplicarPlaylist',
      'desativarPlaylist',
    ]);
    service.listarPlaylists.and.callFake(options.listarFake || (() => options.listar$ || of(pagina())));
    service.criarPlaylist.and.returnValue(of({ ...ativa, itens: [] } as any));
    service.editarPlaylist.and.returnValue(of({ ...ativa, itens: [] } as any));
    service.duplicarPlaylist.and.returnValue(of({ ...ativa, id: 3, itens: [] } as any));
    service.desativarPlaylist.and.returnValue(of(void 0));

    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => of(options.dialogResult ?? null) } as any);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['temPermissao']);
    auth.temPermissao.and.callFake((permissao: string) => permissao === 'CLICKTV_VER' || (permissao === 'CLICKTV_PLAYLISTS_GERENCIAR' && options.podeGerenciar !== false));

    TestBed.configureTestingModule({
      imports: [ClickTvPlaylistsComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ClickTvService, useValue: service },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: auth },
      ],
    });
    const fixture = TestBed.createComponent(ClickTvPlaylistsComponent);
    (fixture.componentInstance as unknown as { dialog: MatDialog }).dialog = dialog;
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('usa PageCard e DataTable como shell unico da listagem', () => {
    const fixture = setup();

    expect(fixture.debugElement.queryAll(By.directive(PageCardComponent)).length).toBe(1);
    expect(fixture.debugElement.queryAll(By.directive(DataTableComponent)).length).toBe(1);
    expect(fixture.nativeElement.querySelector('.clicktv-toolbar')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Playlists do ClickTV');
    expect(fixture.nativeElement.textContent).toContain('Nova playlist');
  });

  it('carrega playlists com filtros iniciais, colunas e paginacao servidor', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent;

    expect(service.listarPlaylists).toHaveBeenCalledOnceWith({ nome: undefined, orientacao: undefined, ativa: undefined, page: 0, size: 10 });
    expect(text).toContain('Vitrine principal');
    expect(text).toContain('Conteúdo da recepção');
    expect(text).toContain('HORIZONTAL');
    expect(text).toContain('3 / 5');
    expect(text).toContain('v4');
    expect(text).toContain('ATIVA');

    fixture.componentInstance.pagina({ pageIndex: 2, pageSize: 20, length: 100 } as any);
    expect(service.listarPlaylists.calls.mostRecent().args[0]).toEqual({ nome: undefined, orientacao: undefined, ativa: undefined, page: 2, size: 20 });
    expect(fixture.nativeElement.querySelector('mat-paginator').getAttribute('ng-reflect-page-size-options')).toContain('10,20,50');
  });

  it('aplica busca, orientacao, ativa true, ativa false e limpar filtros resetando page', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    component.page = 3;

    component.pesquisar('  recepcao  ');
    expect(component.page).toBe(0);
    expect(service.listarPlaylists.calls.mostRecent().args[0]).toEqual({ nome: 'recepcao', orientacao: undefined, ativa: undefined, page: 0, size: 10 });

    component.page = 2;
    component.alterarFiltros({ orientacao: 'VERTICAL', ativa: true });
    expect(service.listarPlaylists.calls.mostRecent().args[0]).toEqual({ nome: 'recepcao', orientacao: 'VERTICAL', ativa: true, page: 0, size: 10 });

    component.alterarFiltros({ ativa: false });
    expect(component.ativa).toBeFalse();
    expect(service.listarPlaylists.calls.mostRecent().args[0]).toEqual({ nome: 'recepcao', orientacao: undefined, ativa: false, page: 0, size: 10 });

    component.limparFiltros();
    expect(component.nome).toBe('');
    expect(component.orientacao).toBe('');
    expect(component.ativa).toBe('');
    expect(service.listarPlaylists.calls.mostRecent().args[0]).toEqual({ nome: undefined, orientacao: undefined, ativa: undefined, page: 0, size: 10 });
  });

  it('usa debounce unico do DataTable/ListFilterBar na busca', fakeAsync(() => {
    const fixture = setup();
    const input = fixture.nativeElement.querySelector('input[type=search]');

    input.value = 'promo';
    input.dispatchEvent(new Event('input'));
    tick(299);
    expect(service.listarPlaylists).toHaveBeenCalledTimes(1);
    tick(1);

    expect(service.listarPlaylists).toHaveBeenCalledTimes(2);
    expect(service.listarPlaylists.calls.mostRecent().args[0].nome).toBe('promo');
  }));

  it('mostra loading, erro/retry, forbidden, vazio e vazio filtrado sem transformar erro em vazio', () => {
    const pendente$ = new Subject<ClickTvPage<ClickTvPlaylistResumo>>();
    const fixtureLoading = setup({ listar$: pendente$.asObservable() });
    expect(fixtureLoading.nativeElement.textContent).toContain('Carregando registros');
    expect(fixtureLoading.nativeElement.textContent).not.toContain('Nenhuma playlist encontrada');

    const fixtureErro = setup({ listar$: throwError(() => ({ status: 500, error: { message: 'Falha playlists' } } as HttpErrorResponse)) });
    expect(fixtureErro.nativeElement.textContent).toContain('Falha playlists');
    service.listarPlaylists.and.returnValue(of(pagina()));
    fixtureErro.componentInstance.carregar();
    fixtureErro.detectChanges();
    expect(fixtureErro.componentInstance.playlists.length).toBe(2);

    const fixture403 = setup({ listar$: throwError(() => ({ status: 403 } as HttpErrorResponse)) });
    expect(fixture403.nativeElement.textContent).toContain('Acesso restrito');

    const fixtureEmpty = setup({ listar$: of(pagina([])) });
    expect(fixtureEmpty.nativeElement.textContent).toContain('Nenhuma playlist encontrada');
    fixtureEmpty.componentInstance.pesquisar('sem resultado');
    fixtureEmpty.detectChanges();
    expect(fixtureEmpty.nativeElement.textContent).toContain('Nenhuma playlist encontrada para os filtros');
  });

  it('preserva a tabela durante refresh com erro e descarta respostas obsoletas', () => {
    const fixture = setup();
    service.listarPlaylists.and.returnValue(throwError(() => ({ status: 500, error: { message: 'Falha refresh' } } as HttpErrorResponse)));
    fixture.componentInstance.carregar();
    fixture.detectChanges();
    expect(fixture.componentInstance.playlists.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Falha refresh');

    const primeira$ = new Subject<ClickTvPage<ClickTvPlaylistResumo>>();
    const segunda$ = new Subject<ClickTvPage<ClickTvPlaylistResumo>>();
    let chamada = 0;
    const fixtureStale = setup({
      listarFake: () => {
        chamada += 1;
        return chamada === 1 ? primeira$.asObservable() : segunda$.asObservable();
      },
    });
    fixtureStale.componentInstance.alterarFiltros({ ativa: false });
    segunda$.next(pagina([inativa]));
    segunda$.complete();
    primeira$.next(pagina([ativa]));
    primeira$.complete();
    fixtureStale.detectChanges();

    expect(fixtureStale.componentInstance.playlists).toEqual([inativa]);
    expect(fixtureStale.nativeElement.textContent).toContain('Campanha antiga');
    expect(fixtureStale.nativeElement.textContent).not.toContain('Vitrine principal');
  });

  it('cria, edita dados, abre editor, duplica e desativa com permissoes', () => {
    const fixture = setup({
      dialogResult: { nome: 'Nova', descricao: '', orientacao: 'HORIZONTAL', ativa: true },
    });
    const component = fixture.componentInstance;

    component.criar();
    expect(dialog.open).toHaveBeenCalledWith(ClickTvPlaylistDialogComponent, { width: '560px', data: null });
    expect(service.criarPlaylist).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/page/clicktv/playlists', 1]);

    component.editar(ativa);
    expect(service.editarPlaylist).toHaveBeenCalledWith(1, jasmine.objectContaining({ nome: 'Nova' }));

    component.abrir(ativa);
    expect(router.navigate).toHaveBeenCalledWith(['/page/clicktv/playlists', 1]);

    dialog.open.and.returnValue({ afterClosed: () => of('Vitrine principal (cópia)') } as any);
    component.duplicar(ativa);
    expect(dialog.open).toHaveBeenCalledWith(ClickTvNameDialogComponent, jasmine.objectContaining({
      width: '500px',
      data: { titulo: 'Duplicar playlist', nome: 'Vitrine principal (cópia)' },
    }));
    expect(service.duplicarPlaylist).toHaveBeenCalledWith(1, 'Vitrine principal (cópia)');

    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.desativar(ativa);
    expect(service.desativarPlaylist).toHaveBeenCalledWith(1);
    component.desativar(inativa);
    expect(service.desativarPlaylist).toHaveBeenCalledTimes(1);
  });

  it('esconde acoes de gerenciamento sem permissao', () => {
    const fixture = setup({ podeGerenciar: false });
    const component = fixture.componentInstance;

    expect(fixture.nativeElement.textContent).not.toContain('Nova playlist');
    expect(component.actions.filter((action) => action.visible?.(ativa)).map((action) => action.id)).toEqual([]);
    expect(component.actions.find((action) => action.id === 'abrir')?.visible).toBeUndefined();
  });
});
