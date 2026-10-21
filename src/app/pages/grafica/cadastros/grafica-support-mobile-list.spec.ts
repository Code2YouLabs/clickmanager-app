import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { GraficaProdutoService } from '../shared/grafica.service';
import { GraficaMateriaisComponent } from '../materiais/grafica-materiais.component';
import { GraficaFormatosComponent } from '../formatos/grafica-formatos.component';
import { GraficaCoresComponent } from '../cores/grafica-cores.component';
import { GraficaServicosComponent } from '../servicos/grafica-servicos.component';

const entries = [
  { component: GraficaMateriaisComponent, path: 'materiais', load: 'listarMateriais', remove: 'excluirMaterial', columns: 3 },
  { component: GraficaFormatosComponent, path: 'formatos', load: 'listarFormatos', remove: 'excluirFormato', columns: 5 },
  { component: GraficaCoresComponent, path: 'cores', load: 'listarCores', remove: 'excluirCor', columns: 3 },
  { component: GraficaServicosComponent, path: 'servicos', load: 'listarServicos', remove: 'excluirServico', columns: 4 },
] as const;
const item = { id: 1, nome: 'Item com nome longo para conferir a identificação no celular', descricao: 'Descrição do cadastro', ativo: true,
  largura: 10, altura: 15, larguraUtil: 9, alturaUtil: 14, unidadeDimensao: 'CENTIMETRO', politicas: [{ tipo: 'FIXO', valorFixo: 12, ativo: true }] };
for (const entry of entries) {
  describe(`${entry.path} — listagem mobile compartilhada`, () => {
    let fixture: ComponentFixture<any>;
    let viewport: BehaviorSubject<any>;
    let api: any;
    let router: jasmine.SpyObj<Router>;
    let auth: jasmine.SpyObj<AuthService>;
    const root = () => fixture.nativeElement as HTMLElement;
    const render = () => { fixture.detectChanges(); fixture.detectChanges(); };
    const settle = async () => { render(); await fixture.whenStable(); render(); };
    const table = () => fixture.debugElement.query(By.directive(DataTableComponent)).componentInstance as DataTableComponent;
    const menu = async () => { root().querySelector<HTMLButtonElement>('.cadastro-mobile-item__menu')!.click(); await settle(); };
    const action = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-panel button')).find(b => b.querySelector('.mat-mdc-menu-item-text')?.textContent?.trim() === label)!;
    beforeEach(() => {
      viewport = new BehaviorSubject({ matches: true, breakpoints: {} }); api = jasmine.createSpyObj('GraficaProdutoService', [entry.load, entry.remove]);
      api[entry.load].and.returnValue(of([item])); api[entry.remove].and.returnValue(of(void 0));
      auth = jasmine.createSpyObj('AuthService', ['temPermissao']); auth.temPermissao.and.returnValue(true);
      router = jasmine.createSpyObj('Router', ['navigate']);
      TestBed.configureTestingModule({ imports: [entry.component, NoopAnimationsModule], providers: [
        { provide: BreakpointObserver, useValue: { observe: () => viewport } }, { provide: GraficaProdutoService, useValue: api },
        { provide: AuthService, useValue: auth }, { provide: Router, useValue: router },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
      ] }); fixture = TestBed.createComponent(entry.component as any);
    });
    afterEach(async () => { TestBed.inject(MatDialog).closeAll(); await fixture.whenStable(); fixture.destroy(); TestBed.inject(OverlayContainer).ngOnDestroy(); });
    it('usa cards com descrição e detalhes próprios, sem tabela ou botões grandes', async () => {
      await settle(); expect(table().useMobileItems).toBeTrue(); expect(root().querySelector('table')).toBeNull();
      expect(root().querySelector('.card-header')!.textContent).not.toContain('Voltar'); expect(root().querySelector('.card-header button')).toBeNull();
      const card = root().querySelector('.cadastro-mobile-item')!; expect(card.textContent).toContain(item.nome); expect(card.textContent).toContain(item.descricao); expect(card.querySelectorAll('button').length).toBe(1);
      if (entry.path === 'formatos') { expect(card.textContent).toContain('10 x 15 cm'); expect(card.textContent).toContain('Área útil'); }
      if (entry.path === 'servicos') expect(card.textContent).toContain('12');
      root().querySelector<HTMLButtonElement>('app-mobile-fab-action button')!.click(); expect(router.navigate).toHaveBeenCalledWith([`/page/grafica/${entry.path}/novo`]);
    });
    it('preserva busca com debounce sobre a base completa e paginação sem consultar novamente', fakeAsync(() => {
      api[entry.load].and.returnValue(of(Array.from({ length: 31 }, (_, i) => ({ ...item, id: i, nome: `Registro ${i}`, descricao: i === 30 ? 'Resultado único' : 'Descrição' })))); render();
      table().pageChange.emit({ pageIndex: 2, pageSize: 10, length: 31 }); render(); expect(root().querySelectorAll('.cadastro-mobile-item').length).toBe(10);
      const input = root().querySelector<HTMLInputElement>('app-input-pesquisa input')!; input.value = 'Resultado único'; input.dispatchEvent(new Event('input'));
      tick(299); expect(fixture.componentInstance.termo).toBe(''); tick(1); render();
      expect(fixture.componentInstance.pagina).toBe(0); expect(root().querySelectorAll('.cadastro-mobile-item').length).toBe(1); expect(root().textContent).toContain('Registro 30');
      expect(api[entry.load]).toHaveBeenCalledTimes(1); input.value = ''; input.dispatchEvent(new Event('input')); tick(300); render(); expect(root().querySelectorAll('.cadastro-mobile-item').length).toBe(10);
    }));
    it('preserva editar, clonar e excluir com confirmação e cancelamento', async () => {
      await settle(); await menu(); action('Editar').click(); await settle(); expect(router.navigate).toHaveBeenCalledWith([`/page/grafica/${entry.path}`, 1, 'editar']);
      await menu(); action('Clonar').click(); await settle(); expect(document.querySelector('app-confirm-dialog')!.textContent).toContain(item.nome);
      document.querySelector<HTMLButtonElement>('.confirmation-submit')!.click(); await settle(); expect(router.navigate).toHaveBeenCalledWith([`/page/grafica/${entry.path}/novo`], { queryParams: { cloneFrom: 1 } });
      await menu(); action('Excluir').click(); await settle(); expect(document.querySelector('.confirmation--destructive')).not.toBeNull(); expect(api[entry.remove]).not.toHaveBeenCalled();
      document.querySelector<HTMLButtonElement>('.confirmation-back')!.click(); await settle(); expect(api[entry.remove]).not.toHaveBeenCalled();
      await menu(); action('Excluir').click(); await settle(); document.querySelector<HTMLButtonElement>('.confirmation-submit')!.click(); await settle(); expect(api[entry.remove]).toHaveBeenCalledOnceWith(1);
    });
    it('respeita permissão e os estados loading, erro/retry, vazio e acesso restrito', () => {
      auth.temPermissao.and.returnValue(false); const response = new Subject<any>(); api[entry.load].and.returnValue(response); render(); expect(root().textContent).toContain('Carregando registros');
      response.error({ status: 500 }); render(); expect(root().querySelector('[role="alert"]')).not.toBeNull();
      api[entry.load].and.returnValue(of([])); root().querySelector<HTMLButtonElement>('[role="alert"] button')!.click(); render(); expect(root().textContent).toContain('Nenhum');
      api[entry.load].and.returnValue(of([item])); fixture.componentInstance.carregar(); render(); expect(root().querySelector('.cadastro-mobile-item__menu')).toBeNull(); expect(root().querySelector('app-mobile-fab-action')).toBeNull();
      fixture.componentInstance.novoMobile(); fixture.componentInstance.onMobileAction({ action: 'excluir', row: item }); expect(router.navigate).not.toHaveBeenCalled(); expect(api[entry.remove]).not.toHaveBeenCalled();
      api[entry.load].and.returnValue(throwError(() => ({ status: 403 }))); fixture.componentInstance.carregar(); render(); expect(root().textContent).toContain('Acesso restrito');
    });
    for (const width of [360, 390, 430, 1024, 1440]) {
      it(`preserva layout e área útil em ${width}px`, async () => {
        viewport.next({ matches: width <= 760, breakpoints: {} }); await settle();
        const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:800px;border:0`; document.body.appendChild(frame);
        try {
          const doc = frame.contentDocument!; Array.from(document.styleSheets).forEach(sheet => { const style = doc.createElement('style'); style.textContent = Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); doc.head.appendChild(style); });
          doc.body.style.cssText = 'margin:0;--mobile-bottom-nav-height:80px'; doc.body.appendChild(root().cloneNode(true));
          if (width <= 760) {
            expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); expect(doc.querySelector('table')).toBeNull();
            expect(doc.querySelector('.cadastro-mobile-item__menu')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
            const fab = doc.querySelector('app-mobile-fab-action button')!.getBoundingClientRect(); expect(fab.width).toBe(56); expect(fab.bottom).toBeLessThanOrEqual(704);
            expect(doc.querySelector('.page-card__fab-clearance')!.getBoundingClientRect().height).toBeGreaterThan(fab.height);
          } else {
            expect(doc.querySelector('.cadastro-mobile-item')).toBeNull(); expect(doc.querySelector('app-mobile-fab-action')).toBeNull(); expect(doc.querySelectorAll('thead th').length).toBe(entry.columns);
            expect(doc.querySelectorAll('.acoes-cell button').length).toBe(3); expect(doc.querySelector('.card-header button')).not.toBeNull(); expect(doc.querySelector('mat-paginator')).not.toBeNull();
          }
        } finally { frame.remove(); }
        if (width <= 760) {
          root().style.cssText = `display:block;width:${width}px`; document.body.appendChild(root());
          try { await menu(); const bounds = document.querySelector('.mat-mdc-menu-panel')!.getBoundingClientRect(); expect(bounds.left).toBeGreaterThanOrEqual(root().getBoundingClientRect().left); expect(bounds.right).toBeLessThanOrEqual(root().getBoundingClientRect().right);
            document.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click(); await settle(); expect(document.querySelector('.mat-mdc-menu-panel')).toBeNull();
          } finally { root().remove(); }
        }
      });
    }
  });
}
