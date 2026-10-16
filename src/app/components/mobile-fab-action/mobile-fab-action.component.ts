import { TutorialTargetDirective } from 'src/app/shared/tutorial/tutorial-target.directive';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-mobile-fab-action',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, TutorialTargetDirective],
  templateUrl: './mobile-fab-action.component.html',
  styleUrls: ['./mobile-fab-action.component.scss']
})
export class MobileFabActionComponent {
  @Input() placement: 'legacy' | 'page' = 'legacy';
  @Input() disabled = false;
  @Input() tutorialTarget = '';
  @Input() label = '';
  @Input() icon = 'add';
  @Input() compact = false;
  @Input() ariaLabel = '';
  @Output() action = new EventEmitter<void>();

  emitAction(): void {
    if (!this.disabled) this.action.emit();
  }
}
