import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Observable, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { GraficaComercialDestinoResponse, PedidoComercialResumo } from '../../shared/grafica.models';
import { PRIMEIRO_PEDIDO_JORNADA } from 'src/app/shared/jornadas/jornada.constants';
import { JornadaProgressoResponse } from 'src/app/shared/jornadas/jornada.models';
import { JornadaService } from 'src/app/shared/jornadas/jornada.service';
import { TutorialDefinition } from 'src/app/shared/tutorial/tutorial.model';
import { TutorialService } from 'src/app/shared/tutorial/tutorial.service';

export const PRIMEIRO_PEDIDO_TUTORIAL_ID = 'PRIMEIRO_PEDIDO_V1';

export const PRIMEIRO_PEDIDO_ETAPAS = {
  inicio: 'inicio',
  criacao: 'criacao',
  cliente: 'cliente',
  item: 'item',
  revisao: 'revisao',
  pedidoCriado: 'pedido_criado',
  kanban: 'kanban',
  movimentado: 'movimentado',
} as const;

export const PRIMEIRO_PEDIDO_TARGETS = {
  lista: 'primeiro-pedido-lista',
  novo: 'primeiro-pedido-novo',
  cliente: 'primeiro-pedido-cliente',
  adicionarItem: 'primeiro-pedido-adicionar-item',
  configurador: 'primeiro-pedido-configurador',
  revisao: 'primeiro-pedido-revisao',
  salvar: 'primeiro-pedido-salvar',
  alternarKanban: 'primeiro-pedido-alternar-kanban',
  kanbanCard: 'primeiro-pedido-kanban-card',
} as const;

export const PRIMEIRO_PEDIDO_EVENTOS = {
  novoPedido: 'primeiro-pedido.novo-pedido',
  clienteSelecionado: 'primeiro-pedido.cliente-selecionado',
  configuradorAberto: 'primeiro-pedido.configurador-aberto',
  itemAdicionado: 'primeiro-pedido.item-adicionado',
  pedidoCriado: 'primeiro-pedido.pedido-criado',
  kanbanSelecionado: 'primeiro-pedido.kanban-selecionado',
  pedidoMovido: 'primeiro-pedido.pedido-movido',
} as const;

type PrimeiroPedidoEtapa = typeof PRIMEIRO_PEDIDO_ETAPAS[keyof typeof PRIMEIRO_PEDIDO_ETAPAS];

@Injectable({ providedIn: 'root' })
export class PrimeiroPedidoTutorialService {
  private readonly jornada = inject(JornadaService);
  private readonly tutorial = inject(TutorialService);
  private readonly router = inject(Router);
  private pedidoCriadoId: number | null = null;
  private retomadaSemPedidoId = false;

  iniciarSeNecessario(pedidoIdContexto?: number | null): void {
    this.jornada.consultar(PRIMEIRO_PEDIDO_JORNADA).pipe(
      take(1),
      catchError(() => EMPTY),
    ).subscribe((progresso) => this.iniciarPorProgresso(progresso, pedidoIdContexto));
  }

  registrarNovoPedido(): void {
    if (!this.tutorialAtivo()) return;
    this.persistirEtapa(PRIMEIRO_PEDIDO_ETAPAS.cliente)
      .subscribe(() => this.tutorial.notify(PRIMEIRO_PEDIDO_EVENTOS.novoPedido));
  }

  registrarClienteSelecionado(): void {
    if (!this.tutorialAtivo()) return;
    this.persistirEtapa(PRIMEIRO_PEDIDO_ETAPAS.item)
      .subscribe(() => this.tutorial.notify(PRIMEIRO_PEDIDO_EVENTOS.clienteSelecionado));
  }

  registrarItemAdicionado(): void {
    if (!this.tutorialAtivo()) return;
    this.persistirEtapa(PRIMEIRO_PEDIDO_ETAPAS.revisao)
      .subscribe(() => this.tutorial.notify(PRIMEIRO_PEDIDO_EVENTOS.itemAdicionado));
  }

  registrarConfiguradorAberto(): void {
    if (!this.tutorialAtivo()) return;
    this.tutorial.notify(PRIMEIRO_PEDIDO_EVENTOS.configuradorAberto);
  }

  registrarPedidoCriado(response: GraficaComercialDestinoResponse): Observable<boolean> {
    if (!this.tutorialAtivo()) return of(false);
    const pedidoId = Number(response?.id || 0);
    if (!pedidoId) {
      return of(false);
    }

    this.pedidoCriadoId = pedidoId;
    return this.persistirEtapa(PRIMEIRO_PEDIDO_ETAPAS.pedidoCriado).pipe(
      map(() => {
        this.tutorial.notify(PRIMEIRO_PEDIDO_EVENTOS.pedidoCriado);
        return true;
      }),
      catchError(() => of(false)),
    );
  }

  registrarKanbanSelecionado(): void {
    if (!this.tutorialAtivo()) return;
    this.persistirEtapa(PRIMEIRO_PEDIDO_ETAPAS.kanban)
      .subscribe(() => this.tutorial.notify(PRIMEIRO_PEDIDO_EVENTOS.kanbanSelecionado));
  }

  registrarPedidoMovido(pedido: PedidoComercialResumo): void {
    if (!this.tutorialAtivo()) return;
    const pedidoId = this.idPedido(pedido);
    if (!this.pedidoCriadoId || pedidoId !== this.pedidoCriadoId) {
      return;
    }

    this.persistirEtapa(PRIMEIRO_PEDIDO_ETAPAS.movimentado).pipe(
      switchMap(() => this.jornada.concluir(PRIMEIRO_PEDIDO_JORNADA)),
      catchError(() => EMPTY),
    ).subscribe(() => {
      this.tutorial.notify(PRIMEIRO_PEDIDO_EVENTOS.pedidoMovido);
      this.tutorial.complete();
    });
  }

  deveGuiarPedido(pedido: PedidoComercialResumo): boolean {
    const pedidoId = this.idPedido(pedido);
    return !!this.pedidoCriadoId && pedidoId === this.pedidoCriadoId;
  }

  targetPedidoKanban(pedido: PedidoComercialResumo): string {
    return this.deveGuiarPedido(pedido) ? PRIMEIRO_PEDIDO_TARGETS.kanbanCard : '';
  }

  get aguardandoRetomadaComPedidoPersistido(): boolean {
    return this.retomadaSemPedidoId;
  }

  private iniciarPorProgresso(progresso: JornadaProgressoResponse, pedidoIdContexto?: number | null): void {
    if (progresso.status !== 'EM_ANDAMENTO') {
      return;
    }

    const etapa = this.normalizarEtapa(progresso.etapaAtual);
    const pedidoId = pedidoIdContexto || this.pedidoIdDaUrl();
    if (pedidoId) {
      this.pedidoCriadoId = pedidoId;
      this.retomadaSemPedidoId = false;
    }

    if (this.etapaExigePedido(etapa) && !this.pedidoCriadoId) {
      this.retomadaSemPedidoId = true;
      this.tutorial.stop();
      return;
    }

    this.retomadaSemPedidoId = false;
    this.tutorial.start(this.definicaoTutorial(), this.stepInicial(etapa));
  }

  private definicaoTutorial(): TutorialDefinition {
    return {
      id: PRIMEIRO_PEDIDO_TUTORIAL_ID,
      labels: {
        eyebrow: 'Primeiro pedido',
        exit: 'Sair',
        next: 'Avançar',
        back: 'Voltar',
        finish: 'Concluir',
      },
      steps: [
        {
          id: 'lista',
          title: 'Comece pelo fluxo real de pedidos',
          description: 'Use o botão de novo pedido para criar o primeiro atendimento da gráfica.',
          targetId: PRIMEIRO_PEDIDO_TARGETS.novo,
          route: PRIMEIRO_PEDIDO_JORNADA.rotaInicial,
          advanceOn: PRIMEIRO_PEDIDO_EVENTOS.novoPedido,
          actionLabel: 'Criar pedido',
        },
        {
          id: 'cliente',
          title: 'Informe o cliente',
          description: 'Selecione ou cadastre o cliente que ficará vinculado ao pedido.',
          targetId: PRIMEIRO_PEDIDO_TARGETS.cliente,
          route: `${PRIMEIRO_PEDIDO_JORNADA.rotaInicial}/novo`,
          advanceOn: PRIMEIRO_PEDIDO_EVENTOS.clienteSelecionado,
        },
        {
          id: 'item',
          title: 'Adicione o item vendido',
          description: 'Abra o configurador de produtos e serviços e monte o item real do pedido.',
          targetId: PRIMEIRO_PEDIDO_TARGETS.adicionarItem,
          route: `${PRIMEIRO_PEDIDO_JORNADA.rotaInicial}/novo`,
          advanceOn: PRIMEIRO_PEDIDO_EVENTOS.configuradorAberto,
        },
        {
          id: 'configurador',
          title: 'Configure produto ou serviço',
          description: 'Escolha as opções reais do item e adicione ao pedido.',
          targetId: PRIMEIRO_PEDIDO_TARGETS.configurador,
          advanceOn: PRIMEIRO_PEDIDO_EVENTOS.itemAdicionado,
        },
        {
          id: 'revisao',
          title: 'Revise antes de criar',
          description: 'Confira cliente, item e total. Quando tudo estiver certo, crie o pedido.',
          targetId: PRIMEIRO_PEDIDO_TARGETS.salvar,
          route: `${PRIMEIRO_PEDIDO_JORNADA.rotaInicial}/novo`,
          advanceOn: PRIMEIRO_PEDIDO_EVENTOS.pedidoCriado,
        },
        {
          id: 'kanban',
          title: 'Acompanhe no Kanban',
          description: 'Alterne para o Kanban para ver o pedido nas etapas operacionais.',
          targetId: PRIMEIRO_PEDIDO_TARGETS.alternarKanban,
          route: PRIMEIRO_PEDIDO_JORNADA.rotaInicial,
          advanceOn: PRIMEIRO_PEDIDO_EVENTOS.kanbanSelecionado,
        },
        {
          id: 'movimentar',
          title: 'Mova o pedido para a próxima etapa',
          description: 'Arraste o card do pedido. A jornada conclui somente depois que a alteração de status for confirmada.',
          targetId: PRIMEIRO_PEDIDO_TARGETS.kanbanCard,
          route: PRIMEIRO_PEDIDO_JORNADA.rotaInicial,
          advanceOn: PRIMEIRO_PEDIDO_EVENTOS.pedidoMovido,
          actionLabel: 'Mover no Kanban',
        },
      ],
    };
  }

  private stepInicial(etapa: PrimeiroPedidoEtapa): string {
    switch (etapa) {
      case PRIMEIRO_PEDIDO_ETAPAS.cliente:
      case PRIMEIRO_PEDIDO_ETAPAS.criacao:
        return 'cliente';
      case PRIMEIRO_PEDIDO_ETAPAS.item:
        return 'item';
      case PRIMEIRO_PEDIDO_ETAPAS.revisao:
        return 'revisao';
      case PRIMEIRO_PEDIDO_ETAPAS.pedidoCriado:
      case PRIMEIRO_PEDIDO_ETAPAS.kanban:
        return 'kanban';
      case PRIMEIRO_PEDIDO_ETAPAS.movimentado:
        return 'movimentar';
      default:
        return 'lista';
    }
  }

  private persistirEtapa(etapa: PrimeiroPedidoEtapa): Observable<JornadaProgressoResponse> {
    return this.jornada.atualizarEtapa(PRIMEIRO_PEDIDO_JORNADA, etapa).pipe(take(1));
  }

  private normalizarEtapa(etapa?: string | null): PrimeiroPedidoEtapa {
    const valor = (etapa || PRIMEIRO_PEDIDO_JORNADA.etapaInicial) as PrimeiroPedidoEtapa;
    return Object.values(PRIMEIRO_PEDIDO_ETAPAS).includes(valor)
      ? valor
      : PRIMEIRO_PEDIDO_ETAPAS.inicio;
  }

  private etapaExigePedido(etapa: PrimeiroPedidoEtapa): boolean {
    const etapasComPedido: PrimeiroPedidoEtapa[] = [
      PRIMEIRO_PEDIDO_ETAPAS.pedidoCriado,
      PRIMEIRO_PEDIDO_ETAPAS.kanban,
      PRIMEIRO_PEDIDO_ETAPAS.movimentado,
    ];
    return etapasComPedido.includes(etapa);
  }

  private pedidoIdDaUrl(): number | null {
    const tree = this.router.parseUrl(this.router.url);
    const queryId = Number(tree.queryParams['primeiroPedidoId'] || 0);
    if (queryId > 0) {
      return queryId;
    }

    const segments = tree.root.children['primary']?.segments.map((segment) => segment.path) ?? [];
    const pedidosIndex = segments.findIndex((segment) => segment === 'pedidos');
    const rawId = pedidosIndex >= 0 ? Number(segments[pedidosIndex + 1] || 0) : 0;
    return rawId > 0 ? rawId : null;
  }

  private idPedido(pedido: PedidoComercialResumo): number {
    return Number(pedido.id || pedido.pedidoId || 0);
  }

  private tutorialAtivo(): boolean {
    return this.tutorial.activeDefinition()?.id === PRIMEIRO_PEDIDO_TUTORIAL_ID;
  }
}
