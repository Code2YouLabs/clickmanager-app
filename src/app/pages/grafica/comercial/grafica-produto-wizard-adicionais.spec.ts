import { registerLocaleData } from '@angular/common';
import pt from '@angular/common/locales/pt';
import { signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatCheckbox } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { TutorialService } from 'src/app/shared/tutorial/tutorial.service';
import { GraficaProdutoService } from '../shared/grafica.service';
import { GraficaProdutoWizardDialogComponent } from './comercial-editor.component';

registerLocaleData(pt);

for (const mobile of [true, false]) {
  describe(`Wizard: adicionais (${mobile ? 'mobile' : 'desktop'})`, () => {
    let fixture: ComponentFixture<GraficaProdutoWizardDialogComponent>;
    let wizard: GraficaProdutoWizardDialogComponent;
    let service: jasmine.SpyObj<GraficaProdutoService>;
    const policy = { id: 9, nome: 'Preço', tipo: 'FIXO', valorFixo: 3, ativo: true, selecoes: [] };
    const description = 'Corte manual reto da folha após a impressão, preservando todas as informações necessárias para configurar o acabamento.';
    const extras = [
      { id: 1, nome: 'Corte reto com nome completo', descricao: description, formaAplicacao: 'POR_FOLHA', ativo: true, ordem: 0, politicas: [policy] },
      { id: 2, nome: 'Aplicação', descricao: null, formaAplicacao: 'POR_PECA', ativo: true, ordem: 1, politicas: [policy] },
    ];
    const product = { id: 77, catalogoProdutoNome: 'Adesivo Couchê', ativo: true, parametros: [], acabamentos: extras };
    const query = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
    const render = () => fixture.detectChanges();
    const next = () => { query('.wizard-footer .primary-action').click(); render(); tick(300); render(); };
    const back = () => { query('.wizard-footer > button').click(); render(); tick(300); render(); };
    const options = () => Array.from(fixture.nativeElement.querySelectorAll(mobile ? '.service-mobile-option' : '.service-option')) as HTMLElement[];
    function enter() { render(); tick(300); render(); next(); }

    beforeEach(async () => {
      service = jasmine.createSpyObj('GraficaProdutoService', ['listar', 'listarServicos', 'detalhar', 'listarPrecos', 'precificar', 'resolverComposicaoComercial']);
      service.listar.and.returnValue(of({ content: [] } as any)); service.listarServicos.and.returnValue(of([]));
      service.detalhar.and.returnValue(of(product as any)); service.listarPrecos.and.returnValue(of([policy] as any));
      service.precificar.and.returnValue(of({ status: 'PRECO_CALCULADO', quantidadeSolicitada: 2, valorUnitario: 10, valorTotal: 20, detalhes: [], selecoesResolvidas: [] } as any));
      service.resolverComposicaoComercial.and.returnValue(of({ itens: [{ nomeProduto: 'Adesivo Couchê', catalogoProdutoId: 77, quantidade: 2, valorUnitario: 10, valorTotal: 20 }] } as any));
      await TestBed.configureTestingModule({ imports: [GraficaProdutoWizardDialogComponent], providers: [
        provideNoopAnimations(), { provide: GraficaProdutoService, useValue: service },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
        { provide: MAT_DIALOG_DATA, useValue: { produtoPreSelecionado: product, mobilePanel: mobile } },
        { provide: ToastrService, useValue: { error: jasmine.createSpy('error') } },
        { provide: TutorialService, useValue: { registerTarget: () => () => {}, state: signal({ definition: null }), isActive: signal(false), currentStep: signal(null), rect: signal(null), currentIndex: signal(0), totalSteps: signal(0), canGoBack: signal(false), isLastStep: signal(false) } },
      ] }).compileComponents();
      fixture = TestBed.createComponent(GraficaProdutoWizardDialogComponent); wizard = fixture.componentInstance;
      if (mobile) fixture.nativeElement.classList.add('mobile-side-panel');
      fixture.nativeElement.style.width = mobile ? '360px' : '1200px';
      fixture.nativeElement.style.height = '800px';
      document.body.appendChild(fixture.nativeElement);
    });
    afterEach(() => { fixture.destroy(); fixture.nativeElement.remove(); });

    it('mantém nome, descrição completa, preços e apresentação específica de cada modo', fakeAsync(() => {
      enter(); expect(wizard.stepper?.selectedIndex).toBe(2);
      expect(options().length).toBe(2);
      expect(options()[0].textContent).toContain(description);
      expect(options()[0].textContent).toContain('Por folha');
      expect(options()[0].textContent).toContain('3,00');
      expect(options()[1].textContent).toContain('Por peça');
      expect(query('.services-card-head h3').textContent).toBe(mobile ? 'Acabamentos' : 'Acabamentos disponíveis');
      if (mobile) {
        expect(getComputedStyle(query('.wizard-mobile-step-title')).display).toBe('none');
        expect(getComputedStyle(query('.services-card')).minHeight).toBe('0px');
        expect(getComputedStyle(query('.services-card')).borderTopWidth).toBe('0px');
        expect(options()[0].querySelector('.mdc-label')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(48);
        expect(query('.services-step').scrollWidth).toBeLessThanOrEqual(query('.services-step').clientWidth);
        expect(options()[0].querySelector('.opt-desc')!.getBoundingClientRect().width).toBeGreaterThan(220);
        expect(query('.services-step .price-product-card').textContent).toContain('Adesivo Couchê');
      } else {
        expect(getComputedStyle(query('.services-card')).minHeight).toBe('430px');
        expect(options()[0].tagName).toBe('LABEL');
        expect(document.querySelector('.service-mobile-option')).toBeNull();
      }
    }));

    it('seleciona uma única vez pelo checkbox e preserva múltipla seleção ao voltar', fakeAsync(() => {
      enter(); const toggle = spyOn(wizard, 'alternarAcabamento').and.callThrough();
      options()[0].querySelector<HTMLInputElement>('input')!.click(); render();
      expect(toggle).toHaveBeenCalledOnceWith(1, true);
      options()[1].querySelector<HTMLInputElement>('input')!.click(); render();
      expect([...wizard.acabamentosSelecionados]).toEqual([1, 2]);
      back(); expect(wizard.stepper?.selectedIndex).toBe(1); next();
      expect(wizard.stepper?.selectedIndex).toBe(2);
      expect(options().every(option => option.querySelector<HTMLInputElement>('input')!.checked)).toBeTrue();
      next(); expect(wizard.stepper?.selectedIndex).toBe(3);
      expect(service.resolverComposicaoComercial).toHaveBeenCalledWith(77, jasmine.objectContaining({ adicionais: [
        jasmine.objectContaining({ nomeProduto: 'Acabamento: Corte reto com nome completo', unidadeVenda: 'FOLHA', quantidade: 2, valorUnitario: 3, valorTotal: 6 }),
        jasmine.objectContaining({ nomeProduto: 'Acabamento: Aplicação', unidadeVenda: 'UN', quantidade: 2, valorUnitario: 3, valorTotal: 6 }),
      ] }));
      expect(wizard.totalComposicao).toBe(32);
      back(); expect(wizard.stepper?.selectedIndex).toBe(2);
      options()[0].querySelector<HTMLInputElement>('input')!.click(); render();
      expect(wizard.composicao).toBeNull(); expect([...wizard.acabamentosSelecionados]).toEqual([2]);
      next(); expect(wizard.totalComposicao).toBe(26);
    }));

    it('permite revisão sem adicionais e mantém o fluxo sem opções', fakeAsync(() => {
      enter(); next(); expect(wizard.stepper?.selectedIndex).toBe(3);
      expect(wizard.totalComposicao).toBe(20);
      expect(service.resolverComposicaoComercial).toHaveBeenCalledWith(77, jasmine.objectContaining({ adicionais: [] }));
      back(); back();
      wizard.produtoSelecionado = { ...product, acabamentos: [] } as any; render();
      expect(query('.services-step .empty-state').textContent).toContain('Sem acabamentos disponíveis');
      if (mobile) expect(query('.services-card').getBoundingClientRect().height).toBeLessThan(120);
      next(); expect(wizard.stepper?.selectedIndex).toBe(3);
      expect(wizard.nextDisabled).toBeFalse();
    }));

    if (mobile) {
      for (const target of ['.opt-name', '.opt-desc', '.service-mobile-price', '.mdc-label']) {
        it(`seleciona e desmarca pelo rótulo ${target} sem clique duplicado`, fakeAsync(() => {
          enter(); const toggle = spyOn(wizard, 'alternarAcabamento').and.callThrough();
          const label = options()[0].querySelector<HTMLElement>(target)!;
          label.click(); render(); expect(toggle).toHaveBeenCalledOnceWith(1, true);
          expect(wizard.acabamentoSelecionado(1)).toBeTrue();
          label.click(); render(); expect(toggle).toHaveBeenCalledTimes(2);
          expect(wizard.acabamentoSelecionado(1)).toBeFalse();
        }));
      }

      it('respeita um checkbox Material desabilitado ao tocar no rótulo ou input', fakeAsync(() => {
        enter(); const checkbox = fixture.debugElement.query(By.css('.service-mobile-option')).injector.get(MatCheckbox);
        checkbox.disabled = true; render();
        options()[0].querySelector<HTMLElement>('.mdc-label')!.click();
        options()[0].querySelector<HTMLInputElement>('input')!.click(); render();
        expect(wizard.acabamentosSelecionados.size).toBe(0);
      }));

      it('preserva todas as unidades existentes e não inventa valor sem política', fakeAsync(() => {
        enter();
        const units = ['POR_FOLHA', 'POR_PECA', 'POR_SERVICO', 'POR_METRO_QUADRADO', 'POR_METRO_LINEAR'];
        const labels = ['Por folha', 'Por peça', 'Por serviço', 'Por m²', 'Por metro linear'];
        wizard.produtoSelecionado = { ...product, acabamentos: units.map((formaAplicacao, index) => ({ ...extras[0], id: index + 1, formaAplicacao })) } as any;
        render();
        options().forEach((option, index) => {
          expect(option.querySelector('.service-mobile-price')!.textContent).toContain(labels[index]);
          expect(option.querySelector('.service-mobile-price strong')!.textContent).toContain('3,00');
        });
        wizard.produtoSelecionado!.acabamentos![0].politicas = []; render();
        expect(options()[0].textContent).toContain('Sem valor configurado');
        expect(options()[0].querySelector('.service-mobile-price strong')).toBeNull();
      }));
    }
  });
}
