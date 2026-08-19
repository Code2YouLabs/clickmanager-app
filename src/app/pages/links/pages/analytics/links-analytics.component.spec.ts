import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { of, throwError } from 'rxjs';
import { PaginaLinksResumo } from '../../models/links.models';
import { LinksService } from '../../services/links.service';
import { LinksAnalyticsComponent } from './links-analytics.component';

describe('LinksAnalyticsComponent', () => {
  let fixture: ComponentFixture<LinksAnalyticsComponent>;
  let linksService: jasmine.SpyObj<LinksService>;

  const paginas: PaginaLinksResumo[] = [
    {
      id: 7,
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

  beforeEach(async () => {
    linksService = jasmine.createSpyObj<LinksService>('LinksService', ['listarPaginas', 'buscarAnalytics']);
    linksService.listarPaginas.and.returnValue(of(paginas));
    linksService.buscarAnalytics.and.returnValue(of({
      periodo: '30d',
      visualizacoes: 120,
      cliques: 30,
      taxaClique: 25,
      ranking: [{ itemId: 1, tipo: 'WHATSAPP', titulo: 'Fale conosco', cliques: 20, percentual: 66.6 }],
    }));

    await TestBed.configureTestingModule({
      imports: [LinksAnalyticsComponent, TablerIconsModule.pick(TablerIcons)],
      providers: [
        provideNoopAnimations(),
        { provide: LinksService, useValue: linksService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LinksAnalyticsComponent);
    fixture.detectChanges();
  });

  it('pre-seleciona a primeira pagina e carrega metricas de 30 dias', () => {
    expect(fixture.componentInstance.paginaSelecionadaId).toBe(7);
    expect(linksService.buscarAnalytics).toHaveBeenCalledWith(7, '30d');
    expect(fixture.nativeElement.textContent).toContain('Visualizações');
    expect(fixture.nativeElement.textContent).toContain('Fale conosco');
  });

  it('recarrega analytics ao trocar pagina e periodo', () => {
    fixture.componentInstance.selecionarPagina(8);
    fixture.componentInstance.alterarPeriodo('7d');

    expect(linksService.buscarAnalytics).toHaveBeenCalledWith(8, '30d');
    expect(linksService.buscarAnalytics).toHaveBeenCalledWith(8, '7d');
  });

  it('exibe estado de erro quando analytics falha', () => {
    linksService.buscarAnalytics.and.returnValue(throwError(() => new Error('falha')));

    fixture.componentInstance.carregarAnalytics();
    fixture.detectChanges();

    expect(fixture.componentInstance.erro).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar as métricas.');
  });
});
