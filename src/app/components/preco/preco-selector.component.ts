import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule,
  FormArray, FormControl, AbstractControl, ValidatorFn
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Subscription } from 'rxjs';

import { InputMoedaComponent } from '../inputs/input-moeda/input-moeda.component';
import { InputNumericoComponent } from '../inputs/input-numerico/input-numerico.component';
import { InputTextoRestritoComponent } from '../inputs/input-texto/input-texto-restrito.component';
import { InputUnidadeMedidaComponent } from '../inputs/input-unidade-medida/input-unidade-medida.component';
import { InputOptionsComponent } from '../inputs/input-options/input-options.component';

@Component({
  selector: 'app-preco-selector',
  standalone: true,
  templateUrl: './preco-selector.component.html',
  styleUrls: ['./preco-selector.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatIconModule,
    InputMoedaComponent,
    InputNumericoComponent,
    InputTextoRestritoComponent,
    InputUnidadeMedidaComponent,
    InputOptionsComponent
  ]
})
export class PrecoSelectorComponent implements OnInit, OnChanges {

  @Input() formGroup!: FormGroup;
  @Input() tiposDisponiveis?: string[];

  readonly unidadesDimensao = [
    { value: 'METRO', label: 'Metro (m)' },
    { value: 'CENTIMETRO', label: 'Centímetro (cm)' },
    { value: 'MILIMETRO', label: 'Milímetro (mm)' },
  ];
  tiposPrecoOptions: { value: string; label: string }[] = [];

  private todosTipos = ['FIXO', 'HORA', 'QUANTIDADE', 'DEMANDA', 'METRO'];
  private demandaSubs: Subscription[] = [];

  private tipoSub?: Subscription;
  private modoCobrancaSub?: Subscription;
  private tiposPrecoOptionsKey = '';
  private formGroupAtual?: FormGroup;

  get tipos(): string[] {
    return this.tiposDisponiveis?.length ? this.tiposDisponiveis : this.todosTipos;
  }

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.atualizarTiposPrecoOptions();
    if (this.formGroup && this.formGroup !== this.formGroupAtual) {
      this.formGroupAtual = this.formGroup;
      this.setupForm();
      this.setupTipoListener();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.atualizarTiposPrecoOptions();
    if (changes['formGroup']?.currentValue && changes['formGroup'].currentValue !== this.formGroupAtual) {
      this.formGroupAtual = changes['formGroup'].currentValue;
      this.setupForm();
      this.setupTipoListener();
    } else if (changes['tiposDisponiveis'] && this.formGroup) {
      this.setupForm();
    }
  }

  private atualizarTiposPrecoOptions(): void {
    const tipos = this.tipos;
    const key = tipos.join('|');
    if (key === this.tiposPrecoOptionsKey) return;

    this.tiposPrecoOptionsKey = key;
    this.tiposPrecoOptions = tipos.map(tipo => ({ value: tipo, label: this.traduzirTipo(tipo) }));
  }

  private setupForm(): void {
    if (!this.formGroup) return;

    if (!this.formGroup.contains('tipo')) {
      this.formGroup.addControl('tipo', this.fb.control('', Validators.required));
    }

    const tipoAtual = this.tipoPermitidoAtual();
    this.formGroup.get('tipo')?.setValue(tipoAtual, { emitEvent: false });

    if (!this.existeEstruturaPara(tipoAtual)) {
      this.onTipoSelecionado(tipoAtual);
    } else {
      if (tipoAtual === 'METRO') {
        this.setupModoCobrancaMetroListener();
      }
      this.aplicarValidadorDePreco(tipoAtual);
    }
  }

  private setupTipoListener(): void {
    if (!this.formGroup) return;

    const tipoCtrl = this.formGroup.get('tipo');
    if (!tipoCtrl) return;


    if (this.tipoSub) {
      this.tipoSub.unsubscribe();
    }

    this.tipoSub = tipoCtrl.valueChanges.subscribe((tipo: string) => {
      if (tipo) {
        this.onTipoSelecionado(tipo);
      }
    });
  }

  private tipoPermitidoAtual(): string {
    const tipoAtual = this.formGroup.get('tipo')?.value;
    if (tipoAtual && this.tipos.includes(tipoAtual)) {
      return tipoAtual;
    }
    return this.tipos[0] || 'FIXO';
  }

  private existeEstruturaPara(tipo: string): boolean {
    switch (tipo) {
      case 'FIXO':
        return this.formGroup.contains('valor');
      case 'HORA':
        return this.formGroup.contains('valorHora') && this.formGroup.contains('tempoEstimado');
      case 'QUANTIDADE':
      case 'DEMANDA':
        return this.formGroup.contains('faixas');
      case 'METRO':
        return ['precoMetro', 'precoMinimo', 'alturaMaxima', 'larguraMaxima', 'modoCobranca', 'unidadeDimensao', 'largurasLinearesPermitidas']
          .every(c => this.formGroup.contains(c));
      default:
        return false;
    }
  }

  traduzirTipo(tipo: string): string {
    switch (tipo) {
      case 'FIXO': return 'Preço Fixo';
      case 'HORA': return 'Preço por Hora';
      case 'QUANTIDADE':
      case 'POR_LOTE':
        return 'Quantidade Fechada';
      case 'DEMANDA':
      case 'POR_FAIXA_QUANTIDADE':
        return 'Faixa de Quantidade';
      case 'METRO': return 'Preço por Metro';
      case 'POR_METRO_QUADRADO': return 'Preço por Metro';
      default: return tipo;
    }
  }

  onTipoSelecionado(tipo: string): void {
    // ao sair de DEMANDA, desinscreve listeners
    if (this.formGroup.get('tipo')?.value === 'DEMANDA') {
      this.demandaSubs.forEach(s => s.unsubscribe());
      this.demandaSubs = [];
    }
    this.modoCobrancaSub?.unsubscribe();
    this.modoCobrancaSub = undefined;

    // limpa controles anteriores, mantendo apenas 'tipo'
    Object.keys(this.formGroup.controls).forEach(c => {
      if (c !== 'tipo') this.formGroup.removeControl(c);
    });

    this.formGroup.get('tipo')?.setValue(tipo, { emitEvent: false });

    switch (tipo) {
      case 'FIXO':
        this.formGroup.addControl('valor', this.fb.control(null, Validators.required));
        break;

      case 'HORA':
        this.formGroup.addControl('valorHora', this.fb.control(null, Validators.required));
        this.formGroup.addControl('tempoEstimado', this.fb.control(null, Validators.required));
        break;

      case 'QUANTIDADE': {
        const faixasQuantidade = this.fb.array([], Validators.required);
        this.formGroup.addControl('faixas', faixasQuantidade);
        this.adicionarFaixa({ quantidade: null, valor: null });
        break;
      }

      case 'DEMANDA': {
        const faixasDemanda = this.fb.array([], Validators.required);
        this.formGroup.addControl('faixas', faixasDemanda);
        this.faixas.push(this.criarFaixaDemanda(1, null, null, { primeiro: true }));
        this.setupEncadeamentoDemanda(); // encadeia "de" = até anterior + 1
        break;
      }

      case 'METRO':
        this.formGroup.addControl('precoMetro', this.fb.control(null, Validators.required));
        this.formGroup.addControl('precoMinimo', this.fb.control(null));
        this.formGroup.addControl('alturaMaxima', this.fb.control(null));
        this.formGroup.addControl('larguraMaxima', this.fb.control(null));
        this.formGroup.addControl('modoCobranca', this.fb.control('QUADRADO', Validators.required));
        this.formGroup.addControl('unidadeDimensao', this.fb.control('METRO', Validators.required));
        this.formGroup.addControl('largurasLinearesPermitidas', this.fb.control(''));
        this.setupModoCobrancaMetroListener();
        break;
    }

    this.aplicarValidadorDePreco(tipo);
  }

  adicionarFaixaPorTipo(): void {
    const tipo = this.formGroup.get('tipo')?.value;
    switch (tipo) {
      case 'QUANTIDADE':
        this.adicionarFaixa({ quantidade: null, valor: null });
        break;

      case 'DEMANDA': {
        const last = this.faixas.at(this.faixas.length - 1) as FormGroup | undefined;
        const lastAte = last?.get('ate')?.value;
        const proximoDe = (lastAte !== null && lastAte !== undefined && !isNaN(+lastAte))
          ? Number(lastAte) + 1
          : null;
        this.faixas.push(this.criarFaixaDemanda(proximoDe, null, null));
        this.setupEncadeamentoDemanda();
        break;
      }
    }
    this.formGroup.updateValueAndValidity({ onlySelf: true, emitEvent: false });
  }

  adicionarFaixa(campos: { [key: string]: any }): void {
    const grupo = this.fb.group({});
    for (const [key, value] of Object.entries(campos)) {
      grupo.addControl(key, new FormControl(value, Validators.required));
    }
    this.faixas.push(grupo);
  }

  removerFaixa(index: number): void {
    if (this.faixas.length > 1) {
      this.faixas.removeAt(index);
      this.setupEncadeamentoDemanda(true); // recomputa "de" e reinscreve
      this.formGroup.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    }
  }

  // ===== Validação do preço por tipo =====
  private aplicarValidadorDePreco(tipo: string): void {
    const vTipo =
      tipo === 'FIXO' ? this.validatorFixo() :
        tipo === 'HORA' ? this.validatorHora() :
          tipo === 'QUANTIDADE' ? this.validatorQuantidade() :
            tipo === 'DEMANDA' ? this.validatorDemanda() :
              tipo === 'METRO' ? this.validatorMetro() : null;

    const validators: ValidatorFn[] = [];
    if (vTipo) validators.push(vTipo);

    this.formGroup.setValidators(validators);
    this.formGroup.updateValueAndValidity({ emitEvent: false });
  }

  private validatorFixo(): ValidatorFn {
    return (ctrl: AbstractControl) => {
      const valor = Number(ctrl.get('valor')?.value);
      if (!valor || valor <= 0) {
        return { precoInvalido: { msg: 'Informe um Valor válido (maior que 0) para Preço Fixo.' } };
      }
      return null;
    };
  }

  private validatorHora(): ValidatorFn {
    return (ctrl: AbstractControl) => {
      const vh = Number(ctrl.get('valorHora')?.value);
      const te = Number(ctrl.get('tempoEstimado')?.value);
      if (!vh || vh <= 0) return { precoInvalido: { msg: 'Informe o Valor Hora (maior que 0).' } };
      if (!te || te <= 0) return { precoInvalido: { msg: 'Informe o Tempo Estimado em minutos (maior que 0).' } };
      return null;
    };
  }

  private validatorQuantidade(): ValidatorFn {
    return (ctrl: AbstractControl) => {
      const faixas = ctrl.get('faixas') as FormArray | null;
      if (!faixas || faixas.length === 0) {
        return { precoInvalido: { msg: 'Adicione pelo menos uma faixa de quantidade.' } };
      }
      for (let i = 0; i < faixas.length; i++) {
        const g = faixas.at(i) as FormGroup;
        const qtd = Number(g.get('quantidade')?.value);
        const val = Number(g.get('valor')?.value);
        if (!qtd || qtd <= 0) return { precoInvalido: { msg: `Quantidade da faixa ${i + 1} deve ser maior que 0.` } };
        if (!val || val <= 0) return { precoInvalido: { msg: `Valor da faixa ${i + 1} deve ser maior que 0.` } };
      }
      return null;
    };
  }

  private validatorDemanda(): ValidatorFn {
    return (ctrl: AbstractControl) => {
      const faixas = ctrl.get('faixas') as FormArray | null;
      if (!faixas || faixas.length === 0) {
        return { precoInvalido: { msg: 'Adicione pelo menos uma faixa de demanda.' } };
      }

      const ler = (fg: FormGroup, k: string) =>
        Number((fg.get(k)?.value ?? (fg.get(k) as any)?.getRawValue?.() ?? null));

      // por-faixa
      for (let i = 0; i < faixas.length; i++) {
        const g = faixas.at(i) as FormGroup;
        const de = ler(g, 'de');
        const ate = ler(g, 'ate');
        const vu = Number(g.get('valorUnitario')?.value);

        if (isNaN(de) || de < 1 || !Number.isInteger(de)) return { precoInvalido: { msg: `Faixa ${i + 1}: "De" deve ser inteiro ≥ 1.` } };
        if (isNaN(ate) || ate < 1 || !Number.isInteger(ate)) return { precoInvalido: { msg: `Faixa ${i + 1}: "Até" deve ser inteiro ≥ 1.` } };
        if (de > ate) return { precoInvalido: { msg: `Faixa ${i + 1}: "De" não pode ser maior que "Até".` } };
        if (isNaN(vu) || vu <= 0) return { precoInvalido: { msg: `Faixa ${i + 1}: informe um Valor unitário > 0.` } };
      }

      // contiguidade
      const f0 = faixas.at(0) as FormGroup;
      const de0 = Number(f0.get('de')?.value);
      if (de0 !== 1) return { precoInvalido: { msg: 'A primeira faixa deve iniciar em "De = 1".' } };

      for (let i = 1; i < faixas.length; i++) {
        const prev = faixas.at(i - 1) as FormGroup;
        const cur = faixas.at(i) as FormGroup;
        const prevAte = Number(prev.get('ate')?.value);
        const curDe = Number(cur.get('de')?.value);

        if (curDe !== prevAte + 1) {
          return { precoInvalido: { msg: `Faixa ${i + 1}: "De" deve ser ${prevAte + 1}.` } };
        }
      }

      return null;
    };
  }

  private validatorMetro(): ValidatorFn {
    return (ctrl: AbstractControl) => {
      const precoMetro = Number(ctrl.get('precoMetro')?.value);
      const unidadeDimensao = ctrl.get('unidadeDimensao')?.value;
      const modoCobranca = ctrl.get('modoCobranca')?.value;
      const larguras = String(ctrl.get('largurasLinearesPermitidas')?.value || '').trim();
      if (!precoMetro || precoMetro <= 0) {
        return { precoInvalido: { msg: 'Informe o Preço por metro (maior que 0).' } };
      }
      if (!unidadeDimensao) {
        return { precoInvalido: { msg: 'Informe a unidade de medida do preço por metro.' } };
      }
      if (modoCobranca === 'LINEAR' && !larguras) {
        return { precoInvalido: { msg: 'Informe as larguras permitidas para o modo linear.' } };
      }
      return null;
    };
  }

  // ===== Helpers =====
  getControl(nome: string): FormControl {
    return this.formGroup?.get(nome) as FormControl;
  }
  getControlDoGrupo(grupo: AbstractControl, nome: string): FormControl {
    return grupo?.get(nome) as FormControl;
  }
  getFormGroup(control: AbstractControl | null): FormGroup {
    return control as FormGroup;
  }

  get faixas(): FormArray {
    return this.formGroup?.get('faixas') as FormArray;
  }

  get unidadeDimensaoSelecionada(): string {
    return this.formGroup?.get('unidadeDimensao')?.value || 'METRO';
  }

  get unidadeDimensaoSimbolo(): string {
    switch (this.unidadeDimensaoSelecionada) {
      case 'CENTIMETRO': return 'cm';
      case 'MILIMETRO': return 'mm';
      default: return 'm';
    }
  }

  get modoCobrancaMetro(): string {
    return this.formGroup?.get('modoCobranca')?.value || 'QUADRADO';
  }

  selecionarModoCobrancaMetro(modo: 'QUADRADO' | 'LINEAR'): void {
    this.formGroup?.get('modoCobranca')?.setValue(modo);
  }

  private setupModoCobrancaMetroListener(): void {
    const modoControl = this.formGroup?.get('modoCobranca');
    const largurasControl = this.formGroup?.get('largurasLinearesPermitidas');
    const larguraMaximaControl = this.formGroup?.get('larguraMaxima');
    if (!modoControl || !largurasControl) return;

    this.modoCobrancaSub?.unsubscribe();
    const aplicar = (modo: string) => {
      if (modo === 'LINEAR') {
        largurasControl.setValidators([Validators.required]);
        larguraMaximaControl?.setValue(null, { emitEvent: false });
      } else {
        largurasControl.clearValidators();
        largurasControl.setValue('', { emitEvent: false });
      }
      largurasControl.updateValueAndValidity({ emitEvent: false });
      this.formGroup.updateValueAndValidity({ emitEvent: false });
    };

    aplicar(modoControl.value || 'QUADRADO');
    this.modoCobrancaSub = modoControl.valueChanges.subscribe((modo) => aplicar(modo || 'QUADRADO'));
  }

  private criarFaixaDemanda(
    de: number | null,
    ate: number | null,
    valorUnitario: number | null,
    opts?: { primeiro?: boolean }
  ): FormGroup {
    const g = this.fb.group({
      de: new FormControl(de, [Validators.required]),
      ate: new FormControl(ate, [Validators.required]),
      valorUnitario: new FormControl(valorUnitario, [Validators.required]),
    });

    g.get('de')!.addValidators([Validators.min(1), this.integerValidator()]);
    g.get('ate')!.addValidators([Validators.min(1), this.integerValidator()]);
    g.get('valorUnitario')!.addValidators([Validators.min(0.01)]);

    if (!opts?.primeiro) {
      g.get('de')!.disable({ emitEvent: false });
    }

    return g;
  }

  private integerValidator(): ValidatorFn {
    return (c: AbstractControl) => {
      const v = c.value;
      if (v === null || v === undefined || v === '') return null;
      return Number.isInteger(Number(v)) ? null : { integer: true };
    };
  }

  private setupEncadeamentoDemanda(recompute = false): void {
    this.demandaSubs.forEach(s => s.unsubscribe());
    this.demandaSubs = [];

    const n = this.faixas.length;

    if (recompute) {
      if (n > 0) {
        const f0 = this.faixas.at(0) as FormGroup;
        f0.get('de')!.enable({ emitEvent: false });
        if (f0.get('de')!.value == null || f0.get('de')!.value !== 1) {
          f0.get('de')!.setValue(1, { emitEvent: false });
        }
      }
      for (let i = 1; i < n; i++) {
        const prev = this.faixas.at(i - 1) as FormGroup;
        const cur = this.faixas.at(i) as FormGroup;
        cur.get('de')!.disable({ emitEvent: false });
        const prevAte = Number(prev.get('ate')!.value);
        const nextDe = (prevAte && !isNaN(prevAte)) ? prevAte + 1 : null;
        if (cur.get('de')!.value !== nextDe) {
          cur.get('de')!.setValue(nextDe, { emitEvent: false });
        }
      }
    }

    for (let i = 0; i < n; i++) {
      const g = this.faixas.at(i) as FormGroup;
      const sub = g.get('ate')!.valueChanges.subscribe((ateVal: any) => {
        const ateNum = Number(ateVal);
        const next = this.faixas.at(i + 1) as FormGroup | undefined;
        if (!next) return;

        const nextDe = (ateVal !== null && ateVal !== undefined && !isNaN(ateNum))
          ? ateNum + 1
          : null;

        next.get('de')!.disable({ emitEvent: false });
        next.get('de')!.setValue(nextDe, { emitEvent: false });
        this.formGroup.updateValueAndValidity({ emitEvent: false });
      });
      this.demandaSubs.push(sub);
    }
  }

  getPrecoErrorMsg(): string | null {
    const err = this.formGroup?.errors?.['precoInvalido'];
    return err?.msg ?? null;
  }
}
