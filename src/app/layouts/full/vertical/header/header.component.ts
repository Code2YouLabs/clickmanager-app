import {
  Component,
  Output,
  EventEmitter,
  Input,
  ViewEncapsulation,
  OnInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { CoreService } from 'src/app/services/core.service';
import { MatDialog } from '@angular/material/dialog';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario/usuario.model';
import { ImagemUtil } from 'src/app/utils/imagem-util';
import { NotificacaoItem } from 'src/app/pages/notificacoes/models/notificacao.model';
import { NotificacaoService } from 'src/app/pages/notificacoes/services/notificacao.service';
import { NotificacaoEnviarDialogComponent } from 'src/app/pages/notificacoes/components/notificacao-enviar-dialog.component';
import { Subject, filter, takeUntil } from 'rxjs';
import {
  AplicativoCatalogo,
  AtalhoEmpresa,
  ConfiguracaoAplicativos,
  aplicativosVisiveis,
} from 'src/app/models/config/configuracao-aplicativos.model';
import { ConfiguracaoAplicativosService } from 'src/app/services/configuracao-aplicativos.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';

type HeaderAppLink = AplicativoCatalogo;
type HeaderQuicklink = AtalhoEmpresa;

@Component({
  selector: 'app-header',
  imports: [
    RouterModule,
    CommonModule,
    NgScrollbarModule,
    TablerIconsModule,
    MaterialModule,
  ],
  templateUrl: './header.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() showToggle = true;
  @Input() toggleChecked = false;
  @Output() toggleMobileNav = new EventEmitter<void>();
  @Output() toggleMobileFilterNav = new EventEmitter<void>();
  @Output() toggleCollapsed = new EventEmitter<void>();

  isCollapse: boolean = false;
  showFiller = false;

  ImagemUtil = ImagemUtil;
  usuarioLogado: Usuario | null = null;
  apps: HeaderAppLink[] = [];
  quicklinks: HeaderQuicklink[] = [];

  options = this.settings.getOptions();
  notificacoes: NotificacaoItem[] = [];
  notificacoesNaoLidas = 0;
  carregandoNotificacoes = false;
  podeEnviarNotificacao = false;
  private readonly permissoesEnviarNotificacao = ['NOTIFICACAO_ENVIAR', 'NOTIFICACAO_ENVIAR_GLOBAL'];
  private readonly destroy$ = new Subject<void>();
  private ultimaCargaResumoAt = 0;
  private readonly intervaloMinimoResumoMs = 5000;

  constructor(
    private settings: CoreService,
    private vsidenav: CoreService,
    public dialog: MatDialog,
    private authService: AuthService,
    private notificacaoService: NotificacaoService,
    private router: Router,
    private configuracaoAplicativosService: ConfiguracaoAplicativosService,
    private featureFlagService: FeatureFlagService,
  ) {
    effect(() => {
      this.atualizarLinksEmpresa(this.configuracaoAplicativosService.configuracao());
    });
  }

  ngOnInit() {
    this.authService.usuario$
      .pipe(takeUntil(this.destroy$))
      .subscribe(usuario => {
      this.usuarioLogado = usuario;
      this.carregarLinksEmpresa();
      this.atualizarPermissaoEnvio();
      if (usuario?.id) {
        this.carregarResumoNotificacoes(true);
      } else {
        this.notificacoes = [];
        this.notificacoesNaoLidas = 0;
        this.ultimaCargaResumoAt = 0;
      }
    });

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (!this.usuarioLogado?.id) return;
        this.carregarResumoNotificacoes();
      });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleCollpase() {
    this.isCollapse = !this.isCollapse;
  }

  logout(): void {
    this.authService.logout();
  }

  usarImagemPadrao(event: Event): void {
    const imagem = event.target as HTMLImageElement | null;
    if (!imagem || imagem.dataset['fallbackApplied'] === 'true') {
      return;
    }

    imagem.dataset['fallbackApplied'] = 'true';
    imagem.onerror = null;
    imagem.src = 'assets/images/profile/user-1.jpg';
  }

  abrirSmartCalc(): void {
    this.router.navigate(['/smartcalc']);
  }

  abrirApp(app: HeaderAppLink): void {
    if (!app?.rota) return;
    this.router.navigate([app.rota]);
  }

  abrirAtalho(atalho: HeaderQuicklink, event?: Event): void {
    event?.preventDefault();
    if (!atalho?.url) return;

    if (atalho.novaAba) {
      window.open(atalho.url, '_blank', 'noopener,noreferrer');
      return;
    }

    window.location.href = atalho.url;
  }

  onOpenNotificacoesMenu(): void {
    this.atualizarPermissaoEnvio();
    this.carregarResumoNotificacoes(true);
  }

  abrirNotificacao(item: NotificacaoItem): void {
    if (!item?.id) return;
    this.notificacaoService.marcarComoLida$(item.id).subscribe({
      next: () => {
        this.notificacoesNaoLidas = Math.max(0, this.notificacoesNaoLidas - (item.lida ? 0 : 1));
        this.notificacoes = this.notificacoes.map((n) => (n.id === item.id ? { ...n, lida: true } : n));
      },
      error: () => {}
    });
    this.abrirCentralNotificacoes(item.id);
  }

  abrirTodasNotificacoes(): void {
    this.abrirCentralNotificacoes();
  }

  abrirDialogEnvioNotificacao(): void {
    this.atualizarPermissaoEnvio();
    if (!this.podeEnviarNotificacao) return;
    const dialogRef = this.dialog.open(NotificacaoEnviarDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((enviou) => {
      if (!enviou) return;
      this.carregarResumoNotificacoes(true);
      this.abrirCentralNotificacoes();
    });
  }

  marcarTodasNotificacoesComoLidas(): void {
    if (!this.notificacoesNaoLidas) return;
    this.notificacaoService.marcarTodasComoLidas$().subscribe({
      next: () => {
        this.notificacoesNaoLidas = 0;
        this.notificacoes = this.notificacoes.map((n) => ({ ...n, lida: true }));
      },
      error: () => {}
    });
  }

  notificacaoLabelNova(): string {
    return `${this.notificacoesNaoLidas} nova(s)`;
  }

  possuiNotificacaoCriticaNaoLida(): boolean {
    return this.notificacoes.some(
      (item) => !item.lida && String(item?.nivel || '').toUpperCase() === 'CRITICO'
    );
  }

  formatarTempoNotificacao(iso?: string | null): string {
    if (!iso) return 'Agora';
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'Agora';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  }

  resumoNotificacao(item: NotificacaoItem): string {
    return String(item.resumo || item.conteudo || 'Sem resumo');
  }

  iconeNotificacao(item: NotificacaoItem): string {
    const nivel = String(item?.nivel || 'INFO').toUpperCase();
    if (nivel === 'CRITICO') return 'alert-octagon';
    if (nivel === 'ATENCAO') return 'alert-triangle';
    if (nivel === 'SUCESSO') return 'circle-check';
    return 'info-circle';
  }

  private carregarResumoNotificacoes(force = false): void {
    if (!force) {
      const agora = Date.now();
      if (agora - this.ultimaCargaResumoAt < this.intervaloMinimoResumoMs) {
        return;
      }
    }

    this.carregandoNotificacoes = true;
    this.notificacaoService.obterResumo$(5).subscribe({
      next: (resumo) => {
        this.notificacoes = resumo.itens || [];
        this.notificacoesNaoLidas = Number(resumo.naoLidas || 0);
        this.carregandoNotificacoes = false;
        this.ultimaCargaResumoAt = Date.now();
      },
      error: () => {
        this.carregandoNotificacoes = false;
      }
    });
  }

  private atualizarPermissaoEnvio(): void {
    this.podeEnviarNotificacao = this.authService.temAlgumaPermissao(this.permissoesEnviarNotificacao);
  }

  private abrirCentralNotificacoes(notificacaoId?: number): void {
    const usuarioId = this.usuarioLogado?.id ?? this.authService.getJwtId();
    if (!usuarioId) {
      this.router.navigate(notificacaoId ? ['/apps/notificacoes', notificacaoId] : ['/apps/notificacoes']);
      return;
    }

    const queryParams: Record<string, any> = { tab: 'notificacoes' };
    if (notificacaoId) {
      queryParams['notificacaoId'] = notificacaoId;
    }

    this.router.navigate(['/theme-pages/account-setting', usuarioId], { queryParams });
  }

  private carregarLinksEmpresa(): void {
    if (!this.usuarioLogado?.id) {
      this.apps = [];
      this.quicklinks = [];
      return;
    }

    this.featureFlagService.carregar().subscribe();
    this.configuracaoAplicativosService.carregar().subscribe({
      error: () => {
        this.apps = [];
        this.quicklinks = [];
      },
    });
  }

  private atualizarLinksEmpresa(configuracao: ConfiguracaoAplicativos | null): void {
    this.apps = aplicativosVisiveis(
      configuracao,
      (modulo) => this.featureFlagService.isEnabled(modulo),
      (permissao) => this.authService.temPermissao(permissao),
    );
    this.quicklinks = (configuracao?.atalhos || [])
      .filter((atalho) => atalho.ativo)
      .slice()
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  }
}
