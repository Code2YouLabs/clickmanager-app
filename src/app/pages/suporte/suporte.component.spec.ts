import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Observable, Subject, of, throwError } from 'rxjs';
import {
  ChamadoSuporteDetalhe,
  ChamadoSuporteListaItem,
  ChamadoSuportePaginadoResponse,
  MensagemChamadoSuporte
} from './models/chamado-suporte.model';
import { SuporteComponent } from './suporte.component';
import { SuporteService } from './services/suporte.service';
import { PagesRoutes } from '../pages.routes';
import { navItems } from 'src/app/layouts/full/vertical/sidebar/sidebar-data';

describe('SuporteComponent', () => {
  let fixture: ComponentFixture<SuporteComponent>;
  let component: SuporteComponent;
  let service: jasmine.SpyObj<SuporteService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let router: jasmine.SpyObj<Router>;
  let paramMap$: BehaviorSubject<any>;
  let dialogOpenSpy: jasmine.Spy;

  const item6 = chamadoItem(6, 'Pedido com dúvida', 'RESPONDIDO', '2026-09-29T15:00:00');
  const item7 = chamadoItem(7, 'Erro no acesso', 'ABERTO', '2026-09-29T16:00:00');

  function setup(options: {
    initialId?: number | null;
    listar?: Observable<ChamadoSuportePaginadoResponse>;
    buscar?: (id: number) => Observable<ChamadoSuporteDetalhe>;
  } = {}): void {
    service = jasmine.createSpyObj<SuporteService>('SuporteService', ['listar$', 'buscarPorId$', 'criar$', 'responder$', 'fechar$']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'warning', 'error']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    dialogOpenSpy = spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(null),
    } as any);
    paramMap$ = new BehaviorSubject(convertToParamMap(options.initialId ? { id: String(options.initialId) } : {}));

    service.listar$.and.returnValue(options.listar ?? of(pagina([item6, item7], 2)));
    service.buscarPorId$.and.callFake((id: number) => options.buscar?.(id) ?? of(chamadoDetalhe(id)));
    service.responder$.and.returnValue(of(chamadoDetalhe(6, [
      mensagem(1, 'CLIENTE', 'Mensagem anterior', false),
      mensagem(2, 'CLIENTE', 'Nova resposta', false),
    ])));
    service.fechar$.and.returnValue(of({ ...chamadoDetalhe(6), status: 'FECHADO' }));

    TestBed.configureTestingModule({
      imports: [SuporteComponent, NoopAnimationsModule],
      providers: [
        { provide: SuporteService, useValue: service },
        { provide: ToastrService, useValue: toastr },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$.asObservable() } },
      ],
    });

    fixture = TestBed.createComponent(SuporteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  it('preserva rotas principal, detalhe e item de menu de Suporte', () => {
    const rotaLista = PagesRoutes.find((item) => item.path === 'suporte');
    const rotaDetalhe = PagesRoutes.find((item) => item.path === 'suporte/:id');
    const menuItem = navItems.find((item) => item.route === '/page/suporte');

    expect(rotaLista?.component).toBe(SuporteComponent);
    expect(rotaDetalhe?.component).toBe(SuporteComponent);
    expect(menuItem?.displayName).toBe('Suporte');
  });

  it('carrega lista e detalhe do deep link sem duplicar requests', () => {
    setup({ initialId: 6 });

    expect(service.listar$).toHaveBeenCalledOnceWith(0, 50);
    expect(service.buscarPorId$).toHaveBeenCalledOnceWith(6);
    expect(component.chamadoSelecionado?.id).toBe(6);
  });

  it('ao selecionar chamado, atualiza URL e carrega detalhe uma única vez sem recarregar lista', () => {
    setup({ initialId: 6 });
    service.buscarPorId$.calls.reset();

    component.selecionarChamado(item7);
    expect(router.navigate).toHaveBeenCalledWith(['/page/suporte', 7], { replaceUrl: true });
    expect(service.buscarPorId$).not.toHaveBeenCalled();
    expect(service.listar$).toHaveBeenCalledTimes(1);

    paramMap$.next(convertToParamMap({ id: '7' }));

    expect(service.buscarPorId$).toHaveBeenCalledOnceWith(7);
    expect(service.listar$).toHaveBeenCalledTimes(1);
  });

  it('ignora resposta obsoleta quando outro detalhe foi solicitado depois', () => {
    const detalhe5$ = new Subject<ChamadoSuporteDetalhe>();
    const detalhe6$ = new Subject<ChamadoSuporteDetalhe>();
    setup({
      initialId: 5,
      listar: of(pagina([chamadoItem(5), item6], 2)),
      buscar: (id) => id === 5 ? detalhe5$.asObservable() : detalhe6$.asObservable(),
    });

    paramMap$.next(convertToParamMap({ id: '6' }));
    detalhe6$.next(chamadoDetalhe(6));
    detalhe6$.complete();
    detalhe5$.next(chamadoDetalhe(5));
    detalhe5$.complete();

    expect(component.chamadoSelecionado?.id).toBe(6);
  });

  it('não renderiza mensagens internas do suporte', () => {
    setup({
      initialId: 6,
      buscar: () => of(chamadoDetalhe(6, [
        mensagem(1, 'CLIENTE', 'Mensagem do cliente', false),
        mensagem(2, 'SUPORTE', 'Resposta pública', false),
        mensagem(3, 'SUPORTE', 'Nota interna', true),
      ])),
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Mensagem do cliente');
    expect(text).toContain('Resposta pública');
    expect(text).not.toContain('Nota interna');
  });

  it('usa InputPesquisa, InputOptions e empty states distintos', () => {
    setup({ initialId: null, listar: of(pagina([], 0)) });

    expect(fixture.debugElement.query(By.css('app-input-pesquisa'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-input-options'))).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Nenhum chamado aberto ainda.');

    component.chamados = [item6];
    component.aplicarFiltroBusca('inexistente');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhum chamado corresponde aos filtros atuais.');
  });

  it('usa totalItens para total geral e rotula abertos como itens da lista carregada', () => {
    setup({ initialId: null, listar: of(pagina([{ ...item6, status: 'FECHADO' }, item7], 100, 0, 2)) });

    expect(component.totalItens).toBe(100);
    expect(component.totalAbertosNestaLista).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('em andamento nesta lista');
  });

  it('carrega mais páginas, adiciona sem duplicar e preserva ordenação por atualização', () => {
    setup({ initialId: 6, listar: of(pagina([item6], 3, 0, 2)) });
    service.listar$.and.returnValue(of(pagina([item6, item7], 3, 1, 2)));

    component.carregarMais();

    expect(service.listar$).toHaveBeenCalledWith(1, 50);
    expect(component.chamados.map((item) => item.id)).toEqual([7, 6]);
  });

  it('retry de detalhe chama apenas o GET do chamado selecionado', () => {
    setup({
      initialId: 6,
      buscar: () => throwError(() => ({ userMessage: 'Falha detalhe' })),
    });
    service.buscarPorId$.calls.reset();

    component.retryDetalhe();

    expect(service.buscarPorId$).toHaveBeenCalledOnceWith(6);
    expect(service.listar$).toHaveBeenCalledTimes(1);
  });

  it('resposta usa form submit, bloqueia espaços em branco, evita duplo POST e preserva texto em erro', () => {
    const responder$ = new Subject<ChamadoSuporteDetalhe>();
    setup({ initialId: 6 });

    component.mensagemControl.setValue('   ');
    component.responderChamado();
    expect(service.responder$).not.toHaveBeenCalled();

    service.responder$.and.returnValue(responder$.asObservable());
    component.mensagemControl.setValue('  Mensagem válida  ');
    component.responderChamado();
    component.responderChamado();

    expect(service.responder$).toHaveBeenCalledOnceWith(6, { mensagem: 'Mensagem válida' });
    expect(component.salvandoResposta).toBeTrue();

    responder$.error({ userMessage: 'Falha resposta' });

    expect(component.mensagemControl.value).toBe('  Mensagem válida  ');
    expect(component.salvandoResposta).toBeFalse();
    expect(toastr.error).toHaveBeenCalledWith('Falha resposta');
  });

  it('novo chamado atualiza lista e navega sem recarregar lista nem detalhe quando rota sincroniza', () => {
    const novo = chamadoDetalhe(9);
    setup({ initialId: 6 });
    service.listar$.calls.reset();
    service.buscarPorId$.calls.reset();
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(novo) } as any);

    component.abrirNovoChamado();
    paramMap$.next(convertToParamMap({ id: '9' }));

    expect(router.navigate).toHaveBeenCalledWith(['/page/suporte', 9], { replaceUrl: true });
    expect(component.chamadoSelecionado?.id).toBe(9);
    expect(service.listar$).not.toHaveBeenCalled();
    expect(service.buscarPorId$).not.toHaveBeenCalled();
  });

  it('renderiza resposta em form nativo associado ao botão submit', () => {
    setup({ initialId: 6 });

    expect(fixture.nativeElement.querySelector('form')?.getAttribute('id')).toBe('resposta-chamado-form');
    expect(fixture.debugElement.query(By.css('app-input-textarea'))).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button[type="submit"]')?.getAttribute('form')).toBe('resposta-chamado-form');
  });
});

function pagina(
  itens: ChamadoSuporteListaItem[],
  totalItens = itens.length,
  paginaAtual = 0,
  totalPaginas = totalItens > itens.length ? 2 : 1
): ChamadoSuportePaginadoResponse {
  return {
    pagina: paginaAtual,
    tamanho: 50,
    totalItens,
    totalPaginas,
    itens,
  };
}

function chamadoItem(
  id: number,
  assunto = `Chamado ${id}`,
  status: ChamadoSuporteListaItem['status'] = 'ABERTO',
  atualizadoEm = `2026-09-29T1${id}:00:00`
): ChamadoSuporteListaItem {
  return {
    id,
    assunto,
    categoria: 'DUVIDA',
    prioridade: 'MEDIA',
    status,
    criadoEm: '2026-09-29T10:00:00',
    atualizadoEm,
    fechadoEm: null,
  };
}

function chamadoDetalhe(id: number, mensagens: MensagemChamadoSuporte[] = [mensagem(1, 'CLIENTE', 'Olá', false)]): ChamadoSuporteDetalhe {
  return {
    ...chamadoItem(id),
    usuarioSolicitanteId: 1,
    usuarioSolicitanteNome: 'Cliente',
    mensagens,
  };
}

function mensagem(
  id: number,
  autorTipo: MensagemChamadoSuporte['autorTipo'],
  texto: string,
  interna: boolean
): MensagemChamadoSuporte {
  return {
    id,
    autorUsuarioId: id,
    autorNome: autorTipo === 'CLIENTE' ? 'Cliente' : 'Suporte',
    autorTipo,
    mensagem: texto,
    interna,
    criadaEm: `2026-09-29T10:0${id}:00`,
  };
}
