import { FormArray, FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { FormPedidoComponent } from './form-pedido.component';

describe('Pedido — Cancelar compartilhado', () => {
  it('limpa cliente, itens, pagamentos e totais sem navegar ou persistir', () => {
    const router: any = { navigate: jasmine.createSpy('navigate') };
    const service: any = { salvar: jasmine.createSpy('salvar') };
    const fb = new FormBuilder();
    const component = new FormPedidoComponent(fb, service, router, {} as any, { usuario$: of({ id: 1 }) } as any, {} as any, {} as any);
    component.ngOnInit();
    component.clienteConfirmado = { id: 7 };
    component.pedidoItens = [{ quantidade: 2, valorUnitario: 10, valorTotal: 20 } as any];
    component.addForm.patchValue({ clienteId: 7, frete: 12, observacoes: 'Rascunho' });
    (component.addForm.get('pagamentos') as FormArray).push(fb.group({ forma: ['PIX'], valor: [5] }));
    const card = new PageCardComponent(); card.formState = component.formState;
    card.onFooterAction(card.resolvedFooterActions[0]);
    expect(component.clienteConfirmado).toBeNull(); expect(component.pedidoItens).toEqual([]);
    expect(component.addForm.getRawValue().pagamentos).toEqual([]);
    expect(component.addForm.getRawValue().observacoes).toBe(''); expect(component.grandTotal).toBe(0);
    expect(router.navigate).not.toHaveBeenCalled(); expect(service.salvar).not.toHaveBeenCalled();
  });
});
