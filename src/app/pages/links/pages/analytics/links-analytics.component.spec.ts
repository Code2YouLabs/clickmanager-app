import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { Observable, of, Subject, throwError } from 'rxjs';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { LinksAnalyticsRankingItem, LinksAnalyticsResumo, PaginaLinksResumo, PeriodoAnalyticsLinks } from '../../models/links.models';
import { LinksService } from '../../services/links.service';
import { LinksAnalyticsComponent } from './links-analytics.component';

describe('LinksAnalyticsComponent', () => {
  let linksService: jasmine.SpyObj<LinksService>;

  const paginas: PaginaLinksResumo[] = [
    {
      id: 7,
      slug: 'santa-luzia',
      titulo: 'Santa Luzia',
      descricao: null,
      ativa: true,
      publicada: true,
      principal: true,
      tema: 'CLARO',
      corPrincipal: '#0D6EFD',
      corFundo: '#F6F8FB',
      formatoBotao: 'ARREDONDADO',
      quantidadeItens: 2,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 8,
      slug: 'campanha',
      titulo: 'Campanha',
      descricao: null,
      ativa: true,
      publicada: false,
      principal: false,
      tema: 'ESCURO',
      corPrincipal: '#0D6EFD',
      corFundo: '#111827',
      formatoBotao: 'SUAVE',
      quantidadeItens: 1,
      createdAt: '',
      updatedAt: '',
    },
  ];

  const analytics: LinksAnalyticsResumo = {
    periodo: '30d',
    visualizacoes: 1200,
    cliques: 345,
    taxaClique: 28.75,
    ranking: [
      { itemId: 1, tipo: 'WHATSAPP', titulo: 'Fale conosco', cliques: 200, percentual: 58 },
      { itemId: 2, tipo: 'GOOGLE_AVALIACOES', titulo: 'Avalie-nos', cliques: 145, percentual: 42 },
    ],
  };

  function setup(options: {
    paginas$?: Observable<PaginaLinksResumo[]>;
    analytics$?: Observable<LinksAnalyticsResumo>;
    buscarAnalytics?: (paginaId: number, periodo: PeriodoAnalyticsLinks) => Observable<LinksAnalyticsResumo>;
  } = {}): ComponentFixture<LinksAnalyticsComponent> {
    linksService = jasmine.createSpyObj<LinksService>('LinksService', ['listarPaginas', 'buscarAnalytics']);
    linksService.listarPaginas.and.returnValue(options.paginas$ || of(paginas));
    linksService.buscarAnalytics.and.callFake(options.buscarAnalytics || (() => options.analytics$ || of(analytics)));

    TestBed.configureTestingModule({
      imports: [LinksAnalyticsComponent, TablerIconsModule.pick(TablerIcons)],
      providers: [
        provideNoopAnimations(),
        { provide: LinksService, useValue: linksService },
      ],
    });

    const fixture = TestBed.createComponent(LinksAnalyticsComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('usa PageCard como header unico e nao renderiza footer de formulario', () => {
    const fixture = setup();

    expect(fixture.debugElement.queryAll(By.directive(PageCardComponent)).length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Analytics ClickLink');
    expect(fixture.nativeElement.textContent).toContain('Acompanhe acessos e cliques das suas páginas');
    expect(fixture.nativeElement.querySelector('app-card-header')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('app-card-header').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.page-card__footer')).toBeNull();
  });

  it('carrega paginas, seleciona a primeira e carrega analytics em 30 dias', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    expect(component.paginas).toEqual(paginas);
    expect(component.paginaSelecionadaId).toBe(7);
    expect(component.periodo).toBe('30d');
    expect(linksService.buscarAnalytics).toHaveBeenCalledOnceWith(7, '30d');
    expect(fixture.nativeElement.textContent).toContain('Fale conosco');
  });

  it('renderiza filtro de pagina com InputOptions compatível com id e titulo', () => {
    const fixture = setup();
    const inputOptions = fixture.debugElement.query(By.directive(InputOptionsComponent)).componentInstance as InputOptionsComponent;

    expect(inputOptions.options).toEqual(paginas);
    expect(inputOptions.labelKey).toBe('titulo');
    expect(inputOptions.valueKey).toBe('id');
    expect(inputOptions.showNull).toBeFalse();
  });

  it('mostra erro, retry e forbidden separados no carregamento de paginas', () => {
    const erro = { status: 500, error: { message: 'Falha paginas' } };
    linksService = jasmine.createSpyObj<LinksService>('LinksService', ['listarPaginas', 'buscarAnalytics']);
    linksService.listarPaginas.and.returnValues(throwError(() => erro), of(paginas));
    linksService.buscarAnalytics.and.returnValue(of(analytics));

    TestBed.configureTestingModule({
      imports: [LinksAnalyticsComponent, TablerIconsModule.pick(TablerIcons)],
      providers: [provideNoopAnimations(), { provide: LinksService, useValue: linksService }],
    });
    const fixture = TestBed.createComponent(LinksAnalyticsComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.erroPaginas).toBe('Falha paginas');
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar as páginas');
    expect(linksService.buscarAnalytics).not.toHaveBeenCalled();

    fixture.componentInstance.carregarPaginas();
    fixture.detectChanges();

    expect(fixture.componentInstance.erroPaginas).toBeNull();
    expect(fixture.componentInstance.paginas).toEqual(paginas);
    expect(linksService.buscarAnalytics).toHaveBeenCalledWith(7, '30d');
  });

  it('trata 403 de paginas como acesso restrito', () => {
    const fixture = setup({ paginas$: throwError(() => ({ status: 403 })) as any });

    expect(fixture.componentInstance.semPermissaoPaginas).toBeTrue();
    expect(fixture.componentInstance.erroPaginas).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(linksService.buscarAnalytics).not.toHaveBeenCalled();
  });

  it('mostra vazio quando nao ha paginas e nao chama analytics', () => {
    const fixture = setup({ paginas$: of([]) });

    expect(fixture.componentInstance.paginas).toEqual([]);
    expect(fixture.componentInstance.paginaSelecionadaId).toBeNull();
    expect(linksService.buscarAnalytics).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma página para analisar');
    expect(fixture.nativeElement.textContent).toContain('Crie uma página ClickLink para acompanhar visualizações e cliques.');
  });

  it('troca pagina e periodo preservando 7d e 30d e evita requests repetidos', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.selecionarPagina(7);
    component.alterarPeriodo('30d');
    expect(linksService.buscarAnalytics).toHaveBeenCalledTimes(1);

    component.selecionarPagina(8);
    component.alterarPeriodo('7d');
    component.alterarPeriodo('7d');
    component.alterarPeriodo('30d');

    expect(linksService.buscarAnalytics.calls.allArgs()).toEqual([
      [7, '30d'],
      [8, '30d'],
      [8, '7d'],
      [8, '30d'],
    ]);
  });

  it('descarta resposta antiga quando usuario troca rapidamente de pagina', () => {
    const primeiraResposta$ = new Subject<LinksAnalyticsResumo>();
    const segundaResposta$ = new Subject<LinksAnalyticsResumo>();
    const fixture = setup({
      buscarAnalytics: (paginaId: number) => paginaId === 7 ? primeiraResposta$.asObservable() : segundaResposta$.asObservable(),
    });
    const component = fixture.componentInstance;

    component.selecionarPagina(8);
    segundaResposta$.next({ ...analytics, visualizacoes: 800, ranking: [{ itemId: 3, tipo: 'LINK', titulo: 'Campanha', cliques: 80, percentual: 100 }] });
    segundaResposta$.complete();
    primeiraResposta$.next({ ...analytics, visualizacoes: 700, ranking: [{ itemId: 4, tipo: 'EMAIL', titulo: 'Antigo', cliques: 70, percentual: 100 }] });
    primeiraResposta$.complete();

    expect(component.paginaSelecionadaId).toBe(8);
    expect(component.analytics?.visualizacoes).toBe(800);
    expect(component.ranking()[0].titulo).toBe('Campanha');
  });

  it('descarta resposta antiga quando usuario troca rapidamente de periodo', () => {
    const resposta30Inicial$ = new Subject<LinksAnalyticsResumo>();
    const resposta7$ = new Subject<LinksAnalyticsResumo>();
    const resposta30Final$ = new Subject<LinksAnalyticsResumo>();
    let chamada30 = 0;
    const fixture = setup({
      buscarAnalytics: (_paginaId: number, periodo: PeriodoAnalyticsLinks) => {
        if (periodo === '7d') return resposta7$.asObservable();
        chamada30 += 1;
        return chamada30 === 1 ? resposta30Inicial$.asObservable() : resposta30Final$.asObservable();
      },
    });
    const component = fixture.componentInstance;

    component.alterarPeriodo('7d');
    component.alterarPeriodo('30d');
    resposta30Final$.next({ ...analytics, visualizacoes: 3000 });
    resposta30Final$.complete();
    resposta7$.next({ ...analytics, visualizacoes: 7000 });
    resposta7$.complete();
    resposta30Inicial$.next({ ...analytics, visualizacoes: 1000 });
    resposta30Inicial$.complete();

    expect(component.periodo).toBe('30d');
    expect(component.analytics?.visualizacoes).toBe(3000);
  });

  it('mantem paginas ao falhar analytics e retry recarrega somente metricas', () => {
    linksService = jasmine.createSpyObj<LinksService>('LinksService', ['listarPaginas', 'buscarAnalytics']);
    linksService.listarPaginas.and.returnValue(of(paginas));
    linksService.buscarAnalytics.and.returnValues(
      throwError(() => ({ status: 500, error: { message: 'Falha metricas' } })),
      of(analytics),
    );
    TestBed.configureTestingModule({
      imports: [LinksAnalyticsComponent, TablerIconsModule.pick(TablerIcons)],
      providers: [provideNoopAnimations(), { provide: LinksService, useValue: linksService }],
    });
    const fixture = TestBed.createComponent(LinksAnalyticsComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.paginas).toEqual(paginas);
    expect(fixture.componentInstance.erroAnalytics).toBe('Falha metricas');
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar as métricas');

    fixture.componentInstance.carregarAnalytics();
    fixture.detectChanges();

    expect(linksService.listarPaginas).toHaveBeenCalledTimes(1);
    expect(linksService.buscarAnalytics).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.analytics).toEqual(analytics);
  });

  it('trata 403 de analytics como acesso restrito sem remover paginas', () => {
    const fixture = setup({ analytics$: throwError(() => ({ status: 403 })) as any });

    expect(fixture.componentInstance.paginas).toEqual(paginas);
    expect(fixture.componentInstance.semPermissaoAnalytics).toBeTrue();
    expect(fixture.componentInstance.erroAnalytics).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Você não possui permissão para visualizar as métricas desta página.');
  });

  it('mantem zero como valor valido nas metricas', () => {
    const fixture = setup({
      analytics$: of({ periodo: '30d', visualizacoes: 0, cliques: 0, taxaClique: 0, ranking: [] }),
    });
    const text = fixture.nativeElement.textContent;

    expect(fixture.componentInstance.analytics?.visualizacoes).toBe(0);
    expect(text).toContain('Visualizações');
    expect(text).toContain('Cliques');
    expect(text).toContain('Taxa de clique');
    expect(text).toContain('0,0%');
    expect(text).toContain('Ainda não há cliques neste período.');
  });

  it('formata metricas em pt-BR', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    expect(component.numeroFormatado(1234567)).toBe('1.234.567');
    expect(component.percentualFormatado(12.345)).toBe('12,3%');
    expect(fixture.nativeElement.textContent).toContain('1.200');
    expect(fixture.nativeElement.textContent).toContain('345');
    expect(fixture.nativeElement.textContent).toContain('28,8%');
  });

  it('renderiza ranking com SectionCard e DataTable sem paginacao ou busca', () => {
    const fixture = setup();
    const section = fixture.debugElement.query(By.directive(SectionCardComponent));
    const table = fixture.debugElement.query(By.directive(DataTableComponent)).componentInstance as DataTableComponent<LinksAnalyticsRankingItem>;

    expect(section.nativeElement.textContent).toContain('Desempenho dos links');
    expect(section.nativeElement.textContent).toContain('Ranking por cliques no período selecionado.');
    expect(table.columns.map((column) => column.label)).toEqual(['Link', 'Tipo', 'Cliques']);
    expect(table.data).toEqual(analytics.ranking);
    expect(table.pagination).toBeNull();
    expect(table.search.enabled).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('WhatsApp');
    expect(fixture.nativeElement.textContent).toContain('Avaliações do Google');
    expect(fixture.nativeElement.textContent).not.toContain('Percentual');
  });

  it('usa a mesma fonte de dados do DataTable sem lista mobile paralela', () => {
    const fixture = setup();
    const table = fixture.debugElement.query(By.directive(DataTableComponent)).componentInstance as DataTableComponent<LinksAnalyticsRankingItem>;

    expect(table.data).toBe(fixture.componentInstance.ranking());
    expect(fixture.nativeElement.querySelector('.links-items-mobile')).toBeNull();
    expect(fixture.nativeElement.querySelector('.links-ranking-table')).toBeNull();
  });
});
