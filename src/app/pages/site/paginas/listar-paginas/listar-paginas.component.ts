import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableItemDirective } from 'src/app/components/data-table/data-table-item.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import {
  DataTableAction,
  DataTableActionEvent,
  DataTableColumn,
  DataTablePagination,
  DataTableSearchConfig,
} from 'src/app/components/data-table/data-table.models';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { StatusBadgeComponent } from 'src/app/components/status-badge/status-badge.component';
import { MaterialModule } from 'src/app/material.module';
import { AuthService } from 'src/app/services/auth.service';
import { SitePaginaCodigo, SitePaginaResponse, SitePaginaTipo } from '../../models/site-pagina.models';
import { SitePaginaService } from '../../services/site-pagina.service';

@Component({
  selector: 'app-listar-paginas',
  standalone: true,
  imports: [
    DataTableCellDirective,
    DataTableComponent,
    DataTableItemDirective,
    MaterialModule,
    PageCardComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './listar-paginas.component.html',
  styleUrl: './listar-paginas.component.scss',
})
export class ListarPaginasComponent implements OnInit, OnDestroy {
  paginas: SitePaginaResponse[] = [];
  totalPaginas = 0;
  carregando = false;
  erro: string | null = null;
  semPermissao = false;
  pagina = 0;
  tamanhoPagina = 10;
  termoPesquisa = '';

  readonly colunas: DataTableColumn<SitePaginaResponse>[] = [
    { key: 'titulo', label: 'Título', width: '22%' },
    { key: 'tipo', label: 'Tipo', width: '120px' },
    { key: 'slug', label: 'Slug/Rota', width: '140px' },
    { key: 'ativa', label: 'Ativa', width: '110px' },
    { key: 'menu', label: 'Menu', width: '110px' },
    { key: 'home', label: 'Home', width: '110px' },
    { key: 'ordemMenu', label: 'Ordem menu', width: '120px', align: 'center' },
    { key: 'ordemHome', label: 'Ordem Home', width: '120px', align: 'center' },
  ];

  readonly acoes: DataTableAction<SitePaginaResponse>[] = [
    {
      id: 'menu-up',
      label: 'Subir no menu',
      icon: 'keyboard_double_arrow_up',
      visible: (pagina) => this.authService.temPermissao('SITE_PAGINAS_EDITAR') && pagina.exibirNoMenu,
      disabled: (pagina) => !this.podeMoverMenu(pagina, -1),
    },
    {
      id: 'menu-down',
      label: 'Descer no menu',
      icon: 'keyboard_double_arrow_down',
      visible: (pagina) => this.authService.temPermissao('SITE_PAGINAS_EDITAR') && pagina.exibirNoMenu,
      disabled: (pagina) => !this.podeMoverMenu(pagina, 1),
    },
    {
      id: 'home-up',
      label: 'Subir na Home',
      icon: 'vertical_align_top',
      visible: (pagina) => this.authService.temPermissao('SITE_PAGINAS_EDITAR') && pagina.exibirNaHome,
      disabled: (pagina) => !this.podeMoverHome(pagina, -1),
    },
    {
      id: 'home-down',
      label: 'Descer na Home',
      icon: 'vertical_align_bottom',
      visible: (pagina) => this.authService.temPermissao('SITE_PAGINAS_EDITAR') && pagina.exibirNaHome,
      disabled: (pagina) => !this.podeMoverHome(pagina, 1),
    },
    { id: 'editar', label: 'Editar página', icon: 'edit', visible: () => this.authService.temPermissao('SITE_PAGINAS_EDITAR') },
    {
      id: 'status',
      label: 'Ativar/desativar',
      icon: 'toggle_on',
      visible: () => this.authService.temPermissao('SITE_PAGINAS_EDITAR'),
      disabled: (pagina) => this.isHome(pagina),
    },
    { id: 'menu', label: 'Mostrar/ocultar no menu', icon: 'menu', visible: () => this.authService.temPermissao('SITE_PAGINAS_EDITAR') },
    { id: 'home', label: 'Mostrar/ocultar na Home', icon: 'home', visible: () => this.authService.temPermissao('SITE_PAGINAS_EDITAR') },
    {
      id: 'excluir',
      label: 'Excluir página',
      icon: 'delete',
      color: 'warn',
      visible: (pagina) => this.authService.temPermissao('SITE_PAGINAS_EXCLUIR') && this.podeExcluir(pagina),
    },
  ];

  private consulta?: Subscription;
  private requestSeq = 0;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly sitePaginaService: SitePaginaService,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.carregarPaginas();
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get searchConfig(): DataTableSearchConfig {
    return {
      enabled: true,
      placeholder: 'Ex: home, contato, produtos',
      debounceMs: 300,
      value: this.termoPesquisa,
    };
  }

  get pagination(): DataTablePagination {
    return {
      pageIndex: this.pagina,
      pageSize: this.tamanhoPagina,
      totalItems: this.totalPaginas,
      pageSizeOptions: [10, 20, 50],
    };
  }

  get buscando(): boolean {
    return !!this.termoPesquisa.trim();
  }

  carregarPaginas(preservarDados = false): void {
    this.consulta?.unsubscribe();
    const requestId = ++this.requestSeq;
    this.carregando = true;
    this.erro = null;
    this.semPermissao = false;

    if (!preservarDados) {
      this.paginas = [];
    }

    this.consulta = this.sitePaginaService
      .listar({
        page: this.pagina,
        size: this.tamanhoPagina,
        sort: 'ordemMenu,asc',
        textoPesquisa: this.termoPesquisa,
      })
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestSeq) {
            return;
          }

          if (Array.isArray(response)) {
            this.paginas = response;
            this.totalPaginas = response.length;
          } else {
            this.paginas = response.content || [];
            this.totalPaginas = response.totalElements || 0;
          }

          this.carregando = false;
        },
        error: (err) => {
          if (requestId !== this.requestSeq) {
            return;
          }

          this.carregando = false;
          this.semPermissao = err?.status === 403;
          this.erro = this.semPermissao ? null : 'Não foi possível carregar as páginas do site.';
        },
      });
  }

  onPaginaAlterada(event: PageEvent): void {
    this.pagina = event.pageIndex;
    this.tamanhoPagina = event.pageSize;
    this.carregarPaginas(!!this.paginas.length);
  }

  onPesquisar(valor: string): void {
    this.termoPesquisa = valor || '';
    this.pagina = 0;
    this.carregarPaginas(!!this.paginas.length);
  }

  onAcao(event: DataTableActionEvent<SitePaginaResponse>): void {
    const pagina = event.row;
    switch (event.action) {
      case 'menu-up':
        this.moverMenu(pagina, -1);
        break;
      case 'menu-down':
        this.moverMenu(pagina, 1);
        break;
      case 'home-up':
        this.moverHome(pagina, -1);
        break;
      case 'home-down':
        this.moverHome(pagina, 1);
        break;
      case 'editar':
        this.editar(pagina);
        break;
      case 'status':
        this.alterarStatus(pagina);
        break;
      case 'menu':
        this.alterarMenu(pagina);
        break;
      case 'home':
        this.alterarHome(pagina);
        break;
      case 'excluir':
        this.excluir(pagina);
        break;
    }
  }

  editar(pagina: SitePaginaResponse): void {
    this.router.navigate(['/page/site/paginas/editar', pagina.id]);
  }

  alterarStatus(pagina: SitePaginaResponse): void {
    if (this.isHome(pagina)) {
      this.toastr.warning('A página HOME deve permanecer ativa.');
      return;
    }

    const novoStatus = !pagina.ativa;
    this.sitePaginaService.alterarStatus(pagina.id, novoStatus).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastr.success(novoStatus ? 'Página ativada com sucesso!' : 'Página desativada com sucesso!');
        this.carregarPaginas(true);
      },
      error: () => this.toastr.error('Não foi possível alterar o status da página.'),
    });
  }

  alterarMenu(pagina: SitePaginaResponse): void {
    this.sitePaginaService
      .alterarMenu(pagina.id, {
        exibirNoMenu: !pagina.exibirNoMenu,
        ordemMenu: pagina.ordemMenu,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(!pagina.exibirNoMenu ? 'Página exibida no menu.' : 'Página ocultada do menu.');
          this.carregarPaginas(true);
        },
        error: () => this.toastr.error('Não foi possível alterar a exibição no menu.'),
      });
  }

  alterarHome(pagina: SitePaginaResponse): void {
    this.sitePaginaService
      .alterarHome(pagina.id, {
        exibirNaHome: !pagina.exibirNaHome,
        ordemHome: pagina.ordemHome,
        tituloHome: pagina.tituloHome,
        subtituloHome: pagina.subtituloHome,
        limiteItensHome: pagina.limiteItensHome ?? 6,
        layoutHome: pagina.layoutHome || 'GRID',
        textoBotaoHome: pagina.textoBotaoHome,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(!pagina.exibirNaHome ? 'Página exibida na Home.' : 'Página ocultada da Home.');
          this.carregarPaginas(true);
        },
        error: () => this.toastr.error('Não foi possível alterar a exibição na Home.'),
      });
  }

  excluir(pagina: SitePaginaResponse): void {
    if (!this.podeExcluir(pagina)) {
      this.toastr.warning('Páginas de sistema não podem ser excluídas.');
      return;
    }

    this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Excluir página',
        message: `Tem certeza que deseja excluir a página "${pagina.titulo || 'sem título'}"?`,
        confirmText: 'Excluir',
        confirmColor: 'warn',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (!result) {
        return;
      }

      this.sitePaginaService.excluir(pagina.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toastr.success('Página excluída com sucesso!');
          this.carregarPaginas(true);
        },
        error: () => this.toastr.error('Erro ao excluir a página.'),
      });
    });
  }

  moverMenu(pagina: SitePaginaResponse, direcao: -1 | 1): void {
    this.mover(pagina, direcao, 'menu');
  }

  moverHome(pagina: SitePaginaResponse, direcao: -1 | 1): void {
    this.mover(pagina, direcao, 'home');
  }

  navegarCriacao(): void {
    this.router.navigate(['/page/site/paginas/nova']);
  }

  tipoLabel(tipo: SitePaginaTipo): string {
    const labels: Record<SitePaginaTipo, string> = {
      SISTEMA: 'Sistema',
      PERSONALIZADA: 'Personalizada',
    };

    return labels[tipo] || tipo;
  }

  codigoLabel(codigo?: SitePaginaCodigo | null): string {
    if (!codigo) {
      return '';
    }

    const labels: Record<SitePaginaCodigo, string> = {
      HOME: 'Home',
      PRODUTOS: 'Produtos',
      CATEGORIAS: 'Categorias',
      MARCAS: 'Marcas',
      QUEM_SOMOS: 'Quem somos',
      CONTATO: 'Contato',
      ORCAMENTO: 'Orçamento',
    };

    return labels[codigo] || codigo;
  }

  rotaLabel(pagina: SitePaginaResponse): string {
    if (this.isHome(pagina)) {
      return '/';
    }

    const slug = String(pagina.slug || '').trim();
    return slug ? `/${slug.replace(/^\/+/, '')}` : '-';
  }

  statusKey(ativa: boolean): 'ATIVO' | 'INATIVO' {
    return ativa ? 'ATIVO' : 'INATIVO';
  }

  efeitoLabel(pagina: SitePaginaResponse, campo: 'menu' | 'home'): string {
    const habilitado = campo === 'menu' ? pagina.exibirNoMenu : pagina.exibirNaHome;
    if (!habilitado) {
      return 'Não';
    }

    return pagina.ativa ? 'Sim' : 'Sem efeito';
  }

  isHome(pagina?: SitePaginaResponse | null): boolean {
    return pagina?.codigo === 'HOME';
  }

  podeExcluir(pagina?: SitePaginaResponse | null): boolean {
    return pagina?.tipo === 'PERSONALIZADA' && !pagina.paginaSistema;
  }

  podeMoverMenu(pagina: SitePaginaResponse, direcao: -1 | 1): boolean {
    const paginasMenu = this.paginasComMenu();
    const posicao = paginasMenu.findIndex((item) => item.id === pagina.id);
    return posicao >= 0 && posicao + direcao >= 0 && posicao + direcao < paginasMenu.length;
  }

  podeMoverHome(pagina: SitePaginaResponse, direcao: -1 | 1): boolean {
    const paginasHome = this.paginasComHome();
    const posicao = paginasHome.findIndex((item) => item.id === pagina.id);
    return posicao >= 0 && posicao + direcao >= 0 && posicao + direcao < paginasHome.length;
  }

  private mover(pagina: SitePaginaResponse, direcao: -1 | 1, tipo: 'menu' | 'home'): void {
    const lista = tipo === 'menu' ? this.paginasComMenu() : this.paginasComHome();
    const index = lista.findIndex((item) => item.id === pagina.id);
    const targetIndex = index + direcao;

    if (index < 0 || targetIndex < 0 || targetIndex >= lista.length) {
      return;
    }

    const novaLista = [...lista];
    [novaLista[index], novaLista[targetIndex]] = [novaLista[targetIndex], novaLista[index]];

    const request$ =
      tipo === 'menu'
        ? this.sitePaginaService.reordenarMenu({
            paginas: novaLista.map((item, idx) => ({ id: item.id, ordemMenu: idx + 1 })),
          })
        : this.sitePaginaService.reordenarHome({
            paginas: novaLista.map((item, idx) => ({ id: item.id, ordemHome: idx + 1 })),
          });

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastr.success(tipo === 'menu' ? 'Ordem do menu atualizada.' : 'Ordem da Home atualizada.');
        this.carregarPaginas(true);
      },
      error: () => {
        this.toastr.error(tipo === 'menu' ? 'Não foi possível atualizar a ordem do menu.' : 'Não foi possível atualizar a ordem da Home.');
      },
    });
  }

  private paginasComMenu(): SitePaginaResponse[] {
    return this.paginas
      .filter((pagina) => pagina.exibirNoMenu)
      .sort((a, b) => Number(a.ordemMenu || 0) - Number(b.ordemMenu || 0));
  }

  private paginasComHome(): SitePaginaResponse[] {
    return this.paginas
      .filter((pagina) => pagina.exibirNaHome)
      .sort((a, b) => Number(a.ordemHome || 0) - Number(b.ordemHome || 0));
  }
}
