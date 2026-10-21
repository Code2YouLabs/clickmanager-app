import { Component, inject } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideToastr, Toast, ToastrService } from 'ngx-toastr';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MobileToastComponent } from './mobile-toast.component';
import { MobileToastPositionService } from './mobile-toast-position.service';
import { ResponsiveToastrService } from './responsive-toastr.service';
import { MOBILE_FOUNDATION_QUERY } from '../responsive/mobile-foundation';
import { openMobileSidePanel } from '../../components/mobile-side-panel/mobile-side-panel';
import { PedidoComercialWhatsappPageComponent } from '../../pages/grafica/comercial/pedido-comercial-whatsapp-page.component';

@Component({ standalone: true, template: '<header class="mobile-side-panel__header">Cliente</header><button (click)="notify()">Salvar</button>' })
class Panel {
  private readonly toastr = inject(ToastrService);
  notify(): void { this.toastr.success('Cliente cadastrado.'); }
}

describe('Toastr global responsivo', () => {
  let toastr: ToastrService;
  let mobile: boolean;
  let reduced: boolean;
  const element = (toast: any) => toast.portal.location.nativeElement as HTMLElement;
  beforeEach(() => {
    mobile = true; reduced = false;
    const original = window.matchMedia.bind(window);
    spyOn(window, 'matchMedia').and.callFake(query => {
      const media = original(query);
      Object.defineProperty(media, 'matches', { value: query === MOBILE_FOUNDATION_QUERY ? mobile : query === '(prefers-reduced-motion: reduce)' ? reduced : media.matches });
      return media;
    });
    TestBed.configureTestingModule({ imports: [NoopAnimationsModule, MatDialogModule, Panel], providers: [
      provideToastr(), { provide: ToastrService, useClass: ResponsiveToastrService },
    ] });
    toastr = TestBed.inject(ToastrService);
  });
  afterEach(fakeAsync(() => { toastr.clear(); tick(200); TestBed.inject(MobileToastPositionService).ngOnDestroy(); }));

  for (const [kind, duration] of [['success', 3000], ['info', 4000], ['warning', 5000], ['error', 6000]] as const) {
    it(`apresenta ${kind} com ícone, semântica, fechamento e duração ${duration}`, fakeAsync(() => {
      const toast = toastr[kind]('Mensagem real.'); tick(); toast.portal.changeDetectorRef.detectChanges();
      expect(toast.portal.instance instanceof MobileToastComponent).toBeTrue();
      expect(element(toast).classList.contains(`toast-${kind}`)).toBeTrue();
      expect(element(toast).querySelector('svg path')!.getAttribute('d')).toBeTruthy();
      expect(element(toast).querySelector('[role]')!.getAttribute('role')).toBe(kind === 'error' ? 'alert' : 'status');
      expect(element(toast).textContent).toContain('Mensagem real.');
      expect(element(toast).querySelector('button')!.getAttribute('aria-label')).toBe('Fechar notificação');
      expect(toast.portal.instance.options.timeOut).toBe(duration);
      tick(duration - 1); expect(toastr.toasts.length).toBe(1);
      tick(162); expect(toastr.toasts.length).toBe(0);
    }));
  }

  it('mantém duração explícita, fechamento manual, HTML sanitizado e texto longo íntegro', fakeAsync(() => {
    const text = 'Pagamento não concluído. '.repeat(80);
    const toast = toastr.error(text, 'Financeiro', { timeOut: 12000, disableTimeOut: true }); tick(); toast.portal.changeDetectorRef.detectChanges();
    expect(toast.portal.instance.options.timeOut).toBe(12000); tick(20000);
    expect(element(toast).textContent).toContain(text); expect(toastr.toasts.length).toBe(1);
    const hidden = jasmine.createSpy(); toast.onHidden.subscribe(hidden);
    element(toast).querySelector<HTMLButtonElement>('button')!.click(); tick(161);
    expect(hidden).toHaveBeenCalledTimes(1); expect(toastr.toasts.length).toBe(0);
    const html = toastr.warning('<b>Aviso</b><script>window.fail = true</script>', '', { enableHtml: true }); tick(); html.portal.changeDetectorRef.detectChanges();
    expect(element(html).querySelector('b')?.textContent).toBe('Aviso'); expect(element(html).querySelector('script')).toBeNull();
  }));

  it('enfileira sem empilhar nem substituir erro por sucesso, deduplica e prioriza erros pendentes', fakeAsync(() => {
    const error = toastr.error('Falha de API.');
    const success = toastr.success('Pedido salvo.');
    const nextError = toastr.error('Falha no pagamento.');
    expect(toastr.success('Pedido salvo.')).toBe(success);
    tick(); [error, success, nextError].forEach(t => t.portal.changeDetectorRef.detectChanges());
    expect(toastr.currentlyActive).toBe(1);
    expect(element(error).style.display).not.toBe('none'); expect(element(success).style.display).toBe('none');
    expect(element(nextError).style.display).toBe('none');
    expect(toastr.toasts.map(t => t.message)).toEqual(['Falha de API.', 'Falha no pagamento.', 'Pedido salvo.']);
    toastr.clear(error.toastId); tick(161); nextError.portal.changeDetectorRef.detectChanges();
    expect(element(nextError).style.display).not.toBe('none'); expect(toastr.currentlyActive).toBe(1);
  }));

  it('limita a fila a quatro grupos, retém erros distintos e permite consultar/fechar um lote', fakeAsync(() => {
    toastr.success('Primeiro.'); tick();
    for (let i = 0; i < 30; i++) { toastr.error(`Erro ${i}.`); toastr.info(`Info ${i}.`); toastr.warning(`Aviso ${i}.`); toastr.success(`Sucesso ${i}.`); }
    expect(toastr.toasts.length).toBe(5); expect(toastr.currentlyActive).toBe(1);
    const errors = toastr.toasts[1]; expect(errors.message).toContain('Erro 0.'); expect(errors.message).toContain('Erro 29.');
    expect(errors.portal.instance.options.disableTimeOut).toBeTrue();
    toastr.remove(toastr.toasts[0].toastId); tick(); errors.portal.changeDetectorRef.detectChanges();
    expect(element(errors).textContent).toContain('Erro 29.'); expect(toastr.currentlyActive).toBe(1);
    // Removing an inactive item must not make a second item visible.
    toastr.clear(toastr.toasts[2].toastId); tick(161); expect(toastr.currentlyActive).toBe(1);
    toastr.clear(); tick(161); expect(toastr.toasts.length).toBe(0); expect(toastr.currentlyActive).toBe(0);
  }));

  it('preserva o desktop: componente original, duração, posição, duplicatas e empilhamento', fakeAsync(() => {
    mobile = false;
    const original = { ...toastr.toastrConfig };
    const one = toastr.success('Pedido salvo.'); const two = toastr.success('Pedido salvo.'); tick();
    expect(one.toastId).not.toBe(two.toastId); expect(toastr.currentlyActive).toBe(2);
    expect(one.portal.instance instanceof Toast).toBeTrue(); expect(one.portal.instance instanceof MobileToastComponent).toBeFalse();
    expect(one.portal.instance.options.timeOut).toBe(5000); expect(one.portal.instance.options.positionClass).toBe('toast-top-right');
    expect(toastr.toastrConfig).toEqual(original);
  }));

  it('respeita movimento reduzido e não rouba o foco nem usa a mensagem como botão', fakeAsync(() => {
    reduced = true;
    const input = document.createElement('input'); document.body.appendChild(input); input.focus();
    const toast = toastr.info('Dados atualizados.'); tick(); toast.portal.changeDetectorRef.detectChanges();
    expect(toast.portal.instance.options.easeTime).toBe(0); expect(document.activeElement).toBe(input);
    element(toast).click(); tick(); expect(toastr.toasts.length).toBe(1);
    expect(element(toast).querySelectorAll('[role="status"]').length).toBe(1);
    input.remove();
  }));

  it('não abandona mensagens pendentes quando a viewport muda para desktop', fakeAsync(() => {
    const active = toastr.error('Erro mobile.'); const pending = toastr.success('Sucesso mobile.'); tick();
    mobile = false; const desktop = toastr.info('Info desktop.'); tick();
    expect(desktop.portal.instance instanceof MobileToastComponent).toBeFalse();
    toastr.remove(active.toastId); toastr.remove(desktop.toastId); tick(); pending.portal.changeDetectorRef.detectChanges();
    expect(toastr.currentlyActive).toBe(1); expect(element(pending).style.display).not.toBe('none');
    expect(element(pending).textContent).toContain('Sucesso mobile.');
  }));

  it('não pausa indefinidamente por mouseenter sintetizado no toque e mantém show compatível', fakeAsync(() => {
    const toast = toastr.show('Aviso real.', '', { timeOut: 7000 }, 'toast-warning'); tick(); toast.portal.changeDetectorRef.detectChanges();
    element(toast).dispatchEvent(new MouseEvent('mouseenter'));
    expect(toast.portal.instance.options.timeOut).toBe(7000);
    tick(7161); expect(toastr.toasts.length).toBe(0);
  }));

  it('agrupa HTML como texto seguro e mantém lotes informativos temporários', fakeAsync(() => {
    toastr.error('Falha ativa.'); tick();
    const batch = toastr.info('<b>Primeira</b>', '', { enableHtml: true });
    expect(toastr.info('<img src=x onerror="window.fail=true">Segunda', '', { enableHtml: true })).toBe(batch);
    expect(batch.portal.instance.options.disableTimeOut).toBeFalse();
    toastr.remove(toastr.toasts[0].toastId); tick(); batch.portal.changeDetectorRef.detectChanges();
    expect(element(batch).textContent).toContain('Primeira'); expect(element(batch).textContent).toContain('Segunda');
    expect(element(batch).querySelector('img')).toBeNull();
    tick(batch.portal.instance.options.timeOut + 161); expect(toastr.toasts.length).toBe(0);
  }));

  it('recebe notificações de um painel lateral real e mantém a camada dentro do CDK', fakeAsync(() => {
    const ref = openMobileSidePanel(TestBed.inject(MatDialog), Panel, {}); tick(400);
    ref.componentInstance.notify(); tick();
    const toast = toastr.toasts[0]; toast.portal.changeDetectorRef.detectChanges(); tick(20);
    expect(element(toast).textContent).toContain('Cliente cadastrado.');
    const container = element(toast).closest('.overlay-container')!;
    expect(container.parentElement!.classList.contains('mat-mdc-dialog-container')).toBeTrue();
    expect(container.getAttribute('aria-hidden')).toBeNull(); expect(container.getAttribute('aria-live')).toBe('off');
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(1);
    ref.close(); tick(400);
    window.dispatchEvent(new Event('resize')); tick(20);
    expect(container.parentElement).toBe(document.body);
  }));

  it('apresenta o feedback real de Copiar do WhatsApp, sem alterar mensagem ou handler', fakeAsync(() => {
    const writeText = jasmine.createSpy().and.resolveTo(undefined);
    spyOnProperty(navigator, 'clipboard', 'get').and.returnValue({ writeText } as any);
    const page = new PedidoComercialWhatsappPageComponent({} as any, {} as any, toastr, {} as any);
    page.mensagemControl.setValue('*Pedido revisado*\nTexto editado 📦'); page.copiar(); tick();
    const toast = toastr.toasts[0]; toast.portal.changeDetectorRef.detectChanges();
    expect(writeText).toHaveBeenCalledWith('*Pedido revisado*\nTexto editado 📦');
    expect(element(toast).textContent).toContain('Mensagem copiada!');
    expect(toast.portal.instance.options.positionClass).toBe('toast-mobile');
    expect(toast.portal.instance.options.timeOut).toBe(3000);
    page.ngOnDestroy();
  }));
});
