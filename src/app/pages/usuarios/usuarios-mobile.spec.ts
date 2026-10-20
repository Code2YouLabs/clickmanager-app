import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ListFilterBarComponent } from 'src/app/components/list-filter-bar/list-filter-bar.component';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { AuthService } from 'src/app/services/auth.service';
import { ListarUsuariosComponent } from './listar-usuarios/listar-usuarios.component';
import { FormUsuarioComponent } from './form-usuario/form-usuario.component';
import { UsuarioService } from './services/usuario.service';
import { PerfilService } from './services/perfil.service';

const perfil = { id: 2, nome: 'Operador', permissoes: [] };
const usuario = { id: 7, nome: 'Ana com nome longo para conferir o card', username: 'ana@example.com', email: 'ana@example.com', ativo: true, perfil, fotoPerfil: null };
function frameCopy(root: HTMLElement, width: number): HTMLIFrameElement {
  const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:900px;border:0`; document.body.appendChild(frame);
  const doc = frame.contentDocument!; Array.from(document.styleSheets).forEach(sheet => { const style = doc.createElement('style'); style.textContent = Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); doc.head.appendChild(style); });
  doc.body.style.cssText = 'margin:0;--mobile-bottom-nav-height:80px'; doc.body.appendChild(root.cloneNode(true)); return frame;
}
describe('Usuários — listagem mobile', () => {
  let fixture: ComponentFixture<ListarUsuariosComponent>;
  let viewport: BehaviorSubject<any>;
  let api: jasmine.SpyObj<UsuarioService>;
  let auth: jasmine.SpyObj<AuthService>;
  let navigate: jasmine.Spy;
  const root = () => fixture.nativeElement as HTMLElement;
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const menu = async () => { root().querySelector<HTMLButtonElement>('.usuario-mobile-item__menu')!.click(); await settle(); };
  const action = (name: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-panel button')).find(b => b.textContent?.includes(name))!;
  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} }); api = jasmine.createSpyObj('UsuarioService', ['listar', 'excluir']); api.listar.and.returnValue(of({ content: [usuario], totalElements: 31 } as any)); api.excluir.and.returnValue(of(undefined));
    auth = jasmine.createSpyObj('AuthService', ['temPermissao']); auth.temPermissao.and.returnValue(true);
    TestBed.configureTestingModule({ imports: [ListarUsuariosComponent, NoopAnimationsModule], providers: [provideRouter([]),
      { provide: UsuarioService, useValue: api }, { provide: AuthService, useValue: auth }, { provide: BreakpointObserver, useValue: { observe: () => viewport } },
      { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
    ] }); navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true); fixture = TestBed.createComponent(ListarUsuariosComponent);
  });
  afterEach(async () => { TestBed.inject(MatDialog).closeAll(); await fixture.whenStable(); fixture.destroy(); TestBed.inject(OverlayContainer).ngOnDestroy(); });
  it('usa cards com foto, status e perfil, menu contextual e FAB autorizado', async () => {
    await settle(); expect(root().querySelector('table')).toBeNull(); expect(root().querySelector('.usuario-mobile-item')!.textContent).toContain('Operador'); expect(root().textContent).toContain(usuario.username);
    expect(root().querySelector('.card-header')!.textContent).toContain('Filtros'); expect(root().querySelector('.card-header')!.textContent).not.toContain('Novo Usuário');
    root().querySelector<HTMLButtonElement>('app-mobile-fab-action button')!.click(); expect(navigate).toHaveBeenCalledWith(['/page/usuarios/novo']);
    const image = root().querySelector<HTMLImageElement>('.usuario-mobile-item img')!; image.dispatchEvent(new Event('error')); expect(image.src).toContain('user-1.jpg');
    await menu(); action('Editar usuário').click(); await settle(); expect(navigate).toHaveBeenCalledWith(['/page/usuarios/editar', 7]);
    await menu(); action('Excluir usuário').click(); await settle(); expect(document.querySelector('.confirmation--destructive')).not.toBeNull(); expect(api.excluir).not.toHaveBeenCalled();
    document.querySelector<HTMLButtonElement>('.confirmation-back')!.click(); await settle(); expect(api.excluir).not.toHaveBeenCalled();
    await menu(); action('Excluir usuário').click(); await settle(); document.querySelector<HTMLButtonElement>('.confirmation-submit')!.click(); await settle(); expect(api.excluir).toHaveBeenCalledOnceWith(7);
  });
  it('mantém filtros e paginação no backend sem duplicar consultas, inclusive Inativos/Todos', async () => {
    await settle(); const bar = fixture.debugElement.query(By.directive(ListFilterBarComponent)).componentInstance as ListFilterBarComponent;
    const loads = api.listar.calls.count(); root().querySelector<HTMLButtonElement>('.list-mobile-toolbar__filter-button')!.click(); await settle(); bar.onFieldChange('ativo', false); expect(api.listar.calls.count()).toBe(loads); bar.applyMobileFilters(); await settle();
    expect(api.listar).toHaveBeenCalledWith(0, 10, false); expect(api.listar.calls.count()).toBe(loads + 1);
    fixture.debugElement.query(By.directive(DataTableComponent)).componentInstance.pageChange.emit({ pageIndex: 2, pageSize: 20, length: 31 }); expect(api.listar).toHaveBeenCalledWith(2, 20, false);
    bar.openMobileFilters(); await settle(); bar.clearMobileFilters(); bar.applyMobileFilters(); await settle(); expect(api.listar).toHaveBeenCalledWith(0, 20, null);
  });
  it('não expõe ações sem permissão e preserva acesso restrito', async () => {
    auth.temPermissao.and.returnValue(false); await settle(); expect(root().querySelector('.usuario-mobile-item__menu')).toBeNull(); expect(root().querySelector('app-mobile-fab-action')).toBeNull();
    fixture.componentInstance.novoMobile(); fixture.componentInstance.onAcao({ action: 'excluir', row: usuario }); expect(navigate).not.toHaveBeenCalled(); expect(api.excluir).not.toHaveBeenCalled();
    api.listar.and.returnValue(throwError(() => ({ status: 403 }))); fixture.componentInstance.carregarUsuarios(); await settle(); expect(root().textContent).toContain('Acesso restrito'); expect(root().querySelector('.usuario-mobile-item')).toBeNull();
  });
  for (const width of [360, 390, 430, 1024, 1440]) it(`mantém layout e área útil em ${width}px`, async () => {
    viewport.next({ matches: width <= 760, breakpoints: {} }); await settle(); const frame = frameCopy(root(), width);
    try { const doc = frame.contentDocument!;
      if (width <= 760) { expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); expect(doc.querySelector('table')).toBeNull(); expect(doc.querySelector('.usuario-mobile-item__menu')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44); expect(doc.querySelector('app-mobile-fab-action button')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(804); }
      else { expect(doc.querySelectorAll('thead th').length).toBe(6); expect(doc.querySelector('.usuario-mobile-item')).toBeNull(); expect(doc.querySelector('app-mobile-fab-action')).toBeNull(); expect(doc.querySelector('.card-header')!.textContent).toContain('Novo Usuário'); }
    } finally { frame.remove(); }
  });
});

describe('Usuários — cadastro/edição mobile', () => {
  let fixture: ComponentFixture<FormUsuarioComponent>;
  let viewport: BehaviorSubject<any>, params: BehaviorSubject<any>;
  let api: jasmine.SpyObj<UsuarioService>;
  let navigate: jasmine.Spy;
  const root = () => fixture.nativeElement as HTMLElement;
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} }); params = new BehaviorSubject(convertToParamMap({})); api = jasmine.createSpyObj('UsuarioService', ['buscarPorId', 'salvar', 'atualizar']); api.buscarPorId.and.returnValue(of(usuario)); api.salvar.and.returnValue(of(usuario)); api.atualizar.and.returnValue(of(undefined));
    TestBed.configureTestingModule({ imports: [FormUsuarioComponent, NoopAnimationsModule], providers: [provideRouter([]),
      { provide: UsuarioService, useValue: api }, { provide: PerfilService, useValue: { listar: () => of([perfil]) } }, { provide: ActivatedRoute, useValue: { paramMap: params } },
      { provide: BreakpointObserver, useValue: { observe: () => viewport } }, { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
    ] }); navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });
  afterEach(() => fixture?.destroy());
  for (const edit of [false, true]) it(`mantém validações e payload em ${edit ? 'edição' : 'criação'} com um único rodapé`, async () => {
    if (edit) params.next(convertToParamMap({ id: '7' })); const response = new Subject<any>(); (edit ? api.atualizar : api.salvar).and.returnValue(response);
    fixture = TestBed.createComponent(FormUsuarioComponent); await settle(); document.body.appendChild(root());
    try { const c = fixture.componentInstance; expect(root().querySelector('.page-card__footer')).toBeNull(); expect(root().querySelectorAll('app-mobile-total-bar').length).toBe(1);
      expect(!!root().querySelector('app-input-password')).toBe(!edit); expect(!!root().querySelector('mat-slide-toggle')).toBe(edit);
      c.form.patchValue({ nome: 'Ana', username: 'inválido', senha: '123', perfilId: null }); fixture.detectChanges(); expect(root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.disabled).toBeTrue();
      c.form.patchValue({ username: 'ana@example.com', senha: edit ? '' : '123456', perfilId: 2 }); fixture.detectChanges(); root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.click(); fixture.detectChanges(); c.onSubmit();
      const request = edit ? api.atualizar : api.salvar; expect(request).toHaveBeenCalledTimes(1); expect(request.calls.mostRecent().args[edit ? 1 : 0]).toEqual(jasmine.objectContaining({ username: 'ana@example.com', perfilId: 2, senha: edit ? '' : '123456' }));
      expect(root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.disabled).toBeTrue(); response.next(usuario); response.complete(); await settle(); expect(navigate).toHaveBeenCalledWith(['/page/usuarios/listar']);
    } finally { root().remove(); }
  });
  it('restaura dados e perfil ao cancelar edição e mantém dados após erro', async () => {
    params.next(convertToParamMap({ id: '7' })); fixture = TestBed.createComponent(FormUsuarioComponent); await settle(); const c = fixture.componentInstance; const before = c.form.getRawValue(); c.form.patchValue({ nome: 'Alterado', perfilId: 9, ativo: false }); fixture.detectChanges(); root().querySelector<HTMLButtonElement>('.mobile-total-bar__secondary')!.click(); fixture.detectChanges(); expect(c.form.getRawValue()).toEqual(before);
    api.atualizar.and.returnValue(throwError(() => new Error('erro'))); c.form.patchValue({ nome: 'Alterado' }); c.onSubmit(); fixture.detectChanges(); expect(c.nomeControl.value).toBe('Alterado'); expect(c.saving).toBeFalse(); expect(navigate).not.toHaveBeenCalled();
  });
  for (const width of [360, 390, 430, 1024, 1440]) it(`preserva formulário e ações em ${width}px`, async () => {
    viewport.next({ matches: width <= 760, breakpoints: {} }); params.next(convertToParamMap({ id: '7' })); fixture = TestBed.createComponent(FormUsuarioComponent); await settle(); const frame = frameCopy(root(), width);
    try { const doc = frame.contentDocument!; if (width <= 760) { expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); expect(doc.querySelector('.mobile-total-bar')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(820); expect(doc.querySelector('.page-card__footer')).toBeNull(); } else { expect(doc.querySelector('app-mobile-total-bar')).toBeNull(); expect(doc.querySelector('.page-card__footer')).not.toBeNull(); expect(doc.querySelector('app-section-card')!.textContent).toContain('Dados do usuário'); } } finally { frame.remove(); }
  });
});
