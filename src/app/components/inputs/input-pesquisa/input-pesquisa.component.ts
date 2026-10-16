import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
import { ElementRef, ViewChild, inject, Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, OnInit, OnDestroy, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, debounce, timer, takeUntil, map, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-input-pesquisa', standalone: true,
  templateUrl: './input-pesquisa.component.html',
  styleUrl: './input-pesquisa.component.scss',
  host: { '[class.input-pesquisa--mobile-compact]': 'mobileCompact' },
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatIconModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputPesquisaComponent implements OnChanges, OnInit, OnDestroy {
  @Input() mobileCompact = true;
  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;
  readonly isMobile = toSignal(inject(BreakpointObserver).observe(MOBILE_FOUNDATION_QUERY)
    .pipe(map(state => state.breakpoints[MOBILE_FOUNDATION_QUERY] ?? state.matches)), { initialValue: false });
  focusFromPointer(event: PointerEvent): void {
    const input = this.searchInput?.nativeElement;
    if (this.isMobile() && input && event.target !== input && !input.disabled) {
      // Synchronous in the trusted pointer gesture, so mobile browsers can open the keyboard.
      input.focus({ preventScroll: true });
    }
  }
  @Input() placeholder = 'Digite para pesquisar...';
  @Input() showLabel = true;
  @Input() value = '';
  @Input() debounceMs = 400;
  @Input() compact = false;
  @Input() trim = false;
  @Input() pesquisaControl = new FormControl('', { nonNullable: true });
  @Output() valorAlterado = new EventEmitter<string>();
  private subscription?: Subscription;
  private readonly cancelPending = new Subject<void>();

  ngOnInit(): void { this.subscribe(); }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.cancelPending.next();
      this.pesquisaControl.setValue(this.value || '', { emitEvent: false });
      if (this.subscription) this.subscribe();
    } else if (changes['pesquisaControl'] && this.subscription) {
      this.subscribe();
    }
  }
  private subscribe(): void {
    this.subscription?.unsubscribe();
    this.subscription = this.pesquisaControl.valueChanges.pipe(
      map(value => this.trim ? value.trim() : value),
      debounce(() => timer(Math.max(0, this.debounceMs))),
      distinctUntilChanged((previous, current) => this.compact && previous === current),
      takeUntil(this.cancelPending)
    ).subscribe(value => this.valorAlterado.emit(value));
  }
  ngOnDestroy(): void { this.subscription?.unsubscribe(); this.cancelPending.complete(); }
}
