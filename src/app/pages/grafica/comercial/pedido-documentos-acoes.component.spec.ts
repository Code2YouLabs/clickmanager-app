import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PedidoDocumentosAcoesComponent } from './pedido-documentos-acoes.component';

describe('PedidoDocumentosAcoes compartilhado', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PedidoDocumentosAcoesComponent, NoopAnimationsModule] }));
  afterEach(() => TestBed.resetTestingModule());
  it('mantém card, quatro ações e variantes de botão do desktop', () => {
    const fixture = TestBed.createComponent(PedidoDocumentosAcoesComponent); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement; const c = fixture.componentInstance;
    expect(root.querySelector('app-section-card')).not.toBeNull(); expect(root.querySelectorAll('.document-actions button').length).toBe(4);
    expect(root.querySelectorAll('button[mat-flat-button]').length).toBe(2); expect(root.querySelectorAll('button[mat-stroked-button]').length).toBe(2);
    const spies = [spyOn(c.pedidoCompleto, 'emit'), spyOn(c.duasVias, 'emit'), spyOn(c.etiqueta, 'emit'), spyOn(c.whatsapp, 'emit')];
    root.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.click()); spies.forEach(s => expect(s).toHaveBeenCalledTimes(1));
  });
  it('reutiliza o SVG Tabler somente no WhatsApp da lista, mantendo texto e fundo neutros', () => {
    const fixture = TestBed.createComponent(PedidoDocumentosAcoesComponent); fixture.componentRef.setInput('actionList', true); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector<HTMLButtonElement>('[data-document-action="whatsapp"]')!;
    expect(button.querySelector('.whatsapp-icon')!.getAttribute('svgIcon')).toBe('comercial:whatsapp');
    expect(button.querySelector('.whatsapp-icon svg path')).not.toBeNull();
    expect(root.querySelectorAll('.whatsapp-icon').length).toBe(1); expect(button.classList.contains('btn-whatsapp')).toBeFalse();
    expect(button.querySelector('.action-label')!.textContent).toBe('WhatsApp');
    expect(button.querySelector('.action-label')!.classList.contains('whatsapp-icon')).toBeFalse();
    fixture.componentRef.setInput('actionList', false); fixture.detectChanges();
    expect(root.querySelector('.whatsapp-icon')).toBeNull(); expect(root.querySelector('.btn-whatsapp mat-icon')!.textContent).toBe('chat');
  });

  it('preserva Orçamento PDF e WhatsApp sem ações de pedido extras', () => {
    const fixture = TestBed.createComponent(PedidoDocumentosAcoesComponent); fixture.componentRef.setInput('contexto', 'orcamento'); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement; expect(root.querySelectorAll('button').length).toBe(2);
    expect(root.textContent).toContain('Orçamento PDF'); expect(root.textContent).not.toContain('Etiqueta');
  });
  it('usa as mesmas ações em linhas opt-in, sem card, respeitando disabled', () => {
    const fixture = TestBed.createComponent(PedidoDocumentosAcoesComponent); fixture.componentRef.setInput('actionList', true); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement; const c = fixture.componentInstance;
    expect(root.querySelector('app-section-card')).toBeNull(); expect(root.querySelectorAll('.document-action-row').length).toBe(4);
    const emitted = spyOn(c.etiqueta, 'emit'); (root.querySelector('[data-document-action="etiqueta"]') as HTMLButtonElement).click(); expect(emitted).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('disabled', true); fixture.detectChanges(); c.executarDocumento('etiqueta');
    expect(emitted).toHaveBeenCalledTimes(1); expect(Array.from(root.querySelectorAll<HTMLButtonElement>('button')).every(b => b.disabled)).toBeTrue();
  });
});
