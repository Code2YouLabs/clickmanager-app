import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import pt from '@angular/common/locales/pt';
import { ItensPedidoSectionComponent } from './itens-pedido-section.component';

describe('ItensPedidoSectionComponent', () => {
  let fixture: ComponentFixture<ItensPedidoSectionComponent>;
  let component: ItensPedidoSectionComponent;

  beforeEach(() => {
    registerLocaleData(pt);
    TestBed.configureTestingModule({
      imports: [ItensPedidoSectionComponent, NoopAnimationsModule],
      providers: [{ provide: LOCALE_ID, useValue: 'pt-BR' }],
    });
    fixture = TestBed.createComponent(ItensPedidoSectionComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('exibe acoes de wizard e busca rapida quando configurado', () => {
    spyOn(component.buscarProdutos, 'emit');
    spyOn(component.buscaRapida, 'emit');
    component.buscarProdutosLabel = 'Adicionar produto';
    component.buscaRapidaLabel = 'Busca rápida';
    component.mostrarBuscaRapida = true;
    component.mostrarDescreverItens = false;

    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const labels = buttons.map((button) => button.nativeElement.textContent.trim());
    expect(labels.some((label) => label.includes('Adicionar produto'))).toBeTrue();
    expect(labels.some((label) => label.includes('Busca rápida'))).toBeTrue();

    buttons[0].nativeElement.click();
    buttons[1].nativeElement.click();

    expect(component.buscarProdutos.emit).toHaveBeenCalled();
    expect(component.buscaRapida.emit).toHaveBeenCalled();
    expect(component.emptyDescription).toBe('Use “Adicionar produto” ou “Busca rápida” para incluir produtos.');
  });

  it('mantem comportamento legado sem busca rapida por padrao', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Buscar produtos');
    expect(text).toContain('Descrever itens');
    expect(text).not.toContain('Busca rápida');
  });

  for (const width of [360, 1200]) {
    it(`preserva registros, valores e detalhes com apresentação responsiva em ${width}px`, () => {
      component.permitirAlterarQuantidade = false;
      component.itens = [
        { descricao: 'Produto com nome completo', especificacao: 'Configuração com descrição longa que permanece integralmente disponível para conferência.', quantidade: 1, unidade: 'UN', valor: 13.5, subTotal: 13.5, detalhes: ['Cobrança: R$ 13,50 fixo'], valorContexto: 'R$ 13,50 fixo', subtotalResumo: 'Valor fixo = R$ 13,50', sourceIndex: 8 },
        { descricao: 'Acabamento: Corte reto', tipoLinha: 'ACABAMENTO', quantidade: 3, unidade: 'FOLHA', valor: 3, subTotal: 9 },
        { descricao: 'Serviço: Instalação', tipoLinha: 'SERVICO', quantidade: 1.5, unidade: 'M2', valor: 10, subTotal: 15, valorContexto: 'R$ 10,00/m²' },
      ];
      const original = JSON.stringify(component.itens);
      fixture.detectChanges();
      // A same-origin frame evaluates the actual media queries, without visual tests.
      const frame = document.createElement('iframe'); frame.style.width = `${width}px`; frame.style.height = '1000px';
      document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!;
        document.head.querySelectorAll('style').forEach(style => doc.head.appendChild(style.cloneNode(true)));
        doc.body.style.margin = '0'; doc.body.appendChild(fixture.nativeElement);
        const rows = Array.from(fixture.nativeElement.querySelectorAll('.order-items__row')) as HTMLElement[];
        expect(rows.length).toBe(3);
        expect(rows[0].textContent).toContain(component.itens[0].especificacao!);
        expect(rows[0].querySelector('.item-subtotal')!.textContent).toContain('13,50');
        expect(rows[1].querySelector('.item-subtotal')!.textContent).toContain('9,00');
        expect(rows[2].querySelector('.item-subtotal')!.textContent).toContain('15,00');
        const css = (selector: string) => frame.contentWindow!.getComputedStyle(rows[0].querySelector(selector)!);
        if (width === 360) {
          expect(css('.item-unit-price').display).toBe('none');
          expect(css('.item-unit').display).not.toBe('none');
          expect(css('.item-details').display).toBe('none');
          expect(frame.contentWindow!.getComputedStyle(rows[1].querySelector('.item-unit-price')!).display).not.toBe('none');
          expect(rows[0].scrollWidth).toBeLessThanOrEqual(rows[0].clientWidth);
          expect(rows[0].querySelector('button')!.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
          const details = rows[0].querySelector('details')!;
          expect(details.open).toBeFalse(); details.querySelector('summary')!.click(); expect(details.open).toBeTrue();
          expect(details.textContent).toContain('Valor fixo = R$ 13,50');
          expect(details.querySelectorAll('div > span').length).toBe(2);
        } else {
          expect(css('.item-unit-price').display).not.toBe('none');
          expect(css('.item-price-details').display).toBe('none');
          expect(css('.item-values').display).toBe('contents');
          expect(css('.item-details').display).toBe('flex');
        }
        expect(JSON.stringify(component.itens)).toBe(original);
      } finally { frame.remove(); }
    });
  }

  it('preserva remoção por sourceIndex e evita duplicar pointerup e click', () => {
    component.itens = [{ descricao: 'Corte', quantidade: 1, valor: 3, subTotal: 3, sourceIndex: 7 }];
    fixture.detectChanges(); const emit = spyOn(component.removerItem, 'emit');
    const button = fixture.nativeElement.querySelector('.remove-item-button') as HTMLButtonElement;
    button.dispatchEvent(new PointerEvent('pointerup')); button.click();
    expect(emit).toHaveBeenCalledOnceWith(7);
    expect(button.getAttribute('aria-label')).toContain('Corte');
  });

  it('preserva bloqueio de ações e alteração de quantidade quando permitida', () => {
    component.itens = [{ descricao: 'Produto', quantidade: 2, valor: 10 }];
    const emit = spyOn(component.alterarQuantidade, 'emit');
    component.mostrarBuscaRapida = true; component.inativo = true; fixture.detectChanges();
    expect(Array.from(fixture.nativeElement.querySelectorAll('button, input')).every((element: any) => element.disabled)).toBeTrue();
    component.inativo = false; fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('.qty-input') as HTMLInputElement;
    input.value = '4'; input.dispatchEvent(new Event('change'));
    expect(emit).toHaveBeenCalledOnceWith({ index: 0, quantidade: 4 });
  });
});
