import { AbstractControl, FormArray, FormControl, FormGroup } from '@angular/forms';

type PageFormExtraState<T> = { read: () => T; write: (value: T) => void };
type ScopedBaseline<T> = {
  scoped: true;
  controls: Array<{ path: string; form: unknown; structure: ControlStructure }>;
  extra: T | undefined;
};
type FullBaseline<T> = {
  scoped?: false;
  form: Record<string, unknown>;
  extra: T | undefined;
  structure: ControlStructure;
};

export type PageFormStateOptions<T = undefined> = Partial<PageFormExtraState<T>> & {
  /**
   * Limita o snapshot/reset aos controles informados.
   * Útil quando uma tela compartilha o mesmo FormGroup entre contextos de salvar/cancelar.
   */
  paths?: string[];
  /** Permite ao consumidor informar se há algo a descartar sem assumir regra de dirty global. */
  canReset?: () => boolean;
};

/** Base de descarte do PageCard. Consumidores registram dados, nunca um handler de Cancelar. */
export class PageFormState<T = undefined> {
  private baseline?: FullBaseline<T> | ScopedBaseline<T>;
  private mode: 'create' | 'edit' = 'create';

  constructor(
    private readonly getForm: () => FormGroup,
    private readonly extra?: PageFormExtraState<T> | PageFormStateOptions<T>,
  ) {}

  get ready(): boolean { return !!this.baseline; }
  get form(): FormGroup { return this.getForm(); }
  get canReset(): boolean { return this.ready && (this.options.canReset?.() ?? true); }

  private get options(): Partial<PageFormStateOptions<T>> {
    return this.extra || {};
  }

  /** Chamar com os defaults vazios, antes de carregar dados de edição ou clone. */
  begin(mode: 'create' | 'edit'): void {
    this.mode = mode;
    this.baseline = mode === 'create' ? this.snapshot() : undefined;
  }

  /** Só dados carregados em edição substituem a base; clone continua sendo criação. */
  loaded(): void {
    if (this.mode === 'edit') this.baseline = this.snapshot();
  }

  reset(): void {
    if (!this.baseline) return;
    if (this.baseline.scoped) {
      const value = {
        controls: this.baseline.controls.map(item => ({ ...item, form: structuredClone(item.form) })),
        extra: structuredClone(this.baseline.extra),
      };
      value.controls.forEach(item => {
        const control = this.form.get(item.path);
        if (!control) return;
        restoreStructure(control, item.structure);
        control.reset(item.form);
      });
      if (this.extra?.write) this.extra.write(value.extra as T);
      return;
    }

    const value = structuredClone({ form: this.baseline.form, extra: this.baseline.extra });
    restoreStructure(this.form, this.baseline.structure);
    this.form.reset(value.form);
    if (this.extra?.write) this.extra.write(value.extra as T);
  }

  private snapshot(): FullBaseline<T> | ScopedBaseline<T> {
    const paths = this.options.paths?.filter(path => !!path.trim());
    if (paths?.length) {
      return {
        scoped: true,
        controls: paths
          .map(path => ({ path, control: this.form.get(path) }))
          .filter((item): item is { path: string; control: AbstractControl } => !!item.control)
          .map(({ path, control }) => ({ path, form: getRawControlValue(control), structure: captureStructure(control) })),
        extra: structuredClone(this.extra?.read?.()),
      };
    }
    return { ...structuredClone({ form: this.form.getRawValue(), extra: this.extra?.read?.() }), structure: captureStructure(this.form) };
  }
}

interface ControlStructure {
  create: () => AbstractControl;
  children?: Record<string, ControlStructure> | ControlStructure[];
}

// FormGroup.reset não remove linhas adicionadas a um FormArray. A estrutura
// também faz parte da base para não deixar pagamentos/opções vazios residuais.
function captureStructure(control: AbstractControl): ControlStructure {
  const options = { validators: control.validator, asyncValidators: control.asyncValidator, updateOn: control.updateOn };
  if (control instanceof FormArray) {
    const children = control.controls.map(captureStructure);
    return { children, create: () => new FormArray(children.map(child => child.create()), options) };
  }
  if (control instanceof FormGroup) {
    const children = Object.fromEntries(Object.entries(control.controls).map(([key, child]) => [key, captureStructure(child)]));
    return { children, create: () => new FormGroup(Object.fromEntries(Object.entries(children).map(([key, child]) => [key, child.create()])), options) };
  }
  const value = structuredClone(control.value);
  const disabled = control.disabled;
  return { create: () => new FormControl({ value: structuredClone(value), disabled }, options) };
}

function restoreStructure(control: AbstractControl, structure: ControlStructure): void {
  if (control instanceof FormArray && Array.isArray(structure.children)) {
    while (control.length > structure.children.length) control.removeAt(control.length - 1, { emitEvent: false });
    structure.children.forEach((child, index) => {
      if (!control.at(index)) control.push(child.create(), { emitEvent: false });
      restoreStructure(control.at(index), child);
    });
  } else if (control instanceof FormGroup && structure.children && !Array.isArray(structure.children)) {
    const children = structure.children;
    Object.keys(control.controls).filter(key => !children[key]).forEach(key => control.removeControl(key, { emitEvent: false }));
    Object.entries(children).forEach(([key, child]) => {
      if (!control.controls[key]) control.addControl(key, child.create(), { emitEvent: false });
      restoreStructure(control.controls[key], child);
    });
  }
}

function getRawControlValue(control: AbstractControl): unknown {
  if (control instanceof FormGroup || control instanceof FormArray) {
    return control.getRawValue();
  }
  return control.value;
}
