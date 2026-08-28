import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ItensPedidoSectionComponent } from './itens-pedido-section.component';

describe('ItensPedidoSectionComponent', () => {
  let fixture: ComponentFixture<ItensPedidoSectionComponent>;
  let component: ItensPedidoSectionComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ItensPedidoSectionComponent, NoopAnimationsModule],
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
});
