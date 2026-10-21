import { BreakpointObserver } from '@angular/cdk/layout';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MobileTotalBarComponent } from 'src/app/components/mobile-total-bar/mobile-total-bar.component';
import { Subject, takeUntil, finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ToastrService } from 'ngx-toastr';
import { BillingStateService } from 'src/app/pages/billing/services/billing-state.service';
import { BillingService } from 'src/app/pages/billing/services/billing.service';
import { PlanoPublico } from 'src/app/types/plano-publico.type';
import { CardHeaderComponent } from 'src/app/components/card-header/card-header.component';
import { BillingAccessResponse } from 'src/app/models/billing-access.model';
import { TablerIconsModule } from 'angular-tabler-icons';
import { PricingCardComponent } from 'src/app/components/pricing-card/pricing-card.component';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario/usuario.model';
import { CheckoutResponse } from 'src/app/models/billing-access.model';

@Component({
  selector: 'app-billing-pagamento',
  standalone: true,
  imports: [PageCardComponent, SectionCardComponent, MobileTotalBarComponent, CommonModule, MatButtonModule, MatProgressSpinnerModule, MatIconModule, MatCardModule, CardHeaderComponent, TablerIconsModule, PricingCardComponent],
  templateUrl: './billing-pagamento.component.html',
  styleUrls: ['./billing-pagamento.component.scss']
})
export class BillingPagamentoComponent implements OnInit, OnDestroy {
  isMobile = false;
  mobilePlanoAberto: number | null = null;
  carregandoPlanos = false;
  erroPlanos: string | null = null;
  private readonly destroy$ = new Subject<void>();
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
  expandirPlano(id: number, expanded: boolean): void { this.mobilePlanoAberto = expanded ? id : null; }
  tentarNovamente(): void { this.billing ? this.verificarPlanos() : this.carregarStatus(); }
  get podePagarMobile(): boolean { return this.podePagar && this.isProprietario && !this.loading && !this.carregandoPlanos && !this.erroPlanos; }
  pagarMobile(): void { if (this.podePagarMobile) this.irParaPagamento(); }

  billing: BillingAccessResponse | null = null;
  loading = false;
  ownerDenied = false;
  returnUrl: string | null = null;
  planos: PlanoPublico[] = [];
  planoSelecionado: PlanoPublico | null = null;
  usuario?: Usuario | null;
  private planoIdParam: number | null = null;

  constructor(
    private billingState: BillingStateService,
    private billingService: BillingService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    breakpoints?: BreakpointObserver
  ) {
    breakpoints?.observe(MOBILE_FOUNDATION_QUERY).pipe(takeUntil(this.destroy$))
      .subscribe(state => this.isMobile = state.breakpoints[MOBILE_FOUNDATION_QUERY] ?? state.matches);
  }

  ngOnInit(): void {
    this.authService.usuario$.pipe(takeUntil(this.destroy$)).subscribe(u => this.usuario = u);
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.planoIdParam = this.parsePlanoId(this.route.snapshot.queryParamMap.get('planoId'));
    this.billing = this.billingState.snapshot;

    if (!this.billing) {
      this.carregarStatus();
    } else {
      this.verificarPlanos();
      this.carregarStatus();
    }
  }

  private carregarStatus(): void {
    this.carregandoPlanos = true;
    this.erroPlanos = null;
    this.billingService.obterStatus().subscribe({
      next: (resp) => {
        this.billingState.setFromResponse(resp);
        this.billing = resp;
        this.verificarPlanos();
      },
      error: () => {
        // se 402, o interceptor já redireciona. Aqui evitamos travar o botão.
        this.billing = this.billingState.snapshot;
        this.carregandoPlanos = false;
        if (!this.billing) {
          this.erroPlanos = 'Não foi possível carregar o status de assinatura.';
          this.toastr.error(this.erroPlanos);
        }
      }
    });
  }

  private verificarPlanos(): void {
    this.carregandoPlanos = true;
    this.erroPlanos = null;
    this.billingService.listarPlanosInternos().subscribe({
      next: (planos) => {
        this.carregandoPlanos = false;
        this.planos = [...(planos || [])].sort((a, b) => (a.ordem_exibicao || a.ordemExibicao || 0) - (b.ordem_exibicao || b.ordemExibicao || 0));
        const planoPreferido =
          this.findPlanoById(this.planoIdParam) ||
          this.findPlanoById(this.billing?.planoId ?? null) ||
          this.findPlanoById(this.parsePlanoId(sessionStorage.getItem('billing_selected_plan'))) ||
          this.planos[0] ||
          null;

        this.planoSelecionado = planoPreferido;
        if (this.planoSelecionado?.id) {
          sessionStorage.setItem('billing_selected_plan', this.planoSelecionado.id.toString());
        }
      },
      error: () => {
        this.carregandoPlanos = false;
        this.erroPlanos = 'Não foi possível carregar os planos disponíveis.';
        this.toastr.error(this.erroPlanos);
      }
    });
  }

  get badgeLabel(): string {
    if (this.billing?.type === 'PRE_DUE' || this.billing?.type === 'POST_DUE') return 'Aviso';
    if (this.billing?.type === 'BLOCKED') return 'Acesso bloqueado';
    return '';
  }

  get podePagar(): boolean {
    if (this.ownerDenied) return false;
    return !!this.planoSelecionado?.id;
  }

  getBeneficios(plano: PlanoPublico): string[] {
    const beneficios = plano.beneficios_json;
    if (!beneficios) return [];
    if (Array.isArray(beneficios)) return beneficios as string[];
    try {
      const parsed = JSON.parse(beneficios);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private get isProprietario(): boolean {
    if (this.billing?.proprietario === false || this.usuario?.proprietario === false) {
      return false;
    }
    if (this.billing?.proprietario === true || this.usuario?.proprietario === true) {
      return true;
    }
    // se ainda não sabemos, deixamos o backend validar (evita travar botão)
    return true;
  }

  preco(plano: PlanoPublico): number {
    if (typeof plano.valorFinal === 'number' && Number.isFinite(plano.valorFinal)) {
      return plano.valorFinal;
    }
    return ((plano.precoFinalCentavos ?? plano.preco_centavos) || 0) / 100;
  }

  precoOriginal(plano: PlanoPublico): number {
    if (typeof plano.valorOriginal === 'number' && Number.isFinite(plano.valorOriginal)) {
      return plano.valorOriginal;
    }
    return ((plano.precoOriginalCentavos ?? plano.precoFinalCentavos ?? plano.preco_centavos) || 0) / 100;
  }

  precoAnual(plano: PlanoPublico): number {
    return this.preco(plano) * 12;
  }

  precoMensal(plano: PlanoPublico): number {
    const meses = this.periodicidadeMeses(plano);
    return this.preco(plano) / meses;
  }

  periodicidadeLabel(plano: PlanoPublico): string {
    const periodicidade = `${plano.periodicidade || ''}`.trim().toUpperCase();

    switch (periodicidade) {
      case 'MENSAL':
        return 'mês';
      case 'TRIMESTRAL':
        return 'trimestre';
      case 'SEMESTRAL':
        return 'semestre';
      case 'ANUAL':
        return 'ano';
      default:
        return periodicidade ? periodicidade.toLowerCase() : 'mês';
    }
  }

  periodicidadeMeses(plano: PlanoPublico): number {
    const periodicidade = `${plano.periodicidade || ''}`.trim().toUpperCase();

    switch (periodicidade) {
      case 'TRIMESTRAL':
        return 3;
      case 'SEMESTRAL':
        return 6;
      case 'ANUAL':
        return 12;
      case 'MENSAL':
      default:
        return 1;
    }
  }

  exibeValorCheio(plano: PlanoPublico): boolean {
    return this.periodicidadeMeses(plano) > 1;
  }

  temDesconto(plano: PlanoPublico): boolean {
    return this.precoOriginal(plano) > this.preco(plano);
  }

  get benefitCodeSelecionado(): string | null {
    const raw = this.planoSelecionado?.benefitCode;
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  }

  descricaoPlano(plano: PlanoPublico): string | null {
    const raw = plano?.descricao;
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  }

  selecionar(plano: PlanoPublico): void {
    this.planoSelecionado = plano;
    if (plano?.id) {
      sessionStorage.setItem('billing_selected_plan', plano.id.toString());
    }
  }
  irParaPagamento(): void {
    if (!this.planoSelecionado?.id) {
      this.toastr.warning('Selecione um plano para continuar.');
      return;
    }

    this.loading = true;
    this.billingService.checkoutAssinatura(this.planoSelecionado.id).pipe(finalize(() => this.loading = false)).subscribe({
      next: (resp: CheckoutResponse) => {
        const outcome = `${resp?.outcome || ''}`.toUpperCase()
          || (resp?.requiresPayment ? 'PAYMENT_REQUIRED' : '')
          || (resp?.benefitApplied ? 'BENEFIT_APPLIED' : '')
          || (!resp?.requiresPayment ? 'ALREADY_REGULAR' : '');
        const initPoint = resp?.initPoint || (resp as any)?.invoiceUrl;

        if (outcome === 'PAYMENT_REQUIRED') {
          if (!initPoint) {
            this.toastr.error('Não foi possível iniciar o checkout.');
            return;
          }

          sessionStorage.setItem('billing_checkout_pending', JSON.stringify(resp));
          sessionStorage.setItem('asaas_last_payment_id', resp?.paymentReference || resp?.paymentId || '');
          sessionStorage.setItem('asaas_last_invoice_url', initPoint);
          window.location.href = initPoint;
          return;
        }

        if (outcome === 'BENEFIT_APPLIED' || outcome === 'ALREADY_REGULAR') {
          sessionStorage.setItem('billing_checkout_result', JSON.stringify(resp));
          this.router.navigate(['/billing/confirmacao'], {
            state: { billingConfirmationResult: resp }
          });
          return;
        }

        this.toastr.error(resp?.message || 'Não foi possível iniciar o checkout.');
      },
      error: (err) => {
        if (err?.status === 403) {
          this.ownerDenied = true;
          this.toastr.error(err?.error?.message || 'Somente o proprietário pode regularizar a assinatura.');
        } else if (err?.error?.billing) {
          this.billingState.setFromErrorBody(err, this.router.url);
          this.billing = this.billingState.snapshot;
          this.toastr.error(this.billing?.message || 'Acesso bloqueado.');
        } else {
          this.toastr.error('Não foi possível iniciar o checkout.');
        }
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  voltar(): void {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    } else {
      this.router.navigate([this.isMobile ? '/billing/minha-assinatura' : '/billing/blocked']);
    }
  }

  private findPlanoById(id: number | null): PlanoPublico | null {
    if (!id) return null;
    return this.planos.find((plano) => plano.id === id) || null;
  }

  private parsePlanoId(raw: string | number | null | undefined): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
