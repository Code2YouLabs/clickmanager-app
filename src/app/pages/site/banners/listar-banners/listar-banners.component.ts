import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { PageEvent } from '@angular/material/paginator';
import { Router, RouterModule } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ToastrService } from 'ngx-toastr';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableItemDirective } from 'src/app/components/data-table/data-table-item.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableColumn, DataTablePagination, DataTableSearchConfig } from 'src/app/components/data-table/data-table.models';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { StatusBadgeComponent } from 'src/app/components/status-badge/status-badge.component';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { resolveStorageImageUrl } from 'src/app/pages/storage/utils/storage-media-url.util';
import { SiteBannerResponse } from '../../models/site-banner.models';
import { SiteBannerService } from '../../services/site-banner.service';

@Component({
  selector: 'app-listar-banners',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatRippleModule,
    RouterModule,
    TablerIconsModule,
    DataTableComponent,
    DataTableCellDirective,
    DataTableItemDirective,
    PageCardComponent,
    StatusBadgeComponent,
    TemPermissaoDirective,
  ],
  templateUrl: './listar-banners.component.html',
  styleUrl: './listar-banners.component.scss',
})
export class ListarBannersComponent implements OnInit {
  banners: SiteBannerResponse[] = [];
  totalBanners = 0;
  carregando = false;
  refreshing = false;
  erro: string | null = null;
  semPermissao = false;
  pagina = 0;
  tamanhoPagina = 10;
  termoPesquisa = '';
  bannerSelecionadoMenu: SiteBannerResponse | null = null;
  private requestSeq = 0;

  readonly columns: DataTableColumn<SiteBannerResponse>[] = [
    { key: 'imagem', label: 'Imagem', width: '132px' },
    { key: 'titulo', label: 'Título' },
    { key: 'ordem', label: 'Ordem', width: '96px', align: 'center' },
    { key: 'status', label: 'Status', width: '120px' },
    { key: 'vigencia', label: 'Vigência', width: '190px' },
    { key: 'acoes', label: 'Ações', width: '180px', align: 'end' },
  ];

  constructor(
    private readonly siteBannerService: SiteBannerService,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.carregarBanners();
  }

  get searchConfig(): DataTableSearchConfig {
    return {
      enabled: true,
      placeholder: 'Ex: promoção, lançamento, fachada',
      debounceMs: 400,
      value: this.termoPesquisa,
    };
  }

  get pagination(): DataTablePagination {
    return {
      pageIndex: this.pagina,
      pageSize: this.tamanhoPagina,
      totalItems: this.totalBanners,
      pageSizeOptions: [10, 20, 50],
    };
  }

  get filtered(): boolean {
    return this.termoPesquisa.trim().length > 0;
  }

  carregarBanners(preserveData = false): void {
    const requestId = ++this.requestSeq;
    this.erro = null;
    this.semPermissao = false;
    this.carregando = !preserveData;
    this.refreshing = preserveData;
    this.siteBannerService
      .listar({
        page: this.pagina,
        size: this.tamanhoPagina,
        sort: 'ordem,asc',
        textoPesquisa: this.termoPesquisa,
      })
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestSeq) {
            return;
          }
          if (Array.isArray(response)) {
            this.banners = response;
            this.totalBanners = response.length;
          } else {
            this.banners = response.content || [];
            this.totalBanners = response.totalElements || 0;
          }

          this.carregando = false;
          this.refreshing = false;
        },
        error: (err) => {
          if (requestId !== this.requestSeq) {
            return;
          }
          this.carregando = false;
          this.refreshing = false;
          this.semPermissao = err?.status === 403;
          this.erro = this.semPermissao ? null : (err?.userMessage || 'Não foi possível carregar os banners do site.');
        },
      });
  }

  onPaginaAlterada(event: PageEvent): void {
    this.pagina = event.pageIndex;
    this.tamanhoPagina = event.pageSize;
    this.carregarBanners(this.banners.length > 0);
  }

  onPesquisar(valor: string): void {
    this.termoPesquisa = valor || '';
    this.pagina = 0;
    this.carregarBanners();
  }

  tentarNovamente(): void {
    this.carregarBanners(this.banners.length > 0);
  }

  editar(banner: SiteBannerResponse): void {
    this.router.navigate(['/page/site/banners/editar', banner.id]);
  }

  alterarStatus(banner: SiteBannerResponse): void {
    const novoStatus = !banner.ativo;
    this.siteBannerService.alterarStatus(banner.id, novoStatus).subscribe({
      next: () => {
        this.toastr.success(novoStatus ? 'Banner ativado com sucesso!' : 'Banner desativado com sucesso!');
        this.carregarBanners();
      },
      error: () => {
        this.toastr.error('Não foi possível alterar o status do banner.');
      },
    });
  }

  excluir(banner: SiteBannerResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Excluir banner',
        message: `Tem certeza que deseja excluir o banner "${banner.titulo || 'sem título'}"?`,
        confirmText: 'Excluir',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }

      this.siteBannerService.excluir(banner.id).subscribe({
        next: () => {
          this.toastr.success('Banner excluído com sucesso!');
          this.carregarBanners();
        },
        error: () => {
          this.toastr.error('Erro ao excluir o banner.');
        },
      });
    });
  }

  mover(banner: SiteBannerResponse, direcao: -1 | 1): void {
    const index = this.banners.findIndex((item) => item.id === banner.id);
    const targetIndex = index + direcao;

    if (index < 0 || targetIndex < 0 || targetIndex >= this.banners.length) {
      return;
    }

    const novaLista = [...this.banners];
    [novaLista[index], novaLista[targetIndex]] = [novaLista[targetIndex], novaLista[index]];

    const payload = {
      banners: novaLista.map((item, idx) => ({
        id: item.id,
        ordem: idx + 1 + this.pagina * this.tamanhoPagina,
      })),
    };

    this.siteBannerService.reordenar(payload).subscribe({
      next: () => {
        this.toastr.success('Ordem dos banners atualizada.');
        this.carregarBanners();
      },
      error: () => {
        this.toastr.error('Não foi possível atualizar a ordem dos banners.');
      },
    });
  }

  navegarCriacao(): void {
    this.router.navigate(['/page/site/banners/novo']);
  }

  selecionarBannerMenu(banner: SiteBannerResponse, event: Event): void {
    event.stopPropagation();
    this.bannerSelecionadoMenu = banner;
  }

  trackByBanner(index: number, banner: SiteBannerResponse): number {
    return banner.id ?? index;
  }

  statusLabel(ativo: boolean): string {
    return ativo ? 'Ativo' : 'Inativo';
  }

  statusKey(ativo: boolean): string {
    return ativo ? 'ATIVO' : 'INATIVO';
  }

  bannerImagemUrl(banner: SiteBannerResponse): string {
    return resolveStorageImageUrl(banner, 'CARD', '');
  }

  vigenciaLabel(banner: SiteBannerResponse): string {
    const inicio = this.formatarData(banner.dataInicio);
    const fim = this.formatarData(banner.dataFim);

    if (inicio && fim) {
      return `${inicio} até ${fim}`;
    }

    if (inicio) {
      return `A partir de ${inicio}`;
    }

    if (fim) {
      return `Até ${fim}`;
    }

    return 'Sempre visível';
  }

  private formatarData(value?: string | null): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString('pt-BR');
  }
}
