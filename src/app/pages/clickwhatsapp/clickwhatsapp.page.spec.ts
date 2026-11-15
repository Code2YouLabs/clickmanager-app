import { BreakpointObserver } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, of } from 'rxjs';
import { Usuario } from 'src/app/models/usuario/usuario.model';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';
import { Configuracao, Mensagem } from './clickwhatsapp.models';
import { ClickWhatsAppPage } from './clickwhatsapp.page';

describe('ClickWhatsApp', () => {
  const base = environment.apiUrl + '/api/clickwhatsapp';
  const conexao = base + '/conexoes/conexao-teste';
  const config: Configuracao = {
    direito: { global: true, local: true, revisaoGlobal: 1, revisaoLocal: 1, revisaoEmpresa: 1 },
    aplicacaoAutorizada: true,
    permissoes: { habilitar: true, configurar: true, enviar: true, consultar: false },
    conexao: 'conexao-teste', preferencia: { pausada: false, versao: 8, quarentena: false, motivo: null },
    estado: { observado: 'DESCONHECIDO', observadoEm: null, motivo: null }, motivos: [],
  };
  const mensagem: Mensagem = {
    id: 'mensagem-teste', conexao: 'conexao-teste', fase: 'INCERTA', confirmacao: 'NAO_CONFIRMADA',
    criadaEm: '2026-11-15T12:00:00Z', validaAte: '2026-11-15T13:00:00Z',
    aceitaEm: null, servidorEm: null, entregueEm: null, lidaEm: null, erro: null,
  };
  let fixture: ComponentFixture<ClickWhatsAppPage>;
  let http: HttpTestingController;
  let page: ClickWhatsAppPage;
  let usuario$: BehaviorSubject<Usuario | null>;
  let mobile: boolean;
  let toast: jasmine.SpyObj<ToastrService>;

  beforeEach(() => {
    mobile = false;
    usuario$ = new BehaviorSubject<Usuario | null>({ id: 1, proprietario: true });
    toast = jasmine.createSpyObj('ToastrService', ['error', 'warning', 'success']);
    TestBed.configureTestingModule({
      imports: [ClickWhatsAppPage],
      providers: [provideRouter([]), provideNoopAnimations(), provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { usuario$ } },
        { provide: ToastrService, useValue: toast },
        { provide: BreakpointObserver, useValue: {
          isMatched: () => mobile, observe: () => of({ matches: mobile, breakpoints: {} }),
        } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ClickWhatsAppPage);
    page = fixture.componentInstance;
  });

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    http.verify();
  });

  async function estabilizar() {
    await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function iniciar(c = config) {
    fixture.detectChanges();
    http.expectOne(base + '/configuracao').flush(c);
    await estabilizar();
  }

  it('ignora proprietário para ações e trata estado desconhecido sem executar efeitos', async () => {
    await iniciar({ ...config, permissoes: { habilitar: false, configurar: false, consultar: false, enviar: false } });
    expect(fixture.nativeElement.textContent).toContain('Estado precisa ser atualizado');
    page.criar();
    page.direito(false);
    page.abrirEnvio();
    http.expectNone(r => r.method !== 'GET');
    expect(fixture.nativeElement.textContent).not.toContain('Nova mensagem');
  });

  it('habilita e cria o vínculo sem provisionamento ou campos de autoridade', async () => {
    const inativa = { ...config, direito: { ...config.direito, local: false }, conexao: null, preferencia: null, estado: null };
    await iniciar(inativa);
    page.direito(true);
    const direito = http.expectOne(base + '/direito');
    expect(direito.request.method).toBe('PUT');
    expect(direito.request.body).toEqual({ habilitado: true });
    direito.flush({ mudou: true, direito: config.direito });
    await Promise.resolve();
    http.expectOne(base + '/configuracao').flush({ ...config, conexao: null });
    await estabilizar();
    page.criar();
    const criar = http.expectOne(base + '/conexoes');
    expect(criar.request.body).toBeNull();
    criar.flush({ id: 'conexao-teste', estado: 'NAO_PROVISIONADA' });
    await Promise.resolve();
    http.expectOne(base + '/configuracao').flush(config);
    await estabilizar();
    http.expectNone(conexao + '/provisionar');
  });

  it('exige confirmação para desabilitar', async () => {
    await iniciar();
    page.direito(false);
    http.expectNone(base + '/direito');
    TestBed.inject(MatDialog).openDialogs[0].close(true);
    await estabilizar();
    const request = http.expectOne(base + '/direito');
    expect(request.request.body).toEqual({ habilitado: false });
    request.flush({ mudou: true, direito: config.direito });
    await Promise.resolve();
    http.expectOne(base + '/configuracao').flush({ ...config, direito: { ...config.direito, local: false } });
    await estabilizar();
  });

  it('separa provisionamento, atualização de estado, webhook e desconexão', async () => {
    await iniciar();
    page.conexao('provisionar');
    const provisionar = http.expectOne(conexao + '/provisionar');
    expect(provisionar.request.body).toBeNull();
    provisionar.flush(config.estado);
    await Promise.resolve();
    http.expectOne(base + '/configuracao').flush(config);
    await estabilizar();
    http.expectNone(conexao + '/qr');
    page.conexao('reconciliar');
    http.expectOne(conexao + '/reconciliar').flush(config.estado);
    await Promise.resolve();
    http.expectOne(base + '/configuracao').flush(config);
    await estabilizar();
    page.consultarWebhook();
    const consulta = http.expectOne(conexao + '/webhook');
    expect(consulta.request.method).toBe('GET');
    consulta.flush({ situacao: 'NAO_CONFIGURADO' });
    await estabilizar();
    page.consultarWebhook(true);
    const configurar = http.expectOne(conexao + '/webhook');
    expect(configurar.request.method).toBe('POST');
    expect(configurar.request.body).toBeNull();
    configurar.flush({ situacao: 'CONFIRMADO' });
    await estabilizar();
    page.conexao('desconectar');
    http.expectNone(conexao + '/desconectar');
    TestBed.inject(MatDialog).openDialogs[0].close(true);
    await estabilizar();
    http.expectOne(conexao + '/desconectar').flush({ ...config.estado, observado: 'FECHADA' });
    await Promise.resolve();
    http.expectOne(base + '/configuracao').flush(config);
    await estabilizar();
  });

  it('usa versão recebida e recarrega após conflito sem repetir PUT', async () => {
    await iniciar();
    page.preferencia(false);
    const req = http.expectOne(conexao + '/preferencia');
    expect(req.request.body).toEqual({ ativa: false, versao: 8 });
    req.flush({ codigo: 'PREFERENCIA_CONFLITO' }, { status: 409, statusText: 'Conflict' });
    await Promise.resolve();
    http.expectOne(base + '/configuracao').flush({ ...config, preferencia: { ...config.preferencia!, versao: 9, pausada: true } });
    await estabilizar();
    http.expectNone(conexao + '/preferencia');
    expect(page.config?.preferencia?.versao).toBe(9);
    expect(toast.error).toHaveBeenCalledWith('A configuração foi alterada em outra sessão.');
  });

  it('limpa QR e cancela leituras quando o contexto muda', async () => {
    await iniciar();
    page.abrirQr();
    http.expectOne(conexao + '/qr').flush({ situacao: 'DISPONIVEL', imagem: 'data:image/png;base64,AA==', expiraEm: null });
    await estabilizar();
    expect(page.qr?.imagem).toBeTruthy();
    usuario$.next(null);
    await estabilizar();
    expect(page.qr).toBeNull();
    expect(page.config).toBeNull();
  });

  it('repete a mesma chave, corpo e validade após perda de transporte e cria nova chave em nova mensagem', async () => {
    await iniciar();
    page.abrirEnvio();
    page.numero = '+15555550123';
    page.texto = 'Mensagem fictícia';
    void page.enviar();
    const primeira = http.expectOne(conexao + '/mensagens');
    const chave = primeira.request.headers.get('Idempotency-Key');
    const corpo = primeira.request.body;
    expect(chave).toBeTruthy();
    expect(Object.keys(corpo).sort()).toEqual(['expiraEm', 'numero', 'texto']);
    primeira.error(new ProgressEvent('error'));
    await estabilizar();
    expect(page.podeRepetir).toBeTrue();
    void page.enviar();
    const repeticao = http.expectOne(conexao + '/mensagens');
    expect(repeticao.request.body).toEqual(corpo);
    expect(repeticao.request.body.expiraEm).toBe(corpo.expiraEm);
    expect(repeticao.request.headers.get('Idempotency-Key')).toBe(chave);
    repeticao.flush(mensagem, { status: 202, statusText: 'Accepted' });
    await estabilizar();
    expect(toast.success).toHaveBeenCalledWith('Mensagem adicionada à fila.');
    page.abrirEnvio();
    page.numero = '+15555550123';
    page.texto = 'Mensagem fictícia';
    void page.enviar();
    const nova = http.expectOne(conexao + '/mensagens');
    expect(nova.request.headers.get('Idempotency-Key')).not.toBe(chave);
    nova.flush(mensagem, { status: 202, statusText: 'Accepted' });
    await estabilizar();
  });

  it('mostra lista mobile, resumo cumulativo e detalhe indisponível sem retry para INCERTA', async () => {
    mobile = true;
    fixture.detectChanges();
    http.expectOne(base + '/configuracao').flush({ ...config, permissoes: { ...config.permissoes, consultar: true } });
    await Promise.resolve();
    const lista = http.expectOne(r => r.url === base + '/mensagens');
    expect(lista.request.params.keys().sort()).toEqual(['fim', 'inicio', 'pagina', 'tamanho']);
    lista.flush([{ mensagem, destinatarioMascarado: '***0123', conteudoDisponivel: false }]);
    const resumo = http.expectOne(r => r.url === base + '/resumo');
    expect(resumo.request.params.get('fuso')).toBe('America/Sao_Paulo');
    resumo.flush({ ...page.filtro, fuso: 'America/Sao_Paulo', calculadoEm: mensagem.criadaEm,
      mensagens: { total: 1, aceitas: 0, entregues: 0, lidas: 0, falhas: 0, backlogAtual: 0, incertasAtuais: 1 } });
    await estabilizar();
    expect(fixture.nativeElement.querySelector('.item-mobile')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-mobile-fab-action')).not.toBeNull();
    void page.abrirDetalhe(page.itens[0]);
    http.expectOne(conexao + '/mensagens/mensagem-teste').flush({ mensagem, destinatario: null, texto: null, conteudoDisponivel: false });
    await Promise.resolve();
    http.expectOne(conexao + '/mensagens/mensagem-teste/tentativas').flush([{ id: 't1', numero: 1, resultado: 'INCERTA' }]);
    await estabilizar();
    const painel = document.querySelector('.mobile-side-panel');
    expect(painel?.textContent).toContain('O conteúdo desta mensagem não está mais disponível.');
    expect(painel?.textContent).toContain('Tentativa 1');
    expect(painel?.textContent).not.toMatch(/Reenviar|Liberar|Confirmar entrega/);
  });
});
