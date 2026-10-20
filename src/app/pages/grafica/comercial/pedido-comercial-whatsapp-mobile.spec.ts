import { BreakpointObserver } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { MobileTotalBarComponent } from 'src/app/components/mobile-total-bar/mobile-total-bar.component';
import { GraficaProdutoService } from '../shared/grafica.service';
import { PedidoComercialWhatsappPageComponent } from './pedido-comercial-whatsapp-page.component';
import { montarMensagemPedidoComercialWhatsApp, telefoneWhatsAppBR } from './pedido-comercial-whatsapp.util';

describe('Compartilhar Pedido mobile', () => {
  let fixture: ComponentFixture<PedidoComercialWhatsappPageComponent>;
  let page: PedidoComercialWhatsappPageComponent;
  let viewport: BehaviorSubject<any>;
  let pending: Subject<any>;
  let service: any;
  const pedido = { id: 32, numero: 'PED-2026-000032', clienteNome: 'Pedro de Lara', clienteTelefone: '31987531233',
    status: 'PENDENTE', responsavelNome: 'Ana', total: 50, subtotal: 50, itens: [], observacaoCliente: 'Entregar à tarde', observacaoInterna: 'Somente equipe' };
  const root = () => fixture.nativeElement as HTMLElement;
  const field = () => root().querySelector<HTMLTextAreaElement>('textarea')!;
  const copy = () => root().querySelector<HTMLButtonElement>('.mobile-total-bar__secondary')!;
  const share = () => root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!;
  const render = () => fixture.detectChanges();
  const ready = (value: any = pedido) => { pending.next(value); pending.complete(); render(); };
  const edit = (text: string) => { field().value = text; field().dispatchEvent(new Event('input')); render(); };
  const bar = () => fixture.debugElement.query(By.directive(MobileTotalBarComponent)).componentInstance as MobileTotalBarComponent;

  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} }); pending = new Subject();
    service = { buscarPedidoComercial: jasmine.createSpy().and.returnValue(pending) };
    TestBed.configureTestingModule({ imports: [PedidoComercialWhatsappPageComponent, NoopAnimationsModule], providers: [provideHttpClient(), provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '32' }) } } },
      { provide: GraficaProdutoService, useValue: service }, { provide: BreakpointObserver, useValue: { observe: () => viewport } },
      { provide: ToastrService, useValue: jasmine.createSpyObj('Toastr', ['error', 'success']) }] });
    fixture = TestBed.createComponent(PedidoComercialWhatsappPageComponent); page = fixture.componentInstance; render();
  });
  afterEach(() => TestBed.resetTestingModule());

  it('usa título e um Voltar contextual, destinatário leve e mensagem original sem cards aninhados', () => {
    ready(); expect(root().querySelector('app-card-header')!.textContent).toContain('Compartilhar Pedido');
    expect(root().querySelector('app-card-header [page-mobile-header-actions]')).not.toBeNull();
    expect(Array.from(root().querySelectorAll('button')).filter(b => b.textContent?.includes('Voltar')).length).toBe(1);
    expect(root().querySelector('app-section-card')).toBeNull();
    const recipient = root().querySelector('.whatsapp-mobile-recipient')!;
    expect(recipient.textContent).toContain('Pedro de Lara'); expect(recipient.textContent).toContain('(31) 98753-1233'); expect(recipient.textContent).toContain('Pedido PED-2026-000032');
    expect(field().value).toBe(montarMensagemPedidoComercialWhatsApp(pedido as any, true)); expect(field().value).not.toContain('Somente equipe');
    expect(field().getAttribute('maxlength')).toBe('4000'); expect(field().readOnly).toBeFalse(); expect(field().getAttribute('aria-label')).toBe('Mensagem');
    expect(page.voltarLink).toEqual(['/page/grafica/comercial/pedidos', '32']);
  });

  it('reutiliza a barra gerenciada com duas ações, reserva e proteção de teclado sem total fictício', () => {
    ready(); expect(bar().appearance).toBe('actions'); expect(bar().expandable).toBeFalse();
    expect(bar().reserveSpace).toBeTrue(); expect(bar().avoidKeyboard).toBeTrue(); expect(bar().bottomAnchorSelector).toBe('.mobile-bottom-nav');
    expect(bar().actionForm).toBe('whatsapp-mobile-editor'); expect(root().querySelector('.mobile-total-bar__summary')).toBeNull();
    expect(root().querySelectorAll('.mobile-total-bar__actions button').length).toBe(2); expect(copy().getAttribute('type')).toBe('button'); expect(share().getAttribute('type')).toBe('button');
    expect(copy().textContent).toContain('Copiar'); expect(share().textContent).toContain('Abrir WhatsApp');
  });

  it('copia a mensagem completa gerada e o texto editado com quebras, emojis e formatação', fakeAsync(() => {
    const writeText = jasmine.createSpy().and.resolveTo(undefined); spyOnProperty(navigator, 'clipboard', 'get').and.returnValue({ writeText } as any);
    ready(); copy().click(); flushMicrotasks(); expect(writeText).toHaveBeenCalledWith(montarMensagemPedidoComercialWhatsApp(pedido as any, true));
    const text = '*Pedido* 📦\nTexto com ç, acentos e _formatação_\n' + 'Linha longa com conteúdo integral. '.repeat(30);
    edit(text); field().setSelectionRange(0, 8); copy().click(); flushMicrotasks();
    expect(writeText).toHaveBeenCalledWith(text); expect(page.mensagemControl.value).toBe(text); expect(TestBed.inject(ToastrService).success).toHaveBeenCalledWith('Mensagem copiada!');
  }));

  it('preserva feedback de erro do clipboard e permite tentar de novo', fakeAsync(() => {
    const writeText = jasmine.createSpy().and.rejectWith(new Error('Negado')); spyOnProperty(navigator, 'clipboard', 'get').and.returnValue({ writeText } as any);
    ready(); copy().click(); flushMicrotasks(); expect(TestBed.inject(ToastrService).error).toHaveBeenCalledWith('Não foi possível copiar.');
    writeText.and.resolveTo(undefined); copy().click(); flushMicrotasks(); expect(writeText).toHaveBeenCalledTimes(2);
  }));

  it('invoca o handler atual de abertura imediatamente com destinatário real e texto editado', () => {
    ready(); edit('*Revisado*\nTotal R$ 50,00 📦');
    const captured: any[] = [];
    const handler = spyOn(page, 'abrirWhatsApp').and.callFake(() => captured.push({ phone: page.pedido!.clienteTelefone, text: page.mensagemControl.value }));
    share().click(); expect(handler).toHaveBeenCalledTimes(1);
    expect(captured).toEqual([{ phone: '31987531233', text: '*Revisado*\nTotal R$ 50,00 📦' }]);
    expect(telefoneWhatsAppBR(captured[0].phone)).toBe('5531987531233');
  });

  it('mantém Copiar disponível sem telefone e usa a validação existente do compartilhamento', () => {
    ready({ ...pedido, clienteNome: null, clienteTelefone: null });
    expect(root().querySelector('.whatsapp-mobile-recipient')!.textContent).toContain('Cliente não informado');
    expect(root().querySelector('.whatsapp-mobile-recipient')!.textContent).toContain('Telefone não informado');
    expect(copy().disabled).toBeFalse(); share().click(); expect(TestBed.inject(ToastrService).error).toHaveBeenCalledWith('Telefone do cliente não encontrado ou inválido.');
  });

  it('loading e erro não exibem mensagem incompleta e mantêm ações desabilitadas com retry', () => {
    expect(root().querySelector('[role="status"]')!.textContent).toContain('Carregando pedido'); expect(field()).toBeNull(); expect(copy().disabled).toBeTrue(); expect(share().disabled).toBeTrue();
    pending.error({ error: { message: 'Acesso restrito.' } }); render();
    expect(root().querySelector('[role="alert"]')!.textContent).toContain('Acesso restrito'); expect(copy().disabled).toBeTrue(); expect(share().disabled).toBeTrue();
    expect(Array.from(root().querySelectorAll('button')).filter(b => b.textContent?.includes('Voltar')).length).toBe(1);
    service.buscarPedidoComercial.and.returnValue(of(pedido)); root().querySelector<HTMLButtonElement>('.error-actions button')!.click(); render();
    expect(field().value).toBe(montarMensagemPedidoComercialWhatsApp(pedido as any, true)); expect(copy().disabled).toBeFalse(); expect(share().disabled).toBeFalse();
  });

  it('não trunca mensagens carregadas maiores que o limite nativo nem perde edição ao alternar viewport', () => {
    ready({ ...pedido, observacaoCliente: 'Texto extenso\n'.repeat(450) }); const text = page.mensagemControl.value;
    expect(text.length).toBeGreaterThan(4000); expect(field().value).toBe(text);
    viewport.next({ matches: false, breakpoints: {} }); render(); expect(field().value).toBe(text);
    viewport.next({ matches: true, breakpoints: {} }); render(); expect(field().value).toBe(text);
    expect(page.pedido!.clienteTelefone).toBe('31987531233');
  });

  it('preserva desktop com cards, textarea e botões no fim, sem barra fixa', () => {
    viewport.next({ matches: false, breakpoints: {} }); render(); ready();
    expect(root().querySelector('app-mobile-total-bar')).toBeNull(); expect(root().querySelector('app-section-card')).not.toBeNull();
    expect(root().querySelectorAll('.pedido-context > div').length).toBe(3); expect(field().rows).toBe(16);
    expect(root().querySelector('.actions')!.textContent).toContain('Abrir no WhatsApp'); expect(root().querySelector('.actions')!.textContent).toContain('Copiar');
    expect(root().querySelector('app-card-header')!.textContent).toContain('Voltar');
  });
});
