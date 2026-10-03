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
import { DataTableAction, DataTableActionEvent, DataTableColumn } from 'src/app/components/data-table/data-table.models';
import { ClienteListagem } from 'src/app/models/cliente/cliente-listagem.model';
import { AuthService } from 'src/app/services/auth.service';
import { TelefonePipe } from 'src/app/pipe/telefone.pipe';
import { ClienteService } from '../cliente.service';

@Component({
  selector: 'app-listar-clientes',
  standalone: true,
  imports: [PageCardComponent, DataTableComponent, DataTableCellDirective, TelefonePipe],
  templateUrl: './listar-cliente.component.html'
})
export class ListarClienteComponent implements OnInit, OnDestroy {
  clientes: ClienteListagem[] = [];
  totalClientes = 0;
  carregando = false;
  erro: string | null = null;
  semPermissao = false;
  pagina = 0;
  tamanhoPagina = 10;
  termoPesquisa = '';
  readonly colunas: DataTableColumn<ClienteListagem>[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'email', label: 'E-mail' },
    { key: 'telefone', label: 'Telefone' },
  ];
  readonly acoes: DataTableAction<ClienteListagem>[] = [
    { id: 'editar', label: 'Editar cliente', icon: 'edit', visible: () => this.auth.temPermissao('CLIENTE_EDITAR') },
    { id: 'excluir', label: 'Excluir cliente', icon: 'delete', color: 'warn', visible: () => this.auth.temPermissao('CLIENTE_EXCLUIR') },
  ];
  private consulta?: Subscription;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private clienteService: ClienteService,
    private router: Router,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private auth: AuthService
  ) {}

  ngOnInit(): void { this.carregarClientes(); }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarClientes(): void {
    this.consulta?.unsubscribe();
    this.carregando = true;
    this.erro = null;
    this.semPermissao = false;
    this.consulta = this.clienteService.listar(this.pagina, this.tamanhoPagina, this.termoPesquisa).subscribe({
      next: res => {
        this.clientes = res.content || [];
        this.totalClientes = res.totalElements;
        this.carregando = false;
      },
      error: err => {
        this.carregando = false;
        this.semPermissao = err.status === 403;
        this.erro = this.semPermissao ? null : 'Erro ao carregar clientes.';
      }
    });
  }

  onPaginaAlterada(event: PageEvent): void {
    this.pagina = event.pageIndex;
    this.tamanhoPagina = event.pageSize;
    this.carregarClientes();
  }

  onPesquisar(valor: string): void {
    // O único debounce pertence ao InputPesquisa composto pelo DataTable.
    this.termoPesquisa = valor;
    this.pagina = 0;
    this.carregarClientes();
  }

  onAcao(event: DataTableActionEvent<ClienteListagem>): void {
    if (this.semPermissao) return;
    if (event.action === 'editar' && this.auth.temPermissao('CLIENTE_EDITAR')) {
      this.router.navigate(['/page/cliente/editar', event.row.id]);
    } else if (event.action === 'excluir' && this.auth.temPermissao('CLIENTE_EXCLUIR')) {
      this.excluir(event.row);
    }
  }

  private excluir(cliente: ClienteListagem): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Excluir Cliente',
        message: `Tem certeza que deseja excluir o cliente "${cliente.nome}"?`,
        confirmText: 'Excluir', confirmColor: 'warn'
      }
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (!result) return;
      this.clienteService.excluir(cliente.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toastr.success('Cliente excluído com sucesso!');
          this.carregarClientes();
        },
        error: () => this.toastr.error('Erro ao excluir o cliente.')
      });
    });
  }
}
