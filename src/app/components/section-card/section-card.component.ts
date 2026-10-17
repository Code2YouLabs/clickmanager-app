import { Component, Input, Output, EventEmitter, Optional, OnDestroy } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
import { MatIconModule } from '@angular/material/icon';
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
  imports: [CommonModule, MatCardModule, MatDividerModule, MatIconModule],
  templateUrl: './section-card.component.html',
  styleUrls: ['./section-card.component.scss'],
})
export class SectionCardComponent implements OnDestroy {
  private static nextId = 0;
  readonly bodyId = `section-card-body-${SectionCardComponent.nextId++}`;
  @Input() mobileCollapsible = false;
  @Input() mobileExpanded = true;
  @Input() mobileSummary = '';
  @Output() mobileExpandedChange = new EventEmitter<boolean>();
  isMobile = false;
  private readonly layoutChanges?: Subscription;
  constructor(@Optional() breakpoints?: BreakpointObserver) {
    this.layoutChanges = breakpoints?.observe(MOBILE_FOUNDATION_QUERY).subscribe(state => this.isMobile = state.matches);
  }
  ngOnDestroy(): void { this.layoutChanges?.unsubscribe(); }
  get collapsible(): boolean { return this.isMobile && this.mobileCollapsible; }
  toggle(): void { this.mobileExpandedChange.emit(!this.mobileExpanded); }
  /** Remove nested card chrome on small screens only. */
  @Input() mobilePlain = false;
  @Input() title?: string;
  @Input() titulo?: string;
  @Input() subtitle?: string;
  @Input() subtitulo?: string;
  @Input() divider: boolean = true;
  @Input() fixedHeight: boolean = false;

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
