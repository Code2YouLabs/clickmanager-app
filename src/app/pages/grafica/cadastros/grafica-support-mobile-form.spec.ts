import { BreakpointObserver } from '@angular/cdk/layout';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { GraficaProdutoService } from '../shared/grafica.service';
import { GraficaMaterialFormComponent } from '../materiais/grafica-material-form.component';
import { GraficaFormatoFormComponent } from '../formatos/grafica-formato-form.component';
import { GraficaCorFormComponent } from '../cores/grafica-cor-form.component';
import { GraficaServicoFormComponent } from '../servicos/grafica-servico-form.component';

const entries = [
  { component: GraficaMaterialFormComponent, name: 'material', path: 'materiais', load: 'listarMateriais', save: 'salvarMaterial' },
  { component: GraficaFormatoFormComponent, name: 'formato', path: 'formatos', load: 'listarFormatos', save: 'salvarFormato' },
  { component: GraficaCorFormComponent, name: 'cor', path: 'cores', load: 'listarCores', save: 'salvarCor' },
  { component: GraficaServicoFormComponent, name: 'servico', path: 'servicos', load: 'listarServicos', save: 'salvarServico' },
] as const;
const item = { id: 1, nome: 'Cadastro original', descricao: 'Descrição original', ativo: true, largura: 10, altura: 15, larguraUtil: 9, alturaUtil: 14, unidadeDimensao: 'CENTIMETRO', politicas: [{ tipo: 'FIXO', valorFixo: 12, ativo: true }] };
for (const entry of entries) {
  describe(`${entry.path} — cadastro e edição mobile`, () => {
    let fixture: ComponentFixture<any>;
    let api: any;
    let router: jasmine.SpyObj<Router>;
    let viewport: BehaviorSubject<any>;
    let params: BehaviorSubject<any>;
    let query: ReturnType<typeof convertToParamMap>;
    const root = () => fixture.nativeElement as HTMLElement;
    const component = () => fixture.componentInstance;
    const render = () => fixture.detectChanges();
    const settle = async () => { render(); await fixture.whenStable(); render(); };
    const create = async () => { fixture = TestBed.createComponent(entry.component as any); await settle(); };
    const save = () => root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!;
    const fill = () => { component().form.patchValue({ nome: '  Novo cadastro  ', descricao: ' Descrição nova ' }); if (entry.name === 'servico') component().precoForm.patchValue({ valor: 25 }); render(); };
    beforeEach(() => {
      viewport = new BehaviorSubject({ matches: true, breakpoints: {} }); params = new BehaviorSubject(convertToParamMap({})); query = convertToParamMap({});
      api = jasmine.createSpyObj('GraficaProdutoService', [entry.load, entry.save]); api[entry.load].and.returnValue(of([item])); api[entry.save].and.returnValue(of(item)); router = jasmine.createSpyObj('Router', ['navigate']);
      TestBed.configureTestingModule({ imports: [entry.component, NoopAnimationsModule], providers: [
        { provide: BreakpointObserver, useValue: { observe: () => viewport } }, { provide: GraficaProdutoService, useValue: api },
        { provide: Router, useValue: router }, { provide: ActivatedRoute, useValue: { paramMap: params, snapshot: { get queryParamMap() { return query; } } } },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
      ] });
    });
    afterEach(() => fixture?.destroy());
    for (const edit of [false, true]) {
      it(`usa um rodapé compartilhado em ${edit ? 'edição' : 'cadastro'}, mantendo envio e validações`, async () => {
        if (edit) params.next(convertToParamMap({ id: '1' }));
        const response = new Subject<any>(); api[entry.save].and.returnValue(response); await create(); document.body.appendChild(root());
        try {
          expect(root().querySelectorAll('app-mobile-total-bar').length).toBe(1); expect(root().querySelector('.page-card__footer')).toBeNull(); expect(root().querySelector('.card-header')!.textContent).toContain('Voltar');
          expect(component()[`${entry.name}Id`]).toBe(edit ? 1 : undefined); if (edit) expect(component().form.controls.nome.value).toBe(item.nome);
          component().form.controls.nome.setValue(''); render(); expect(save().disabled).toBeTrue(); component().salvar(); expect(api[entry.save]).not.toHaveBeenCalled();
          fill(); expect(save().disabled).toBeFalse(); save().click(); render(); component().salvar();
          expect(api[entry.save]).toHaveBeenCalledTimes(1); const args = api[entry.save].calls.mostRecent().args;
          expect(args[0]).toEqual(jasmine.objectContaining({ nome: 'Novo cadastro', descricao: 'Descrição nova', ativo: true })); expect(args[1]).toBe(edit ? 1 : undefined);
          if (entry.name === 'servico') expect(args[0].politicas[0]).toEqual(jasmine.objectContaining({ tipo: 'FIXO', valorFixo: 25 }));
          if (entry.name === 'formato' && edit) expect(args[0]).toEqual(jasmine.objectContaining({ largura: 10, altura: 15, larguraUtil: 9, alturaUtil: 14, unidadeDimensao: 'CENTIMETRO' }));
          expect(save().disabled).toBeTrue(); expect(root().textContent).toContain('Salvando...'); response.next(item); response.complete(); await settle(); expect(router.navigate).toHaveBeenCalledWith([`/page/grafica/${entry.path}`]);
        } finally { root().remove(); }
      });
    }
    it('Cancelar restaura o snapshot da edição, incluindo dimensões ou preço, sem navegar', async () => {
      params.next(convertToParamMap({ id: '1' })); await create(); const previous = component().form.getRawValue(); const price = component().precoForm?.getRawValue(); fill();
      if (entry.name === 'formato') component().form.patchValue({ largura: 30, altura: 50 });
      root().querySelector<HTMLButtonElement>('.mobile-total-bar__secondary')!.click(); render(); expect(component().form.getRawValue()).toEqual(previous);
      if (price) expect(component().precoForm.getRawValue()).toEqual(price); expect(router.navigate).not.toHaveBeenCalled();
    });
    it('clonagem continua criando sem ID e erro de gravação preserva os dados', async () => {
      query = convertToParamMap({ cloneFrom: '1' }); await create(); expect(component().titulo).toContain('Clonar'); expect(component()[`${entry.name}Id`]).toBeUndefined();
      api[entry.save].and.returnValue(throwError(() => new Error('falha'))); component().salvar(); render();
      expect(api[entry.save].calls.mostRecent().args[1]).toBeUndefined(); expect(component().form.controls.nome.value).toBe(item.nome); expect(component().salvando).toBeFalse(); expect(router.navigate).not.toHaveBeenCalled();
    });
    if (entry.name === 'formato') {
      it('mantém a validação cruzada das dimensões e unidade', async () => {
        await create(); fill(); component().form.patchValue({ largura: 10, altura: null, unidadeDimensao: null }); render(); expect(component().form.invalid).toBeTrue(); expect(save().disabled).toBeTrue();
        component().form.patchValue({ altura: 15, unidadeDimensao: 'CENTIMETRO' }); render(); expect(component().form.valid).toBeTrue(); expect(save().disabled).toBeFalse();
      });
    }
    if (entry.name === 'servico') {
      it('mantém a validação do preço e o seletor de tipos existente', async () => {
        await create(); component().form.controls.nome.setValue('Serviço'); render(); expect(root().querySelector('app-preco-selector')).not.toBeNull();
        expect(save().disabled).toBeTrue(); component().precoForm.patchValue({ valor: 12 }); render(); expect(save().disabled).toBeFalse();
      });
    }
    for (const width of [360, 390, 430, 1024, 1440]) {
      it(`mantém cadastro e edição na área útil em ${width}px`, async () => {
        viewport.next({ matches: width <= 760, breakpoints: {} }); params.next(convertToParamMap({ id: '1' })); await create();
        const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:900px;border:0`; document.body.appendChild(frame);
        try {
          const doc = frame.contentDocument!; Array.from(document.styleSheets).forEach(sheet => { const style = doc.createElement('style'); style.textContent = Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); doc.head.appendChild(style); });
          doc.body.style.cssText = 'margin:0;--mobile-bottom-nav-height:80px'; doc.body.appendChild(root().cloneNode(true));
          if (width <= 760) {
            expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); expect(doc.querySelector('.page-card__footer')).toBeNull();
            const bar = doc.querySelector('.mobile-total-bar')!.getBoundingClientRect(); expect(bar.bottom).toBeLessThanOrEqual(820); expect(bar.right).toBeLessThanOrEqual(width);
            expect(doc.querySelector('.mobile-total-bar__cta')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
            const fields = doc.querySelectorAll('.form-grid > *'); expect(fields[1].getBoundingClientRect().top).toBeGreaterThanOrEqual(fields[0].getBoundingClientRect().bottom);
          } else {
            expect(doc.querySelector('app-mobile-total-bar')).toBeNull(); expect(doc.querySelector('.page-card__footer')).not.toBeNull(); expect(doc.querySelector('.section-card')!.textContent).toContain('Dados');
          }
        } finally { frame.remove(); }
      });
    }
  });
}
