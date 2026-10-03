import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, Subject, throwError } from 'rxjs';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { AuthService } from 'src/app/services/auth.service';
import { ClickTvOrientacao, ClickTvPage, ClickTvPlaylistResumo, ClickTvTela, ClickTvTelaPayload } from '../../models/clicktv.models';
import { ClickTvService } from '../../services/clicktv.service';
import { ClickTvTelaDialogComponent } from '../dialogs/clicktv-dialogs.component';
import { ClickTvTelasComponent } from './clicktv-telas.component';

describe('ClickTvTelasComponent', () => {
  let service: jasmine.SpyObj<ClickTvService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let auth: jasmine.SpyObj<AuthService>;

  const playlist: ClickTvPlaylistResumo = {
    id: 7,
    nome: 'Vitrine',
    descricao: null,
    orientacao: 'HORIZONTAL',
    ativa: true,
    versao: 2,
    quantidadeItens: 3,
    quantidadeItensAtivos: 3,
    criadoEm: '',
    atualizadoEm: '',
  };
  const telaOnline: ClickTvTela = {
    id: 1,
    nome: 'TV Recepção',
    descricaoLocal: 'Entrada',
    orientacao: 'HORIZONTAL',
    status: 'ONLINE',
    ativa: true,
    versaoConfiguracao: 4,
    playlistPadraoId: 7,
    playlistPadraoNome: 'Vitrine',
    ultimaConexaoEm: '2026-09-29T10:15:00',
    ultimaSincronizacaoEm: null,
    criadoEm: '',
    atualizadoEm: '',
  };
  const telaAguardando: ClickTvTela = {
    ...telaOnline,
    id: 2,
    nome: 'TV Estoque',
    descricaoLocal: null,
    status: 'AGUARDANDO_ATIVACAO',
    playlistPadraoId: null,
    playlistPadraoNome: null,
    ultimaConexaoEm: null,
  };
  const telaDesativada: ClickTvTela = {
    ...telaOnline,
    id: 3,
    nome: 'TV Antiga',
    status: 'DESATIVADA',
  };

  function paginaTelas(content: ClickTvTela[] = [telaOnline, telaAguardando], page = 0, size = 10): ClickTvPage<ClickTvTela> {
    return { content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: page, size };
  }

  function paginaPlaylists(content: ClickTvPlaylistResumo[] = [playlist]): ClickTvPage<ClickTvPlaylistResumo> {
    return { content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0, size: 200 };
  }

  function setup(options: {
    telas$?: Observable<ClickTvPage<ClickTvTela>>;
    telasFake?: (filtro: { nome?: string; status?: string; page?: number; size?: number }) => Observable<ClickTvPage<ClickTvTela>>;
    playlists$?: Observable<ClickTvPage<ClickTvPlaylistResumo>>;
    podeGerenciar?: boolean;
    dialogResult?: unknown;
  } = {}): ComponentFixture<ClickTvTelasComponent> {
    TestBed.resetTestingModule();
    service = jasmine.createSpyObj<ClickTvService>('ClickTvService', [
      'listarTelas',
      'listarPlaylists',
      'alterarPlaylistPadrao',
      'vincularTela',
      'editarTela',
      'desvincularTela',
      'desativarTela',
    ]);
    service.listarTelas.and.callFake(options.telasFake || (() => options.telas$ || of(paginaTelas())));
    service.listarPlaylists.and.returnValue(options.playlists$ || of(paginaPlaylists()));
    service.alterarPlaylistPadrao.and.returnValue(of(telaOnline));
    service.vincularTela.and.returnValue(of(telaOnline));
    service.editarTela.and.returnValue(of(telaOnline));
    service.desvincularTela.and.returnValue(of({ ...telaOnline, status: 'AGUARDANDO_ATIVACAO' }));
    service.desativarTela.and.returnValue(of({ ...telaOnline, status: 'DESATIVADA' }));

    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => of(options.dialogResult ?? null) } as any);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['temPermissao']);
    auth.temPermissao.and.callFake((permissao: string) => permissao === 'CLICKTV_VER' || (permissao === 'CLICKTV_TELAS_GERENCIAR' && options.podeGerenciar !== false));

    TestBed.configureTestingModule({
      imports: [ClickTvTelasComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ClickTvService, useValue: service },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
        { provide: AuthService, useValue: auth },
      ],
    });
    const fixture = TestBed.createComponent(ClickTvTelasComponent);
    (fixture.componentInstance as unknown as { dialog: MatDialog }).dialog = dialog;
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('usa PageCard e DataTable como shell único da listagem', () => {
    const fixture = setup();

    expect(fixture.debugElement.queryAll(By.directive(PageCardComponent)).length).toBe(1);
    expect(fixture.debugElement.queryAll(By.directive(DataTableComponent)).length).toBe(1);
    expect(fixture.nativeElement.querySelector('.clicktv-toolbar')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Telas do ClickTV');
    expect(fixture.nativeElement.textContent).toContain('Vincular tela');
  });

  it('carrega telas, playlists auxiliares e renderiza colunas preservadas', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent;

    expect(service.listarTelas).toHaveBeenCalledOnceWith({ nome: undefined, status: undefined, page: 0, size: 10 });
    expect(service.listarPlaylists).toHaveBeenCalledOnceWith({ ativa: true, page: 0, size: 200 });
    expect(text).toContain('TV Recepção');
    expect(text).toContain('Entrada');
    expect(text).toContain('HORIZONTAL');
    expect(text).toContain('Online');
    expect(text).toContain('29/09/2026 10:15');
    expect(text).toContain('Nunca');
  });

  it('aplica busca, filtro de status, limpar filtros e paginação server-side', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.page = 3;
    component.pesquisar('  recepção  ');
    expect(component.page).toBe(0);
    expect(service.listarTelas.calls.mostRecent().args[0]).toEqual({ nome: 'recepção', status: undefined, page: 0, size: 10 });

    component.page = 2;
    component.alterarFiltros({ status: 'OFFLINE' });
    expect(service.listarTelas.calls.mostRecent().args[0]).toEqual({ nome: 'recepção', status: 'OFFLINE', page: 0, size: 10 });

    component.limparFiltros();
    expect(component.nome).toBe('');
    expect(component.status).toBe('');
    expect(service.listarTelas.calls.mostRecent().args[0]).toEqual({ nome: undefined, status: undefined, page: 0, size: 10 });

    component.pagina({ pageIndex: 1, pageSize: 20, length: 100 } as any);
    expect(service.listarTelas.calls.mostRecent().args[0]).toEqual({ nome: undefined, status: undefined, page: 1, size: 20 });
    expect(fixture.nativeElement.querySelector('mat-paginator').getAttribute('ng-reflect-page-size-options')).toContain('10,20,50');
  });

  it('usa debounce único do DataTable/ListFilterBar na busca', fakeAsync(() => {
    const fixture = setup();
    const input = fixture.nativeElement.querySelector('input[type=search]');

    input.value = 'estoque';
    input.dispatchEvent(new Event('input'));
    tick(299);
    expect(service.listarTelas).toHaveBeenCalledTimes(1);
    tick(1);

    expect(service.listarTelas).toHaveBeenCalledTimes(2);
    expect(service.listarTelas.calls.mostRecent().args[0].nome).toBe('estoque');
  }));

  it('mostra loading, erro/retry, forbidden, empty, filtered empty e descarta respostas antigas', () => {
    const pendente$ = new Subject<ClickTvPage<ClickTvTela>>();
    const fixtureLoading = setup({ telas$: pendente$.asObservable() });
    expect(fixtureLoading.nativeElement.textContent).toContain('Carregando registros');
    expect(fixtureLoading.nativeElement.textContent).not.toContain('Nenhuma tela encontrada');

    const fixtureErro = setup({ telas$: throwError(() => ({ status: 500, error: { message: 'Falha telas' } } as HttpErrorResponse)) });
    expect(fixtureErro.nativeElement.textContent).toContain('Falha telas');
    service.listarTelas.and.returnValue(of(paginaTelas()));
    fixtureErro.componentInstance.carregar();
    fixtureErro.detectChanges();
    expect(fixtureErro.componentInstance.telas.length).toBe(2);

    const fixture403 = setup({ telas$: throwError(() => ({ status: 403 } as HttpErrorResponse)) });
    expect(fixture403.nativeElement.textContent).toContain('Acesso restrito');

    const fixtureEmpty = setup({ telas$: of(paginaTelas([])) });
    expect(fixtureEmpty.nativeElement.textContent).toContain('Nenhuma tela encontrada');
    fixtureEmpty.componentInstance.pesquisar('sem resultado');
    fixtureEmpty.detectChanges();
    expect(fixtureEmpty.nativeElement.textContent).toContain('Nenhuma tela encontrada para os filtros atuais');

    const primeira$ = new Subject<ClickTvPage<ClickTvTela>>();
    const segunda$ = new Subject<ClickTvPage<ClickTvTela>>();
    let chamada = 0;
    const fixtureStale = setup({
      telasFake: () => {
        chamada += 1;
        return chamada === 1 ? primeira$.asObservable() : segunda$.asObservable();
      },
    });
    fixtureStale.componentInstance.alterarFiltros({ status: 'AGUARDANDO_ATIVACAO' });
    segunda$.next(paginaTelas([telaAguardando]));
    segunda$.complete();
    primeira$.next(paginaTelas([telaOnline]));
    primeira$.complete();
    fixtureStale.detectChanges();
    expect(fixtureStale.componentInstance.telas).toEqual([telaAguardando]);
  });

  it('mantém tabela quando playlists auxiliares falham e permite retry específico', () => {
    const fixture = setup({ playlists$: throwError(() => ({ status: 500, error: { message: 'Falha playlists' } } as HttpErrorResponse)) });

    expect(fixture.nativeElement.textContent).toContain('Falha playlists');
    expect(fixture.nativeElement.textContent).toContain('TV Recepção');
    service.listarPlaylists.and.returnValue(of(paginaPlaylists([playlist])));
    fixture.componentInstance.carregarPlaylists();
    fixture.detectChanges();
    expect(fixture.componentInstance.playlists).toEqual([playlist]);
  });

  it('altera playlist padrão com PATCH, rollback em erro e bloqueio de dupla alteração', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const tela: ClickTvTela = { ...telaOnline, playlistPadraoId: null };

    component.alterarPlaylist(tela, 7);
    expect(service.alterarPlaylistPadrao).toHaveBeenCalledWith(1, 7);
    expect(tela.playlistPadraoId).toBe(7);
    expect(toastr.success).toHaveBeenCalledWith('Playlist padrão atualizada.');

    service.alterarPlaylistPadrao.and.returnValue(throwError(() => ({ status: 500 } as HttpErrorResponse)));
    component.alterarPlaylist(tela, null);
    expect(tela.playlistPadraoId).toBe(7);
    expect(toastr.error).toHaveBeenCalledWith('Não foi possível alterar a playlist padrão.');

    component.alterarPlaylist(telaDesativada, null);
    expect(service.alterarPlaylistPadrao).toHaveBeenCalledTimes(2);

    const pendente$ = new Subject<ClickTvTela>();
    service.alterarPlaylistPadrao.and.returnValue(pendente$.asObservable());
    const telaPendente: ClickTvTela = { ...telaOnline, playlistPadraoId: null };
    component.alterarPlaylist(telaPendente, 7);
    component.alterarPlaylist(telaPendente, null);
    expect(service.alterarPlaylistPadrao).toHaveBeenCalledTimes(3);
  });

  it('vincula nova tela, relink defensivo e preserva mensagens de erro de ativação', () => {
    const payload: ClickTvTelaPayload & { codigo: string; orientacao: ClickTvOrientacao } = {
      codigo: '123456',
      nome: 'Nova TV',
      descricaoLocal: 'Loja',
      orientacao: 'HORIZONTAL',
    };
    const fixture = setup({ dialogResult: payload });
    const component = fixture.componentInstance;

    component.vincular();
    expect(dialog.open).toHaveBeenCalledWith(ClickTvTelaDialogComponent, { width: '560px', data: { vincular: true, tela: undefined } });
    expect(service.vincularTela).toHaveBeenCalledWith(payload);
    expect(toastr.success).toHaveBeenCalledWith('Tela vinculada com sucesso.');

    component.vincular(telaDesativada);
    expect(toastr.warning).toHaveBeenCalledWith('Uma tela desativada não pode ser vinculada novamente.');
    expect(service.vincularTela).toHaveBeenCalledTimes(1);

    service.vincularTela.and.returnValue(throwError(() => ({ status: 409, error: { message: 'Código em uso' } } as HttpErrorResponse)));
    component.vincular(telaOnline);
    expect(toastr.warning).toHaveBeenCalledWith('Código em uso');

    service.vincularTela.and.returnValue(throwError(() => ({ status: 404 } as HttpErrorResponse)));
    component.vincular();
    expect(toastr.warning).toHaveBeenCalledWith('Código inválido ou expirado. Gere um novo código no player.');

    service.vincularTela.and.returnValue(throwError(() => ({ status: 410 } as HttpErrorResponse)));
    component.vincular();
    expect(toastr.warning).toHaveBeenCalledWith('Código inválido ou expirado. Gere um novo código no player.');
  });

  it('edita, desvincula e desativa com confirmação e estados proibidos', () => {
    const payload: ClickTvTelaPayload = { nome: 'Editada', descricaoLocal: 'Sala', orientacao: 'VERTICAL' };
    const fixture = setup({ dialogResult: payload });
    const component = fixture.componentInstance;

    component.editar(telaOnline);
    expect(service.editarTela).toHaveBeenCalledWith(1, payload);

    dialog.open.and.returnValue({ afterClosed: () => of(false) } as any);
    component.desvincular(telaOnline);
    expect(service.desvincularTela).not.toHaveBeenCalled();

    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.desvincular(telaOnline);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({
      width: '430px',
      data: jasmine.objectContaining({ message: jasmine.stringMatching(/novo código/) }),
    }));
    expect(service.desvincularTela).toHaveBeenCalledWith(1);

    component.desvincular(telaAguardando);
    component.desvincular(telaDesativada);
    expect(service.desvincularTela).toHaveBeenCalledTimes(1);

    component.desativar(telaOnline);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({
      data: jasmine.objectContaining({ message: jasmine.stringMatching(/permanente/) }),
    }));
    expect(service.desativarTela).toHaveBeenCalledWith(1);

    component.desativar(telaDesativada);
    expect(service.desativarTela).toHaveBeenCalledTimes(1);
  });

  it('esconde ações de gestão sem permissão e mantém a mesma fonte mobile', () => {
    const fixture = setup({ podeGerenciar: false });
    const component = fixture.componentInstance;

    expect(fixture.nativeElement.textContent).not.toContain('Vincular tela');
    expect(component.actions.every((action) => action.visible?.(telaOnline) === false)).toBeTrue();
    expect(fixture.nativeElement.querySelector('.clicktv-mobile')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('app-data-table').length).toBe(1);
  });
});
