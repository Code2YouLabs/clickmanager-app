import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { MatRippleModule } from '@angular/material/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { InputPesquisaComponent } from 'src/app/components/inputs/input-pesquisa/input-pesquisa.component';
import { ServicoService } from '../../services/servico.service';
import { ServicoListagem } from 'src/app/models/servico/servico-listagem.model';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { CardHeaderComponent } from "src/app/components/card-header/card-header.component";
import { Preco } from 'src/app/models/preco/preco-response.model';
import { MobileFabActionComponent } from 'src/app/components/mobile-fab-action/mobile-fab-action.component';

@Component({
  selector: 'app-listar-servicos',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatPaginatorModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatRippleModule,
    TablerIconsModule,
    RouterModule,
    TemPermissaoDirective,
    InputPesquisaComponent,
    CardHeaderComponent,
    MobileFabActionComponent
],
  templateUrl: './listar-servicos.component.html',
  styleUrl: './listar-servicos.component.scss'
})
export class ListarServicoComponent implements OnInit {

  servicos: ServicoListagem[] = [];
  totalServicos = 0;
  carregando = false;
  pagina = 0;
  tamanhoPagina = 10;
  termoPesquisa: string = '';
  colunasExibidas = ['nome', 'descricao', 'preco', 'acoes'];
  isMobileView = false;
  mobileFabCompact = false;
  servicoSelecionadoMenu: ServicoListagem | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private servicoService: ServicoService,
    private router: Router,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.atualizarViewport();
    this.carregarServicos();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.atualizarViewport();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.mobileFabCompact = (window.scrollY || document.documentElement.scrollTop || 0) > 96;
  }

  carregarServicos(): void {
    this.carregando = true;

    this.servicoService.listar(
      this.pagina,
      this.tamanhoPagina,
      undefined,
      this.termoPesquisa
    ).subscribe({
      next: (res) => {
        this.servicos = res.content || [];
        this.totalServicos = res.totalElements;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
      }
    });
  }

  onPaginaAlterada(event: PageEvent): void {
    this.pagina = event.pageIndex;
    this.tamanhoPagina = event.pageSize;
    this.carregarServicos();
  }

  editar(servico: ServicoListagem): void {
    this.router.navigate(['/page/cadastro-tecnico/servico/editar', servico.id]);
  }

  clonar(servico: ServicoListagem): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Clonar serviço',
        message: `Deseja usar "${servico.nome}" como base para criar um novo serviço?`,
        confirmText: 'Clonar'
      }
    });

    dialogRef.afterClosed().subscribe(confirmado => {
      if (confirmado) {
        this.router.navigate(['/page/cadastro-tecnico/servico/criar'], { queryParams: { cloneFrom: servico.id } });
      }
    });
  }

  excluir(servico: ServicoListagem): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Excluir Serviço',
        message: `Tem certeza que deseja excluir o serviço "${servico.nome}"?`,
        confirmText: 'Excluir',
        confirmColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(confirmado => {
      if (!confirmado) return;

      this.servicoService.excluir(servico.id!).subscribe({
        next: () => {
          this.toastr.success('Serviço excluído com sucesso!');
          this.carregarServicos();
        },
        error: () => {
          this.toastr.error('Erro ao excluir o serviço.');
        }
      });
    });
  }

  onPesquisar(valor: string): void {
    this.termoPesquisa = valor;
    this.pagina = 0;
    this.carregarServicos();
  }

  formatarPreco(preco: Preco | undefined | null): string {
    if (!preco) return '-';
    if (preco.tipo === 'FIXO' && typeof (preco as any).valor === 'number') {
      return (preco as any).valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    return preco.tipo;
  }

  navegarCriacao(): void {
    this.router.navigate(['/page/cadastro-tecnico/servico/criar']);
  }

  selecionarServicoMenu(servico: ServicoListagem, event: Event): void {
    event.stopPropagation();
    this.servicoSelecionadoMenu = servico;
  }

  private atualizarViewport(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.isMobileView = window.innerWidth <= 768;
    this.tamanhoPagina = this.isMobileView ? 20 : 10;
  }
}
