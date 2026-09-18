import { DualListTransferComponent, DualListTransferItem } from './dual-list-transfer.component';

describe('DualListTransferComponent', () => {
  const items: DualListTransferItem[] = [
    { id: 1, label: 'Papel A4', group: 'Papel', status: 'PRONTO' },
    { id: 2, label: 'MDF 60x90', group: 'MDF', status: 'PRECISA_AJUSTE',
      details: ['Formato inválido'], editRoute: ['/produtos', 2, 'editar'] },
    { id: 3, label: 'MDF 70x100', group: 'MDF' },
  ];

  function criar(): DualListTransferComponent {
    const component = new DualListTransferComponent();
    component.items = items;
    component.selectedIds = [1, 2];
    return component;
  }

  it('separa duas listas, preserva agrupamento e status recebido', () => {
    const component = criar();
    expect(component.availableCount).toBe(1);
    expect(component.selectedCount).toBe(2);
    expect(component.groups('left')[0].items.map(item => item.id)).toEqual([3]);
    expect(component.groups('right').map(group => group.name)).toEqual(['Papel', 'MDF']);
    expect(component.groups('right')[1].items[0].details).toEqual(['Formato inválido']);
    expect(component.groups('right')[1].items[0].editRoute).toEqual(['/produtos', 2, 'editar']);
  });

  it('move apenas por ação explícita e preserva seleção ao expandir', () => {
    const component = criar();
    const changes: number[][] = [];
    component.selectedIdsChange.subscribe(ids => { changes.push(ids); component.selectedIds = ids; });
    component.move(items[2], 'left');
    expect(changes[0]).toEqual([1, 2, 3]);
    component.toggleExpanded('left');
    expect(component.layout).toBe('LEFT_EXPANDED');
    expect(component.selectedCount).toBe(3);
    component.toggleExpanded('left');
    expect(component.layout).toBe('SPLIT');
    component.toggleExpanded('right');
    expect(component.layout).toBe('RIGHT_EXPANDED');
    component.move(items[1], 'right');
    expect(changes[1]).toEqual([1, 3]);
    component.toggleExpanded('right');
    expect(component.layout).toBe('SPLIT');
  });

  it('mantém pesquisas independentes e aba mobile', () => {
    const component = criar();
    component.leftSearch = '70x100';
    component.rightSearch = 'papel';
    expect(component.groups('left')[0].items.map(item => item.id)).toEqual([3]);
    expect(component.groups('right')[0].items.map(item => item.id)).toEqual([1]);
    component.mobilePane = 'right';
    expect(component.groups(component.mobilePane)[0].items[0].id).toBe(1);
    component.disabled = true;
    const emit = spyOn(component.selectedIdsChange, 'emit');
    component.move(items[2], 'left');
    expect(emit).not.toHaveBeenCalled();
  });

  it('busca também pelos atributos secundários sem alterar contadores', () => {
    const component = criar();
    component.items = [{ id: 4, label: 'Adesivo Vinil', group: 'Adesivos',
      searchText: 'Vinil Transparente SRA3 4x0' }, ...items];
    component.leftSearch = 'transparente';
    expect(component.groups('left')[0].items.map(item => item.id)).toEqual([4]);
    expect(component.availableCount).toBe(2);
    expect(component.selectedCount).toBe(2);
  });
});
