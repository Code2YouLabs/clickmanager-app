import { BreakpointObserver } from '@angular/cdk/layout';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { PdfDocumentPageComponent } from './pdf-document-page.component';

describe('PdfDocumentPage compartilhado', () => {
  let fixture: ComponentFixture<PdfDocumentPageComponent>;
  let viewport: BehaviorSubject<any>;
  const root = () => fixture.nativeElement as HTMLElement;
  const buttons = () => Array.from(root().querySelectorAll<HTMLButtonElement>('button'));
  const button = (label: string) => buttons().find(b => b.textContent?.includes(label))!;
  const render = () => fixture.detectChanges();
  function create() {
    fixture = TestBed.createComponent(PdfDocumentPageComponent);
    fixture.componentRef.setInput('title', 'Documento de teste'); fixture.componentRef.setInput('backLink', ['/pedido', 32]); render();
  }
  const set = (name: string, value: unknown) => { fixture.componentRef.setInput(name, value); render(); };

  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} });
    TestBed.configureTestingModule({ imports: [PdfDocumentPageComponent, NoopAnimationsModule], providers: [provideRouter([]),
      { provide: BreakpointObserver, useValue: { observe: () => viewport } }] });
  });
  afterEach(() => TestBed.resetTestingModule());

  it('reutiliza PageCard com título e um Voltar no cabeçalho e duas ações no conteúdo', () => {
    create(); expect(root().querySelector('app-card-header')!.textContent).toContain('Documento de teste');
    expect(root().querySelector('app-card-header')!.textContent).toContain('Voltar');
    expect(root().querySelector('app-card-header')!.textContent).not.toContain('Salvar PDF');
    expect(root().querySelectorAll('.document-actions--mobile button').length).toBe(2);
    expect(buttons().filter(b => b.textContent?.includes('Voltar')).length).toBe(1);
    expect(button('Salvar PDF').disabled).toBeTrue(); expect(button('Imprimir').disabled).toBeTrue();
    expect(root().querySelector('[role="status"]')!.textContent).toContain('Documento indisponível');
  });

  it('emite apenas os comandos explícitos e usa a disponibilidade individual', () => {
    create(); const c = fixture.componentInstance; const save = spyOn(c.save, 'emit'); const print = spyOn(c.print, 'emit');
    set('pdfAvailable', true); set('saveAvailable', true); set('printAvailable', true);
    expect(save).not.toHaveBeenCalled(); expect(print).not.toHaveBeenCalled();
    button('Salvar PDF').click(); button('Imprimir').click(); expect(save).toHaveBeenCalledTimes(1); expect(print).toHaveBeenCalledTimes(1);
    set('printAvailable', false); expect(button('Salvar PDF').disabled).toBeFalse(); expect(button('Imprimir').disabled).toBeTrue();
  });

  it('loading e erro são acessíveis, bloqueiam ações e preservam um único Voltar e retry', () => {
    create(); set('loading', true); expect(root().querySelector('mat-spinner')).not.toBeNull();
    expect(root().querySelector('.print-page')!.getAttribute('aria-busy')).toBe('true');
    expect(button('Salvar PDF').disabled).toBeTrue();
    set('loading', false); set('error', 'Documento indisponível para este usuário.');
    expect(root().querySelector('mat-spinner')).toBeNull(); expect(root().querySelector('[role="alert"]')!.textContent).toContain('este usuário');
    expect(buttons().filter(b => b.textContent?.includes('Voltar')).length).toBe(1);
    const retry = spyOn(fixture.componentInstance.retry, 'emit'); button('Tentar novamente').click(); expect(retry).toHaveBeenCalledTimes(1);
    set('retryAvailable', false); expect(button('Tentar novamente')).toBeUndefined();
  });

  it('oferece download quando o navegador declara ausência de visualização inline', () => {
    spyOnProperty(navigator, 'pdfViewerEnabled', 'get').and.returnValue(false); create();
    set('pdfAvailable', true); set('saveAvailable', true); set('printAvailable', true);
    expect(root().querySelector('.pdf-unavailable')!.textContent).toContain('Use Salvar PDF');
    expect(root().querySelector('[role="region"]')).toBeNull();
    expect(button('Salvar PDF').disabled).toBeFalse(); expect(button('Imprimir').disabled).toBeTrue();
  });

  it('mantém a região identificada e ajuda para fallback sem prometer sucesso do iframe', () => {
    create(); set('pdfAvailable', true); set('viewerLabel', 'Etiqueta PDF');
    expect(root().querySelector('[role="region"]')!.getAttribute('aria-label')).toBe('Etiqueta PDF');
    expect(root().querySelector('.pdf-viewer-help')!.textContent).toContain('Se o PDF não aparecer');
  });

  it('mede somente o offset externo e atualiza as variáveis de viewport no mobile', fakeAsync(() => {
    create(); const viewer = root().querySelector('.print-page')!;
    spyOn(viewer, 'getBoundingClientRect').and.returnValue({ top: 180 + (window.visualViewport?.offsetTop || 0) } as DOMRect);
    window.dispatchEvent(new Event('resize')); tick(20);
    expect(root().style.getPropertyValue('--pdf-offset-top')).toBe('180px');
    expect(parseFloat(root().style.getPropertyValue('--pdf-viewport-height'))).toBeGreaterThan(0);
    fixture.destroy(); window.dispatchEvent(new Event('resize')); tick(20);
  }));

  it('desktop conserva ações no header, retorno adicional no erro e estrutura anterior', () => {
    viewport.next({ matches: false, breakpoints: {} }); create(); set('subtitle', 'Pedido completo · PED-32');
    expect(root().querySelector('app-card-header')!.textContent).toContain('Salvar PDF');
    expect(root().querySelector('app-card-header')!.textContent).toContain('Imprimir');
    expect(root().querySelector('app-card-header')!.textContent).toContain('Pedido completo · PED-32');
    expect(root().querySelector('.document-actions--mobile')).toBeNull(); expect(root().querySelector('.pdf-viewer-help')).toBeNull();
    set('error', 'Falha'); expect(root().querySelector('.error-actions')!.textContent).toContain('Voltar');
    expect(root().style.getPropertyValue('--pdf-offset-top')).toBe('');
  });
});
