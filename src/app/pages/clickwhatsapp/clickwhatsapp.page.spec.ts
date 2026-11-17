import { TablerIconsModule } from 'angular-tabler-icons';
import { IconBrandWhatsapp, IconMessageCircle, IconSend } from 'angular-tabler-icons/icons';
import { BreakpointObserver } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, of, Subject } from 'rxjs';
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
  let rota: { snapshot: { data: { area: string }; queryParamMap: ReturnType<typeof convertToParamMap> } };
  let toast: jasmine.SpyObj<ToastrService>;

  beforeEach(() => {
    mobile = false;
    rota = { snapshot: { data: { area: 'visao' }, queryParamMap: convertToParamMap({}) } };
    usuario$ = new BehaviorSubject<Usuario | null>({ id: 1, proprietario: true });
    toast = jasmine.createSpyObj('ToastrService', ['error', 'warning', 'success']);
    TestBed.configureTestingModule({
      imports: [ClickWhatsAppPage, TablerIconsModule.pick({ IconBrandWhatsapp, IconMessageCircle, IconSend })],
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: rota }, provideNoopAnimations(), provideHttpClient(), provideHttpClientTesting(),
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
    http.expectOne(base + '/configuracao').flush(config);
    await estabilizar();
    http.expectOne(conexao + '/webhook').flush({ situacao: 'CONFIRMADO' });
    await estabilizar();
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
    http.expectOne(base + '/configuracao').flush(config); flushMicrotasks();
    http.expectOne(conexao + '/webhook').flush({ situacao: 'CONFIRMADO' }); flushMicrotasks();
    http.expectOne(conexao + '/qr').flush({ situacao: 'DISPONIVEL', imagem: 'data:image/png;base64,AA==', expiraEm: null });
    flushMicrotasks();

    tick(5000);
    http.expectOne(conexao + '/reconciliar').flush({ ...config.estado, observado: 'CONECTANDO' });
    flushMicrotasks();
    expect(page.qr?.situacao).toBe('DISPONIVEL');

    tick(10000);
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
    tick(10000);
    const fechada: Configuracao = { ...config, estado: { ...config.estado!, observado: 'FECHADA' } };
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
    http.expectOne(base + '/configuracao').flush(config); flushMicrotasks();
    http.expectOne(conexao + '/webhook').flush({ situacao: 'CONFIRMADO' }); flushMicrotasks();
    http.expectOne(conexao + '/qr').flush({ situacao: 'DISPONIVEL', imagem: 'data:image/png;base64,AA==',
      expiraEm: new Date(Date.now() + 1000).toISOString() });
    flushMicrotasks();
    tick(1000);
    expect(page.qr).toBeNull();
    expect(page.erroModal).toContain('QR expirou');
    http.expectNone(conexao + '/qr');
    fixture.destroy();
  }));

  it('registra o ID do cliente selecionado e mantém o corpo ao repetir o aceite', async () => {
    await iniciar();
    page.abrirEnvio();
    page.selecionarCliente({ id: 91, nome: 'Cliente escolhido', email: '', telefone: '(31) 98765-4321' });
    page.texto = 'Mensagem fictícia';
    void page.enviar();
    const aceite = http.expectOne(conexao + '/mensagens');
    expect(aceite.request.body).toEqual(jasmine.objectContaining({ numero: '5531987654321', clienteId: 91 }));
    aceite.error(new ProgressEvent('error'));
    await estabilizar();
    void page.enviar();
    const repeticao = http.expectOne(conexao + '/mensagens');
    expect(repeticao.request.body).toEqual(aceite.request.body);
    repeticao.flush(mensagem, { status: 202, statusText: 'Accepted' });
    await estabilizar();
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
    http.expectOne(base + '/configuracao').flush({ ...config, acoesPermitidas: { ...config.acoesPermitidas, consultarHistorico: true } });
    await Promise.resolve();
    const lista = http.expectOne(r => r.url === base + '/mensagens');
    expect(lista.request.params.keys().sort()).toEqual(['fim', 'inicio', 'pagina', 'tamanho']);
    expect(lista.request.params.get('tamanho')).toBe('5');
    lista.flush([{ mensagem, destinatario: '15555550123', conteudoDisponivel: false }]);
    const resumo = http.expectOne(r => r.url === base + '/resumo');
    expect(resumo.request.params.get('fuso')).toBe('America/Sao_Paulo');
    resumo.flush({ ...page.filtro, fuso: 'America/Sao_Paulo', calculadoEm: mensagem.criadaEm,
      mensagens: { total: 1, aceitas: 0, entregues: 0, lidas: 0, falhas: 0, backlogAtual: 0, incertasAtuais: 1 } });
    await estabilizar();
    expect(fixture.nativeElement.querySelector('.item-mobile')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.tabela-resumo tbody tr').length).toBe(7);
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
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[aria-controls="ocorrencias-na-visao"]').click();
    http.expectOne(r => r.url === base + '/ocorrencias').flush([
      { mensagem: mensagem.id, conexao: mensagem.conexao, tentativa: 't1', fase: 'INCERTA', iniciadaEm: mensagem.criadaEm },
    ]);
    await estabilizar();
    const ocorrencia = fixture.nativeElement.querySelector('#ocorrencias-na-visao button.item-mobile');
    expect(ocorrencia).not.toBeNull();
    ocorrencia.click();
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
    http.expectOne(r => r.url === base + '/ocorrencias').flush([]);
    http.expectOne(r => r.url === base + '/resumo').flush({ mensagens: { incertasAtuais: 0 } });
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

  it('mantém manutenção pós-revogação e oculta controles técnicos', async () => {
    Object.defineProperty(page, 'area', { value: 'configuracoes' });
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
    expect(conteudo).toContain('Ativar ClickWhatsApp');
    expect(conteudo).toContain('Desativado');
    expect(conteudo).toContain('Verificar conexão');
    expect(conteudo).toContain('Desconectar WhatsApp');
    expect(conteudo).not.toMatch(/Instância preparada|Consultar webhook|Configurar webhook|Administração do módulo/);
    expect(fixture.nativeElement.querySelector('button.mat-primary')).toBeNull();
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

  it('pagina o histórico na Visão geral e abre o detalhe no painel lateral desktop', async () => {
    fixture.detectChanges();
    http.expectOne(base + '/configuracao').flush({ ...config,
      acoesPermitidas: { ...config.acoesPermitidas, consultarHistorico: true } });
    await Promise.resolve();
    const item = { mensagem, destinatario: '15555550123', conteudoDisponivel: false };
    http.expectOne(r => r.url === base + '/mensagens' && r.params.get('tamanho') === '5').flush([item]);
    http.expectOne(r => r.url === base + '/resumo').flush({ ...page.filtro, mensagens: { incertasAtuais: 0 } });
    await estabilizar();
    const botao = (texto: string) => Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(b => b.textContent?.trim() === texto)!;
    botao('Ver todas as mensagens').click();
    const historico = http.expectOne(r => r.url === base + '/mensagens' && r.params.get('tamanho') === '20');
    expect(historico.request.params.get('pagina')).toBe('0');
    historico.flush(Array.from({ length: 20 }, (_, i) => ({ ...item, mensagem: { ...mensagem, id: 'msg-' + i } })));
    await estabilizar();
    botao('Próxima').click();
    http.expectOne(r => r.url === base + '/mensagens' && r.params.get('pagina') === '1').flush([item]);
    await estabilizar();
    botao('Ver detalhe').click();
    http.expectOne(conexao + '/mensagens/mensagem-teste').flush({ mensagem, destinatario: null, texto: null, conteudoDisponivel: false });
    await Promise.resolve();
    http.expectOne(conexao + '/mensagens/mensagem-teste/tentativas').flush([]);
    await estabilizar();
    expect(document.querySelector('.mobile-side-panel')?.textContent).toContain('Detalhe da mensagem');
    expect(page.area).toBe('visao');
    expect(page.paginaHistorico).toBe(1);
  });

  it('expande a lista de ocorrências no card da Visão geral e consulta somente ao abrir', async () => {
    fixture.detectChanges();
    http.expectOne(base + '/configuracao').flush({ ...config,
      acoesPermitidas: { ...config.acoesPermitidas, consultarHistorico: true } });
    await Promise.resolve();
    http.expectOne(r => r.url === base + '/mensagens').flush([]);
    http.expectOne(r => r.url === base + '/resumo').flush({ ...page.filtro, mensagens: { incertasAtuais: 0 } });
    await estabilizar();
    const botao: HTMLButtonElement = fixture.nativeElement.querySelector('[aria-controls="ocorrencias-na-visao"]');
    const painel: HTMLElement = fixture.nativeElement.querySelector('#ocorrencias-na-visao');
    expect(painel.hidden).toBeTrue();
    http.expectNone(r => r.url === base + '/ocorrencias');
    botao.click();
    http.expectOne(r => r.url === base + '/ocorrencias').flush([]);
    await estabilizar();
    expect(painel.hidden).toBeFalse();
    expect(painel.textContent).toContain('Nenhuma ocorrência registrada.');
    botao.click();
    fixture.detectChanges();
    expect(painel.hidden).toBeTrue();
  });

  it('registra pelo compositor e recupera a mesma intenção após perder a resposta', async () => {
    fixture.destroy();
    rota.snapshot.data.area = 'mensagens';
    fixture = TestBed.createComponent(ClickWhatsAppPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(base + '/configuracao').flush({ ...config,
      acoesPermitidas: { ...config.acoesPermitidas, consultarHistorico: true, enviarMensagem: true } });
    await estabilizar();
    http.expectOne(r => r.url === base + '/conversas').flush({ itens: [], temMais: false });
    await estabilizar();
    page.conversas!.escolherCliente({ id: 9, nome: 'Cliente', telefone: '31987654321' } as any);
    void page.conversas!.continuar();
    http.expectOne(r => r.url === base + '/conversas').flush({ itens: [], temMais: false });
    await estabilizar();
    page.conversas!.texto = 'Envio pelo compositor';
    page.conversas!.enviar();
    const primeira = http.expectOne(conexao + '/mensagens');
    expect(primeira.request.body.clienteId).toBe(9);
    const chave = primeira.request.headers.get('Idempotency-Key');
    primeira.error(new ProgressEvent('error'));
    await estabilizar();
    page.conversas!.enviar();
    const repeticao = http.expectOne(conexao + '/mensagens');
    expect(repeticao.request.body).toEqual(primeira.request.body);
    expect(repeticao.request.headers.get('Idempotency-Key')).toBe(chave);
    repeticao.flush(mensagem, { status: 202, statusText: 'Accepted' });
    await Promise.resolve();
    http.expectOne(r => r.url === base + '/conversas').flush({ itens: [], temMais: false });
    await estabilizar();
    expect(page.pendente).toBeNull();
    expect(page.conversas!.texto).toBe('');
    expect(toast.success).toHaveBeenCalledWith('Mensagem adicionada à fila.');
  });

  it('abre Mensagens com a consulta agrupada e sem os controles de ocorrências', async () => {
    fixture.destroy();
    rota.snapshot.data.area = 'mensagens';
    fixture = TestBed.createComponent(ClickWhatsAppPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(base + '/configuracao').flush({ ...config,
      acoesPermitidas: { ...config.acoesPermitidas, consultarHistorico: true } });
    await estabilizar();
    const consulta = http.expectOne(r => r.url === base + '/conversas');
    expect(consulta.request.params.get('pagina')).toBe('0');
    consulta.flush({ itens: [], temMais: false });
    await estabilizar();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma conversa ainda');
    expect(fixture.nativeElement.textContent).not.toContain('Ocorrências');
    expect(fixture.nativeElement.querySelector('button[aria-label="Atualizar histórico"]')).not.toBeNull();
  });

  it('oculta controles técnicos e concentra conexão em Configurações', async () => {
    await iniciar();
    expect(fixture.nativeElement.textContent).not.toContain('Configurar webhook');
    fixture.destroy();
    rota.snapshot.data.area = 'configuracoes';
    fixture = TestBed.createComponent(ClickWhatsAppPage);
    page = fixture.componentInstance;
    await iniciar();
    expect(fixture.nativeElement.textContent).not.toContain('Configurar webhook');
    expect(fixture.nativeElement.textContent).toContain('Desconectar WhatsApp');
    expect(fixture.nativeElement.textContent).not.toContain('Nova mensagem');
  });

  async function prepararExistente() {
    page.abrirQr();
    http.expectOne(base + '/configuracao').flush(config); await estabilizar();
    http.expectOne(conexao + '/webhook').flush({ situacao: 'CONFIRMADO' }); await estabilizar();
  }
  it('configurações apresenta três blocos em ordem e nenhuma mutação ao entrar', async () => {
    Object.defineProperty(page, 'area', { value: 'configuracoes' }); await iniciar();
    const blocos = fixture.nativeElement.querySelectorAll('.configuracao-bloco');
    expect(Array.from(blocos).map((b: any) => b.getAttribute('aria-label'))).toEqual(['Ativar ClickWhatsApp', 'Seu WhatsApp', 'Envio de mensagens']);
    expect(fixture.nativeElement.textContent).not.toContain('Webhook');
    http.expectNone(r => r.method !== 'GET');
  });
  for (const area of ['visao', 'mensagens', 'automacoes']) {
    it('avisa desativação em ' + area + ' e conserva acesso de consulta', async () => {
      Object.defineProperty(page, 'area', { value: area });
      await iniciar({ ...config, direito: { ...config.direito, local: false },
        acoesPermitidas: { ...config.acoesPermitidas, habilitarDireito: true, enviarMensagem: false, consultarHistorico: false } });
      expect(fixture.nativeElement.querySelector('app-clickwhatsapp-aviso-desativado')?.textContent).toContain('ClickWhatsApp desativado');
      expect(fixture.nativeElement.querySelector('app-clickwhatsapp-aviso-desativado a')).not.toBeNull();
      page.abrirEnvio(); http.expectNone(r => r.method !== 'GET');
    });
  }
  it('operador recebe aviso sem atalho indevido e switch de direito desabilitado', async () => {
    Object.defineProperty(page, 'area', { value: 'configuracoes' });
    usuario$.next({ id: 2, proprietario: false });
    await iniciar({ ...config, direito: { ...config.direito, local: false }, acoesPermitidas: { ...config.acoesPermitidas, habilitarDireito: false, desabilitarDireito: false } });
    expect(fixture.nativeElement.querySelector('button[aria-label="Ativar ClickWhatsApp"]').disabled).toBeTrue();
    page.direito(true); http.expectNone(base + '/direito');
  });
  it('erro na habilitação conserva estado anterior e evita duplicidade', async () => {
    await iniciar({ ...config, direito: { ...config.direito, local: false }, acoesPermitidas: { ...config.acoesPermitidas, habilitarDireito: true } });
    page.direito(true); page.direito(true);
    http.expectOne(base + '/direito').flush({}, { status: 503, statusText: 'Unavailable' }); await estabilizar();
    expect(page.config?.direito.local).toBeFalse(); expect(toast.error).toHaveBeenCalled();
    http.expectNone(conexao + '/preferencia');
  });
  it('conectar existente consulta preparação e webhook antes de QR, sem reprovisionar', async () => {
    await iniciar(); await prepararExistente();
    http.expectNone(conexao + '/provisionar'); http.expectNone(base + '/conexoes'); http.expectNone(conexao + '/webhook');
    http.expectOne(conexao + '/qr').flush({ situacao: 'DISPONIVEL', imagem: 'data:image/png;base64,AA==', expiraEm: null }); await estabilizar();
    expect(document.querySelector('.mobile-side-panel')).not.toBeNull(); expect(page.etapaConexao).toBe('aguardando');
    expect(localStorage.getItem('qr')).toBeNull(); expect(sessionStorage.getItem('qr')).toBeNull();
  });
  it('orquestra vínculo novo, provisionamento e configuração confirmada antes do QR', async () => {
    const semConexao: Configuracao = { ...config, conexao: null, estado: null, provisionamento: null, preferencia: null,
      acoesPermitidas: { ...config.acoesPermitidas, criarConexao: true, gerarQr: false } };
    await iniciar(semConexao); page.abrirQr(); http.expectOne(base + '/configuracao').flush(semConexao); await estabilizar();
    http.expectOne(base + '/conexoes').flush({ id: 'conexao-teste', estado: 'NAO_PROVISIONADA' }); await estabilizar();
    const registrada: Configuracao = { ...config, provisionamento: { situacao: 'NAO_PROVISIONADA' }, acoesPermitidas: { ...config.acoesPermitidas, provisionar: true, gerarQr: false } };
    http.expectOne(base + '/configuracao').flush(registrada); await estabilizar();
    http.expectOne(conexao + '/provisionar').flush(config.estado); await estabilizar();
    http.expectOne(base + '/configuracao').flush(config); await estabilizar();
    http.expectOne(conexao + '/webhook').flush({ situacao: 'NAO_CONFIGURADO' }); await estabilizar();
    const webhook = http.expectOne(conexao + '/webhook'); expect(webhook.request.method).toBe('POST');
    webhook.flush({ situacao: 'CONFIRMADO' }); await estabilizar();
    http.expectOne(conexao + '/qr').flush({ situacao: 'DISPONIVEL', imagem: 'data:image/png;base64,AA==', expiraEm: null }); await estabilizar();
    expect(page.etapaConexao).toBe('aguardando'); http.expectNone(conexao + '/preferencia');
  });
  it('falha de webhook impede QR e não expõe detalhes técnicos', async () => {
    await iniciar(); page.abrirQr(); http.expectOne(base + '/configuracao').flush(config); await estabilizar();
    http.expectOne(conexao + '/webhook').flush({ situacao: 'NAO_CONFIGURADO' }); await estabilizar();
    http.expectOne(conexao + '/webhook').flush({ situacao: 'INCERTO' }); await estabilizar();
    expect(page.etapaConexao).toBe('falha'); expect(page.qr).toBeNull();
    expect(page.erroModal).not.toMatch(/https?:|webhook|token|secret/i); http.expectNone(conexao + '/qr');
  });
  it('webhook incerto exige consulta antes de nova mutação', async () => {
    await iniciar(); page.abrirQr(); http.expectOne(base + '/configuracao').flush(config); await estabilizar();
    http.expectOne(conexao + '/webhook').flush({ situacao: 'INCERTO' }); await estabilizar();
    expect(page.etapaConexao).toBe('falha'); http.expectNone(r => r.method === 'POST');
    void page.prepararConexao(); http.expectOne(base + '/configuracao').flush(config); await estabilizar();
    http.expectOne(conexao + '/webhook').flush({ situacao: 'CONFIRMADO' }); await estabilizar();
    http.expectOne(conexao + '/qr').flush({ situacao: 'JA_CONECTADA', imagem: null, expiraEm: null }); await estabilizar();
    http.expectOne(base + '/configuracao').flush({ ...config, estado: { ...config.estado!, observado: 'ABERTA' } }); await estabilizar();
    expect(page.etapaConexao).toBe('sucesso');
  });
  it('não provisiona situação desconhecida nem repete provisionamento em andamento', async () => {
    const incerta: Configuracao = { ...config, provisionamento: { situacao: 'DESCONHECIDA' }, acoesPermitidas: { ...config.acoesPermitidas, provisionar: true } };
    await iniciar(incerta); page.abrirQr(); http.expectOne(base + '/configuracao').flush(incerta); await estabilizar();
    expect(page.falhaConexaoImpeditiva).toBeTrue(); http.expectNone(r => r.method === 'POST');
  });
  it('fechar durante preparação cancela consulta e impede a próxima etapa', async () => {
    await iniciar(); page.abrirQr(); const consulta = http.expectOne(base + '/configuracao');
    TestBed.inject(MatDialog).closeAll(); await estabilizar();
    expect(consulta.cancelled).toBeTrue(); expect(page.qr).toBeNull(); http.expectNone(r => r.method === 'POST');
  });
  it('sem validade do provedor não inventa expiração nem gera QR em loop', fakeAsync(() => {
    spyOnProperty(document, 'hidden', 'get').and.returnValue(true);
    fixture.detectChanges(); http.expectOne(base + '/configuracao').flush(config); flushMicrotasks(); fixture.detectChanges();
    page.abrirQr(); http.expectOne(base + '/configuracao').flush(config); flushMicrotasks();
    http.expectOne(conexao + '/webhook').flush({ situacao: 'CONFIRMADO' }); flushMicrotasks();
    http.expectOne(conexao + '/qr').flush({ situacao: 'DISPONIVEL', imagem: 'data:image/png;base64,AA==', expiraEm: null }); flushMicrotasks();
    tick(120000); expect(page.qr?.situacao).toBe('DISPONIVEL'); http.expectNone(r => r.method === 'POST');
    fixture.detectChanges();
    const novoQr = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Gerar novo QR');
    expect(novoQr).toBeDefined(); novoQr!.click();
    http.expectOne(conexao + '/qr').flush({ situacao: 'DISPONIVEL', imagem: 'data:image/png;base64,AA==', expiraEm: null }); flushMicrotasks();
    expect(page.qr?.situacao).toBe('DISPONIVEL'); fixture.destroy();
  }));
  it('QR expirado é limpo e somente ação explícita solicita outro', fakeAsync(() => {
    spyOnProperty(document, 'hidden', 'get').and.returnValue(true);
    fixture.detectChanges(); http.expectOne(base + '/configuracao').flush(config); flushMicrotasks(); fixture.detectChanges();
    page.abrirQr(); http.expectOne(base + '/configuracao').flush(config); flushMicrotasks();
    http.expectOne(conexao + '/webhook').flush({ situacao: 'CONFIRMADO' }); flushMicrotasks();
    http.expectOne(conexao + '/qr').flush({ situacao: 'DISPONIVEL', imagem: 'data:image/png;base64,AA==', expiraEm: new Date(Date.now()+1000).toISOString() }); flushMicrotasks();
    tick(1000); expect(page.etapaConexao).toBe('expirado'); expect(page.qr).toBeNull(); http.expectNone(conexao + '/qr');
    void page.solicitarQr(); http.expectOne(conexao + '/qr').flush({ situacao: 'INDISPONIVEL', imagem: null, expiraEm: null }); flushMicrotasks(); fixture.destroy();
  }));
  it('timeout de estado não afirma desconexão e não gera QR automaticamente', fakeAsync(() => {
    spyOnProperty(document, 'hidden', 'get').and.returnValue(true);
    fixture.detectChanges(); http.expectOne(base + '/configuracao').flush({ ...config, estado: { ...config.estado!, observado: 'ABERTA' } }); flushMicrotasks();
    void page.verificarConexao(); const req = http.expectOne(conexao + '/reconciliar'); tick(12000); flushMicrotasks();
    expect(req.cancelled).toBeTrue(); expect(page.estadoConfiguracao).toBe('Estado desconhecido'); expect(page.config?.estado?.observado).toBe('ABERTA');
    http.expectNone(conexao + '/qr'); fixture.destroy();
  }));
  it('troca de ator durante preparação cancela a leitura e limpa painel', async () => {
    await iniciar(); page.abrirQr(); const req = http.expectOne(base + '/configuracao');
    usuario$.next({ id: 2, proprietario: false }); await estabilizar();
    expect(req.cancelled).toBeTrue(); expect(page.qr).toBeNull();
    http.expectOne(base + '/configuracao').flush(config); await estabilizar(); http.expectNone(r => r.method === 'POST');
  });

  it('confirma desabilitação sem repetir cliques e sem logout', async () => {
    await iniciar(); const dialog = fixture.debugElement.injector.get(MatDialog);
    const confirmacao = new Subject<boolean>();
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => confirmacao } as any);
    page.direito(false); page.direito(false); expect(dialog.open).toHaveBeenCalledTimes(1);
    confirmacao.next(false); confirmacao.complete(); await estabilizar();
    http.expectNone(base + '/direito'); http.expectNone(conexao + '/desconectar');
    expect(page.config?.direito.local).toBeTrue();
  });
  it('falha de logout preserva direito e histórico e não altera preferência', async () => {
    await iniciar(); const dialog = fixture.debugElement.injector.get(MatDialog);
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(true) } as any);
    page.conexao('desconectar'); await estabilizar();
    http.expectOne(conexao + '/desconectar').flush({}, { status: 503, statusText: 'Unavailable' }); await estabilizar();
    expect(page.config?.direito.local).toBeTrue(); expect(page.config?.preferencia?.versao).toBe(8);
    http.expectNone(conexao + '/preferencia'); http.expectNone(base + '/direito'); expect(toast.error).toHaveBeenCalled();
  });
  it('direito inativo impede QR e novos envios mesmo com preferência ativa', async () => {
    await iniciar({ ...config, direito: { ...config.direito, local: false } });
    expect(page.podeEnviar).toBeFalse(); expect(page.podeConectar).toBeFalse();
    page.abrirQr(); page.abrirEnvio(); http.expectNone(r => r.method === 'POST');
  });
  it('troca de vínculo durante preparação não consulta nem altera outra conexão', async () => {
    await iniciar({ ...config, conexao: null, acoesPermitidas: { ...config.acoesPermitidas, criarConexao: true } });
    page.abrirQr(); http.expectOne(base + '/configuracao').flush({ ...config, conexao: null, acoesPermitidas: { ...config.acoesPermitidas, criarConexao: true } }); await estabilizar();
    http.expectOne(base + '/conexoes').flush({ id: 'conexao-teste', estado: 'NAO_PROVISIONADA' }); await estabilizar();
    http.expectOne(base + '/configuracao').flush({ ...config, conexao: 'outra-conexao' }); await estabilizar();
    expect(page.falhaConexaoImpeditiva).toBeTrue(); http.expectNone(r => r.url.includes('/outra-conexao/'));
  });
  it('recusa imagem QR incompatível sem persistir ou renderizar conteúdo', async () => {
    await iniciar(); await prepararExistente();
    http.expectOne(conexao + '/qr').flush({ situacao: 'DISPONIVEL', imagem: 'https://exemplo.invalid/qr', expiraEm: null }); await estabilizar();
    expect(page.qr).toBeNull(); expect(page.etapaConexao).toBe('falha'); expect(document.querySelector('img.qr')).toBeNull();
  });
  it('timeout de provisionamento não repete mutação e exige reconsulta na recuperação', fakeAsync(() => {
    spyOnProperty(document, 'hidden', 'get').and.returnValue(true);
    const c: Configuracao = { ...config, provisionamento: { situacao: 'NAO_PROVISIONADA' }, acoesPermitidas: { ...config.acoesPermitidas, provisionar: true } };
    fixture.detectChanges(); http.expectOne(base + '/configuracao').flush(c); flushMicrotasks(); fixture.detectChanges();
    page.abrirQr(); http.expectOne(base + '/configuracao').flush(c); flushMicrotasks();
    const req = http.expectOne(conexao + '/provisionar'); tick(30000); flushMicrotasks();
    expect(req.cancelled).toBeTrue(); expect(page.etapaConexao).toBe('falha'); http.expectNone(r => r.method === 'POST');
    void page.prepararConexao(); http.expectOne(base + '/configuracao').flush({ ...config, provisionamento: { situacao: 'EM_ANDAMENTO' } }); flushMicrotasks();
    expect(page.falhaConexaoImpeditiva).toBeTrue(); http.expectNone(r => r.method === 'POST'); fixture.destroy();
  }));
  it('acompanhamento é limitado e fechar painel interrompe reconciliação', fakeAsync(() => {
    spyOnProperty(document, 'hidden', 'get').and.returnValue(false);
    fixture.detectChanges(); http.expectOne(base + '/configuracao').flush(config); flushMicrotasks(); fixture.detectChanges();
    page.abrirQr(); http.expectOne(base + '/configuracao').flush(config); flushMicrotasks();
    http.expectOne(conexao + '/webhook').flush({ situacao: 'CONFIRMADO' }); flushMicrotasks();
    http.expectOne(conexao + '/qr').flush({ situacao: 'DISPONIVEL', imagem: 'data:image/png;base64,AA==', expiraEm: null }); flushMicrotasks();
    for (let i=0; i<30; i++) {
      tick(i===0?5000:10000); http.expectOne(conexao + '/reconciliar').flush({ ...config.estado, observado: 'CONECTANDO' }); flushMicrotasks();
    }
    tick(20000); http.expectNone(conexao + '/reconciliar');
    TestBed.inject(MatDialog).closeAll(); tick(500); expect(page.qr).toBeNull();
    tick(30000); http.expectNone(conexao + '/reconciliar');
    const consultas = http.match(base + '/configuracao'); consultas.forEach(req => { if (!req.cancelled) req.flush(config); }); flushMicrotasks();
    fixture.destroy();
  }));

  it('desativação conserva a consulta autorizada de conversas e bloqueia novos envios', async () => {
    Object.defineProperty(page, 'area', { value: 'mensagens' });
    await iniciar({ ...config, direito: { ...config.direito, local: false },
      acoesPermitidas: { ...config.acoesPermitidas, enviarMensagem: false, consultarHistorico: true } });
    http.expectOne(r => r.url === base + '/conversas').flush({ itens: [], temMais: false }); await estabilizar();
    expect(fixture.nativeElement.textContent).toContain('ClickWhatsApp desativado');
    expect(fixture.nativeElement.textContent).toContain('Nenhuma conversa ainda');
    expect(page.podeEnviar).toBeFalse(); page.abrirEnvio(); http.expectNone(r => r.method !== 'GET');
  });
  it('desativação permite ler templates anteriores sem habilitar automações', async () => {
    Object.defineProperty(page, 'area', { value: 'automacoes' });
    await iniciar({ ...config, configurarAutomacoes: true, direito: { ...config.direito, local: false },
      acoesPermitidas: { ...config.acoesPermitidas, enviarMensagem: false } });
    http.expectOne(base + '/automacoes/pedidos').flush({ podeAtivar: false, variaveis: ['cliente_nome'], recentes: [],
      itens: [{ tipo: 'CRIADO', nome: 'Pedido criado', descricao: '', ativa: false, modelo: 'Texto anterior {cliente_nome}', previa: 'Texto anterior demonstrativo', revisao: 9 }] }); await estabilizar();
    expect(page.automacoes?.painel?.itens[0].modelo).toBe('Texto anterior {cliente_nome}');
    expect(page.automacoes?.painel?.itens[0].revisao).toBe(9);
    void page.automacoes?.salvar({ ...page.automacoes.painel!.itens[0], ativa: true }); await estabilizar();
    http.expectNone(r => r.method !== 'GET');
  });

  it('releitura da mesma observação antiga não apaga falha de verificação', async () => {
    const aberta: Configuracao = { ...config, estado: { observado: 'ABERTA', observadoEm: '2026-11-17T10:00:00Z', motivo: null } };
    await iniciar(aberta); void page.verificarConexao();
    http.expectOne(conexao + '/reconciliar').flush({}, { status: 503, statusText: 'Unavailable' }); await estabilizar();
    expect(page.estadoConfiguracao).toBe('Estado desconhecido');
    void page.carregar(); http.expectOne(base + '/configuracao').flush(aberta); await estabilizar();
    expect(page.estadoConfiguracao).toBe('Estado desconhecido');
    void page.verificarConexao(); http.expectOne(conexao + '/reconciliar').flush(aberta.estado); await estabilizar();
    http.expectOne(base + '/configuracao').flush(aberta); await estabilizar();
    expect(page.estadoConfiguracao).toBe('Conectado');
  });

});
