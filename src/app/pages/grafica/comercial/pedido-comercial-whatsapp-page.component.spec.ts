import { convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PedidoComercialWhatsappPageComponent } from './pedido-comercial-whatsapp-page.component';
import { montarMensagemPedidoComercialWhatsApp, telefoneWhatsAppBR } from './pedido-comercial-whatsapp.util';

describe('WhatsApp do pedido: contrato preservado pelo painel de ações', () => {
  const pedido = { id: 32, numero: 'PED-2026-000032', clienteNome: 'Pedro de Lara', clienteTelefone: '(31) 98753-1233',
    status: 'PENDENTE', total: 50, itens: [], observacaoCliente: 'Entregar à tarde', observacaoInterna: 'Somente equipe' };
  function setup(result = of(pedido)) {
    const service = { buscarPedidoComercial: jasmine.createSpy().and.returnValue(result) };
    const toastr = jasmine.createSpyObj('Toastr', ['error', 'success']); const cdr = { detectChanges: jasmine.createSpy() };
    const page = new PedidoComercialWhatsappPageComponent({ snapshot: { paramMap: convertToParamMap({ id: '32' }) } } as any, service as any, toastr, cdr as any);
    return { page, toastr, service };
  }
  it('recarrega destinatário e mensagem existentes na rota de revisão', () => {
    const { page, service } = setup(); page.ngOnInit();
    expect(service.buscarPedidoComercial).toHaveBeenCalledOnceWith(32); expect(page.pedido).toBe(pedido as any);
    expect(telefoneWhatsAppBR(page.pedido!.clienteTelefone)).toBe('5531987531233');
    expect(page.mensagemControl.value).toBe(montarMensagemPedidoComercialWhatsApp(pedido as any, true));
    expect(page.mensagemControl.value).toContain('Entregar à tarde'); expect(page.mensagemControl.value).not.toContain('Somente equipe');
    expect(page.voltarLink).toEqual(['/page/grafica/comercial/pedidos', '32']);
  });
  it('mantém a validação existente para ausência de telefone sem abrir destino externo', () => {
    const { page, toastr } = setup(); page.ngOnInit(); page.pedido = { ...pedido, clienteTelefone: null } as any; page.abrirWhatsApp();
    expect(toastr.error).toHaveBeenCalledWith('Telefone do cliente não encontrado ou inválido.');
  });
  it('preserva erro e retry do carregamento sem gerar mensagem fictícia', () => {
    const { page, service, toastr } = setup(); service.buscarPedidoComercial.and.returnValue(throwError(() => new Error('Falha')));
    page.ngOnInit(); expect(page.carregando).toBeFalse(); expect(page.erro).toBe('Falha'); expect(toastr.error).toHaveBeenCalled();
    expect(page.mensagemControl.value).toBe(''); service.buscarPedidoComercial.and.returnValue(of(pedido)); page.carregarPedido();
    expect(page.erro).toBeNull(); expect(page.pedido).toBe(pedido as any);
  });
});
