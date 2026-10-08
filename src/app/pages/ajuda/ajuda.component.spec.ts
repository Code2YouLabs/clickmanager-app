import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { AuthService } from 'src/app/services/auth.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import { PRIMEIRO_PEDIDO_JORNADA } from 'src/app/shared/jornadas/jornada.constants';
import { JornadaProgressoResponse } from 'src/app/shared/jornadas/jornada.models';
import { JornadaService } from 'src/app/shared/jornadas/jornada.service';
import { ToastrService } from 'ngx-toastr';
import { AjudaComponent } from './ajuda.component';
import { PagesRoutes } from '../pages.routes';

describe('AjudaComponent', () => {
  let fixture: ComponentFixture<AjudaComponent>;
  let component: AjudaComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let featureFlagService: jasmine.SpyObj<FeatureFlagService>;
  let jornadaService: jasmine.SpyObj<JornadaService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let router: jasmine.SpyObj<Router>;
  let fragment$: BehaviorSubject<string | null>;
  let usuario$: BehaviorSubject<any>;

  function setup(options: {
    tipoEmpresa?: TipoEmpresa;
    features?: Record<string, boolean>;
    fragment?: string | null;
    jornadas?: JornadaProgressoResponse[];
    jornadasErro?: boolean;
  } = {}): void {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getTipoEmpresa', 'temPermissao']);
    featureFlagService = jasmine.createSpyObj<FeatureFlagService>('FeatureFlagService', ['carregar', 'isEnabled']);
    jornadaService = jasmine.createSpyObj<JornadaService>('JornadaService', ['listar', 'iniciar', 'reiniciar']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['error']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    fragment$ = new BehaviorSubject<string | null>(options.fragment ?? null);
    usuario$ = new BehaviorSubject({
      id: 7,
      empresa: { id: 10, tipoEmpresa: options.tipoEmpresa ?? TipoEmpresa.GRAFICA },
    });

    (authService as any).usuario$ = usuario$.asObservable();
    authService.getTipoEmpresa.and.callFake((usuario?: any) =>
      usuario?.empresa?.tipoEmpresa ?? options.tipoEmpresa ?? TipoEmpresa.GRAFICA
    );
    authService.temPermissao.and.returnValue(true);
    featureFlagService.carregar.and.returnValue(of(options.features ?? {}));
    jornadaService.listar.and.returnValue(options.jornadasErro
      ? throwError(() => new Error('falha'))
      : of(options.jornadas ?? [progresso('NAO_INICIADO')]));
    jornadaService.iniciar.and.returnValue(of(progresso('EM_ANDAMENTO', { etapaAtual: 'inicio' })));
    jornadaService.reiniciar.and.returnValue(of(progresso('EM_ANDAMENTO', { etapaAtual: 'inicio', contexto: null })));

    TestBed.configureTestingModule({
      imports: [AjudaComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: FeatureFlagService, useValue: featureFlagService },
        { provide: JornadaService, useValue: jornadaService },
        { provide: ToastrService, useValue: toastr },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            fragment: fragment$.asObservable(),
            snapshot: { fragment: options.fragment ?? null },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(AjudaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  it('mantém a rota compartilhada sem permissão específica', () => {
    const rota = PagesRoutes.find(item => item.path === 'ajuda');

    expect(rota?.component).toBe(AjudaComponent);
    expect(rota?.data?.['allowedEmpresaTipos']).toEqual([TipoEmpresa.GRAFICA, TipoEmpresa.DEPOSITO]);
    expect(rota?.data?.['requiredPermission']).toBeUndefined();
  });

  it('usa PageCard, SectionCard, InputPesquisa e CTA de suporte', () => {
    setup();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('app-page-card')).toBeTruthy();
    expect(html.querySelector('app-section-card')).toBeTruthy();
    expect(html.querySelector('app-input-pesquisa')).toBeTruthy();
    expect(html.textContent).toContain('Falar com o suporte');
  });

  it('remove tópicos gráficos e SmartCalc para empresa depósito', () => {
    setup({ tipoEmpresa: TipoEmpresa.DEPOSITO, features: { SMARTCALC: true, GRAFICA: true } });

    const ids = component.visibleSecoes.map(secao => secao.id);
    expect(ids).toContain('catalogo-deposito');
    expect(ids).toContain('clientes');
    expect(ids).not.toContain('smartcalc');
    expect(ids).not.toContain('primeiro-pedido');
    expect(ids).not.toContain('produtos');
    expect(ids).not.toContain('acabamentos');
    expect(ids).not.toContain('status-pedido');
  });

  it('oculta módulo com feature explicitamente desativada sem esconder tópicos desconhecidos', () => {
    setup({ tipoEmpresa: TipoEmpresa.GRAFICA, features: { SMARTCALC: false } });

    const ids = component.visibleSecoes.map(secao => secao.id);
    expect(ids).not.toContain('smartcalc');
    expect(ids).toContain('produtos');
    expect(ids).toContain('funcionarios');
  });

  it('exibe tutorial Primeiro Pedido para gráfica compatível e respeita feature/permissões', () => {
    setup({ tipoEmpresa: TipoEmpresa.GRAFICA, features: { GRAFICA: true } });

    expect(component.visibleSecoes.map(secao => secao.id)).toContain('primeiro-pedido');

    authService.temPermissao.and.callFake((permissao: string) => permissao !== 'PEDIDOS_CADASTRAR');
    expect(component.visibleSecoes.map(secao => secao.id)).not.toContain('primeiro-pedido');

    fixture.destroy();
    TestBed.resetTestingModule();
    setup({ tipoEmpresa: TipoEmpresa.GRAFICA, features: { GRAFICA: false } });
    expect(component.visibleSecoes.map(secao => secao.id)).not.toContain('primeiro-pedido');
  });

  it('deriva tópicos rápidos dos metadados visíveis', () => {
    setup({ tipoEmpresa: TipoEmpresa.DEPOSITO });

    const quickIds = component.quickTopics.map(topic => topic.id);
    expect(quickIds).toContain('catalogo-deposito');
    expect(quickIds).toContain('orcamentos-deposito');
    expect(quickIds).not.toContain('smartcalc');
  });

  it('normaliza busca por acento, caixa e espaços extras', () => {
    setup({ tipoEmpresa: TipoEmpresa.GRAFICA });

    component.onPesquisar('   configuracao   folha   ');

    expect(component.filteredSecoes.map(secao => secao.id)).toEqual(['folha-configuracao']);
    expect(component.expandedId).toBe('folha-configuracao');
  });

  it('busca em detalhes internos e palavras-chave', () => {
    setup({ tipoEmpresa: TipoEmpresa.GRAFICA });

    component.onPesquisar('quinto dia util');

    expect(component.filteredSecoes.map(secao => secao.id)).toEqual(['folha-configuracao']);
  });

  it('inclui tutorial na busca existente', () => {
    setup({ tipoEmpresa: TipoEmpresa.GRAFICA, features: { GRAFICA: true } });

    component.onPesquisar('primeiro pedido');

    expect(component.filteredSecoes.map(secao => secao.id)).toContain('primeiro-pedido');
  });

  it('mostra ação conforme estado da jornada', () => {
    for (const [status, label] of [
      ['NAO_INICIADO', 'Iniciar'],
      ['EM_ANDAMENTO', 'Continuar'],
      ['CONCLUIDO', 'Refazer'],
      ['IGNORADO', 'Iniciar'],
      ['ABANDONADO', 'Reiniciar'],
    ] as const) {
      setup({ jornadas: [progresso(status)] });
      const secao = component.visibleSecoes.find(item => item.id === 'primeiro-pedido')!;

      expect(component.statusTutorial(secao)).toBe(status);
      expect(component.acaoTutorialLabel(secao)).toBe(label);

      fixture.destroy();
      TestBed.resetTestingModule();
    }
  });

  it('inicia tutorial e navega apenas após sucesso', () => {
    setup({ jornadas: [progresso('NAO_INICIADO')] });
    const secao = component.visibleSecoes.find(item => item.id === 'primeiro-pedido')!;

    component.executarTutorial(secao);

    expect(jornadaService.iniciar).toHaveBeenCalledWith(PRIMEIRO_PEDIDO_JORNADA, { etapa: 'inicio' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/page/grafica/comercial/pedidos');
  });

  it('continua sem reiniciar e preserva checkpoint/contexto no backend', () => {
    setup({ jornadas: [progresso('EM_ANDAMENTO', { etapaAtual: 'pedido_criado', contexto: { pedidoId: 42 } })] });
    const secao = component.visibleSecoes.find(item => item.id === 'primeiro-pedido')!;

    component.executarTutorial(secao);

    expect(jornadaService.iniciar).not.toHaveBeenCalled();
    expect(jornadaService.reiniciar).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/page/grafica/comercial/pedidos');
  });

  it('refaz jornada concluida usando reiniciar e sem reutilizar contexto antigo', () => {
    setup({ jornadas: [progresso('CONCLUIDO', { contexto: { pedidoId: 99 } })] });
    spyOn(window, 'confirm').and.returnValue(true);
    const secao = component.visibleSecoes.find(item => item.id === 'primeiro-pedido')!;

    component.executarTutorial(secao);

    expect(jornadaService.reiniciar).toHaveBeenCalledWith(PRIMEIRO_PEDIDO_JORNADA, { etapa: 'inicio' });
    expect(component.progressoTutorial(secao)?.contexto).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/page/grafica/comercial/pedidos');
  });

  it('inicia jornada ignorada e reinicia jornada abandonada', () => {
    setup({ jornadas: [progresso('IGNORADO')] });
    let secao = component.visibleSecoes.find(item => item.id === 'primeiro-pedido')!;

    component.executarTutorial(secao);
    expect(jornadaService.iniciar).toHaveBeenCalledWith(PRIMEIRO_PEDIDO_JORNADA, { etapa: 'inicio' });

    fixture.destroy();
    TestBed.resetTestingModule();
    setup({ jornadas: [progresso('ABANDONADO', { contexto: { pedidoId: 7 } })] });
    spyOn(window, 'confirm').and.returnValue(true);
    secao = component.visibleSecoes.find(item => item.id === 'primeiro-pedido')!;

    component.executarTutorial(secao);
    expect(jornadaService.reiniciar).toHaveBeenCalledWith(PRIMEIRO_PEDIDO_JORNADA, { etapa: 'inicio' });
  });

  it('falha de jornadas nao derruba guias estaticos e permite retry', () => {
    setup({ jornadasErro: true });

    expect(component.erroJornadas).toBeTrue();
    expect(component.visibleSecoes.map(secao => secao.id)).toContain('clientes');
    expect(component.statusTutorialLabel(component.visibleSecoes.find(item => item.id === 'primeiro-pedido')!))
      .toBe('Estado indisponível');

    jornadaService.listar.and.returnValue(of([progresso('EM_ANDAMENTO')]));
    component.recarregarJornadas();

    expect(component.erroJornadas).toBeFalse();
    expect(component.statusTutorial(component.visibleSecoes.find(item => item.id === 'primeiro-pedido')!)).toBe('EM_ANDAMENTO');
  });

  it('falha ao iniciar ou reiniciar nao navega e permite nova tentativa', () => {
    setup({ jornadas: [progresso('NAO_INICIADO')] });
    jornadaService.iniciar.and.returnValue(throwError(() => new Error('falha')));
    const secao = component.visibleSecoes.find(item => item.id === 'primeiro-pedido')!;

    component.executarTutorial(secao);

    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(toastr.error).toHaveBeenCalled();
    expect(component.acaoTutorialEmAndamento).toBeNull();
  });

  it('recarrega progresso ao trocar empresa', () => {
    setup({ jornadas: [progresso('NAO_INICIADO')] });
    jornadaService.listar.calls.reset();

    usuario$.next({ id: 7, empresa: { id: 20, tipoEmpresa: TipoEmpresa.GRAFICA } });

    expect(jornadaService.listar).toHaveBeenCalled();
  });

  it('ignora fragmento invisível no segmento atual', () => {
    setup({ tipoEmpresa: TipoEmpresa.DEPOSITO, fragment: 'smartcalc', features: { SMARTCALC: true } });

    expect(component.expandedId).toBeNull();
  });

  it('resolve alias de fragmento somente para tópico visível', () => {
    setup({ tipoEmpresa: TipoEmpresa.DEPOSITO, fragment: 'catalogo' });

    expect(component.expandedId).toBe('catalogo-deposito');
  });

  it('atualiza fragmento ao abrir tópico rápido visível', () => {
    setup({ tipoEmpresa: TipoEmpresa.GRAFICA });

    component.abrirTopico({ id: 'clientes', label: 'Clientes', icon: 'groups' });

    expect(component.expandedId).toBe('clientes');
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      fragment: 'clientes',
      queryParamsHandling: 'preserve',
    }));
  });

  it('exibe estado vazio com limpar busca e suporte', () => {
    setup();

    component.onPesquisar('assunto inexistente');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Não encontramos ajuda para "assunto inexistente"');
    expect(fixture.nativeElement.textContent).toContain('Limpar busca');
    expect(fixture.nativeElement.textContent).toContain('Falar com o suporte');

    component.limparBusca();

    expect(component.filtro).toBe('');
    expect(component.pesquisaControl.value).toBe('');
  });
});

function progresso(
  status: JornadaProgressoResponse['status'],
  overrides: Partial<JornadaProgressoResponse> = {},
): JornadaProgressoResponse {
  return {
    jornada: 'PRIMEIRO_PEDIDO',
    versao: 1,
    status,
    etapaAtual: status === 'EM_ANDAMENTO' ? 'inicio' : null,
    ...overrides,
  };
}
