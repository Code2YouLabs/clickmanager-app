import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, take } from 'rxjs';
import { InputPesquisaComponent } from 'src/app/components/inputs/input-pesquisa/input-pesquisa.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { AuthService } from 'src/app/services/auth.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
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

  private tipoEmpresa = TipoEmpresa.GRAFICA;
  private featureFlags: Record<string, boolean> = {};
  private readonly subscriptions = new Subscription();
  private viewReady = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly ngZone: NgZone,
    private readonly authService: AuthService,
    private readonly featureFlagService: FeatureFlagService
  ) {}

  ngOnInit(): void {
    this.tipoEmpresa = this.authService.getTipoEmpresa();

    this.subscriptions.add(
      this.featureFlagService.carregar().subscribe(features => {
        this.featureFlags = features;
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
      secao.requiredPermissions.some(permissao => this.authService.temPermissao(permissao));

    return tipoPermitido && featurePermitida && permissaoPermitida;
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
