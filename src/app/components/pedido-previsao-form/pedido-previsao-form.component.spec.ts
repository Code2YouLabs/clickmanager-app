import { of, throwError } from 'rxjs';
import { PedidoPrevisaoFormComponent } from './pedido-previsao-form.component';
describe('PedidoPrevisaoFormComponent', () => {
 const parametros = {prazo:7,unidade:'DIAS' as const,atencaoHoras:24,atrasoCriticoHoras:48};
 it('envia parâmetros automáticos carregados e respeita opção sem previsão', () => {
  const api = {configuracao:()=>of({parametros})}; const c=new PedidoPrevisaoFormComponent(api as any); c.ngOnInit();
  expect(c.definicao()).toEqual({modo:'AUTOMATICA',parametros});
  c.habilitada=false;expect(c.definicao()).toEqual({modo:'SEM_PREVISAO'});c.ngOnDestroy();
 });
 it('edição do calendário torna explícita e exige confirmação para passado', () => {
  const c=new PedidoPrevisaoFormComponent({configuracao:()=>of({parametros})} as any);c.ngOnInit();
  c.data.setValue(new Date(2020,0,2));c.hora='10:30';c.editada();
  expect(c.definicao()).toBeNull();c.confirmadoPassado=true;
  expect(c.definicao()).toEqual({modo:'EXPLICITA',dataHora:'2020-01-02T10:30:00-03:00'});
  c.padrao();expect(c.definicao()?.modo).toBe('AUTOMATICA');c.ngOnDestroy();
 });
 it('falha não fabrica configuração e permite retry', () => {
  const api={configuracao:jasmine.createSpy().and.returnValue(throwError(()=>new Error('rede')))};
  const c=new PedidoPrevisaoFormComponent(api as any);c.ngOnInit();expect(c.erro).toBeTruthy();expect(c.definicao()).toBeNull();
  api.configuracao.and.returnValue(of({parametros}));c.carregar();expect(c.definicao()?.modo).toBe('AUTOMATICA');c.ngOnDestroy();
 });
});
