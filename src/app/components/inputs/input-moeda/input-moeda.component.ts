import {
  Component,
  Input,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  OnDestroy,
  SimpleChanges,
  OnChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-input-moeda',
  standalone: true,
  templateUrl: './input-moeda.component.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputMoedaComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() inputMode: 'decimal' | 'numeric' | null = null;
  @Input() control!: FormControl;
  @Input() label: string = 'Valor';
  @ViewChild('inputRef') inputRef!: ElementRef<HTMLInputElement>;

  valorFormatado = '';
  private sub?: Subscription;
  private atualizando = false;

  ngOnInit(): void {
    if (!this.control) throw new Error('FormControl é obrigatório');
    this.bindControl(this.control);            // <— bind inicial
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['control'] && !changes['control'].firstChange && changes['control'].currentValue) {
      this.bindControl(changes['control'].currentValue);  // <— rebind quando trocar
    }
  }

  ngAfterViewInit(): void {
    // garante que o input mostra o estado atual
    this.inputRef.nativeElement.value = this.valorFormatado;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private bindControl(ctrl: FormControl) {
    // desfaz inscrição anterior
    this.sub?.unsubscribe();

    // reaplica validators e evita loops
    const existing = ctrl.validator ? [ctrl.validator] : [];
    ctrl.setValidators([...existing, Validators.max(999999999999.99)]);
    ctrl.updateValueAndValidity({ emitEvent: false });

    // atualiza refs
    this.control = ctrl;
    this.valorFormatado = this.formatarParaMoeda(ctrl.value);
    if (this.inputRef) this.inputRef.nativeElement.value = this.valorFormatado;

    // espelha mudanças externas
    this.sub = ctrl.valueChanges.subscribe((valor) => {
      if (this.atualizando) return;
      const display = this.formatarParaMoeda(valor);
      this.valorFormatado = display;
      if (this.inputRef && this.inputRef.nativeElement.value !== display) {
        this.inputRef.nativeElement.value = display;
      }
    });
  }

  onInput(event: Event): void {
    if (this.atualizando) return;
    this.atualizando = true;

    const el = this.inputRef.nativeElement;
    const raw = (event.target as HTMLInputElement).value ?? '';
    const digits = raw.replace(/[^\d]/g, '');

    if (digits.length === 0) {
      // deixa o usuário apagar, mas sem “piscar”
      this.control.setValue(null, { emitEvent: true });
      this.valorFormatado = '';
      el.value = '';
      this.atualizando = false;
      return;
    }

    const numero = Number(digits) / 100;

    // aplica no formcontrol e atualiza a exibição formatada
    this.control.setValue(numero, { emitEvent: true });
    this.valorFormatado = this.formatarParaMoeda(numero);
    el.value = this.valorFormatado;

    this.control.markAsTouched();
    this.control.markAsDirty();

    this.atualizando = false;
  }

  onPaste(ev: ClipboardEvent): void {
    ev.preventDefault();
    const data = ev.clipboardData?.getData('text') ?? '';
    const digits = data.replace(/[^\d]/g, '');
    if (!digits) return;
    const numero = Number(digits) / 100;

    this.atualizando = true;
    this.control.setValue(numero, { emitEvent: true });
    this.valorFormatado = this.formatarParaMoeda(numero);
    this.inputRef.nativeElement.value = this.valorFormatado;
    this.atualizando = false;
  }

  bloquearNaoNumericos(event: KeyboardEvent): void {
    const permitidas = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    const isNumero = /^\d$/.test(event.key);
    if (!isNumero && !permitidas.includes(event.key)) {
      event.preventDefault();
    }
  }

  private formatarParaMoeda(valor: number | null | undefined): string {
    if (valor === null || valor === undefined || isNaN(valor as any)) return '';
    return Number(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  }

  errorMessage(): string {
    if (this.control.hasError('required')) return 'Campo obrigatório';
    if (this.control.hasError('max')) return 'Valor máximo permitido é R$ 999.999.999.999,99';
    return 'Valor inválido';
    }
  get isRequired(): boolean {
    const validator = this.control.validator?.({} as any);
    return !!validator && Object.prototype.hasOwnProperty.call(validator, 'required');
  }
}
