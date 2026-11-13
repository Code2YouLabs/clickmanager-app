import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TablerIconsModule } from 'angular-tabler-icons';

export type MetricCardAccent = 'primary' | 'warning' | 'success' | 'neutral';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule, TablerIconsModule],
  templateUrl: './metric-card.component.html',
  styleUrl: './metric-card.component.scss',
})
export class MetricCardComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() detail = '';
  @Input() info = '';
  @Input() icon = 'info-circle';
  @Input() accent: MetricCardAccent = 'primary';
  @Input() accentColor: string | null = null;
  @Input() compact = false;
  @Input() disabled = false;
}
