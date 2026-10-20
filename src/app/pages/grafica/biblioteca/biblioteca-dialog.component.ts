import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { BibliotecaProdutosSelectorComponent } from './biblioteca-produtos-selector.component';
@Component({
  standalone: true, imports: [MaterialModule, BibliotecaProdutosSelectorComponent],
  host: { '[class.mobile-side-panel__layout]': 'mobilePanel' },
  template: `
    @if (mobilePanel) {
      <header class="mobile-side-panel__header biblioteca-panel__header">
        <h2>Biblioteca de produtos</h2>
        <button mat-icon-button type="button" aria-label="Fechar biblioteca" (click)="ref.close(alterado)"><mat-icon>close</mat-icon></button>
      </header>
    } @else {
    <h2 mat-dialog-title class="dialog-head">
      <div class="dialog-head__copy">
        <strong>Biblioteca de produtos e serviços</strong>
        <span>Escolha itens prontos para sua empresa. Depois de adicionar, você pode editar os cadastros e preços livremente.</span>
      </div>
      <button mat-icon-button type="button" aria-label="Fechar biblioteca" (click)="ref.close(alterado)">
        <mat-icon>close</mat-icon>
      </button>
    </h2>
    }
    <mat-divider />
    <mat-dialog-content class="dialog-content" [class.mobile-side-panel__body]="mobilePanel">
      <app-biblioteca-produtos-selector #seletor [mostrarAcaoAdicionar]="false" [mostrarIntroducao]="false" [mobilePanel]="mobilePanel"
        (importado)="alterado = true" (ocupado)="ocupado = $event" />
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions" [class.mobile-side-panel__footer]="mobilePanel">
      <button mat-flat-button color="primary" type="button"
        [disabled]="ocupado || seletor.reconectando || !!seletor.erro || seletor.carregando || seletor.importando || !seletor.selecionados.size"
        (click)="seletor.adicionar()">{{ seletor.importando ? 'Adicionando...' : 'Adicionar à empresa' }}</button>
    </mat-dialog-actions>`,
  styleUrls: ['../../../components/dialog/dialog-form-shell.scss'],
  styles: [`
    :host(.mobile-side-panel__layout) { height: 100%; }
    .biblioteca-panel__header { display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .biblioteca-panel__header h2 { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; }
    .mobile-side-panel__footer button { width: 100%; }
    .dialog-head { padding: 20px 24px 16px; box-sizing: border-box; }
    .dialog-content { padding-top: 20px; }
    .dialog-actions { padding: 16px 24px; }
    @media (max-width: 600px) { .dialog-actions { grid-template-columns: 1fr; } }
  `],
})
export class BibliotecaDialogComponent {
  readonly mobilePanel = !!inject<{ mobilePanel?: boolean }>(MAT_DIALOG_DATA, { optional: true })?.mobilePanel;
  readonly ref = inject(MatDialogRef<BibliotecaDialogComponent>);
  ocupado = false;
  alterado = false;
}
