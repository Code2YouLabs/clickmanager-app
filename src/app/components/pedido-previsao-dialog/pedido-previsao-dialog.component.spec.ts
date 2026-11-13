import { of, throwError } from 'rxjs';
import { PedidoPrevisaoDialogComponent } from './pedido-previsao-dialog.component';
describe('Edição concorrente da previsão', () => {
 it('409 preserva escolha e não repete automaticamente após recarregar', () => {
  const api={editar:jasmine.createSpy().and.returnValue(throwError(()=>({status:409}))),pedido:jasmine.createSpy().and.returnValue(of({id:1,status:'PENDENTE',prazo:{versao:4}}))};
  const ref={close:jasmine.createSpy(),disableClose:false};
  const c=new PedidoPrevisaoDialogComponent({pedido:{id:1,status:'PENDENTE',prazo:{versao:3}} as any},api as any,ref as any);
  const dataHora='2027-01-02T12:00:00-03:00';c.form={definicao:()=>({modo:'EXPLICITA',dataHora})} as any;
  c.salvar();expect(c.conflito).toBeTrue();expect(api.editar).toHaveBeenCalledOnceWith(1,3,dataHora);
  c.recarregar();expect(c.conflito).toBeFalse();expect(api.editar).toHaveBeenCalledTimes(1);
  api.editar.and.returnValue(of({id:1,prazo:{versao:5}}));c.salvar();expect(api.editar).toHaveBeenCalledWith(1,4,dataHora);expect(ref.close).toHaveBeenCalled();c.ngOnDestroy();
 });
});
