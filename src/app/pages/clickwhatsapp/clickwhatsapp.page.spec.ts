import { BreakpointObserver } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
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
    acoesPermitidas: {
      habilitarDireito: false, desabilitarDireito: true, criarConexao: false, provisionar: false,
      gerarQr: true, reconciliar: true, consultarWebhook: true, configurarWebhook: true,
      pausarEnvios: true, retomarEnvios: false, desconectar: true, enviarMensagem: true, consultarHistorico: false,
    },
    provisionamento: { situacao: 'PROVISIONADA' },
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
    await iniciar({ ...config, acoesPermitidas: Object.fromEntries(Object.keys(config.acoesPermitidas).map(k => [k, false])) as unknown as Configuracao['acoesPermitidas'] });
    expect(fixture.nativeElement.textContent).toContain('Estado precisa ser atualizado');
    page.criar();
    page.direito(false);
    page.abrirEnvio();
    http.expectNone(r => r.method !== 'GET');
    expect(fixture.nativeElement.textContent).not.toContain('Nova mensagem');
  });

  it('habilita e cria o vínculo sem provisionamento ou campos de autoridade', async () => {
    const inativa = { ...config, acoesPermitidas: { ...config.acoesPermitidas, habilitarDireito: true, desabilitarDireito: false }, direito: { ...config.direito, local: false }, conexao: null, preferencia: null, estado: null };
    await iniciar(inativa);
    page.direito(true);
    const direito = http.expectOne(base + '/direito');
    expect(direito.request.method).toBe('PUT');
    expect(direito.request.body).toEqual({ habilitado: true });
    direito.flush({ mudou: true, direito: config.direito });
    await Promise.resolve();
    http.expectOne(base + '/configuracao').flush({ ...config, conexao: null, acoesPermitidas: { ...config.acoesPermitidas, criarConexao: true } });
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
    await iniciar({ ...config, provisionamento: { situacao: 'NAO_PROVISIONADA' }, acoesPermitidas: { ...config.acoesPermitidas, provisionar: true } });
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

  it('confirma o QR por reconciliação e observa desconexão sem emitir outro QR', fakeAsync(() => {
    spyOnProperty(document, 'hidden', 'get').and.returnValue(false);
    fixture.detectChanges();
    http.expectOne(base + '/configuracao').flush(config);
    flushMicrotasks();
    fixture.detectChanges();
    page.abrirQr();
    http.expectOne(conexao + '/qr').flush({ situacao: 'DISPONIVEL', imagem: 'data:image/png;base64,AA==', expiraEm: null });
    flushMicrotasks();

    tick(5000);
    http.expectOne(conexao + '/reconciliar').flush({ ...config.estado, observado: 'CONECTANDO' });
    flushMicrotasks();
    expect(page.qr?.situacao).toBe('DISPONIVEL');

    tick(5000);
    const aberta: Configuracao = { ...config, estado: { ...config.estado!, observado: 'ABERTA' },
      acoesPermitidas: { ...config.acoesPermitidas, gerarQr: false } };
    http.expectOne(conexao + '/reconciliar').flush(aberta.estado);
    flushMicrotasks();
    http.expectOne(base + '/configuracao').flush(aberta);
    flushMicrotasks();
    expect(page.qr?.situacao).toBe('JA_CONECTADA');
    expect(page.qr?.imagem).toBeNull();
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(1);

    TestBed.inject(MatDialog).closeAll();
    tick(500);
    tick(30000);
    const fechada: Configuracao = { ...config, estado: { ...config.estado!, observado: 'FECHADA' } };
    http.expectOne(conexao + '/reconciliar').flush(fechada.estado);
    flushMicrotasks();
    http.expectOne(base + '/configuracao').flush(fechada);
    flushMicrotasks();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.estado-conexao').textContent).toContain('Desconectada');
    http.expectNone(conexao + '/qr');
    fixture.destroy();
  }));

  it('limita a espera do QR sem solicitar outro código automaticamente', fakeAsync(() => {
    spyOnProperty(document, 'hidden', 'get').and.returnValue(true);
    fixture.detectChanges();
    http.expectOne(base + '/configuracao').flush(config);
    flushMicrotasks();
    fixture.detectChanges();
    page.abrirQr();
    http.expectOne(conexao + '/qr').flush({ situacao: 'DISPONIVEL', imagem: 'data:image/png;base64,AA==',
      expiraEm: new Date(Date.now() + 1000).toISOString() });
    flushMicrotasks();
    tick(1000);
    expect(page.qr).toBeNull();
    expect(page.erroModal).toContain('não foi confirmado a tempo');
    http.expectNone(conexao + '/qr');
    fixture.destroy();
  }));

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
    http.expectOne(base + '/configuracao').flush({ ...config, acoesPermitidas: { ...config.acoesPermitidas, consultarHistorico: true } });
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
  it('investiga ocorrência sem chamar envio e atualiza histórico no painel mobile', async () => {
    mobile = true;
    await iniciar({ ...config, acoesPermitidas: { ...config.acoesPermitidas, consultarHistorico: false } });
    page.config = { ...config, acoesPermitidas: { ...config.acoesPermitidas, consultarHistorico: true } };
    page.verOcorrencias();
    const lista = http.expectOne(r => r.url === base + '/mensagens');
    expect(lista.request.params.get('fase')).toBe('INCERTA');
    lista.flush([{ mensagem, destinatarioMascarado: '***0123', conteudoDisponivel: false }]);
    await estabilizar();
    page.abrirOcorrencia(page.itens[0]);
    const url = conexao + '/mensagens/mensagem-teste';
    const caso = { mensagem: mensagem.id, tentativa: 't1', fase: 'INCERTA', resultado: 'PERMANECE_INCERTA',
      motivo: 'SEM_IDENTIFICADOR_WHATSAPP', evidencia: null, historico: [] };
    http.expectOne(url + '/ocorrencia').flush({ podeInvestigar: true, ocorrencia: caso });
    await estabilizar();
    expect(document.querySelector('.mobile-side-panel')?.textContent).toContain('Resultado ainda incerto');
    void page.carregarOcorrencia(true);
    const investigacao = http.expectOne(url + '/investigar');
    expect(investigacao.request.method).toBe('POST');
    expect(investigacao.request.body).toBeNull();
    investigacao.flush({ podeInvestigar: true, ocorrencia: { ...caso, fase: 'ACEITA',
      resultado: 'RESOLVIDA_COM_EVIDENCIA', motivo: 'ACEITE_COMPROVADO' } });
    await Promise.resolve();
    http.expectOne(r => r.url === base + '/mensagens').flush([]);
    http.expectOne(r => r.url === base + '/resumo').flush({ ...page.filtro, mensagens: {} });
    http.expectOne(base + '/configuracao').flush(page.config);
    await estabilizar();
    expect(document.querySelector('.mobile-side-panel')?.textContent).toContain('Resolvida com evidência');
    expect(document.querySelector('.mobile-side-panel')?.textContent).not.toMatch(/Reenviar|Investigar evidências/);
    http.expectNone(r => r.method === 'POST' && r.url.endsWith('/mensagens'));
  });

  it('lista ocorrências resolvidas e limita investigação à decisão do backend', async () => {
    await iniciar();
    page.config = { ...config, acoesPermitidas: { ...config.acoesPermitidas, consultarHistorico: true } };
    void page.listarOcorrencias();
    const lista = http.expectOne(base + '/ocorrencias?pagina=0');
    lista.flush([{ mensagem: mensagem.id, conexao: 'conexao-teste', tentativa: 't1',
      iniciadaEm: mensagem.criadaEm, fase: 'ACEITA' }]);
    await estabilizar();
    expect(page.listaOcorrencias?.length).toBe(1);
    page.abrirOcorrencia({ mensagem });
    http.expectOne(conexao + '/mensagens/mensagem-teste/ocorrencia').flush({
      podeInvestigar: false, ocorrencia: { mensagem: mensagem.id, tentativa: 't1', iniciadaEm: mensagem.criadaEm,
        fase: 'INCERTA', resultado: 'PERMANECE_INCERTA', motivo: 'SEM_IDENTIFICADOR_WHATSAPP', evidencia: null, historico: [] },
    });
    await estabilizar();
    expect(document.querySelector('mat-dialog-content')?.textContent).toContain('Os despachos desta conexão seguem suspensos');
    void page.carregarOcorrencia(true);
    http.expectNone(r => r.method === 'POST');
    expect(document.querySelector('mat-dialog-actions')?.textContent).not.toContain('Investigar evidências');
    void page.carregarOcorrencia();
    http.expectOne(conexao + '/mensagens/mensagem-teste/ocorrencia').flush({ codigo: 'APLICACAO_BLOQUEADA' },
      {status: 403, statusText: 'Forbidden'});
    await estabilizar();
    expect(page.erroModal).toContain('indisponível neste ambiente');
    usuario$.next(null);
    await estabilizar();
    expect(page.listaOcorrencias).toBeNull();
    expect(page.ocorrencia).toBeNull();
  });

  it('mostra manutenção pós-revogação e conserva a projeção de instância preparada', async () => {
    await iniciar({
      ...config,
      direito: { ...config.direito, local: false },
      permissoes: { ...config.permissoes, configurar: false, enviar: false },
      acoesPermitidas: {
        ...config.acoesPermitidas, habilitarDireito: true, desabilitarDireito: false, provisionar: false,
        gerarQr: false, configurarWebhook: false, enviarMensagem: false,
      },
    });
    const conteudo = fixture.nativeElement.textContent;
    expect(conteudo).toContain('Instância preparada.');
    expect(fixture.nativeElement.querySelector('.situacao').textContent).toContain('Desabilitado');
    expect(fixture.nativeElement.querySelector('.estado-conexao')).toBeNull();
    expect(conteudo).toContain('Atualizar estado');
    expect(conteudo).toContain('Consultar webhook');
    expect(conteudo).toContain('Desconectar WhatsApp');
    expect(conteudo).not.toMatch(/Provisionar conexão|Conectar WhatsApp|Nova mensagem|Configurar webhook/);
  });

  it('fecha o painel guardando a operação e repete a chave e o corpo ao reabrir', async () => {
    mobile = true;
    await iniciar();
    page.abrirEnvio();
    page.numero = '+15555550123';
    page.texto = 'Teste fictício';
    void page.enviar();
    const envio = http.expectOne(conexao + '/mensagens');
    envio.error(new ProgressEvent('error'));
    await estabilizar();
    page.solicitarFechamentoEnvio();
    await estabilizar();
    const painel = document.querySelector('.mobile-side-panel');
    expect(painel?.textContent).toContain('Fechar com a solicitação pendente?');
    Array.from(painel!.querySelectorAll('button')).find(b => b.textContent?.includes('Guardar e fechar'))!.click();
    await estabilizar();
    expect(fixture.nativeElement.textContent).toContain('Ver solicitação');
    page.abrirEnvio();
    expect(page.numero).toBe('+15555550123');
    void page.enviar();
    const repeticao = http.expectOne(conexao + '/mensagens');
    expect(repeticao.request.body).toEqual(envio.request.body);
    expect(repeticao.request.headers.get('Idempotency-Key')).toBe(envio.request.headers.get('Idempotency-Key'));
    repeticao.flush(mensagem, { status: 202, statusText: 'Accepted' });
    await estabilizar();
    expect(page.pendente).toBeNull();
  });

  for (const [tipo, novo] of [['empresa', { id: 1, empresa: { id: 2 } }], ['usuário', { id: 2 }]] as const) {
    it(`limpa a operação quando troca de ${tipo}`, async () => {
      await iniciar();
      page.abrirEnvio();
      page.numero = '+15555550123';
      page.texto = 'Teste fictício';
      void page.enviar();
      http.expectOne(conexao + '/mensagens').error(new ProgressEvent('error'));
      await estabilizar();
      usuario$.next(novo as Usuario);
      http.expectOne(base + '/configuracao').flush(config);
      await estabilizar();
      expect(page.pendente).toBeNull();
      expect(page.texto).toBe('');
    });
  }

  it('bloqueia expiração e conflito sem criar nova chave automaticamente', async () => {
    await iniciar();
    page.abrirEnvio();
    page.numero = '+15555550123';
    page.texto = 'Teste fictício';
    void page.enviar();
    const req = http.expectOne(conexao + '/mensagens');
    req.flush({ codigo: 'IDEMPOTENCIA_CONFLITO' }, { status: 409, statusText: 'Conflict' });
    await Promise.resolve();
    http.expectOne(base + '/configuracao').flush(config);
    await estabilizar();
    expect(page.podeRepetir).toBeFalse();
    expect(page.operacao?.chave).toBe(req.request.headers.get('Idempotency-Key') ?? undefined);
    page.pendente!.repetivel = true;
    const agora = spyOn(Date, 'now').and.returnValue(Date.parse(req.request.body.expiraEm) + 1);
    await page.enviar();
    expect(page.validadeEncerrada).toBeTrue();
    http.expectNone(conexao + '/mensagens');
    agora.and.callThrough();
  });

});
