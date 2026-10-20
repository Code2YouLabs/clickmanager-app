import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, afterNextRender, Injector, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { RouterModule } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { SectionCardComponent } from '../section-card/section-card.component';
import { ManualLinkComponent } from '../manual-link/manual-link.component';
import { PedidoTrocarStatusDialogComponent } from './pedido-trocar-status-dialog.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { classificarTransicaoPedido } from './pedido-transicao-apresentacao';
import { take } from 'rxjs';
import { ConfirmDialogComponent } from '../dialog/confirm-dialog/confirm-dialog.component';
import { confirmacaoCancelamentoPedido } from './pedido-cancelamento-confirmacao';
import { confirmacaoAlteracaoStatusPedido } from './pedido-status-confirmacao';

type ConfirmacaoPedidoRef = MatDialogRef<PedidoTrocarStatusDialogComponent> | MatDialogRef<ConfirmDialogComponent>;

const FLOW_STEPS = ['AGUARDANDO_PAGAMENTO', 'PENDENTE', 'EM_PRODUCAO', 'PRONTO', 'ENTREGUE'];

const STATUS_DESCRICAO: Record<string, string> = {
  PENDENTE: 'Pedido criado. Registre pagamento para avançar.',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento do cliente.',
  EM_PRODUCAO: 'Produção em andamento.',
  PRONTO: 'Pronto para entrega/retirada.',
  ENTREGUE: 'Pedido entregue. Somente leitura.',
  CANCELADO: 'Pedido cancelado. Somente leitura.'
};

const STATUS_UI: Record<string, { icon: string; tone: 'blue' | 'orange' | 'green' | 'red' | 'gray' }> = {
  PENDENTE: { icon: 'schedule', tone: 'blue' },
  AGUARDANDO_PAGAMENTO: { icon: 'credit_card', tone: 'orange' },
  EM_PRODUCAO: { icon: 'lock', tone: 'blue' },
  PRONTO: { icon: 'check_circle', tone: 'green' },
  ENTREGUE: { icon: 'local_shipping', tone: 'green' },
  CANCELADO: { icon: 'close', tone: 'red' }
};

@Component({
  selector: 'app-pedido-fluxo-controles',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatExpansionModule,
    MatMenuModule,
    MatDialogModule,
    SectionCardComponent,
    RouterModule,
    ManualLinkComponent,
    StatusBadgeComponent
  ],
  templateUrl: './pedido-fluxo-controles.component.html',
  styleUrls: ['./pedido-fluxo-controles.component.scss'],
  host: { '[class.pedido-fluxo--mobile]': 'mobileCompact' }
})
export class PedidoFluxoControlesComponent implements OnChanges {
  private readonly renderInjector = inject(Injector);
  private static nextId = 0;
  readonly trackTransicao = (_: number, transicao: { status: string }): string => transicao.status;
  readonly flowId = `pedido-flow-${PedidoFluxoControlesComponent.nextId++}`;
  mobileFlowExpanded = false;
  @Input() mobileCompact = false;
  @Input() mobileActionsPanel = false;
  @Output() abrirAcoesMobile = new EventEmitter<void>();
  @Output() confirmacaoAberta = new EventEmitter<ConfirmacaoPedidoRef>();
  @Input() statusAtualLabel: string | null = null;
  @Input() pedidoReferencia: string | null = null;
  STATUS_UI = STATUS_UI;
  @Input() titulo = 'Fluxo do pedido';
  @Input() renderCard = true;
  @Input() divider = true;
  @Input() inativo = false;
  @Input() isReadOnly = false;
  @Input() isOrcamento = false;
  @Input() orcamentoVencido = false;
  @Input() trocandoStatus = false;
  @Input() carregandoStatus = false;
  @Input() statusAtual!: string;
  @Input() restaPagar = 0;
  @Input() totalPago = 0;
  @Input() temPagamentos = false;
  @Input() statusControl!: FormControl;
  @Input() statusOptions: string[] = [];
  @Input() transicoes: { status: string; label: string; bloqueado: boolean; motivo?: string }[] = [];
  @Input() fluxoSteps: { status: string; label: string; atual?: boolean; concluido?: boolean }[] = [];
  @Input() descricaoStatus: string | null = null;
  @Input() permiteAdicionarPagamento = false;
  @Input() permiteFinalizar = false;
  @Input() permiteIniciarProducao = false;
  @Input() hints: string[] = [];

  @Output() confirmarPedido = new EventEmitter<void>();
  @Output() irParaPagamentos = new EventEmitter<void>();
  @Output() iniciarProducao = new EventEmitter<void>();
  @Output() marcarPronto = new EventEmitter<void>();
  @Output() marcarEntregue = new EventEmitter<void>();
  @Output() solicitarEntregaSemPagamento = new EventEmitter<void>();
  @Output() editarStatus = new EventEmitter<void>();
  @Output() cancelarStatus = new EventEmitter<void>();
  @Output() salvarStatus = new EventEmitter<void>();
  @Output() aprovarOrcamento = new EventEmitter<void>();
  @Output() cancelarPedido = new EventEmitter<void>();
  @Output() finalizarPedido = new EventEmitter<void>();
  @Output() trocarStatusSelecionado = new EventEmitter<string>();
  @Output() solicitarProducaoSemPagamento = new EventEmitter<void>();

  vm = {
    helperText: '',
    statusLabel: '',
    nextAction: null as null | { label: string; icon?: string; color?: 'primary' | 'accent' | 'warn' | 'success'; disabled?: boolean; type: string; target?: string },
    showCancel: false,
    showAdvanced: true,
    tone: 'gray',
    steps: [] as { label: string; active: boolean; done: boolean }[],
  };

  private dialog = inject(MatDialog);
  private confirmacaoStatusRef?: ConfirmacaoPedidoRef;

  ngOnChanges(_changes: SimpleChanges): void {
    this.computeFlowUI();
  }

  private computeFlowUI(): void {
    const statusKey = (this.statusAtual || '').toUpperCase();
    const readonly = this.inativo || this.isReadOnly;
    const defaultHelper = 'Gerencie o próximo passo do pedido.';
    let helperText = defaultHelper;
    let nextAction: any = null;
    let showCancel = false;
    let showAdvanced = true;

    const transicoesDisponiveis = (this.transicoes?.length
      ? this.transicoes
      : (this.statusOptions || []).map(s => ({ status: s, label: this.statusLabel(s), bloqueado: false })));
    const proximaTransicao = transicoesDisponiveis.length ? transicoesDisponiveis[0] : undefined;

    if (this.isOrcamento) {
      helperText = 'Orçamento: aguardando aprovação do cliente.';
      nextAction = { label: 'Aprovar orçamento', icon: 'thumb_up', color: 'primary' as const, disabled: this.orcamentoVencido, type: 'aprovarOrcamento' };
      if (this.orcamentoVencido) {
        helperText = 'Orçamento vencido. Gere um novo para seguir.';
      }
      showCancel = true;
      showAdvanced = false;
    } else {
      switch (statusKey) {
        case 'PENDENTE':
          helperText = 'Pedido confirmado. Envie para produção.';
          nextAction = { label: 'Iniciar produção', icon: 'play_arrow', color: 'primary' as const, type: 'enviarProducao' };
          showCancel = true;
          break;
        case 'AGUARDANDO_PAGAMENTO':
          helperText = 'Aguardando pagamento do cliente. Confirme o pedido quando estiver ok.';
          nextAction = { label: 'Confirmar pedido', icon: 'check', color: 'primary' as const, type: 'confirmarPedido' };
          showCancel = true;
          break;
        case 'EM_PRODUCAO':
          helperText = 'Em produção. Ao finalizar, marque como pronto.';
          nextAction = { label: 'Marcar como pronto', icon: 'done_all', color: 'primary' as const, type: 'marcarPronto' };
          showCancel = true;
          break;
        case 'PRONTO':
          helperText = 'Pronto para retirada/entrega.';
          nextAction = { label: 'Marcar como entregue', icon: 'local_shipping', color: 'primary' as const, type: 'marcarEntregue' };
          showCancel = false;
          break;
        case 'ENTREGUE':
          helperText = 'Pedido entregue. Somente leitura.';
          nextAction = null;
          showCancel = false;
          showAdvanced = false;
          break;
        case 'CANCELADO':
          helperText = 'Pedido cancelado. Somente leitura.';
          nextAction = null;
          showCancel = false;
          showAdvanced = false;
          break;
        default:
          helperText = defaultHelper;
          showCancel = true;
      }
    }

    if (!readonly && proximaTransicao) {
      nextAction = {
        label: proximaTransicao.label || this.statusLabel(proximaTransicao.status),
        icon: 'arrow_forward',
        color: 'primary' as const,
        disabled: proximaTransicao.bloqueado,
        type: 'mudarStatus',
        target: proximaTransicao.status
      };
    }

    if (readonly) {
      nextAction = nextAction ? { ...nextAction, disabled: true } : null;
      showAdvanced = false;
      showCancel = false;
    }

    this.vm = {
      helperText: this.descricaoStatus || helperText || STATUS_DESCRICAO[statusKey] || defaultHelper,
      statusLabel: this.statusAtualLabel || this.statusLabel(statusKey),
      nextAction,
      showCancel,
      showAdvanced,
      tone: (STATUS_UI[statusKey]?.tone || 'gray') as any,
      steps: this.stepsVm(statusKey)
    };
  }

  private stepsVm(statusKey: string): { label: string; active: boolean; done: boolean }[] {
    if (this.fluxoSteps?.length) {
      return this.fluxoSteps.map(step => ({
        label: step.label || this.statusLabel(step.status),
        active: !!step.atual || step.status === statusKey,
        done: !!step.concluido
      }));
    }
    if (this.mobileCompact) return [];
    return FLOW_STEPS.map((s, idx) => ({
      label: this.statusLabel(s),
      active: s === statusKey,
      done: idx < FLOW_STEPS.indexOf(statusKey),
    }));
  }

  statusLabel(val: string): string {
    if (!val) return '—';
    const normalized = val.replace(/_/g, ' ').toLowerCase();
    return normalized.replace(/\b\w/g, c => c.toUpperCase());
  }

  get podeTrocarStatus(): boolean {
    return this.opcoesTrocaStatus.some(l => !l.bloqueado);
  }

  get transicoesOperacionaisMobile() {
    return this.transicoes.filter(opcao => classificarTransicaoPedido(opcao.status) === 'operacional');
  }

  private get opcoesTrocaStatus() {
    const lista = this.transicoes?.length
      ? this.transicoes
      : (this.statusOptions || []).map(s => ({ status: s, label: this.statusLabel(s), bloqueado: false }));
    return this.mobileCompact ? lista.filter(opcao => classificarTransicaoPedido(opcao.status) !== 'cancelamento') : lista;
  }

  get mobileStatusBusy(): boolean { return this.inativo || this.trocandoStatus || this.carregandoStatus || !!this.confirmacaoStatusRef; }

  private transicaoPermitida(status: string): boolean {
    return (this.mobileCompact ? this.transicoes : this.opcoesTrocaStatus).some(opcao => opcao.status === status && !opcao.bloqueado);
  }

  avancarMobile(status: string, origem?: EventTarget | null): MatDialogRef<ConfirmDialogComponent> | undefined {
    const transicao = this.transicoesOperacionaisMobile.find(opcao => opcao.status === status);
    if (!this.mobileCompact || this.mobileStatusBusy || this.isReadOnly || !transicao || transicao.bloqueado) return;
    return this.abrirConfirmacaoTrocaStatus(status, origem instanceof HTMLElement ? origem : undefined);
  }

  confirmarCancelamentoMobile(): MatDialogRef<ConfirmDialogComponent> | undefined {
    if (!this.mobileCompact) return;
    return this.confirmarCancelamento();
  }

  confirmarCancelamento(): MatDialogRef<ConfirmDialogComponent> | undefined {
    const disponivel = () => (this.transicoes.length ? this.transicoes : this.statusOptions.map(status => ({ status, bloqueado: false })))
      .some(opcao => classificarTransicaoPedido(opcao.status) === 'cancelamento' && !opcao.bloqueado);
    if (this.mobileStatusBusy || this.isReadOnly || !disponivel()) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '440px', maxWidth: 'calc(100vw - 32px)',
      data: confirmacaoCancelamentoPedido(this.pedidoReferencia, this.vm.statusLabel),
    });
    this.confirmacaoStatusRef = ref;
    ref.afterClosed().pipe(take(1)).subscribe(confirmado => {
      if (this.confirmacaoStatusRef === ref) this.confirmacaoStatusRef = undefined;
      if (confirmado !== true || this.mobileStatusBusy || this.isReadOnly || !disponivel()) return;
      if (this.mobileCompact) {
        const transicao = this.transicoes.find(opcao => classificarTransicaoPedido(opcao.status) === 'cancelamento');
        if (!transicao) return;
        this.statusControl?.setValue(transicao.status);
        this.trocarStatusSelecionado.emit(transicao.status); this.salvarStatus.emit();
      } else this.cancelarPedido.emit();
    });
    this.confirmacaoAberta.emit(ref);
    return ref;
  }

  onNextAction(): void {
    if (!this.vm.nextAction || this.vm.nextAction.disabled) return;
    const type = this.vm.nextAction.type;
    switch (type) {
      case 'aprovarOrcamento':
        this.aprovarOrcamento.emit();
        break;
      case 'confirmarPedido':
        this.confirmarPedido.emit();
        break;
      case 'irParaPagamentos':
        this.irParaPagamentos.emit();
        break;
      case 'mudarStatus': {
        const destino = (this.vm.nextAction as any)?.target;
        if (destino) {
          if (classificarTransicaoPedido(destino) === 'cancelamento') this.confirmarCancelamento();
          else this.abrirConfirmacaoTrocaStatus(destino);
        }
        break;
      }
      case 'enviarProducao':
        this.iniciarProducao.emit();
        break;
      case 'iniciarProducao':
        this.iniciarProducao.emit();
        break;
      case 'marcarPronto':
        this.marcarPronto.emit();
        break;
      case 'marcarEntregue':
        this.marcarEntregue.emit();
        break;
      default:
        break;
    }
  }

  abrirMenuTrocarStatus(): ConfirmacaoPedidoRef | undefined {
    const opcoes = this.opcoesTrocaStatus;
    if (this.inativo || this.isReadOnly || !opcoes.length) return;
    if (opcoes.every(opcao => classificarTransicaoPedido(opcao.status) === 'cancelamento')) return this.confirmarCancelamento();
    return this.abrirSelecaoTrocaStatus();
  }

  private abrirConfirmacaoTrocaStatus(statusDestino?: string, origem?: HTMLElement): MatDialogRef<ConfirmDialogComponent> | undefined {
    if (!statusDestino || this.mobileStatusBusy || this.isReadOnly) return;
    if (classificarTransicaoPedido(statusDestino) === 'cancelamento') return this.confirmarCancelamento();
    const transicao = this.opcoesTrocaStatus.find(opcao => opcao.status === statusDestino && !opcao.bloqueado);
    if (!transicao || !this.transicaoPermitida(statusDestino)) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '440px', maxWidth: 'calc(100vw - 32px)',
      data: confirmacaoAlteracaoStatusPedido(this.vm.statusLabel, transicao.label || this.statusLabel(transicao.status)),
    });
    this.confirmacaoStatusRef = ref;
    ref.afterClosed().pipe(take(1)).subscribe(confirmado => {
      if (this.confirmacaoStatusRef === ref) this.confirmacaoStatusRef = undefined;
      if (origem) {
        afterNextRender(() => {
          if (!this.mobileStatusBusy && origem.isConnected && !origem.matches(':disabled')) origem.focus({ preventScroll: true });
        }, { injector: this.renderInjector });
      }
      if (confirmado !== true || this.mobileStatusBusy || this.isReadOnly ||
        !this.transicaoPermitida(statusDestino)) return;
      this.statusControl?.setValue(statusDestino);
      this.trocarStatusSelecionado.emit(statusDestino); this.salvarStatus.emit();
    });
    this.confirmacaoAberta.emit(ref);
    return ref;
  }

  private abrirSelecaoTrocaStatus(): MatDialogRef<PedidoTrocarStatusDialogComponent> | undefined {
    if (this.mobileStatusBusy) return;
    const opcoes = this.opcoesTrocaStatus;
    if (this.inativo || this.isReadOnly || !opcoes.length) return;

    const ref = this.dialog.open(PedidoTrocarStatusDialogComponent, {
      width: '440px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        statusAtual: this.statusAtual,
        statusAtualLabel: this.vm.statusLabel,
        statusDestino: null,
        opcoes,
        cancelamentoSeparado: !this.mobileCompact,
        selectionOnly: true,
      }
    });

    this.confirmacaoStatusRef = ref;
    ref.afterClosed().pipe(take(1)).subscribe((novo: { status: string } | null | undefined) => {
      if (this.confirmacaoStatusRef === ref) this.confirmacaoStatusRef = undefined;
      if (novo?.status) {
        if (!this.mobileCompact && classificarTransicaoPedido(novo.status) === 'cancelamento') {
          this.confirmarCancelamento(); return;
        }
        if (this.mobileStatusBusy || this.isReadOnly ||
          !opcoes.some(opcao => opcao.status === novo.status && !opcao.bloqueado) ||
          !this.transicaoPermitida(novo.status)) return;
        this.abrirConfirmacaoTrocaStatus(novo.status);
      }
    });
    this.confirmacaoAberta.emit(ref);
    return ref;
  }
}
