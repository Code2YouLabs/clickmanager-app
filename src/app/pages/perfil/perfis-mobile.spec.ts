import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { BehaviorSubject, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { PermissaoCatalogo } from 'src/app/models/permissao.model';
import { PerfilService } from '../usuarios/services/perfil.service';
import { GerenciarPerfilComponent } from './gerenciar-perfil/gerenciar-perfil.component';
import { PerfilDialogComponent } from './modal-perfil/perfil-dialog.component';
import { TrocarPerfilDialogComponent } from './modal-trocar-perfil/trocar-perfil-dialog.component';

const catalog: PermissaoCatalogo[] = [
  { id: 1, chave: 'USUARIOS_VER', titulo: 'Consultar usuários', modulo: { codigo: 'SEGURANCA', titulo: 'Segurança e administração' }, recurso: 'USUARIOS', recursoTitulo: 'Usuários', acao: 'VER', selecionada: true },
  { id: 2, chave: 'USUARIOS_EDITAR', titulo: 'Editar usuários', modulo: { codigo: 'SEGURANCA', titulo: 'Segurança e administração' }, recurso: 'USUARIOS', recursoTitulo: 'Usuários', acao: 'EDITAR' },
  { id: 3, chave: 'PERMISSAO_COM_CODIGO_EXTENSO_PARA_VERIFICAR_QUEBRA_NO_CELULAR', titulo: 'Consultar pedidos', modulo: { codigo: 'COMERCIAL', titulo: 'Comercial' }, recurso: 'PEDIDOS', recursoTitulo: 'Pedidos', acao: 'VER' },
];
const profile = { id: 1, nome: 'Perfil com nome longo para conferir a largura útil', descricao: 'Equipe de operação', permissoes: [] };
const user = { id: 7, nome: 'Ana', username: 'ana@example.com', email: 'ana@example.com', perfil: profile, proprietario: true };
describe('Perfis e permissões — fundação mobile', () => {
  let fixture: ComponentFixture<GerenciarPerfilComponent>;
  let viewport: BehaviorSubject<any>;
  let api: any;
  let auth: jasmine.SpyObj<AuthService>;
  let toast: jasmine.SpyObj<ToastrService>;
  let permissions: Set<string>;
  const root = () => fixture.nativeElement as HTMLElement;
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const dialog = () => TestBed.inject(MatDialog);
  const editor = () => dialog().openDialogs[0].componentInstance as PerfilDialogComponent;
  const close = async () => { dialog().closeAll(); await settle(); };
  const openEdit = async () => { fixture.componentInstance.editar(profile); await settle(); };
  const menuAction = (name: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-panel button')).find(b => b.textContent?.includes(name))!;
  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} }); permissions = new Set(['PERFIS_PERMISSOES_VER', 'PERFIS_PERMISSOES_CADASTRAR', 'PERFIS_PERMISSOES_EDITAR', 'PERFIS_PERMISSOES_EXCLUIR']);
    auth = jasmine.createSpyObj('AuthService', ['temPermissao', 'getUsuario', 'carregarUsuarioCompleto']); auth.temPermissao.and.callFake(p => permissions.has(p)); auth.getUsuario.and.returnValue({ id: 99 }); auth.carregarUsuarioCompleto.and.returnValue(of({} as any));
    api = jasmine.createSpyObj('PerfilService', ['listar', 'listarUsuariosDoPerfil', 'listarPermissoesDisponiveis', 'listarPermissoesPorPerfil', 'obter', 'salvar', 'atualizar', 'excluir', 'trocarPerfil']);
    api.listar.and.returnValue(of([profile])); api.listarUsuariosDoPerfil.and.returnValue(of([user])); api.listarPermissoesDisponiveis.and.returnValue(of(catalog)); api.listarPermissoesPorPerfil.and.returnValue(of(catalog)); api.obter.and.returnValue(of(profile)); api.salvar.and.returnValue(of(profile)); api.atualizar.and.returnValue(of(profile)); api.excluir.and.returnValue(of(undefined)); api.trocarPerfil.and.returnValue(of(user));
    toast = jasmine.createSpyObj('ToastrService', ['success', 'warning', 'error']);
    TestBed.configureTestingModule({ imports: [GerenciarPerfilComponent, NoopAnimationsModule, TablerIconsModule.pick(TablerIcons)], providers: [
      { provide: PerfilService, useValue: api }, { provide: AuthService, useValue: auth }, { provide: ToastrService, useValue: toast }, { provide: BreakpointObserver, useValue: { observe: () => viewport } },
    ] }); fixture = TestBed.createComponent(GerenciarPerfilComponent);
  });
  afterEach(async () => { dialog().closeAll(); await fixture.whenStable(); fixture.destroy(); TestBed.inject(OverlayContainer).ngOnDestroy(); });
  it('usa cards compartilhados e seleção de perfil para carregar os usuários vinculados', async () => {
    await settle(); expect(root().querySelector('.card-header')!.textContent).not.toContain('Novo perfil'); expect(root().querySelector('app-mobile-fab-action')).not.toBeNull();
    root().querySelector<HTMLButtonElement>('.perfil-mobile-item__select')!.click(); await settle(); expect(api.listarUsuariosDoPerfil).toHaveBeenCalledWith(1); expect(root().querySelector('.perfil-mobile-item--selected')).not.toBeNull();
    expect(root().querySelector('.perfil-usuario-mobile')!.textContent).toContain('ana@example.com'); expect(root().querySelector('table')).toBeNull(); expect(root().querySelectorAll('[role="listitem"]').length).toBe(2);
    root().querySelector<HTMLButtonElement>('.perfil-usuario-mobile button')!.click(); await settle(); menuAction('Trocar perfil').click(); await settle();
    expect(document.querySelector('.mobile-side-panel')).not.toBeNull(); expect(document.querySelectorAll('[role="dialog"]').length).toBe(1);
    const swap = dialog().openDialogs[0].componentInstance as TrocarPerfilDialogComponent; expect(swap.perfilControl.value).toBe(1); swap.perfilControl.setValue(9); swap.salvar(); await settle(); expect(api.trocarPerfil).toHaveBeenCalledOnceWith(7, 9);
  });
  it('abre Novo perfil no mesmo painel lateral e restaura foco sem salvar ao fechar', async () => {
    await settle(); document.body.appendChild(root());
    try { const trigger = root().querySelector<HTMLButtonElement>('app-mobile-fab-action button')!; trigger.focus(); trigger.click(); await settle(); expect(document.querySelector('.mobile-side-panel__header')!.textContent).toContain('Novo perfil');
      document.querySelector<HTMLButtonElement>('.mobile-side-panel__header button')!.click(); await settle(); expect(document.activeElement).toBe(trigger); expect(api.salvar).not.toHaveBeenCalled();
    } finally { root().remove(); }
  });
  it('preserva seleção, busca, somente selecionadas, seleção por módulo/recurso e payload de permissões', async () => {
    await settle(); await openEdit(); const c = editor(); expect(c.avisoProprietario).toBeTrue(); expect(document.querySelector('.owner-alert')!.textContent).toContain('acesso total');
    const search = document.querySelector<HTMLInputElement>('[aria-label="Buscar permissão"]')!; search.value = 'pedidos'; search.dispatchEvent(new Event('input')); await settle(); c.selecionarTodos(true); await settle();
    expect(c.getPermissaoControl('1').value).toBeTrue(); expect(c.getPermissaoControl('3').value).toBeTrue(); expect(c.getPermissaoControl('2').value).toBeFalse();
    c.onBuscaChange(''); c.alternarSomenteSelecionadas(true); await settle(); expect(c.modulosFiltrados.length).toBe(2); c.alternarSomenteSelecionadas(false);
    const module = c.modulos.find(m => m.codigo === 'SEGURANCA')!; c.selecionarModulo(module, true); expect(c.getPermissaoControl('2').value).toBeTrue(); c.selecionarRecurso(module.recursos[0], false); expect(c.getPermissaoControl('1').value).toBeFalse(); expect(c.getPermissaoControl('3').value).toBeTrue();
    c.salvar(); await settle(); expect(api.atualizar).toHaveBeenCalledOnceWith(1, jasmine.objectContaining({ nome: profile.nome, permissoes: [{ id: 1, selecionada: false }, { id: 2, selecionada: false }, { id: 3, selecionada: true }] }));
  });
  it('mantém validação, criação e cancelamento do editor', async () => {
    await settle(); fixture.componentInstance.openDialogPerfil('Add'); await settle(); const c = editor(); c.nomeControl.setValue(''); c.salvar(); expect(api.salvar).not.toHaveBeenCalled(); c.nomeControl.setValue('Novo perfil'); c.selecionarTodos(true); c.salvar(); await settle(); expect(api.salvar).toHaveBeenCalledWith(jasmine.objectContaining({ nome: 'Novo perfil' }));
    await openEdit(); editor().getPermissaoControl('2').setValue(true); editor().cancelar(); await settle(); expect(api.atualizar).not.toHaveBeenCalled();
  });
  it('preserva bloqueio de exclusão com vínculos e exige confirmação destrutiva sem vínculos', async () => {
    await settle(); fixture.componentInstance.excluir(1); expect(toast.warning).toHaveBeenCalled(); expect(dialog().openDialogs.length).toBe(0); expect(api.excluir).not.toHaveBeenCalled();
    api.listarUsuariosDoPerfil.and.returnValue(of([])); fixture.componentInstance.excluir(1); await settle(); expect(document.querySelector('.confirmation--destructive')).not.toBeNull(); expect(api.excluir).not.toHaveBeenCalled();
    document.querySelector<HTMLButtonElement>('.confirmation-back')!.click(); await settle(); expect(api.excluir).not.toHaveBeenCalled();
    fixture.componentInstance.excluir(1); await settle(); document.querySelector<HTMLButtonElement>('.confirmation-submit')!.click(); await settle(); expect(api.excluir).toHaveBeenCalledOnceWith(1);
  });
  it('não expõe ações não autorizadas nem abre editor ou troca de perfil', async () => {
    permissions.delete('PERFIS_PERMISSOES_EDITAR'); permissions.delete('PERFIS_PERMISSOES_EXCLUIR'); permissions.delete('PERFIS_PERMISSOES_CADASTRAR'); await settle();
    expect(root().querySelector('app-mobile-fab-action')).toBeNull(); expect(root().querySelector('.perfil-mobile-item [mat-icon-button]')).toBeNull(); fixture.componentInstance.editar(profile); fixture.componentInstance.openDialogPerfil('Add'); fixture.componentInstance.excluir(1); fixture.componentInstance.openDialogTrocarPerfil(user); expect(dialog().openDialogs.length).toBe(0);
    permissions.delete('PERFIS_PERMISSOES_VER'); await settle(); expect(root().textContent).toContain('Acesso restrito'); expect(root().querySelector('.perfil-mobile-item')).toBeNull();
  });
  for (const width of [360, 390, 430, 1024, 1440]) it(`mantém página e editor de permissões na área útil em ${width}px`, async () => {
    viewport.next({ matches: width <= 760, breakpoints: {} }); await settle(); fixture.componentInstance.selecionarPerfil(profile); await settle();
    const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:900px;border:0`; document.body.appendChild(frame);
    try {
      const doc = frame.contentDocument!; const styles = () => Array.from(document.styleSheets).forEach(sheet => { const style = doc.createElement('style'); style.textContent = Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); doc.head.appendChild(style); }); styles(); doc.body.style.cssText = 'margin:0;--mobile-bottom-nav-height:80px'; doc.body.appendChild(root().cloneNode(true));
      if (width <= 760) { expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); expect(doc.querySelectorAll('.perfil-mobile-item').length).toBe(1); expect(doc.querySelector('.perfil-usuario-mobile')).not.toBeNull(); expect(doc.querySelector('table')).toBeNull(); }
      else { expect(doc.querySelector('.perfil-mobile-item')).toBeNull(); expect(doc.querySelector('.perfil-list')).not.toBeNull(); expect(doc.querySelector('table')).not.toBeNull(); expect(doc.querySelector('app-mobile-fab-action')).toBeNull(); }
      await openEdit(); const c = editor(); c.onBuscaChange(''); c.modulos.forEach(m => { c.alternarModulo(m); m.recursos.forEach(r => { if (!c.recursoExpandido(m, r)) c.alternarRecurso(m, r); }); }); await settle();
      // Ensure all groups are visible while measuring long permission labels/codes.
      c.modulos.forEach(m => { if (!c.moduloExpandido(m)) c.alternarModulo(m); }); await settle(); styles(); doc.body.innerHTML = '';
      if (width <= 760) {
        const pane = document.querySelector<HTMLElement>('.mobile-side-panel')!.cloneNode(true) as HTMLElement; pane.style.cssText = 'position:fixed;top:0;right:0;width:100vw;height:100dvh;max-width:100vw;max-height:100dvh'; doc.body.appendChild(pane);
        const final = doc.createElement('style'); final.textContent = '.mobile-side-panel .mat-mdc-dialog-inner-container { animation:none!important; transform:none!important; }'; doc.head.appendChild(final);
        const body = doc.querySelector<HTMLElement>('.mobile-side-panel__body')!; expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth); expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width);
        expect(doc.querySelector('.mobile-side-panel__footer')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(900); doc.querySelectorAll('.collapse-button').forEach(button => expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44));
      } else {
        expect(document.querySelector('.mobile-side-panel')).toBeNull(); expect(document.querySelector('.dialog-head')!.textContent).toContain('Defina os dados'); expect(document.querySelector('.dialog-actions')).not.toBeNull();
      }
      await close();
    } finally { frame.remove(); }
  });
});
