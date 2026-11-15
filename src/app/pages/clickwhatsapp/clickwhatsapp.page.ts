import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef, MatDialogState } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ToastrService } from 'ngx-toastr';
import { distinctUntilChanged, firstValueFrom, map, Observable, Subject, takeUntil } from 'rxjs';
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
import { Configuracao, CONFIRMACOES, Detalhe, ESTADOS, falha, Fase, Confirmacao, FASES, Filtro, ItemHistorico, motivo, novaOperacao, OperacaoEnvio, Periodo, Qr, Resumo, Tentativa, Webhook, WEBHOOKS } from './clickwhatsapp.models';
import { ClickWhatsAppService } from './clickwhatsapp.service';

@Component({
  selector: 'app-clickwhatsapp',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatSelectModule, MatProgressBarModule, PageCardComponent, SectionCardComponent, DataTableComponent,
    DataTableCellDirective, DataTableItemDirective, MobileFabActionComponent],
  templateUrl: './clickwhatsapp.page.html',
  styleUrl: './clickwhatsapp.page.scss',
})
export class ClickWhatsAppPage implements OnInit {
  private readonly api = inject(ClickWhatsAppService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastrService);
  private readonly destroy = inject(DestroyRef);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly troca = new Subject<void>();
  private sessao = 0;
  private consulta = 0;
  private modal?: MatDialogRef<unknown>;
  private qrTimer?: ReturnType<typeof setTimeout>;

  @ViewChild('telaQr') telaQr!: TemplateRef<unknown>;
  @ViewChild('telaEnvio') telaEnvio!: TemplateRef<unknown>;
  @ViewChild('telaDetalhe') telaDetalhe!: TemplateRef<unknown>;
  @ViewChild('telaFiltros') telaFiltros!: TemplateRef<unknown>;

  config: Configuracao | null = null;
  carregando = false;
  erroConfig = '';
  acao = '';
  webhook: Webhook | null = null;
  qr: Qr | null = null;
  erroModal = '';
  detalhe: Detalhe | null = null;
  tentativas: Tentativa[] | null = null;
  erroTentativas = '';
  buscandoDetalhe = false;
  numero = '';
  texto = '';
  operacao: OperacaoEnvio | null = null;
  podeRepetir = false;
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
  readonly colunas: DataTableColumn<ItemHistorico>[] = [
    { key: 'data', label: 'Data' }, { key: 'destino', label: 'Destinatário' },
    { key: 'fase', label: 'Situação' }, { key: 'confirmacao', label: 'Confirmação' }, { key: 'detalhe', label: 'Detalhe' },
  ];
  filtro: Filtro = { ...this.periodoInicial(), fase: '', pagina: 0, tamanho: 20 };
  inicioInput = this.dataLocal(this.filtro.inicio);
  fimInput = this.dataLocal(this.filtro.fim);
  faseInput: Filtro['fase'] = '';
  erroPeriodo = '';

  constructor() {
    this.destroy.onDestroy(() => this.limparContexto());
  }

  ngOnInit() {
    this.auth.usuario$.pipe(
      map(u => u ? String(u.id) + '/' + String(u.empresa?.id) : null),
      distinctUntilChanged(), takeUntilDestroyed(this.destroy),
    ).subscribe(contexto => {
      this.limparContexto();
      if (contexto) void this.carregar(true);
    });
  }

  get direitoAtivo() { return !!(this.config?.direito.global && this.config.direito.local); }
  get podeEnviar() {
    return !!(this.config?.conexao && this.config.permissoes.enviar && this.config.preferencia?.pausada === false
      && !this.config.preferencia.quarentena);
  }
  get mobile() { return this.breakpoints.isMatched(MOBILE_FOUNDATION_QUERY); }
  readonly chaveLinha = (item: ItemHistorico) => item.mensagem.id;

  private limparContexto() {
    this.sessao++;
    this.troca.next();
    this.config = null;
    this.itens = [];
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
      const config = await this.ler(this.api.configuracao());
      if (sessao !== this.sessao) return;
      this.config = config;
      if (anterior && (anterior.conexao !== config.conexao
        || (anterior.permissoes.configurar && !config.permissoes.configurar)
        || (anterior.permissoes.consultar && !config.permissoes.consultar)
        || (anterior.permissoes.enviar && !config.permissoes.enviar))) {
        this.webhook = null;
        this.modal?.close();
      }
      if (config.permissoes.consultar && (inicial || !anterior?.permissoes.consultar)) {
        void this.carregarConsultas();
      } else if (!config.permissoes.consultar) {
        this.consulta++;
        this.itens = [];
        this.resumo = null;
      }
    } catch (erro) {
      if (sessao !== this.sessao) return;
      this.config = null;
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
    if (!this.config?.permissoes.habilitar) return;
    const alterar = () => void this.executar('direito', this.api.direito(ativo), () =>
      this.atualizar(ativo ? 'ClickWhatsApp habilitado.' : 'ClickWhatsApp desabilitado.'));
    if (ativo) alterar();
    else void this.confirmar('Desabilitar ClickWhatsApp', 'Os envios serão pausados e as mensagens ainda na fila poderão ser canceladas. Sua sessão do WhatsApp será mantida.', 'Desabilitar', alterar);
  }

  criar() {
    if (this.config?.permissoes.configurar) void this.executar('criar', this.api.criar(), () => this.atualizar('Conexão registrada.'));
  }

  conexao(acao: 'provisionar' | 'reconciliar' | 'desconectar') {
    const id = this.config?.conexao;
    if (!id || !this.config?.permissoes.configurar) return;
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
    if (!c?.conexao || !c.preferencia || !c.permissoes.configurar) return;
    void this.executar('preferencia', this.api.preferencia(c.conexao, ativa, c.preferencia.versao),
      () => this.atualizar(ativa ? 'Preferência de envio ativada.' : 'Envios pausados.'));
  }

  consultarWebhook(configurar = false) {
    const id = this.config?.conexao;
    if (!id || !this.config?.permissoes.configurar) return;
    void this.executar('webhook', configurar ? this.api.configurarWebhook(id) : this.api.webhook(id), r => {
      this.webhook = r.situacao;
    });
  }

  private abrir(tela: TemplateRef<unknown>, titulo: string, lateral = true) {
    if (this.modal) return null;
    const config = { ariaLabel: titulo, width: '560px', maxWidth: 'calc(100vw - 24px)', maxHeight: 'calc(100dvh - 24px)' };
    const ref = this.mobile && lateral ? openMobileSidePanel(this.dialog, tela, config) : this.dialog.open(tela, config);
    this.modal = ref;
    ref.beforeClosed().subscribe(() => { if (this.modal === ref) this.limparModal(); });
    ref.afterClosed().subscribe(() => { if (this.modal === ref) this.modal = undefined; });
    return ref;
  }

  private limparModal() {
    clearTimeout(this.qrTimer);
    this.qr = null;
    this.detalhe = null;
    this.tentativas = null;
    this.erroModal = this.erroTentativas = '';
    this.numero = this.texto = '';
    this.operacao = null;
    this.podeRepetir = this.enviando = this.buscandoDetalhe = false;
  }

  abrirQr() {
    if (!this.config?.permissoes.configurar || !this.config.conexao) return;
    if (this.abrir(this.telaQr, 'Conectar WhatsApp', false)) void this.solicitarQr();
  }

  async solicitarQr() {
    const ref = this.modal;
    const id = this.config?.conexao;
    if (!ref || !id || !this.config?.permissoes.configurar || this.acao) return;
    this.qr = null;
    this.erroModal = '';
    clearTimeout(this.qrTimer);
    this.acao = 'qr';
    const sessao = this.sessao;
    try {
      // Cancelar a leitura ao fechar o diálogo e nunca guardar o resultado em serviço global.
      const qr = await this.ler(this.api.qr(id).pipe(takeUntil(ref.beforeClosed())));
      if (this.modal !== ref || ref.getState() !== MatDialogState.OPEN || sessao !== this.sessao) return;
      if (qr.situacao === 'DISPONIVEL' && !/^data:image\/png;base64,[a-zA-Z0-9+/=\r\n]+$/.test(qr.imagem ?? '')) {
        this.erroModal = 'O código retornado está indisponível.';
        return;
      }
      this.qr = qr.situacao === 'DISPONIVEL' ? qr : { ...qr, imagem: null };
      if (qr.expiraEm) {
        this.qrTimer = setTimeout(() => {
          this.qr = null;
          this.erroModal = 'O código expirou. Solicite um novo QR.';
        }, Math.max(0, Math.min(Date.parse(qr.expiraEm) - Date.now(), 2147483647)));
      }
      if (qr.situacao === 'JA_CONECTADA') void this.carregar();
    } catch (e) {
      if (this.modal === ref && ref.getState() === MatDialogState.OPEN && sessao === this.sessao) this.erroModal = falha(e).mensagem;
    } finally {
      if (sessao === this.sessao) this.acao = '';
    }
  }

  abrirEnvio() {
    if (this.podeEnviar) this.abrir(this.telaEnvio, 'Nova mensagem');
  }

  async enviar() {
    const ref = this.modal;
    const id = this.config?.conexao;
    if (!ref || !id || !this.podeEnviar || this.enviando) return;
    const primeiraTentativa = !this.operacao;
    if (!this.operacao) {
      const numero = this.numero.trim();
      if (!/^\+?[1-9]\d{7,14}$/.test(numero) || !this.texto.trim() || new TextEncoder().encode(this.texto).length > 4096) {
        this.erroModal = 'Informe um número internacional e uma mensagem de até 4096 bytes.';
        return;
      }
      this.operacao = novaOperacao(numero, this.texto);
    } else if (!this.podeRepetir) return;

    this.enviando = true;
    ref.disableClose = true;
    this.erroModal = '';
    const operacao = this.operacao;
    const sessao = this.sessao;
    try {
      await this.ler(this.api.enviar(id, operacao));
      if (sessao !== this.sessao) return;
      ref.close();
      this.toast.success('Mensagem adicionada à fila.');
      if (this.config?.permissoes.consultar) {
        // O fim do filtro é exclusivo. Estender o período inicial até a nova leitura.
        const agora = new Date().toISOString();
        if (Date.now() - Date.parse(this.filtro.fim) < 60_000) this.filtro = { ...this.filtro, fim: agora, pagina: 0 };
        void this.carregarConsultas();
      }
    } catch (erro) {
      if (sessao !== this.sessao || this.modal !== ref) return;
      const e = falha(erro);
      this.podeRepetir = e.status === 0 || [502, 503, 504].includes(e.status);
      this.erroModal = this.podeRepetir
        ? e.mensagem + ' Você pode repetir a mesma solicitação, com os mesmos dados.'
        : e.mensagem;
      if (e.status === 400 && primeiraTentativa) this.operacao = null;
      if ([403, 404, 409].includes(e.status)) void this.carregar();
    } finally {
      if (sessao === this.sessao) {
        this.enviando = false;
        ref.disableClose = false;
      }
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

  pagina(delta: number) {
    if (this.lendo || this.filtro.pagina + delta < 0) return;
    this.filtro = { ...this.filtro, pagina: this.filtro.pagina + delta };
    void this.carregarConsultas(false);
  }

  async carregarConsultas(incluirResumo = true) {
    if (!this.config?.permissoes.consultar) return;
    const sessao = this.sessao;
    const consulta = ++this.consulta;
    const atual = () => this.sessao === sessao && this.consulta === consulta;
    const filtro = this.filtro;
    this.lendo = true;
    this.erroHistorico = '';
    if (incluirResumo || this.lendoResumo) {
      this.lendoResumo = true;
      this.erroResumo = '';
      void this.ler(this.api.resumo(filtro)).then(r => {
        if (atual()) this.resumo = r;
      }).catch(e => {
        if (atual()) { this.resumo = null; this.erroResumo = falha(e).mensagem; }
      }).finally(() => { if (atual()) this.lendoResumo = false; });
    }
    try {
      const itens = await this.ler(this.api.historico(filtro));
      if (atual()) this.itens = itens;
    } catch (erro) {
      if (atual()) { this.itens = []; this.erroHistorico = falha(erro).mensagem; }
    } finally {
      if (atual()) this.lendo = false;
    }
  }

  async abrirDetalhe(item: ItemHistorico) {
    if (!this.config?.permissoes.consultar) return;
    const ref = this.abrir(this.telaDetalhe, 'Detalhe da mensagem');
    if (!ref) return;
    this.buscandoDetalhe = true;
    const { conexao, id } = item.mensagem;
    const ler = <T>(req: Observable<T>) => this.ler(req.pipe(takeUntil(ref.beforeClosed())));
    const aberta = () => this.modal === ref && ref.getState() === MatDialogState.OPEN;
    try {
      const detalhe = await ler(this.api.detalhe(conexao, id));
      if (!aberta()) return;
      this.detalhe = detalhe;
      const tentativas = await ler(this.api.tentativas(conexao, id)).catch(e => {
        if (aberta()) this.erroTentativas = falha(e).mensagem;
        return null;
      });
      if (aberta()) this.tentativas = tentativas;
    } catch (e) {
      if (aberta()) this.erroModal = falha(e).mensagem;
    } finally {
      if (aberta()) this.buscandoDetalhe = false;
    }
  }
}
