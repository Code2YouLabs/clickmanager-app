import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CatalogoCategoriaService } from '../../catalogo/shared/services/catalogo.service';
import { DepositoImagemService } from '../../deposito/services/deposito-imagem.service';
import { GraficaProdutoService } from '../shared/grafica.service';
import { GraficaProdutoFormComponent } from './grafica-produto-form.component';

describe('GraficaProdutoFormComponent', () => {
  let fixture: ComponentFixture<GraficaProdutoFormComponent>;
  let component: GraficaProdutoFormComponent;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [GraficaProdutoFormComponent, NoopAnimationsModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: Router, useValue: router },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error', 'warning']) },
        { provide: GraficaProdutoService, useValue: {} },
        { provide: CatalogoCategoriaService, useValue: {} },
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
      acabamentoIds: [2],
    });
    component.precoForm.patchValue({ tipo: 'FIXO' });
    component.precoForm.addControl('valor', new FormControl(25));
    (component as any).registrarSnapshot();

    component.form.patchValue({
      nome: 'Cartão',
      descricao: 'Alterado',
      exibirNoSite: false,
      materialId: null,
      acabamentoIds: [3],
    });
    component.precoForm.patchValue({ valor: 80 });

    component.cancelar();

    expect(component.form.getRawValue()).toEqual(jasmine.objectContaining({
      nome: 'Panfleto',
      descricao: 'Panfleto promocional',
      exibirNoSite: true,
      materialId: 1,
      acabamentoIds: [2],
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
});
