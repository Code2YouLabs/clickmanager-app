import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { of, Subject, throwError } from 'rxjs';
import { SetupProgress } from 'src/app/components/setup-progress/setup-progress.component';
import { BibliotecaDialogComponent } from './biblioteca-dialog.component';
import { BibliotecaProdutosSelectorComponent } from './biblioteca-produtos-selector.component';
import { BibliotecaItem, BibliotecaService } from './biblioteca.service';

const item: BibliotecaItem = { id: 1, tipo: 'PRODUTO', nome: 'Adesivo', descricao: 'Impressão colorida', material: 'Vinil', categoria: 'Adesivos > Vinil', tiposPreco: ['FIXO'], acabamentos: [], jaExiste: true };
const items = [item, { ...item, id: 2, nome: 'Panfleto', categoria: 'Impressos > Papel' }, { ...item, id: 3, nome: 'Adesivo couchê', categoria: 'Adesivos > Papel' }];
const finished: SetupProgress = { id: 10, status: 'CONCLUIDO', fase: 'CONCLUIDO', total: 216, processados: 216, criados: 200, duplicados: 16, erros: 0, tempoEstimadoRestanteSegundos: null, itens: [] };

describe('Biblioteca — lista compacta mobile', () => {
  let fixture: ComponentFixture<BibliotecaDialogComponent>;
  let selector: BibliotecaProdutosSelectorComponent;
  let api: jasmine.SpyObj<BibliotecaService>;
  const root = () => fixture.nativeElement as HTMLElement;
  const render = () => fixture.detectChanges();
  const list = () => root().querySelector<HTMLElement>('.biblioteca-mobile-list')!;
  const importButton = () => root().querySelector<HTMLButtonElement>('.mobile-side-panel__footer button')!;
  beforeEach(() => {
    api = jasmine.createSpyObj('BibliotecaService', ['ultima', 'listar', 'importar', 'acompanhar']);
    api.ultima.and.returnValue(of(null)); api.listar.and.returnValue(of(items));
    TestBed.configureTestingModule({ imports: [BibliotecaDialogComponent, NoopAnimationsModule], providers: [
      { provide: BibliotecaService, useValue: api }, { provide: MAT_DIALOG_DATA, useValue: { mobilePanel: true } },
      { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
    ] });
    fixture = TestBed.createComponent(BibliotecaDialogComponent); render();
    selector = fixture.debugElement.query(By.directive(BibliotecaProdutosSelectorComponent)).componentInstance;
  });
  afterEach(() => fixture.destroy());

  it('substitui árvore/toggle por lista de checkbox com identificação e estado existente', () => {
    expect(root().querySelector('app-hierarchy-tree')).toBeNull(); expect(root().querySelector('mat-button-toggle-group')).toBeNull();
    expect(list().querySelectorAll('[role="listitem"]').length).toBe(3);
    expect(list().textContent).toContain('Vinil'); expect(list().textContent).toContain('Já cadastrado na empresa');
    expect(list().textContent).not.toContain('Adesivos > Vinil'); expect(selector.arvore).toEqual([]);
    expect(importButton().textContent).toContain('Adicionar à empresa'); expect(importButton().disabled).toBeTrue();
    list().querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(); render();
    expect(selector.selecionados.has('PRODUTO:1')).toBeTrue(); expect(importButton().textContent).toContain('Adicionar 1 produto');
    expect(importButton().disabled).toBeFalse();
  });

  it('combina debounce, categorias ancestrais e seleção dos resultados sem perder seleções ocultas', fakeAsync(() => {
    list().querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(); render();
    const search = root().querySelector<HTMLInputElement>('.biblioteca-toolbar input')!;
    search.value = 'panfleto'; search.dispatchEvent(new Event('input')); tick(299); expect(selector.filtrados.length).toBe(3);
    tick(1); render(); expect(selector.filtrados.length).toBe(1); expect(selector.selecionados.size).toBe(1);
    root().querySelector<HTMLButtonElement>('.biblioteca-mobile-selection button')!.click(); render();
    expect(selector.selecionados.size).toBe(2); expect(root().querySelector('.biblioteca-mobile-selection')!.textContent).toContain('2 no total');
    expect(importButton().textContent).toContain('Adicionar 2 produtos'); expect(search.value).toBe('panfleto');
    search.value = ''; search.dispatchEvent(new Event('input')); tick(300); render();
    expect(selector.categoriasMobile).toContain('Adesivos'); expect(selector.categoriasMobile).toContain('Adesivos > Vinil');
    selector.categoria = 'Adesivos'; render(); expect(selector.filtrados.map(i => i.id)).toEqual([1, 3]);
    expect(selector.selecionados.size).toBe(2); expect(root().querySelector('.biblioteca-mobile-selection button')!.getAttribute('aria-pressed')).toBe('mixed');
    selector.selecionarTodos(true); render(); expect(selector.selecionados.size).toBe(3);
    selector.categoria = 'Adesivos > Vinil'; render(); expect(selector.filtrados).toEqual([item]);
    root().querySelector<HTMLButtonElement>('.biblioteca-mobile-selection button')!.click(); render();
    expect(selector.selecionados.size).toBe(2); expect(selector.selecionados.has('PRODUTO:2')).toBeTrue();
  }));

  it('usa as opções reais de categoria no mat-select, sem modal adicional', async () => {
    root().querySelector<HTMLElement>('mat-select')!.click(); render(); await fixture.whenStable();
    const option = Array.from(document.querySelectorAll<HTMLElement>('mat-option')).find(o => o.textContent!.trim() === 'Adesivos')!;
    option.click(); render(); await fixture.whenStable(); render(); expect(selector.filtrados.length).toBe(2); expect(document.querySelector('.mat-mdc-select-panel')).toBeNull();
  });

  it('mantém progresso compacto, bloqueia duplicação e mostra conclusão sem barra permanente', () => {
    const progress = new Subject<SetupProgress>(); const pending = { ...finished, status: 'PROCESSANDO' as const, fase: 'IMPORTANDO_ITENS', processados: 5 };
    api.importar.and.returnValue(of(pending)); api.acompanhar.and.returnValue(progress);
    selector.marcar(item, true); render(); importButton().click(); render(); selector.adicionar();
    expect(api.importar).toHaveBeenCalledOnceWith([item], false); expect(importButton().disabled).toBeTrue(); expect(importButton().textContent).toContain('Adicionando...');
    expect(list()).toBeNull(); expect(root().querySelector('.setup-progress--compact')).not.toBeNull();
    progress.next(pending); render(); expect(root().textContent).toContain('5 de 216 itens processados'); expect(root().querySelector('app-setup-progress mat-progress-bar')).not.toBeNull();
    progress.next(finished); render(); expect(root().textContent).toContain('200 adicionados · 16 já existiam');
    expect(root().querySelector('app-setup-progress mat-progress-bar')).toBeNull(); expect(list()).not.toBeNull();
    expect(fixture.componentInstance.alterado).toBeTrue(); expect(api.listar.calls.count()).toBe(2);
  });

  it('preserva alertas e detalhes de erro na conclusão compacta', () => {
    selector.job = { ...finished, status: 'ERRO', fase: 'ERRO', erros: 1, alertaPreparacao: 'Verifique os itens', itens: [{ id: 4, tipo: 'PRODUTO', templateId: 1, status: 'ERRO', nome: 'Adesivo', mensagem: 'Falha de preparação', criadoId: null }] }; render();
    expect(root().textContent).toContain('Não foi possível concluir'); expect(root().textContent).toContain('Verifique os itens');
    expect(root().querySelector('details')!.textContent).toContain('Adesivo: Falha de preparação'); expect(root().querySelector('app-setup-progress mat-progress-bar')).toBeNull();
  });

  it('mantém vazio e reconexão após erro sem perder a seleção', () => {
    selector.marcar(item, true); api.listar.and.returnValue(throwError(() => new Error('falha'))); selector.carregar(); render();
    expect(root().querySelector('[role="alert"]')!.textContent).toContain('Não foi possível carregar'); expect(importButton().disabled).toBeTrue();
    api.listar.and.returnValue(of([])); root().querySelector<HTMLButtonElement>('[role="alert"] button')!.click(); render();
    expect(list().textContent).toContain('Nenhum item encontrado'); expect(selector.selecionados.size).toBe(1);
  });

  it('reutiliza os elementos DOM de centenas de produtos ao selecionar e mantém chaves de produto/serviço distintas', () => {
    selector.itens = Array.from({ length: 216 }, (_, id) => ({ ...item, id })); render();
    const nodes = Array.from(list().children); selector.marcar(selector.itens[1], true); render();
    expect(Array.from(list().children)).toEqual(nodes); expect(nodes.length).toBe(216);
    selector.itens = [item, { ...item, tipo: 'SERVICO' }]; selector.selecionarTodos(true); render();
    expect(selector.selecionados.has('PRODUTO:1')).toBeTrue(); expect(selector.selecionados.has('SERVICO:1')).toBeTrue();
  });
});

for (const width of [1024, 1440]) {
  describe(`Biblioteca desktop preservada em ${width}px`, () => {
    it('mantém árvore, detalhes, controles de seleção, progresso completo e rodapé original', async () => {
      TestBed.configureTestingModule({ imports: [BibliotecaDialogComponent, NoopAnimationsModule], providers: [
        { provide: BibliotecaService, useValue: { ultima: () => of(finished), listar: () => of(items) } },
        { provide: MAT_DIALOG_DATA, useValue: null }, { provide: MatDialogRef, useValue: { close: () => {} } },
      ] });
      const f = TestBed.createComponent(BibliotecaDialogComponent); f.detectChanges(); await f.whenStable(); f.detectChanges();
      const selector = f.debugElement.query(By.directive(BibliotecaProdutosSelectorComponent)).componentInstance as BibliotecaProdutosSelectorComponent;
      const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:900px;border:0`; document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!;
        Array.from(document.styleSheets).forEach(sheet => { const style = doc.createElement('style'); style.textContent = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n'); doc.head.appendChild(style); });
        doc.body.style.margin = '0'; doc.body.appendChild(f.nativeElement.cloneNode(true));
        expect(doc.querySelector('app-hierarchy-tree')).not.toBeNull(); expect(doc.querySelectorAll('mat-button-toggle').length).toBe(2);
        expect(doc.querySelector('.setup-progress--compact')).toBeNull(); expect(doc.querySelector('app-setup-progress mat-progress-bar')).not.toBeNull();
        expect(doc.querySelector('.biblioteca-mobile-list')).toBeNull(); expect(doc.querySelector('.dialog-head')!.textContent).toContain('Biblioteca de produtos e serviços');
        expect(doc.querySelector('.dialog-actions')!.textContent).toContain('Adicionar à empresa'); expect(selector.categorias).not.toContain('Adesivos');
        const checkbox = f.nativeElement.querySelector('app-hierarchy-tree input[type="checkbox"]') as HTMLInputElement; checkbox.click(); f.detectChanges();
        const selected = selector.selecionados.size; expect(selected).toBeGreaterThan(0);
        f.nativeElement.querySelectorAll('mat-button-toggle button')[1].click(); f.detectChanges();
        expect(selector.modo).toBe('detalhada'); expect(f.nativeElement.querySelector('.biblioteca-lista')).not.toBeNull(); expect(selector.selecionados.size).toBe(selected);
      } finally { frame.remove(); f.destroy(); }
    });
  });
}
