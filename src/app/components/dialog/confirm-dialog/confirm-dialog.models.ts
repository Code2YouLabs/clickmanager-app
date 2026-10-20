export type ConfirmationType = 'default' | 'warning' | 'destructive';

/** Backwards-compatible boolean confirmation contract. No domain rules belong here. */
export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
  type?: ConfirmationType;
  icon?: string;
  details?: ReadonlyArray<{ label: string; value: string }>;
  processing?: boolean;
  processingText?: string;
  disabled?: boolean;
  closable?: boolean;
  showClose?: boolean;
  /** Opt-in: owner handles confirmRequested and calls finish(true) after success. */
  deferClose?: boolean;
  error?: string;
}
