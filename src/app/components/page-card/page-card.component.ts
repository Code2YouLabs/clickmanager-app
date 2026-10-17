import { MOBILE_HEADER_ACTIONS, MobileHeaderAction, MobileHeaderActionsHost } from './mobile-header-actions';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { PageCardPrimaryAction } from './page-card-primary-action';
export type { PageCardPrimaryAction } from './page-card-primary-action';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
import { MobileFabActionComponent } from '../mobile-fab-action/mobile-fab-action.component';
import { forwardRef, signal, Optional, OnDestroy, OnChanges, Component, ContentChildren, Input, Output, EventEmitter, QueryList, ViewChild, ElementRef } from '@angular/core';
import { FormGroupDirective } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageFormState } from './page-form-state';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { CardHeaderComponent } from '../card-header/card-header.component';
import { TutorialTargetDirective } from 'src/app/shared/tutorial/tutorial-target.directive';

export interface PageCardMobileAction {
  label: string;
  icon?: string;
  disabled?: boolean;
  tutorialTarget?: string;
}

export type PageCardAction = { id: string; disabled?: boolean } & (
  { type: 'submit'; form: string; intent?: never; label?: string; icon?: string;
    pendingLabel?: string; color?: 'primary' | 'accent' | 'warn'; primary?: boolean; tutorialTarget?: string } |
  { type?: 'button'; form?: never; intent?: 'cancel'; label: string; icon?: string;
    pendingLabel?: string; color?: 'primary' | 'accent' | 'warn'; primary?: boolean; tutorialTarget?: string }
);

type ResolvedPageCardAction = {
  id: string; label: string; icon?: string; disabled?: boolean; pendingLabel?: string;
  color?: 'primary' | 'accent' | 'warn'; primary?: boolean;
  type?: 'submit' | 'button'; form?: string; intent?: 'cancel'; tutorialTarget?: string;
};

@Component({
  selector: 'app-page-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatButtonModule, MatIconModule, CardHeaderComponent, TutorialTargetDirective, MobileFabActionComponent, TemPermissaoDirective],
  providers: [{ provide: MOBILE_HEADER_ACTIONS, useExisting: forwardRef(() => PageCardComponent) }],
  host: { '[class.page-card-host--mobile-fab]': 'showMobilePrimaryAction' },
  templateUrl: './page-card.component.html',
  styleUrls: ['./page-card.component.scss'],
})
export class PageCardComponent implements OnDestroy, OnChanges, MobileHeaderActionsHost {
  /** Opt-in form actions above the mobile navigation. Desktop keeps its existing footer. */
  @Input() mobileStickyFooter = false;
  readonly footerKeyboardInset = signal(0);
  readonly stickyFooterHeight = signal(88);
  private footerResize?: ResizeObserver;
  private footerNode?: HTMLElement;
  private footerViewportCleanup?: () => void;
  @ViewChild('footerElement', { read: ElementRef }) set footerElement(value: ElementRef<HTMLElement> | undefined) {
    this.footerResize?.disconnect();
    this.footerResize = undefined; this.footerNode = value?.nativeElement;
    this.observeFooter();
  }
  private observeFooter(): void {
    if (!this.mobileStickyFooter || !this.isMobile()) { this.footerResize?.disconnect(); this.footerResize = undefined; return; }
    if (!this.footerNode || this.footerResize || typeof ResizeObserver === 'undefined') return;
    const node = this.footerNode;
    this.footerResize = new ResizeObserver(() => this.stickyFooterHeight.set(Math.ceil(node.getBoundingClientRect().height) + 16));
    this.footerResize.observe(node);
  }
  readonly contextualActions = signal<MobileHeaderAction[]>([]);
  enabled(): boolean { return this.isMobile() && this.mobileHeaderMode === 'standard'; }
  register(action: MobileHeaderAction): () => void {
    this.contextualActions.update(actions => [...actions, action]);
    return () => this.contextualActions.update(actions => actions.filter(item => item !== action));
  }
  /** Legacy is an explicit exception for pages with an independently designed mobile shell. */
  @Input() mobileHeaderMode: 'standard' | 'legacy' = 'standard';
  /** Compatibility overrides; common pages need neither input. */
  @Input() mobileCompact?: boolean;
  @Input() mobileTitleOnly?: boolean;
  @Input() primaryAction: PageCardPrimaryAction | null = null;
  @Output() primaryActionClick = new EventEmitter<void>();
  get compactMobileHeader(): boolean { return this.mobileCompact ?? this.mobileHeaderMode === 'standard'; }
  get titleOnlyMobileHeader(): boolean { return this.mobileTitleOnly ?? this.mobileHeaderMode === 'standard'; }
  get floatingPrimaryAction(): PageCardPrimaryAction | null { return this.primaryAction || this.mobilePrimaryAction; }
  get showMobilePrimaryAction(): boolean {
    return this.isMobile() && this.mobileHeaderMode === 'standard' && !!this.floatingPrimaryAction;
  }
  onPrimaryAction(): void {
    if (this.primaryAction && !this.mobilePrimaryActionDisabled) this.primaryActionClick.emit();
  }
  /** Visibility/authorization remains with the consumer, just like projected actions. */
  @Input() mobilePrimaryAction: PageCardMobileAction | null = null;
  @Output() mobilePrimaryActionClick = new EventEmitter<void>();
  readonly isMobile = signal(false);
  private readonly layoutChanges?: Subscription;

  // Keep direct construction used by existing form-state consumers compatible.
  constructor(@Optional() breakpoints?: BreakpointObserver) {
    this.layoutChanges = breakpoints?.observe(MOBILE_FOUNDATION_QUERY)
      .subscribe(state => { this.isMobile.set(state.matches); this.syncFooterViewport(); });
  }
  ngOnChanges(): void { this.syncFooterViewport(); }
  private syncFooterViewport(): void {
    this.observeFooter();
    if (!this.mobileStickyFooter || !this.isMobile()) {
      this.footerViewportCleanup?.(); this.footerViewportCleanup = undefined;
      this.footerKeyboardInset.set(0); return;
    }
    if (this.footerViewportCleanup || typeof window === 'undefined' || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const measure = () => this.footerKeyboardInset.set(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    viewport.addEventListener('resize', measure); viewport.addEventListener('scroll', measure); measure();
    this.footerViewportCleanup = () => { viewport.removeEventListener('resize', measure); viewport.removeEventListener('scroll', measure); };
  }
  ngOnDestroy(): void { this.layoutChanges?.unsubscribe(); this.footerResize?.disconnect(); this.footerViewportCleanup?.(); }

  get mobilePrimaryActionDisabled(): boolean {
    return this.saving || this.actionsDisabled || this.headerActionDisabled || !!this.floatingPrimaryAction?.disabled;
  }
  onMobilePrimaryAction(): void {
    if (!this.showMobilePrimaryAction || this.mobilePrimaryActionDisabled) return;
    if (this.primaryAction) this.onPrimaryAction();
    else this.mobilePrimaryActionClick.emit();
  }
  @Input() saving = false;
  @Input() savingText = 'Salvando...';
  @Input() actionsDisabled = false;
  @Input() headerActionDisabled = false;
  @Input() footerActions: PageCardAction[] = [];
  @Input() formState?: PageFormState<any>;
  @ContentChildren(FormGroupDirective, { descendants: true }) private forms?: QueryList<FormGroupDirective>;
  @Output() footerAction = new EventEmitter<string>();

  /** Cancelar e a apresentação de Salvar pertencem ao componente compartilhado. */
  get resolvedFooterActions(): ResolvedPageCardAction[] {
    const actions: ResolvedPageCardAction[] = this.footerActions
      .filter(action => action.intent !== 'cancel')
      .map(action => action.type === 'submit'
        ? { id: action.id, type: 'submit', form: action.form, disabled: action.disabled,
            label: 'Salvar', icon: 'save', primary: true, color: 'primary', tutorialTarget: action.tutorialTarget,
            pendingLabel: this.mobileStickyFooter ? action.pendingLabel : undefined }
        : action);
    return this.formState
      ? [{ id: 'cancel', label: 'Cancelar', intent: 'cancel' }, ...actions]
      : actions;
  }

  actionDisabled(action: ResolvedPageCardAction): boolean {
    return this.saving || this.actionsDisabled || !!action.disabled ||
      (action.intent === 'cancel' && !this.formState?.canReset);
  }

  onFooterAction(action: ResolvedPageCardAction): void {
    if (this.actionDisabled(action) || action.type === 'submit') return;
    if (action.intent === 'cancel') {
      this.formState!.reset();
      // Também limpa o estado submitted do Angular, sem submeter ou navegar.
      this.forms?.filter(item => item.form === this.formState!.form)
        .forEach(item => item.resetForm(item.form.getRawValue()));
      return;
    }
    this.footerAction.emit(action.id);
  }
  @Input() titulo: string = '';
  @Input() subtitulo?: string;
  @Input() botaoTexto?: string;
  @Input() botaoIcone: string = 'arrow_back';
  @Input() botaoCor: 'primary' | 'accent' | 'warn' = 'primary';
  @Input() botaoRota?: string | any[];
  @Input() permissao: string | string[] = '';
  @Input() mostrarDivisor: boolean = true;
  @Input() headerDivider?: boolean;
  @Input() contentPadding: boolean = true;
  @Input() showFooter: boolean = false;
  @Input() footerDivider: boolean = true;
  @Input() helpTexto: string = 'Ajuda';
  @Input() helpIcone: string = 'help_outline';
  @Input() helpRota?: string | any[];
  @Input() helpFragment?: string;
  @Input() helpExterno: boolean = false;

  get showHeaderDivider(): boolean {
    return this.headerDivider ?? this.mostrarDivisor;
  }
}
