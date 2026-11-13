import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, Optional } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { InputNumericoComponent } from 'src/app/components/inputs/input-numerico/input-numerico.component';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { MobileTotalBarComponent } from 'src/app/components/mobile-total-bar/mobile-total-bar.component';
import { PageCardAction, PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { PageFormState } from 'src/app/components/page-card/page-form-state';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { PedidoPrazoParametros } from 'src/app/models/pedido/pedido-prazo.model';
import { PedidoPrazoService } from 'src/app/services/pedido-prazo.service';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';

function inteiro(control: AbstractControl) {
  return control.value === '' || control.value == null || Number.isInteger(Number(control.value))
    ? null : { inteiro: true };
}

@Component({
  standalone: true,
  selector: 'app-pedidos-config',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, PageCardComponent, SectionCardComponent,
    InputNumericoComponent, InputOptionsComponent, MobileTotalBarComponent],
  templateUrl: './pedidos-config.component.html',
  styleUrl: './pedidos-config.component.scss',
})
export class PedidosConfigComponent implements OnInit, OnDestroy {
  readonly formId = 'pedidos-config-form';
  readonly unidadeOptions = [{ id: 'DIAS', nome: 'Dias corridos' }, { id: 'HORAS', nome: 'Horas' }];
  isMobile = false;
  carregando = false;
  salvando = false;
  erro = '';
  carregada = false;
  private readonly destroy$ = new Subject<void>();

  readonly form = new FormGroup({
    prazo: new FormControl<number | string>(7, { nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(3650), inteiro] }),
    unidade: new FormControl<'HORAS' | 'DIAS'>('DIAS', { nonNullable: true, validators: Validators.required }),
    atencaoHoras: new FormControl<number | string>(24, { nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(87600), inteiro] }),
    atrasoCriticoHoras: new FormControl<number | string>(48, { nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(87600), inteiro] }),
  });
  readonly formState = new PageFormState(() => this.form);

  constructor(private api: PedidoPrazoService, private toastr: ToastrService,
    @Optional() breakpoints?: BreakpointObserver) {
    breakpoints?.observe(MOBILE_FOUNDATION_QUERY).pipe(takeUntil(this.destroy$))
      .subscribe(state => this.isMobile = state.breakpoints[MOBILE_FOUNDATION_QUERY] ?? state.matches);
  }

  ngOnInit() {
    this.form.controls.unidade.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.atualizarLimite());
    this.carregar();
  }

  get limite() { return this.form.controls.unidade.value === 'DIAS' ? 3650 : 87600; }
  get invalido() { return this.form.invalid; }
  get podeSalvar() { return this.carregada && !this.carregando && !this.invalido && !this.salvando; }
  get pageFormState() { return this.carregada && !this.carregando && !this.erro ? this.formState : undefined; }
  get footerActions(): PageCardAction[] {
    return this.pageFormState ? [{ id: 'salvar-pedidos-config', type: 'submit', form: this.formId, disabled: !this.podeSalvar }] : [];
  }

  private atualizarLimite() {
    this.form.controls.prazo.setValidators([Validators.required, Validators.min(1), Validators.max(this.limite), inteiro]);
    this.form.controls.prazo.updateValueAndValidity({ emitEvent: false });
  }

  carregar() {
    this.carregando = true;
    this.carregada = false;
    this.erro = '';
    this.formState.begin('edit');
    this.api.configuracao().pipe(takeUntil(this.destroy$), finalize(() => this.carregando = false)).subscribe({
      next: c => {
        this.form.setValue(c.parametros);
        this.atualizarLimite();
        this.form.markAsPristine();
        this.formState.loaded();
        this.carregada = true;
      },
      error: () => this.erro = 'Não foi possível carregar as configurações de Pedidos.',
    });
  }

  salvar() {
    if (!this.podeSalvar) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    // InputNumerico compartilha valores de texto: o contrato recebe números inteiros.
    const parametros: PedidoPrazoParametros = { prazo: Number(raw.prazo), unidade: raw.unidade,
      atencaoHoras: Number(raw.atencaoHoras), atrasoCriticoHoras: Number(raw.atrasoCriticoHoras) };
    this.salvando = true;
    this.api.configurar(parametros).pipe(takeUntil(this.destroy$), finalize(() => this.salvando = false)).subscribe({
      next: () => {
        this.form.markAsPristine();
        this.formState.loaded();
        this.toastr.success('Configuração de Pedidos salva.');
      },
      error: e => this.toastr.error(e.error?.message || 'Não foi possível salvar. Tente novamente.'),
    });
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
