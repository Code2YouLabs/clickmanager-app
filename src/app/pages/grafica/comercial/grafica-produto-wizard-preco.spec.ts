import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { TutorialService } from 'src/app/shared/tutorial/tutorial.service';
import { GraficaProdutoService } from '../shared/grafica.service';
import { GraficaProdutoWizardDialogComponent } from './comercial-editor.component';

registerLocaleData(localePt);

describe('Wizard comercial: calcular preço', () => {
  let fixture: ComponentFixture<GraficaProdutoWizardDialogComponent>;
  let component: GraficaProdutoWizardDialogComponent;
  let service: jasmine.SpyObj<GraficaProdutoService>;
  const produto = { id: 77, nome: 'Adesivo Couchê', ativo: true, parametros: [], acabamentos: [] };
  const politica = (tipo = 'FIXO') => ({
    id: 9, nome: 'Preço', tipo, ativo: true, valorFixo: 13.5, multiplicaQuantidade: true,
    selecoes: [], faixas: [{ inicio: 1, fim: 100, valorUnitario: 13.5 }], lotes: [],
  });
  const resultado = (quantidade = 1) => ({
    status: 'PRECO_CALCULADO', tipoPrecificacao: component.tipoPrecoAtual,
    quantidadeSolicitada: quantidade, valorUnitario: 13.5, valorTotal: quantidade * 13.5,
    mensagem: '', detalhes: [], selecoesResolvidas: [],
  });

  beforeEach(async () => {
    service = jasmine.createSpyObj('GraficaProdutoService', ['listar', 'listarServicos', 'detalhar', 'listarPrecos', 'precificar', 'precificarServico']);
    service.listar.and.returnValue(of({ content: [] } as any));
    service.listarServicos.and.returnValue(of([]));
    service.detalhar.and.returnValue(of(produto as any));
    service.listarPrecos.and.returnValue(of([politica()] as any));
    service.precificar.and.callFake((_id, body) => of(resultado(body.quantidade ?? 1) as any));
    service.precificarServico.and.callFake((_id, body) => of(resultado(body.quantidade ?? 1) as any));
    await TestBed.configureTestingModule({ imports: [GraficaProdutoWizardDialogComponent], providers: [
      provideNoopAnimations(),
      { provide: GraficaProdutoService, useValue: service },
      { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
      { provide: MAT_DIALOG_DATA, useValue: { produtoPreSelecionado: produto } },
      { provide: ToastrService, useValue: { error: jasmine.createSpy('error') } },
      { provide: TutorialService, useValue: { registerTarget: () => () => {} } },
    ] }).compileComponents();
    fixture = TestBed.createComponent(GraficaProdutoWizardDialogComponent);
    component = fixture.componentInstance;
  });
  afterEach(() => fixture.destroy());

  function entrar() {
    fixture.detectChanges();
    tick(250);
    fixture.detectChanges();
  }
  const priceCard = () => fixture.nativeElement.querySelector('.price-config-card') as HTMLElement;

  it('entra com quantidade 1 e preço calculado no DOM, sem duplicar a consulta', fakeAsync(() => {
    entrar();
    expect(service.precificar).toHaveBeenCalledOnceWith(77, jasmine.objectContaining({ quantidade: 1 }));
    expect(component.preco?.valorTotal).toBe(13.5);
    expect(priceCard().textContent).toContain('Calcular');
    expect(priceCard().textContent).not.toContain('Confirmar preço');
    expect(fixture.nativeElement.querySelector('.summary-price-total')?.textContent).toContain('13,50');
    component.onStepSelectionChange({ selectedIndex: 1 });
    expect(service.precificar).toHaveBeenCalledTimes(1);
  }));

  it('recalcula ao digitar quantidade e agrupa alterações rápidas', fakeAsync(() => {
    service.listarPrecos.and.returnValue(of([politica('POR_FAIXA_QUANTIDADE')] as any));
    entrar();
    component.quantidadeForm.controls.quantidade.setValue(2);
    expect(component.preco).toBeNull();
    tick(100);
    component.quantidadeForm.controls.quantidade.setValue(3);
    tick(250);
    fixture.detectChanges();
    expect(service.precificar).toHaveBeenCalledTimes(2);
    expect(service.precificar).toHaveBeenCalledWith(77, jasmine.objectContaining({ quantidade: 3 }));
    expect(fixture.nativeElement.querySelector('.summary-price-total')?.textContent).toContain('40,50');
  }));

  it('não calcula quantidade vazia ou menor que 1 e recupera ao corrigir', fakeAsync(() => {
    entrar();
    for (const quantidade of [null, 0, -1]) {
      component.quantidadeForm.controls.quantidade.setValue(quantidade);
      tick(250);
      expect(component.preco).toBeNull();
    }
    expect(service.precificar).toHaveBeenCalledTimes(1);
    component.quantidadeForm.controls.quantidade.setValue(2);
    tick(250);
    expect(component.preco?.valorTotal).toBe(27);
  }));

  for (const tipo of ['POR_METRO_QUADRADO', 'POR_METRO_LINEAR', 'METRO_LINEAR']) {
    it(`${tipo}: exige preenchimento e clique em Calcular`, fakeAsync(() => {
      service.listarPrecos.and.returnValue(of([{ ...politica(tipo), largurasLinearesPermitidas: '1,2', modoCobranca: 'QUADRADO' }] as any));
      entrar();
      expect(service.precificar).not.toHaveBeenCalled();
      component.quantidadeForm.patchValue({ altura: 1, largura: 1, quantidade: 2 });
      tick(250);
      fixture.detectChanges();
      expect(service.precificar).not.toHaveBeenCalled();
      const button = Array.from(priceCard().querySelectorAll('button')).find(item => item.textContent?.trim() === 'Calcular')!;
      button.click();
      fixture.detectChanges();
      expect(service.precificar).toHaveBeenCalledOnceWith(77, jasmine.objectContaining({ altura: 1, largura: 1, quantidade: 2 }));
      component.quantidadeForm.controls.quantidade.setValue(3);
      tick(250);
      expect(component.preco).toBeNull();
      expect(service.precificar).toHaveBeenCalledTimes(1);
    }));
  }

  it('calcula também serviço fixo e atualiza sua quantidade', fakeAsync(() => {
    entrar();
    component.selecionarServicoFunil({ id: 22, nome: 'Instalação', ativo: true, politicas: [politica()] } as any);
    tick(250);
    fixture.detectChanges();
    expect(service.precificarServico).toHaveBeenCalledOnceWith(22, jasmine.objectContaining({ quantidade: 1 }));
    component.quantidadeForm.controls.quantidade.setValue(3);
    tick(250);
    expect(service.precificarServico).toHaveBeenCalledTimes(2);
    expect(component.preco?.valorTotal).toBe(40.5);
  }));

  it('calcula ao entrar pela aba, mesmo antes de o stepper atualizar seu índice', fakeAsync(() => {
    component.data.produtoPreSelecionado = null;
    fixture.detectChanges();
    tick(250);
    component.selecionarProduto(produto as any, true);
    expect(component.stepper?.selectedIndex).toBe(0);
    expect(service.precificar).not.toHaveBeenCalled();
    component.onStepSelectionChange({ selectedIndex: 1 });
    expect(service.precificar).toHaveBeenCalledTimes(1);
    tick(0);
  }));

  it('não exige quantidade quando a política fixa não a multiplica', fakeAsync(() => {
    service.listarPrecos.and.returnValue(of([{ ...politica(), multiplicaQuantidade: false }] as any));
    entrar();
    expect(component.mostraQuantidadePreco).toBeFalse();
    expect(service.precificar).toHaveBeenCalledTimes(1);
    expect(priceCard().querySelector('input')).toBeNull();
    expect(fixture.nativeElement.querySelector('.summary-price-total')?.textContent).toContain('13,50');
  }));

  it('descarta resposta antiga quando a quantidade muda durante uma consulta', fakeAsync(() => {
    const antiga = new Subject<any>();
    service.precificar.and.returnValue(antiga);
    entrar();
    expect(component.precificando).toBeTrue();
    service.precificar.and.returnValue(of(resultado(3) as any));
    component.quantidadeForm.controls.quantidade.setValue(3);
    expect(antiga.observed).toBeFalse();
    tick(250);
    antiga.next(resultado(1));
    expect(component.preco?.valorTotal).toBe(40.5);
    expect(component.precificando).toBeFalse();
  }));

  it('mostra erro e permite tentar novamente pelo botão', fakeAsync(() => {
    service.precificar.and.returnValue(throwError(() => new Error('Falha no cálculo')));
    entrar();
    expect(component.precificando).toBeFalse();
    expect(component.preco).toBeNull();
    expect(TestBed.inject(ToastrService).error).toHaveBeenCalled();
    service.precificar.and.returnValue(of(resultado() as any));
    priceCard().querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(component.preco?.valorTotal).toBe(13.5);
  }));

  it('aguarda política assíncrona quando a tela já está na etapa de preço', fakeAsync(() => {
    const politicas = new Subject<any>();
    service.listarPrecos.and.returnValue(politicas);
    entrar();
    expect(service.precificar).not.toHaveBeenCalled();
    politicas.next([politica()]);
    expect(service.precificar).toHaveBeenCalledTimes(1);
    expect(component.preco?.valorTotal).toBe(13.5);
    politicas.complete();
  }));

  it('encerra cálculo e atualização automática ao fechar o diálogo', fakeAsync(() => {
    const pendente = new Subject<any>();
    service.precificar.and.returnValue(pendente);
    entrar();
    component.quantidadeForm.controls.quantidade.setValue(2);
    fixture.destroy();
    tick(250);
    expect(pendente.observed).toBeFalse();
    expect(component.precificando).toBeFalse();
    expect(service.precificar).toHaveBeenCalledTimes(1);
  }));
});
