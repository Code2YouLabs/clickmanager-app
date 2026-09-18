import { FormControl, Validators } from '@angular/forms';

import { InputOptionsComponent } from './input-options.component';

describe('InputOptionsComponent', () => {
  let component: InputOptionsComponent;

  beforeEach(() => {
    component = new InputOptionsComponent();
    component.control = new FormControl<number | null>(1);
  });

  it('mantem a opcao nula desabilitada por padrao', () => {
    expect(component.nullOptionDisabled).toBeTrue();
  });

  it('permite limpar a selecao quando clearable estiver ativo', () => {
    component.clearable = true;

    expect(component.nullOptionDisabled).toBeFalse();
  });

  it('nao permite limpar campos obrigatorios', () => {
    component.control = new FormControl<number | null>(1, Validators.required);
    component.clearable = true;

    expect(component.nullOptionDisabled).toBeTrue();
  });

  it('mantem o label simples quando hierarquia esta desligada', () => {
    component.options = [{ id: 1, nome: 'Couchê 250g', caminho: 'Impressão › Couchê › Couchê 250g' }];

    expect(component.selectedLabel).toBe('Couchê 250g');
  });

  it('usa o caminho no valor selecionado quando hierarquia esta ligada', () => {
    component.hierarchical = true;
    component.selectedLabelKey = 'caminho';
    component.options = [{ id: 1, nome: 'Couchê 250g', caminho: 'Impressão › Couchê › Couchê 250g' }];

    expect(component.selectedLabel).toBe('Impressão › Couchê › Couchê 250g');
  });

  it('filtra opcoes hierarquicas por nome e caminho ignorando acentos', () => {
    component.hierarchical = true;
    component.searchKeys = ['busca'];
    component.options = [
      { id: 1, nome: 'Couchê 250g', caminho: 'Cartão de visitas › Couchê 250g', busca: 'Cartão de visitas Couchê 250g' },
      { id: 2, nome: 'Couchê 250g', caminho: 'Impressão › Couchê › Couchê 250g', busca: 'Impressão Couchê Couchê 250g' },
    ];

    component.searchControl.setValue('cartao');

    expect(component.filteredOptions.map((option) => option.id)).toEqual([1]);
  });
});
