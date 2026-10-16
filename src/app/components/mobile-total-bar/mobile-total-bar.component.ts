import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-mobile-total-bar',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, StatusBadgeComponent],
  templateUrl: './mobile-total-bar.component.html',
  styleUrls: ['./mobile-total-bar.component.scss'],
})
export class MobileTotalBarComponent {
  @Input() label = 'Total estimado';
  @Input() valueText = '';
  @Input() status: string | null | undefined = null;
  @Input() detailText = 'Ver detalhes';
  @Input() expandable = true;
  @Input() expanded = false;
  @Input() inlineDetails = false;
  @Input() detailsPanelId = '';
  @Input() loading = false;
  @Input() secondaryActionText = '';
  @Input() secondaryActionDisabled = false;
  @Input() secondaryActionAriaLabel = 'Executar ação secundária';
  @Input() actionText = '';
  @Input() actionDisabled = false;
  @Input() expandAriaLabel = 'Ver detalhes do cálculo';
  @Input() actionAriaLabel = 'Executar ação principal';
  @Input() bottomOffset = '0px';
  @Input() attachedToBottomNav = false;

  @Output() expand = new EventEmitter<void>();
  @Output() secondaryAction = new EventEmitter<void>();
  @Output() action = new EventEmitter<void>();

  private touchStartY: number | null = null;

  onRootClick(): void {
    if (!this.expandable || this.inlineDetails) {
      return;
    }
    this.expand.emit();
  }

  onRootKeydown(event: KeyboardEvent): void {
    if (!this.expandable || this.inlineDetails) {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.expand.emit();
  }

  onTouchStart(event: TouchEvent): void {
    if (this.inlineDetails) return;
    this.touchStartY = event.changedTouches[0]?.clientY ?? null;
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.expandable || this.inlineDetails) {
      this.touchStartY = null;
      return;
    }

    if (this.touchStartY == null) {
      return;
    }

    const endY = event.changedTouches[0]?.clientY ?? this.touchStartY;
    const deltaY = this.touchStartY - endY;
    this.touchStartY = null;

    if (deltaY > 24) {
      this.expand.emit();
    }
  }

  onExpandClick(event: Event): void {
    event.stopPropagation();
    if (this.expandable) this.expand.emit();
  }

  onActionClick(event: Event): void {
    event.stopPropagation();
    this.action.emit();
  }

  onSecondaryActionClick(event: Event): void {
    event.stopPropagation();
    this.secondaryAction.emit();
  }
}
