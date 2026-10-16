import { InjectionToken, TemplateRef } from '@angular/core';

/** Generic presentation host. The declaring component keeps ownership of behavior and state. */
export interface MobileHeaderAction {
  template: TemplateRef<unknown>;
  visible: () => boolean;
}
export interface MobileHeaderActionsHost {
  enabled(): boolean;
  register(action: MobileHeaderAction): () => void;
}
export const MOBILE_HEADER_ACTIONS = new InjectionToken<MobileHeaderActionsHost>('MOBILE_HEADER_ACTIONS');
