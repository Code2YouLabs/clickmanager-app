import { BreakpointObserver } from '@angular/cdk/layout';
import { HttpResponse, provideHttpClient } from '@angular/common/http';
import { ElementRef, SecurityContext } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By, DomSanitizer } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { PdfDocumentPageComponent } from 'src/app/components/pdf-document-page/pdf-document-page.component';
import { GraficaProdutoService } from '../shared/grafica.service';
import { PedidoComercialImpressaoPageComponent } from './pedido-comercial-impressao-page.component';

describe('Documentos PDF do Pedido: composição compartilhada mobile', () => {
  let fixture: ComponentFixture<PedidoComercialImpressaoPageComponent>;
  let page: PedidoComercialImpressaoPageComponent;
  let viewport: BehaviorSubject<any>;
  let pending: Subject<HttpResponse<Blob>>;
  let service: any;
  let route: any;
  let url: jasmine.Spy;
  let revoke: jasmine.Spy;
  const pedido = { id: 32, numero: 'PED-2026-000032', itens: [] };
  const blob = () => new Blob(['PDF existente'], { type: 'application/pdf' });
  const root = () => fixture.nativeElement as HTMLElement;
  const button = (text: string) => Array.from(root().querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.includes(text))!;
  function create(formato = 'completo') {
    route.snapshot.data.formato = formato; fixture = TestBed.createComponent(PedidoComercialImpressaoPageComponent);
    page = fixture.componentInstance; fixture.detectChanges();
  }
  const ready = () => { const pdf = blob(); pending.next(new HttpResponse({ body: pdf })); pending.complete(); fixture.detectChanges(); return pdf; };

  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} }); pending = new Subject();
    route = { snapshot: { data: { formato: 'completo' }, paramMap: convertToParamMap({ id: '32' }) } };
    service = jasmine.createSpyObj('GraficaProdutoService', ['buscarPedidoComercial', 'gerarImpressaoPedidoComercial']);
    service.buscarPedidoComercial.and.returnValue(of(pedido)); service.gerarImpressaoPedidoComercial.and.returnValue(pending);
    url = spyOn(URL, 'createObjectURL').and.returnValue('about:blank'); revoke = spyOn(URL, 'revokeObjectURL');
    TestBed.configureTestingModule({ imports: [PedidoComercialImpressaoPageComponent, NoopAnimationsModule], providers: [provideHttpClient(), provideRouter([]),
      { provide: ActivatedRoute, useValue: route }, { provide: GraficaProdutoService, useValue: service },
      { provide: BreakpointObserver, useValue: { observe: () => viewport } },
      { provide: ToastrService, useValue: jasmine.createSpyObj('Toastr', ['error', 'info']) }] });
  });
  afterEach(() => TestBed.resetTestingModule());

  for (const [formato, title, suffix] of [['completo', 'Impressão do Pedido', ''], ['duas-vias', 'Duas vias do Pedido', '-duas-vias'], ['etiqueta', 'Etiqueta do Pedido', '-etiquetas']]) {
    it(`usa a composição comum e os mesmos bytes, formato e nome de download em ${formato}`, () => {
      create(formato); expect(service.buscarPedidoComercial).toHaveBeenCalledOnceWith(32);
      expect(service.gerarImpressaoPedidoComercial).toHaveBeenCalledOnceWith(32, formato);
      expect(page.carregando).toBeTrue(); expect(root().querySelector('iframe')).toBeNull();
      expect(button('Salvar PDF').disabled).toBeTrue(); expect(button('Imprimir').disabled).toBeTrue();
      const pdf = ready(); expect(page.pdfBlob).toBe(pdf); expect(url).toHaveBeenCalledOnceWith(pdf);
      const composition = fixture.debugElement.query(By.directive(PdfDocumentPageComponent)).componentInstance as PdfDocumentPageComponent;
      expect(composition.title).toBe(title); expect(composition.pdfAvailable).toBeTrue();
      const frame = root().querySelector<HTMLIFrameElement>('iframe')!; expect(frame).not.toBeNull(); expect(page.pdfFrame!.nativeElement).toBe(frame);
      expect(frame.title).toContain('PDF:'); expect(frame.hasAttribute('scrolling')).toBeFalse();
      expect(TestBed.inject(DomSanitizer).sanitize(SecurityContext.RESOURCE_URL, page.pdfPreviewUrl)).toBe('about:blank#toolbar=1&navpanes=0&scrollbar=0&view=FitH');
      expect(button('Salvar PDF').disabled).toBeFalse(); expect(button('Imprimir').disabled).toBeFalse();
      const clicked: HTMLAnchorElement[] = [];
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function(this: HTMLAnchorElement) { clicked.push(this); });
      button('Salvar PDF').click(); expect(clicked.length).toBe(1); expect(clicked[0].download).toBe(`pedido-PED-2026-000032${suffix}.pdf`);
      expect(url).toHaveBeenCalledTimes(2); expect(revoke).toHaveBeenCalledWith('about:blank');
      expect(page.voltarLink).toEqual(['/page/grafica/comercial/pedidos', '32']);
    });
  }

  it('não imprime ou baixa no carregamento e preserva o handler de impressão e sua proteção', () => {
    create(); ready(); const focus = jasmine.createSpy(); const print = jasmine.createSpy();
    page.pdfFrame = new ElementRef({ contentWindow: { focus, print } } as any);
    expect(print).not.toHaveBeenCalled(); button('Imprimir').click(); expect(focus).toHaveBeenCalledTimes(1); expect(print).toHaveBeenCalledTimes(1);
    page.pdfFrame = undefined; page.imprimir(); expect(TestBed.inject(ToastrService).info).toHaveBeenCalledWith('Aguarde o PDF carregar para imprimir.');
  });

  it('mantém erro do PDF e retry nos mesmos serviços, liberando URL anterior', () => {
    create(); ready(); service.gerarImpressaoPedidoComercial.and.returnValue(throwError(() => new Error('Falha do PDF')));
    page.carregarDados(); fixture.detectChanges(); expect(page.carregando).toBeFalse(); expect(page.pdfBlob).toBeNull(); expect(page.pdfPreviewUrl).toBeNull();
    expect(root().querySelector('iframe')).toBeNull(); expect(root().querySelector('[role="alert"]')!.textContent).toContain('Falha do PDF');
    expect(revoke).toHaveBeenCalledWith('about:blank'); expect(button('Salvar PDF').disabled).toBeTrue();
    service.gerarImpressaoPedidoComercial.and.returnValue(of(new HttpResponse({ body: blob() })));
    button('Tentar novamente').click(); fixture.detectChanges(); expect(page.erro).toBeNull(); expect(page.pdfBlob).not.toBeNull();
  });

  it('preserva falha de autorização no carregamento sem gerar PDF e mantém Voltar', () => {
    service.buscarPedidoComercial.and.returnValue(throwError(() => ({ status: 403, error: { message: 'Acesso restrito.' } })));
    create(); expect(service.gerarImpressaoPedidoComercial).not.toHaveBeenCalled(); expect(page.carregando).toBeFalse();
    expect(root().querySelector('[role="alert"]')!.textContent).toContain('Acesso restrito'); expect(button('Voltar')).toBeDefined();
  });

  for (const empty of [null, new Blob([], { type: 'application/pdf' })]) {
    it(`trata PDF ${empty === null ? 'ausente' : 'vazio'} sem visualizador vazio`, () => {
      create(); pending.next(new HttpResponse({ body: empty })); pending.complete(); fixture.detectChanges();
      expect(page.carregando).toBeFalse(); expect(page.erro).toBe('Não foi possível gerar o PDF.');
      expect(root().querySelector('iframe')).toBeNull(); expect(url).not.toHaveBeenCalled();
    });
  }

  it('mantém download como alternativa quando não há suporte inline informado', () => {
    spyOnProperty(navigator, 'pdfViewerEnabled', 'get').and.returnValue(false); create(); ready();
    expect(page.pdfBlob).not.toBeNull(); expect(root().querySelector('iframe')).toBeNull(); expect(button('Salvar PDF').disabled).toBeFalse();
    expect(button('Imprimir').disabled).toBeTrue(); expect(root().textContent).toContain('Use Salvar PDF');
  });

  it('preserva desktop e iframe com scrolling e parâmetros atuais', () => {
    viewport.next({ matches: false, breakpoints: {} }); create('duas-vias'); ready();
    expect(root().querySelector('.document-actions--mobile')).toBeNull(); expect(root().querySelector('app-card-header')!.textContent).toContain('Salvar PDF');
    expect(root().querySelector<HTMLIFrameElement>('iframe')!.getAttribute('scrolling')).toBe('no');
    expect(root().querySelector<HTMLIFrameElement>('iframe')!.title).toBe('Preview do PDF do pedido');
    fixture.destroy(); expect(revoke).toHaveBeenCalledWith('about:blank');
  });

  it('rejeita id ausente sem chamar serviços e preserva retorno à listagem', () => {
    route.snapshot.paramMap = convertToParamMap({}); create(); expect(service.buscarPedidoComercial).not.toHaveBeenCalled();
    expect(service.gerarImpressaoPedidoComercial).not.toHaveBeenCalled(); expect(page.erro).toBe('Pedido inválido.');
    expect(page.voltarLink).toEqual(['/page/grafica/comercial/pedidos']);
  });
});
