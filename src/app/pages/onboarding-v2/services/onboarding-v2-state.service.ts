import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';
import {
  OnboardingProgress,
  OnboardingV2CompanyPayload,
  OnboardingV2ProductsPayload,
  OnboardingV2Summary,
  ProdutoTemplate,
  isOnboardingV2Finished,
  resolveOnboardingV2RouteFromProgress,
} from '../models/onboarding-v2.models';
import { AuthService } from 'src/app/services/auth.service';
import { OnboardingV2Service } from './onboarding-v2.service';
import { PrimeiroPedidoBoasVindasFlowService } from 'src/app/shared/boas-vindas-primeiro-pedido/primeiro-pedido-boas-vindas-flow.service';
import { PrimeiroPedidoBoasVindasService } from 'src/app/shared/boas-vindas-primeiro-pedido/primeiro-pedido-boas-vindas.service';

@Injectable({ providedIn: 'root' })
export class OnboardingV2StateService {
  private readonly progressSignal = signal<OnboardingProgress | null>(null);
  private readonly resumoSignal = signal<OnboardingV2Summary | null>(null);
  private readonly produtosSignal = signal<ProdutoTemplate[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly savingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly selectedProdutoIdsSignal = signal<number[]>([]);

  readonly progress = computed(() => this.progressSignal());
  readonly resumo = computed(() => this.resumoSignal());
  readonly produtos = computed(() => this.produtosSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly saving = computed(() => this.savingSignal());
  readonly error = computed(() => this.errorSignal());
  readonly selectedProdutoIds = computed(() => this.selectedProdutoIdsSignal());
  readonly selectedCount = computed(() => this.selectedProdutoIdsSignal().length);

  constructor(
    private readonly onboardingV2Service: OnboardingV2Service,
    private readonly authService: AuthService,
    private readonly primeiroPedidoBoasVindasFlow: PrimeiroPedidoBoasVindasFlowService,
    private readonly primeiroPedidoBoasVindas: PrimeiroPedidoBoasVindasService
  ) {}

  setError(message: string | null): void {
    this.errorSignal.set(message);
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  setSelectedProdutoIds(ids: number[]): void {
    this.selectedProdutoIdsSignal.set([...new Set(ids)]);
  }

  toggleSelectedProduto(id: number): void {
    const current = this.selectedProdutoIdsSignal();
    this.selectedProdutoIdsSignal.set(
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]
    );
  }

  refreshProgress(): Observable<OnboardingProgress> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.onboardingV2Service.fetchProgress().pipe(
      tap((progress) => this.applyProgress(progress)),
      catchError((error) => this.handleError(error, 'Não foi possível carregar seu progresso agora.')),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  loadProdutosSugeridos(): Observable<ProdutoTemplate[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.onboardingV2Service.fetchProdutosSugeridos().pipe(
      tap((produtos) => {
        this.produtosSignal.set(produtos);
        this.selectedProdutoIdsSignal.set(produtos.filter((item) => item.preSelecionado).map((item) => item.id));
      }),
      catchError((error) => this.handleError(error, 'Não foi possível carregar os produtos sugeridos.')),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  saveCompany(payload: OnboardingV2CompanyPayload): Observable<OnboardingProgress> {
    this.savingSignal.set(true);
    this.errorSignal.set(null);

    return this.onboardingV2Service.saveCompany(payload).pipe(
      tap((progress) => this.applyProgress(progress)),
      catchError((error) => this.handleError(error, 'Não foi possível salvar os dados da empresa.')),
      finalize(() => this.savingSignal.set(false))
    );
  }

  saveProdutos(payload: OnboardingV2ProductsPayload): Observable<OnboardingProgress> {
    this.savingSignal.set(true);
    this.errorSignal.set(null);

    return this.onboardingV2Service.saveProdutos(payload).pipe(
      tap((progress) => this.applyProgress(progress)),
      catchError((error) => this.handleError(error, 'Não foi possível criar os produtos sugeridos agora.')),
      finalize(() => this.savingSignal.set(false))
    );
  }

  loadResumo(): Observable<OnboardingV2Summary> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.onboardingV2Service.fetchResumo().pipe(
      tap((resumo) => {
        this.resumoSignal.set(resumo);
        this.applyProgress(resumo);
      }),
      catchError((error) => this.handleError(error, 'Não foi possível carregar o resumo do onboarding.')),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  finishOnboarding(): Observable<OnboardingProgress> {
    this.savingSignal.set(true);
    this.errorSignal.set(null);

    return this.onboardingV2Service.finishOnboarding().pipe(
      tap((progress) => {
        this.applyProgress(progress);
        if (isOnboardingV2Finished(progress)) {
          const usuario = this.getUsuarioAtual();
          this.primeiroPedidoBoasVindasFlow.marcarOnboardingConcluido(usuario);
          if (usuario) {
            this.primeiroPedidoBoasVindas.avaliarEExibir(usuario);
          }
        }
      }),
      catchError((error) => this.handleError(error, 'Não foi possível finalizar o onboarding agora.')),
      finalize(() => this.savingSignal.set(false))
    );
  }

  syncRoute(router: Router, currentUrl?: string): void {
    const progress = this.progressSignal();
    if (!progress) {
      return;
    }

    if (isOnboardingV2Finished(progress)) {
      const defaultRoute = this.authService.getDefaultRouteForUsuario();
      if (currentUrl !== defaultRoute) {
        router.navigateByUrl(defaultRoute);
      }
      return;
    }

    const expectedUrl = resolveOnboardingV2RouteFromProgress(progress);
    if (currentUrl !== expectedUrl) {
      router.navigateByUrl(expectedUrl);
    }
  }

  private applyProgress(progress: OnboardingProgress): void {
    this.progressSignal.set(progress);
    if (Array.isArray(progress.produtosSugeridos)) {
      this.produtosSignal.set(progress.produtosSugeridos);
      this.selectedProdutoIdsSignal.set(
        progress.produtosSugeridos.filter((item) => item.preSelecionado).map((item) => item.id)
      );
      return;
    }

    this.produtosSignal.set([]);
    this.selectedProdutoIdsSignal.set([]);
  }

  private handleError(error: unknown, fallbackMessage: string) {
    const message = this.extractErrorMessage(error) ?? fallbackMessage;
    this.errorSignal.set(message);
    return throwError(() => error);
  }

  private extractErrorMessage(error: unknown): string | null {
    const httpError = error as { error?: { message?: string; mensagem?: string } };
    return httpError?.error?.message || httpError?.error?.mensagem || null;
  }

  private getUsuarioAtual() {
    try {
      return this.authService.getUsuario();
    } catch {
      return null;
    }
  }
}
