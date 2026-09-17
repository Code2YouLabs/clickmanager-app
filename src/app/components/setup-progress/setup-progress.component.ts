import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';

export interface SetupProgress {
  id: number;
  status: 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'CONCLUIDO_COM_ALERTAS' | 'ERRO';
  fase: string;
  alertaPreparacao?: string | null;
  total: number; processados: number; criados: number; duplicados: number; erros: number;
  tempoEstimadoRestanteSegundos: number | null;
  itens: { id: number; tipo: string; templateId: number; status: string; nome: string | null; mensagem: string | null; criadoId: number | null }[];
}
export function preparacaoAtiva(job: SetupProgress) { return job.status === 'PENDENTE' || job.status === 'PROCESSANDO'; }
@Component({
  selector: 'app-setup-progress', standalone: true, imports: [CommonModule, MaterialModule],
  template: `
    <section class="setup-progress" [class.setup-progress--onboarding]="onboarding" aria-label="Progresso da preparação">
      <mat-icon>{{ ativa ? 'inventory_2' : (job.erros || job.alertaPreparacao ? 'info' : 'check_circle') }}</mat-icon>
      <h2>{{ titulo }}</h2>
      <p>{{ ativa ? (onboarding ? 'Isso pode levar alguns instantes. Você não precisa fazer nada.' : 'Você pode fechar esta janela e continuar usando o sistema.') : (onboarding && job.status !== 'ERRO' ? 'Seu ClickManager está configurado e pronto para usar.' : 'Confira o resultado da preparação.') }}</p>
      <p class="fase" role="status">{{ fase }}</p>
      <strong>{{ job.processados }} de {{ job.total }} itens processados</strong>
      <mat-progress-bar mode="determinate" [value]="percentual" aria-label="Itens processados" />
      @if (ativa) { <p>{{ estimativa }}</p> }
      <div class="setup-progress__contadores" aria-live="polite">
        <span>{{ job.criados }} adicionados</span><span>{{ job.duplicados }} já existiam</span>
        @if (job.erros) { <span>{{ job.erros }} não puderam ser adicionados</span> }
      </div>
      @if (!ativa && job.alertaPreparacao) { <p role="status">{{ job.alertaPreparacao }}</p> }
      @if (!ativa && job.erros) {
        <details><summary>Ver detalhes</summary>
          @for (item of job.itens; track item.id) {
            @if (item.status === 'ERRO') { <p>{{ item.nome || ('Item ' + item.templateId) }}: {{ item.mensagem }}</p> }
          }
          <small>Importação #{{ job.id }}</small>
        </details>
      }
    </section>`,
  styles: [`
    .setup-progress { padding: 24px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 16px; }
    .setup-progress--onboarding { margin: 0; padding: 16px 0; border: 0; border-radius: 0; }
    h2 { margin: 12px 0; } p { color: var(--mat-sys-on-surface-variant); }
    mat-progress-bar { margin: 16px 0; } .fase { font-weight: 600; }
    .setup-progress__contadores { display: flex; flex-wrap: wrap; gap: 16px; margin: 16px 0; }
    details p { overflow-wrap: anywhere; }
  `],
})
export class SetupProgressComponent {
  @Input({ required: true }) job!: SetupProgress;
  @Input() onboarding = false;
  get ativa() { return preparacaoAtiva(this.job); }
  get percentual() { return this.job.total ? Math.min(100, this.job.processados * 100 / this.job.total) : 0; }
  get titulo() {
    if (this.job.status === 'ERRO') return 'Não foi possível concluir a preparação';
    if (!this.ativa) return 'Tudo pronto!';
    return this.onboarding ? 'Estamos preparando seu ClickManager' : 'Adicionando itens à sua empresa';
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
