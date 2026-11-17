import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import { ConversasComponent } from './conversas.component';
import { AuthService } from 'src/app/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { Configuracao, Conversa } from '../clickwhatsapp.models';
import { ClickWhatsAppEnvioStore } from '../clickwhatsapp-envio.store';
import { ClienteCreateDialogComponent } from 'src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component';
import { environment } from 'src/environments/environment';

describe('Conversas — fluxos HTTP e composição', () => {
  let fixture: ComponentFixture<ConversasComponent>;
  let page: ConversasComponent;
  let http: HttpTestingController;
  const base = environment.apiUrl + '/api/clickwhatsapp';
  const filtro = { inicio: '2026-11-01T00:00:00Z', fim: '2026-11-18T00:00:00Z', fase: '' as const, pagina: 0, tamanho: 20 };
  const config = { conexao: 'conexao', acoesPermitidas: { consultarHistorico: true, enviarMensagem: true } } as Configuracao;
  const conversa = (id: string): Conversa => ({
    id, previa: 'Texto real de teste',
    ultima: { destinatario: '5531987654321', nomeCliente: 'Cliente de teste', clienteId: 9,
      conteudoDisponivel: true, tipoOrigem: 'AVULSA',
      mensagem: { id, conexao: 'conexao', fase: 'ACEITA', confirmacao: 'CONFIRMADA_SERVIDOR', criadaEm: filtro.inicio } as any },
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConversasComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations(),
        { provide: AuthService, useValue: { usuario$: new BehaviorSubject({ id: 1, empresa: { id: 1 } }), temPermissao: () => true } },
        { provide: ToastrService, useValue: { success: jasmine.createSpy(), error: jasmine.createSpy() } }],
    });
    fixture = TestBed.createComponent(ConversasComponent);
    page = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('config', config);
    fixture.componentRef.setInput('filtro', filtro);
    fixture.detectChanges();
  });
  afterEach(() => { TestBed.inject(MatDialog).closeAll(); fixture.destroy(); http.verify(); });
  function lista(itens: Conversa[] = [], temMais = false) {
    http.expectOne(r => r.url === base + '/conversas').flush({ itens, temMais });
  }

  it('acrescenta 15 conversas sem duplicar e preserva a seleção', fakeAsync(() => {
    lista(Array.from({ length: 15 }, (_, i) => conversa('c' + i)), true);
    flushMicrotasks();
    page.selecionar(page.conversas[0]);
    http.expectOne(r => r.url.endsWith('/c0/mensagens')).flush({ itens: [], temMais: false });
    flushMicrotasks();
    void page.carregar(true);
    const req = http.expectOne(r => r.url === base + '/conversas');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush({ itens: [conversa('c0'), conversa('c15')], temMais: false });
    flushMicrotasks(); tick();
    expect(page.conversas.length).toBe(16);
    expect(page.selecionada?.id).toBe('c0');
    expect(page.temMais).toBeFalse();
  }));

  it('aplica debounce e cancela respostas de pesquisa anterior', fakeAsync(() => {
    lista(); flushMicrotasks();
    page.pesquisa.setValue('Maria');
    tick(349);
    http.expectNone(r => r.url === base + '/conversas');
    tick(1);
    const anterior = http.expectOne(r => r.params.get('pesquisa') === 'Maria');
    page.pesquisa.setValue('Pedro'); tick(350);
    expect(anterior.cancelled).toBeTrue();
    http.expectOne(r => r.params.get('pesquisa') === 'Pedro').flush({ itens: [conversa('pedro')], temMais: false });
    flushMicrotasks();
    expect(page.conversas.map(c => c.id)).toEqual(['pedro']);
  }));

  it('mantém dados válidos quando a atualização falha', fakeAsync(() => {
    lista([conversa('c1')]); flushMicrotasks();
    void page.carregar();
    http.expectOne(r => r.url === base + '/conversas').flush({}, { status: 503, statusText: 'Unavailable' });
    flushMicrotasks();
    expect(page.conversas.length).toBe(1);
    expect(page.erro).toBeTruthy();
  }));

  it('reinicia paginação e cancela a consulta ao alterar filtros', fakeAsync(() => {
    const inicial = http.expectOne(r => r.url === base + '/conversas');
    fixture.componentRef.setInput('filtro', { ...filtro, fase: 'ACEITA' });
    fixture.detectChanges();
    expect(inicial.cancelled).toBeTrue();
    http.expectOne(r => r.params.get('fase') === 'ACEITA' && r.params.get('pagina') === '0')
      .flush({ itens: [], temMais: false });
    flushMicrotasks();
  }));

  it('seleciona cliente e telefone sem emitir envio automaticamente', fakeAsync(() => {
    lista(); flushMicrotasks();
    spyOn(page.registrar, 'emit');
    page.escolherCliente({ id: 9, nome: 'Pessoa', telefone: '(31) 98765-4321' } as any);
    expect(page.destino).toBeNull();
    expect(page.podeContinuar).toBeTrue();
    http.expectNone(r => r.url === base + '/conversas');
    void page.continuar();
    lista(); flushMicrotasks();
    expect(page.destino).toEqual({ numero: '5531987654321', nome: 'Pessoa', clienteId: 9 });
    expect(page.registrar.emit).not.toHaveBeenCalled();
    page.voltar();
    page.telefone.setValue('31987654321');
    fixture.detectChanges();
    page.informarNumero();
    void page.continuar();
    lista(); flushMicrotasks();
    expect(page.destino?.numero).toBe('5531987654321');
    page.texto = 'Olá';
    page.enviar();
    expect(page.registrar.emit).toHaveBeenCalledWith({ destino: page.destino!, texto: 'Olá' });
  }));

  it('mantém separados dois clientes e uma mensagem avulsa no mesmo telefone', fakeAsync(() => {
    const a = conversa('a');
    const b = { ...conversa('b'), ultima: { ...conversa('b').ultima, clienteId: 10, nomeCliente: 'Cliente B' } };
    lista([a, b]); flushMicrotasks();
    page.escolherCliente({ id: 10, nome: 'Cliente B', telefone: '(31) 98765-4321' } as any);
    void page.continuar();
    expect(page.selecionada?.id).toBe('b');
    http.expectOne(r => r.url.endsWith('/b/mensagens')).flush({ itens: [], temMais: false });
    flushMicrotasks(); tick();
    http.expectNone(r => r.url.endsWith('/a/mensagens'));
    page.voltar();
    page.telefone.setValue('31987654321'); fixture.detectChanges();
    page.informarNumero();
    void page.continuar();
    const avulsa = http.expectOne(r => r.url === base + '/conversas');
    expect(avulsa.request.params.get('avulsa')).toBe('true');
    avulsa.flush({ itens: [], temMais: false });
    flushMicrotasks(); tick();
    expect(page.selecionada).toBeNull();
    expect(page.destino?.clienteId).toBeUndefined();
  }));

  it('rejeita telefone incompleto e preserva pesquisa ao cancelar cadastro lateral', fakeAsync(() => {
    lista(); flushMicrotasks();
    page.telefone.setValue('31987'); fixture.detectChanges();
    expect(page.numeroValido).toBeFalse();
    page.escolherCliente({ id: 9, nome: 'Cliente anterior', telefone: '31987654321' } as any);
    expect(page.podeContinuar).toBeTrue();
    page.pesquisaCliente.setValue('Pessoa');
    expect(page.clienteEscolhido).toBeNull();
    expect(page.podeContinuar).toBeFalse();
    tick(350);
    http.expectOne(r => r.url.includes('/api/clientes?')).flush({ content: [] });
    flushMicrotasks();
    page.escolhendo = true;
    page.cadastrar(); fixture.detectChanges();
    const ref = TestBed.inject(MatDialog).openDialogs[0];
    expect(document.querySelector('.mobile-side-panel')).not.toBeNull();
    expect(ref.componentInstance).toBeInstanceOf(ClienteCreateDialogComponent);
    ref.close(null); flushMicrotasks(); tick(400);
    expect(page.escolhendo).toBeTrue();
    expect(page.pesquisaCliente.value).toBe('Pessoa');
  }));

  it('retorna do cadastro compartilhado para o compositor com o cliente criado', fakeAsync(() => {
    lista(); flushMicrotasks();
    page.escolhendo = true;
    page.cadastrar(); fixture.detectChanges();
    TestBed.inject(MatDialog).openDialogs[0].close({ id: 31, nome: 'Novo cliente', telefone: '31987654321' });
    flushMicrotasks(); tick(400);
    expect(page.clienteEscolhido?.id).toBe(31);
    expect(page.escolhendo).toBeTrue();
    void page.continuar();
    lista(); flushMicrotasks();
    expect(page.destino?.clienteId).toBe(31);
    expect(page.escolhendo).toBeFalse();
  }));

  it('revela telefone somente por escolha manual ou cliente sem telefone e confirma antes de abrir', fakeAsync(() => {
    lista(); flushMicrotasks();
    page.novaMensagem();
    http.expectOne(r => r.url.includes('/api/clientes?')).flush({ content: [
      { id: 41, nome: 'Com telefone', telefone: '31987654321' }, { id: 42, nome: 'Sem telefone', telefone: '' },
    ] });
    flushMicrotasks(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-input-telefone')).toBeNull();
    const opcoes = fixture.nativeElement.querySelectorAll('.cliente-opcao');
    opcoes[0].click(); fixture.detectChanges();
    expect(opcoes[0].getAttribute('aria-pressed')).toBe('true');
    expect(page.destino).toBeNull();
    expect(fixture.nativeElement.querySelector('app-input-telefone')).toBeNull();
    expect(fixture.nativeElement.querySelector('.continuar-destinatario').disabled).toBeFalse();
    opcoes[1].click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-input-telefone')).not.toBeNull();
    expect(page.podeContinuar).toBeFalse();
    page.informarNumero(); fixture.detectChanges();
    expect(page.clienteEscolhido).toBeNull();
    expect(page.telefoneManual).toBeTrue();
    expect(fixture.nativeElement.querySelector('.lista-clientes')).toBeNull();
  }));

  it('salva telefone no cadastro existente preservando os demais dados antes de continuar', fakeAsync(() => {
    lista(); flushMicrotasks();
    page.escolherCliente({ id: 42, nome: 'Cliente sem telefone', telefone: '' } as any);
    page.telefone.setValue('31987654321');
    expect(page.podeContinuar).toBeTrue();
    void page.continuar();
    http.expectOne(r => r.url.endsWith('/api/clientes/42')).flush({
      id: 42, nome: 'Cliente sem telefone', telefone: '', email: 'fixture@example.test', documento: 'documento-fixture',
      endereco: { cidade: 'Cidade de teste' },
    });
    flushMicrotasks();
    const atualizacao = http.expectOne(r => r.method === 'PUT' && r.url.endsWith('/api/clientes/42'));
    expect(atualizacao.request.body).toEqual({
      nome: 'Cliente sem telefone', telefone: '31987654321', email: 'fixture@example.test', documento: 'documento-fixture',
      endereco: { cidade: 'Cidade de teste' },
    });
    atualizacao.flush({ id: 42, nome: 'Cliente sem telefone', telefone: '31987654321' });
    flushMicrotasks();
    lista(); flushMicrotasks();
    expect(page.destino?.clienteId).toBe(42);
    expect(page.destino?.numero).toBe('5531987654321');
  }));

  it('exige permissão de edição para preencher telefone de um cliente existente', fakeAsync(() => {
    lista(); flushMicrotasks();
    spyOn(TestBed.inject(AuthService), 'temPermissao').and.returnValue(false);
    page.escolherCliente({ id: 42, nome: 'Cliente sem telefone', telefone: '' } as any);
    page.telefone.setValue('31987654321');
    expect(page.podeContinuar).toBeFalse();
    void page.continuar();
    http.expectNone(r => r.url.includes('/api/clientes/42'));
  }));

  it('recupera intenção pendente e emite somente repetição', fakeAsync(() => {
    lista(); flushMicrotasks();
    TestBed.inject(ClickWhatsAppEnvioStore).pendente = {
      conexao: 'conexao', mensagem: 'Sem confirmação', repetivel: true,
      operacao: { chave: 'mesma-chave', corpo: { numero: '5531987654321', texto: 'Original', expiraEm: filtro.fim, clienteId: 9 } },
    };
    spyOn(page.repetir, 'emit');
    spyOn(page.registrar, 'emit');
    page.retomar(); page.enviar();
    expect(page.texto).toBe('Original');
    expect(page.repetir.emit).toHaveBeenCalled();
    expect(page.registrar.emit).not.toHaveBeenCalled();
  }));
});
