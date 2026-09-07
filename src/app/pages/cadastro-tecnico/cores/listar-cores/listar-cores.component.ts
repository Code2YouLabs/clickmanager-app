import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { Cor } from 'src/app/models/cor.model';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { InputPesquisaComponent } from 'src/app/components/inputs/input-pesquisa/input-pesquisa.component';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { CorService } from '../../services/cor.service';
import { CardHeaderComponent } from "src/app/components/card-header/card-header.component";
import { MobileFabActionComponent } from 'src/app/components/mobile-fab-action/mobile-fab-action.component';

@Component({
  selector: 'app-listar-cores',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatPaginatorModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatRippleModule,
    TablerIconsModule,
    RouterModule,
    TemPermissaoDirective,
    InputPesquisaComponent,
    CardHeaderComponent,
    MobileFabActionComponent
],
  templateUrl: './listar-cores.component.html',
  styleUrl: './listar-cores.component.scss'
})
export class ListarCoresComponent implements OnInit{
  cores: Cor[] = [];
  totalCores = 0;
  carregando = false;
  pagina = 0;
  tamanhoPagina = 10;
  termoPesquisa = '';
  colunasExibidas = ['nome', 'descricao', 'acoes'];
  isMobileView = false;
  mobileFabCompact = false;
  corSelecionadaMenu: Cor | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private coresService: CorService, private router: Router, private dialog: MatDialog, private toastrService: ToastrService) {}

  ngOnInit(): void {
    this.atualizarViewport();
    this.carregarCores();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.atualizarViewport();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.mobileFabCompact = (window.scrollY || document.documentElement.scrollTop || 0) > 96;
  }

  carregarCores(): void {
    this.carregando = true;
    this.coresService.listar(this.pagina, this.tamanhoPagina, undefined, this.termoPesquisa).subscribe({
      next: (res) => {
        this.cores = res.content || [];
        this.totalCores = res.totalElements;
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
    this.carregarCores();
  }

  onPesquisar(valor: string): void {
    this.termoPesquisa = valor;
    this.pagina = 0;
    this.carregarCores();
  }

  editar(cor: Cor): void {
    this.router.navigate(['page/cadastro-tecnico/cores/editar', cor.id]);
  }

  clonar(cor: Cor): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Clonar cor',
        message: `Deseja usar "${cor.nome}" como base para criar uma nova cor?`,
        confirmText: 'Clonar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.router.navigate(['/page/cadastro-tecnico/cores/nova'], { queryParams: { cloneFrom: cor.id } });
      }
    });
  }

  excluir(cor: Cor): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Excluir cor',
        message: `Tem certeza que deseja excluir a cor "${cor.descricao}"?`,
        confirmText: 'Excluir',
        confirmColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.coresService.excluir(cor.id!).subscribe({
          next: () => {
            this.toastrService.success('Cor excluída com sucesso!');
            this.carregarCores();
          },
          error: () => {
            this.toastrService.error('Erro ao excluir a cor.');
          }
        });
      }
    });
  }

  navegarCriacao(): void {
    this.router.navigate(['/page/cadastro-tecnico/cores/nova']);
  }

  selecionarCorMenu(cor: Cor, event: Event): void {
    event.stopPropagation();
    this.corSelecionadaMenu = cor;
  }

  private atualizarViewport(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.isMobileView = window.innerWidth <= 768;
    this.tamanhoPagina = this.isMobileView ? 20 : 10;
  }
}
