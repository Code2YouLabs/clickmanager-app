import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { CatalogoCategoriaService } from '../../catalogo/shared/services/catalogo.service';
import { DepositoImagemService } from '../../deposito/services/deposito-imagem.service';
import { GraficaProdutoService } from '../shared/grafica.service';
import { GraficaProdutoFormComponent } from './grafica-produto-form.component';

describe('GraficaProdutoFormComponent', () => {
  let fixture: ComponentFixture<GraficaProdutoFormComponent>;
  let component: GraficaProdutoFormComponent;
  let router: jasmine.SpyObj<Router>;
  let routeSnapshot: any;
  let graficaService: jasmine.SpyObj<GraficaProdutoService>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    routeSnapshot = {
      paramMap: { get: () => null },
      queryParamMap: { get: () => null },
    };
    graficaService = jasmine.createSpyObj('GraficaProdutoService', [
      'detalhar',
      'listarPrecos',
      'listarMateriais',
      'listarFormatos',
      'listarCores',
    ]);
    graficaService.detalhar.and.returnValue(of(produtoGrafico()));
    graficaService.listarPrecos.and.returnValue(of([]));
    graficaService.listarMateriais.and.returnValue(of([{ id: 1, codigo: 'COUCHE', nome: 'Couchê 150g', ativo: true }]));
    graficaService.listarFormatos.and.returnValue(of([{ id: 2, codigo: '10X15', nome: '10x15', ativo: true }]));
    graficaService.listarCores.and.returnValue(of([{ id: 3, codigo: '4X4', nome: '4x4', ativo: true }]));

    TestBed.configureTestingModule({
      imports: [GraficaProdutoFormComponent, NoopAnimationsModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: routeSnapshot } },
        { provide: Router, useValue: router },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error', 'warning']) },
        { provide: GraficaProdutoService, useValue: graficaService },
        { provide: CatalogoCategoriaService, useValue: { options: () => of([]) } },
        { provide: DepositoImagemService, useValue: {} },
      ],
    });

    fixture = TestBed.createComponent(GraficaProdutoFormComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('define titulo e subtitulo conforme modo da tela', () => {
    expect(component.titulo).toBe('Novo Produto');
    expect(component.subtitulo).toBe('Cadastro de produto gráfico');

    component.isEdit = true;

    expect(component.titulo).toBe('Editar Produto');
    expect(component.subtitulo).toBe('Atualize os dados do produto');
  });

  it('restaura o snapshot local ao cancelar sem navegar', () => {
    component.form.patchValue({
      nome: 'Panfleto',
      descricao: 'Panfleto promocional',
      exibirNoSite: true,
      materialId: 1,
    });
    component.precoForm.patchValue({ tipo: 'FIXO' });
    component.precoForm.addControl('valor', new FormControl(25));
    (component as any).registrarSnapshot();

    component.form.patchValue({
      nome: 'Cartão',
      descricao: 'Alterado',
      exibirNoSite: false,
      materialId: null,
    });
    component.precoForm.patchValue({ valor: 80 });

    component.cancelar();

    expect(component.form.getRawValue()).toEqual(jasmine.objectContaining({
      nome: 'Panfleto',
      descricao: 'Panfleto promocional',
      exibirNoSite: true,
      materialId: 1,
    }));
    expect(component.precoForm.getRawValue()).toEqual(jasmine.objectContaining({ tipo: 'FIXO', valor: 25 }));
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('monta payload simplificado criando produto do catalogo internamente', () => {
    component.form.patchValue({
      nome: 'Xerox PB',
      descricao: '',
      categoriaId: 10,
      exibirNoSite: false,
      corId: 3,
    });
    component.imagemPrincipal = { id: 50 };
    component.galeria = [{ id: 51 }, { id: 50 }];

    const payload = (component as any).produtoPayload();

    expect(payload.catalogoProdutoId).toBeNull();
    expect(payload.ativo).toBeTrue();
    expect(payload.produto).toEqual(jasmine.objectContaining({
      nome: 'Xerox PB',
      descricao: null,
      categoriaId: 10,
      unidadeVenda: 'UNIDADE',
      exibirNoSite: false,
    }));
    expect(payload.produto.imagens).toEqual([
      { arquivoId: 50, principal: true, ordem: 0, ativo: true },
      { arquivoId: 51, principal: false, ordem: 1, ativo: true },
    ]);
    expect(payload.corId).toBe(3);
  });

  it('carrega clone com valores do produto original e bloqueia salvar ate mudar identidade', () => {
    routeSnapshot.queryParamMap = { get: (key: string) => key === 'cloneFrom' ? '1' : null };

    component.ngOnInit();

    expect(component.isClone).toBeTrue();
    expect(component.isEdit).toBeFalse();
    expect(graficaService.detalhar).toHaveBeenCalledWith(1);
    expect(component.form.getRawValue()).toEqual(jasmine.objectContaining({
      nome: 'Panfleto',
      materialId: 1,
      formatoId: 2,
      corId: 3,
    }));
    expect((component as any).produtoPayload().catalogoProdutoId).toBeNull();
    expect(component.cloneSalvarBloqueado).toBeTrue();
    expect(component.salvarDesabilitado).toBeTrue();

    component.form.controls.nome.setValue('Panfleto Premium');

    expect(component.cloneSalvarBloqueado).toBeFalse();
    expect(component.salvarDesabilitado).toBeFalse();

    component.form.controls.nome.setValue('Panfleto');

    expect(component.cloneSalvarBloqueado).toBeTrue();
  });

  it('restaura snapshot original ao cancelar clone', () => {
    routeSnapshot.queryParamMap = { get: (key: string) => key === 'cloneFrom' ? '1' : null };
    component.ngOnInit();
    component.form.patchValue({ nome: 'Panfleto Premium', materialId: null });

    component.cancelar();

    expect(component.form.getRawValue()).toEqual(jasmine.objectContaining({
      nome: 'Panfleto',
      materialId: 1,
      formatoId: 2,
      corId: 3,
    }));
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.cloneSalvarBloqueado).toBeTrue();
  });
});

function produtoGrafico() {
  return {
    id: 1,
    catalogoProdutoId: 10,
    catalogoProdutoNome: 'Panfleto',
    catalogoProdutoDescricao: 'Panfleto promocional',
    catalogoCategoriaId: null,
    catalogoProdutoExibirNoSite: true,
    imagens: [],
    ativo: true,
    material: { id: 1, codigo: 'COUCHE', nome: 'Couchê 150g', ativo: true },
    formato: { id: 2, codigo: '10X15', nome: '10x15', ativo: true },
    cor: { id: 3, codigo: '4X4', nome: '4x4', ativo: true },
    acabamentos: [],
    parametros: [],
  };
}
