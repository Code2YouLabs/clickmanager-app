import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { BibliotecaProdutosSelectorComponent } from './biblioteca-produtos-selector.component';
@Component({
  standalone: true, imports: [MaterialModule, BibliotecaProdutosSelectorComponent],
  template: `
    <h2 mat-dialog-title class="dialog-head">
      <div class="dialog-head__copy">
        <strong>Biblioteca de produtos e serviços</strong>
        <span>Escolha itens prontos para sua empresa. Depois de adicionar, você pode editar os cadastros e preços livremente.</span>
      </div>
      <button mat-icon-button type="button" aria-label="Fechar biblioteca" [disabled]="ocupado" (click)="ref.close(alterado)">
        <mat-icon>close</mat-icon>
      </button>
    </h2>
    <mat-divider />
    <mat-dialog-content class="dialog-content">
      <app-biblioteca-produtos-selector #seletor [mostrarAcaoAdicionar]="false" [mostrarIntroducao]="false"
        (importado)="alterado = true" (ocupado)="ocupado = $event; ref.disableClose = $event" />
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-flat-button color="primary" type="button"
        [disabled]="seletor.carregando || seletor.importando || !seletor.selecionados.size"
        (click)="seletor.adicionar()">{{ seletor.importando ? 'Adicionando...' : 'Adicionar à empresa' }}</button>
    </mat-dialog-actions>`,
  styleUrls: ['../../../components/dialog/dialog-form-shell.scss'],
  styles: [`
    .dialog-head { padding: 20px 24px 16px; box-sizing: border-box; }
    .dialog-content { padding-top: 20px; }
    .dialog-actions { padding: 16px 24px; }
    @media (max-width: 600px) { .dialog-actions { grid-template-columns: 1fr; } }
  `],
})
export class BibliotecaDialogComponent {
  readonly ref = inject(MatDialogRef<BibliotecaDialogComponent>);
  ocupado = false;
  alterado = false;
}
