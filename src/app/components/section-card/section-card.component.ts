import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';

/**
 * Card genérico para seções da aplicação.
 * - Aceita título e subtítulo opcionais.
 * - Mantém paddings e hierarquia visual consistentes.
 * - Usa projeção de conteúdo para corpo e ações.
 *
 * Uso:
 * <app-section-card title="Itens" subtitle="Adicione produtos">
 *   <!-- conteúdo -->
 * </app-section-card>
 *
 * <app-section-card title="Pagamentos">
 *   <div section-card-actions> <!-- conteúdo alinhado à direita no header --> </div>
 *   <!-- corpo -->
 * </app-section-card>
 */
@Component({
  selector: 'app-section-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule],
  templateUrl: './section-card.component.html',
  styleUrls: ['./section-card.component.scss'],
})
export class SectionCardComponent {
  @Input() title?: string;
  @Input() titulo?: string;
  @Input() subtitle?: string;
  @Input() subtitulo?: string;
  @Input() divider: boolean = false;

  get displayTitle(): string {
    return (this.title ?? this.titulo ?? '').trim();
  }

  get displaySubtitle(): string {
    return (this.subtitle ?? this.subtitulo ?? '').trim();
  }

  get showDivider(): boolean {
    return !!(this.displayTitle || this.displaySubtitle) && this.divider;
  }
}
