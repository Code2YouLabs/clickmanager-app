import { registerLocaleData } from '@angular/common';
import pt from '@angular/common/locales/pt';
import { signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { TutorialService } from 'src/app/shared/tutorial/tutorial.service';
import { GraficaProdutoService } from '../shared/grafica.service';
import { GraficaProdutoWizardDialogComponent } from './comercial-editor.component';

registerLocaleData(pt);

for (const mobile of [true, false]) {
  describe(`Wizard: revisão (${mobile ? 'mobile' : 'desktop'})`, () => {
    let fixture: ComponentFixture<GraficaProdutoWizardDialogComponent>;
    let wizard: GraficaProdutoWizardDialogComponent;
    let service: jasmine.SpyObj<GraficaProdutoService>;
    let close: jasmine.Spy;
    const product = { id: 77, catalogoProdutoNome: 'Adesivo Couchê', ativo: true, parametros: [], acabamentos: [], material: { nome: 'Couchê' }, formato: { nome: 'A4' }, cor: { nome: '4x0' } };
    const main = { nomeProduto: 'Adesivo Couchê com nome extenso para conferir sem truncamento', caracteristicasResumo: 'Couchê / A4 / Colorido Frente / Configuração completa', unidadeVenda: 'UN', quantidade: 2, valorUnitario: 10, valorTotal: 20 };
    const rows = () => Array.from(fixture.nativeElement.querySelectorAll(mobile ? '.review-mobile-list li' : '.rev-row:not(.rev-head)')) as HTMLElement[];
    const query = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
    const render = () => fixture.detectChanges();
    const next = () => { query('.wizard-footer .primary-action').click(); render(); tick(300); render(); };
    const back = () => { query('.wizard-footer > button').click(); render(); tick(300); render(); };
    function enter() { render(); tick(300); render(); next(); }

    beforeEach(async () => {
      close = jasmine.createSpy('close');
      service = jasmine.createSpyObj('GraficaProdutoService', ['listar', 'listarServicos', 'detalhar', 'listarPrecos', 'precificar', 'resolverComposicaoComercial']);
      service.listar.and.returnValue(of({ content: [] } as any)); service.listarServicos.and.returnValue(of([]));
      service.detalhar.and.returnValue(of(product as any));
      service.listarPrecos.and.returnValue(of([{ id: 9, tipo: 'FIXO', ativo: true, valorFixo: 10, selecoes: [] }] as any));
      service.precificar.and.returnValue(of({ status: 'PRECO_CALCULADO', quantidadeSolicitada: 2, valorUnitario: 10, valorTotal: 20, detalhes: [], selecoesResolvidas: [] } as any));
      service.resolverComposicaoComercial.and.returnValue(of({ itens: [main] } as any));
      await TestBed.configureTestingModule({ imports: [GraficaProdutoWizardDialogComponent], providers: [
        provideNoopAnimations(), { provide: GraficaProdutoService, useValue: service },
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: { produtoPreSelecionado: product, mobilePanel: mobile } },
        { provide: ToastrService, useValue: { error: jasmine.createSpy('error') } },
        { provide: TutorialService, useValue: { registerTarget: () => () => {}, state: signal({ definition: null }), isActive: signal(false), currentStep: signal(null), rect: signal(null), currentIndex: signal(0), totalSteps: signal(0), canGoBack: signal(false), isLastStep: signal(false) } },
      ] }).compileComponents();
      fixture = TestBed.createComponent(GraficaProdutoWizardDialogComponent); wizard = fixture.componentInstance;
      if (mobile) fixture.nativeElement.classList.add('mobile-side-panel');
      fixture.nativeElement.style.width = mobile ? '360px' : '1200px';
      fixture.nativeElement.style.height = '800px'; document.body.appendChild(fixture.nativeElement);
    });
    afterEach(() => { fixture.destroy(); fixture.nativeElement.remove(); });

    it('apresenta um item com quantidade e total reais, mantendo tabela e rótulo desktop', fakeAsync(() => {
      enter(); expect(wizard.stepper?.selectedIndex).toBe(3);
      expect(rows().length).toBe(1); expect(rows()[0].textContent).toContain(main.nomeProduto);
      expect(rows()[0].textContent).toContain('UN'); expect(rows()[0].textContent).toContain('20,00');
      expect(query('.review-step .summary-price-total').textContent).toContain('20,00');
      expect(query('.wizard-footer .primary-action').textContent?.trim()).toBe(mobile ? 'Adicionar item' : 'Concluir');
      if (mobile) {
        expect(query('.review-step .rev-table')).toBeNull();
        expect(rows()[0].textContent).toContain(main.caracteristicasResumo);
        expect(rows()[0].querySelector('.review-mobile-unit')!.textContent).toContain('10,00');
        expect(getComputedStyle(query('.wizard-mobile-step-title')).display).toBe('none');
        expect(getComputedStyle(query('.review-items-card')).minHeight).toBe('0px');
      } else {
        expect(query('.review-mobile-list')).toBeNull();
        expect(getComputedStyle(query('.review-items-card')).minHeight).toBe('330px');
        expect(query('.review-step .summary-price-row').textContent).toContain('Quantidade');
      }
      next(); expect(close).toHaveBeenCalledOnceWith(jasmine.objectContaining({ itens: [jasmine.objectContaining(main)] }));
    }));

    it('preserva ordem, descrições, unidades e valores de produtos, serviços e acabamentos', fakeAsync(() => {
      const items = [main,
        { nomeProduto: 'Serviço: Instalação', caracteristicasResumo: 'Instalação no local indicado', quantidade: 1, unidadeVenda: 'SERV', valorUnitario: 50, valorTotal: 50 },
        { nomeProduto: 'Acabamento: Corte', caracteristicasResumo: 'Corte por folha', quantidade: 2, unidadeVenda: 'FOLHA', valorUnitario: 3, valorTotal: 6 },
      ];
      service.resolverComposicaoComercial.and.returnValue(of({ itens: items } as any));
      enter(); expect(rows().length).toBe(3);
      rows().forEach((row, index) => { expect(row.textContent).toContain(items[index].nomeProduto); expect(row.textContent).toContain(items[index].unidadeVenda); });
      expect(query('.review-step .summary-price-total').textContent).toContain('76,00');
      if (mobile) {
        rows().forEach((row, index) => expect(row.textContent).toContain(items[index].caracteristicasResumo));
        expect(query('.review-step .price-summary-card').querySelector('.summary-price-row')).toBeNull();
      }
      back(); expect(wizard.stepper?.selectedIndex).toBe(1); next();
      expect(wizard.itensRevisao.map(item => item.nomeProduto)).toEqual(items.map(item => item.nomeProduto));
    }));

    it('acumula por Adicionar mais itens e só retorna ao editor na ação final', fakeAsync(() => {
      enter(); query('.review-actions button').click(); render(); tick(300); render();
      expect(close).not.toHaveBeenCalled(); expect(wizard.stepper?.selectedIndex).toBe(0);
      expect(wizard.itensRevisao.length).toBe(1);
      wizard.selecionarProduto(product as any, true, true); render(); tick(300); render(); next();
      expect(wizard.stepper?.selectedIndex).toBe(3); expect(rows().length).toBe(2);
      expect(query('.review-step .summary-price-total').textContent).toContain('40,00');
      next(); expect(close).toHaveBeenCalledOnceWith(jasmine.objectContaining({ itens: [jasmine.objectContaining(main), jasmine.objectContaining(main)] }));
    }));

    it('preserva loading, erro e bloqueio da ação final sem composição', fakeAsync(() => {
      enter(); wizard.composicao = null; wizard.precificando = true; render();
      expect(query('.review-step .empty-state').textContent).toContain('Gerando revisão');
      expect(query('.wizard-footer .primary-action').hasAttribute('disabled')).toBeTrue();
      next(); expect(close).not.toHaveBeenCalled();
      wizard.precificando = false; render();
      expect(query('.review-step .empty-state').textContent).toContain('Não foi possível gerar a revisão');
      expect(query('.wizard-footer .primary-action').hasAttribute('disabled')).toBeTrue();
    }));

    it('cancela sem retornar composição', fakeAsync(() => {
      enter(); query('.wizard-footer button[mat-dialog-close]').click(); render();
      expect(close).toHaveBeenCalledTimes(1);
      expect(close.calls.mostRecent().args[0]?.itens).toBeUndefined();
    }));
  });
}
