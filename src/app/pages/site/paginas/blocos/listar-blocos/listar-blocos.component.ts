import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';
import { DataTableAction, DataTableActionEvent, DataTableColumn } from 'src/app/components/data-table/data-table.models';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableItemDirective } from 'src/app/components/data-table/data-table-item.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { StatusBadgeComponent } from 'src/app/components/status-badge/status-badge.component';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { MaterialModule } from 'src/app/material.module';
import { AuthService } from 'src/app/services/auth.service';
import { SitePaginaBlocoResponse, SitePaginaBlocoTipo } from 'src/app/pages/site/models/site-pagina-bloco.models';
import { SitePaginaBlocoService } from 'src/app/pages/site/services/site-pagina-bloco.service';
import { BlocoPreviewComponent } from '../bloco-preview/bloco-preview.component';
import { FormBlocoComponent } from '../form-bloco/form-bloco.component';

@Component({
  selector: 'app-listar-blocos',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    SectionCardComponent,
    TemPermissaoDirective,
    BlocoPreviewComponent,
    DataTableCellDirective,
    DataTableComponent,
    DataTableItemDirective,
    StatusBadgeComponent,
  ],
  templateUrl: './listar-blocos.component.html',
  styleUrl: './listar-blocos.component.scss',
})
export class ListarBlocosComponent implements OnChanges, OnDestroy {
  @Input() paginaId!: number;

  blocos: SitePaginaBlocoResponse[] = [];
  carregando = false;
  erro: string | null = null;
  semPermissao = false;

  readonly colunas: DataTableColumn<SitePaginaBlocoResponse>[] = [
    { key: 'ordem', label: 'Ordem', width: '96px', align: 'center' },
    { key: 'preview', label: 'Bloco' },
    { key: 'status', label: 'Status', width: '120px' },
  ];

  readonly acoes: DataTableAction<SitePaginaBlocoResponse>[] = [
    {
      id: 'subir',
      label: 'Subir bloco',
      icon: 'keyboard_arrow_up',
      visible: () => this.authService.temPermissao('SITE_PAGINA_BLOCOS_EDITAR'),
      disabled: (bloco) => !this.podeMover(bloco, -1),
    },
    {
      id: 'descer',
      label: 'Descer bloco',
      icon: 'keyboard_arrow_down',
      visible: () => this.authService.temPermissao('SITE_PAGINA_BLOCOS_EDITAR'),
      disabled: (bloco) => !this.podeMover(bloco, 1),
    },
    { id: 'editar', label: 'Editar bloco', icon: 'edit', visible: () => this.authService.temPermissao('SITE_PAGINA_BLOCOS_EDITAR') },
    { id: 'status', label: 'Ativar/desativar', icon: 'toggle_on', visible: () => this.authService.temPermissao('SITE_PAGINA_BLOCOS_EDITAR') },
    {
      id: 'excluir',
      label: 'Excluir bloco',
      icon: 'delete',
      color: 'warn',
      visible: () => this.authService.temPermissao('SITE_PAGINA_BLOCOS_EXCLUIR'),
    },
  ];

  private requestSeq = 0;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly blocoService: SitePaginaBlocoService,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService,
    private readonly authService: AuthService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['paginaId'] && this.paginaId && this.podeVerBlocos) {
      this.carregarBlocos();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get podeVerBlocos(): boolean {
    return this.authService.temPermissao('SITE_PAGINA_BLOCOS_VER');
  }

  get proximaOrdem(): number {
    const maiorOrdem = this.blocos.reduce((maior, bloco) => Math.max(maior, Number(bloco.ordem || 0)), 0);
    return maiorOrdem + 1 || 1;
  }

  carregarBlocos(mensagemSucesso?: string): void {
    const requestId = ++this.requestSeq;
    this.carregando = true;
    this.erro = null;
    this.semPermissao = false;

    this.blocoService.listar(this.paginaId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blocos) => {
        if (requestId !== this.requestSeq) {
          return;
        }

        this.blocos = [...(blocos || [])].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
        this.carregando = false;
        if (mensagemSucesso) {
          this.toastr.success(mensagemSucesso);
        }
      },
      error: (err) => {
        if (requestId !== this.requestSeq) {
          return;
        }

        this.carregando = false;
        this.semPermissao = err?.status === 403;
        this.erro = this.semPermissao ? null : 'Não foi possível carregar os blocos da página.';
      },
    });
  }

  adicionar(): void {
    this.abrirDialog();
  }

  onAcao(event: DataTableActionEvent<SitePaginaBlocoResponse>): void {
    switch (event.action) {
      case 'subir':
        this.mover(event.row, -1);
        break;
      case 'descer':
        this.mover(event.row, 1);
        break;
      case 'editar':
        this.editar(event.row);
        break;
      case 'status':
        this.alterarStatus(event.row);
        break;
      case 'excluir':
        this.excluir(event.row);
        break;
    }
  }

  editar(bloco: SitePaginaBlocoResponse): void {
    this.blocoService.buscarPorId(this.paginaId, bloco.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (detalhe) => this.abrirDialog(detalhe),
      error: () => this.toastr.error('Não foi possível carregar o bloco.'),
    });
  }

  alterarStatus(bloco: SitePaginaBlocoResponse): void {
    const novoStatus = !bloco.ativo;
    this.blocoService.alterarStatus(this.paginaId, bloco.id, novoStatus).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastr.success(novoStatus ? 'Bloco ativado com sucesso!' : 'Bloco desativado com sucesso!');
        this.carregarBlocos();
      },
      error: () => this.toastr.error('Não foi possível alterar o status do bloco.'),
    });
  }

  excluir(bloco: SitePaginaBlocoResponse): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Excluir bloco',
        message: `Tem certeza que deseja excluir o bloco "${bloco.titulo || this.labelTipo(bloco.tipo)}"?`,
        confirmText: 'Excluir',
        confirmColor: 'warn',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (!result) {
        return;
      }

      this.blocoService.excluir(this.paginaId, bloco.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toastr.success('Bloco excluído com sucesso!');
          this.carregarBlocos();
        },
        error: () => this.toastr.error('Erro ao excluir o bloco.'),
      });
    });
  }

  mover(bloco: SitePaginaBlocoResponse, direcao: -1 | 1): void {
    const index = this.blocos.findIndex((item) => item.id === bloco.id);
    const targetIndex = index + direcao;

    if (index < 0 || targetIndex < 0 || targetIndex >= this.blocos.length) {
      return;
    }

    const novaLista = [...this.blocos];
    [novaLista[index], novaLista[targetIndex]] = [novaLista[targetIndex], novaLista[index]];

    const payload = {
      blocos: novaLista.map((item, idx) => ({
        id: item.id,
        ordem: idx + 1,
      })),
    };

    this.blocoService.reordenar(this.paginaId, payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastr.success('Ordem dos blocos atualizada.');
        this.carregarBlocos();
      },
      error: () => this.toastr.error('Não foi possível atualizar a ordem dos blocos.'),
    });
  }

  podeMover(bloco: SitePaginaBlocoResponse, direcao: -1 | 1): boolean {
    const index = this.blocos.findIndex((item) => item.id === bloco.id);
    return index >= 0 && index + direcao >= 0 && index + direcao < this.blocos.length;
  }

  statusKey(ativo: boolean): 'ATIVO' | 'INATIVO' {
    return ativo ? 'ATIVO' : 'INATIVO';
  }

  labelTipo(tipo: SitePaginaBlocoTipo): string {
    const labels: Record<SitePaginaBlocoTipo, string> = {
      TEXTO: 'Texto',
      IMAGEM: 'Imagem',
      TEXTO_IMAGEM: 'Texto + imagem',
      FAQ: 'FAQ',
      CTA: 'CTA',
      VIDEO: 'Video',
      GALERIA: 'Galeria',
      MAPA: 'Mapa',
      PRODUTOS: 'Produtos',
      CATEGORIAS: 'Categorias',
      MARCAS: 'Marcas',
    };

    return labels[tipo] || tipo;
  }

  private abrirDialog(bloco?: SitePaginaBlocoResponse): void {
    const dialogRef = this.dialog.open(FormBlocoComponent, {
      width: '820px',
      maxWidth: '96vw',
      data: {
        paginaId: this.paginaId,
        bloco: bloco || null,
        proximaOrdem: this.proximaOrdem,
      },
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((resultado) => {
      if (resultado?.salvou) {
        const mensagem = resultado.acao === 'atualizado'
          ? 'Bloco atualizado com sucesso!'
          : 'Bloco criado com sucesso!';
        this.carregarBlocos(mensagem);
      }
    });
  }
}
