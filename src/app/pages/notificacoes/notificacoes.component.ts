import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { DataTableFilter, DataTableFilterState } from 'src/app/components/data-table/data-table.models';
import { ListFilterBarComponent } from 'src/app/components/list-filter-bar/list-filter-bar.component';
import { openMobileSidePanel } from 'src/app/components/mobile-side-panel/mobile-side-panel';
import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, Input, OnChanges, OnInit, SimpleChanges, TemplateRef, ViewChild, ViewContainerRef, afterNextRender, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { ToastrService } from 'ngx-toastr';
import { MaterialModule } from 'src/app/material.module';
import { AuthService } from 'src/app/services/auth.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NotificacaoItem } from './models/notificacao.model';
import { NotificacaoEnviarDialogComponent } from './components/notificacao-enviar-dialog.component';
import { NotificacaoService } from './services/notificacao.service';
import { ManualLinkComponent } from 'src/app/components/manual-link/manual-link.component';

@Component({
  selector: 'app-notificacoes',
  standalone: true,
  imports: [ListFilterBarComponent, CommonModule, MaterialModule, NgScrollbarModule, TablerIconsModule, RouterModule, DatePipe, ManualLinkComponent],
  templateUrl: './notificacoes.component.html',
  styleUrl: './notificacoes.component.scss'
})
export class AppNotificacoesComponent implements OnInit, OnChanges {
  @Input() embedded = false;
  @Input() mobileLayout = false;
  @ViewChild('notificacaoMobilePanel', { static: true }) private mobilePanel!: TemplateRef<unknown>;
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private panelRef: MatDialogRef<unknown> | null = null;
  private viewReady = false;
  private mobileRequested: NotificacaoItem | null = null;
  mobileDetalheErro: string | null = null;
  readonly buscaControl = new FormControl('', { nonNullable: true });
  readonly filtrosMobile: DataTableFilter[] = [{ key: 'naoLidas', label: 'Leitura', type: 'select', options: [{ value: true, label: 'Somente não lidas' }] }];

  aplicarFiltroMobile(state: DataTableFilterState): void {
    if ((state['naoLidas'] === true) !== this.somenteNaoLidas) this.toggleSomenteNaoLidas();
  }
  abrirNotificacaoMobile(item: NotificacaoItem): void {
    this.mobileRequested = item;
    this.selecionarNotificacao(item);
    this.abrirDetalheMobile();
  }
  private abrirDetalheMobile(): void {
    if (!this.mobileLayout || !this.viewReady || this.panelRef) return;
    const ref = openMobileSidePanel(this.dialog, this.mobilePanel, { viewContainerRef: this.viewContainerRef, ariaLabel: 'Notificação' });
    this.panelRef = ref;
    ref.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.panelRef === ref) this.panelRef = null;
    });
  }
  fecharDetalheMobile(): void { this.panelRef?.close(); }
  tentarDetalheMobile(): void { if (this.mobileRequested) this.selecionarNotificacao(this.mobileRequested); }

  @Input() selectedNotificacaoId: number | null = null;

  sidePanelOpened = signal(true);
  carregandoLista = false;
  carregandoDetalhe = false;
  processandoLeitura = false;

  pagina = 0;
  tamanho = 50;
  naoLidas = 0;
  somenteNaoLidas = false;

  notificacoes = signal<NotificacaoItem[]>([]);
  notificacoesFiltradas = signal<NotificacaoItem[]>([]);
  selecionada = signal<NotificacaoItem | null>(null);
  busca = '';
  podeEnviarNotificacao = false;
  private readonly permissoesEnviarNotificacao = ['NOTIFICACAO_ENVIAR', 'NOTIFICACAO_ENVIAR_GLOBAL'];

  constructor(
    private readonly service: NotificacaoService,
    private readonly toastr: ToastrService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly dialog: MatDialog
  ) {
    afterNextRender(() => {
      this.viewReady = true;
      if (this.mobileLayout && this.selecionada()?.id === this.selectedNotificacaoId) this.abrirDetalheMobile();
    });
    this.destroyRef.onDestroy(() => this.fecharDetalheMobile());
  }
  
  ngOnInit(): void {
    this.authService.usuario$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.podeEnviarNotificacao = this.authService.temAlgumaPermissao(this.permissoesEnviarNotificacao);
    });
    this.carregarLista(true);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('selectedNotificacaoId' in changes && this.embedded) {
      this.mobileRequested = null;
      this.aplicarSelecaoPorInput();
    }
  }

  get tituloPagina(): string {
    return this.embedded ? 'Notificações' : 'Central de notificações';
  }

  aplicarFiltro(event: Event): void {
    this.aplicarFiltroTexto(String((event.target as HTMLInputElement)?.value || ''));
  }

  aplicarFiltroTexto(value: string): void {
    this.busca = value;
    const termo = this.busca.trim().toLowerCase();
    if (!termo) {
      this.notificacoesFiltradas.set(this.notificacoes());
      return;
    }
    this.notificacoesFiltradas.set(
      this.notificacoes().filter((n) => {
        const base = `${n.titulo} ${n.resumo || ''} ${n.conteudo || ''}`.toLowerCase();
        return base.includes(termo);
      })
    );
  }

  toggleSomenteNaoLidas(): void {
    this.somenteNaoLidas = !this.somenteNaoLidas;
    this.carregarLista(true);
  }

  marcarTodasComoLidas(): void {
    if (!this.naoLidas || this.processandoLeitura) return;
    this.processandoLeitura = true;
    this.service.marcarTodasComoLidas$().subscribe({
      next: () => {
        this.toastr.success('Todas as notificações foram marcadas como lidas.');
        this.carregarLista(false);
        this.processandoLeitura = false;
      },
      error: (err) => {
        this.toastr.error(err?.userMessage || 'Não foi possível marcar todas como lidas.');
        this.processandoLeitura = false;
      }
    });
  }

  selecionarNotificacao(notificacao: NotificacaoItem, navegar = true): void {
    this.mobileDetalheErro = null;
    this.carregandoDetalhe = true;
    this.service.buscarPorId$(notificacao.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (detalhe) => {
        this.selecionada.set(detalhe);
        if (this.mobileLayout && detalhe.id === this.selectedNotificacaoId && !this.mobileRequested) {
          this.mobileRequested = notificacao;
          this.abrirDetalheMobile();
        }
        if (!this.embedded && navegar) {
          this.router.navigate(['/apps/notificacoes', detalhe.id], { replaceUrl: true });
        }
        this.marcarComoLidaSeNecessario(detalhe);
      },
      error: (err) => {
        this.carregandoDetalhe = false;
        this.mobileDetalheErro = err?.userMessage || 'Não foi possível abrir a notificação.';
        this.toastr.error(this.mobileDetalheErro!);
      }
    });
  }

  abrirLink(link?: string | null): void {
    const destino = String(link || '').trim();
    if (!destino) return;

    if (this.isAbsoluteUrl(destino)) {
      window.location.href = destino;
      return;
    }

    const rotaInterna = this.normalizarRotaInterna(destino);
    if (rotaInterna) {
      this.router.navigateByUrl(rotaInterna);
      return;
    }

    window.open(destino, '_blank', 'noopener');
  }

  statusNivelClass(nivel: string): string {
    const value = String(nivel || 'INFO').toUpperCase();
    if (value === 'CRITICO') return 'level-critico';
    if (value === 'ATENCAO') return 'level-atencao';
    if (value === 'SUCESSO') return 'level-sucesso';
    return 'level-info';
  }

  statusNivelLabel(nivel: string): string {
    const value = String(nivel || 'INFO').toUpperCase();
    if (value === 'CRITICO') return 'Crítico';
    if (value === 'ATENCAO') return 'Atenção';
    if (value === 'SUCESSO') return 'Sucesso';
    return 'Informação';
  }

  dataRelativa(iso?: string | null): string {
    if (!iso) return 'Agora';
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'Agora';
    if (min < 60) return `${min} min atrás`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h atrás`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} dia(s) atrás`;
    return new DatePipe('pt-BR').transform(date, 'dd/MM/yyyy HH:mm') || '';
  }

  isOver(): boolean {
    return window.matchMedia('(max-width: 960px)').matches;
  }

  abrirDialogEnvio(): void {
    if (!this.podeEnviarNotificacao) return;
    const config = { width: '720px', maxWidth: '95vw', disableClose: true, data: { mobilePanel: this.mobileLayout } };
    const dialogRef = this.mobileLayout
      ? openMobileSidePanel(this.dialog, NotificacaoEnviarDialogComponent, config)
      : this.dialog.open(NotificacaoEnviarDialogComponent, config);

    dialogRef.afterClosed().subscribe((enviou) => {
      if (!enviou) return;
      this.carregarLista(true);
    });
  }

  private carregarLista(resolverSelecao = true): void {
    this.carregandoLista = true;
    this.service.listar$(this.somenteNaoLidas, this.pagina, this.tamanho).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.naoLidas = Number(res.naoLidas || 0);
        this.notificacoes.set(res.itens || []);
        this.notificacoesFiltradas.set(res.itens || []);
        this.carregandoLista = false;
        if (resolverSelecao) this.resolverSelecaoInicial();
      },
      error: (err) => {
        this.carregandoLista = false;
        this.toastr.error(err?.userMessage || 'Não foi possível carregar notificações.');
      }
    });
  }

  private resolverSelecaoInicial(): void {
    const idInput = Number(this.selectedNotificacaoId || 0);
    if (this.embedded && Number.isFinite(idInput) && idInput > 0) {
      const encontradaPorInput = this.notificacoes().find((n) => n.id === idInput);
      if (encontradaPorInput) {
        this.selecionarNotificacao(encontradaPorInput, false);
        return;
      }
      this.selecionarPrimeiraDisponivel();
      return;
    }

    const rawId = this.route.snapshot.paramMap.get('id');
    const id = rawId ? Number(rawId) : NaN;
    if (Number.isFinite(id) && id > 0) {
      const encontrada = this.notificacoes().find((n) => n.id === id);
      if (encontrada) {
        this.selecionarNotificacao(encontrada, false);
        return;
      }
      this.selecionarPrimeiraDisponivel();
      return;
    }

    this.selecionarPrimeiraDisponivel();
  }

  private isAbsoluteUrl(destino: string): boolean {
    return /^https?:\/\//i.test(destino);
  }

  private normalizarRotaInterna(destino: string): string | null {
    if (!destino.startsWith('/')) return null;
    return destino;
  }

  private aplicarSelecaoPorInput(): void {
    const idInput = Number(this.selectedNotificacaoId || 0);
    if (!Number.isFinite(idInput) || idInput <= 0) {
      this.selecionarPrimeiraDisponivel();
      return;
    }
    const selecionadaAtual = this.selecionada();
    if (selecionadaAtual?.id === idInput) {
      return;
    }
    const encontrada = this.notificacoes().find((n) => n.id === idInput);
    if (encontrada) {
      this.selecionarNotificacao(encontrada, false);
      return;
    }
    this.selecionarPrimeiraDisponivel();
  }

  private selecionarPrimeiraDisponivel(): void {
    const primeira = this.notificacoes()[0];
    const selecionadaAtual = this.selecionada();
    if (selecionadaAtual && this.notificacoes().some((n) => n.id === selecionadaAtual.id)) {
      return;
    }
    if (primeira) {
      this.selecionarNotificacao(primeira, !this.embedded);
      return;
    }
    this.selecionada.set(null);
  }

  private marcarComoLidaSeNecessario(item: NotificacaoItem): void {
    if (item.lida) {
      this.carregandoDetalhe = false;
      return;
    }
    this.service.marcarComoLida$(item.id).subscribe({
      next: () => {
        this.naoLidas = Math.max(0, this.naoLidas - 1);
        this.notificacoes.set(
          this.notificacoes().map((n) =>
            n.id === item.id ? { ...n, lida: true, lidaEm: new Date().toISOString() } : n
          )
        );
        this.notificacoesFiltradas.set(
          this.notificacoesFiltradas().map((n) =>
            n.id === item.id ? { ...n, lida: true, lidaEm: new Date().toISOString() } : n
          )
        );
        this.selecionada.set({ ...item, lida: true, lidaEm: new Date().toISOString() });
        this.carregandoDetalhe = false;
      },
      error: () => {
        this.carregandoDetalhe = false;
      }
    });
  }
}
