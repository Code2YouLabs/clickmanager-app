import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';

@Component({
  selector: 'app-onboarding-shell',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './onboarding-shell.component.html',
  styleUrls: ['./onboarding-shell.component.scss'],
})
export class OnboardingShellComponent {
  @Input() tituloFluxo = 'Configuração inicial';
  @Input() tituloEtapa = '';
  @Input() subtituloEtapa = '';
  @Input() progressoComplementar = '';
  @Input() passoAtual = 1;
  @Input() totalPassos = 1;
  @Input() progressoPercentual = 0;
  @Input() navigationInHeader = false;
  @Input() showExit = true;
  @Input() showFooter = true;
  @Input() showBack = true;
  @Input() showSkip = false;
  @Input() showPrimary = true;
  @Input() primaryLabel = 'Próximo';
  @Input() primaryDisabled = false;
  @Input() primaryLoading = false;
  @Input() primaryHint = '';

  @Output() voltar = new EventEmitter<void>();
  @Output() pular = new EventEmitter<void>();
  @Output() principal = new EventEmitter<void>();
  @Output() sair = new EventEmitter<void>();
}
