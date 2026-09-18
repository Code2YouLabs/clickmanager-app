import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ProdutoOption } from 'src/app/models/produto/produto-option.model';
import { CalculadoraConfigService } from '../calculadora-config.service';
import { CalculadoraConfigComponent } from './smart-calc-config.component';

describe('CalculadoraConfigComponent', () => {
  let service: jasmine.SpyObj<CalculadoraConfigService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  const produtos: ProdutoOption[] = [
    { id: 1, nome: 'Placa 60x90', familiaNome: 'Placa MDF', formatoNome: '60x90',
      suportado: true, habilitado: true, motivos: [] },
    { id: 2, nome: 'Placa 70x100', familiaNome: 'Placa MDF', formatoNome: '70x100',
      suportado: true, habilitado: false, motivos: [] },
    { id: 3, nome: 'Panfleto', familiaNome: 'Impressos',
      suportado: false, habilitado: false, motivos: ['PRECO_LOTE_NAO_SUPORTADO'] },
  ];

  beforeEach(() => {
    service = jasmine.createSpyObj('CalculadoraConfigService', ['getConfigCompleta', 'salvar']);
    toastr = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    service.getConfigCompleta.and.returnValue(of({ config: { id: 10, ativo: true }, produtosDisponiveis: produtos }));
    service.salvar.and.returnValue(of({ config: { id: 10, ativo: false }, produtosDisponiveis: produtos.map(p => ({
      ...p, habilitado: p.id === 2,
    })) }));
    TestBed.configureTestingModule({ providers: [
      FormBuilder,
      { provide: CalculadoraConfigService, useValue: service },
      { provide: ToastrService, useValue: toastr },
      { provide: ActivatedRoute, useValue: { snapshot: { routeConfig: { path: 'calculadora/config/criar' } } } },
    ] });
  });

  function criar(): CalculadoraConfigComponent {
    const component = TestBed.runInInjectionContext(() => new CalculadoraConfigComponent());
    component.ngOnInit();
    return component;
  }

  it('carrega, agrupa e busca produtos mantendo motivos de não suporte', () => {
    const component = criar();
    expect(component.form.controls.ativo.value).toBeTrue();
    expect(component.grupos('HABILITADO')[0].produtos.map(p => p.id)).toEqual([1]);
    expect(component.grupos('DISPONIVEL')[0].produtos.map(p => p.id)).toEqual([2]);
    expect(component.grupos('PRECISA_AJUSTE')[0].produtos.map(p => p.id)).toEqual([3]);
    expect(component.motivoTexto('PRECO_LOTE_NAO_SUPORTADO')).toContain('lote');
    component.pesquisa = '70x100';
    expect(component.grupos('DISPONIVEL')[0].produtos.map(p => p.id)).toEqual([2]);
    expect(component.grupos('HABILITADO')).toEqual([]);
  });

  it('seleciona produtos válidos, impede inválidos, remove e salva seleção e ativação', () => {
    const component = criar();
    component.alternarProduto(produtos[2], true);
    expect(component.habilitados.has(3)).toBeFalse();
    component.alternarProduto(produtos[0], false);
    component.alternarProduto(produtos[1], true);
    component.form.controls.ativo.setValue(false);
    component.onSubmit();
    expect(service.salvar).toHaveBeenCalledWith({ ativo: false, produtoGraficoIds: [2] });
    expect(component.habilitados.has(2)).toBeTrue();
    expect(toastr.success).toHaveBeenCalled();
  });

  it('mostra erro quando salvar falha', () => {
    service.salvar.and.returnValue(throwError(() => new Error('Falha')));
    const component = criar();
    component.onSubmit();
    expect(toastr.error).toHaveBeenCalled();
  });

  it('impede salvar se a configuração não carregou', () => {
    service.getConfigCompleta.and.returnValue(throwError(() => new Error('Falha')));
    const component = criar();
    expect(component.erroCarregamento).toBeTrue();
    component.onSubmit();
    expect(service.salvar).not.toHaveBeenCalled();
    expect(toastr.error).toHaveBeenCalled();
  });
});
