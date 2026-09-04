import { FormBuilder } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import {
  GraficaProdutoAcabamentoDialogComponent,
  ProdutoAcabamentoUx,
} from './grafica-produto-acabamento-dialog.component';

describe('GraficaProdutoAcabamentoDialogComponent', () => {
  let dialogRef: jasmine.SpyObj<MatDialogRef<GraficaProdutoAcabamentoDialogComponent, ProdutoAcabamentoUx | null>>;

  beforeEach(() => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
  });

  it('limita tipos de preço por forma de aplicação e ajusta tipo inválido', () => {
    const component = criarComponente({
      id: 1,
      nome: 'Laminação',
      aplicacao: 'FOLHA',
      preco: { tipo: 'QUANTIDADE', faixas: [{ quantidade: 10, valor: 5 }] },
    });

    expect(component.tiposPrecoPermitidos).toEqual(['FIXO', 'DEMANDA']);
    expect(component.precoForm.get('tipo')?.value).toBe('FIXO');

    component.form.controls.aplicacao.setValue('SERVICO');

    expect(component.tiposPrecoPermitidos).toEqual(['FIXO', 'DEMANDA', 'QUANTIDADE']);

    component.precoForm.get('tipo')?.setValue('DEMANDA');
    component.form.controls.aplicacao.setValue('METRO_QUADRADO');

    expect(component.tiposPrecoPermitidos).toEqual(['METRO']);
    expect(component.precoForm.get('tipo')?.value).toBe('METRO');

    component.ngOnDestroy();
  });

  function criarComponente(acabamento: ProdutoAcabamentoUx): GraficaProdutoAcabamentoDialogComponent {
    return new GraficaProdutoAcabamentoDialogComponent(
      new FormBuilder(),
      dialogRef,
      { acabamento, nextId: -1 },
    );
  }
});
