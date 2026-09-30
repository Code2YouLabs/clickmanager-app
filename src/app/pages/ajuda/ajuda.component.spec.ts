import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { AuthService } from 'src/app/services/auth.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import { AjudaComponent } from './ajuda.component';
import { PagesRoutes } from '../pages.routes';

describe('AjudaComponent', () => {
  let fixture: ComponentFixture<AjudaComponent>;
  let component: AjudaComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let featureFlagService: jasmine.SpyObj<FeatureFlagService>;
  let router: jasmine.SpyObj<Router>;
  let fragment$: BehaviorSubject<string | null>;

  function setup(options: {
    tipoEmpresa?: TipoEmpresa;
    features?: Record<string, boolean>;
    fragment?: string | null;
  } = {}): void {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getTipoEmpresa', 'temPermissao']);
    featureFlagService = jasmine.createSpyObj<FeatureFlagService>('FeatureFlagService', ['carregar', 'isEnabled']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    fragment$ = new BehaviorSubject<string | null>(options.fragment ?? null);

    authService.getTipoEmpresa.and.returnValue(options.tipoEmpresa ?? TipoEmpresa.GRAFICA);
    authService.temPermissao.and.returnValue(true);
    featureFlagService.carregar.and.returnValue(of(options.features ?? {}));

    TestBed.configureTestingModule({
      imports: [AjudaComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: FeatureFlagService, useValue: featureFlagService },
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
