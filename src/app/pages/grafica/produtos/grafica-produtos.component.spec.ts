import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of } from 'rxjs';
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
      'listarAcabamentos',
      'listarServicos',
      'listarPrecos',
      'excluir',
    ]);
    router = jasmine.createSpyObj('Router', ['navigate']);
    service.listar.and.returnValue(of({ content: [], pageNumber: 0, pageSize: 10, totalElements: 0, totalPages: 0, last: true }));
    service.listarMateriais.and.returnValue(of([{ id: 1, codigo: 'COUCHE', nome: 'Couchê 150g', ativo: true }]));
    service.listarFormatos.and.returnValue(of([{ id: 2, codigo: '10X15', nome: '10x15', ativo: true }]));
    service.listarCores.and.returnValue(of([{ id: 3, codigo: '4X4', nome: '4x4', ativo: true }]));
    service.listarAcabamentos.and.returnValue(of([{ id: 4, codigo: 'LAMINACAO', nome: 'Laminação', ativo: true }]));
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
      acabamentoIds: [4],
      servicoIds: [5],
    });
    expect(service.listar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
      materialIds: [1],
      formatoIds: [2],
      corIds: [3, 6],
      acabamentoIds: [4],
      servicoIds: [5],
    }));

    component.onPageChange({ pageIndex: 2, pageSize: 20, length: 100 });
    expect(service.listar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ page: 2, size: 20 }));

    component.onSortChange({ active: 'nome', direction: 'desc' });
    expect(service.listar.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ page: 0, sort: 'nome,desc' }));
  });

  it('executa acoes de configurar e excluir fora da tabela generica', () => {
    const row = { id: 1, catalogoProdutoId: 10, catalogoProdutoNome: 'Panfleto', ativo: true, acabamentos: [], servicos: [], parametros: [] };
    spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open').and.returnValue({ afterClosed: () => of(true) } as never);

    component.configurar(row);
    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/produtos', 1, 'editar']);

    component.excluir(row);
    expect(service.excluir).toHaveBeenCalledWith(1);
  });

  it('limpa filtros sem acoplar regra de dominio na tabela', () => {
    component.filterState = { materialId: 1, acabamentoIds: [4] };
    component.pagina = 2;

    component.onFilterChange({});

    expect(component.filterState).toEqual({});
    expect(component.pagina).toBe(0);
  });
});
