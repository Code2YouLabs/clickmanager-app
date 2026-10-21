import { CommonModule, CurrencyPipe, NgIf, NgFor } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { TablerIconsModule } from 'angular-tabler-icons';
import { PlanoPublico } from 'src/app/types/plano-publico.type';

@Component({
  selector: 'app-pricing-card',
  host: { '[class.pricing-card--mobile-compact]': 'mobileCompact' },
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, TablerIconsModule, CurrencyPipe, NgIf, NgFor],
  templateUrl: './pricing-card.component.html',
  styleUrls: ['./pricing-card.component.scss']
})
export class PricingCardComponent {
  @Input() mobileCompact = false;
  @Input() plano!: PlanoPublico;
  @Input() popular: boolean = false;
  @Input() imgSrc?: string;
  @Input() ativo: boolean = false;
  @Input() mostrarAnual: boolean = false;
  @Input() selecionarTexto: string = 'Escolher plano';
  @Output() escolher = new EventEmitter<PlanoPublico>();

  preco(plano: PlanoPublico): number {
    if (typeof plano.valorFinal === 'number' && Number.isFinite(plano.valorFinal)) {
      return plano.valorFinal;
    }

    const cents = plano.precoFinalCentavos ?? plano.preco_centavos ?? (plano as any).precoCentavos ?? 0;
    return Number.isFinite(cents) ? cents / 100 : 0;
  }

  precoOriginal(plano: PlanoPublico): number {
    if (typeof plano.valorOriginal === 'number' && Number.isFinite(plano.valorOriginal)) {
      return plano.valorOriginal;
    }

    const cents = plano.precoOriginalCentavos ?? plano.precoFinalCentavos ?? plano.preco_centavos ?? (plano as any).precoCentavos ?? 0;
    return Number.isFinite(cents) ? cents / 100 : 0;
  }

  precoAnual(plano: PlanoPublico): number {
    return this.preco(plano) * 12;
  }

  get valorExibicao(): number | null {
    const valor = this.mostrarAnual ? this.precoAnual(this.plano) : this.preco(this.plano);
    return Number.isFinite(valor) ? valor : null;
  }

  get precoMensal(): number | null {
    if (this.mostrarAnual) {
      return this.valorExibicao;
    }
    const total = this.preco(this.plano);
    const meses = this.periodicidadeMeses;
    if (!Number.isFinite(total) || meses <= 0) return null;
    return total / meses;
  }

  get valorCobranca(): number | null {
    const valor = this.preco(this.plano);
    return Number.isFinite(valor) ? valor : null;
  }

  get valorOriginalCobranca(): number | null {
    const valor = this.precoOriginal(this.plano);
    return Number.isFinite(valor) ? valor : null;
  }

  get periodicidadeMeses(): number {
    const periodicidade = `${this.plano?.periodicidade || ''}`.trim().toUpperCase();
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

  get periodicidadeLabel(): string {
    const periodicidade = `${this.plano?.periodicidade || ''}`.trim().toUpperCase();

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

  onEscolher(): void {
    this.escolher.emit(this.plano);
  }

  get beneficios(): string[] {
    return this.getBeneficios(this.plano);
  }

  get isFree(): boolean {
    return !this.preco(this.plano);
  }

  get vantagem(): string | null {
    const raw = this.plano?.vantagem ?? (this.plano as any)?.vantagem;
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  }

  get destaqueLabel(): string | null {
    const raw = this.plano?.destaque ?? (this.plano as any)?.destaque;
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  }

  get isDestaque(): boolean {
    return !!this.destaqueLabel;
  }

  get descricao(): string | null {
    const raw = this.plano?.descricao;
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  }

  get exibeValorCheioSecundario(): boolean {
    return !this.mostrarAnual && this.periodicidadeMeses > 1 && !this.isFree;
  }

  get hasDiscount(): boolean {
    const original = this.valorOriginalCobranca;
    const final = this.valorCobranca;
    return original !== null && final !== null && original > final;
  }

  get benefitCode(): string | null {
    const raw = this.plano?.benefitCode;
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  }
}
