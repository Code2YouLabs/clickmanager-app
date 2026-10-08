import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription, catchError, finalize, of, take } from 'rxjs';
import { InputPesquisaComponent } from 'src/app/components/inputs/input-pesquisa/input-pesquisa.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { AuthService } from 'src/app/services/auth.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import { JornadaDefinicao, JornadaProgressoResponse, JornadaStatus } from 'src/app/shared/jornadas/jornada.models';
import { JornadaService } from 'src/app/shared/jornadas/jornada.service';
import { AJUDA_SECOES } from './ajuda.data';
import { AjudaSecao } from './ajuda.models';

type AjudaQuickTopic = {
  id: string;
  label: string;
  icon: string;
};

@Component({
  selector: 'app-ajuda',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    InputPesquisaComponent,
    PageCardComponent,
    SectionCardComponent,
  ],
  templateUrl: './ajuda.component.html',
  styleUrls: ['./ajuda.component.scss'],
})
export class AjudaComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly pesquisaControl = new FormControl('', { nonNullable: true });
  readonly suporteRoute = ['/page/suporte'];

  filtro = '';
  expandedId: string | null = null;
  carregandoJornadas = false;
  erroJornadas = false;
  acaoTutorialEmAndamento: string | null = null;

  private tipoEmpresa = TipoEmpresa.GRAFICA;
  private featureFlags: Record<string, boolean> = {};
  private progressosJornada = new Map<string, JornadaProgressoResponse>();
  private usuarioEmpresaKey: string | null = null;
  private readonly subscriptions = new Subscription();
  private viewReady = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly ngZone: NgZone,
    private readonly authService: AuthService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly jornadaService: JornadaService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.tipoEmpresa = this.authService.getTipoEmpresa();

    this.subscriptions.add(
      this.authService.usuario$.subscribe(usuario => {
        this.tipoEmpresa = this.authService.getTipoEmpresa(usuario);
        const key = usuario?.id && usuario?.empresa?.id ? `${usuario.id}:${usuario.empresa.id}` : null;
        if (key !== this.usuarioEmpresaKey) {
          this.usuarioEmpresaKey = key;
          this.progressosJornada.clear();
          this.carregarEstadosJornadas();
        }
      })
    );

    this.subscriptions.add(
      this.featureFlagService.carregar().subscribe(features => {
        this.featureFlags = features;
        this.carregarEstadosJornadas();
        this.expandirFragmentoVisivel(this.route.snapshot.fragment);
      })
    );

    this.subscriptions.add(
      this.route.fragment.subscribe(fragment => this.expandirFragmentoVisivel(fragment))
    );
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.expandirFragmentoVisivel(this.route.snapshot.fragment);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onPesquisar(valor: string): void {
    this.filtro = valor;
    if (this.filteredSecoes.length === 1) {
      this.expandedId = this.filteredSecoes[0].id;
    }
  }

  limparBusca(): void {
    this.filtro = '';
    this.pesquisaControl.setValue('', { emitEvent: false });
  }

  abrirTopico(secao: AjudaSecao | AjudaQuickTopic): void {
    const id = this.resolverIdVisivel(secao.id);
    if (!id) return;

    this.expandedId = id;
    this.router.navigate([], {
      relativeTo: this.route,
      fragment: id,
      queryParamsHandling: 'preserve',
    });
    this.rolarPara(id);
  }

  recarregarJornadas(): void {
    this.carregarEstadosJornadas(true);
  }

  executarTutorial(secao: AjudaSecao): void {
    if (!secao.tutorial || this.acaoTutorialEmAndamento) return;
    if (this.erroJornadas && !this.progressoTutorial(secao)) return;

    const status = this.statusTutorial(secao);
    if (status === 'EM_ANDAMENTO') {
      this.continuarTutorial(secao);
      return;
    }

    if (status === 'CONCLUIDO') {
      if (!window.confirm('Refazer este tutorial inicia uma nova execução guiada. O pedido antigo não será alterado.')) {
        return;
      }
      this.reiniciarTutorial(secao);
      return;
    }

    if (status === 'ABANDONADO') {
      if (!window.confirm('Reiniciar este tutorial limpa apenas o progresso guiado. Dados de pedidos não serão alterados.')) {
        return;
      }
      this.reiniciarTutorial(secao);
      return;
    }

    this.iniciarTutorial(secao);
  }

  get visibleSecoes(): AjudaSecao[] {
    return AJUDA_SECOES.filter(secao => this.secaoVisivel(secao));
  }

  get filteredSecoes(): AjudaSecao[] {
    const termo = this.normalizar(this.filtro);
    if (!termo) return this.visibleSecoes;
    return this.visibleSecoes.filter(secao => this.textoPesquisavel(secao).includes(termo));
  }

  get quickTopics(): AjudaQuickTopic[] {
    return this.visibleSecoes
      .filter(secao => secao.atalhoRapido)
      .sort((a, b) => (a.ordemAtalho ?? 999) - (b.ordemAtalho ?? 999))
      .map(secao => ({
        id: secao.id,
        label: secao.titulo,
        icon: secao.icon || 'help_outline',
      }));
  }

  trackBySecao(_: number, secao: AjudaSecao): string {
    return secao.id;
  }

  isTutorial(secao: AjudaSecao): boolean {
    return !!secao.tutorial;
  }

  progressoTutorial(secao: AjudaSecao): JornadaProgressoResponse | null {
    const jornada = secao.tutorial?.jornada;
    return jornada ? this.progressosJornada.get(this.chaveJornada(jornada)) ?? null : null;
  }

  statusTutorial(secao: AjudaSecao): JornadaStatus {
    return this.progressoTutorial(secao)?.status ?? 'NAO_INICIADO';
  }

  statusTutorialLabel(secao: AjudaSecao): string {
    if (this.erroJornadas && !this.progressoTutorial(secao)) {
      return 'Estado indisponível';
    }
    if (this.carregandoJornadas && !this.progressoTutorial(secao)) {
      return 'Carregando';
    }

    switch (this.statusTutorial(secao)) {
      case 'EM_ANDAMENTO':
        return 'Em andamento';
      case 'CONCLUIDO':
        return 'Concluído';
      case 'IGNORADO':
        return 'Não iniciado';
      case 'ABANDONADO':
        return 'Abandonado';
      default:
        return 'Não iniciado';
    }
  }

  acaoTutorialLabel(secao: AjudaSecao): string {
    switch (this.statusTutorial(secao)) {
      case 'EM_ANDAMENTO':
        return 'Continuar';
      case 'CONCLUIDO':
        return 'Refazer';
      case 'ABANDONADO':
        return 'Reiniciar';
      default:
        return 'Iniciar';
    }
  }

  detalheTutorial(secao: AjudaSecao): string | null {
    const progresso = this.progressoTutorial(secao);
    if (!progresso?.etapaAtual || progresso.status !== 'EM_ANDAMENTO') {
      return null;
    }

    return `Você parou em: ${this.formatarEtapa(progresso.etapaAtual)}.`;
  }

  acaoTutorialDesabilitada(secao: AjudaSecao): boolean {
    return this.carregandoJornadas
      || this.acaoTutorialEmAndamento === secao.id
      || (this.erroJornadas && !this.progressoTutorial(secao));
  }

  private expandirFragmentoVisivel(fragment?: string | null): void {
    const id = this.resolverIdVisivel(fragment);
    if (!id) return;
    this.expandedId = id;
    this.rolarPara(id);
  }

  private rolarPara(id: string): void {
    if (!this.viewReady) return;

    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private resolverIdVisivel(id?: string | null): string | null {
    const fragment = (id || '').trim();
    if (!fragment) return null;

    const secao = this.visibleSecoes.find(item => item.id === fragment || item.aliases?.includes(fragment));
    return secao?.id ?? null;
  }

  private secaoVisivel(secao: AjudaSecao): boolean {
    const tipoPermitido = !secao.allowedEmpresaTipos?.length || secao.allowedEmpresaTipos.includes(this.tipoEmpresa);
    const featurePermitida = !secao.featureKey || this.featurePermitida(secao.featureKey);
    const permissaoPermitida = !secao.requiredPermissions?.length ||
      secao.requiredPermissions.every(permissao => this.authService.temPermissao(permissao));

    return tipoPermitido && featurePermitida && permissaoPermitida;
  }

  private carregarEstadosJornadas(force = false): void {
    if (!force && (!this.usuarioEmpresaKey || !this.visibleSecoes.some(secao => secao.tutorial))) {
      return;
    }

    this.carregandoJornadas = true;
    this.erroJornadas = false;
    this.jornadaService.listar().pipe(
      take(1),
      catchError(() => {
        this.erroJornadas = true;
        this.progressosJornada.clear();
        return of([] as JornadaProgressoResponse[]);
      }),
      finalize(() => {
        this.carregandoJornadas = false;
      })
    ).subscribe(progressos => {
      if (this.erroJornadas) return;
      this.progressosJornada = new Map(
        progressos.map(progresso => [`${progresso.jornada}:${progresso.versao}`, progresso])
      );
    });
  }

  private iniciarTutorial(secao: AjudaSecao): void {
    const jornada = secao.tutorial?.jornada;
    if (!jornada) return;

    this.executarOperacaoTutorial(secao, this.jornadaService.iniciar(jornada, { etapa: jornada.etapaInicial }));
  }

  private reiniciarTutorial(secao: AjudaSecao): void {
    const jornada = secao.tutorial?.jornada;
    if (!jornada) return;

    this.executarOperacaoTutorial(secao, this.jornadaService.reiniciar(jornada, { etapa: jornada.etapaInicial }));
  }

  private executarOperacaoTutorial(secao: AjudaSecao, operacao: ReturnType<JornadaService['iniciar']>): void {
    const jornada = secao.tutorial?.jornada;
    if (!jornada) return;

    this.acaoTutorialEmAndamento = secao.id;
    operacao.pipe(
      take(1),
      finalize(() => {
        this.acaoTutorialEmAndamento = null;
      })
    ).subscribe({
      next: progresso => {
        this.progressosJornada.set(this.chaveJornada(jornada), progresso);
        this.navegarParaJornada(jornada);
      },
      error: error => {
        this.toastr.error(this.errorMessage(error, 'Não foi possível iniciar o tutorial. Tente novamente.'));
      },
    });
  }

  private continuarTutorial(secao: AjudaSecao): void {
    const jornada = secao.tutorial?.jornada;
    if (!jornada) return;
    this.navegarParaJornada(jornada);
  }

  private navegarParaJornada(jornada: JornadaDefinicao): void {
    this.router.navigateByUrl(jornada.rotaInicial);
  }

  private chaveJornada(jornada: JornadaDefinicao): string {
    return `${jornada.chave}:${jornada.versao}`;
  }

  private formatarEtapa(etapa: string): string {
    return etapa
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^./, char => char.toUpperCase());
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.error?.error || error?.message || fallback;
  }

  private featurePermitida(featureKey: string): boolean {
    if (Object.prototype.hasOwnProperty.call(this.featureFlags, featureKey)) {
      return this.featureFlags[featureKey] === true;
    }
    return true;
  }

  private textoPesquisavel(secao: AjudaSecao): string {
    const itens = (secao.itens || [])
      .map(item => `${item.titulo} ${item.detalhes.join(' ')}`)
      .join(' ');
    const partes = [
      secao.titulo,
      secao.descricao,
      secao.grupo,
      ...(secao.passos || []),
      itens,
      ...(secao.palavrasChave || []),
      ...(secao.aliases || []),
    ];

    return this.normalizar(partes.join(' '));
  }

  private normalizar(valor: string): string {
    return (valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }
}
