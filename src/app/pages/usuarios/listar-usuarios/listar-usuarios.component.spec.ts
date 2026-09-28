import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { MatPaginator } from '@angular/material/paginator';
import { of, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { UsuarioService } from '../services/usuario.service';
import { ListarUsuariosComponent } from './listar-usuarios.component';
import { ImagemUtil } from 'src/app/utils/imagem-util';

const usuario = { id: 7, nome: 'Ana', username: 'ana@example.com', ativo: true, perfil: { id: 2, nome: 'Operador', permissoes: [] }, fotoPerfil: 'ana.jpg' };
describe('Usuários — listagem compartilhada', () => {
  let fixture: ComponentFixture<ListarUsuariosComponent>;
  let component: ListarUsuariosComponent;
  let service: jasmine.SpyObj<UsuarioService>;
  let auth: jasmine.SpyObj<AuthService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let requests: Subject<any>[];
  const page = (content = [usuario], totalElements = content.length) => ({ content, totalElements });
  const text = () => fixture.nativeElement.textContent as string;
  const table = () => fixture.debugElement.query(By.directive(DataTableComponent)).componentInstance as DataTableComponent<any>;
  const resolve = (value = page()) => { requests[requests.length - 1].next(value); fixture.detectChanges(); };
  beforeEach(() => {
    requests = [];
    service = jasmine.createSpyObj('UsuarioService', ['listar', 'excluir']);
    service.listar.and.callFake(() => { const request = new Subject<any>(); requests.push(request); return request; });
    service.excluir.and.returnValue(of(undefined));
    auth = jasmine.createSpyObj('AuthService', ['temPermissao']); auth.temPermissao.and.returnValue(true);
    dialog = jasmine.createSpyObj('MatDialog', ['open']); dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    TestBed.configureTestingModule({ imports: [ListarUsuariosComponent, NoopAnimationsModule], providers: [provideRouter([]),
      { provide: UsuarioService, useValue: service }, { provide: AuthService, useValue: auth },
      { provide: ToastrService, useValue: jasmine.createSpyObj('Toastr', ['success', 'error']) }]
    });
    TestBed.overrideComponent(ListarUsuariosComponent, { add: { providers: [{ provide: MatDialog, useValue: dialog }] } });
    fixture = TestBed.createComponent(ListarUsuariosComponent); component = fixture.componentInstance; fixture.detectChanges();
  });
  it('inicia em Ativos, mostra loading e depois todas as colunas sem busca textual', () => {
    expect(service.listar).toHaveBeenCalledOnceWith(0, 10, true);
    expect(text()).toContain('Carregando registros'); expect(text()).not.toContain('Nenhum usuário'); resolve();
    for (const value of ['Foto', 'Nome', 'E-mail', 'Perfil', 'Status', 'Ações', 'Ana', 'ana@example.com', 'Operador', 'Ativo']) expect(text()).toContain(value);
    expect(fixture.nativeElement.querySelector('app-input-pesquisa')).toBeNull();
  });
  it('encaminha true/false/null do select compartilhado ao servidor e reinicia página', () => {
    resolve(page([usuario], 60)); component.pagina = 3;
    const select = fixture.debugElement.query(By.directive(MatSelect)).componentInstance as MatSelect;
    select.selectionChange.emit({ source: select, value: false }); fixture.detectChanges();
    expect(service.listar).toHaveBeenCalledWith(0, 10, false); resolve(page([{ ...usuario, ativo: false }], 20));
    expect(text()).toContain('Inativo');
    select.selectionChange.emit({ source: select, value: null }); fixture.detectChanges();
    expect(service.listar).toHaveBeenCalledWith(0, 10, null); resolve();
    select.selectionChange.emit({ source: select, value: true }); expect(service.listar).toHaveBeenCalledWith(0, 10, true);
  });
  it('paginação mantém filtro Inativos e tamanho enviado pelo paginator', () => {
    component.onFiltros({ ativo: false }); resolve(page([{ ...usuario, ativo: false }], 90));
    fixture.debugElement.query(By.directive(MatPaginator)).componentInstance.page.emit({ pageIndex: 2, pageSize: 20, length: 90 });
    expect(service.listar).toHaveBeenCalledWith(2, 20, false);
  });
  it('limpar filtros seleciona Todos e página zero', () => {
    resolve(); component.pagina = 4; table().onClearFilters();
    expect(service.listar).toHaveBeenCalledWith(0, 10, null);
  });
  it('preserva dados e total durante refresh e falha recuperável', () => {
    resolve(page([usuario], 45)); component.carregarUsuarios(); fixture.detectChanges();
    expect(text()).toContain('Atualizando registros'); expect(text()).toContain('Ana');
    requests[1].error({ status: 500 }); fixture.detectChanges();
    expect(text()).toContain('Não foi possível atualizar'); expect(text()).toContain('Ana'); expect(component.totalUsuarios).toBe(45);
    fixture.nativeElement.querySelector('.data-table-state button').click(); resolve(); expect(text()).not.toContain('Não foi possível');
  });
  it('erro inicial não vira empty e retry recupera', () => {
    requests[0].error({ status: 500 }); fixture.detectChanges();
    expect(text()).toContain('Não foi possível carregar'); expect(text()).not.toContain('Nenhum usuário');
    fixture.nativeElement.querySelector('.data-table-state button').click(); resolve(); expect(text()).toContain('Ana');
  });
  it('403 oculta conteúdo anterior e bloqueia ação', () => {
    resolve(); component.carregarUsuarios(); requests[1].error({ status: 403 }); fixture.detectChanges();
    expect(text()).toContain('Acesso restrito'); expect(fixture.nativeElement.querySelector('table')).toBeNull();
    component.onAcao({ action: 'excluir', row: usuario }); expect(dialog.open).not.toHaveBeenCalled();
  });
  it('distingue vazio filtrado e vazio em Todos', () => {
    resolve(page([])); expect(text()).toContain('Nenhum usuário encontrado');
    component.onFiltros({ ativo: null }); resolve(page([])); expect(text()).toContain('Nenhum usuário cadastrado');
  });
  it('cancela resposta obsoleta e libera request ao destruir', () => {
    component.onFiltros({ ativo: false }); expect(requests[0].observed).toBeFalse();
    resolve(page([{ ...usuario, nome: 'Atual' }])); requests[0].next(page()); fixture.detectChanges();
    expect(text()).toContain('Atual'); expect(text()).not.toContain('Ana'); fixture.destroy(); expect(requests[1].observed).toBeFalse();
  });
  it('editar navega para rota existente', () => {
    resolve(); const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture.nativeElement.querySelector('[aria-label="Editar usuário"]').click(); expect(navigate).toHaveBeenCalledOnceWith(['/page/usuarios/editar', 7]);
  });
  it('excluir confirma, deleta e recarrega preservando filtro', () => {
    resolve(); fixture.nativeElement.querySelector('[aria-label="Excluir usuário"]').click();
    expect(dialog.open.calls.mostRecent().args[1]?.data).toEqual(jasmine.objectContaining({ title: 'Excluir usuário', message: 'Tem certeza que deseja excluir o usuário "Ana"?' }));
    expect(service.excluir).toHaveBeenCalledOnceWith(7); expect(service.listar.calls.count()).toBe(2);
  });
  it('cancelar confirmação não deleta', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as any); resolve();
    fixture.nativeElement.querySelector('[aria-label="Excluir usuário"]').click(); expect(service.excluir).not.toHaveBeenCalled();
  });
  it('respeita permissões de cadastrar, editar e excluir', () => {
    fixture.destroy(); auth.temPermissao.and.returnValue(false);
    fixture = TestBed.createComponent(ListarUsuariosComponent); fixture.detectChanges(); resolve();
    expect(text()).not.toContain('Novo Usuário'); expect(fixture.nativeElement.querySelector('[aria-label="Editar usuário"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Excluir usuário"]')).toBeNull();
    fixture.componentInstance.onAcao({ action: 'excluir', row: usuario }); expect(dialog.open).not.toHaveBeenCalled();
  });
  it('preserva URL da foto e fallback sem loop', () => {
    resolve(); const img: HTMLImageElement = fixture.nativeElement.querySelector('td img');
    expect(img.getAttribute('src')).toBe(ImagemUtil.montarUrlImagemPerfil('ana.jpg'));
    img.dispatchEvent(new Event('error')); expect(img.src).toContain('assets/images/profile/user-1.jpg');
    img.dispatchEvent(new Event('error')); expect(img.dataset['fallbackApplied']).toBe('true');
    resolve(page([{ ...usuario, id: 9, fotoPerfil: '' }])); expect(fixture.nativeElement.querySelector('td img').src).toContain('assets/images/profile/user-1.jpg');
  });
});
