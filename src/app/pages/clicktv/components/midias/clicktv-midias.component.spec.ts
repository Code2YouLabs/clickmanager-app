import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, Subject, throwError } from 'rxjs';
import { ListFilterBarComponent } from 'src/app/components/list-filter-bar/list-filter-bar.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { AuthService } from 'src/app/services/auth.service';
import { ClickTvMidia, ClickTvPage, ClickTvStatusMidia, ClickTvTipoMidia } from '../../models/clicktv.models';
import { ClickTvService } from '../../services/clicktv.service';
import {
  ClickTvMidiaPreviewDialogComponent,
  ClickTvNameDialogComponent,
  ClickTvUploadDialogComponent,
} from '../dialogs/clicktv-dialogs.component';
import { ClickTvMidiasComponent } from './clicktv-midias.component';

describe('ClickTvMidiasComponent', () => {
  let service: jasmine.SpyObj<ClickTvService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let auth: jasmine.SpyObj<AuthService>;
  let overlay: OverlayContainer;

  const imagem: ClickTvMidia = {
    id: 1,
    nome: 'Banner entrada',
    tipo: 'IMAGEM',
    status: 'DISPONIVEL',
    orientacao: 'HORIZONTAL',
    nomeArquivoOriginal: 'banner.png',
    mimeType: 'image/png',
    tamanhoBytes: 1536,
    largura: 1920,
    altura: 1080,
    criadoEm: '',
    atualizadoEm: '',
    visualizacao: { url: 'https://cdn.local/banner.png', expiraEm: '' },
  };
  const video: ClickTvMidia = {
    ...imagem,
    id: 2,
    nome: 'Video institucional',
    tipo: 'VIDEO',
    status: 'PROCESSANDO',
    orientacao: 'VERTICAL',
    nomeArquivoOriginal: 'video.mp4',
    mimeType: 'video/mp4',
    tamanhoBytes: 2_621_440,
    largura: 1080,
    altura: 1920,
    visualizacao: { url: 'https://cdn.local/video.mp4', expiraEm: '' },
  };

  function pagina(content: ClickTvMidia[] = [imagem, video], page = 0, size = 12): ClickTvPage<ClickTvMidia> {
    return { content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: page, size };
  }

  function setup(options: {
    listar$?: Observable<ClickTvPage<ClickTvMidia>>;
    listarFake?: (filtro: { nome?: string; tipo?: ClickTvTipoMidia; status?: ClickTvStatusMidia; page?: number; size?: number }) => Observable<ClickTvPage<ClickTvMidia>>;
    podeGerenciar?: boolean;
    dialogResult?: unknown;
  } = {}): ComponentFixture<ClickTvMidiasComponent> {
    service = jasmine.createSpyObj<ClickTvService>('ClickTvService', [
      'listarMidias',
      'uploadMidia',
      'detalharMidia',
      'utilizacoesMidia',
      'renomearMidia',
      'excluirMidia',
    ]);
    service.listarMidias.and.callFake(options.listarFake || (() => options.listar$ || of(pagina())));
    service.uploadMidia.and.returnValue(of({ type: HttpEventType.Response } as any));
    service.detalharMidia.and.returnValue(of(imagem));
    service.utilizacoesMidia.and.returnValue(of([{ playlistId: 9, nome: 'Vitrine', ativa: true, quantidadeItens: 2, versao: 1 }]));
    service.renomearMidia.and.returnValue(of(imagem));
    service.excluirMidia.and.returnValue(of(void 0));

    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => of(options.dialogResult ?? null) } as any);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['temPermissao']);
    auth.temPermissao.and.callFake((permissao: string) => permissao === 'CLICKTV_VER' || (permissao === 'CLICKTV_MIDIAS_GERENCIAR' && options.podeGerenciar !== false));

    TestBed.configureTestingModule({
      imports: [ClickTvMidiasComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ClickTvService, useValue: service },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
        { provide: AuthService, useValue: auth },
      ],
    });
    overlay = TestBed.inject(OverlayContainer);
    const fixture = TestBed.createComponent(ClickTvMidiasComponent);
    (fixture.componentInstance as unknown as { dialog: MatDialog }).dialog = dialog;
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    overlay?.ngOnDestroy();
    TestBed.resetTestingModule();
  });

  it('usa PageCard, ListFilterBar e preserva grid visual de mídias', () => {
    const fixture = setup();

    expect(fixture.debugElement.queryAll(By.directive(PageCardComponent)).length).toBe(1);
    expect(fixture.debugElement.queryAll(By.directive(ListFilterBarComponent)).length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Mídias do ClickTV');
    expect(fixture.nativeElement.textContent).toContain('Enviar mídia');
    expect(fixture.nativeElement.querySelectorAll('.clicktv-card').length).toBe(2);
    expect(fixture.nativeElement.querySelector('app-data-table')).toBeNull();
    expect(fixture.nativeElement.querySelector('.clicktv-toolbar')).toBeNull();
  });

  it('carrega mídias com paginação inicial e renderiza imagem, vídeo, status e metadados', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent;

    expect(service.listarMidias).toHaveBeenCalledOnceWith({ nome: undefined, tipo: undefined, status: undefined, page: 0, size: 12 });
    expect(text).toContain('Banner entrada');
    expect(text).toContain('IMAGEM · 1.5 KB');
    expect(text).toContain('1920 × 1080 · HORIZONTAL');
    expect(text).toContain('DISPONIVEL');
    expect(fixture.nativeElement.querySelector('img')?.getAttribute('alt')).toBe('Banner entrada');
    expect(fixture.nativeElement.querySelector('.video-play')?.textContent).toContain('play_circle');
  });

  it('pagina no servidor preservando opções 12, 24 e 48', () => {
    const fixture = setup();

    fixture.componentInstance.pagina({ pageIndex: 1, pageSize: 24, length: 48 } as any);
    fixture.detectChanges();

    expect(fixture.componentInstance.page).toBe(1);
    expect(fixture.componentInstance.size).toBe(24);
    expect(service.listarMidias.calls.mostRecent().args[0]).toEqual({ nome: undefined, tipo: undefined, status: undefined, page: 1, size: 24 });
    expect(fixture.nativeElement.querySelector('mat-paginator').getAttribute('ng-reflect-page-size-options')).toContain('12,24,48');
  });

  it('aplica busca, tipo, status e limpar filtros no servidor resetando page', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    component.page = 3;

    component.pesquisar('  vitrine  ');
    expect(component.page).toBe(0);
    expect(service.listarMidias.calls.mostRecent().args[0]).toEqual({ nome: 'vitrine', tipo: undefined, status: undefined, page: 0, size: 12 });

    component.page = 2;
    component.alterarFiltros({ tipo: 'VIDEO', status: 'ERRO' });
    expect(component.page).toBe(0);
    expect(service.listarMidias.calls.mostRecent().args[0]).toEqual({ nome: 'vitrine', tipo: 'VIDEO', status: 'ERRO', page: 0, size: 12 });

    component.limparFiltros();
    expect(component.nome).toBe('');
    expect(component.tipo).toBe('');
    expect(component.status).toBe('');
    expect(service.listarMidias.calls.mostRecent().args[0]).toEqual({ nome: undefined, tipo: undefined, status: undefined, page: 0, size: 12 });
  });

  it('usa debounce único do ListFilterBar para busca', fakeAsync(() => {
    const fixture = setup();
    const input = fixture.nativeElement.querySelector('input[type=search]');

    input.value = 'campanha';
    input.dispatchEvent(new Event('input'));
    tick(299);
    expect(service.listarMidias).toHaveBeenCalledTimes(1);
    tick(1);

    expect(service.listarMidias).toHaveBeenCalledTimes(2);
    expect(service.listarMidias.calls.mostRecent().args[0].nome).toBe('campanha');
  }));

  it('mostra loading inicial sem renderizar vazio', () => {
    const pendente$ = new Subject<ClickTvPage<ClickTvMidia>>();
    const fixtureLoading = setup({ listar$: pendente$.asObservable() });
    expect(fixtureLoading.componentInstance.carregandoInicial).toBeTrue();
    expect(fixtureLoading.nativeElement.textContent).toContain('Carregando mídias');
    expect(fixtureLoading.nativeElement.textContent).not.toContain('Nenhuma mídia encontrada');
  });

  it('mostra erro com retry sem transformar erro em vazio', () => {
    const fixtureErro = setup({ listar$: throwError(() => ({ status: 500, error: { message: 'Falha ClickTV' } } as HttpErrorResponse)) });
    expect(fixtureErro.componentInstance.erro).toBe('Falha ClickTV');
    expect(fixtureErro.nativeElement.textContent).toContain('Não foi possível carregar as mídias');

    service.listarMidias.and.returnValue(of(pagina()));
    fixtureErro.componentInstance.carregar();
    fixtureErro.detectChanges();
    expect(fixtureErro.componentInstance.erro).toBeNull();
    expect(fixtureErro.componentInstance.midias.length).toBe(2);
  });

  it('trata forbidden explicitamente', () => {
    const fixture403 = setup({ listar$: throwError(() => ({ status: 403 } as HttpErrorResponse)) });
    expect(fixture403.componentInstance.semPermissao).toBeTrue();
    expect(fixture403.nativeElement.textContent).toContain('Acesso restrito');
  });

  it('diferencia vazio inicial de vazio filtrado', () => {
    const fixtureEmpty = setup({ listar$: of(pagina([], 0, 12)) });
    expect(fixtureEmpty.nativeElement.textContent).toContain('Nenhuma mídia encontrada');
    fixtureEmpty.componentInstance.pesquisar('sem resultado');
    fixtureEmpty.detectChanges();
    expect(fixtureEmpty.nativeElement.textContent).toContain('Nenhuma mídia encontrada para os filtros');
  });

  it('mantém o grid durante refreshing e erro de atualização', () => {
    const fixture = setup();
    service.listarMidias.and.returnValue(throwError(() => ({ status: 500, error: { message: 'Falha refresh' } } as HttpErrorResponse)));

    fixture.componentInstance.carregar();
    fixture.detectChanges();

    expect(fixture.componentInstance.midias.length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.clicktv-card').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Falha refresh');
  });

  it('descarta respostas obsoletas quando busca, filtros ou página mudam rapidamente', () => {
    const primeira$ = new Subject<ClickTvPage<ClickTvMidia>>();
    const segunda$ = new Subject<ClickTvPage<ClickTvMidia>>();
    let chamada = 0;
    const fixture = setup({
      listarFake: () => {
        chamada += 1;
        return chamada === 1 ? primeira$.asObservable() : segunda$.asObservable();
      },
    });

    fixture.componentInstance.alterarFiltros({ tipo: 'VIDEO' });
    segunda$.next(pagina([video]));
    segunda$.complete();
    primeira$.next(pagina([imagem]));
    primeira$.complete();
    fixture.detectChanges();

    expect(fixture.componentInstance.tipo).toBe('VIDEO');
    expect(fixture.componentInstance.midias).toEqual([video]);
    expect(fixture.nativeElement.textContent).toContain('Video institucional');
    expect(fixture.nativeElement.textContent).not.toContain('Banner entrada');
  });

  it('permite visualizar com CLICKTV_VER e esconde upload, renomear e excluir sem gerenciamento', () => {
    const fixture = setup({ podeGerenciar: false });

    expect(fixture.nativeElement.textContent).not.toContain('Enviar mídia');
    fixture.nativeElement.querySelector('button[aria-label="Ações da mídia"]').click();
    fixture.detectChanges();

    const menuText = overlay.getContainerElement().textContent || '';
    expect(menuText).toContain('Visualizar');
    expect(menuText).not.toContain('Renomear');
    expect(menuText).not.toContain('Excluir definitivamente');
  });

  it('abre upload, preserva progresso e recarrega após sucesso', () => {
    const arquivo = new File(['abc'], 'promocao.mp4', { type: 'video/mp4' });
    const eventos$ = new Subject<any>();
    const fixture = setup({ dialogResult: { arquivo, nome: 'Promoção', duracaoImagem: undefined } });
    service.uploadMidia.and.returnValue(eventos$.asObservable());

    fixture.componentInstance.enviar();
    eventos$.next({ type: HttpEventType.UploadProgress, loaded: 60, total: 100 });
    fixture.detectChanges();
    expect(fixture.componentInstance.uploadProgresso).toBe(60);
    expect(fixture.nativeElement.textContent).toContain('Enviando mídia... 60%');

    eventos$.next({ type: HttpEventType.Response });
    eventos$.complete();
    expect(fixture.componentInstance.uploadProgresso).toBeNull();
    expect(toastr.success).toHaveBeenCalledWith('Mídia enviada com sucesso.');
    expect(service.listarMidias).toHaveBeenCalledTimes(2);
  });

  it('visualiza mídia somente depois de detalhar e carregar utilizações', () => {
    const fixture = setup();

    fixture.componentInstance.visualizar(imagem);

    expect(service.detalharMidia).toHaveBeenCalledWith(1);
    expect(service.utilizacoesMidia).toHaveBeenCalledWith(1);
    expect(dialog.open).toHaveBeenCalledWith(ClickTvMidiaPreviewDialogComponent, {
      width: '820px',
      data: jasmine.objectContaining({ midia: imagem, utilizacoes: jasmine.any(Array) }),
    });
  });

  it('renomeia somente quando o nome muda e recarrega a listagem', () => {
    const fixture = setup({ dialogResult: imagem.nome });
    fixture.componentInstance.renomear(imagem);
    expect(service.renomearMidia).not.toHaveBeenCalled();

    dialog.open.and.returnValue({ afterClosed: () => of('Novo nome') } as any);
    fixture.componentInstance.renomear(imagem);
    expect(dialog.open).toHaveBeenCalledWith(ClickTvNameDialogComponent, jasmine.objectContaining({
      width: '500px',
      data: { titulo: 'Renomear mídia', nome: imagem.nome },
    }));
    expect(service.renomearMidia).toHaveBeenCalledWith(1, 'Novo nome');
    expect(service.listarMidias).toHaveBeenCalledTimes(2);
  });

  it('usa ConfirmDialog na exclusão, respeita cancelamento e recarrega no sucesso', () => {
    const fixture = setup({ dialogResult: false });
    fixture.componentInstance.excluir(imagem);
    expect(service.excluirMidia).not.toHaveBeenCalled();

    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    fixture.componentInstance.excluir(imagem);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({
      width: '520px',
      data: jasmine.objectContaining({
        title: 'Excluir mídia definitivamente',
        confirmText: 'Excluir definitivamente',
      }),
    }));
    expect(service.excluirMidia).toHaveBeenCalledWith(1);
    expect(toastr.success).toHaveBeenCalledWith('Mídia excluída definitivamente.');
    expect(service.listarMidias).toHaveBeenCalledTimes(2);
  });

  it('mantém uma única fonte de dados e nenhum fluxo mobile paralelo', () => {
    const fixture = setup();

    expect(fixture.nativeElement.querySelector('.clicktv-grid')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.clicktv-mobile')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-data-table')).toBeNull();
  });
});
