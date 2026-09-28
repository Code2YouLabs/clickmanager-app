import { Component, OnDestroy, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableAction, DataTableActionEvent, DataTableColumn, DataTableFilter, DataTableFilterState } from 'src/app/components/data-table/data-table.models';
import { Usuario } from 'src/app/models/usuario/usuario.model';
import { AuthService } from 'src/app/services/auth.service';
import { StatusBadgeComponent } from 'src/app/components/status-badge/status-badge.component';
import { ImagemUtil } from 'src/app/utils/imagem-util';
import { UsuarioService } from '../services/usuario.service';

@Component({
  selector: 'app-listar-usuarios',
  standalone: true,
  imports: [PageCardComponent, DataTableComponent, DataTableCellDirective, StatusBadgeComponent],
  templateUrl: './listar-usuarios.component.html'
})
export class ListarUsuariosComponent implements OnInit, OnDestroy {
  usuarios: Usuario[] = [];
  totalUsuarios = 0;
  carregando = false;
  erro: string | null = null;
  semPermissao = false;
  pagina = 0;
  tamanhoPagina = 10;
  filtroStatus: boolean | null = true;
  readonly imagemUtil = ImagemUtil;
  readonly filtros: DataTableFilter[] = [{ key: 'ativo', label: 'Status', type: 'select', options: [
    { value: true, label: 'Ativos' }, { value: false, label: 'Inativos' },
  ] }];
  readonly colunas: DataTableColumn<Usuario>[] = [
    { key: 'foto', label: 'Foto' }, { key: 'nome', label: 'Nome' },
    { key: 'username', label: 'E-mail' }, { key: 'perfil', label: 'Perfil', value: row => row.perfil?.nome || '-' },
    { key: 'status', label: 'Status' },
  ];
  readonly acoes: DataTableAction<Usuario>[] = [
    { id: 'editar', label: 'Editar usuário', icon: 'edit', visible: () => this.auth.temPermissao('USUARIO_EDITAR') },
    { id: 'excluir', label: 'Excluir usuário', icon: 'delete', color: 'warn', visible: () => this.auth.temPermissao('USUARIO_EXCLUIR') },
  ];
  private consulta?: Subscription;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private usuarioService: UsuarioService,
    private router: Router,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private auth: AuthService
  ) {}

  ngOnInit(): void { this.carregarUsuarios(); }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarUsuarios(): void {
    this.consulta?.unsubscribe();
    this.carregando = true;
    this.erro = null;
    this.semPermissao = false;
    this.consulta = this.usuarioService.listar(this.pagina, this.tamanhoPagina, this.filtroStatus).subscribe({
      next: res => {
        this.usuarios = res.content || [];
        this.totalUsuarios = res.totalElements;
        this.carregando = false;
      },
      error: err => {
        this.carregando = false;
        this.semPermissao = err.status === 403;
        this.erro = this.semPermissao ? null : 'Erro ao carregar usuários.';
      }
    });
  }

  onPaginaAlterada(event: PageEvent): void {
    this.pagina = event.pageIndex;
    this.tamanhoPagina = event.pageSize;
    this.carregarUsuarios();
  }

  onFiltros(state: DataTableFilterState): void {
    const ativo = state['ativo'];
    this.filtroStatus = typeof ativo === 'boolean' ? ativo : null;
    this.pagina = 0;
    this.carregarUsuarios();
  }

  usarImagemPadrao(event: Event): void {
    const imagem = event.target as HTMLImageElement | null;
    if (!imagem || imagem.dataset['fallbackApplied'] === 'true') return;
    imagem.dataset['fallbackApplied'] = 'true';
    imagem.onerror = null;
    imagem.src = 'assets/images/profile/user-1.jpg';
  }

  onAcao(event: DataTableActionEvent<Usuario>): void {
    if (this.semPermissao) return;
    if (event.action === 'editar' && this.auth.temPermissao('USUARIO_EDITAR')) {
      this.router.navigate(['/page/usuarios/editar', event.row.id]);
    } else if (event.action === 'excluir' && this.auth.temPermissao('USUARIO_EXCLUIR')) {
      this.excluir(event.row);
    }
  }

  private excluir(usuario: Usuario): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Excluir usuário',
        message: `Tem certeza que deseja excluir o usuário "${usuario.nome}"?`,
        confirmText: 'Excluir', confirmColor: 'warn'
      }
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (!result) return;
      this.usuarioService.excluir(usuario.id!).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toastr.success('Usuário excluído com sucesso!');
          this.carregarUsuarios();
        },
        error: () => this.toastr.error('Erro ao excluir o usuário.')
      });
    });
  }
}
