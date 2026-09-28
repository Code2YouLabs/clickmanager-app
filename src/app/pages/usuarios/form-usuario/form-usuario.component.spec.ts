import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { UsuarioService } from '../services/usuario.service';
import { PerfilService } from '../services/perfil.service';
import { FormUsuarioComponent } from './form-usuario.component';
const usuario = { id: 7, nome: 'Ana', username: 'ana@example.com', ativo: false, perfil: { id: 2, nome: 'Operador', permissoes: [] } };
describe('Usuários — formulário compartilhado', () => {
  let fixture: ComponentFixture<FormUsuarioComponent>, component: FormUsuarioComponent;
  let service: jasmine.SpyObj<UsuarioService>, profiles: jasmine.SpyObj<PerfilService>;
  let params: BehaviorSubject<any>, load: Subject<any>, perfis: Subject<any>, save: Subject<any>, navigate: jasmine.Spy;
  const create = (edit = false) => {
    if (edit) params.next(convertToParamMap({ id: '7' }));
    fixture = TestBed.createComponent(FormUsuarioComponent); component = fixture.componentInstance; fixture.detectChanges();
  };
  const ready = () => { perfis.next([usuario.perfil]); perfis.complete(); if (component.isEditMode) { load.next(usuario); load.complete(); } fixture.detectChanges(); };
  const fill = () => { component.form.patchValue({ nome: 'Ana', username: 'ana@example.com', senha: '123456', perfilId: 2 }); fixture.detectChanges(); };
  const cancel = () => { const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) => b.textContent.includes('Cancelar')) as HTMLButtonElement; button.click(); fixture.detectChanges(); };
  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({})); load = new Subject(); perfis = new Subject(); save = new Subject();
    service = jasmine.createSpyObj('UsuarioService', ['buscarPorId', 'salvar', 'atualizar']);
    service.buscarPorId.and.returnValue(load); service.salvar.and.returnValue(save); service.atualizar.and.returnValue(save);
    profiles = jasmine.createSpyObj('PerfilService', ['listar']); profiles.listar.and.returnValue(perfis);
    TestBed.configureTestingModule({ imports: [FormUsuarioComponent, NoopAnimationsModule], providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: params } }, { provide: UsuarioService, useValue: service },
      { provide: PerfilService, useValue: profiles }, { provide: AuthService, useValue: { temPermissao: () => true } },
      { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) } ] });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });
  afterEach(() => fixture?.destroy());
  it('aguarda perfis na criação e não permite envio durante loading', () => {
    create(); expect(fixture.nativeElement.querySelector('form')).toBeNull(); component.onSubmit(); expect(service.salvar).not.toHaveBeenCalled();
    ready(); expect(component.perfis).toEqual([usuario.perfil]); expect(fixture.nativeElement.querySelector('app-input-password')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('mat-slide-toggle')).toBeNull();
  });
  it('aguarda usuário e perfis conjuntamente na edição', () => {
    create(true); load.next(usuario); load.complete(); fixture.detectChanges(); expect(component.pronto).toBeFalse();
    perfis.next([usuario.perfil]); perfis.complete(); fixture.detectChanges();
    expect(component.form.value).toEqual({ nome: 'Ana', username: 'ana@example.com', senha: '', perfilId: 2, ativo: false });
    expect(fixture.nativeElement.querySelector('app-input-password')).toBeNull(); expect(fixture.nativeElement.querySelector('mat-slide-toggle')).not.toBeNull();
  });
  for (const edit of [false, true]) {
    it(`envia JSON único por submit nativo em ${edit ? 'edição' : 'criação'}`, () => {
      create(edit); ready(); if (!edit) fill(); document.body.appendChild(fixture.nativeElement);
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type=submit]'); expect(button.form?.id).toBe('usuario-form');
      button.click(); button.click(); component.onSubmit(); fixture.detectChanges(); expect(button.disabled).toBeTrue();
      const payload = { nome: 'Ana', username: 'ana@example.com', senha: edit ? '' : '123456', perfilId: 2, ativo: !edit };
      if (edit) expect(service.atualizar).toHaveBeenCalledOnceWith(7, payload as any); else expect(service.salvar).toHaveBeenCalledOnceWith(payload as any);
      save.next(undefined); save.complete(); expect(navigate).toHaveBeenCalledOnceWith(['/page/usuarios/listar']); fixture.nativeElement.remove();
    });
    it(`cancelar restaura snapshot em ${edit ? 'edição' : 'criação'} sem GET nem navegação`, () => {
      create(edit); ready(); const initial = component.form.getRawValue(); fill(); component.form.patchValue({ nome: 'Outro', ativo: true });
      component.form.markAllAsTouched(); component.form.markAsDirty(); cancel();
      expect(component.form.getRawValue()).toEqual(initial); expect(component.form.pristine).toBeTrue(); expect(component.form.untouched).toBeTrue();
      expect(service.buscarPorId.calls.count()).toBe(edit ? 1 : 0); expect(profiles.listar).toHaveBeenCalledTimes(1); expect(navigate).not.toHaveBeenCalled();
    });
  }
  it('preserva validações nome/email/perfil/senha e marca erros ao enviar', () => {
    create(); ready(); component.onSubmit(); expect(component.form.touched).toBeTrue(); expect(service.salvar).not.toHaveBeenCalled();
    fill(); component.nomeControl.setValue('x'.repeat(101)); component.emailControl.setValue('inválido'); component.senhaControl.setValue('12345');
    expect(component.nomeControl.invalid).toBeTrue(); expect(component.emailControl.invalid).toBeTrue(); expect(component.senhaControl.invalid).toBeTrue();
    component.emailControl.setValue('a'.repeat(45) + '@a.com'); expect(component.emailControl.invalid).toBeTrue();
    component.perfilControl.setValue(null); expect(component.perfilControl.invalid).toBeTrue();
  });
  it('libera nova tentativa após erro ao salvar', () => {
    create(); ready(); fill(); component.onSubmit(); save.error({ status: 500 }); fixture.detectChanges(); expect(component.saving).toBeFalse();
    expect(navigate).not.toHaveBeenCalled(); save = new Subject(); service.salvar.and.returnValue(save); component.onSubmit(); expect(service.salvar).toHaveBeenCalledTimes(2);
  });
  for (const source of ['perfil', 'usuario']) {
    it(`trata erro de ${source} com retry conjunto`, () => {
      create(true); (source === 'perfil' ? perfis : load).error({ status: 500 }); fixture.detectChanges();
      expect(component.erro).toBeTruthy(); expect(fixture.nativeElement.querySelector('form')).toBeNull();
      perfis = new Subject(); load = new Subject(); profiles.listar.and.returnValue(perfis); service.buscarPorId.and.returnValue(load);
      component.carregarDados(); ready(); expect(component.pronto).toBeTrue();
    });
    it(`trata 403 de ${source} sem expor formulário`, () => {
      create(true); (source === 'perfil' ? perfis : load).error({ status: 403 }); fixture.detectChanges();
      expect(component.semPermissao).toBeTrue(); expect(component.erro).toBeNull(); expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });
  }
  it('cancela carga obsoleta ao trocar rota e ao destruir', () => {
    create(true); const old = load; load = new Subject(); perfis = new Subject(); service.buscarPorId.and.returnValue(load); profiles.listar.and.returnValue(perfis);
    params.next(convertToParamMap({ id: '8' })); expect(old.observed).toBeFalse(); fixture.destroy(); expect(load.observed).toBeFalse(); expect(perfis.observed).toBeFalse();
  });
  it('recusa ID inválido', () => { params.next(convertToParamMap({ id: 'abc' })); create(); expect(component.erro).toContain('inválido'); expect(service.buscarPorId).not.toHaveBeenCalled(); });
});
