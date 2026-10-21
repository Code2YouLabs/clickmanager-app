import { BreakpointObserver } from '@angular/cdk/layout';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { CalculadoraMaterialService } from './shared/calculadora-material.service';
import {
  CalculadoraMaterialPendencia,
  CalculadoraMaterialProdutoBusca,
  StatusConfiguracaoCalculadoraMaterial,
} from './shared/calculadora-material.models';

@Component({
  selector: 'app-calculadora-materiais',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MaterialModule, PageCardComponent, SectionCardComponent],
  templateUrl: './calculadora-materiais.component.html',
  styleUrls: ['./calculadora-materiais.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalculadoraMateriaisComponent implements OnInit, OnDestroy {
  isMobile = false;
  private readonly destroy$ = new Subject<void>();
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
  readonly buscaControl = this.fb.control('');
  readonly carregando = signal(false);
  readonly buscando = signal(false);
  readonly processandoId = signal<number | null>(null);
  readonly habilitados = signal<CalculadoraMaterialProdutoBusca[]>([]);
  readonly disponiveis = signal<CalculadoraMaterialProdutoBusca[]>([]);
  readonly produtoComPendencias = signal<CalculadoraMaterialProdutoBusca | null>(null);
  readonly temProdutosHabilitados = computed(() => this.habilitados().length > 0);

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: CalculadoraMaterialService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    breakpoints?: BreakpointObserver
  ) {
    breakpoints?.observe(MOBILE_FOUNDATION_QUERY).pipe(takeUntil(this.destroy$)).subscribe(state => this.isMobile = state.breakpoints[MOBILE_FOUNDATION_QUERY] ?? state.matches);}

  ngOnInit(): void {
    this.carregarHabilitados();
    this.pesquisarDisponiveis('');
    this.buscaControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((texto) => this.pesquisarDisponiveis(texto ?? ''));
  }

  carregarHabilitados(): void {
    this.carregando.set(true);
    this.service.listarHabilitados().subscribe({
      next: (produtos) => {
        this.carregando.set(false);
        this.habilitados.set(produtos ?? []);
      },
      error: () => {
        this.carregando.set(false);
        this.toastr.error('Erro ao carregar produtos habilitados.');
      },
    });
  }

  pesquisarDisponiveis(texto: string): void {
    this.buscando.set(true);
    this.service.pesquisarDisponiveis(texto, 20).subscribe({
      next: (produtos) => {
        this.buscando.set(false);
        this.disponiveis.set(produtos ?? []);
      },
      error: () => {
        this.buscando.set(false);
        this.toastr.error('Erro ao buscar produtos disponiveis.');
      },
    });
  }

  adicionarProduto(produto: CalculadoraMaterialProdutoBusca): void {
    this.produtoComPendencias.set(null);
    this.processandoId.set(produto.produtoId);
    this.service.validarProduto(produto.produtoId).subscribe({
      next: (validacao) => {
        if (validacao.status === 'PRONTO_PARA_HABILITAR' || validacao.podeAdicionar) {
          this.habilitarDiretamente(validacao.produtoId);
          return;
        }

        this.processandoId.set(null);
        this.produtoComPendencias.set(validacao);
      },
      error: () => {
        this.processandoId.set(null);
        this.toastr.error('Erro ao validar produto.');
      },
    });
  }

  configurarProduto(produto: CalculadoraMaterialProdutoBusca): void {
    const returnUrl = '/page/calculadora-materiais';
    this.router.navigate(['/page/cadastro-tecnico/produtos/editar', produto.produtoId], {
      queryParams: {
        tab: 'calculadora-materiais',
        returnUrl,
        habilitarAoSalvar: true,
      },
    });
  }

  editar(produto: CalculadoraMaterialProdutoBusca): void {
    this.router.navigate(['/page/cadastro-tecnico/produtos/editar', produto.produtoId], {
      queryParams: { tab: 'calculadora-materiais', returnUrl: '/page/calculadora-materiais' },
    });
  }

  desabilitar(produto: CalculadoraMaterialProdutoBusca): void {
    this.processandoId.set(produto.produtoId);
    this.service.alterarHabilitacao(produto.produtoId, false).subscribe({
      next: () => {
        this.processandoId.set(null);
        this.toastr.success('Produto desabilitado.');
        this.carregarHabilitados();
        this.pesquisarDisponiveis(this.buscaControl.value ?? '');
      },
      error: () => {
        this.processandoId.set(null);
        this.toastr.error('Erro ao desabilitar produto.');
      },
    });
  }

  statusLabel(status: StatusConfiguracaoCalculadoraMaterial | null | undefined): string {
    const labels: Record<StatusConfiguracaoCalculadoraMaterial, string> = {
      NAO_CONFIGURADO: 'Nao configurado',
      CONFIGURACAO_INCOMPLETA: 'Configuracao incompleta',
      PRONTO_PARA_HABILITAR: 'Pronto para habilitar',
      HABILITADO: 'Habilitado',
      PRODUTO_INATIVO: 'Produto inativo',
      PRECO_NAO_CONFIGURADO: 'Preco nao configurado',
    };
    return status ? labels[status] : 'Nao configurado';
  }

  pendenciasTexto(pendencias: CalculadoraMaterialPendencia[] | null | undefined): string {
    return (pendencias ?? []).map((p) => p.mensagem).join(' ');
  }

  private habilitarDiretamente(produtoId: number): void {
    this.service.habilitarProduto(produtoId).subscribe({
      next: () => {
        this.processandoId.set(null);
        this.toastr.success('Produto habilitado na Calculadora de Materiais.');
        this.carregarHabilitados();
        this.pesquisarDisponiveis(this.buscaControl.value ?? '');
      },
      error: () => {
        this.processandoId.set(null);
        this.toastr.error('Erro ao habilitar produto.');
      },
    });
  }
}
