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

  it('preserva restrições e código do acabamento na edição', () => {
    const component = new GraficaProdutoAcabamentoDialogComponent(new FormBuilder(), dialogRef, {
      acabamento: { id: 1, codigo: 'CORTE_EXISTENTE', nome: 'Corte eletrônico', aplicacao: 'FOLHA',
        restricaoLarguraUtil: 19, restricaoAlturaUtil: 26, preco: { tipo: 'FIXO', valor: 2 } },
      nextId: -1,
      formato: { id: 1, codigo: 'A4', nome: 'A4', ativo: true, largura: 21, altura: 29.7,
        larguraUtil: 20, alturaUtil: 28, unidadeDimensao: 'CENTIMETRO' },
    });
    component.salvar();
    expect(dialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({ codigo: 'CORTE_EXISTENTE',
      restricaoLarguraUtil: 19, restricaoAlturaUtil: 26 }));
    dialogRef.close.calls.reset();
    for (const [largura, altura] of [[19, null], [null, 26], [0, 26], [21, 26], [19, 29]]) {
      component.form.patchValue({ restricaoLarguraUtil: largura, restricaoAlturaUtil: altura });
      component.salvar();
      expect(component.form.hasError('restricaoInvalida')).toBeTrue();
      expect(dialogRef.close).not.toHaveBeenCalled();
    }
    component.form.patchValue({ restricaoLarguraUtil: null, restricaoAlturaUtil: null });
    component.salvar();
    expect(dialogRef.close).toHaveBeenCalled();
    component.ngOnDestroy();
  });

  it('converte medidas ao trocar a unidade e salva na unidade do formato', () => {
    const component = new GraficaProdutoAcabamentoDialogComponent(new FormBuilder(), dialogRef, {
      acabamento: { id: 2, nome: 'Verniz', aplicacao: 'FOLHA',
        restricaoLarguraUtil: 19, restricaoAlturaUtil: 26, preco: { tipo: 'FIXO', valor: 2 } },
      nextId: -1,
      formato: { id: 1, codigo: 'A4', nome: 'A4', ativo: true, largura: 21, altura: 29.7,
        larguraUtil: 20, alturaUtil: 28, unidadeDimensao: 'CENTIMETRO' },
    });

    expect(component.unidadeControl.value).toBe('CENTIMETRO');
    component.unidadeControl.setValue('MILIMETRO');
    expect(component.form.controls.restricaoLarguraUtil.value).toBe(190);
    expect(component.form.controls.restricaoAlturaUtil.value).toBe(260);

    component.form.controls.restricaoLarguraUtil.setValue(205);
    component.salvar();
    expect(component.form.hasError('restricaoInvalida')).toBeTrue();
    expect(dialogRef.close).not.toHaveBeenCalled();

    component.form.controls.restricaoLarguraUtil.setValue(195);
    component.salvar();
    expect(dialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({
      restricaoLarguraUtil: 19.5,
      restricaoAlturaUtil: 26,
    }));
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
