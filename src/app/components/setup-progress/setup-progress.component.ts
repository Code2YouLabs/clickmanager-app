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
  templateUrl: './setup-progress.component.html',
  styleUrls: ['./setup-progress.component.scss'],
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
