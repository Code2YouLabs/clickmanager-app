import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { LinksPreviewModel } from '../../models/links.models';
import { LinksPublicPreviewComponent } from '../public-preview/links-public-preview.component';

@Component({
  selector: 'app-links-preview-dialog',
  host: { '[class.mobile-side-panel__layout]': 'mobilePanel' },
  standalone: true,
  imports: [CommonModule, MaterialModule, LinksPublicPreviewComponent],
  templateUrl: './links-preview-dialog.component.html',
  styleUrls: ['./links-preview-dialog.component.scss'],
})
export class LinksPreviewDialogComponent {
  get mobilePanel(): boolean { return !!this.data.mobilePanel; }
  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: LinksPreviewModel & { mobilePanel?: boolean },
    private readonly dialogRef: MatDialogRef<LinksPreviewDialogComponent>
  ) {}

  fechar(): void {
    this.dialogRef.close();
  }
}
