import {
  Component,
  DestroyRef,
  inject,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MatAutocompleteModule,
  MatAutocompleteTrigger
} from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';

@Component({
  selector: 'app-auto-complete',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule
  ],
  templateUrl: './auto-complete.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AutoCompleteComponent implements OnInit {
  private readonly destroy = inject(DestroyRef);
  
  @Input() control!: FormControl;
  @Input() placeholder = 'Buscar...';
  @Input() buscarFn!: (termo: string) => Observable<any[]>;
  @Input() label = '';
  @Input() displayWith: (item: any) => string = () => '';
  @Input() minimoCaracteres = 1;
  @Input() multiplo = false;
  @Output() selecionado = new EventEmitter<any>();

  @ViewChild(MatAutocompleteTrigger) trigger!: MatAutocompleteTrigger;

  opcoesFiltradas: any[] = [];
  private reabrirBloqueado = false;
  buscaExecutada = false;
  private onChange = (_: any) => {};

  ngOnInit(): void {
    if (!this.control) {
      throw new Error('O FormControl é obrigatório para <app-auto-complete-id>');
    }
  
    this.control.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((valor: any) => {
          if (typeof valor !== 'string') return of([]);
          if (this.minimoCaracteres > 0 && valor.length < this.minimoCaracteres) return of([]);
          return this.buscarFn(valor);
        }),
        takeUntilDestroyed(this.destroy)
      )
      .subscribe(opcoes => {
        this.buscaExecutada = true;
        this.opcoesFiltradas = opcoes;
      
        if (this.trigger.panelOpen) {
          this.trigger.closePanel();
          setTimeout(() => this.trigger.openPanel(), 0);
        } else if (opcoes.length > 0) {
          setTimeout(() => this.trigger.openPanel(), 0);
        }
      });
  }

  aoSelecionar(item: any): void {
    this.selecionado.emit(item);

    if (this.multiplo) {
      this.control.setValue('', { emitEvent: false });
      setTimeout(() => this.trigger.openPanel(), 0);
      return;
    }

    this.reabrirBloqueado = true;
    this.control.setValue(item, { emitEvent: false });
    this.onChange(item.id);

    setTimeout(() => {
      this.reabrirBloqueado = false;
    }, 300);
  }

  abrirOpcoes(): void {
    if (this.reabrirBloqueado) return;
  
    this.buscaExecutada = false;
  
    if (this.minimoCaracteres === 0) {
      this.buscarFn('').subscribe(opcoes => {
        this.opcoesFiltradas = opcoes;
        this.buscaExecutada = true;
        setTimeout(() => this.trigger.openPanel(), 0);
      });
    }
  }

  updateErrorMessage(): void {
    this.control.markAsTouched();
  }

  errorMessage(): string {
    if (this.control.hasError('required')) {
      return 'Campo obrigatório';
    }
    return 'Valor inválido';
  }

  get isRequired(): boolean {
    return this.control?.validator?.({} as any)?.['required'] ?? false;
  }

  writeValue(valor: any): void {}

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.control.disable() : this.control.enable();
  }
}
