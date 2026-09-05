import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ApiService } from 'src/app/services/api.service';
import {
  OnboardingProgress,
  OnboardingV2CompanyPayload,
  OnboardingV2ProductsPayload,
  OnboardingV2RegisterRequest,
  OnboardingV2RegisterResponse,
  OnboardingV2Summary,
  ProdutoTemplate,
} from '../models/onboarding-v2.models';

@Injectable({ providedIn: 'root' })
export class OnboardingV2Service {
  private readonly endpoint = 'api/onboarding/v2';
  private readonly onboardingEndpoint = 'api/onboarding';

  constructor(private readonly api: ApiService) {}

  registerEmpresa(payload: OnboardingV2RegisterRequest): Observable<OnboardingV2RegisterResponse> {
    return this.api.post<OnboardingV2RegisterResponse>(`${this.endpoint}/register-empresa`, payload);
  }

  registerEmpresaGoogle(payload: { credential?: string; accessToken?: string }): Observable<OnboardingV2RegisterResponse> {
    return this.api.post<OnboardingV2RegisterResponse>(`${this.endpoint}/google`, payload);
  }

  fetchProgress(): Observable<OnboardingProgress> {
    return this.api
      .get<OnboardingProgress | any>(`${this.endpoint}/progresso`)
      .pipe(map((response) => this.normalizeProgress(response)));
  }

  saveCompany(payload: OnboardingV2CompanyPayload): Observable<OnboardingProgress> {
    return this.api.put<OnboardingProgress>(`${this.endpoint}/empresa`, payload);
  }

  fetchProdutosSugeridos(): Observable<ProdutoTemplate[]> {
    return this.api.get<ProdutoTemplate[]>(`${this.endpoint}/produtos-sugeridos`);
  }

  saveProdutos(payload: OnboardingV2ProductsPayload): Observable<OnboardingProgress> {
    return this.api.post<OnboardingProgress>(`${this.endpoint}/produtos`, payload);
  }

  fetchResumo(): Observable<OnboardingV2Summary> {
    return this.fetchProgress();
  }

  finishOnboarding(): Observable<OnboardingProgress> {
    return this.api
      .post<void>(`${this.onboardingEndpoint}/nao-mostrar-mais`, {})
      .pipe(switchMap(() => this.fetchProgress()));
  }

  private normalizeProgress(response: Partial<OnboardingProgress> & Record<string, any>): OnboardingProgress {
    const empresa = (response?.empresa || {}) as Record<string, any>;
    const produtosCriados = Array.isArray(response?.produtosCriados) ? response.produtosCriados : [];

    return {
      ...response,
      onboardingVersion: response?.onboardingVersion || 'v2',
      status: response?.status || 'started',
      currentStep: response?.currentStep || 'company',
      onboardingConcluido: Boolean(response?.onboardingConcluido),
      empresa: {
        ...empresa,
        id: empresa['id'] ?? response?.['empresaId'] ?? 0,
        nome: empresa['nome'] ?? response?.['empresaNome'] ?? '',
        tipoEmpresa: empresa['tipoEmpresa'] ?? response?.['tipoEmpresa'] ?? null,
      },
      produtosSugeridos: Array.isArray(response?.produtosSugeridos) ? response.produtosSugeridos : [],
      produtosCriados,
      quantidadeProdutosCriados: Number(response?.quantidadeProdutosCriados ?? produtosCriados.length ?? 0),
    } as OnboardingProgress;
  }
}
