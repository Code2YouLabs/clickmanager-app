import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';
import { ClickWhatsAppEnvioStore } from 'src/app/pages/clickwhatsapp/clickwhatsapp-envio.store';
import { CanalDocumento, CompartilhamentoClickWhatsAppComponent } from './compartilhamento-clickwhatsapp.component';

describe('Canal de compartilhamento de documento', () => {
  const endpoint='/api/comercial/pedidos/10/clickwhatsapp';
  const url=environment.apiUrl+endpoint;
  const canal: CanalDocumento={habilitado:true,disponivel:true,motivo:null,conexao:'conexao-1',
    limiteBytes:4096,podeConfigurar:true,podeConsultarHistorico:true};
  const registrada={id:'mensagem-1',conexao:'conexao-1',fase:'PENDENTE',confirmacao:'NAO_CONFIRMADA'};
  let fixture: ComponentFixture<CompartilhamentoClickWhatsAppComponent>;
  let page: CompartilhamentoClickWhatsAppComponent;
  let http: HttpTestingController;
  let usuario$: BehaviorSubject<any>;

  function criar() {
    fixture=TestBed.createComponent(CompartilhamentoClickWhatsAppComponent);
    fixture.componentRef.setInput('endpoint',endpoint);
    fixture.componentRef.setInput('mensagem',new FormControl('Texto revisado',{nonNullable:true}));
    fixture.componentRef.setInput('telefone','15555550123');
    page=fixture.componentInstance;
    fixture.detectChanges();
  }
  function pronta(disponibilidade=canal) {
    http.expectOne(url).flush(disponibilidade);
    flushMicrotasks();fixture.detectChanges();
  }
  beforeEach(()=>{
    usuario$=new BehaviorSubject({id:1,empresa:{id:1}});
    TestBed.configureTestingModule({imports:[CompartilhamentoClickWhatsAppComponent],
      providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),provideNoopAnimations(),
        {provide:AuthService,useValue:{usuario$}}]});
    http=TestBed.inject(HttpTestingController);
    criar();
  });
  afterEach(()=>{fixture.destroy();TestBed.inject(MatDialog).closeAll();http.verify();});

  it('desativado preserva o manual e abrir a tela não envia',fakeAsync(()=>{
    pronta({...canal,habilitado:false,disponivel:false,motivo:'DIREITO_INATIVO'});
    const manual=jasmine.createSpy();page.manual.subscribe(manual);
    void page.abrirManual();flushMicrotasks();
    expect(manual).toHaveBeenCalledOnceWith(undefined);
    expect(fixture.nativeElement.textContent).toContain('Abrir no WhatsApp');
    expect(fixture.nativeElement.textContent).not.toContain('Enviar pelo ClickWhatsApp');
    http.expectNone(r=>r.method==='POST');
  }));

  it('enfileira somente no clique final e protege duplo clique',fakeAsync(()=>{
    pronta();
    void page.enviar();void page.enviar();
    const req=http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(Object.keys(req.request.body).sort()).toEqual(['conexaoEsperada','expiraEm','numero','texto']);
    expect(req.request.headers.has('Idempotency-Key')).toBeTrue();
    req.flush(registrada,{status:202,statusText:'Accepted'});
    flushMicrotasks();fixture.detectChanges();
    expect(page.envio?.resultado?.id).toBe('mensagem-1');
    expect(fixture.nativeElement.textContent).toContain('Mensagem adicionada à fila.');
    expect(fixture.nativeElement.textContent).not.toContain('Entregue');
    expect(fixture.nativeElement.querySelector('a[href*="mensagem-1"]')).not.toBeNull();
  }));

  for(const motivo of ['ENVIOS_PAUSADOS','RESULTADO_INCERTO','CONEXAO_NAO_ABERTA','PERMISSAO_NEGADA','APLICACAO_BLOQUEADA']) {
    it('oferece escolha manual explícita para '+motivo,fakeAsync(()=>{
      pronta({...canal,disponivel:false,motivo});
      const manual=jasmine.createSpy();page.manual.subscribe(manual);
      expect(fixture.nativeElement.textContent).not.toContain('Enviar pelo ClickWhatsApp');
      expect(page.aviso).toBeTruthy();
      void page.enviar();http.expectNone(r=>r.method==='POST');
      void page.abrirManual();flushMicrotasks();
      expect(manual).toHaveBeenCalledWith({numero:'15555550123',texto:'Texto revisado'});
    }));
  }

  it('erro de disponibilidade continua desconhecido e não abre manual automaticamente',fakeAsync(()=>{
    const manual=jasmine.createSpy();page.manual.subscribe(manual);
    http.expectOne(url).flush({}, {status:503,statusText:'Unavailable'});
    flushMicrotasks();fixture.detectChanges();
    expect(page.disponibilidade).toBeNull();
    expect(page.aviso).toContain('Não foi possível verificar');
    expect(manual).not.toHaveBeenCalled();
    void page.abrirManual();flushMicrotasks();expect(manual).toHaveBeenCalled();
  }));

  it('recupera chave corpo e validade ao reabrir o mesmo documento depois de perder a resposta',fakeAsync(()=>{
    pronta();void page.enviar();
    const primeira=http.expectOne(url);const chave=primeira.request.headers.get('Idempotency-Key');const corpo=primeira.request.body;
    primeira.error(new ProgressEvent('error'));flushMicrotasks();
    fixture.destroy();criar();pronta();
    expect(page.mensagem.value).toBe(corpo.texto);
    page.mensagem.setValue('Não deve substituir a intenção');
    void page.enviar();
    const repeticao=http.expectOne(url);
    expect(repeticao.request.headers.get('Idempotency-Key')).toBe(chave);
    expect(repeticao.request.body).toEqual(corpo);
    repeticao.flush(registrada,{status:202,statusText:'Accepted'});flushMicrotasks();
  }));

  it('recupera por chave mesmo quando a conexão ficou indisponível',fakeAsync(()=>{
    pronta();void page.enviar();
    http.expectOne(url).error(new ProgressEvent('error'));flushMicrotasks();
    const chave=page.envio!.operacao.chave;
    page.disponibilidade={...canal,disponivel:false,motivo:'ENVIOS_PAUSADOS'};
    void page.acompanhar();
    http.expectOne(url+'/solicitacoes/'+chave).flush(registrada);flushMicrotasks();
    expect(page.envio?.resultado?.id).toBe('mensagem-1');
    http.expectNone(r=>r.method==='POST');
  }));

  it('preserva intenções por documento e limpa contexto ao trocar empresa',fakeAsync(()=>{
    pronta();void page.enviar();http.expectOne(url).error(new ProgressEvent('error'));flushMicrotasks();
    fixture.componentRef.setInput('endpoint','/api/orcamentos/10/clickwhatsapp');fixture.detectChanges();
    http.expectOne(environment.apiUrl+'/api/orcamentos/10/clickwhatsapp').flush(canal);flushMicrotasks();
    expect(page.envio).toBeUndefined();
    expect(TestBed.inject(ClickWhatsAppEnvioStore).documentos.size).toBe(1);
    usuario$.next({id:1,empresa:{id:2}});flushMicrotasks();
    expect(TestBed.inject(ClickWhatsAppEnvioStore).documentos.size).toBe(0);
    expect(page.contextoAlterado).toBeTrue();
  }));

  it('manual após possível aceite exige confirmação e não apaga a intenção',fakeAsync(()=>{
    pronta();void page.enviar();http.expectOne(url).error(new ProgressEvent('error'));flushMicrotasks();
    const manual=jasmine.createSpy();page.manual.subscribe(manual);
    void page.abrirManual();tick(300);
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(1);
    expect(manual).not.toHaveBeenCalled();
    TestBed.inject(MatDialog).openDialogs[0].close(false);tick(300);flushMicrotasks();
    expect(manual).not.toHaveBeenCalled();
    expect(page.envio).toBeTruthy();
  }));

  it('conflito não troca a chave e alternativa após aceite pede confirmação',fakeAsync(()=>{
    pronta();void page.enviar();
    http.expectOne(url).flush({codigo:'IDEMPOTENCIA_CONFLITO'},{status:409,statusText:'Conflict'});flushMicrotasks();
    const chave=page.envio!.operacao.chave;
    void page.enviar();flushMicrotasks();http.expectNone(r=>r.method==='POST');
    expect(page.envio!.operacao.chave).toBe(chave);
    page.envio!.resultado=registrada as any;
    const manual=jasmine.createSpy();page.manual.subscribe(manual);
    void page.abrirManual();tick(300);
    expect(manual).not.toHaveBeenCalled();
    TestBed.inject(MatDialog).openDialogs[0].close(true);tick(300);flushMicrotasks();
    expect(manual).toHaveBeenCalledOnceWith({numero:'15555550123',texto:'Texto revisado'});
    expect(page.envio!.resultado?.id).toBe('mensagem-1');
  }));

  it('valida telefone e bytes sem truncar e não renova validade expirada',fakeAsync(()=>{
    pronta();page.numero='abc';void page.enviar();flushMicrotasks();
    expect(page.erro).toContain('número internacional');
    page.numero='15555550123';page.mensagem.setValue('🙂'.repeat(1100));
    void page.enviar();flushMicrotasks();http.expectNone(r=>r.method==='POST');
    expect(page.mensagem.value.length).toBe(2200);
    page.mensagem.setValue('Teste');void page.enviar();
    http.expectOne(url).error(new ProgressEvent('error'));flushMicrotasks();
    const expira=page.envio!.operacao.corpo.expiraEm;tick(3600001);
    void page.enviar();flushMicrotasks();http.expectNone(r=>r.method==='POST');
    expect(page.envio!.operacao.corpo.expiraEm).toBe(expira);
  }));
});
