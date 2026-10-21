import { AfterViewInit, Component, ElementRef, EventEmitter, Inject, OnDestroy, OnInit, Output } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { ConfirmDialogData } from './confirm-dialog.models';
import { ResponsiveConfirmationService } from './responsive-confirmation.service';

@Component({
  selector: 'app-confirm-dialog', standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  styleUrl: './confirm-dialog.component.scss', templateUrl: './confirm-dialog.component.html',
  host: { '[class.confirmation--destructive]': "data.type === 'destructive'", '[class.confirmation--warning]': "data.type === 'warning'", '[attr.aria-busy]': 'processing' },
})
export class ConfirmDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  private static nextId = 0;
  readonly messageId = `confirmation-message-${ConfirmDialogComponent.nextId++}`;
  @Output() confirmRequested = new EventEmitter<void>();
  mobile = false;
  private presentation?: Subscription;
  private settled = false;
  private originalDisableClose: boolean;

  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
    private readonly presentationService: ResponsiveConfirmationService,
    private readonly element: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void {
    this.originalDisableClose = !!this.dialogRef.disableClose;
    this.presentation = this.presentationService.attach(this.dialogRef, this.element.nativeElement, this.data, mobile => this.mobile = mobile);
    this.syncClosePolicy();
  }
  ngAfterViewInit(): void { this.presentationService.describe(this.element.nativeElement, this.messageId); }
  ngOnDestroy(): void { this.presentation?.unsubscribe(); }
  get processing(): boolean { return !!this.data.processing; }
  get canDismiss(): boolean { return !this.processing && !this.settled && this.data.closable !== false; }
  get confirmColor(): 'primary' | 'accent' | 'warn' {
    return this.data.type === 'destructive' ? 'warn' : this.data.confirmColor || (this.data.type === 'default' ? 'primary' : this.data.type === 'warning' ? 'accent' : 'warn');
  }
  get icon(): string { return this.data.icon || (this.mobile ? (this.data.type === 'destructive' ? 'warning_amber' : this.data.type === 'warning' ? 'info_outline' : 'help_outline') : ''); }
  confirm(): void {
    if (this.processing || this.data.disabled || this.settled) return;
    if (this.data.deferClose) { this.setProcessing(true); this.confirmRequested.emit(); }
    else { this.settled = true; this.dialogRef.close(true); }
  }
  dismiss(): void { if (this.canDismiss) { this.settled = true; this.dialogRef.close(false); } }
  setProcessing(processing: boolean, error?: string): void {
    this.data.processing = processing; this.data.error = error; this.syncClosePolicy();
  }
  finish(confirmed: boolean): void { this.settled = true; this.dialogRef.close(confirmed === true); }
  private syncClosePolicy(): void { this.dialogRef.disableClose = this.originalDisableClose || this.processing || this.data.closable === false; }
}
