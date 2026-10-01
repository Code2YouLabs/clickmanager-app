import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { MaterialModule } from 'src/app/material.module';
import { environment } from 'src/environments/environment';
import { getClickManagerPublicHost } from '../../links/utils/links-url.util';
import { SiteConfigResponse } from '../../site/models/site-config.models';
import { SiteConfigService } from '../../site/services/site-config.service';
import { AlterarEnderecoPublicoDialogComponent, AlterarEnderecoPublicoDialogData } from './components/alterar-endereco-publico-dialog.component';
import { PresencaPublicaResponse } from './presenca-publica.models';
import { PresencaPublicaService } from './presenca-publica.service';

@Component({
  selector: 'app-presenca-publica',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MaterialModule,
    PageCardComponent,
  ],
  templateUrl: './presenca-publica.component.html',
  styleUrl: './presenca-publica.component.scss',
})
export class PresencaPublicaComponent implements OnInit {
  presenca: PresencaPublicaResponse | null = null;
  carregando = true;
  erro: string | null = null;
  semPermissao = false;
  siteConfig: SiteConfigResponse | null = null;
  siteConfigCarregando = false;
  siteConfigIndisponivel = false;

  constructor(
    private readonly service: PresencaPublicaService,
    private readonly siteConfigService: SiteConfigService,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.carregar();
    this.carregarStatusPublicacao();
  }

  get enderecoClickManager(): string {
    return this.urlClickManagerAtual || 'Endereço ainda não gerado';
  }

  get hostClickManagerAtual(): string {
    return getClickManagerPublicHost(this.presenca?.slugPublico) || '';
  }

  get urlClickManagerAtual(): string {
    return this.urlClickManagerParaSlug(this.presenca?.slugPublico);
  }

  get urlLocalAtual(): string {
    return this.urlLocalParaSlug(this.presenca?.slugPublico);
  }

  get mostrarAmbienteDesenvolvimento(): boolean {
    return !environment.production && !!this.urlLocalAtual;
  }

  get sitePublicado(): boolean {
    return this.siteConfig?.siteAtivo === true;
  }

  get siteNaoPublicado(): boolean {
    return this.siteConfig !== null && this.siteConfig.siteAtivo !== true;
  }

  get dominioPublico(): string {
    return String(environment.publicBaseDomain || '').trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '')
      .toLowerCase();
  }

  carregar(): void {
    this.carregando = true;
    this.erro = null;
    this.semPermissao = false;
    this.service.buscar().subscribe({
      next: (presenca) => {
        this.carregando = false;
        this.aplicarPresenca(presenca);
      },
      error: (err) => {
        this.carregando = false;
        this.semPermissao = err?.status === 403;
        this.erro = this.semPermissao ? null : (err?.userMessage || 'Erro ao carregar a presença pública.');
        if (!this.semPermissao) {
          this.toastr.error(this.erro || 'Erro ao carregar a presença pública.');
        }
      },
    });
  }

  carregarStatusPublicacao(): void {
    this.siteConfigCarregando = true;
    this.siteConfigIndisponivel = false;
    this.siteConfigService.buscar().subscribe({
      next: (config) => {
        this.siteConfig = config;
        this.siteConfigCarregando = false;
      },
      error: () => {
        this.siteConfig = null;
        this.siteConfigCarregando = false;
        this.siteConfigIndisponivel = true;
      },
    });
  }

  abrirAlteracaoEndereco(): void {
    if (!this.presenca || this.semPermissao) {
      return;
    }

    const data: AlterarEnderecoPublicoDialogData = {
      presenca: this.presenca,
      dominioPublico: this.dominioPublico,
      urlAtual: this.urlClickManagerAtual,
    };

    const ref = this.dialog.open(AlterarEnderecoPublicoDialogComponent, {
      width: '620px',
      maxWidth: 'calc(100vw - 32px)',
      data,
      autoFocus: false,
    });

    ref.afterClosed().subscribe((presenca: PresencaPublicaResponse | undefined) => {
      if (!presenca) {
        return;
      }
      this.aplicarPresenca(presenca);
      this.toastr.success('Endereço público alterado com sucesso.');
    });
  }

  abrirUrl(url: string): void {
    if (!url) return;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    opened?.opener && (opened.opener = null);
  }

  copiarUrl(url: string): void {
    const value = String(url || '').trim();
    if (!value) return;
    navigator.clipboard?.writeText(value)
      .then(() => this.toastr.success('Endereço copiado.'))
      .catch(() => this.toastr.warning('Não foi possível copiar o endereço.'));
  }

  private aplicarPresenca(presenca: PresencaPublicaResponse): void {
    this.presenca = presenca;
  }

  private urlClickManagerParaSlug(slug: string | null | undefined): string {
    const host = getClickManagerPublicHost(slug);
    return host ? `https://${host}` : '';
  }

  private urlLocalParaSlug(slug: string | null | undefined): string {
    const normalizedSlug = String(slug || '').trim();
    const baseUrl = String(environment.publicSiteBaseUrl || '').trim().replace(/\/+$/, '');
    return normalizedSlug && baseUrl ? `${baseUrl}/loja/${encodeURIComponent(normalizedSlug)}` : '';
  }
}
