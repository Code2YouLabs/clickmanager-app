import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, Subject, throwError } from 'rxjs';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { AuthService } from 'src/app/services/auth.service';
import { ClickTvMidia, ClickTvPage, ClickTvPlaylistDetalhe, ClickTvPlaylistItem } from '../../models/clicktv.models';
import { ClickTvService } from '../../services/clicktv.service';
import { ClickTvPlaylistEditorComponent } from './clicktv-playlist-editor.component';

describe('ClickTvPlaylistEditorComponent', () => {
  let service: jasmine.SpyObj<ClickTvService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let auth: jasmine.SpyObj<AuthService>;

  const imagem: ClickTvMidia = {
    id: 10,
    nome: 'Banner',
    tipo: 'IMAGEM',
    status: 'DISPONIVEL',
    orientacao: 'HORIZONTAL',
    duracaoSegundos: null,
    nomeArquivoOriginal: 'banner.png',
    mimeType: 'image/png',
    tamanhoBytes: 1000,
    criadoEm: '',
    atualizadoEm: '',
  };
  const video: ClickTvMidia = {
    ...imagem,
    id: 11,
    nome: 'Video',
    tipo: 'VIDEO',
    nomeArquivoOriginal: 'video.mp4',
    mimeType: 'video/mp4',
  };
  const itemImagem: ClickTvPlaylistItem = {
    id: 100,
    ordem: 2,
    duracaoSegundos: 8,
    ativo: true,
    midiaId: 10,
    midiaNome: 'Banner',
    midiaTipo: 'IMAGEM',
    midiaOrientacao: 'HORIZONTAL',
    midiaStatus: 'DISPONIVEL',
  };
  const itemVideo: ClickTvPlaylistItem = {
    id: 101,
    ordem: 1,
    duracaoSegundos: null,
    ativo: false,
    midiaId: 11,
    midiaNome: 'Video',
    midiaTipo: 'VIDEO',
    midiaOrientacao: 'HORIZONTAL',
    midiaStatus: 'PROCESSANDO',
  };
  const playlist: ClickTvPlaylistDetalhe = {
    id: 1,
    nome: 'Vitrine',
    descricao: 'Recepcao',
    orientacao: 'HORIZONTAL',
    ativa: true,
    versao: 4,
    criadoEm: '',
    atualizadoEm: '',
    itens: [itemImagem, itemVideo],
  };

  function paginaMidias(content: ClickTvMidia[] = [imagem, video]): ClickTvPage<ClickTvMidia> {
    return { content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0, size: 100 };
  }

  function setup(options: {
    detalhe$?: Observable<ClickTvPlaylistDetalhe>;
    biblioteca$?: Observable<ClickTvPage<ClickTvMidia>>;
    bibliotecaFake?: (filtro: { nome?: string; status?: string; page?: number; size?: number }) => Observable<ClickTvPage<ClickTvMidia>>;
    dialogResult?: unknown;
  } = {}): ComponentFixture<ClickTvPlaylistEditorComponent> {
    TestBed.resetTestingModule();
    service = jasmine.createSpyObj<ClickTvService>('ClickTvService', [
      'detalharPlaylist',
      'listarMidias',
      'adicionarItem',
      'editarItem',
      'removerItem',
      'reordenarItens',
    ]);
    service.detalharPlaylist.and.returnValue(options.detalhe$ || of(playlist));
    service.listarMidias.and.callFake(options.bibliotecaFake || (() => options.biblioteca$ || of(paginaMidias())));
    service.adicionarItem.and.returnValue(of(playlist));
    service.editarItem.and.returnValue(of(playlist));
    service.removerItem.and.returnValue(of(void 0));
    service.reordenarItens.and.returnValue(of(playlist));

    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => of(options.dialogResult ?? null) } as any);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['temPermissao']);
    auth.temPermissao.and.callFake((permissao: string) => permissao === 'CLICKTV_VER' || permissao === 'CLICKTV_PLAYLISTS_GERENCIAR');

    TestBed.configureTestingModule({
      imports: [ClickTvPlaylistEditorComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ClickTvService, useValue: service },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
      ],
    });
    const fixture = TestBed.createComponent(ClickTvPlaylistEditorComponent);
    (fixture.componentInstance as unknown as { dialog: MatDialog }).dialog = dialog;
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('usa PageCard, SectionCard e carrega detalhe com biblioteca independente', () => {
    const fixture = setup();

    expect(fixture.debugElement.queryAll(By.directive(PageCardComponent)).length).toBe(1);
    expect(fixture.debugElement.queryAll(By.directive(SectionCardComponent)).length).toBe(2);
    expect(service.detalharPlaylist).toHaveBeenCalledWith(1);
    expect(service.listarMidias).toHaveBeenCalledWith({ nome: undefined, status: 'DISPONIVEL', page: 0, size: 100 });
    expect(fixture.nativeElement.textContent).toContain('Vitrine');
    expect(fixture.nativeElement.textContent).toContain('HORIZONTAL · versão 4 · duração configurada 8s');
    expect(fixture.nativeElement.textContent).toContain('Biblioteca de mídias');
    expect(fixture.nativeElement.textContent).toContain('Sequência de reprodução');
  });

  it('renderiza loading, forbidden, not found e erro com retry no detalhe', () => {
    const pendente$ = new Subject<ClickTvPlaylistDetalhe>();
    const fixtureLoading = setup({ detalhe$: pendente$.asObservable() });
    expect(fixtureLoading.nativeElement.textContent).toContain('Carregando editor');

    const fixture403 = setup({ detalhe$: throwError(() => ({ status: 403 } as HttpErrorResponse)) });
    expect(fixture403.nativeElement.textContent).toContain('Acesso restrito');

    const fixture404 = setup({ detalhe$: throwError(() => ({ status: 404 } as HttpErrorResponse)) });
    expect(fixture404.nativeElement.textContent).toContain('Playlist não encontrada');

    const fixtureErro = setup({ detalhe$: throwError(() => ({ status: 500, error: { message: 'Falha detalhe' } } as HttpErrorResponse)) });
    expect(fixtureErro.nativeElement.textContent).toContain('Falha detalhe');
    service.detalharPlaylist.and.returnValue(of(playlist));
    fixtureErro.componentInstance.carregarPlaylist();
    fixtureErro.detectChanges();
    expect(fixtureErro.componentInstance.playlist?.nome).toBe('Vitrine');
  });

  it('preserva sequencia quando biblioteca falha e permite retry', () => {
    const fixture = setup({ biblioteca$: throwError(() => ({ status: 500, error: { message: 'Falha biblioteca' } } as HttpErrorResponse)) });

    expect(fixture.nativeElement.textContent).toContain('Falha biblioteca');
    expect(fixture.nativeElement.textContent).toContain('Banner');
    service.listarMidias.and.returnValue(of(paginaMidias([imagem])));
    fixture.componentInstance.carregarBiblioteca();
    fixture.detectChanges();
    expect(fixture.componentInstance.biblioteca).toEqual([imagem]);
  });

  it('busca biblioteca no servidor com debounce e descarta resposta obsoleta', fakeAsync(() => {
    const fixture = setup();
    const input = fixture.nativeElement.querySelector('input[type=search]');

    input.value = 'promo';
    input.dispatchEvent(new Event('input'));
    tick(299);
    expect(service.listarMidias).toHaveBeenCalledTimes(1);
    tick(1);
    expect(service.listarMidias.calls.mostRecent().args[0]).toEqual({ nome: 'promo', status: 'DISPONIVEL', page: 0, size: 100 });

    const primeira$ = new Subject<ClickTvPage<ClickTvMidia>>();
    const segunda$ = new Subject<ClickTvPage<ClickTvMidia>>();
    let chamada = 0;
    const fixtureStale = setup({
      bibliotecaFake: () => {
        chamada += 1;
        return chamada === 1 ? primeira$.asObservable() : segunda$.asObservable();
      },
    });
    fixtureStale.componentInstance.pesquisarBiblioteca('p');
    fixtureStale.componentInstance.pesquisarBiblioteca('promo');
    segunda$.next(paginaMidias([video]));
    segunda$.complete();
    primeira$.next(paginaMidias([imagem]));
    primeira$.complete();
    fixtureStale.detectChanges();

    expect(fixtureStale.componentInstance.biblioteca).toEqual([video]);
  }));

  it('adiciona imagem com duracao default e video sem duracao', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.adicionar(imagem);
    expect(service.adicionarItem).toHaveBeenCalledWith(1, 10, 10);

    component.adicionar({ ...imagem, duracaoSegundos: 15 });
    expect(service.adicionarItem).toHaveBeenCalledWith(1, 10, 15);

    component.adicionar(video);
    expect(service.adicionarItem).toHaveBeenCalledWith(1, 11, undefined);
  });

  it('renderiza sequencia ordenada, playlist vazia e duracao total apenas dos ativos', () => {
    const fixture = setup();

    expect(fixture.componentInstance.playlist?.itens.map((item) => item.id)).toEqual([101, 100]);
    expect(fixture.componentInstance.duracaoTotal()).toBe(8);

    service.detalharPlaylist.and.returnValue(of({ ...playlist, itens: [] }));
    fixture.componentInstance.carregarPlaylist();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Playlist vazia');
  });

  it('valida duracao de imagem, nao exibe campo para video e recarrega no erro de atualizacao', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const imagemItem = { ...itemImagem, duracaoSegundos: 0 };

    component.salvarItem(imagemItem);
    expect(toastr.warning).toHaveBeenCalledWith('Informe uma duração maior que zero para a imagem.');
    expect(service.editarItem).not.toHaveBeenCalled();

    service.editarItem.and.returnValue(throwError(() => ({ status: 500, error: { message: 'Falha item' } } as HttpErrorResponse)));
    component.salvarItem({ ...itemImagem, duracaoSegundos: 12, ativo: true });
    expect(service.editarItem).toHaveBeenCalledWith(1, 100, 12, true);
    expect(toastr.error).toHaveBeenCalledWith('Falha item');
    expect(service.detalharPlaylist).toHaveBeenCalledTimes(3);

    expect(fixture.nativeElement.textContent).toContain('Video');
    const durationFields = fixture.nativeElement.querySelectorAll('.duration');
    expect(durationFields.length).toBe(1);
  });

  it('ativa/desativa, move, bloqueia operacao duplicada e trata conflito 409 com reload', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.salvarItem({ ...itemImagem, ativo: false, duracaoSegundos: 9 });
    expect(service.editarItem).toHaveBeenCalledWith(1, 100, 9, false);

    component.mover(itemImagem, -1);
    expect(service.reordenarItens).toHaveBeenCalledWith(1, [100, 101]);

    const pendente$ = new Subject<ClickTvPlaylistDetalhe>();
    service.adicionarItem.and.returnValue(pendente$.asObservable());
    component.adicionar(imagem);
    component.adicionar(video);
    expect(service.adicionarItem).toHaveBeenCalledTimes(1);
    pendente$.next(playlist);
    pendente$.complete();

    service.editarItem.and.returnValue(throwError(() => ({ status: 409, error: { message: 'Conflito' } } as HttpErrorResponse)));
    component.salvarItem({ ...itemImagem, duracaoSegundos: 10 });
    expect(toastr.warning).toHaveBeenCalledWith('Conflito');
    expect(service.detalharPlaylist).toHaveBeenCalled();
  });

  it('remove item com ConfirmDialog respeitando cancelamento e confirmacao', () => {
    const fixture = setup({ dialogResult: false });
    const component = fixture.componentInstance;

    component.remover(itemImagem);
    expect(service.removerItem).not.toHaveBeenCalled();

    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.remover(itemImagem);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({
      width: '420px',
      data: jasmine.objectContaining({ message: 'Remover "Banner" desta playlist?' }),
    }));
    expect(service.removerItem).toHaveBeenCalledWith(1, 100);
    expect(toastr.success).toHaveBeenCalledWith('Item removido.');
  });
});
