import { CommonModule } from '@angular/common';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { catchError, forkJoin, map, of, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { MaterialModule } from 'src/app/material.module';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { DataTableFilter, DataTableFilterState } from 'src/app/components/data-table/data-table.models';
import { ListFilterBarComponent } from 'src/app/components/list-filter-bar/list-filter-bar.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { ClickTvMidia, ClickTvStatusMidia, ClickTvTipoMidia } from '../../models/clicktv.models';
import { ClickTvService } from '../../services/clicktv.service';
import {
  ClickTvMidiaPreviewDialogComponent,
  ClickTvNameDialogComponent,
  ClickTvUploadDialogComponent,
} from '../dialogs/clicktv-dialogs.component';

@Component({
  selector: 'app-clicktv-midias',
  standalone: true,
  imports: [CommonModule, MaterialModule, PageCardComponent, ListFilterBarComponent, TemPermissaoDirective],
  templateUrl: './clicktv-midias.component.html',
  styleUrls: ['../../clicktv.scss'],
})
export class ClickTvMidiasComponent implements OnInit, OnDestroy {
  midias: ClickTvMidia[] = [];
  total = 0;
  page = 0;
  size = 12;
  nome = '';
  tipo: ClickTvTipoMidia | '' = '';
  status: ClickTvStatusMidia | '' = '';
  carregandoInicial = false;
  refreshing = false;
  erro: string | null = null;
  semPermissao = false;
  uploadProgresso: number | null = null;
  uploadEmAndamento = false;
  readonly tipos: ClickTvTipoMidia[] = ['IMAGEM', 'VIDEO'];
  readonly statuses: ClickTvStatusMidia[] = ['PROCESSANDO', 'DISPONIVEL', 'ERRO'];
  readonly filtroControl = new FormControl('', { nonNullable: true });
  readonly filtros: DataTableFilter[] = [
    {
      key: 'tipo',
      label: 'Tipo',
      type: 'select',
      width: '180px',
      options: [
        { value: 'IMAGEM', label: 'Imagem' },
        { value: 'VIDEO', label: 'Vídeo' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      width: '220px',
      options: [
        { value: 'PROCESSANDO', label: 'Processando' },
        { value: 'DISPONIVEL', label: 'Disponível' },
        { value: 'ERRO', label: 'Erro' },
      ],
    },
  ];

  private readonly carregar$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();
  private ignorarProximoStateChangeVazio = false;

  constructor(
    private readonly service: ClickTvService,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.carregar$
      .pipe(
        tap(() => this.iniciarCarregamento()),
        switchMap(() => this.service.listarMidias({
          nome: this.nome.trim() || undefined,
          tipo: this.tipo || undefined,
          status: this.status || undefined,
          page: this.page,
          size: this.size,
        }).pipe(
          map((res) => ({ res, error: null as HttpErrorResponse | null })),
          catchError((error: HttpErrorResponse) => of({ res: null, error })),
        )),
        takeUntil(this.destroy$),
      )
      .subscribe(({ res, error }) => {
        this.carregandoInicial = false;
        this.refreshing = false;
        if (error) {
          this.tratarErro(error);
          return;
        }
        this.erro = null;
        this.semPermissao = false;
        this.midias = res?.content || [];
        this.total = res?.totalElements || 0;
      });

    this.carregar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregar(): void {
    this.carregar$.next();
  }

  pesquisar(nome: string): void {
    this.nome = nome;
    this.page = 0;
    this.carregar();
  }

  alterarFiltros(filtros: DataTableFilterState): void {
    if (this.ignorarProximoStateChangeVazio && !Object.keys(filtros || {}).length) {
      this.ignorarProximoStateChangeVazio = false;
      return;
    }
    this.ignorarProximoStateChangeVazio = false;
    this.tipo = (filtros['tipo'] as ClickTvTipoMidia | null | undefined) || '';
    this.status = (filtros['status'] as ClickTvStatusMidia | null | undefined) || '';
    this.page = 0;
    this.carregar();
  }

  limparFiltros(): void {
    this.nome = '';
    this.tipo = '';
    this.status = '';
    this.page = 0;
    this.ignorarProximoStateChangeVazio = true;
    this.filtroControl.setValue('', { emitEvent: false });
    this.carregar();
  }

  pagina(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.carregar();
  }

  enviar(): void {
    if (this.uploadEmAndamento) return;
    this.dialog.open(ClickTvUploadDialogComponent, { width: '560px' }).afterClosed().subscribe((result) => {
      if (!result) return;
      this.uploadProgresso = 0;
      this.uploadEmAndamento = true;
      this.service.uploadMidia(result.arquivo, result.nome, result.duracaoImagem).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            this.uploadProgresso = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
          }
          if (event.type === HttpEventType.Response) {
            this.uploadProgresso = null;
            this.uploadEmAndamento = false;
            this.toastr.success('Mídia enviada com sucesso.');
            this.carregar();
          }
        },
        error: () => {
          this.uploadProgresso = null;
          this.uploadEmAndamento = false;
          this.toastr.error('Não foi possível enviar a mídia. Verifique formato e tamanho.');
        },
      });
    });
  }

  visualizar(midia: ClickTvMidia): void {
    forkJoin({
      midia: this.service.detalharMidia(midia.id),
      utilizacoes: this.service.utilizacoesMidia(midia.id),
    }).subscribe({
      next: (data) => this.dialog.open(ClickTvMidiaPreviewDialogComponent, { width: '820px', data }),
      error: () => this.toastr.error('Não foi possível abrir a mídia.'),
    });
  }

  renomear(midia: ClickTvMidia): void {
    this.dialog.open(ClickTvNameDialogComponent, {
      width: '500px',
      data: { titulo: 'Renomear mídia', nome: midia.nome },
    }).afterClosed().subscribe((nome) => {
      if (!nome || nome === midia.nome) return;
      this.service.renomearMidia(midia.id, nome).subscribe({
        next: () => { this.toastr.success('Mídia renomeada.'); this.carregar(); },
        error: () => this.toastr.error('Não foi possível renomear a mídia.'),
      });
    });
  }

  excluir(midia: ClickTvMidia): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '520px',
      data: {
        title: 'Excluir mídia definitivamente',
        message: `Excluir "${midia.nome}"? Ela será removida de todas as playlists e apagada definitivamente. Esta ação não pode ser desfeita; para utilizá-la novamente será necessário fazer um novo upload.`,
        confirmText: 'Excluir definitivamente',
        confirmColor: 'warn',
      },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.service.excluirMidia(midia.id).subscribe({
        next: () => { this.toastr.success('Mídia excluída definitivamente.'); this.carregar(); },
        error: () => this.toastr.error('Não foi possível excluir a mídia. Se for um vídeo, aguarde o processamento terminar.'),
      });
    });
  }

  get filtroState(): DataTableFilterState {
    return {
      tipo: this.tipo || null,
      status: this.status || null,
    };
  }

  get temFiltrosAtivos(): boolean {
    return !!(this.nome.trim() || this.tipo || this.status);
  }

  get mensagemVazio(): { titulo: string; subtitulo: string; icone: string } {
    if (this.temFiltrosAtivos) {
      return {
        titulo: 'Nenhuma mídia encontrada para os filtros',
        subtitulo: 'Ajuste a busca, tipo ou status para localizar outras mídias.',
        icone: 'filter_alt_off',
      };
    }
    return {
      titulo: 'Nenhuma mídia encontrada',
      subtitulo: 'Envie a primeira imagem ou vídeo para começar.',
      icone: 'perm_media',
    };
  }

  tamanho(bytes: number): string {
    if (!bytes) return '0 B';
    const unidades = ['B', 'KB', 'MB', 'GB'];
    const indice = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unidades.length - 1);
    return `${(bytes / 1024 ** indice).toFixed(indice ? 1 : 0)} ${unidades[indice]}`;
  }

  statusClass(status: ClickTvStatusMidia): string {
    return status === 'DISPONIVEL' ? 'success' : status === 'PROCESSANDO' ? 'warning' : status === 'ERRO' ? 'danger' : 'neutral';
  }

  private iniciarCarregamento(): void {
    this.erro = null;
    this.semPermissao = false;
    if (this.midias.length) {
      this.refreshing = true;
      this.carregandoInicial = false;
      return;
    }
    this.carregandoInicial = true;
    this.refreshing = false;
  }

  private tratarErro(error: HttpErrorResponse): void {
    this.semPermissao = error.status === 403;
    this.erro = this.semPermissao ? null : (error.error?.message || 'Não foi possível carregar as mídias do ClickTV.');
    if (!this.midias.length) {
      this.total = 0;
    }
  }
}
