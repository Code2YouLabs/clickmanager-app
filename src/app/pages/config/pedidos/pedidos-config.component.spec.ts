import { of, throwError } from 'rxjs';
import { PedidosConfigComponent } from './pedidos-config.component';
describe('Configuração visual de Pedidos',()=>{
 const parametros={prazo:7,unidade:'DIAS' as const,atencaoHoras:24,atrasoCriticoHoras:48};
 it('só permite salvar configuração carregada e valores inteiros nos limites do backend',()=>{
  const api={configuracao:()=>of({parametros}),configurar:jasmine.createSpy().and.returnValue(of({}))};
  const c=new PedidosConfigComponent(api as any,{success:()=>{},error:()=>{}} as any);c.salvar();expect(api.configurar).not.toHaveBeenCalled();
  c.ngOnInit();c.form.controls.prazo.setValue(3651);c.salvar();expect(api.configurar).not.toHaveBeenCalled();
  c.form.controls.unidade.setValue('HORAS');c.form.controls.prazo.setValue(87600);c.salvar();expect(api.configurar).toHaveBeenCalledWith({...parametros,unidade:'HORAS',prazo:87600});
  api.configurar.calls.reset();c.form.controls.atencaoHoras.setValue(1.5);c.salvar();expect(api.configurar).not.toHaveBeenCalled();c.ngOnDestroy();
 });
 it('falha de leitura não apresenta defaults como configuração carregada',()=>{
  const c=new PedidosConfigComponent({configuracao:()=>throwError(()=>new Error('rede'))} as any,{} as any);c.ngOnInit();expect(c.carregada).toBeFalse();expect(c.erro).toBeTruthy();c.ngOnDestroy();
 });
});
