import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { GraficaProdutoService } from '../shared/grafica.service';
import { GraficaProdutosComponent } from './grafica-produtos.component';

describe('GraficaProdutosComponent', () => {
  let fixture: ComponentFixture<GraficaProdutosComponent>;
  let component: GraficaProdutosComponent;
  let service: jasmine.SpyObj<GraficaProdutoService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    service = jasmine.createSpyObj('GraficaProdutoService', [
      'listar',
      'listarMateriais',
      'listarFormatos',
      'listarCores',
      'listarServicos',
      'listarPrecos',
      'excluir',
    ]);
    router = jasmine.createSpyObj('Router', ['navigate']);
    service.listar.and.returnValue(of({ content: [], pageNumber: 0, pageSize: 10, totalElements: 0, totalPages: 0, last: true }));
    service.listarMateriais.and.returnValue(of([{ id: 1, codigo: 'COUCHE', nome: 'Couchê 150g', ativo: true }]));
    service.listarFormatos.and.returnValue(of([{ id: 2, codigo: '10X15', nome: '10x15', ativo: true }]));
    service.listarCores.and.returnValue(of([{ id: 3, codigo: '4X4', nome: '4x4', ativo: true }]));
    service.listarServicos.and.returnValue(of([{ id: 5, codigo: 'CRIACAO', nome: 'Criação', ativo: true }]));
    service.listarPrecos.and.returnValue(of([]));
    service.excluir.and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      imports: [GraficaProdutosComponent, NoopAnimationsModule],
      providers: [
        { provide: GraficaProdutoService, useValue: service },
        { provide: Router, useValue: router },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(true) }) } },
      ],
    });

    fixture = TestBed.createComponent(GraficaProdutosComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('carrega produtos e opcoes de filtro no init', () => {
    fixture.detectChanges();

    expect(service.listar).toHaveBeenCalledWith(jasmine.objectContaining({ page: 0, size: 10, sort: 'nome,asc' }));
    expect(service.listarMateriais).toHaveBeenCalled();
    expect(component.tableFilters.find((filter) => filter.key === 'materialIds')?.options[0].label).toBe('Couchê 150g');
    expect(component.tableFilters.find((filter) => filter.key === 'materialIds')?.type).toBe('multi-select');
    expect(component.tableFilters.find((filter) => filter.key === 'corIds')?.width).toBe('140px');
  });

  it('envia busca, filtros, paginacao e ordenacao para o backend', () => {
    component.pagina = 3;

    component.onSearch('panfleto');
    expect(component.pagina).toBe(0);
    expect(service.listar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ search: 'panfleto' }));

    component.onFilterChange({
      materialIds: [1],
      formatoIds: [2],
      corIds: [3, 6],
    });
    expect(service.listar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
      materialIds: [1],
      formatoIds: [2],
      corIds: [3, 6],
    }));

    component.onPageChange({ pageIndex: 2, pageSize: 20, length: 100 });
    expect(service.listar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ page: 2, size: 20 }));

    component.onSortChange({ active: 'nome', direction: 'desc' });
    expect(service.listar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ page: 0, sort: 'nome,desc' }));
  });

  it('executa acoes de configurar e excluir fora da tabela generica', () => {
    const row = { id: 1, catalogoProdutoId: 10, catalogoProdutoNome: 'Panfleto', ativo: true, acabamentos: [], parametros: [] };
    spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open').and.returnValue({ afterClosed: () => of(true) } as never);

    component.configurar(row);
    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/produtos', 1, 'editar']);

    component.excluir(row);
    expect(service.excluir).toHaveBeenCalledWith(1);
  });

  it('confirma clone e navega para cadastro com produto base', () => {
    const row = { id: 1, catalogoProdutoId: 10, catalogoProdutoNome: 'Panfleto', ativo: true, acabamentos: [], parametros: [] };
    const dialog = (component as unknown as { dialog: MatDialog }).dialog;
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(true) } as never);

    component.clonar(row);

    expect(dialog.open).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({
      data: jasmine.objectContaining({
        title: 'Clonar produto',
        message: 'Deseja realmente usar "Panfleto" como base para criar um novo produto?',
        confirmText: 'Clonar',
      }),
    }));
    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/produtos/novo'], { queryParams: { cloneFrom: 1 } });
  });

  it('cancela confirmacao de clone sem navegar', () => {
    const row = { id: 1, catalogoProdutoId: 10, catalogoProdutoNome: 'Panfleto', ativo: true, acabamentos: [], parametros: [] };
    spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open').and.returnValue({ afterClosed: () => of(false) } as never);

    component.clonar(row);

    expect(router.navigate).not.toHaveBeenCalledWith(['/page/grafica/produtos/novo'], jasmine.anything());
  });

  it('limpa filtros sem acoplar regra de dominio na tabela', () => {
    component.filterState = { materialId: 1 };
    component.pagina = 2;

    component.onFilterChange({});

    expect(component.filterState).toEqual({});
    expect(component.pagina).toBe(0);
  });

  it('resume categoria pelo caminho da arvore com ultimo nivel em destaque', () => {
    const row = {
      id: 1,
      catalogoProdutoId: 10,
      catalogoProdutoNome: 'Panfleto',
      catalogoCategoriaNome: 'Cartões',
      catalogoCategoriaCaminho: ['Gráfica', 'Impressão', 'Offset', 'Cartões', 'Cartão 4x4'],
      ativo: true,
      acabamentos: [],
      parametros: [],
    };

    const resumo = component.categoriaResumo(row);

    expect(resumo).toEqual([{
      partes: ['Impressão', 'Offset', 'Cartões', 'Cartão 4x4'],
      truncada: true,
    }]);
    expect(component.categoriaTitulo(resumo[0])).toBe('... Impressão -> Offset -> Cartões -> Cartão 4x4');
  });

  it('limita categorias em cinco linhas e informa excedente para multiplos caminhos futuros', () => {
    const row = {
      id: 1,
      catalogoProdutoId: 10,
      catalogoProdutoNome: 'Panfleto',
      catalogoCategoriasCaminhos: [
        ['C1'],
        ['C2'],
        ['C3'],
        ['C4'],
        ['C5'],
        ['C6'],
        ['C7'],
      ],
      ativo: true,
      acabamentos: [],
      parametros: [],
    };

    expect(component.categoriaResumo(row).map((linha) => linha.partes.join(''))).toEqual(['C3', 'C4', 'C5', 'C6', 'C7']);
    expect(component.categoriaExcedente(row)).toBe(2);
  });

  it('usa nome da categoria atual como fallback quando caminho nao vem do backend', () => {
    const row = {
      id: 1,
      catalogoProdutoId: 10,
      catalogoProdutoNome: 'Panfleto',
      catalogoCategoriaNome: 'Impressão',
      ativo: true,
      acabamentos: [],
      parametros: [],
    };

    expect(component.categoriaResumo(row)).toEqual([{ partes: ['Impressão'], truncada: false }]);
  });
  it('mostra erro inicial com retry em vez de vazio', () => {
    service.listar.and.returnValue(throwError(() => ({ status: 500 })));
    fixture.detectChanges();
    expect(component.erroCarregamento).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Nenhum produto gráfico encontrado');
    service.listar.and.returnValue(of({ content: [], pageNumber: 0, pageSize: 10, totalElements: 0, totalPages: 0, last: true }));
    fixture.nativeElement.querySelector('[role=alert] button').click(); fixture.detectChanges();
    expect(component.erroCarregamento).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Nenhum produto gráfico encontrado');
  });
  it('preserva dados e totais se uma atualizacao falhar', () => {
    component.produtos = [{ id: 1, catalogoProdutoId: 10, catalogoProdutoNome: 'Panfleto', ativo: true, acabamentos: [], parametros: [] }];
    component.total = 25;
    const response = new Subject<any>(); service.listar.and.returnValue(response);
    component.carregar(); expect(component.carregando).toBeTrue(); expect(component.produtos.length).toBe(1);
    response.error({ status: 500 });
    expect(component.produtos.length).toBe(1); expect(component.total).toBe(25); expect(component.erroCarregamento).toBeTruthy();
  });
  it('apresenta 403 como acesso restrito sem tabela nem retry', () => {
    service.listar.and.returnValue(throwError(() => ({ status: 403 }))); fixture.detectChanges();
    expect(component.acessoNegado).toBeTrue(); expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(fixture.nativeElement.querySelector('table')).toBeNull(); expect(fixture.nativeElement.querySelector('[role=alert] button')).toBeNull();
  });
  it('ignora respostas obsoletas de busca sem alterar endpoints', () => {
    const old = new Subject<any>(); service.listar.and.returnValue(old); component.onSearch('primeira');
    const current = new Subject<any>(); service.listar.and.returnValue(current); component.onSearch('segunda');
    current.next({ content: [], totalElements: 2 }); old.next({ content: [], totalElements: 99 });
    expect(component.total).toBe(2); expect(component.searchConfig.value).toBe('segunda');
  });

});
