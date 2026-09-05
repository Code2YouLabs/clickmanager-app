import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';

export type OnboardingStatus = 'started' | 'company_completed' | 'products_completed' | 'finished';
export type OnboardingStep = 'company' | 'products' | 'summary';

export type ProdutoTemplateServiceItem = {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  valorBaseCentavos: number;
};

export type ProdutoTemplate = {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  destaque?: string | null;
  preSelecionado: boolean;
  ordemExibicao?: number | null;
  servicos: ProdutoTemplateServiceItem[];
  acabamentos: ProdutoTemplateServiceItem[];
};

export type OnboardingProgress = {
  onboardingVersion: 'v2' | string;
  status: OnboardingStatus;
  currentStep: OnboardingStep;
  onboardingConcluido: boolean;
  empresa: {
    id: number;
    nome: string;
    telefone?: string | null;
    email?: string | null;
    cnpj?: string | null;
    inscricaoEstadual?: string | null;
    horario?: string | null;
    tipoEmpresa?: TipoEmpresa | null;
    responsavelNome?: string | null;
    responsavelTelefone?: string | null;
    endereco?: {
      cep?: string | null;
      logradouro?: string | null;
      numero?: string | null;
      complemento?: string | null;
      bairro?: string | null;
      cidade?: string | null;
      estado?: string | null;
    } | null;
  };
  produtosSugeridos: ProdutoTemplate[];
  produtosCriados: {
    id: number;
    codigoTemplate?: string | null;
    nome: string;
    descricao?: string | null;
  }[];
  quantidadeProdutosCriados: number;
  startedAt?: string | null;
  companyCompletedAt?: string | null;
  productsCompletedAt?: string | null;
  finishedAt?: string | null;
};

export type OnboardingV2Summary = OnboardingProgress;

export type OnboardingV2RegisterRequest = {
  empresa: {
    nome: string;
    telefone?: string | null;
    email?: string | null;
    cnpj?: string | null;
    inscricaoEstadual?: string | null;
    horario?: string | null;
    tipoEmpresa?: TipoEmpresa | null;
    responsavelNome?: string | null;
    responsavelTelefone?: string | null;
    endereco?: {
      cep?: string | null;
      logradouro?: string | null;
      numero?: string | null;
      complemento?: string | null;
      bairro?: string | null;
      cidade?: string | null;
      estado?: string | null;
    } | null;
  };
  usuario: {
    nome: string;
    username: string;
    telefone?: string | null;
    senha: string;
  };
};

export type OnboardingV2RegisterResponse = {
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenType?: string | null;
  status?: OnboardingStatus | null;
  currentStep?: OnboardingStep | null;
} | null;

export type OnboardingV2CompanyPayload = {
  nome: string;
  telefone?: string | null;
  email?: string | null;
  cnpj?: string | null;
  inscricaoEstadual?: string | null;
  horario?: string | null;
  responsavelNome?: string | null;
  responsavelTelefone?: string | null;
  endereco?: {
    cep?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
  } | null;
};

export type OnboardingV2ProductsPayload = {
  produtoModeloIds: number[];
};

export const ONBOARDING_V2_STEP_ORDER: OnboardingStep[] = ['company', 'summary'];

export function resolveOnboardingV2Route(step: OnboardingStep): string {
  switch (step) {
    case 'company':
      return '/onboarding-v2/empresa';
    case 'products':
      return '/onboarding-v2/resumo';
    case 'summary':
      return '/onboarding-v2/resumo';
  }
}

export function resolveOnboardingV2StepFromProgress(
  progress: Pick<OnboardingProgress, 'status' | 'currentStep' | 'onboardingConcluido'>
): OnboardingStep {
  if (progress.status === 'products_completed' || progress.status === 'company_completed') {
    return 'summary';
  }

  return progress.currentStep;
}

export function resolveOnboardingV2RouteFromProgress(
  progress: Pick<OnboardingProgress, 'status' | 'currentStep' | 'onboardingConcluido'>
): string {
  return resolveOnboardingV2Route(resolveOnboardingV2StepFromProgress(progress));
}

export function isOnboardingV2Finished(progress: Pick<OnboardingProgress, 'status' | 'onboardingConcluido'>): boolean {
  return progress.status === 'finished' || progress.onboardingConcluido;
}

export function formatCentavosToBrl(valorBaseCentavos?: number | null): string | null {
  if (valorBaseCentavos == null || Number.isNaN(valorBaseCentavos)) {
    return null;
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valorBaseCentavos / 100);
}
