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
});

function produto() {
  return {
    id: 11,
    catalogoProdutoId: 123,
    catalogoProdutoCodigo: 'PAN-001',
    catalogoProdutoNome: 'Panfleto',
    catalogoProdutoDescricao: 'Produto gráfico',
    ativo: true,
    material: { id: 1, codigo: 'APERGAMINHADO', nome: 'Apergaminhado 180g', ativo: true },
    formato: { id: 2, codigo: '10X15', nome: '10x15', ativo: true },
    cor: { id: 3, codigo: '4X4', nome: '4x4', ativo: true },
    acabamentos: [],
    servicos: [],
    parametros: [],
  };
}
