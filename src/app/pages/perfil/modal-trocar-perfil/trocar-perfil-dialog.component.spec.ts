import { FormBuilder } from '@angular/forms';
import { TrocarPerfilDialogComponent } from './trocar-perfil-dialog.component';

describe('TrocarPerfilDialogComponent', () => {
  function criar(perfilId: number | null = 1) {
    const dialogRef = { close: jasmine.createSpy('close') };
    const toastr = { error: jasmine.createSpy('error') };
    const data: any = {
      usuario: { id: 9, nome: 'Ana', perfil: perfilId === null ? undefined : { id: perfilId } },
      perfis: [{ id: 1, nome: 'Administrador', permissoes: [] }, { id: 2, nome: 'Vendas', permissoes: [] }],
    };
    const component = new TrocarPerfilDialogComponent(new FormBuilder().nonNullable, dialogRef as any, data, toastr as any);
    component.ngOnInit();
    return { component, dialogRef, toastr };
  }

  it('inicia com o perfil atual selecionado', () => {
    expect(criar(2).component.perfilControl.value).toBe(2);
  });

  it('exige perfil e não salva valor vazio', () => {
    const { component, dialogRef, toastr } = criar(null);
    component.salvar();
    expect(component.perfilControl.hasError('required')).toBeTrue();
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(toastr.error).toHaveBeenCalled();
  });

  it('retorna usuarioId e novoPerfilId ao salvar', () => {
    const { component, dialogRef } = criar();
    component.perfilControl.setValue(2);
    component.salvar();
    expect(dialogRef.close).toHaveBeenCalledWith({ usuarioId: 9, novoPerfilId: 2 });
  });

  it('fecha sem salvar ao cancelar', () => {
    const { component, dialogRef } = criar();
    component.cancelar();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
