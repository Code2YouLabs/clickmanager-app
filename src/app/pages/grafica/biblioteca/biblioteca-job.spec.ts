import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';
import { BibliotecaService } from './biblioteca.service';
import { SetupProgress, SetupProgressComponent } from 'src/app/components/setup-progress/setup-progress.component';
import { SILENT_REQUEST } from 'src/app/interceptors/loading.interceptor';

const job: SetupProgress = {id:123,status:'PROCESSANDO',fase:'IMPORTANDO_ITENS',total:150,processados:47,criados:45,duplicados:2,erros:0,smartCalcPrevistos:2,smartCalcPreparados:0,tempoEstimadoRestanteSegundos:68,itens:[]};
describe('Preparação persistente', () => {
  it('consulta a cada dois segundos, sem sobrepor requisições e para ao concluir', fakeAsync(() => {
    const api = jasmine.createSpyObj('ApiService',['get','post']);
    const resposta = new Subject<SetupProgress>(); api.get.and.returnValue(resposta);
    const service = new BibliotecaService(api);const recebidos: SetupProgress[]=[];
    service.acompanhar(123).subscribe(j => recebidos.push(j));
    tick(0);expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get.calls.mostRecent().args[2].get(SILENT_REQUEST)).toBeTrue();
    tick(4000);expect(api.get).toHaveBeenCalledTimes(1);
    resposta.next(job);resposta.complete();
    api.get.and.returnValue(of({...job,status:'CONCLUIDO',fase:'CONCLUIDO',processados:150}));
    tick(2000);expect(recebidos.length).toBe(2);
    tick(10000);expect(api.get).toHaveBeenCalledTimes(2);
  }));
  it('envia produtos e serviços ao mesmo endpoint de jobs', () => {
    const api=jasmine.createSpyObj('ApiService',['post']);api.post.and.returnValue(of(job));
    new BibliotecaService(api).importar([{id:1,tipo:'PRODUTO'},{id:1,tipo:'SERVICO'}] as any).subscribe();
    expect(api.post).toHaveBeenCalledWith('api/grafica/biblioteca/importacoes',{produtoIds:[1],servicoIds:[1]});
  });
  it('consulta a última preparação em background', () => {
    const api = jasmine.createSpyObj('ApiService', ['get']);
    api.get.and.returnValue(of(null));
    new BibliotecaService(api).ultima().subscribe();
    expect(api.get.calls.mostRecent().args[2].get(SILENT_REQUEST)).toBeTrue();
  });
  it('usa o endpoint de onboarding somente quando solicitado', () => {
    const api=jasmine.createSpyObj('ApiService',['post']);api.post.and.returnValue(of(job));
    new BibliotecaService(api).importar([{id:15,tipo:'PRODUTO'}] as any, true).subscribe();
    expect(api.post).toHaveBeenCalledWith('api/grafica/biblioteca/importacoes/onboarding',{produtoIds:[15],servicoIds:[]});
  });
  it('mostra tarefas individuais, progresso real e conclusão com SmartCalc', async () => {
    await TestBed.configureTestingModule({imports:[SetupProgressComponent,NoopAnimationsModule]}).compileComponents();
    const fixture=TestBed.createComponent(SetupProgressComponent);fixture.componentInstance.job=job;fixture.componentInstance.onboarding=true;fixture.detectChanges();
    const texto=fixture.nativeElement.textContent;
    expect(texto).toContain('Estamos preparando seu ClickManager');expect(texto).toContain('47 de 150 produtos e serviços');
    expect(texto).toContain('Criando sua empresa');expect(texto).toContain('Configurando SmartCalc');
    expect(fixture.nativeElement.querySelectorAll('mat-spinner').length).toBe(1);
    expect(fixture.componentInstance.tarefas.find(t => t.label === 'Criando seu catálogo')?.state).toBe('PROCESSANDO');
    expect(fixture.componentInstance.percentual).toBeCloseTo(31.33,2);
    fixture.componentInstance.job={...job,fase:'FINALIZANDO',processados:150};fixture.detectChanges();
    expect(fixture.componentInstance.tarefas.find(t => t.label === 'Configurando SmartCalc')?.state).toBe('PROCESSANDO');
    expect(fixture.nativeElement.querySelectorAll('mat-spinner').length).toBe(1);
    fixture.componentInstance.job={...job,status:'CONCLUIDO_COM_ALERTAS',fase:'CONCLUIDO_COM_ALERTAS',processados:150,erros:1,smartCalcPreparados:2,
      itens:[{id:1,tipo:'PRODUTO',templateId:3,status:'ERRO',nome:'Item exemplo',mensagem:'Verifique a configuração.',criadoId:null}]};fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ver detalhes');expect(fixture.nativeElement.textContent).toContain('Item exemplo');
    fixture.componentInstance.job={...job,status:'CONCLUIDO',fase:'CONCLUIDO',processados:150,smartCalcPreparados:2};fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tudo pronto para você!');
    expect(fixture.nativeElement.textContent).toContain('2 produtos preparados para o SmartCalc');
    expect(fixture.nativeElement.querySelectorAll('mat-spinner').length).toBe(0);
    fixture.componentInstance.job={...job,status:'CONCLUIDO',fase:'CONCLUIDO',processados:150,smartCalcPrevistos:0,smartCalcPreparados:0};fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma configuração inicial necessária');
    expect(fixture.nativeElement.textContent).not.toContain('0 produtos preparados');
    fixture.componentInstance.job={...job,status:'CONCLUIDO_COM_ALERTAS',fase:'CONCLUIDO_COM_ALERTAS',processados:150,alertaPreparacao:'Configuração adicional não pôde ser concluída'};fixture.detectChanges();
    expect(fixture.componentInstance.tarefas.find(t => t.label === 'Configurando SmartCalc')?.state).toBe('ALERTA');
    expect(fixture.nativeElement.textContent).toContain('Configuração adicional não pôde ser concluída');
    fixture.destroy();
  });
});
