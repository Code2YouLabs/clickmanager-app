import { AutomacoesPedidoComponent } from './automacoes/automacoes-pedido.component';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, NgZone, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef, MatDialogState } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ToastrService } from 'ngx-toastr';
import { catchError, distinctUntilChanged, firstValueFrom, map, Observable, of, Subject, takeUntil, timeout } from 'rxjs';
import { MessageWorkspaceComponent } from 'src/app/components/message-workspace/message-workspace.component';
import { MetricCardComponent } from 'src/app/components/metric-card/metric-card.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableItemDirective } from 'src/app/components/data-table/data-table-item.directive';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableColumn } from 'src/app/components/data-table/data-table.models';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { openMobileSidePanel } from 'src/app/components/mobile-side-panel/mobile-side-panel';
import { MobileFabActionComponent } from 'src/app/components/mobile-fab-action/mobile-fab-action.component';
import { AuthService } from 'src/app/services/auth.service';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
import { Configuracao, CONFIRMACOES, Detalhe, ESTADOS, falha, Fase, Confirmacao, FASES, Filtro, ItemHistorico, ItemOcorrencia, motivo, novaOperacao, OcorrenciaOperacional, Periodo, Qr, Resumo, Tentativa, Webhook, WEBHOOKS } from './clickwhatsapp.models';
import { ClickWhatsAppEnvioStore, contextoEnvio } from './clickwhatsapp-envio.store';
import { AutoCompleteComponent } from 'src/app/components/inputs/auto-complete/auto-complete.component';
import { ClienteService } from 'src/app/pages/cliente/cliente.service';
import { ClienteCreateDialogComponent } from 'src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component';
import { ClienteListagem } from 'src/app/models/cliente/cliente-listagem.model';
import { ClickWhatsAppService } from './clickwhatsapp.service';

interface ConsultaDetalhe {
  detalhe: Detalhe | null;
  tentativas: Tentativa[] | null;
  erro: string;
  erroTentativas: string;
  buscando: boolean;
}

@Component({
  selector: 'app-clickwhatsapp',
  standalone: true,
  imports: [RouterModule, AutomacoesPedidoComponent, CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatSelectModule, MatMenuModule, MatProgressBarModule, MatTooltipModule, PageCardComponent, SectionCardComponent, MetricCardComponent, DataTableComponent,
    DataTableCellDirective, DataTableItemDirective, MobileFabActionComponent, MessageWorkspaceComponent, AutoCompleteComponent],
  templateUrl: './clickwhatsapp.page.html',
  styleUrl: './clickwhatsapp.page.scss',
})
export class ClickWhatsAppPage implements OnInit {
  private readonly rota = inject(ActivatedRoute);
  private readonly envios = inject(ClickWhatsAppEnvioStore);
  private readonly api = inject(ClickWhatsAppService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastrService);
  private readonly zone = inject(NgZone);
  private readonly destroy = inject(DestroyRef);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly troca = new Subject<void>();
  private sessao = 0;
  private consulta = 0;
  private modal?: MatDialogRef<unknown>;
  private readonly documento = inject(DOCUMENT);
  private qrModal?: MatDialogRef<unknown>;
  private qrTimer?: ReturnType<typeof setTimeout>;

  @ViewChild('telaQr') telaQr!: TemplateRef<unknown>;
  @ViewChild('telaEnvio') telaEnvio!: TemplateRef<unknown>;
  @ViewChild('telaOcorrencia') telaOcorrencia!: TemplateRef<unknown>;
  @ViewChild('telaDetalhe') telaDetalhe!: TemplateRef<unknown>;
  @ViewChild('telaFiltros') telaFiltros!: TemplateRef<unknown>;

  readonly area = (this.rota.snapshot?.data?.['area'] ?? 'visao') as 'visao' | 'mensagens' | 'automacoes' | 'configuracoes';
  readonly titulos = { visao: 'ClickWhatsApp', mensagens: 'Mensagens', automacoes: 'Automações de Pedidos', configuracoes: 'Configurações do ClickWhatsApp' };
  readonly subtitulos = {
    visao: 'Gerencie as mensagens da sua empresa.',
    mensagens: 'Consulte os envios e acompanhe suas confirmações.',
    automacoes: 'Configure os avisos enviados automaticamente durante o andamento dos pedidos.',
    configuracoes: 'Gerencie a conexão e as preferências de envio.',
  };
  @ViewChild(AutomacoesPedidoComponent) automacoes?: AutomacoesPedidoComponent;
  podeSair() { return this.automacoes?.podeSair() ?? true; }
  get areaEnvio() { return this.area === 'visao' || this.area === 'mensagens'; }
  get podeAbrirConfiguracoes() { return this.possuiControlesConexao || this.acoes?.habilitarDireito || this.acoes?.desabilitarDireito; }

  config: Configuracao | null = null;
  carregando = false;
  erroConfig = '';
  acao = '';
  webhook: Webhook | null = null;
  qr: Qr | null = null;
  erroModal = '';
  verificandoConexao = false;
  verificacaoFalhou = false;
  private proximaVerificacao = 0;
  ocorrencia: OcorrenciaOperacional | null = null;
  lendoOcorrencia = false;
  private alvoOcorrencia: Pick<ItemHistorico['mensagem'], 'id' | 'conexao'> | null = null;
  readonly resultadosInvestigacao = {
    RESOLVIDA_COM_EVIDENCIA: 'Resolvida com evidência',
    PERMANECE_INCERTA: 'Resultado ainda incerto',
    EVIDENCIA_CONTRADITORIA: 'Evidência contraditória',
    SEM_TRANSMISSAO: 'Falha anterior à transmissão',
    INVESTIGACAO_INDISPONIVEL: 'Investigação indisponível',
  };
  readonly motivosInvestigacao: Record<string, string> = {
    MENSAGEM_TERMINAL: 'Esta mensagem está encerrada e permanece preservada.',
    ACEITE_COMPROVADO: 'Há evidência de aceite desta tentativa.',
    FALHA_ANTES_DA_TRANSMISSAO: 'O processamento registrou que a chamada não foi transmitida.',
    IDENTIFICADORES_DIVERGENTES: 'Os identificadores da evidência divergem. A confirmação permanece bloqueada.',
    SEM_EVIDENCIA_CONCLUSIVA: 'Ainda não há confirmação confiável desta tentativa.',
    SEM_IDENTIFICADOR_WHATSAPP: 'A tentativa não tem um identificador WhatsApp confirmado.',
  };
  readonly estadosEvidencia: Record<string, string> = {
    PENDING: 'Aceita pelo provedor', SERVER_ACK: 'Confirmada pelo servidor',
    DELIVERY_ACK: 'Entregue', READ: 'Lida',
  };
  detalheModal: ConsultaDetalhe | null = null;
  leituraSelecionada: ConsultaDetalhe | null = null;
  selecionada: ItemHistorico | null = null;
  private readonly fecharLeitura = new Subject<void>();
  private readonly clientes = inject(ClienteService);
  readonly clienteControl = new FormControl<ClienteListagem | string>('', { nonNullable: true });
  clienteSelecionado: ClienteListagem | null = null;

  readonly buscarClientes = (termo: string) =>
    this.clientes.listar(0, 20, termo).pipe(
      map(resposta => resposta.content),
      catchError(() => {
        this.erroModal = 'Não foi possível buscar clientes.';
        return of([]);
      }),
    );
  readonly mostrarCliente = (cliente: ClienteListagem | string | null) =>
    typeof cliente === 'string' ? cliente : cliente ? [cliente.nome, cliente.telefone].filter(Boolean).join(' · ') : '';

  readonly origens = {
    AVULSA: { rotulo: 'Mensagem avulsa', icone: 'chat_bubble_outline', estilo: 'avulsa' },
    PEDIDO_MANUAL: { rotulo: 'Pedido manual', icone: 'receipt_long', estilo: 'manual' },
    ORCAMENTO_MANUAL: { rotulo: 'Orçamento manual', icone: 'request_quote', estilo: 'manual' },
    PEDIDO_AUTOMATICO: { rotulo: 'Automação de pedido', icone: 'bolt', estilo: 'automatica' },
    NAO_IDENTIFICADA: { rotulo: 'Origem indisponível', icone: 'mail_outline', estilo: '' },
  };
  get podeCadastrarCliente() { return this.auth.temPermissao?.('CLIENTE_CADASTRAR') ?? false; }

  numero = '';
  texto = '';
  confirmandoFechamento = false;
  confirmandoDescarte = false;
  private modalEnvio?: MatDialogRef<unknown>;
  private validadeTimer?: ReturnType<typeof setTimeout>;
  validadeEncerrada = false;
  enviando = false;
  itens: ItemHistorico[] = [];
  resumo: Resumo | null = null;
  lendo = false;
  lendoResumo = false;
  erroHistorico = '';
  erroResumo = '';
  readonly fases = FASES;
  readonly confirmacoes = CONFIRMACOES;
  readonly estados = ESTADOS;
  readonly metricasResumo = [
    { chave: 'total', rotulo: 'Mensagens' },
    { chave: 'aceitas', rotulo: 'Aceitas' },
    { chave: 'entregues', rotulo: 'Entregues' },
    { chave: 'lidas', rotulo: 'Lidas' },
    { chave: 'falhas', rotulo: 'Falhas' },
    { chave: 'backlogAtual', rotulo: 'Na fila agora' },
    { chave: 'incertasAtuais', rotulo: 'Incertas agora' },
  ] as const;
  readonly webhooks = WEBHOOKS;
  readonly motivo = motivo;
  rotuloFase(fase: Fase) { return FASES[fase] ?? 'Situação desconhecida'; }
  rotuloConfirmacao(valor: Confirmacao) { return CONFIRMACOES[valor] ?? 'Confirmação desconhecida'; }
  rotuloTentativa(resultado: string) {
    const labels: Record<string, string> = {
      RESERVADA: 'Reservada', CHAMADA_INICIADA: 'Envio iniciado', SEM_TRANSMISSAO: 'Sem transmissão',
      ACEITA: 'Aceita pelo provedor', INCERTA: 'Resultado incerto',
    };
    return labels[resultado] ?? 'Resultado desconhecido';
  }
  ocorrenciasNaVisaoAbertas = false;
  listaOcorrencias: ItemOcorrencia[] | null = null;
  paginaOcorrencias = 0;
  carregandoOcorrencias = false;
  erroOcorrencias = '';
  readonly colunasOcorrencias: DataTableColumn<ItemOcorrencia>[] = [
    { key: 'iniciadaEm', label: 'Data da tentativa' }, { key: 'fase', label: 'Situação da mensagem' },
    { key: 'detalhe', label: 'Investigação' },
  ];
  readonly chaveOcorrencia = (item: ItemOcorrencia) => item.tentativa;

  readonly colunasRecentes: DataTableColumn<ItemHistorico>[] = [
    { key: 'destino', label: 'Telefone' }, { key: 'data', label: 'Data' },
    { key: 'fase', label: 'Situação' },
    { key: 'detalhe', label: 'Ações', align: 'end' },
  ];
  historicoNaVisao: Filtro | null = null;
  get paginaHistorico() { return this.historicoNaVisao?.pagina ?? this.filtro.pagina; }
  get tamanhoHistorico() { return this.historicoNaVisao?.tamanho ?? this.filtro.tamanho; }
  filtro: Filtro = { ...this.periodoInicial(), fase: '', pagina: 0, tamanho: 20 };
  inicioInput = this.dataLocal(this.filtro.inicio);
  fimInput = this.dataLocal(this.filtro.fim);
  faseInput: Filtro['fase'] = '';
  erroPeriodo = '';

  ngOnInit() {
    const timer = this.zone.runOutsideAngular(() => setInterval(() => this.verificarPeriodicamente(), 5000));
    this.destroy.onDestroy(() => {
      clearInterval(timer);
      this.limparContexto();
    });
    this.auth.usuario$.pipe(
      map(contextoEnvio),
      distinctUntilChanged(), takeUntilDestroyed(this.destroy),
    ).subscribe(contexto => {
      this.limparContexto();
      if (contexto) void this.carregar(true);
    });
  }

  get rotuloConexao() {
    if (this.verificacaoFalhou) return 'Não foi possível verificar';
    const estado = this.config?.estado;
    if (estado) return this.estados[estado.observado] || this.estados.DESCONHECIDO;
    return this.config?.conexao ? 'Estado indisponível' : 'Sem conexão';
  }
  get rotuloPreferencia() {
    const preferencia = this.config?.preferencia;
    if (!preferencia) return 'Indisponíveis';
    if (preferencia.quarentena) return 'Em quarentena';
    return preferencia.pausada ? 'Pausados' : 'Preferência ativa';
  }
  get direitoAtivo() { return !!(this.config?.direito.global && this.config.direito.local); }
  get acoes() { return this.config?.acoesPermitidas; }
  get podeEnviar() { return !!this.acoes?.enviarMensagem; }
  get pendente() { return this.envios.pendente; }
  get operacao() { return this.pendente?.operacao ?? null; }
  get podeRepetir() {
    return !!(this.pendente?.repetivel && this.podeEnviar && this.pendente.conexao === this.config?.conexao
      && !this.validadeEncerrada);
  }
  get possuiControlesConexao() {
    const a = this.acoes;
    return !!a && (a.criarConexao || a.provisionar || a.gerarQr || a.reconciliar || a.consultarWebhook
      || a.configurarWebhook || a.pausarEnvios || a.retomarEnvios || a.desconectar);
  }
  readonly situacoesProvisionamento = {
    NAO_PROVISIONADA: 'Conexão registrada. Prepare a instância para continuar.',
    EM_ANDAMENTO: 'Preparando a instância.',
    PROVISIONADA: 'Instância preparada.',
    DESCONHECIDA: 'Não foi possível confirmar a preparação da instância.',
  };
  get mobile() { return this.breakpoints.isMatched(MOBILE_FOUNDATION_QUERY); }
  readonly chaveLinha = (item: ItemHistorico) => item.mensagem.id;

  private limparContexto() {
    this.sessao++;
    this.troca.next();
    this.config = null;
    this.proximaVerificacao = Date.now() + 5000;
    this.verificandoConexao = this.verificacaoFalhou = false;
    this.historicoNaVisao = null;
    this.fecharDetalheSelecionado();
    this.itens = [];
    this.ocorrenciasNaVisaoAbertas = false;
    this.listaOcorrencias = null;
    this.paginaOcorrencias = 0;
    this.carregandoOcorrencias = false;
    this.erroOcorrencias = '';
    this.resumo = null;
    this.webhook = null;
    this.acao = '';
    this.erroConfig = '';
    this.lendo = this.lendoResumo = this.carregando = false;
    this.erroHistorico = this.erroResumo = '';
    this.filtro = { ...this.periodoInicial(), fase: '', pagina: 0, tamanho: 20 };
    this.modal?.close();
    this.limparModal();
  }

  private ler<T>(request: Observable<T>) {
    return firstValueFrom(request.pipe(takeUntil(this.troca)));
  }

  async carregar(inicial = false) {
    const sessao = this.sessao;
    const anterior = this.config;
    this.carregando = !anterior;
    this.erroConfig = '';
    try {
      const config = await this.ler(this.api.configuracao().pipe(timeout(12000)));
      if (sessao !== this.sessao) return;
      this.config = config;
      this.verificacaoFalhou = false;
      if (anterior && (anterior.conexao !== config.conexao
        || (this.qrModal && (!config.direito.local || !config.direito.global || !config.aplicacaoAutorizada
          || (!config.acoesPermitidas?.gerarQr && config.estado?.observado !== 'ABERTA')))
        || (anterior.acoesPermitidas?.consultarHistorico && !config.acoesPermitidas?.consultarHistorico)
        || (anterior.acoesPermitidas?.enviarMensagem && !config.acoesPermitidas?.enviarMensagem))) {
        this.webhook = null;
        if (anterior.conexao !== config.conexao) this.fecharDetalheSelecionado();
        this.modal?.close();
      }
      if (config.acoesPermitidas?.consultarHistorico && (inicial || !anterior?.acoesPermitidas?.consultarHistorico)) {
        if (this.area === 'visao') void this.carregarConsultas();
        else if (this.area === 'mensagens') void this.carregarConsultas(false);
        const mensagem=this.rota.snapshot?.queryParamMap?.get('mensagem');
        const conexao=this.rota.snapshot?.queryParamMap?.get('conexao');
        if(inicial && this.areaEnvio && mensagem && conexao) void this.abrirDetalhe({mensagem: {id: mensagem, conexao}});
      } else if (!config.acoesPermitidas?.consultarHistorico) {
        this.consulta++;
        this.fecharDetalheSelecionado();
        this.historicoNaVisao = null;
        this.itens = [];
        this.ocorrenciasNaVisaoAbertas = false;
        this.listaOcorrencias = null;
        this.resumo = null;
      }
    } catch (erro) {
      if (sessao !== this.sessao) return;
      this.config = null;
      this.fecharDetalheSelecionado();
      this.erroConfig = falha(erro).mensagem;
      this.modal?.close();
    } finally {
      if (sessao === this.sessao) this.carregando = false;
    }
  }

  private async executar<T>(nome: string, request: Observable<T>, sucesso: (dados: T) => void | Promise<void>) {
    if (this.acao) return;
    const sessao = this.sessao;
    this.acao = nome;
    try {
      const dados = await this.ler(request);
      if (sessao === this.sessao) await sucesso(dados);
    } catch (erro) {
      if (sessao !== this.sessao) return;
      const e = falha(erro);
      this.toast.error(e.mensagem);
      if ([403, 404, 409].includes(e.status)) await this.carregar();
    } finally {
      if (sessao === this.sessao) this.acao = '';
    }
  }

  private async atualizar(mensagem?: string) {
    if (mensagem) this.toast.success(mensagem);
    await this.carregar();
  }

  private async confirmar(titulo: string, mensagem: string, botao: string, acao: () => void) {
    const sessao = this.sessao;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: titulo, message: mensagem, confirmText: botao, type: 'destructive' },
      maxWidth: 'calc(100vw - 24px)',
    });
    this.modal = ref;
    const confirmou = await firstValueFrom(ref.afterClosed());
    if (this.modal === ref) this.modal = undefined;
    if (confirmou && sessao === this.sessao) acao();
  }

  direito(ativo: boolean) {
    if (!(ativo ? this.acoes?.habilitarDireito : this.acoes?.desabilitarDireito)) return;
    const alterar = () => void this.executar('direito', this.api.direito(ativo), () =>
      this.atualizar(ativo ? 'ClickWhatsApp habilitado.' : 'ClickWhatsApp desabilitado.'));
    if (ativo) alterar();
    else void this.confirmar('Desabilitar ClickWhatsApp', 'Os envios serão pausados e as mensagens ainda na fila poderão ser canceladas. Sua sessão do WhatsApp será mantida.', 'Desabilitar', alterar);
  }

  criar() {
    if (this.acoes?.criarConexao) void this.executar('criar', this.api.criar(), () => this.atualizar('Conexão registrada.'));
  }

  conexao(acao: 'provisionar' | 'reconciliar' | 'desconectar') {
    const id = this.config?.conexao;
    if (!id || !this.acoes?.[acao]) return;
    const executar = () => void this.executar(acao, this.api[acao](id), estado => {
      if (estado.motivo) this.toast.warning(motivo(estado.motivo));
      return this.atualizar(estado.motivo ? undefined : ({
        provisionar: 'Provisionamento consultado.', reconciliar: 'Estado atualizado.', desconectar: 'Sessão atualizada.',
      })[acao]);
    });
    if (acao === 'desconectar') void this.confirmar('Desconectar WhatsApp', 'O WhatsApp será desconectado desta conexão. Isso encerra a sessão e preserva o histórico.', 'Desconectar', executar);
    else executar();
  }

  preferencia(ativa: boolean) {
    const c = this.config;
    if (!c?.conexao || !c.preferencia || !(ativa ? this.acoes?.retomarEnvios : this.acoes?.pausarEnvios)) return;
    void this.executar('preferencia', this.api.preferencia(c.conexao, ativa, c.preferencia.versao),
      () => this.atualizar(ativa ? 'Preferência de envio ativada.' : 'Envios pausados.'));
  }

  consultarWebhook(configurar = false) {
    const id = this.config?.conexao;
    if (!id || !(configurar ? this.acoes?.configurarWebhook : this.acoes?.consultarWebhook)) return;
    void this.executar('webhook', configurar ? this.api.configurarWebhook(id) : this.api.webhook(id), r => {
      this.webhook = r.situacao;
    });
  }

  private abrir(tela: TemplateRef<unknown>, titulo: string, lateral = true, lateralNoDesktop = false) {
    if (this.modal) return null;
    const config = { ariaLabel: titulo, width: '560px', maxWidth: 'calc(100vw - 24px)', maxHeight: 'calc(100dvh - 24px)' };
    const ref = lateral && (this.mobile || lateralNoDesktop)
      ? openMobileSidePanel(this.dialog, tela, config, this.mobile ? undefined : '560px')
      : this.dialog.open(tela, config);
    this.modal = ref;
    ref.beforeClosed().subscribe(() => { if (this.modal === ref) this.limparModal(); });
    ref.afterClosed().subscribe(() => { if (this.modal === ref) this.modal = undefined; });
    return ref;
  }

  private limparModal() {
    clearTimeout(this.qrTimer);
    this.qrModal = undefined;
    this.qr = null;
    this.detalheModal = null;
    this.ocorrencia = this.alvoOcorrencia = null;
    this.lendoOcorrencia = false;
    this.erroModal = '';
    this.limparCliente();
    this.numero = this.texto = '';
    clearTimeout(this.validadeTimer);
    this.confirmandoFechamento = this.confirmandoDescarte = this.validadeEncerrada = false;
    this.enviando = false;
  }

  abrirQr() {
    if (!this.acoes?.gerarQr || !this.config?.conexao) return;
    const ref = this.abrir(this.telaQr, 'Conectar WhatsApp', false);
    if (ref) {
      this.qrModal = ref;
      void this.solicitarQr();
    }
  }

  async solicitarQr() {
    const ref = this.qrModal;
    const id = this.config?.conexao;
    if (!ref || !id || !this.acoes?.gerarQr || this.acao) return;
    this.qr = null;
    this.erroModal = '';
    clearTimeout(this.qrTimer);
    this.acao = 'qr';
    const sessao = this.sessao;
    try {
      // Cancelar a leitura ao fechar o diálogo e nunca guardar o resultado em serviço global.
      const qr = await this.ler(this.api.qr(id).pipe(timeout(30000), takeUntil(ref.beforeClosed())));
      if (this.modal !== ref || ref.getState() !== MatDialogState.OPEN || sessao !== this.sessao) return;
      if (qr.situacao === 'DISPONIVEL' && !/^data:image\/png;base64,[a-zA-Z0-9+/=\r\n]+$/.test(qr.imagem ?? '')) {
        this.erroModal = 'O código retornado está indisponível.';
        return;
      }
      this.qr = qr.situacao === 'DISPONIVEL' ? qr : { ...qr, imagem: null };
      if (qr.situacao === 'DISPONIVEL') {
        const validade = Date.parse(qr.expiraEm ?? '');
        const espera = Number.isFinite(validade) ? Math.max(0, validade - Date.now()) : 90000;
        this.zone.runOutsideAngular(() => {
          this.qrTimer = setTimeout(() => this.zone.run(() => {
            this.qr = null;
            this.erroModal = 'O pareamento não foi confirmado a tempo. Verifique a conexão ou solicite um novo QR.';
          }), Math.min(espera, 2147483647));
        });
      }
      if (qr.situacao === 'JA_CONECTADA') void this.carregar();
    } catch (e) {
      if (this.modal === ref && ref.getState() === MatDialogState.OPEN && sessao === this.sessao) this.erroModal = falha(e).mensagem;
    } finally {
      if (sessao === this.sessao) this.acao = '';
    }
  }

  private verificarPeriodicamente() {
    if (this.documento.hidden || this.acao || this.verificandoConexao || !this.direitoAtivo) return;
    const aguardandoQr = this.qr?.situacao === 'DISPONIVEL';
    if (!aguardandoQr && Date.now() < this.proximaVerificacao) return;
    if (this.modal && !aguardandoQr) return;
    if (this.config?.provisionamento?.situacao !== 'PROVISIONADA') return;
    this.proximaVerificacao = Date.now() + 30000;
    this.zone.run(() => {
      if (this.acoes?.reconciliar) void this.verificarConexao();
      else if (!aguardandoQr) void this.carregar();
    });
  }

  async verificarConexao() {
    const id = this.config?.conexao;
    if (!id || !this.acoes?.reconciliar || this.acao || this.verificandoConexao) return;
    const sessao = this.sessao;
    const ref = this.qrModal;
    this.verificandoConexao = true;
    this.acao = 'verificarConexao';
    try {
      const request = this.api.reconciliar(id).pipe(timeout(12000));
      const estado = await this.ler(ref ? request.pipe(takeUntil(ref.beforeClosed())) : request);
      if (sessao !== this.sessao || this.config?.conexao !== id) return;
      this.config = { ...this.config, estado };
      this.verificacaoFalhou = estado.observado === 'DESCONHECIDO';
      if (ref && this.qrModal === ref && estado.observado === 'ABERTA') {
        clearTimeout(this.qrTimer);
        this.erroModal = '';
        this.qr = { situacao: 'JA_CONECTADA', imagem: null, expiraEm: null };
      }
      if (!ref || estado.observado === 'ABERTA') await this.carregar();
    } catch (erro) {
      if (sessao !== this.sessao || (ref && this.qrModal !== ref)) return;
      const { status } = falha(erro);
      this.verificacaoFalhou = true;
      if ([401, 402, 403, 404].includes(status)) await this.carregar();
    } finally {
      if (sessao === this.sessao) {
        this.verificandoConexao = false;
        this.acao = '';
      }
    }
  }

  selecionarCliente(cliente: ClienteListagem) {
    const telefone = (cliente.telefone ?? '').trim().replace(/[() .-]/g, '');
    const numero = /^[1-9]\d{9,10}$/.test(telefone) ? '55' + telefone : telefone;
    if (!/^\+?[1-9]\d{7,14}$/.test(numero)) {
      this.limparCliente();
      this.erroModal = 'O cliente selecionado não tem um telefone válido.';
      return;
    }
    this.clienteSelecionado = cliente;
    this.clienteControl.setValue(cliente);
    this.numero = numero;
    this.erroModal = '';
  }

  limparCliente() {
    if (this.clienteSelecionado) this.numero = '';
    this.clienteSelecionado = null;
    this.clienteControl.setValue('');
  }

  criarClienteParaEnvio() {
    const envio = this.modalEnvio;
    if (!envio || this.operacao || !this.podeCadastrarCliente) return;
    const cadastro = this.dialog.open(ClienteCreateDialogComponent, {
      width: '640px', maxWidth: 'calc(100vw - 24px)', data: { mobileMode: 'quick' },
    });
    envio.beforeClosed().pipe(takeUntil(cadastro.afterClosed())).subscribe(() => cadastro.close());
    cadastro.afterClosed().subscribe(cliente => {
      if (cliente && this.modalEnvio === envio) this.selecionarCliente(cliente);
    });
  }

  abrirEnvio() {
    if (!this.podeEnviar && !this.pendente) return;
    const ref = this.abrir(this.telaEnvio, this.pendente ? 'Solicitação pendente' : 'Nova mensagem', true, true);
    if (!ref) return;
    this.modalEnvio = ref;
    ref.disableClose = true;
    ref.keydownEvents().pipe(takeUntil(ref.beforeClosed())).subscribe(e => {
      if (e.key === 'Escape') this.solicitarFechamentoEnvio();
    });
    ref.backdropClick().pipe(takeUntil(ref.beforeClosed())).subscribe(() => this.solicitarFechamentoEnvio());
    ref.beforeClosed().subscribe(() => { if (this.modalEnvio === ref) this.modalEnvio = undefined; });
    if (this.pendente) {
      this.numero = this.pendente.operacao.corpo.numero;
      this.texto = this.pendente.operacao.corpo.texto;
      this.observarValidade();
    }
  }

  solicitarFechamentoEnvio() {
    if (this.enviando) return;
    if (this.pendente) this.confirmandoFechamento = true;
    else this.modalEnvio?.close();
  }

  descartarEnvio() {
    if (!this.confirmandoDescarte || this.enviando) return;
    this.envios.pendente = null;
    this.modalEnvio?.close();
  }

  private observarValidade() {
    clearTimeout(this.validadeTimer);
    const validade = this.operacao?.corpo.expiraEm;
    if (!validade) return;
    const restantes = Date.parse(validade) - Date.now();
    this.validadeEncerrada = restantes <= 0;
    if (!this.validadeEncerrada) {
      this.validadeTimer = this.zone.runOutsideAngular(() => setTimeout(() => {
        this.zone.run(() => { this.validadeEncerrada = true; });
      }, restantes));
    }
  }

  async enviar() {
    const ref = this.modalEnvio;
    const id = this.config?.conexao;
    if (!ref || !id || !this.podeEnviar || this.enviando || this.confirmandoFechamento) return;
    const repeticao = !!this.pendente;
    if (this.pendente) {
      this.observarValidade();
      if (!this.podeRepetir) return;
    } else {
      const numero = this.numero.trim();
      if (!/^\+?[1-9]\d{7,14}$/.test(numero) || !this.texto.trim() || new TextEncoder().encode(this.texto).length > 4096) {
        this.erroModal = 'Informe um número internacional e uma mensagem de até 4096 bytes.';
        return;
      }
      this.envios.pendente = {
        conexao: id,
        operacao: novaOperacao(numero, this.texto, Date.now(), this.clienteSelecionado?.id),
        mensagem: 'A confirmação do registro ainda não foi recebida.',
        repetivel: true,
      };
      this.observarValidade();
    }
    this.enviando = true;
    this.erroModal = '';
    const envio = this.pendente!;
    const sessao = this.sessao;
    try {
      const resposta = await this.ler(this.api.enviar(id, envio.operacao).pipe(timeout(20_000)));
      if (sessao !== this.sessao || this.pendente !== envio) return;
      if (resposta.status !== 202 || !resposta.body?.id) {
        envio.mensagem = 'A confirmação do registro não foi recebida. É possível repetir a mesma solicitação.';
        return;
      }
      this.envios.pendente = null;
      ref.close();
      this.toast.success('Mensagem adicionada à fila.');
      if (this.acoes?.consultarHistorico) {
        const agora = new Date().toISOString();
        if (Date.now() - Date.parse(this.filtro.fim) < 60_000) this.filtro = { ...this.filtro, fim: agora, pagina: 0 };
        void this.carregarConsultas();
      }
    } catch (erro) {
      if (sessao !== this.sessao || this.pendente !== envio) return;
      const e = falha(erro);
      const rejeicaoConhecida = [400, 401, 402, 403, 404].includes(e.status)
        || (e.status === 503 && ['SAIDA_CAPACIDADE', 'CHAVE_MENSAGEM_INVALIDA'].includes(e.codigo));
      if (rejeicaoConhecida && !repeticao) {
        this.envios.pendente = null;
        this.erroModal = e.mensagem;
      } else if (rejeicaoConhecida || e.status === 409) {
        envio.repetivel = e.status !== 409 && [401, 402, 403, 503].includes(e.status);
        envio.mensagem = e.mensagem + (repeticao ? ' O resultado da primeira solicitação continua sem confirmação.' : '');
      } else {
        envio.mensagem = 'A confirmação do registro não foi recebida. Repita a mesma solicitação para preservar os dados originais.';
      }
      if ([403, 404, 409].includes(e.status)) void this.carregar();
    } finally {
      if (sessao === this.sessao) this.enviando = false;
    }
  }

  private periodoInicial(): Periodo {
    const fim = Date.now();
    return { inicio: new Date(fim - 7 * 86400_000).toISOString(), fim: new Date(fim).toISOString() };
  }

  private dataLocal(instante: string) {
    // Campos de data/hora e apresentação usam Brasília.
    const partes = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(new Date(instante));
    return partes.replace(' ', 'T');
  }

  abrirFiltros() {
    this.inicioInput = this.dataLocal(this.filtro.inicio);
    this.fimInput = this.dataLocal(this.filtro.fim);
    this.faseInput = this.filtro.fase;
    this.erroPeriodo = '';
    this.abrir(this.telaFiltros, 'Filtros');
  }

  aplicarFiltros() {
    const inicio = Date.parse(this.inicioInput + '-03:00');
    const fim = Date.parse(this.fimInput + '-03:00');
    if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim <= inicio || fim - inicio > 93 * 86400_000) {
      this.erroPeriodo = 'Escolha um período válido de até 93 dias.';
      return;
    }
    this.filtro = { ...this.filtro, inicio: new Date(inicio).toISOString(), fim: new Date(fim).toISOString(), fase: this.faseInput, pagina: 0 };
    this.modal?.close();
    void this.carregarConsultas();
  }

  private filtroRecentes(tamanho: number): Filtro {
    const fim = Date.now();
    const inicio = fim - 93 * 86400_000;
    return { inicio: new Date(inicio).toISOString(), fim: new Date(fim).toISOString(), pagina: 0, tamanho, fase: '' };
  }

  alternarHistoricoNaVisao() {
    if (this.area !== 'visao' || !this.acoes?.consultarHistorico || this.lendo) return;
    this.historicoNaVisao = this.historicoNaVisao ? null : this.filtroRecentes(this.filtro.tamanho);
    this.itens = [];
    void this.carregarConsultas(false);
  }

  pagina(delta: number) {
    const pagina = this.paginaHistorico + delta;
    if (this.lendo || pagina < 0) return;
    if (this.historicoNaVisao) this.historicoNaVisao = { ...this.historicoNaVisao, pagina };
    else this.filtro = { ...this.filtro, pagina };
    void this.carregarConsultas(false);
  }

  async carregarConsultas(incluirResumo = true) {
    if (!this.acoes?.consultarHistorico) return;
    const sessao = this.sessao;
    const consulta = ++this.consulta;
    const atual = () => this.sessao === sessao && this.consulta === consulta;
    if (!this.areaEnvio) return;
    const periodo = this.filtro;
    const filtro = this.area === 'visao' ? (this.historicoNaVisao ?? this.filtroRecentes(5)) : periodo;
    this.lendo = true;
    this.erroHistorico = '';
    if (this.area === 'visao' && (incluirResumo || this.lendoResumo)) {
      this.lendoResumo = true;
      this.erroResumo = '';
      void this.ler(this.api.resumo(periodo)).then(r => {
        if (atual()) this.resumo = r;
      }).catch(e => {
        if (atual()) { this.resumo = null; this.erroResumo = falha(e).mensagem; }
      }).finally(() => { if (atual()) this.lendoResumo = false; });
    }
    try {
      const itens = await this.ler(this.api.historico(filtro, this.area === 'mensagens').pipe(timeout(12000)));
      if (atual()) {
        this.itens = itens;
        const selecionada = this.selecionada;
        if (selecionada) {
          const atualizada = itens.find(item => item.mensagem.id === selecionada.mensagem.id
            && item.mensagem.conexao === selecionada.mensagem.conexao);
          if (atualizada) this.selecionarMensagem(atualizada);
          else this.fecharDetalheSelecionado();
        }
      }
    } catch (erro) {
      if (atual()) { this.fecharDetalheSelecionado(); this.itens = []; this.erroHistorico = falha(erro).mensagem; }
    } finally {
      if (atual()) this.lendo = false;
    }
  }

  alternarOcorrenciasNaVisao() {
    this.ocorrenciasNaVisaoAbertas = !this.ocorrenciasNaVisaoAbertas;
    if (this.ocorrenciasNaVisaoAbertas && !this.listaOcorrencias) {
      void this.listarOcorrencias();
    }
  }

  async listarOcorrencias(delta = 0) {
    if (this.area !== 'visao' || !this.acoes?.consultarHistorico || this.carregandoOcorrencias) return;
    const sessao = this.sessao;
    const pagina = this.paginaOcorrencias + delta;
    if (pagina < 0) return;
    this.carregandoOcorrencias = true;
    this.erroOcorrencias = '';
    try {
      const itens = await this.ler(this.api.ocorrencias(pagina).pipe(timeout(12000)));
      if (sessao !== this.sessao || !this.acoes?.consultarHistorico) return;
      this.listaOcorrencias = itens;
      this.paginaOcorrencias = pagina;
    } catch (e) {
      if (sessao === this.sessao) this.erroOcorrencias = falha(e).mensagem;
    } finally {
      if (sessao === this.sessao) this.carregandoOcorrencias = false;
    }
  }

  periodoRapido(dias: 0 | 7 | 30) {
    const fim = Date.now();
    const inicio = dias ? fim - dias * 86400_000 : Math.min(fim - 1, Date.parse(this.dataLocal(new Date(fim).toISOString()).slice(0, 10) + 'T00:00:00-03:00'));
    this.filtro = { ...this.filtro, inicio: new Date(inicio).toISOString(), fim: new Date(fim).toISOString(), pagina: 0 };
    void this.carregarConsultas();
  }

  abrirOcorrencia(item: { mensagem: Pick<ItemHistorico['mensagem'], 'id' | 'conexao'> }) {
    if (this.area !== 'visao' || !this.acoes?.consultarHistorico || !this.abrir(this.telaOcorrencia, 'Ocorrência de envio', true, true)) return;
    this.alvoOcorrencia = item.mensagem;
    void this.carregarOcorrencia();
  }

  async carregarOcorrencia(investigar = false) {
    const ref = this.modal;
    const alvo = this.alvoOcorrencia;
    if (!ref || !alvo || this.lendoOcorrencia || (investigar && !this.ocorrencia?.podeInvestigar)) return;
    const aberta = () => this.modal === ref && ref.getState() === MatDialogState.OPEN;
    this.lendoOcorrencia = true;
    this.erroModal = '';
    try {
      const ocorrencia = await this.ler(this.api.ocorrencia(alvo.conexao, alvo.id, investigar)
        .pipe(timeout(12000), takeUntil(ref.beforeClosed())));
      if (!aberta()) return;
      this.ocorrencia = ocorrencia;
      if (investigar) {
        void this.carregarConsultas();
        if (this.listaOcorrencias) void this.listarOcorrencias();
        void this.carregar();
      }
    } catch (e) {
      if (aberta()) this.erroModal = falha(e).mensagem;
    } finally {
      if (aberta()) this.lendoOcorrencia = false;
    }
  }

  fecharDetalheSelecionado() {
    this.fecharLeitura.next();
    this.selecionada = null;
    this.leituraSelecionada = null;
  }

  selecionarMensagem(item: ItemHistorico) {
    if (!this.acoes?.consultarHistorico) return;
    this.fecharDetalheSelecionado();
    const leitura = this.novaConsultaDetalhe();
    this.selecionada = item;
    this.leituraSelecionada = leitura;
    void this.carregarDetalhe(item, leitura, this.fecharLeitura, () => this.leituraSelecionada === leitura, false);
  }

  async abrirDetalhe(item: {mensagem: {id: string; conexao: string}}) {
    if (!this.acoes?.consultarHistorico) return;
    const ref = this.abrir(this.telaDetalhe, 'Detalhe da mensagem', true, true);
    if (!ref) return;
    const leitura = this.novaConsultaDetalhe();
    this.detalheModal = leitura;
    await this.carregarDetalhe(item, leitura, ref.beforeClosed(),
      () => this.modal === ref && ref.getState() === MatDialogState.OPEN);
  }

  private novaConsultaDetalhe(): ConsultaDetalhe {
    return { detalhe: null, tentativas: null, erro: '', erroTentativas: '', buscando: true };
  }

  private async carregarDetalhe(
    item: {mensagem: {id: string; conexao: string}},
    leitura: ConsultaDetalhe,
    cancelar: Observable<unknown>,
    ativa: () => boolean,
    incluirTentativas = true,
  ) {
    const { conexao, id } = item.mensagem;
    const ler = <T>(req: Observable<T>) => this.ler(req.pipe(
      takeUntil(cancelar), takeUntilDestroyed(this.destroy), timeout(12000),
    ));
    try {
      const detalhe = await ler(this.api.detalhe(conexao, id));
      if (!ativa()) return;
      leitura.detalhe = detalhe;
      if (!incluirTentativas) return;
      const tentativas = await ler(this.api.tentativas(conexao, id)).catch(e => {
        if (ativa()) leitura.erroTentativas = falha(e).mensagem;
        return null;
      });
      if (ativa()) leitura.tentativas = tentativas;
    } catch (e) {
      if (ativa()) leitura.erro = falha(e).mensagem;
    } finally {
      if (ativa()) leitura.buscando = false;
    }
  }
}
