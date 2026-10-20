import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { PedidoFluxoControlesComponent } from './pedido-fluxo-controles.component';
import { PedidoTrocarStatusDialogComponent } from './pedido-trocar-status-dialog.component';

describe('PedidoFluxoControles mobile operacional', () => {
  let fixture: ComponentFixture<PedidoFluxoControlesComponent>;
  let component: PedidoFluxoControlesComponent;
  let result: Subject<any>;
  let openDialog: jasmine.Spy;
  const steps = [
    { status: 'AGUARDANDO_PAGAMENTO', label: 'Aguardando pagamento', atual: true, concluido: false },
    { status: 'PENDENTE', label: 'Pendente', atual: false, concluido: false },
    { status: 'CANCELADO', label: 'Cancelado', atual: false, concluido: false },
  ];
  const options = [
    { status: 'PENDENTE', label: 'Pendente', bloqueado: false },
    { status: 'EM_PRODUCAO', label: 'Em produção', bloqueado: true, motivo: 'Pagamento necessário.' },
    { status: 'CANCELADO', label: 'Cancelado', bloqueado: false },
  ];
  const root = () => fixture.nativeElement as HTMLElement;
  const actions = () => Array.from(root().querySelectorAll<HTMLButtonElement>('.mobile-transition button'));
  const render = () => fixture.detectChanges();
  function set(name: string, value: unknown) { fixture.componentRef.setInput(name, value); render(); }

  beforeEach(() => {
    result = new Subject();
    TestBed.configureTestingModule({ imports: [PedidoFluxoControlesComponent, NoopAnimationsModule], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(PedidoFluxoControlesComponent); component = fixture.componentInstance;
    openDialog = spyOn(fixture.debugElement.injector.get(MatDialog), 'open').and.returnValue({ afterClosed: () => result } as any);
    for (const [key, value] of Object.entries({ mobileCompact: true, statusAtual: 'AGUARDANDO_PAGAMENTO', statusAtualLabel: 'Aguardando pagamento', descricaoStatus: 'Aguardando pagamento do cliente.', statusControl: new FormControl('AGUARDANDO_PAGAMENTO'), transicoes: options, statusOptions: options.map(o => o.status), fluxoSteps: steps })) fixture.componentRef.setInput(key, value);
    render();
  });
  afterEach(() => TestBed.resetTestingModule());

  it('exibe status completo, descrição e todas as transições operacionais, sem avanço para cancelar', () => {
    expect(root().querySelector('.mobile-current-status .status-chip')!.textContent).toContain('Aguardando pagamento');
    expect(root().querySelector('.mobile-current-status .chip-aguardando')).not.toBeNull();
    expect(root().querySelector('.mobile-current-status .helper-text')!.textContent).toBe('Aguardando pagamento do cliente.');
    expect(actions().map(b => b.textContent!.trim())).toEqual(options.slice(0, 2).map(o => 'arrow_forwardAvançar para ' + o.label));
    expect(actions().map(b => b.disabled)).toEqual([false, true]);
    expect(root().textContent).not.toContain('Avançar para Cancelado');
    expect(component.transicoes).toEqual(options);
    expect(root().querySelector('#' + actions()[1].getAttribute('aria-describedby'))!.textContent).toBe('Pagamento necessário.');
  });

  it('expande apenas a sequência real, sem inferir histórico, e recolhe com aria-controls', () => {
    const toggle = root().querySelector<HTMLButtonElement>('.mobile-flow-toggle')!;
    const strip = root().querySelector<HTMLElement>('#' + toggle.getAttribute('aria-controls'))!;
    expect(strip.hidden).toBeTrue(); expect(strip.hasAttribute('inert')).toBeTrue(); expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click(); render(); expect(strip.hidden).toBeFalse(); expect(strip.hasAttribute('inert')).toBeFalse();
    expect(toggle.textContent).toContain('Ocultar fluxo completo');
    expect(Array.from(strip.querySelectorAll('.flow-step > span:first-child')).map(n => n.textContent)).toEqual(steps.map(s => s.label));
    expect(strip.querySelectorAll('.done').length).toBe(0); expect(strip.querySelector('[aria-current="step"]')!.textContent).toBe('Aguardando pagamento');
    set('fluxoSteps', [{ ...steps[0], atual: false, concluido: true }, { ...steps[1], atual: true }]); set('statusAtual', 'PENDENTE');
    expect(strip.querySelectorAll('.done').length).toBe(1); expect(strip.querySelector('[aria-current="step"]')!.textContent).toBe('Pendente');
    toggle.click(); render(); expect(strip.hidden).toBeTrue();
  });

  it('não inventa próxima etapa ou histórico quando o backend não os fornece', () => {
    set('transicoes', []); set('fluxoSteps', []);
    expect(actions().length).toBe(0); expect(root().querySelector('.mobile-no-transitions')).not.toBeNull();
    expect(root().querySelectorAll('.flow-step').length).toBe(0);
    component.avancarMobile('PENDENTE'); expect(openDialog).not.toHaveBeenCalled();
  });

  it('mantém destino e opções na confirmação existente e só emite depois de confirmar', () => {
    const save = spyOn(component.salvarStatus, 'emit'); const change = spyOn(component.trocarStatusSelecionado, 'emit');
    actions()[0].click(); expect(save).not.toHaveBeenCalled();
    expect(openDialog).toHaveBeenCalledWith(PedidoTrocarStatusDialogComponent, jasmine.objectContaining({ data: { statusAtual: 'AGUARDANDO_PAGAMENTO', statusDestino: 'PENDENTE', opcoes: options.slice(0, 2) } }));
    result.next({ status: 'PENDENTE' }); expect(change).toHaveBeenCalledOnceWith('PENDENTE'); expect(save).toHaveBeenCalledTimes(1);
    expect(component.statusControl.value).toBe('PENDENTE');
  });

  it('cancelar confirmação não altera controle nem emite operação', () => {
    const save = spyOn(component.salvarStatus, 'emit'); actions()[0].click(); result.next(null);
    expect(save).not.toHaveBeenCalled(); expect(component.statusControl.value).toBe('AGUARDANDO_PAGAMENTO');
  });

  it('não transforma uma opção exclusiva de cancelamento em avanço ou troca geral', () => {
    set('transicoes', [options[2]]); set('statusOptions', ['CANCELADO']);
    expect(actions().length).toBe(0); expect(root().querySelector('.mobile-no-transitions')).not.toBeNull();
    expect(component.podeTrocarStatus).toBeFalse();
    component.avancarMobile('CANCELADO'); component.abrirMenuTrocarStatus(); expect(openDialog).not.toHaveBeenCalled();
    const save = spyOn(component.salvarStatus, 'emit'); component.confirmarCancelamentoMobile();
    expect(openDialog).toHaveBeenCalledWith(PedidoTrocarStatusDialogComponent, jasmine.objectContaining({ data: {
      statusAtual: 'AGUARDANDO_PAGAMENTO', statusDestino: 'CANCELADO', opcoes: [options[2]],
    } }));
    expect(save).not.toHaveBeenCalled(); result.next({ status: 'CANCELADO' });
    expect(save).toHaveBeenCalledTimes(1); expect(component.statusControl.value).toBe('CANCELADO');
  });

  it('impede cancelamento pela troca geral e confirmação duplicada', () => {
    const save = spyOn(component.salvarStatus, 'emit'); component.abrirMenuTrocarStatus();
    component.avancarMobile('PENDENTE'); component.confirmarCancelamentoMobile();
    expect(openDialog).toHaveBeenCalledTimes(1);
    result.next({ status: 'CANCELADO' }); expect(save).not.toHaveBeenCalled();
    expect(component.statusControl.value).toBe('AGUARDANDO_PAGAMENTO');
    result.next({ status: 'PENDENTE' }); expect(save).not.toHaveBeenCalled();
  });

  it('revalida cancelamento bloqueado ou revogado sem executar outra operação', () => {
    const save = spyOn(component.salvarStatus, 'emit'); set('transicoes', [{ ...options[2], bloqueado: true }]);
    component.confirmarCancelamentoMobile(); expect(openDialog).not.toHaveBeenCalled();
    set('transicoes', [options[2]]); component.confirmarCancelamentoMobile();
    set('transicoes', []); result.next({ status: 'CANCELADO' });
    expect(save).not.toHaveBeenCalled(); expect(component.statusControl.value).toBe('AGUARDANDO_PAGAMENTO');
  });

  it('preserva múltiplas opções operacionais permitidas e a ordem recebida', () => {
    set('transicoes', [{ ...options[1], bloqueado: false }, options[2], options[0]]);
    expect(actions().map(button => button.textContent)).toEqual([
      jasmine.stringContaining('Avançar para Em produção'), jasmine.stringContaining('Avançar para Pendente'),
    ]);
    expect(actions().every(button => !button.disabled)).toBeTrue();
  });

  for (const status of ['AGUARDANDO_PAGAMENTO', 'PENDENTE', 'EM_PRODUCAO', 'PRONTO', 'ENTREGUE', 'CANCELADO']) {
    it(`não inventa avanço para ${status} sem transição operacional recebida`, () => {
      set('statusAtual', status); set('transicoes', status === 'ENTREGUE' || status === 'CANCELADO' ? [] : [options[2]]);
      expect(actions().length).toBe(0); expect(root().querySelector('.mobile-flow-toggle')).not.toBeNull();
    });
  }

  for (const state of ['inativo', 'isReadOnly', 'trocandoStatus', 'carregandoStatus']) {
    it(`respeita ${state} sem acionar transição`, () => {
      set(state, true); expect(actions().every(b => b.disabled)).toBeTrue();
      component.avancarMobile('PENDENTE'); expect(openDialog).not.toHaveBeenCalled();
    });
  }

  it('rejeita destino proibido ou permissão revogada durante a confirmação', () => {
    const save = spyOn(component.salvarStatus, 'emit');
    component.avancarMobile('EM_PRODUCAO'); component.avancarMobile('ENTREGUE'); expect(openDialog).not.toHaveBeenCalled();
    actions()[0].click(); set('isReadOnly', true); result.next({ status: 'PENDENTE' }); expect(save).not.toHaveBeenCalled();
    expect(component.statusControl.value).toBe('AGUARDANDO_PAGAMENTO');
  });

  it('preserva menu de ações e ajuda como acessos secundários', () => {
    expect(root().querySelector('app-manual-link')).not.toBeNull();
    expect(root().querySelector('[aria-label="Ações do fluxo"]')).not.toBeNull();
    component.abrirMenuTrocarStatus(); expect(openDialog).toHaveBeenCalledWith(PedidoTrocarStatusDialogComponent, jasmine.objectContaining({ data: jasmine.objectContaining({ opcoes: options.slice(0, 2), statusDestino: null }) }));
  });

  it('oferece painel por opt-in sem bloquear documentos pela permissão de status', () => {
    set('mobileActionsPanel', true); set('isReadOnly', true); set('transicoes', []); set('statusOptions', []);
    const emitted = spyOn(component.abrirAcoesMobile, 'emit');
    const button = root().querySelector<HTMLButtonElement>('.mobile-order-actions-trigger')!;
    expect(button.disabled).toBeFalse(); expect(root().querySelector('[aria-label="Ações do fluxo"]')).toBeNull();
    button.click(); expect(emitted).toHaveBeenCalledTimes(1); expect(openDialog).not.toHaveBeenCalled();
    set('inativo', true); expect(button.disabled).toBeTrue();
  });

  it('o opt-in do painel não substitui o popover desktop', () => {
    set('mobileActionsPanel', true); set('mobileCompact', false);
    expect(root().querySelector('.mobile-order-actions-trigger')).toBeNull(); expect(root().querySelector('[aria-label="Ações do fluxo"]')).not.toBeNull();
  });

  it('mantém a apresentação desktop, badge abreviado e fluxo sempre visível', () => {
    set('mobileCompact', false);
    expect(root().querySelector('.mobile-flow-toggle')).toBeNull(); expect(root().querySelector('.mobile-transitions')).toBeNull();
    expect(root().querySelector('.primary-action')).not.toBeNull();
    expect(root().querySelector('.status-chip')!.textContent).toContain('Aguard. pagto');
    expect(root().querySelector<HTMLElement>('.step-strip')!.hidden).toBeFalse();
    component.abrirMenuTrocarStatus();
    expect(openDialog).toHaveBeenCalledWith(PedidoTrocarStatusDialogComponent, jasmine.objectContaining({ data: jasmine.objectContaining({ opcoes: options }) }));
  });
});
