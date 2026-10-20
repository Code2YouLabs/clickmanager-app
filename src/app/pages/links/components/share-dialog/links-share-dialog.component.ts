import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { LinksSharePanelComponent } from '../share-panel/links-share-panel.component';

export interface LinksShareDialogData {
  mobilePanel?: boolean;
  titulo: string;
  url: string;
  slug: string;
}

@Component({
  selector: 'app-links-share-dialog',
  host: { '[class.mobile-side-panel__layout]': 'mobilePanel' },
  standalone: true,
  imports: [CommonModule, MaterialModule, LinksSharePanelComponent],
  templateUrl: './links-share-dialog.component.html',
  styles: [`.mobile-side-panel__header { display:flex;align-items:center;justify-content:space-between;gap:8px; } .mobile-side-panel__header h2 { min-width:0;margin:0;font-size:18px;line-height:24px;overflow-wrap:anywhere; } .mobile-side-panel__header button { flex-shrink:0; }`],
})
export class LinksShareDialogComponent {
  get mobilePanel(): boolean { return !!this.data.mobilePanel; }
  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: LinksShareDialogData,
    private readonly dialogRef: MatDialogRef<LinksShareDialogComponent>
  ) {}

  fechar(): void {
    this.dialogRef.close();
  }
}
