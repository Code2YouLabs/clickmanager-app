import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { CatalogoCategoria } from '../../catalogo/shared/models/catalogo.models';
import { CatalogoCategoriaService } from '../../catalogo/shared/services/catalogo.service';
import { GraficaCategoriasComponent } from './grafica-categorias.component';

describe('GraficaCategoriasComponent', () => {
  let fixture: ComponentFixture<GraficaCategoriasComponent>;
  let component: GraficaCategoriasComponent;
  let service: jasmine.SpyObj<CatalogoCategoriaService>;
  let router: jasmine.SpyObj<Router>;
  let toastr: jasmine.SpyObj<ToastrService>;

  const categoria = item(1, 'Impressão');

  beforeEach(() => {
    service = jasmine.createSpyObj('CatalogoCategoriaService', ['listar', 'listarTodas', 'excluir']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    toastr = jasmine.createSpyObj('ToastrService', ['success', 'error', 'warning']);
    service.listar.and.returnValue(of({ content: [categoria], pageNumber: 0, pageSize: 10, totalElements: 1, totalPages: 1, last: true }));
    service.listarTodas.and.returnValue(of([categoria, item(2, 'Couchê', 1)]));
    service.excluir.and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      imports: [GraficaCategoriasComponent, NoopAnimationsModule],
      providers: [
        { provide: CatalogoCategoriaService, useValue: service },
        { provide: Router, useValue: router },
        { provide: ToastrService, useValue: toastr },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(true) }) } },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', { temAlgumaPermissao: true }) },
      ],
    });

    fixture = TestBed.createComponent(GraficaCategoriasComponent);
    component = fixture.componentInstance;
    spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open')
      .and.returnValue({ afterClosed: () => of(true) } as never);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('editar pela lista e pela arvore usa a mesma navegacao', () => {
    component.executarAcaoCategoria('editar', categoria);
    component.onTreeAction({ action: 'editar', node: { id: categoria.id, label: categoria.nome, data: categoria } });

    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/categorias', 1, 'editar']);
    expect(router.navigate).toHaveBeenCalledTimes(2);
  });

  it('clonar pela lista e pela arvore usa o mesmo fluxo', () => {
    component.executarAcaoCategoria('clonar', categoria);
    component.onTreeAction({ action: 'clonar', node: { id: categoria.id, label: categoria.nome, data: categoria } });

    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/categorias/novo'], { queryParams: { cloneFrom: 1 } });
    expect(router.navigate).toHaveBeenCalledTimes(2);
  });

  it('excluir pela lista atualiza a lista pelo mesmo endpoint canonico', () => {
    component.visualizacao = 'lista';

    component.executarAcaoCategoria('excluir', categoria);

    expect(service.excluir).toHaveBeenCalledWith(1);
    expect(service.listar).toHaveBeenCalledWith(jasmine.objectContaining({ page: 0, size: 10, ativo: true }));
    expect(toastr.success).toHaveBeenCalledWith('Categoria excluída.');
  });

  it('excluir pela arvore atualiza a arvore a partir de categorias', () => {
    component.visualizacao = 'arvore';

    component.onTreeAction({ action: 'excluir', node: { id: categoria.id, label: categoria.nome, data: categoria } });

    expect(service.excluir).toHaveBeenCalledWith(1);
    expect(service.listarTodas).toHaveBeenCalledWith({ ativo: true, sort: 'nome,asc' });
    expect(component.categoriasArvore[0].children?.[0].label).toBe('Couchê');
  });

  it('troca lista e arvore sem manter base paralela', () => {
    component.carregar();
    expect(component.categorias).toEqual([categoria]);

    component.alterarVisualizacao('arvore');
    expect(service.listarTodas).toHaveBeenCalled();
    expect(component.categorias).toEqual([categoria, item(2, 'Couchê', 1)]);
    expect(component.categoriasArvore[0].children?.[0].label).toBe('Couchê');

    component.onSearch('couchê');
    expect(service.listarTodas).toHaveBeenCalledTimes(1);
    expect(component.categoriasArvore[0].label).toBe('Impressão');
    expect(component.categoriasArvore[0].children?.[0].label).toBe('Couchê');
  });

  it('arvore exibe nomes repetidos em ramos diferentes', () => {
    service.listarTodas.and.returnValue(of([
      item(1, 'Impressão'),
      item(2, 'Cartão de visitas'),
      item(3, 'Couchê 250g', 1),
      item(4, 'Couchê 250g', 2),
    ]));
    component.visualizacao = 'arvore';

    component.carregar();

    const impressao = component.categoriasArvore.find((node) => node.id === 1);
    const cartao = component.categoriasArvore.find((node) => node.id === 2);
    expect(impressao?.children?.[0].label).toBe('Couchê 250g');
    expect(cartao?.children?.[0].label).toBe('Couchê 250g');
  });

  it('mostra dependencias estruturadas com o mesmo tratamento de erro', () => {
    service.excluir.and.returnValue(throwError(() => ({
      error: {
        codigo: 'CATEGORIA_EM_USO',
        dependencias: {
          subcategorias: [{ id: 2, nome: 'Couchê' }],
          produtos: [{ id: 3, nome: 'Impressão A4' }],
        },
      },
    })));

    component.executarAcaoCategoria('excluir', categoria);

    expect(toastr.error).toHaveBeenCalledWith(
      jasmine.stringMatching(/Subcategorias.*Couchê.*Produtos.*Impressão A4/s),
      'Não é possível excluir "Impressão".',
      jasmine.objectContaining({ enableHtml: true })
    );
  });

  function item(id: number, nome: string, categoriaPaiId: number | null = null): CatalogoCategoria {
    return {
      id,
      codigo: nome.toUpperCase(),
      nome,
      slug: nome.toLowerCase(),
      categoriaPaiId,
      categoriaPaiNome: null,
      ativo: true,
    };
  }
});
