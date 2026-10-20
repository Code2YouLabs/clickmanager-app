import { BreakpointObserver } from '@angular/cdk/layout';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CatalogoCategoria } from '../../catalogo/shared/models/catalogo.models';
import { CatalogoCategoriaService } from '../../catalogo/shared/services/catalogo.service';
import { GraficaCategoriaFormComponent } from './grafica-categoria-form.component';

const item: CatalogoCategoria = { id: 2, codigo: 'ADESIVOS', nome: 'Adesivos', slug: 'adesivos', categoriaPaiId: null, descricaoCurta: 'Descrição curta', descricaoCompleta: '<p>Descrição completa</p>', ativo: true };
describe('Nova categoria gráfica — mobile compartilhado', () => {
  let fixture: ComponentFixture<GraficaCategoriaFormComponent>;
  let api: jasmine.SpyObj<CatalogoCategoriaService>;
  let router: jasmine.SpyObj<Router>;
  let viewport: BehaviorSubject<any>;
  let params: BehaviorSubject<any>;
  let query: ReturnType<typeof convertToParamMap>;
  const component = () => fixture.componentInstance;
  const root = () => fixture.nativeElement as HTMLElement;
  const render = () => fixture.detectChanges();
  const settle = async () => { render(); await fixture.whenStable(); render(); };
  const create = async () => { fixture = TestBed.createComponent(GraficaCategoriaFormComponent); await settle(); };
  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} }); params = new BehaviorSubject(convertToParamMap({})); query = convertToParamMap({});
    api = jasmine.createSpyObj('CatalogoCategoriaService', ['options', 'detalhar', 'criar', 'atualizar']); api.options.and.returnValue(of([item])); api.detalhar.and.returnValue(of(item)); api.criar.and.returnValue(of(item)); api.atualizar.and.returnValue(of(item));
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({ imports: [GraficaCategoriaFormComponent, NoopAnimationsModule], providers: [
      { provide: BreakpointObserver, useValue: { observe: () => viewport } }, { provide: CatalogoCategoriaService, useValue: api },
      { provide: Router, useValue: router }, { provide: ActivatedRoute, useValue: { paramMap: params, snapshot: { get queryParamMap() { return query; } } } },
      { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
    ] });
  });
  afterEach(() => fixture?.destroy());
  it('mantém os quatro campos, Voltar no header e um único rodapé compartilhado', async () => {
    await create(); expect(root().querySelector('.card-header')!.textContent).toContain('Nova categoria'); expect(root().querySelector('.card-header')!.textContent).toContain('Voltar');
    expect(root().querySelectorAll('app-mobile-total-bar').length).toBe(1); expect(root().querySelector('.page-card__footer')).toBeNull();
    expect(root().querySelectorAll('.form-grid > *').length).toBe(4); expect(root().querySelector('app-rich-text-preview-field')).not.toBeNull();
    const save = root().querySelector<HTMLButtonElement>('[aria-label="Salvar categoria"]')!; expect(save.disabled).toBeTrue(); expect(save.getAttribute('form')).toBe('grafica-categoria-form');
    root().querySelector<HTMLButtonElement>('[page-mobile-header-actions]')!.click(); expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/categorias']);
  });
  it('salva pelo rodapé com o mesmo payload, bloqueia reenvio e retorna à listagem', async () => {
    const response = new Subject<CatalogoCategoria>(); api.criar.and.returnValue(response); await create(); document.body.appendChild(root());
    try {
      component().form.setValue({ nome: '  Adesivo em Folha  ', categoriaPaiId: 2, descricaoCurta: ' Resumo ', descricaoCompleta: '<p>Detalhes</p>' }); render();
      root().querySelector<HTMLButtonElement>('[aria-label="Salvar categoria"]')!.click(); render(); component().salvar();
      expect(api.criar).toHaveBeenCalledOnceWith(jasmine.objectContaining({ nome: 'Adesivo em Folha', codigo: 'ADESIVO_EM_FOLHA', slug: 'adesivo-em-folha', categoriaPaiId: 2, descricaoCurta: 'Resumo', descricaoCompleta: '<p>Detalhes</p>', ativo: true }));
      expect(root().querySelector<HTMLButtonElement>('[aria-label="Salvar categoria"]')!.disabled).toBeTrue(); expect(root().textContent).toContain('Salvando...');
      response.next(item); response.complete(); await settle(); expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/categorias']);
    } finally { root().remove(); }
  });
  it('mantém Cancelar como limpeza e preserva dados após erro de gravação', async () => {
    await create(); component().nomeControl.setValue('Teste'); render(); root().querySelector<HTMLButtonElement>('[aria-label="Limpar cadastro de categoria"]')!.click(); render();
    expect(component().nomeControl.value).toBe(''); expect(router.navigate).not.toHaveBeenCalled();
    component().nomeControl.setValue('Teste'); api.criar.and.returnValue(throwError(() => new Error('erro'))); component().salvar(); render();
    expect(component().nomeControl.value).toBe('Teste'); expect(component().salvando).toBeFalse(); expect(router.navigate).not.toHaveBeenCalled();
  });
  it('preserva preenchimento de clone e edição sem migrar a edição para o novo rodapé', async () => {
    query = convertToParamMap({ cloneFrom: '2' }); await create(); expect(component().titulo).toBe('Clonar categoria'); expect(component().nomeControl.value).toBe('Adesivos');
    expect(root().querySelector('app-mobile-total-bar')).not.toBeNull(); params.next(convertToParamMap({ id: '2' })); await settle();
    expect(component().titulo).toBe('Editar categoria'); expect(root().querySelector('app-mobile-total-bar')).toBeNull(); expect(root().querySelector('.page-card__footer')).not.toBeNull();
    expect(component().categoriasPaiDisponiveis.length).toBe(0); component().salvar(); expect(api.atualizar).toHaveBeenCalledWith(2, jasmine.objectContaining({ nome: 'Adesivos' })); expect(api.criar).not.toHaveBeenCalled();
  });
  for (const width of [360, 390, 430, 1024, 1440]) {
    it(`mantém formulário e ações na área útil em ${width}px`, async () => {
      viewport.next({ matches: width <= 760, breakpoints: {} }); await create();
      const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:900px;border:0`; document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!; Array.from(document.styleSheets).forEach(sheet => { const style = doc.createElement('style'); style.textContent = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n'); doc.head.appendChild(style); });
        doc.body.style.cssText = 'margin:0;--mobile-bottom-nav-height:80px'; doc.body.appendChild(root().cloneNode(true));
        if (width <= 760) {
          expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); expect(doc.querySelector('.page-card__footer')).toBeNull();
          const bar = doc.querySelector('.mobile-total-bar')!.getBoundingClientRect(); expect(bar.bottom).toBeLessThanOrEqual(820); expect(bar.right).toBeLessThanOrEqual(width);
          expect(doc.querySelector('.form-grid')!.getBoundingClientRect().width).toBeLessThan(width);
          const fields = doc.querySelectorAll('.form-grid > *'); expect(fields[1].getBoundingClientRect().top).toBeGreaterThanOrEqual(fields[0].getBoundingClientRect().bottom);
        } else {
          expect(doc.querySelector('app-mobile-total-bar')).toBeNull(); expect(doc.querySelector('.page-card__footer')).not.toBeNull();
          expect(doc.querySelector('app-section-card')!.textContent).toContain('Dados da categoria');
          const fields = doc.querySelectorAll('.form-grid > *'); expect(fields[0].getBoundingClientRect().top).toBe(fields[1].getBoundingClientRect().top);
        }
      } finally { frame.remove(); }
    });
  }
});
