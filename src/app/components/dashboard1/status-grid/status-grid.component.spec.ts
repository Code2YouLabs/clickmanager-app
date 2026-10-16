import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { DashboardService } from '../dashboard.service';
import { of, throwError } from 'rxjs';

import { AppStatusGridComponent } from './status-grid.component';

const resumo = {
  pedidoStatus: [
    { codigo: 'EM_PRODUCAO', label: 'Produção', quantidade: 3, valor: 150 },
    { codigo: 'ENTREGUE', label: 'Entregue', quantidade: 2, valor: 100 },
  ],
  orcamentoStatus: [
    { codigo: 'APROVADO', label: 'Aprovado', quantidade: 5, valor: 900 },
    { codigo: 'VENCIDO', label: 'Vencido', quantidade: 1, valor: 50 },
  ],
};

describe('AppStatusGridComponent', () => {
  function createComponent() {
    const service = jasmine.createSpyObj('DashboardService', ['obterResumoGrafica']);
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const component = new AppStatusGridComponent(service, router);
    return { component, service, router };
  }

  it('mantém ordem canônica dos status da operação gráfica', () => {
    const { component, service } = createComponent();
    service.obterResumoGrafica.and.returnValue(of(resumo));

    component.ngOnInit();

    expect(component.pedidoStats.map((item) => item.status)).toEqual([
      'AGUARDANDO_PAGAMENTO',
      'PENDENTE',
      'EM_PRODUCAO',
      'PRONTO',
      'ENTREGUE',
    ]);
    expect(component.orcamentoStats.map((item) => item.status)).toEqual([
      'ABERTO',
      'ENVIADO',
      'APROVADO',
      'RECUSADO',
      'VENCIDO',
      'CANCELADO',
    ]);
  });

  it('preserva status anteriores quando atualização falha', () => {
    const { component, service } = createComponent();
    service.obterResumoGrafica.and.returnValue(of(resumo));
    component.ngOnInit();

    service.obterResumoGrafica.and.returnValue(throwError(() => new Error('offline')));
    component.carregarStatus();

    expect(component.pedidoStats.find((item) => item.status === 'EM_PRODUCAO')?.quantidade).toBe(3);
    expect(component.erro).toContain('Mantivemos os dados anteriores');
  });

  it('mantém navegação com filtro de status', () => {
    const { component, service, router } = createComponent();
    service.obterResumoGrafica.and.returnValue(of(resumo));
    component.ngOnInit();

    component.abrirStatus(component.orcamentoStats.find((item) => item.status === 'APROVADO')!);

    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial/orcamentos'], {
      queryParams: { status: 'APROVADO' },
    });
  });
});


describe('AppStatusGridComponent — apresentação compartilhada', () => {
  const statuses = [
    ['AGUARDANDO_PAGAMENTO', 'Aguardando pagamento', 'warning', 'pedidos'],
    ['PENDENTE', 'Pendente', 'neutral', 'pedidos'],
    ['EM_PRODUCAO', 'Produção', 'primary', 'pedidos'],
    ['PRONTO', 'Pronto', 'success', 'pedidos'],
    ['ENTREGUE', 'Entregue', 'success', 'pedidos'],
    ['ABERTO', 'Aberto', 'info', 'orcamentos'],
    ['ENVIADO', 'Enviado', 'primary', 'orcamentos'],
    ['APROVADO', 'Aprovado', 'success', 'orcamentos'],
    ['RECUSADO', 'Recusado', 'danger', 'orcamentos'],
    ['VENCIDO', 'Vencido', 'warning', 'orcamentos'],
    ['CANCELADO', 'Cancelado', 'danger', 'orcamentos'],
  ];
  let fixture: ComponentFixture<AppStatusGridComponent>;
  let service: jasmine.SpyObj<DashboardService>;
  let router: jasmine.SpyObj<Router>;
  const buttons = () => Array.from(fixture.nativeElement.querySelectorAll('.status-grid__item')) as HTMLButtonElement[];

  beforeEach(async () => {
    service = jasmine.createSpyObj('DashboardService', ['obterResumoGrafica']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    const items = statuses.map(([codigo, label], index) => ({ codigo, label, quantidade: index + 1, valor: 25.5 }));
    service.obterResumoGrafica.and.returnValue(of({ pedidoStatus: items.slice(0, 5), orcamentoStatus: items.slice(5) } as any));
    await TestBed.configureTestingModule({
      imports: [AppStatusGridComponent, NoopAnimationsModule],
      providers: [{ provide: DashboardService, useValue: service }, { provide: Router, useValue: router }],
    }).compileComponents();
    fixture = TestBed.createComponent(AppStatusGridComponent);
    fixture.componentRef.setInput('compactMobile', true);
  });

  it('apresenta todos os status, quantidades, valores e cores semânticas nas duas seções', () => {
    fixture.detectChanges();
    const grids = fixture.nativeElement.querySelectorAll('.status-grid');
    expect(grids[0].querySelectorAll('button').length).toBe(5);
    expect(grids[1].querySelectorAll('button').length).toBe(6);
    expect(buttons().length).toBe(statuses.length);
    buttons().forEach((button, index) => {
      expect(button.querySelector('.status-grid__label')?.textContent?.trim()).toBe(statuses[index][1]);
      expect(button.querySelector('.status-grid__value')?.textContent?.trim()).toBe(String(index + 1));
      expect(button.querySelector('.status-grid__amount')?.textContent?.replace(/\s/g, ' ').trim()).toBe('R$ 25,50');
      expect(button.classList.contains(`status-grid__item--${statuses[index][2]}`)).toBeTrue();
    });
  });

  it('usa nome, quantidade e valor na ordem de leitura mobile, inclusive para nomes longos', () => {
    fixture.detectChanges();
    buttons().forEach(button => {
      expect(Array.from(button.children).map(child => child.className)).toEqual([
        'status-grid__label', 'status-grid__value', 'status-grid__amount',
      ]);
    });
    expect(buttons()[0].firstElementChild?.textContent?.trim()).toBe('Aguardando pagamento');
  });

  it('mantém as ações e filtros de todos os status nos botões nativos', () => {
    fixture.detectChanges();
    buttons().forEach((button, index) => {
      expect(button.type).toBe('button');
      expect(button.disabled).toBeFalse();
      button.click();
      expect(router.navigate).toHaveBeenCalledWith([`/page/grafica/comercial/${statuses[index][3]}`], {
        queryParams: { status: statuses[index][0] },
      });
    });
    expect(router.navigate).toHaveBeenCalledTimes(11);
  });

  it('preserva todos os indicadores zerados e cores quando a resposta está vazia', () => {
    service.obterResumoGrafica.and.returnValue(of({ pedidoStatus: [], orcamentoStatus: [] } as any));
    fixture.detectChanges();
    expect(buttons().length).toBe(11);
    buttons().forEach((button, index) => {
      expect(button.querySelector('.status-grid__label')?.textContent?.trim()).toBeTruthy();
      expect(button.querySelector('.status-grid__value')?.textContent?.trim()).toBe('0');
      expect(button.querySelector('.status-grid__amount')?.textContent?.replace(/\s/g, ' ').trim()).toBe('R$ 0,00');
      expect(button.classList.contains(`status-grid__item--${statuses[index][2]}`)).toBeTrue();
    });
  });

  it('preserva a ordem original do desktop ao mudar de breakpoint, sem novas consultas', () => {
    fixture.detectChanges();
    fixture.componentRef.setInput('compactMobile', false);
    fixture.detectChanges();
    buttons().forEach(button => {
      expect(Array.from(button.children).map(child => child.className)).toEqual([
        'status-grid__value', 'status-grid__label', 'status-grid__amount',
      ]);
    });
    buttons()[0].click();
    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial/pedidos'], {
      queryParams: { status: 'AGUARDANDO_PAGAMENTO' },
    });
    expect(service.obterResumoGrafica).toHaveBeenCalledTimes(1);
  });

  it('mantém o desktop como apresentação padrão do componente', () => {
    fixture = TestBed.createComponent(AppStatusGridComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.compactMobile).toBeFalse();
    expect(buttons()[0].firstElementChild?.className).toBe('status-grid__value');
  });
});
