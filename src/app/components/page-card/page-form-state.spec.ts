import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { PageFormState } from './page-form-state';

describe('PageFormState', () => {
  it('preserva defaults vazios de criação mesmo após preencher dados de clone', () => {
    const form = new FormGroup({ nome: new FormControl(''), ativo: new FormControl(false) });
    const state = new PageFormState(() => form); state.begin('create');
    form.setValue({ nome: 'Clone', ativo: true }); state.loaded(); state.reset();
    expect(form.getRawValue()).toEqual({ nome: '', ativo: false });
  });
  it('isola snapshot profundo de edição e restaura também estado externo', () => {
    const form = new FormGroup({ nome: new FormControl('') });
    let gallery = [{ id: 1 }];
    const state = new PageFormState(() => form, { read: () => gallery, write: value => gallery = value });
    state.begin('edit'); expect(state.ready).toBeFalse();
    form.setValue({ nome: 'Backend' }); state.loaded();
    gallery[0].id = 2; gallery.push({ id: 3 }); form.setValue({ nome: 'Alterado' }); state.reset();
    expect(form.getRawValue()).toEqual({ nome: 'Backend' }); expect(gallery).toEqual([{ id: 1 }]);
    gallery[0].id = 9; state.reset(); expect(gallery).toEqual([{ id: 1 }]);
  });
  it('restaura grupos substituídos depois do carregamento e limpa interação', () => {
    const form = new FormGroup({ endereco: new FormGroup({ cidade: new FormControl('Backend') }) });
    const state = new PageFormState(() => form); state.begin('edit'); state.loaded();
    form.setControl('endereco', new FormGroup({ cidade: new FormControl('Alterada') }));
    form.markAllAsTouched(); form.markAsDirty(); state.reset();
    expect(form.getRawValue()).toEqual({ endereco: { cidade: 'Backend' } });
    expect(form.pristine).toBeTrue(); expect(form.untouched).toBeTrue();
  });
  it('iniciar outra edição invalida a base anterior até carregar', () => {
    const form = new FormGroup({ nome: new FormControl('Anterior') });
    const state = new PageFormState(() => form); state.begin('edit'); state.loaded();
    state.begin('edit'); form.setValue({ nome: '' }); state.reset();
    expect(state.ready).toBeFalse(); expect(form.getRawValue()).toEqual({ nome: '' });
  });
  it('limpa linhas adicionadas na criação e recompõe linhas removidas na edição', () => {
    const rows = new FormArray<FormGroup>([]);
    const form = new FormGroup({ rows }); const state = new PageFormState(() => form);
    state.begin('create'); rows.push(new FormGroup({ nome: new FormControl('Novo') })); state.reset();
    expect(rows.length).toBe(0);
    state.begin('edit'); rows.push(new FormGroup({ nome: new FormControl('Backend', Validators.required) })); state.loaded();
    rows.clear(); state.reset(); expect(form.getRawValue()).toEqual({ rows: [{ nome: 'Backend' }] });
    rows.at(0).get('nome')!.setValue(''); expect(rows.invalid).toBeTrue();
  });

});
