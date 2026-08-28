import { fakeAsync, tick } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import {
  ComercialBetaEditorComponent,
  GraficaProdutoWizardDialogComponent,
} from './comercial-beta-editor.component';
import { GraficaProdutoBuscaRapidaDialogComponent } from './grafica-produto-busca-rapida-dialog.component';

describe('ComercialBetaEditorComponent', () => {
  it('abre busca rapida e repassa produto selecionado para o wizard', () => {
    const produtoSelecionado = produto();
    const composicao = { itens: [{ nomeProduto: 'Panfleto', quantidade: 1, valorUnitario: 10, valorTotal: 10 }] };
    const dialog = jasmine.createSpyObj('MatDialog', ['open']);
    dialog.open.and.callFake((component: unknown) => {
      if (component === GraficaProdutoBuscaRapidaDialogComponent) {
        return { afterClosed: () => of(produtoSelecionado) };
      }
      return { afterClosed: () => of(composicao) };
    });

    const component = new ComercialBetaEditorComponent(
      { data: of({ tipo: 'pedidos' }) } as any,
      jasmine.createSpyObj('Router', ['navigate']) as any,
      dialog,
      new FormBuilder(),
      {} as any,
      {} as any,
    );

    component.abrirBuscaRapida();

    expect(dialog.open).toHaveBeenCalledWith(GraficaProdutoBuscaRapidaDialogComponent, jasmine.any(Object));
    expect(dialog.open).toHaveBeenCalledWith(GraficaProdutoWizardDialogComponent, jasmine.objectContaining({
      data: jasmine.objectContaining({ produtoPreSelecionado: produtoSelecionado }),
    }));
    expect(component.itens.length).toBe(1);
  });
});

describe('GraficaProdutoWizardDialogComponent', () => {
  it('produto pre selecionado avanca para etapa de preco', fakeAsync(() => {
    const graficaService = jasmine.createSpyObj('GraficaProdutoService', ['listar', 'detalhar']);
    graficaService.listar.and.returnValue(of({ content: [], pageNumber: 0, pageSize: 20, totalElements: 0, totalPages: 0, last: true }));
    graficaService.detalhar.and.returnValue(of(produto()));
    const component = new GraficaProdutoWizardDialogComponent(
      new FormBuilder(),
      graficaService,
      jasmine.createSpyObj('MatDialogRef', ['close']) as any,
      { produtoPreSelecionado: produto(), cliente: null },
    );
    component.stepper = { selectedIndex: 0 } as any;

    component.ngOnInit();
    tick(0);

    expect(graficaService.detalhar).toHaveBeenCalledWith(11);
    expect(component.produtoForm.value.produtoGraficoId).toBe(11);
    expect(component.stepper?.selectedIndex).toBe(1);
  }));

  it('agrupa produto, material, formato e cor no funil progressivo', () => {
    const component = criarWizard();
    component.produtosFunil = [
      produto({ id: 11, nome: 'Panfleto', materialId: 1, materialNome: 'Apergaminhado 180g', formatoId: 2, formatoNome: '10x15', corId: 3, corNome: '1x0' }),
      produto({ id: 12, nome: 'Panfleto', materialId: 1, materialNome: 'Apergaminhado 180g', formatoId: 4, formatoNome: '15x21', corId: 5, corNome: '1x1' }),
      produto({ id: 13, nome: 'Cartão de Visitas', materialId: 6, materialNome: 'Couchê 250g', formatoId: 7, formatoNome: '9x5', corId: 8, corNome: '4x4' }),
    ];

    expect(component.opcoesFunil('produto').map((item) => item.label)).toEqual(['Cartão de Visitas', 'Panfleto']);

    component.selecionarProdutoFunil({ key: 'panfleto', label: 'Panfleto' });
    expect(component.opcoesFunil('material').map((item) => item.label)).toEqual(['Apergaminhado 180g']);

    component.selecionarMaterialFunil({ key: '1', label: 'Apergaminhado 180g' });
    expect(component.opcoesFunil('formato').map((item) => item.label)).toEqual(['10x15', '15x21']);

    component.selecionarFormatoFunil({ key: '2', label: '10x15' });
    expect(component.opcoesFunil('cor').map((item) => item.label)).toEqual(['1x0']);
  });

  it('pagina colunas e resolve produto final ao selecionar cor', () => {
    const component = criarWizard();
    const produtos = Array.from({ length: 8 }, (_, index) => produto({
      id: index + 1,
      nome: `Produto ${index + 1}`,
      materialId: 1,
      materialNome: 'Apergaminhado 180g',
      formatoId: 2,
      formatoNome: '10x15',
      corId: 3,
      corNome: '1x0',
    }));
    component.produtosFunil = produtos;
    spyOn(component, 'selecionarProduto');

    expect(component.totalPaginasFunil('produto')).toBe(2);
    expect(component.opcoesPaginadas('produto').length).toBe(6);
    component.proximaPaginaFunil('produto');
    expect(component.paginaAtualFunil('produto')).toBe(2);

    component.selecionarCorFunil({ key: '3', label: '1x0', produto: produtos[0] });

    expect(component.corSelecionadaId).toBe(3);
    expect(component.selecionarProduto).toHaveBeenCalledWith(produtos[0], true);
  });
});

function criarWizard(): GraficaProdutoWizardDialogComponent {
  const graficaService = jasmine.createSpyObj('GraficaProdutoService', ['listar', 'detalhar']);
  graficaService.listar.and.returnValue(of({ content: [], pageNumber: 0, pageSize: 20, totalElements: 0, totalPages: 0, last: true }));
  graficaService.detalhar.and.returnValue(of(produto()));
  return new GraficaProdutoWizardDialogComponent(
    new FormBuilder(),
    graficaService,
    jasmine.createSpyObj('MatDialogRef', ['close']) as any,
    { cliente: null },
  );
}

function produto(overrides: {
  id?: number;
  nome?: string;
  materialId?: number;
  materialNome?: string;
  formatoId?: number;
  formatoNome?: string;
  corId?: number;
  corNome?: string;
} = {}) {
  return {
    id: overrides.id ?? 11,
    catalogoProdutoId: 123,
    catalogoProdutoCodigo: 'PAN-001',
    catalogoProdutoNome: overrides.nome ?? 'Panfleto',
    catalogoProdutoDescricao: 'Produto gráfico',
    ativo: true,
    material: { id: overrides.materialId ?? 1, codigo: 'APERGAMINHADO', nome: overrides.materialNome ?? 'Apergaminhado 180g', ativo: true },
    formato: { id: overrides.formatoId ?? 2, codigo: '10X15', nome: overrides.formatoNome ?? '10x15', ativo: true },
    cor: { id: overrides.corId ?? 3, codigo: '4X4', nome: overrides.corNome ?? '4x4', ativo: true },
    acabamentos: [],
    servicos: [],
    parametros: [],
  };
}
