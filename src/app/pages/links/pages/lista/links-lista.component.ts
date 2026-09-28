import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { take } from 'rxjs';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableItemDirective } from 'src/app/components/data-table/data-table-item.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableAction, DataTableActionEvent, DataTableColumn } from 'src/app/components/data-table/data-table.models';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { MaterialModule } from 'src/app/material.module';
import { PresencaPublicaResponse } from 'src/app/pages/config/presenca-publica/presenca-publica.models';
import { PresencaPublicaService } from 'src/app/pages/config/presenca-publica/presenca-publica.service';
import { AuthService } from 'src/app/services/auth.service';
import { EmpresaIdentidadePublicaService } from '../../../empresa/empresa-identidade-publica.service';
import { LinksShareDialogComponent } from '../../components/share-dialog/links-share-dialog.component';
import { LINKS_PERMISSOES, LinksIdentidadePublica, PaginaLinksDetalhe, PaginaLinksResumo } from '../../models/links.models';
import { LinksService } from '../../services/links.service';
import { buildClickLinkPublicUrl } from '../../utils/links-url.util';

@Component({
  selector: 'app-links-lista',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    PageCardComponent,
    DataTableComponent,
    DataTableCellDirective,
    DataTableItemDirective,
  ],
  templateUrl: './links-lista.component.html',
  styleUrls: ['../../links.scss', './links-lista.component.scss'],
})
export class LinksListaComponent implements OnInit {
  paginas: PaginaLinksResumo[] = [];
  identidade: LinksIdentidadePublica | null = null;
  presenca: PresencaPublicaResponse | null = null;
  empresaId: number | null = null;
  carregando = false;
  erro: string | null = null;
  semPermissao = false;
  executandoId: number | null = null;
  readonly permissoes = LINKS_PERMISSOES;
  private requisicaoAtual = 0;

  readonly colunas: DataTableColumn<PaginaLinksResumo>[] = [
    { key: 'titulo', label: 'Título' },
    { key: 'endereco', label: 'Endereço' },
    { key: 'status', label: 'Status', width: '132px' },
    { key: 'principal', label: 'Principal', width: '128px' },
    { key: 'links', label: 'Links', width: '90px', align: 'center', value: (pagina) => pagina.quantidadeItens },
  ];
  readonly emptyState = {
    title: 'Crie sua página de links',
    description: 'Reúna suas redes, contatos e canais em um único endereço.',
  };

  constructor(
    private readonly linksService: LinksService,
    private readonly identidadeService: EmpresaIdentidadePublicaService,
    private readonly presencaService: PresencaPublicaService,
    private readonly authService: AuthService,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (!this.podeVer) {
      this.semPermissao = true;
      return;
    }
    this.authService.usuario$
      .pipe(take(1))
      .subscribe((usuario) => {
        this.empresaId = usuario?.empresa?.id || null;
      });
    this.carregar();
  }

  carregar(): void {
    const requisicao = ++this.requisicaoAtual;
    this.carregando = true;
    this.erro = null;
    this.semPermissao = false;
    this.linksService.listarPaginas().subscribe({
      next: (paginas) => {
        if (requisicao !== this.requisicaoAtual) return;
        this.paginas = (paginas || []).filter((pagina) => pagina.ativa);
        this.carregando = false;
        this.carregarIdentidade();
      },
      error: (error) => {
        if (requisicao !== this.requisicaoAtual) return;
        this.tratarErroCarregamento(error, 'Não foi possível carregar suas páginas ClickLink.');
      },
    });
  }

  get podeVer(): boolean {
    return this.authService.temPermissao(this.permissoes.ver);
  }

  get carregandoInicial(): boolean {
    return this.carregando && !this.paginas.length;
  }

  get atualizando(): boolean {
    return this.carregando && !!this.paginas.length;
  }

  get acoesTabela(): DataTableAction<PaginaLinksResumo>[] {
    return [
      {
        id: 'editar',
        label: 'Editar',
        icon: 'edit',
        visible: () => this.authService.temPermissao(this.permissoes.editar),
        disabled: (pagina) => this.executandoId === pagina.id,
      },
      {
        id: 'compartilhar',
        label: 'Compartilhar',
        icon: 'ios_share',
        disabled: (pagina) => this.executandoId === pagina.id || !this.urlPublica(pagina),
      },
      {
        id: 'abrir',
        label: 'Abrir',
        icon: 'open_in_new',
        disabled: (pagina) => this.executandoId === pagina.id || !pagina.publicada || !this.urlPublica(pagina),
      },
      {
        id: 'publicar',
        label: 'Publicar',
        icon: 'publish',
        visible: (pagina) => !pagina.publicada && this.authService.temPermissao(this.permissoes.publicar),
        disabled: (pagina) => this.executandoId === pagina.id || !this.urlPublica(pagina),
      },
      {
        id: 'principal',
        label: 'Tornar principal',
        icon: 'star',
        visible: (pagina) => pagina.publicada && !pagina.principal && this.authService.temPermissao(this.permissoes.publicar),
        disabled: (pagina) => this.executandoId === pagina.id || !pagina.publicada,
      },
      {
        id: 'despublicar',
        label: 'Despublicar',
        icon: 'visibility_off',
        visible: (pagina) => pagina.publicada && this.authService.temPermissao(this.permissoes.publicar),
        disabled: (pagina) => this.executandoId === pagina.id,
      },
      {
        id: 'excluir',
        label: 'Excluir',
        icon: 'delete',
        color: 'warn',
        visible: () => this.authService.temPermissao(this.permissoes.excluir),
        disabled: (pagina) => this.executandoId === pagina.id,
      },
    ];
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
    if (this.executandoId === pagina.id) return;
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
    if (this.executandoId === pagina.id) return;
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
    if (this.executandoId === pagina.id) return;
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
      if (this.executandoId === pagina.id) return;
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

  onTableAction(event: DataTableActionEvent<PaginaLinksResumo>): void {
    const pagina = event.row;
    if (event.action === 'editar') this.editar(pagina);
    if (event.action === 'compartilhar') this.compartilhar(pagina);
    if (event.action === 'abrir') this.abrir(pagina);
    if (event.action === 'publicar') this.publicar(pagina, true);
    if (event.action === 'principal') this.tornarPrincipal(pagina);
    if (event.action === 'despublicar') this.publicar(pagina, false);
    if (event.action === 'excluir') this.excluir(pagina);
  }

  urlPublica(pagina?: PaginaLinksResumo): string {
    return buildClickLinkPublicUrl(
      this.identidade?.slug,
      pagina?.slug,
      pagina?.principal ?? true,
      this.presenca?.dominioProprio,
      this.presenca?.dominioProprioAtivo === true,
      this.empresaId
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
      },
      error: () => {
        this.presenca = null;
      },
    });
  }

  private carregarIdentidadePorDetalhe(): void {
    const primeiraPagina = this.paginas[0];
    if (!primeiraPagina) {
      this.identidade = null;
      return;
    }
    this.linksService.buscarPagina(primeiraPagina.id).subscribe({
      next: (pagina) => {
        this.identidade = pagina.identidade;
        this.carregarPresenca();
      },
      error: () => {
        this.identidade = null;
      },
    });
  }

  private atualizarResumo(detalhe: PaginaLinksDetalhe): void {
    this.paginas = this.paginas.map((item) =>
      item.id === detalhe.id ? { ...item, ...detalhe, quantidadeItens: detalhe.itens?.length ?? item.quantidadeItens } : item
    );
  }

  private tratarErro(error: HttpErrorResponse, fallback: string): void {
    this.executandoId = null;
    if (error.status === 403) {
      this.toastr.warning('Você não possui permissão para esta ação.');
      return;
    }
    this.toastr.error(error.error?.message || fallback);
  }

  private tratarErroCarregamento(error: HttpErrorResponse, fallback: string): void {
    this.carregando = false;
    this.executandoId = null;
    if (error.status === 403) {
      this.semPermissao = true;
      this.erro = null;
      return;
    }
    this.erro = error.error?.message || fallback;
  }
}
