import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CardHeaderComponent } from 'src/app/components/card-header/card-header.component';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { MaterialModule } from 'src/app/material.module';
import { PresencaPublicaResponse } from 'src/app/pages/config/presenca-publica/presenca-publica.models';
import { PresencaPublicaService } from 'src/app/pages/config/presenca-publica/presenca-publica.service';
import { EmpresaIdentidadePublicaService } from '../../../empresa/empresa-identidade-publica.service';
import { LinksShareDialogComponent } from '../../components/share-dialog/links-share-dialog.component';
import { LINKS_PERMISSOES, LinksIdentidadePublica, PaginaLinksDetalhe, PaginaLinksResumo } from '../../models/links.models';
import { LinksService } from '../../services/links.service';
import { buildClickLinkPublicUrl } from '../../utils/links-url.util';

@Component({
  selector: 'app-links-lista',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, CardHeaderComponent, TemPermissaoDirective],
  templateUrl: './links-lista.component.html',
  styleUrls: ['../../links.scss', './links-lista.component.scss'],
})
export class LinksListaComponent implements OnInit {
  paginas: PaginaLinksResumo[] = [];
  paginaMenu: PaginaLinksResumo | null = null;
  identidade: LinksIdentidadePublica | null = null;
  presenca: PresencaPublicaResponse | null = null;
  carregando = true;
  executandoId: number | null = null;
  readonly permissoes = LINKS_PERMISSOES;
  readonly colunasExibidas = ['titulo', 'endereco', 'status', 'principal', 'links', 'acoes'];

  constructor(
    private readonly linksService: LinksService,
    private readonly identidadeService: EmpresaIdentidadePublicaService,
    private readonly presencaService: PresencaPublicaService,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.linksService.listarPaginas().subscribe({
      next: (paginas) => {
        this.paginas = (paginas || []).filter((pagina) => pagina.ativa);
        this.carregarIdentidade();
      },
      error: (error) => this.tratarErro(error, 'Não foi possível carregar suas páginas ClickLink.'),
    });
  }

  criar(): void {
    this.router.navigate(['/page/links/nova']);
  }

  editar(pagina: PaginaLinksResumo | null): void {
    if (!pagina) return;
    this.router.navigate(['/page/links', pagina.id]);
  }

  publicar(pagina: PaginaLinksResumo | null, publicada: boolean): void {
    if (!pagina) return;
    if (publicada && !this.identidade?.slug) {
      this.toastr.warning('Defina primeiro um endereço público para publicar sua página.');
      return;
    }
    this.executandoId = pagina.id;
    this.linksService.alterarPublicacao(pagina.id, publicada).subscribe({
      next: (detalhe) => {
        this.executandoId = null;
        this.toastr.success(publicada ? 'Página publicada.' : 'Página despublicada.');
        this.atualizarResumo(detalhe);
      },
      error: (error) => this.tratarErro(error, 'Não foi possível alterar a publicação.'),
    });
  }

  tornarPrincipal(pagina: PaginaLinksResumo | null): void {
    if (!pagina) return;
    if (!pagina.publicada) {
      this.toastr.info('Publique a página antes de torná-la principal.');
      return;
    }
    this.executandoId = pagina.id;
    this.linksService.tornarPrincipal(pagina.id).subscribe({
      next: (detalhe) => {
        this.executandoId = null;
        this.toastr.success('Página definida como principal.');
        this.paginas = this.paginas.map((item) => ({
          ...item,
          principal: item.id === detalhe.id,
        }));
        this.atualizarResumo(detalhe);
      },
      error: (error) => this.tratarErro(error, 'Não foi possível tornar a página principal.'),
    });
  }

  abrir(pagina: PaginaLinksResumo | null): void {
    if (!pagina) return;
    const url = this.urlPublica(pagina);
    if (!url || !pagina.publicada) {
      this.toastr.info('Publique a página e defina um endereço público antes de abrir.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  compartilhar(pagina: PaginaLinksResumo | null): void {
    if (!pagina) return;
    const url = this.urlPublica(pagina);
    if (!url) {
      this.toastr.info('Configure os dados da empresa antes de compartilhar.');
      return;
    }
    this.dialog.open(LinksShareDialogComponent, {
      width: window.innerWidth <= 640 ? '100vw' : '520px',
      maxWidth: window.innerWidth <= 640 ? '100vw' : '90vw',
      data: {
        titulo: pagina.titulo,
        url,
        slug: this.identidade?.slug || '',
      },
    });
  }

  excluir(pagina: PaginaLinksResumo | null): void {
    if (!pagina) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Excluir página?',
        message: 'A página, seus links e seus dados de analytics serão removidos definitivamente.',
        confirmText: 'Excluir página',
        confirmColor: 'warn',
      },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.executandoId = pagina.id;
      this.linksService.excluirPagina(pagina.id).subscribe({
        next: () => {
          this.executandoId = null;
          this.paginas = this.paginas.filter((item) => item.id !== pagina.id);
          this.toastr.success('Página excluída.');
        },
        error: (error) => this.tratarErro(error, 'Não foi possível excluir a página.'),
      });
    });
  }

  urlPublica(pagina?: PaginaLinksResumo): string {
    return buildClickLinkPublicUrl(
      this.identidade?.slug,
      pagina?.slug,
      pagina?.principal ?? true,
      this.presenca?.dominioProprio,
      this.presenca?.dominioProprioAtivo === true
    );
  }

  statusLabel(pagina: PaginaLinksResumo): string {
    return pagina.publicada ? 'Publicada' : 'Não publicada';
  }

  statusClasse(pagina: PaginaLinksResumo): string {
    return pagina.publicada ? 'links-badge--success' : 'links-badge--warning';
  }

  private carregarIdentidade(): void {
    this.identidadeService.buscar().subscribe({
      next: (identidade) => {
        this.identidade = identidade;
        this.carregarPresenca();
      },
      error: () => {
        this.carregarIdentidadePorDetalhe();
      },
    });
  }

  private carregarPresenca(): void {
    this.presencaService.buscar().subscribe({
      next: (presenca) => {
        this.presenca = presenca;
        this.carregando = false;
      },
      error: () => {
        this.presenca = null;
        this.carregando = false;
      },
    });
  }

  private carregarIdentidadePorDetalhe(): void {
    const primeiraPagina = this.paginas[0];
    if (!primeiraPagina) {
      this.identidade = null;
      this.carregando = false;
      return;
    }
    this.linksService.buscarPagina(primeiraPagina.id).subscribe({
      next: (pagina) => {
        this.identidade = pagina.identidade;
        this.carregarPresenca();
      },
      error: () => {
        this.identidade = null;
        this.carregando = false;
      },
    });
  }

  private atualizarResumo(detalhe: PaginaLinksDetalhe): void {
    this.paginas = this.paginas.map((item) =>
      item.id === detalhe.id ? { ...item, ...detalhe, quantidadeItens: detalhe.itens?.length ?? item.quantidadeItens } : item
    );
  }

  private tratarErro(error: HttpErrorResponse, fallback: string): void {
    this.carregando = false;
    this.executandoId = null;
    if (error.status === 403) {
      this.toastr.warning('Você não possui permissão para esta ação.');
      return;
    }
    this.toastr.error(error.error?.message || fallback);
  }
}
