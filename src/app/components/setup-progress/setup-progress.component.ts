import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';

export interface SetupProgress {
  id: number;
  status: 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'CONCLUIDO_COM_ALERTAS' | 'ERRO';
  fase: string;
  alertaPreparacao?: string | null;
  smartCalcPrevistos?: number;
  smartCalcPreparados?: number;
  total: number; processados: number; criados: number; duplicados: number; erros: number;
  tempoEstimadoRestanteSegundos: number | null;
  itens: { id: number; tipo: string; templateId: number; status: string; nome: string | null; mensagem: string | null; criadoId: number | null }[];
}
export function preparacaoAtiva(job: SetupProgress) { return job.status === 'PENDENTE' || job.status === 'PROCESSANDO'; }
type TaskState = 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'ALERTA';
interface PreparationTask { label: string; state: TaskState; detail?: string; catalog?: boolean; }

@Component({
  selector: 'app-setup-progress', standalone: true, imports: [CommonModule, MaterialModule],
  template: `
    <section class="setup-progress" [class.setup-progress--onboarding]="onboarding" aria-label="Progresso da preparação">
      @if (onboarding) {
        <h2>{{ titulo }}</h2>
        <p>{{ exibicaoAtiva ? 'Isso pode levar alguns instantes. Você não precisa fazer nada.' : 'Seu ClickManager foi preparado com os produtos e configurações que você escolheu.' }}</p>
        <ol class="setup-progress__tasks">
          @for (task of tarefas; track task.label) {
            <li [attr.data-state]="task.state">
              <span class="setup-progress__task-icon" [attr.aria-label]="task.state">
                @if (task.state === 'PROCESSANDO') { <mat-spinner diameter="20" aria-label="Processando" /> }
                @else { <mat-icon>{{ task.state === 'CONCLUIDO' ? 'check_circle' : task.state === 'ALERTA' ? 'warning' : 'radio_button_unchecked' }}</mat-icon> }
              </span>
              <div class="setup-progress__task-content">
                <strong>{{ task.label }}</strong>
                @if (task.detail) { <span>{{ task.detail }}</span> }
                @if (task.catalog) { <mat-progress-bar mode="determinate" [value]="percentual" aria-label="Progresso do catálogo" /> }
              </div>
            </li>
          }
        </ol>
        @if (!exibicaoAtiva) {
          <div class="setup-progress__contadores" aria-live="polite">
            @if (job.criados) { <span>{{ job.criados }} produtos e serviços adicionados</span> }
            @if (job.duplicados) { <span>{{ job.duplicados }} já existiam</span> }
            @if (job.smartCalcPreparados) { <span>{{ job.smartCalcPreparados }} produtos preparados para o SmartCalc</span> }
          </div>
        }
      } @else {
        <mat-icon>{{ ativa ? 'inventory_2' : (job.erros || job.alertaPreparacao ? 'info' : 'check_circle') }}</mat-icon>
        <h2>{{ titulo }}</h2>
        <p>{{ ativa ? 'Você pode fechar esta janela e continuar usando o sistema.' : 'Confira o resultado da preparação.' }}</p>
        <p class="fase" role="status">{{ fase }}</p>
        <strong>{{ job.processados }} de {{ job.total }} itens processados</strong>
        <mat-progress-bar mode="determinate" [value]="percentual" aria-label="Itens processados" />
        @if (ativa) { <p>{{ estimativa }}</p> }
        <div class="setup-progress__contadores" aria-live="polite">
          <span>{{ job.criados }} adicionados</span><span>{{ job.duplicados }} já existiam</span>
          @if (job.erros) { <span>{{ job.erros }} não puderam ser adicionados</span> }
        </div>
      }
      @if (!exibicaoAtiva && job.alertaPreparacao) { <p role="status">{{ job.alertaPreparacao }}</p> }
      @if (!exibicaoAtiva && job.erros) {
        <details><summary>Ver detalhes</summary>
          @for (item of job.itens; track item.id) {
            @if (item.status === 'ERRO') { <p>{{ item.nome || ('Item ' + item.templateId) }}: {{ item.mensagem }}</p> }
          }
          @if (!onboarding) { <small>Importação #{{ job.id }}</small> }
        </details>
      }
    </section>`,
  styles: [`
    .setup-progress { padding: 24px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 16px; }
    .setup-progress--onboarding { margin: 0; padding: 16px 0; border: 0; border-radius: 0; }
    h2 { margin: 12px 0; } p { color: var(--mat-sys-on-surface-variant); }
    mat-progress-bar { margin: 16px 0; } .fase { font-weight: 600; }
    .setup-progress__contadores { display: flex; flex-wrap: wrap; gap: 16px; margin: 16px 0; }
    .setup-progress__tasks { display: grid; gap: 18px; list-style: none; padding: 0; margin: 24px 0; }
    .setup-progress__tasks li { display: flex; align-items: flex-start; gap: 12px; }
    .setup-progress__task-icon { width: 24px; height: 24px; display: grid; place-items: center; color: var(--mat-sys-outline); }
    .setup-progress__tasks li[data-state='CONCLUIDO'] .setup-progress__task-icon { color: var(--mat-sys-primary); }
    .setup-progress__tasks li[data-state='ALERTA'] .setup-progress__task-icon { color: var(--mat-sys-error); }
    .setup-progress__task-content { display: grid; gap: 4px; flex: 1; }
    .setup-progress__task-content span { color: var(--mat-sys-on-surface-variant); }
    .setup-progress__task-content mat-progress-bar { margin: 6px 0 0; }
    details p { overflow-wrap: anywhere; }
  `],
})
export class SetupProgressComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) job!: SetupProgress;
  @Input() onboarding = false;
  @Input() animarEtapas = false;
  @Output() etapasConcluidas = new EventEmitter<void>();
  private etapaVisual = -1;
  private tempoMinimoDecorrido = false;
  private temporizador?: ReturnType<typeof setTimeout>;

  ngOnChanges(): void {
    if (this.onboarding && this.animarEtapas && this.etapaVisual === -1) {
      this.etapaVisual = 0;
      this.agendarProximaEtapa();
    } else if (this.animacaoAtiva) {
      this.avancarSePronto();
    }
  }

  ngOnDestroy(): void { clearTimeout(this.temporizador); }

  private get animacaoAtiva() { return this.etapaVisual >= 0 && this.etapaVisual < 5; }
  get exibicaoAtiva() { return this.ativa || this.animacaoAtiva; }

  private agendarProximaEtapa(): void {
    this.tempoMinimoDecorrido = false;
    this.temporizador = setTimeout(() => {
      this.tempoMinimoDecorrido = true;
      this.avancarSePronto();
    }, 2000);
  }

  private avancarSePronto(): void {
    if (!this.animacaoAtiva || !this.tempoMinimoDecorrido) return;
    const catalogoConcluido = this.job.processados >= this.job.total || !this.ativa;
    const pronta = this.etapaVisual < 2 ||
      (this.etapaVisual === 2 && catalogoConcluido) ||
      (this.etapaVisual === 3 && (!(this.job.smartCalcPrevistos || 0) || !this.ativa)) ||
      (this.etapaVisual === 4 && !this.ativa);
    if (!pronta) return;
    this.etapaVisual++;
    if (this.animacaoAtiva) this.agendarProximaEtapa();
    else this.etapasConcluidas.emit();
  }

  get ativa() { return preparacaoAtiva(this.job); }
  get percentual() { return this.job.total ? Math.min(100, this.job.processados * 100 / this.job.total) : 0; }
  get titulo() {
    if (this.job.status === 'ERRO') return 'Não foi possível concluir a preparação';
    if (!this.exibicaoAtiva) return this.onboarding ? 'Tudo pronto para você!' : 'Tudo pronto!';
    return this.onboarding ? 'Estamos preparando seu ClickManager' : 'Adicionando itens à sua empresa';
  }
  get tarefas(): PreparationTask[] {
    const catalogoConcluido = this.job.processados >= this.job.total && this.job.total > 0;
    const fim = !this.ativa;
    const smartCalc = (this.job.smartCalcPrevistos || 0) > 0;
    const preparandoSmartCalc = this.ativa && this.job.fase === 'FINALIZANDO' && smartCalc;
    const catalogo: TaskState = catalogoConcluido ? (this.job.erros ? 'ALERTA' : 'CONCLUIDO') : fim ? 'ALERTA' : 'PROCESSANDO';
    const preparacaoSmartCalc: TaskState = !smartCalc ? 'CONCLUIDO'
      : preparandoSmartCalc ? 'PROCESSANDO'
      : fim ? (this.job.alertaPreparacao || !this.job.smartCalcPreparados ? 'ALERTA' : 'CONCLUIDO') : 'PENDENTE';
    const finalizacao: TaskState = fim ? (this.job.status === 'ERRO' ? 'ALERTA' : 'CONCLUIDO')
      : catalogoConcluido && !preparandoSmartCalc ? 'PROCESSANDO' : 'PENDENTE';
    const tarefas: PreparationTask[] = [
      { label: 'Criando sua empresa', state: 'CONCLUIDO' },
      { label: 'Preparando estrutura inicial', state: 'CONCLUIDO' },
      { label: 'Criando seu catálogo', state: catalogo, detail: `${this.job.processados} de ${this.job.total} produtos e serviços`, catalog: true },
      { label: smartCalc ? 'Configurando SmartCalc' : 'SmartCalc', state: preparacaoSmartCalc,
        detail: smartCalc ? (fim && this.job.smartCalcPreparados ? `${this.job.smartCalcPreparados} produtos preparados` : undefined) : 'Nenhuma configuração inicial necessária' },
      { label: 'Finalizando sua configuração', state: finalizacao },
    ];
    if (!this.animacaoAtiva) return tarefas;
    return tarefas.map((tarefa, indice) => ({
      ...tarefa,
      state: indice < this.etapaVisual ? tarefa.state
        : indice === this.etapaVisual ? (indice === 3 && !smartCalc ? 'CONCLUIDO' : 'PROCESSANDO')
        : 'PENDENTE',
      catalog: tarefa.catalog && indice <= this.etapaVisual,
    }));
  }
  get fase() {
    if (this.job.status === 'CONCLUIDO_COM_ALERTAS' && this.job.alertaPreparacao && !this.job.erros) return 'Seu catálogo está pronto; uma configuração adicional precisa de atenção';
    return ({ AGUARDANDO: 'Sua preparação começará em instantes', IMPORTANDO_ITENS: 'Adicionando produtos e serviços ao catálogo',
      FINALIZANDO: 'Preparando recursos do sistema', CONCLUIDO: 'Seu catálogo está pronto', CONCLUIDO_COM_ALERTAS: 'Seu catálogo está pronto; alguns itens precisam de atenção', ERRO: 'Preparação interrompida' } as Record<string,string>)[this.job.fase] || 'Preparando catálogo';
  }
  get estimativa() {
    if (this.job.status === 'PENDENTE') return 'Estamos finalizando outra configuração antes da sua.';
    const segundos = this.job.tempoEstimadoRestanteSegundos;
    if (segundos == null) return 'Calculando tempo restante...';
    if (segundos < 60) return 'Menos de 1 minuto restante';
    const minutos = Math.ceil(segundos / 60);
    return `Cerca de ${minutos} ${minutos === 1 ? 'minuto restante' : 'minutos restantes'}`;
  }
}
