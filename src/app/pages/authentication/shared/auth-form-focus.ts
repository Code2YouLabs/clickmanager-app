/** Keep validation focus inside the submitted form, including the password comparison. */
export function focusInvalidAuthInput(form: HTMLFormElement | undefined, fallbackSelector?: string): void {
  const invalid = form?.querySelector<HTMLInputElement>('input.ng-invalid')
    ?? (fallbackSelector ? form?.querySelector<HTMLInputElement>(fallbackSelector) : null);
  invalid?.focus();
  invalid?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
