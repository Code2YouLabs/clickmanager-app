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
import { AuthService } from 'src/app/services/auth.service';
import { EmpresaIdentidadePublicaService } from '../../../empresa/empresa-identidade-publica.service';
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
  identidade: LinksIdentidadePublica | null = null;
  carregando = true;
  executandoId: number | null = null;
  readonly permissoes = LINKS_PERMISSOES;

  constructor(
    private readonly linksService: LinksService,
    private readonly identidadeService: EmpresaIdentidadePublicaService,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog,
    private readonly router: Router,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.linksService.listarPaginas().subscribe({
      next: (paginas) => {
        this.paginas = paginas || [];
        this.carregarIdentidade();
      },
      error: (error) => this.tratarErro(error, 'Não foi possível carregar suas páginas ClickLink.'),
    });
  }

  criar(): void {
    this.router.navigate(['/page/links/nova']);
  }

  editar(pagina: PaginaLinksResumo): void {
    this.router.navigate(['/page/links', pagina.id]);
  }

  publicar(pagina: PaginaLinksResumo, publicada: boolean): void {
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

  arquivar(pagina: PaginaLinksResumo): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Arquivar página',
        message: `Arquivar "${pagina.titulo}"? Ela deixará de aparecer no ClickLink público.`,
        confirmText: 'Arquivar',
        confirmColor: 'warn',
      },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.executandoId = pagina.id;
      this.linksService.arquivarPagina(pagina.id).subscribe({
        next: () => {
          this.executandoId = null;
          this.toastr.success('Página arquivada.');
          this.paginas = this.paginas.filter((item) => item.id !== pagina.id);
        },
        error: (error) => this.tratarErro(error, 'Não foi possível arquivar a página.'),
      });
    });
  }

  abrir(pagina: PaginaLinksResumo): void {
    const url = this.urlPublica(pagina);
    if (!url || !pagina.publicada) {
      this.toastr.info('Publique a página e defina um endereço público antes de abrir.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  urlPublica(_pagina?: PaginaLinksResumo): string {
    return buildClickLinkPublicUrl(this.identidade?.slug);
  }

  podeCriar(): boolean {
    return this.authService.temPermissao(this.permissoes.criar);
  }

  private carregarIdentidade(): void {
    this.identidadeService.buscar().subscribe({
      next: (identidade) => {
        this.identidade = identidade;
        this.carregando = false;
      },
      error: () => {
        this.carregarIdentidadePorDetalhe();
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
        this.carregando = false;
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
