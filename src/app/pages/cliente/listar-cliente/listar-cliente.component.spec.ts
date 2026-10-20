import { BreakpointObserver } from '@angular/cdk/layout';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { ClienteService } from '../cliente.service';
import { ListarClienteComponent } from './listar-cliente.component';

const cliente = { id: 7, nome: 'Ana', email: 'ana@example.com', telefone: '11987654321' };
describe('Clientes — listagem compartilhada', () => {
  let fixture: ComponentFixture<ListarClienteComponent>;
  let component: ListarClienteComponent;
  let service: jasmine.SpyObj<ClienteService>;
  let auth: jasmine.SpyObj<AuthService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let requests: Subject<any>[];
  let viewport: BehaviorSubject<any>;
  const page = (content = [cliente], totalElements = content.length) => ({ content, totalElements });
  const text = () => fixture.nativeElement.textContent as string;
  const table = () => fixture.debugElement.query(By.directive(DataTableComponent)).componentInstance as DataTableComponent<any>;
  const resolve = (value = page()) => { requests[requests.length - 1].next(value); fixture.detectChanges(); };
  beforeEach(() => {
    requests = [];
    viewport = new BehaviorSubject({ matches: false, breakpoints: {} });
    service = jasmine.createSpyObj('ClienteService', ['listar', 'excluir']);
    service.listar.and.callFake(() => { const request = new Subject<any>(); requests.push(request); return request; });
    service.excluir.and.returnValue(of(undefined));
    auth = jasmine.createSpyObj('AuthService', ['temPermissao', 'getDefaultRouteForUsuario']);
    auth.getDefaultRouteForUsuario.and.returnValue('/dashboards/dashboard1'); auth.temPermissao.and.returnValue(true);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    TestBed.configureTestingModule({
      imports: [ListarClienteComponent, NoopAnimationsModule],
      providers: [
        { provide: BreakpointObserver, useValue: { observe: () => viewport, isMatched: () => viewport.value.matches } },provideRouter([]), { provide: ClienteService, useValue: service }, { provide: AuthService, useValue: auth },
        { provide: MatDialog, useValue: dialog }, { provide: ToastrService, useValue: jasmine.createSpyObj('Toastr', ['success', 'error']) }]
    });
    TestBed.overrideComponent(ListarClienteComponent, { add: { providers: [{ provide: MatDialog, useValue: dialog }] } });
    fixture = TestBed.createComponent(ListarClienteComponent); component = fixture.componentInstance; fixture.detectChanges();
  });
  afterEach(() => fixture?.destroy());
  const mobile = () => { viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges(); };

  it('mobile reutiliza cards, busca e paginação do DataTable e exibe nome e contatos', () => {
    mobile(); resolve(page([cliente], 40));
    expect(table().useMobileItems).toBeTrue(); expect(fixture.nativeElement.querySelector('table')).toBeNull();
    const item = fixture.nativeElement.querySelector('[role="listitem"]');
    for (const value of ['Ana', '(11) 98765-4321', 'ana@example.com', 'Editar cliente', 'Excluir cliente']) expect(item.textContent).toContain(value);
    expect(fixture.nativeElement.querySelector('app-list-filter-bar app-input-pesquisa')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.data-table-mobile-pagination')).not.toBeNull();
    table().pageChange.emit({ pageIndex: 1, pageSize: 10, length: 40 });
    expect(service.listar).toHaveBeenCalledWith(1, 10, '');
    resolve(page([cliente], 40)); table().searchChange.emit('Ana');
    expect(service.listar).toHaveBeenCalledWith(0, 10, 'Ana');
  });

  it('mobile tem Voltar contextual e FAB compartilhado, com as mesmas rotas e permissões', () => {
    mobile(); resolve();
    const root = fixture.nativeElement as HTMLElement;
    const header = root.querySelector('.card-header')!;
    expect(header.textContent).toContain('Clientes'); expect(header.textContent).toContain('Voltar'); expect(header.textContent).not.toContain('Novo cliente');
    expect(root.querySelectorAll('app-mobile-fab-action').length).toBe(1);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    root.querySelector<HTMLButtonElement>('app-mobile-fab-action button')!.click();
    expect(navigate).toHaveBeenCalledWith(['/page/cliente/criar']);
    header.querySelector<HTMLButtonElement>('button')!.click(); expect(navigate).toHaveBeenCalledWith(['/dashboards/dashboard1']);
    auth.getDefaultRouteForUsuario.and.returnValue('/page/deposito');
    header.querySelector<HTMLButtonElement>('button')!.click(); expect(navigate).toHaveBeenCalledWith(['/page/deposito']);
    auth.temPermissao.and.returnValue(false); navigate.calls.reset(); component.novoCliente(); expect(navigate).not.toHaveBeenCalled();
    fixture.destroy(); fixture = TestBed.createComponent(ListarClienteComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-mobile-fab-action')).toBeNull();
  });

  it('mobile mantém as ações existentes e não apresenta contatos vazios sem identificação', () => {
    mobile(); resolve(page([{ ...cliente, email: '', telefone: '' }]));
    expect(text()).toContain('Não informado');
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture.nativeElement.querySelector('[aria-label="Editar cliente"]').click(); expect(navigate).toHaveBeenCalledWith(['/page/cliente/editar', 7]);
    fixture.nativeElement.querySelector('[aria-label="Excluir cliente"]').click(); expect(service.excluir).toHaveBeenCalledOnceWith(7);
  });

  it('mobile mantém loading, erro com retry, vazio e acesso restrito na fundação existente', () => {
    mobile(); expect(text()).toContain('Carregando registros');
    requests[0].error({ status: 500 }); fixture.detectChanges(); expect(text()).toContain('Não foi possível carregar');
    fixture.nativeElement.querySelector('.data-table-state button').click(); resolve(page([])); expect(text()).toContain('Nenhum cliente cadastrado');
    component.onPesquisar('ausente'); resolve(page([])); expect(text()).toContain('Nenhum cliente encontrado');
    component.onPesquisar('Ana'); resolve(); component.carregarClientes(); fixture.detectChanges();
    expect(text()).toContain('Atualizando registros'); expect(text()).toContain('Ana');
    requests[requests.length - 1].error({ status: 403 }); fixture.detectChanges();
    expect(text()).toContain('Acesso restrito'); expect(fixture.nativeElement.querySelector('[role="listitem"]')).toBeNull();
  });

  it('trocar breakpoint não dispara nova busca nem altera página, tamanho ou termo', () => {
    component.onPesquisar('Ana'); resolve(page([cliente], 50)); component.onPaginaAlterada({ pageIndex: 2, pageSize: 20, length: 50 }); resolve(page([cliente], 50));
    const calls = service.listar.calls.count(); mobile(); viewport.next({ matches: false, breakpoints: {} }); fixture.detectChanges();
    expect(service.listar.calls.count()).toBe(calls); expect(component.pagina).toBe(2); expect(component.tamanhoPagina).toBe(20); expect(component.termoPesquisa).toBe('Ana');
  });

  for (const width of [360, 390, 430, 1024, 1440]) {
    it(`preserva a composição e área útil em viewport Chromium de ${width}px`, () => {
      if (width <= 760) mobile();
      resolve(page([{ ...cliente, nome: 'Cliente com nome longo para conferir a quebra de texto no card', email: 'email.muito.longo.para.testar.a.quebra@example.com' }], 30));
      const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:800px;border:0`;
      document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!;
        document.querySelectorAll('style').forEach(style => doc.head.appendChild(style.cloneNode(true)));
        doc.body.style.cssText = 'margin:0;--mobile-bottom-nav-height:80px'; doc.body.appendChild(fixture.nativeElement.cloneNode(true));
        if (width <= 760) {
          expect(doc.querySelector('table')).toBeNull();
          expect(doc.querySelector('.data-table-items')).not.toBeNull();
          expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width);
          const fab = doc.querySelector<HTMLElement>('app-mobile-fab-action button')!.getBoundingClientRect();
          expect(fab.width).toBe(56); expect(fab.height).toBeGreaterThanOrEqual(56); expect(fab.right).toBeLessThanOrEqual(width - 16);
          expect(fab.bottom).toBeLessThanOrEqual(800 - 80 - 16);
          const clearance = doc.querySelector<HTMLElement>('.page-card__fab-clearance')!.getBoundingClientRect();
          expect(clearance.height).toBeGreaterThan(fab.height);
          const name = doc.querySelector<HTMLElement>('.cliente-mobile-item header strong')!;
          expect(name.getBoundingClientRect().right).toBeLessThanOrEqual(width);
        } else {
          expect(doc.querySelector('.data-table-items')).toBeNull(); expect(doc.querySelector('app-mobile-fab-action')).toBeNull();
          expect(doc.querySelector('app-card-header')!.textContent).not.toContain('Voltar');
          const action = doc.querySelector<HTMLButtonElement>('app-card-header button')!;
          expect(action.textContent).toContain('Novo cliente'); expect(action.hasAttribute('mat-stroked-button')).toBeTrue();
          expect(Array.from(doc.querySelectorAll('thead th')).map(cell => cell.textContent?.trim())).toEqual(['Nome', 'E-mail', 'Telefone', 'Ações']);
          expect(doc.querySelector('mat-paginator')).not.toBeNull();
        }
      } finally { frame.remove(); }
    });
  }

  it('mostra loading inicial e depois colunas, cliente e telefone formatado', () => {
    expect(text()).toContain('Carregando registros'); expect(text()).not.toContain('Nenhum cliente');
    resolve();
    for (const value of ['Nome', 'E-mail', 'Telefone', 'Ações', 'Ana', 'ana@example.com', '(11)', '98765-4321']) expect(text()).toContain(value);
  });
  it('pesquisa no servidor com um único debounce e volta à página zero', fakeAsync(() => {
    resolve(page([cliente], 80));
    table().pageChange.emit({ pageIndex: 3, pageSize: 10, length: 80 }); resolve();
    service.listar.calls.reset();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('app-input-pesquisa input');
    input.value = 'An'; input.dispatchEvent(new Event('input')); tick(200);
    input.value = 'Ana'; input.dispatchEvent(new Event('input')); tick(399);
    expect(service.listar).not.toHaveBeenCalled(); tick(1);
    expect(service.listar).toHaveBeenCalledOnceWith(0, 10, 'Ana');
    resolve(page([{ ...cliente, nome: 'Resultado do servidor' }], 25));
    expect(text()).toContain('Resultado do servidor');
    expect(fixture.debugElement.query(By.directive(MatPaginator)).componentInstance.pageIndex).toBe(0);
    tick(500); expect(service.listar.calls.count()).toBe(1);
  }));
  it('encaminha página, tamanho e busca ao backend', () => {
    component.onPesquisar('Ana'); resolve(page([cliente], 90));
    table().pageChange.emit({ pageIndex: 2, pageSize: 20, length: 90 });
    expect(service.listar).toHaveBeenCalledWith(2, 20, 'Ana');
  });
  it('limpar busca consulta o conjunto completo na página zero', () => {
    component.onPesquisar('Ana'); component.pagina = 4; table().searchChange.emit('');
    expect(service.listar).toHaveBeenCalledWith(0, 10, '');
  });
  it('preserva registros e total durante refreshing e falha com retry', () => {
    resolve(page([cliente], 45)); component.carregarClientes(); fixture.detectChanges();
    expect(text()).toContain('Atualizando registros'); expect(text()).toContain('Ana');
    requests[1].error({ status: 500 }); fixture.detectChanges();
    expect(text()).toContain('Não foi possível atualizar'); expect(text()).toContain('Ana'); expect(component.totalClientes).toBe(45);
    fixture.nativeElement.querySelector('.data-table-state button').click();
    expect(service.listar.calls.count()).toBe(3); resolve(); expect(text()).not.toContain('Não foi possível');
  });
  it('erro inicial não é vazio e retry recupera os dados', () => {
    requests[0].error({ status: 500 }); fixture.detectChanges();
    expect(text()).toContain('Não foi possível carregar'); expect(text()).not.toContain('Nenhum cliente');
    fixture.nativeElement.querySelector('.data-table-state button').click(); resolve(); expect(text()).toContain('Ana');
  });
  it('403 oculta dados e ações mesmo após conteúdo carregado', () => {
    resolve(); component.carregarClientes(); requests[1].error({ status: 403 }); fixture.detectChanges();
    expect(text()).toContain('Acesso restrito'); expect(fixture.nativeElement.querySelector('table')).toBeNull();
    component.onAcao({ action: 'excluir', row: cliente }); expect(dialog.open).not.toHaveBeenCalled();
  });
  it('distingue vazio real e vazio filtrado', () => {
    resolve(page([])); expect(text()).toContain('Nenhum cliente cadastrado');
    table().searchChange.emit('ausente'); resolve(page([])); expect(text()).toContain('Nenhum cliente encontrado');
  });
  it('cancela consulta obsoleta e não sobrescreve resultado mais recente', () => {
    component.onPesquisar('recente'); expect(requests[0].observed).toBeFalse();
    resolve(); requests[0].next(page([{ ...cliente, nome: 'Obsoleto' }])); fixture.detectChanges();
    expect(text()).toContain('Ana'); expect(text()).not.toContain('Obsoleto');
    fixture.destroy(); expect(requests[1].observed).toBeFalse();
  });
  it('editar navega à rota existente', () => {
    resolve(); const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture.nativeElement.querySelector('[aria-label="Editar cliente"]').click();
    expect(navigate).toHaveBeenCalledOnceWith(['/page/cliente/editar', 7]);
  });
  it('excluir confirma o cliente e atualiza após sucesso', () => {
    resolve(); fixture.nativeElement.querySelector('[aria-label="Excluir cliente"]').click();
    expect(dialog.open.calls.mostRecent().args[1]?.data).toEqual(jasmine.objectContaining({ message: 'Tem certeza que deseja excluir o cliente "Ana"?' }));
    expect(service.excluir).toHaveBeenCalledOnceWith(7); expect(service.listar.calls.count()).toBe(2);
  });
  it('cancelar confirmação não exclui', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as any);
    resolve(); fixture.nativeElement.querySelector('[aria-label="Excluir cliente"]').click(); expect(service.excluir).not.toHaveBeenCalled();
  });
  it('respeita permissões de criar, editar e excluir', () => {
    auth.temPermissao.and.returnValue(false); resolve();
    expect(fixture.nativeElement.querySelector('[aria-label="Editar cliente"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Excluir cliente"]')).toBeNull();
    // A permissão do header é avaliada na criação da view pela diretiva existente.
    fixture.destroy(); fixture = TestBed.createComponent(ListarClienteComponent); fixture.detectChanges();
    expect(text()).not.toContain('Novo cliente');
    fixture.componentInstance.onAcao({ action: 'excluir', row: cliente }); expect(dialog.open).not.toHaveBeenCalled();
  });
});
