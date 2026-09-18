import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ProdutoOption } from 'src/app/models/produto/produto-option.model';
import { CalculadoraConfigService } from '../calculadora-config.service';
import { CalculadoraConfigComponent } from './smart-calc-config.component';

describe('CalculadoraConfigComponent', () => {
  let service: jasmine.SpyObj<CalculadoraConfigService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let router: jasmine.SpyObj<Router>;
  const produtos: ProdutoOption[] = [
    { id: 1, nome: 'Placa MDF', familiaNome: 'Placa MDF', materialNome: 'MDF', formatoNome: '60x90',
      suportado: true, habilitado: true, motivos: [] },
    { id: 2, nome: 'Placa MDF', familiaNome: 'Placa MDF', materialNome: 'MDF', formatoNome: '70x100',
      suportado: true, habilitado: false, motivos: [] },
    { id: 3, nome: 'Papel Supremo', familiaNome: 'Papel', formatoNome: 'A4',
      suportado: false, habilitado: true, motivos: ['DIMENSOES_INVALIDAS'] },
  ];

  beforeEach(() => {
    service = jasmine.createSpyObj('CalculadoraConfigService', ['getConfigCompleta', 'salvar']);
    toastr = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    service.getConfigCompleta.and.returnValue(of({ config: { id: 10, ativo: true }, produtosDisponiveis: produtos }));
    service.salvar.and.returnValue(of({ config: { id: 10, ativo: false }, produtosDisponiveis: produtos }));
    TestBed.configureTestingModule({ providers: [
      FormBuilder,
      { provide: CalculadoraConfigService, useValue: service },
      { provide: ToastrService, useValue: toastr },
      { provide: ActivatedRoute, useValue: { snapshot: { routeConfig: { path: 'calculadora/config/criar' } } } },
      { provide: Router, useValue: router },
    ] });
  });

  function criar(): CalculadoraConfigComponent {
    const component = TestBed.runInInjectionContext(() => new CalculadoraConfigComponent());
    component.ngOnInit();
    return component;
  }

  it('carrega seleção independente do suporte e traduz pendências', () => {
    const component = criar();
    expect(component.selectedIds).toEqual([1, 3]);
    expect(component.transferItems.map(item => item.group)).toEqual(['Placa MDF', 'Placa MDF', 'Papel']);
    expect(component.transferItems[0].label).toBe('Placa MDF');
    expect(component.transferItems[0].searchText).toContain('MDF 60x90');
    expect(component.produtoPorId(1)?.materialNome).toBe('MDF');
    expect(component.transferItems[0].status).toBe('PRONTO');
    expect(component.transferItems[2].status).toBe('PRECISA_AJUSTE');
    expect(component.transferItems[2].details?.[0]).toContain('largura e altura');
    expect(component.transferItems[2].editRoute).toEqual(['/page/grafica/produtos', 3, 'editar']);
  });

  it('move produtos com e sem pendência, salva seleção e ativação', () => {
    const component = criar();
    component.atualizarSelecao([2, 3]);
    component.form.controls.ativo.setValue(false);
    component.onSubmit();
    expect(service.salvar).toHaveBeenCalledWith({ ativo: false, produtoGraficoIds: [2, 3] });
    expect(component.selectedIds).toEqual([1, 3]);
    expect(toastr.success).toHaveBeenCalled();
  });

  it('mostra erro quando salvar falha', () => {
    service.salvar.and.returnValue(throwError(() => new Error('Falha')));
    criar().onSubmit();
    expect(toastr.error).toHaveBeenCalled();
  });

  it('impede salvar se a configuração não carregou', () => {
    service.getConfigCompleta.and.returnValue(throwError(() => new Error('Falha')));
    const component = criar();
    component.onSubmit();
    expect(service.salvar).not.toHaveBeenCalled();
    expect(toastr.error).toHaveBeenCalled();
  });

  it('volta ao SmartCalc pelas ações da página', () => {
    criar().voltar();
    expect(router.navigate).toHaveBeenCalledWith(['/smartcalc']);
  });
});
