import { CommonModule, ViewportScroller } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MaterialModule } from 'src/app/material.module';
import { AcabamentoPadraoResumidoResponse } from 'src/app/models/acabamento-padrao/acabamento-padrao-resumido-response';
import { EntidadeBasica } from 'src/app/models/entidade-basica.model';
import { AuthService } from 'src/app/services/auth.service';
import { EmpresaFormComponent } from '../empresa/empresa-form.component';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import {
  ConcluirTarefaOnboardingRequest,
  OnboardingService,
  OnboardingStatusResponse,
  OnboardingStep,
} from 'src/app/components/onboarding/onboarding.service';
import { OnboardingShellComponent } from 'src/app/components/onboarding/onboarding-shell.component';
import {
  OnboardingSelectionOption,
  OnboardingSelectionStepComponent,
} from 'src/app/components/onboarding/onboarding-selection-step.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { OnboardingFlowService } from 'src/app/components/onboarding/onboarding-flow.service';

type OnboardingUiStepId =
  | 'empresa-dados'
  | 'empresa-logo'
  | 'empresa-endereco'
  | 'acabamentos'
  | 'cores'
  | 'formatos'
  | 'materiais'
  | 'servicos'
  | 'finalizacao';

interface OnboardingUiStepConfig {
  id: OnboardingUiStepId;
  title: string;
  subtitle: string;
  backendStep?: OnboardingStep;
  optional?: boolean;
}

type OpcaoPadrao = OnboardingSelectionOption;

interface OnboardingFinalStatusItem {
  label: string;
  status: 'done' | 'pending';
  text: string;
  stepId?: OnboardingUiStepId;
}

@Component({
  selector: 'app-onboarding-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    SectionCardComponent,
    EmpresaFormComponent,
    OnboardingShellComponent,
    OnboardingSelectionStepComponent,
  ],
  templateUrl: './onboarding-page.component.html',
  styleUrls: ['./onboarding-page.component.scss'],
})
export class OnboardingPageComponent implements OnInit {
  readonly naoMostrarMaisControl = new FormControl(false, { nonNullable: true });
  @ViewChild(EmpresaFormComponent) empresaFormComponent?: EmpresaFormComponent;
  private readonly reabrindoOnboarding: boolean;

  readonly steps: OnboardingUiStepConfig[] = [
    {
      id: 'empresa-dados',
      title: 'Vamos começar pela sua empresa',
      subtitle: 'Preencha as informações básicas para configurar seu sistema',
    },
    {
      id: 'empresa-logo',
      title: 'Agora envie sua logo',
      subtitle: 'Você pode ajustar a identidade visual da empresa antes de seguir',
    },
    {
      id: 'empresa-endereco',
      title: 'Confirme o endereço da empresa',
      subtitle: 'Complete os dados de localização para concluir esta etapa',
      backendStep: 'DADOS_EMPRESA',
    },
    {
      id: 'acabamentos',
      title: 'Acabamentos padrão',
      subtitle: 'Selecione os acabamentos mais usados para já começar com tudo pronto',
      backendStep: 'ACABAMENTOS_PADRAO',
      optional: true,
    },
    {
      id: 'cores',
      title: 'Cores mais usadas',
      subtitle: 'Crie sua base de cores para acelerar a criação de pedidos',
      backendStep: 'CORES_PADRAO',
      optional: true,
    },
    {
      id: 'formatos',
      title: 'Formatos mais usados',
      subtitle: 'Adicione os formatos mais comuns para agilizar seus orçamentos',
      backendStep: 'FORMATOS_PADRAO',
      optional: true,
    },
    {
      id: 'materiais',
      title: 'Materiais mais usados',
      subtitle: 'Selecione os materiais mais usados para começar com tudo pronto',
      backendStep: 'MATERIAIS_PADRAO',
      optional: true,
    },
    {
      id: 'servicos',
      title: 'Serviços mais oferecidos',
      subtitle: 'Escolha os serviços mais comuns para agilizar seu atendimento',
      backendStep: 'SERVICOS_PADRAO',
      optional: true,
    },
    {
      id: 'finalizacao',
      title: 'Finalização',
      subtitle: 'Revise o que já foi configurado e conclua sua preparação inicial.',
    },
  ];

  currentStepIndex = 0;
  carregandoStatus = true;
  salvandoEtapa = false;
  status?: OnboardingStatusResponse;

  acabamentosForm: FormGroup;
  coresForm: FormGroup;
  formatosForm: FormGroup;
  materiaisForm: FormGroup;
  servicosForm: FormGroup;
  finalForm: FormGroup;

  carregandoAcabamentos = true;
  carregandoCores = true;
  carregandoFormatos = true;
  carregandoMateriais = true;
  carregandoServicos = true;

  acabamentosPadrao: OpcaoPadrao[] = [];
  coresPadrao: OpcaoPadrao[] = [];
  formatosPadrao: OpcaoPadrao[] = [];
  materiaisPadrao: OpcaoPadrao[] = [];
  servicosPadrao: OpcaoPadrao[] = [];

  selecionadosAcabamentos = new Set<number>();
  selecionadosCores = new Set<number>();
  selecionadosFormatos = new Set<number>();
  selecionadosMateriais = new Set<number>();
  selecionadosServicos = new Set<number>();

  constructor(
    private fb: FormBuilder,
    private onboardingService: OnboardingService,
    private onboardingFlow: OnboardingFlowService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private viewportScroller: ViewportScroller,
    private dialog: MatDialog
  ) {
    this.reabrindoOnboarding = this.route.snapshot.queryParamMap.get('reabrir') === '1';
    this.acabamentosForm = this.buildSelectionForm();
    this.coresForm = this.buildSelectionForm();
    this.formatosForm = this.buildSelectionForm();
    this.materiaisForm = this.buildSelectionForm();
    this.servicosForm = this.buildSelectionForm();
    this.finalForm = this.fb.group({
      naoMostrarMais: this.naoMostrarMaisControl,
    });
  }

  ngOnInit(): void {
    if (!this.reabrindoOnboarding) {
      this.router.navigateByUrl('/onboarding-v2', { replaceUrl: true });
      return;
    }
    const usuario = this.authService.getUsuario();
    const naoMostrarMaisDefault = usuario.onboardingIgnorado ?? usuario.empresa?.onboardingIgnorado ?? false;
    this.finalForm.get('naoMostrarMais')?.setValue(naoMostrarMaisDefault);

    this.onboardingService.obterStatus().subscribe({
      next: (status) => {
        this.status = status;
        this.onboardingFlow.setStatus(status);
        if (status.onboardingConcluido && !this.reabrindoOnboarding) {
          this.router.navigate(['/dashboards/dashboard1']);
          return;
        }
        this.currentStepIndex = this.reabrindoOnboarding ? 0 : this.resolveCurrentStepIndex(status);
        this.carregandoStatus = false;
      },
      error: () => {
        this.showError('Erro ao carregar o onboarding inicial.');
        this.carregandoStatus = false;
      },
    });

    this.carregarAcabamentosPadrao();
    this.carregarCoresPadrao();
    this.carregarFormatosPadrao();
    this.carregarMateriaisPadrao();
    this.carregarServicosPadrao();
  }

  get currentStep(): OnboardingUiStepConfig {
    return this.steps[this.currentStepIndex];
  }

  get passoAtualLabel(): number {
    return this.currentStepIndex + 1;
  }

  get progressoPercentual(): number {
    return (this.passoAtualLabel / this.steps.length) * 100;
  }

  get progressoComplementar(): string {
    return this.isEtapaEmpresa ? 'leva menos de 1 minuto' : '';
  }

  get totalPassos(): number {
    return this.steps.length;
  }

  get empresaNome(): string {
    return this.status?.empresaNome || this.authService.getUsuario()?.empresa?.nome || 'Sua empresa';
  }

  get deveMostrarFooter(): boolean {
    return true;
  }

  get isEtapaEmpresa(): boolean {
    return ['empresa-dados', 'empresa-logo', 'empresa-endereco'].includes(this.currentStep.id);
  }

  get secaoOnboardingEmpresa(): 'empresa' | 'logo' | 'endereco' {
    switch (this.currentStep.id) {
      case 'empresa-logo':
        return 'logo';
      case 'empresa-endereco':
        return 'endereco';
      default:
        return 'empresa';
    }
  }

  get podeVoltar(): boolean {
    return this.currentStepIndex > 0;
  }

  get podePular(): boolean {
    return !!this.currentStep.optional && !this.isEtapaSelecao;
  }

  get isEtapaSelecao(): boolean {
    return ['acabamentos', 'cores', 'formatos', 'materiais', 'servicos'].includes(this.currentStep.id);
  }

  get possuiSelecaoAtual(): boolean {
    switch (this.currentStep.id) {
      case 'acabamentos':
        return this.selecionadosAcabamentos.size > 0;
      case 'cores':
        return this.selecionadosCores.size > 0;
      case 'formatos':
        return this.selecionadosFormatos.size > 0;
      case 'materiais':
        return this.selecionadosMateriais.size > 0;
      case 'servicos':
        return this.selecionadosServicos.size > 0;
      default:
        return false;
    }
  }

  get tituloAcaoPrincipal(): string {
    if (this.isEtapaSelecao) {
      return this.possuiSelecaoAtual ? 'Salvar e continuar →' : 'Pular e continuar →';
    }

    switch (this.currentStep.id) {
      case 'empresa-dados':
      case 'empresa-logo':
        return 'Continuar →';
      case 'empresa-endereco':
        return 'Salvar e continuar →';
      case 'finalizacao':
        return 'Começar a usar o sistema →';
      default:
        return 'Salvar e continuar →';
    }
  }

  get dicaAcaoPrincipal(): string {
    switch (this.currentStep.id) {
      case 'empresa-dados':
        return this.empresaFormComponent && !this.empresaFormComponent.isCurrentSectionValid()
          ? 'Preencha os campos obrigatórios para continuar.'
          : '';
      case 'empresa-endereco':
        return this.empresaFormComponent?.form?.invalid ? 'Revise os campos obrigatórios antes de continuar.' : '';
      case 'acabamentos':
        return 'Selecione os mais usados (recomendado) ou continue';
      case 'cores':
        return 'Selecione os mais usados (recomendado) ou continue';
      case 'formatos':
        return 'Selecione os mais usados (recomendado) ou continue';
      case 'materiais':
        return 'Selecione os mais usados (recomendado) ou continue';
      case 'servicos':
        return 'Selecione os mais usados (recomendado) ou continue';
      default:
        return '';
    }
  }

  get acaoPrincipalDesabilitada(): boolean {
    if (this.salvandoEtapa) {
      return true;
    }

    switch (this.currentStep.id) {
      case 'empresa-dados':
        return !this.empresaFormComponent || !this.empresaFormComponent.isCurrentSectionValid();
      case 'empresa-logo':
        return false;
      case 'empresa-endereco':
        return !this.empresaFormComponent?.form || this.empresaFormComponent.form.invalid;
      case 'acabamentos':
        return this.carregandoAcabamentos;
      case 'cores':
        return this.carregandoCores;
      case 'formatos':
        return this.carregandoFormatos;
      case 'materiais':
        return this.carregandoMateriais;
      case 'servicos':
        return this.carregandoServicos;
      default:
        return false;
    }
  }

  get resumoConfiguracao(): string[] {
    return [
      this.buildResumoLinha('Acabamentos', this.selecionadosAcabamentos.size),
      this.buildResumoLinha('Cores', this.selecionadosCores.size),
      this.buildResumoLinha('Formatos', this.selecionadosFormatos.size),
      this.buildResumoLinha('Materiais', this.selecionadosMateriais.size),
      this.buildResumoLinha('Serviços', this.selecionadosServicos.size),
    ];
  }

  get statusFinalizacao(): OnboardingFinalStatusItem[] {
    return [
      { label: 'Empresa', status: 'done', text: 'Empresa configurada' },
      this.buildStatusFinal('Acabamentos', this.selecionadosAcabamentos.size, 'configurados', 'não configurados', 'acabamentos'),
      this.buildStatusFinal('Cores', this.selecionadosCores.size, 'definidas', 'não configuradas', 'cores'),
      this.buildStatusFinal('Formatos', this.selecionadosFormatos.size, 'definidos', 'não configurados', 'formatos'),
      this.buildStatusFinal('Materiais', this.selecionadosMateriais.size, 'definidos', 'não configurados', 'materiais'),
      this.buildStatusFinal('Serviços', this.selecionadosServicos.size, 'definidos', 'não configurados', 'servicos'),
    ];
  }

  voltarEtapa(): void {
    if (!this.podeVoltar) {
      return;
    }

    this.currentStepIndex -= 1;
    this.scrollToTop();
  }

  pularEtapa(): void {
    if (!this.podePular) {
      return;
    }

    this.showInfo('Você pode configurar depois');
    this.avancarEtapa();
  }

  solicitarSaida(): void {
    const usuario = this.authService.getUsuario();
    const usuarioId = usuario.id ?? null;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Sair da configuração',
        message:
          'Você ainda não terminou a configuração inicial. Sem isso, algumas funcionalidades podem não funcionar corretamente.',
        confirmText: 'Sair mesmo assim',
        cancelText: 'Continuar configurando',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((confirmado) => {
      if (!confirmado) {
        return;
      }

      if (usuarioId) {
        this.onboardingFlow.markDismissed(usuarioId);
      }
      this.router.navigate(['/dashboards/dashboard1']);
    });
  }

  onEmpresaSalva(): void {
    this.showSuccess();
    this.avancarEtapa();
  }

  irParaEtapa(stepId: OnboardingUiStepId): void {
    const nextIndex = this.steps.findIndex((step) => step.id === stepId);
    if (nextIndex < 0) {
      return;
    }

    this.currentStepIndex = nextIndex;
    this.scrollToTop();
  }

  executarAcaoPrincipal(): void {
    switch (this.currentStep.id) {
      case 'empresa-dados':
      case 'empresa-logo':
        this.avancarEtapa();
        return;
      case 'empresa-endereco':
        this.empresaFormComponent?.onSubmit();
        return;
      case 'acabamentos':
        if (!this.selecionadosAcabamentos.size) {
          this.avancarEtapa();
          return;
        }
        this.salvarEtapaSelecao('ACABAMENTOS_PADRAO', Array.from(this.selecionadosAcabamentos), 'Acabamentos padrão adicionados com sucesso.', 'Erro ao cadastrar acabamentos padrão.');
        return;
      case 'cores':
        if (!this.selecionadosCores.size) {
          this.avancarEtapa();
          return;
        }
        this.salvarEtapaSelecao('CORES_PADRAO', Array.from(this.selecionadosCores), 'Cores padrão adicionadas com sucesso.', 'Erro ao cadastrar cores padrão.');
        return;
      case 'formatos':
        if (!this.selecionadosFormatos.size) {
          this.avancarEtapa();
          return;
        }
        this.salvarEtapaSelecao('FORMATOS_PADRAO', Array.from(this.selecionadosFormatos), 'Formatos padrão adicionados com sucesso.', 'Erro ao cadastrar formatos padrão.');
        return;
      case 'materiais':
        if (!this.selecionadosMateriais.size) {
          this.avancarEtapa();
          return;
        }
        this.salvarEtapaSelecao('MATERIAIS_PADRAO', Array.from(this.selecionadosMateriais), 'Materiais padrão adicionados com sucesso.', 'Erro ao cadastrar materiais padrão.');
        return;
      case 'servicos':
        if (!this.selecionadosServicos.size) {
          this.avancarEtapa();
          return;
        }
        this.salvarEtapaSelecao('SERVICOS_PADRAO', Array.from(this.selecionadosServicos), 'Serviços padrão adicionados com sucesso.', 'Erro ao cadastrar serviços padrão.');
        return;
      case 'finalizacao':
        this.finalizarOnboarding();
        return;
      default:
        return;
    }
  }

  toggleAcabamento(event: { checked: boolean; id: number }): void {
    this.atualizarSelecionados(event.checked, event.id, this.selecionadosAcabamentos, this.acabamentosForm);
  }

  toggleCor(event: { checked: boolean; id: number }): void {
    this.atualizarSelecionados(event.checked, event.id, this.selecionadosCores, this.coresForm);
  }

  toggleFormato(event: { checked: boolean; id: number }): void {
    this.atualizarSelecionados(event.checked, event.id, this.selecionadosFormatos, this.formatosForm);
  }

  toggleMaterial(event: { checked: boolean; id: number }): void {
    this.atualizarSelecionados(event.checked, event.id, this.selecionadosMateriais, this.materiaisForm);
  }

  toggleServico(event: { checked: boolean; id: number }): void {
    this.atualizarSelecionados(event.checked, event.id, this.selecionadosServicos, this.servicosForm);
  }

  selecionarTodosAcabamentos(checked: boolean): void {
    this.selecionarTodos(checked, this.acabamentosPadrao, this.selecionadosAcabamentos, this.acabamentosForm);
  }

  selecionarTodasCores(checked: boolean): void {
    this.selecionarTodos(checked, this.coresPadrao, this.selecionadosCores, this.coresForm);
  }

  selecionarTodosFormatos(checked: boolean): void {
    this.selecionarTodos(checked, this.formatosPadrao, this.selecionadosFormatos, this.formatosForm);
  }

  selecionarTodosMateriais(checked: boolean): void {
    this.selecionarTodos(checked, this.materiaisPadrao, this.selecionadosMateriais, this.materiaisForm);
  }

  selecionarTodosServicos(checked: boolean): void {
    this.selecionarTodos(checked, this.servicosPadrao, this.selecionadosServicos, this.servicosForm);
  }

  private buildSelectionForm(): FormGroup {
    return this.fb.group({
      selecionadosIds: new FormControl<number[]>([], []),
    });
  }

  private resolveCurrentStepIndex(status: OnboardingStatusResponse): number {
    const dadosEmpresa = status.steps.find((item) => item.step === 'DADOS_EMPRESA');
    if (dadosEmpresa && !dadosEmpresa.concluido) {
      return this.steps.findIndex((step) => step.id === 'empresa-dados');
    }

    const firstIncompleteBackendIndex = this.steps.findIndex((step) => {
      if (!step.backendStep) {
        return false;
      }

      const stepStatus = status.steps.find((item) => item.step === step.backendStep);
      return !stepStatus?.concluido;
    });

    if (firstIncompleteBackendIndex >= 0) {
      return firstIncompleteBackendIndex;
    }

    return this.steps.findIndex((step) => step.id === 'finalizacao');
  }

  private avancarEtapa(): void {
    if (this.currentStepIndex >= this.steps.length - 1) {
      return;
    }

    this.currentStepIndex += 1;
    this.scrollToTop();
  }

  private scrollToTop(): void {
    setTimeout(() => this.viewportScroller.scrollToPosition([0, 0]), 0);
  }

  private salvarEtapaSelecao(
    step: OnboardingStep,
    ids: number[],
    successMessage: string,
    errorMessage: string
  ): void {
    this.salvandoEtapa = true;

    const payload: ConcluirTarefaOnboardingRequest = { step };
    if (step === 'ACABAMENTOS_PADRAO') payload['acabamentosSelecionadosIds'] = ids;
    if (step === 'CORES_PADRAO') payload['coresSelecionadasIds'] = ids;
    if (step === 'FORMATOS_PADRAO') payload['formatosSelecionadosIds'] = ids;
    if (step === 'MATERIAIS_PADRAO') payload['materiaisSelecionadosIds'] = ids;
    if (step === 'SERVICOS_PADRAO') payload['servicosSelecionadosIds'] = ids;

    this.onboardingService.concluirTarefa(payload).subscribe({
      next: () => {
        this.salvandoEtapa = false;
        this.onboardingFlow.loadStatus(true).subscribe({ next: (status) => this.onboardingFlow.setStatus(status) });
        this.showSuccess(successMessage);
        this.avancarEtapa();
      },
      error: () => {
        this.salvandoEtapa = false;
        this.showError(errorMessage);
      },
    });
  }

  private finalizarOnboarding(): void {
    this.salvandoEtapa = true;
    const usuarioId = this.authService.getUsuario().id ?? null;

    if (!this.naoMostrarMais) {
      this.salvandoEtapa = false;
      if (usuarioId) {
        this.onboardingFlow.clearDismissed(usuarioId);
      }
      this.showSuccess('Onboarding concluído');
      this.router.navigate(['/dashboards/dashboard1']);
      return;
    }

    this.onboardingService.desativarOnboarding().subscribe({
      next: () => {
        this.authService.carregarUsuarioCompleto().subscribe({
          next: () => {
            this.salvandoEtapa = false;
            if (usuarioId) {
              this.onboardingFlow.clearDismissed(usuarioId);
            }
            this.showSuccess('Onboarding concluído');
            this.router.navigate(['/dashboards/dashboard1']);
          },
          error: () => {
            this.salvandoEtapa = false;
            this.router.navigate(['/dashboards/dashboard1']);
          },
        });
      },
      error: () => {
        this.salvandoEtapa = false;
        this.showError('Erro ao concluir o onboarding.');
      },
    });
  }

  private atualizarSelecionados(
    checked: boolean,
    id: number,
    selecionados: Set<number>,
    form: FormGroup
  ): void {
    if (checked) {
      selecionados.add(id);
    } else {
      selecionados.delete(id);
    }

    form.get('selecionadosIds')?.setValue(Array.from(selecionados));
  }

  private selecionarTodos(
    checked: boolean,
    lista: OpcaoPadrao[],
    selecionados: Set<number>,
    form: FormGroup
  ): void {
    selecionados.clear();
    if (checked) {
      lista.forEach((item) => selecionados.add(item.id));
    }

    form.get('selecionadosIds')?.setValue(Array.from(selecionados));
  }

  private carregarAcabamentosPadrao(): void {
    this.onboardingService.listarAcabamentosPadrao().subscribe({
      next: (lista) => {
        this.acabamentosPadrao = this.mapBasicos(lista);
        this.carregandoAcabamentos = false;
      },
      error: () => {
        this.showError('Erro ao carregar acabamentos padrão.');
        this.carregandoAcabamentos = false;
      },
    });
  }

  private carregarCoresPadrao(): void {
    this.onboardingService.listarCoresPadrao().subscribe({
      next: (lista) => {
        this.coresPadrao = this.mapBasicos(lista);
        this.carregandoCores = false;
      },
      error: () => {
        this.showError('Erro ao carregar cores padrão.');
        this.carregandoCores = false;
      },
    });
  }

  private carregarFormatosPadrao(): void {
    this.onboardingService.listarFormatosPadrao().subscribe({
      next: (lista) => {
        this.formatosPadrao = this.mapBasicos(lista);
        this.carregandoFormatos = false;
      },
      error: () => {
        this.showError('Erro ao carregar formatos padrão.');
        this.carregandoFormatos = false;
      },
    });
  }

  private carregarMateriaisPadrao(): void {
    this.onboardingService.listarMateriaisPadrao().subscribe({
      next: (lista) => {
        this.materiaisPadrao = this.mapBasicos(lista);
        this.carregandoMateriais = false;
      },
      error: () => {
        this.showError('Erro ao carregar materiais padrão.');
        this.carregandoMateriais = false;
      },
    });
  }

  private carregarServicosPadrao(): void {
    this.onboardingService.listarServicosPadrao().subscribe({
      next: (lista) => {
        this.servicosPadrao = this.mapBasicos(lista);
        this.carregandoServicos = false;
      },
      error: () => {
        this.showError('Erro ao carregar serviços padrão.');
        this.carregandoServicos = false;
      },
    });
  }

  private mapBasicos(lista: Array<AcabamentoPadraoResumidoResponse | EntidadeBasica>): OpcaoPadrao[] {
    return lista.map((item) => ({
      id: item.id,
      nome: item.nome,
    }));
  }

  private buildResumoLinha(label: string, quantidade: number): string {
    return quantidade ? `${label}: ${quantidade} item(ns) selecionado(s)` : `${label}: ainda não configurado`;
  }

  private buildStatusFinal(
    label: string,
    quantidade: number,
    configuredSuffix: string,
    pendingText = 'não configurados',
    stepId?: OnboardingUiStepId
  ): OnboardingFinalStatusItem {
    return {
      label,
      status: quantidade > 0 ? 'done' : 'pending',
      text: quantidade > 0 ? `${label} ${configuredSuffix}` : `${label} ${pendingText}`,
      stepId,
    };
  }

  private showSuccess(message = 'Salvo com sucesso'): void {
    this.toastr.success(message, '', {
      timeOut: 2400,
      extendedTimeOut: 500,
      progressBar: false,
      closeButton: false,
      positionClass: 'toast-top-center',
    });
  }

  private showInfo(message: string): void {
    this.toastr.info(message, '', {
      timeOut: 2400,
      extendedTimeOut: 500,
      progressBar: false,
      closeButton: false,
      positionClass: 'toast-top-center',
    });
  }

  private showError(message: string): void {
    this.toastr.error(message, '', {
      timeOut: 3200,
      extendedTimeOut: 800,
      progressBar: false,
      closeButton: false,
      positionClass: 'toast-top-center',
    });
  }

  get naoMostrarMais(): boolean {
    return this.finalForm.get('naoMostrarMais')?.value === true;
  }
}
