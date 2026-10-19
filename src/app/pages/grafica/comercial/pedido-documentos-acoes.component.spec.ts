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
