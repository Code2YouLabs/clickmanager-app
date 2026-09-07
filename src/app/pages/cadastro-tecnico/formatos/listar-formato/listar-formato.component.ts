import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { Formato } from 'src/app/models/formato.model';
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
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { FormatoService } from '../../services/formato.service';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { CardHeaderComponent } from "src/app/components/card-header/card-header.component";
import { InputPesquisaComponent } from 'src/app/components/inputs/input-pesquisa/input-pesquisa.component';
import { MobileFabActionComponent } from 'src/app/components/mobile-fab-action/mobile-fab-action.component';

@Component({
  selector: 'app-listar-formato',
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
    MatRippleModule,
    TablerIconsModule,
    RouterModule,
    TemPermissaoDirective,
    CardHeaderComponent,
    InputPesquisaComponent,
    MobileFabActionComponent
],
  templateUrl: './listar-formato.component.html',
  styleUrl: './listar-formato.component.scss'
})
export class ListarFormatoComponent implements OnInit {
  formatos: Formato[] = [];
  totalFormatos = 0;
  carregando = false;
  pagina = 0;
  tamanhoPagina = 10;
  termoPesquisa = '';
  colunasExibidas = ['nome', 'tamanho', 'areaUtil', 'acoes'];
  isMobileView = false;
  mobileFabCompact = false;
  formatoSelecionadoMenu: Formato | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private formatoService: FormatoService,
    private router: Router,
    private dialog: MatDialog,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.atualizarViewport();
    this.carregarFormatos();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.atualizarViewport();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.mobileFabCompact = (window.scrollY || document.documentElement.scrollTop || 0) > 96;
  }

  carregarFormatos(): void {
    this.carregando = true;
    this.formatoService.listar(this.pagina, this.tamanhoPagina, undefined, this.termoPesquisa).subscribe({
      next: (res) => {
        this.formatos = res.content || [];
        this.totalFormatos = res.totalElements;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        this.toastrService.error('Erro ao carregar formatos.');
      }
    });
  }

  onPaginaAlterada(event: PageEvent): void {
    this.pagina = event.pageIndex;
    this.tamanhoPagina = event.pageSize;
    this.carregarFormatos();
  }

  onPesquisar(valor: string): void {
    this.termoPesquisa = valor;
    this.pagina = 0;
    this.carregarFormatos();
  }

  editar(formato: Formato): void {
    this.router.navigate(['page/cadastro-tecnico/formatos/editar', formato.id]);
  }

  clonar(formato: Formato): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Clonar formato',
        message: `Deseja usar "${formato.nome}" como base para criar um novo formato?`,
        confirmText: 'Clonar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.router.navigate(['/page/cadastro-tecnico/formatos/criar'], { queryParams: { cloneFrom: formato.id } });
      }
    });
  }

  excluir(formato: Formato): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Excluir Formato',
        message: `Tem certeza que deseja excluir o formato "${formato.nome}"?`,
        confirmText: 'Excluir',
        confirmColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.formatoService.excluir(formato.id!).subscribe({
          next: () => {
            this.toastrService.success('Formato excluído com sucesso!');
            this.carregarFormatos();
          },
          error: () => {
            this.toastrService.error('Erro ao excluir o formato.');
          }
        });
      }
    });
  }

  navegarCriacao(): void {
    this.router.navigate(['/page/cadastro-tecnico/formatos/criar']);
  }

  selecionarFormatoMenu(formato: Formato, event: Event): void {
    event.stopPropagation();
    this.formatoSelecionadoMenu = formato;
  }

  tamanhoResumo(formato: Formato): string {
    return `${formato.larguraCm}cm × ${formato.alturaCm}cm`;
  }

  areaUtilResumo(formato: Formato): string {
    if (formato.larguraUtilCm == null || formato.alturaUtilCm == null) {
      return 'Área útil não informada';
    }

    return `Área útil ${formato.larguraUtilCm}cm × ${formato.alturaUtilCm}cm`;
  }

  private atualizarViewport(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.isMobileView = window.innerWidth <= 768;
    this.tamanhoPagina = this.isMobileView ? 20 : 10;
  }
}
