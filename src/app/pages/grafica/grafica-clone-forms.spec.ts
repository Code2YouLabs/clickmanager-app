import { FormBuilder } from '@angular/forms';
import { convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CatalogoCategoriaService } from '../catalogo/shared/services/catalogo.service';
import { GraficaCategoriaFormComponent } from './categorias/grafica-categoria-form.component';
import { GraficaCorFormComponent } from './cores/grafica-cor-form.component';
import { GraficaFormatoFormComponent } from './formatos/grafica-formato-form.component';
import { GraficaMaterialFormComponent } from './materiais/grafica-material-form.component';
import { GraficaServicoFormComponent } from './servicos/grafica-servico-form.component';
import { GraficaProdutoService } from './shared/grafica.service';

describe('Clone dos cadastros da grafica', () => {
  const fb = new FormBuilder();

  it('Categoria: cloneFrom preenche os campos visiveis e salva por POST normal sem id original', () => {
    const service = jasmine.createSpyObj<CatalogoCategoriaService>('CatalogoCategoriaService', ['options', 'detalhar', 'criar', 'atualizar']);
    const toastr = toastrSpy();
    service.options.and.returnValue(of([{ id: 10, nome: 'Impressão' } as any]));
    service.detalhar.and.returnValue(of({
      id: 123,
      codigo: 'COUCHE',
      nome: 'Couchê',
      slug: 'couche',
      categoriaPaiId: 10,
      descricaoCurta: 'Linha premium',
      descricaoCompleta: '<p>Descrição completa</p>',
      ativo: true,
    } as any));
    service.criar.and.returnValue(of({} as any));

    const clone = new GraficaCategoriaFormComponent(fb, service, route('123'), routerSpy(), toastr);
    clone.ngOnInit();
    clone.salvar();

    const payloadClone = service.criar.calls.mostRecent().args[0];
    expect(payloadClone).toEqual({
      codigo: 'COUCHE',
      nome: 'Couchê',
      slug: 'couche',
      descricaoCurta: 'Linha premium',
      descricaoCompleta: '<p>Descrição completa</p>',
      categoriaPaiId: 10,
      ordemExibicao: null,
      destaque: false,
      ativo: true,
    });
    expect(JSON.stringify(payloadClone)).not.toContain('"id"');
    expect(service.atualizar).not.toHaveBeenCalled();
    expect(toastr.warning).not.toHaveBeenCalled();

    const manual = new GraficaCategoriaFormComponent(fb, service, route(), routerSpy(), toastrSpy());
    manual.form.reset({
      nome: 'Couchê',
      categoriaPaiId: 10,
      descricaoCurta: 'Linha premium',
      descricaoCompleta: '<p>Descrição completa</p>',
    });
    expect((manual as any).toRequest()).toEqual(payloadClone);
  });

  it('Material: cloneFrom preserva nome/descricao e deixa duplicidade para o POST normal', () => {
    const service = graficaServiceSpy();
    const toastr = toastrSpy();
    service.listarMateriais.and.returnValue(of([{ id: 12, codigo: 'COUCHE_150G', nome: 'Couchê 150g', descricao: 'Fosco', ativo: true }]));
    service.salvarMaterial.and.returnValue(throwError(() => ({ error: { message: 'MATERIAL_GRAFICO_DUPLICADO' } })));

    const clone = new GraficaMaterialFormComponent(fb, service, route('12'), routerSpy(), toastr);
    clone.ngOnInit();
    clone.salvar();

    const payloadClone = service.salvarMaterial.calls.mostRecent().args[0];
    expect(payloadClone).toEqual({ codigo: 'COUCHE_150G', nome: 'Couchê 150g', descricao: 'Fosco', ativo: true });
    expect(service.salvarMaterial.calls.mostRecent().args[1]).toBeUndefined();
    expect(toastr.warning).not.toHaveBeenCalled();
    expect(toastr.error).toHaveBeenCalled();

    const manual = new GraficaMaterialFormComponent(fb, service, route(), routerSpy(), toastrSpy());
    manual.form.reset({ nome: 'Couchê 150g', descricao: 'Fosco' });
    expect((manual as any).toRequest()).toEqual(payloadClone);
  });

  it('Formato: cloneFrom preserva dimensoes, area util, unidade e salva por POST normal', () => {
    const service = graficaServiceSpy();
    service.listarFormatos.and.returnValue(of([{
      id: 22,
      codigo: 'A4',
      nome: 'A4',
      descricao: 'Formato A4',
      largura: 21,
      altura: 29.7,
      larguraUtil: 20,
      alturaUtil: 28.7,
      unidadeDimensao: 'CENTIMETRO',
      ativo: true,
    }]));
    service.salvarFormato.and.returnValue(of({} as any));

    const clone = new GraficaFormatoFormComponent(fb, service, route('22'), routerSpy(), toastrSpy());
    clone.ngOnInit();
    clone.salvar();

    const payloadClone = service.salvarFormato.calls.mostRecent().args[0];
    expect(payloadClone).toEqual({
      codigo: 'A4',
      nome: 'A4',
      descricao: 'Formato A4',
      largura: 21,
      altura: 29.7,
      larguraUtil: 20,
      alturaUtil: 28.7,
      unidadeDimensao: 'CENTIMETRO',
      ativo: true,
    });
    expect(service.salvarFormato.calls.mostRecent().args[1]).toBeUndefined();

    const manual = new GraficaFormatoFormComponent(fb, service, route(), routerSpy(), toastrSpy());
    manual.form.reset({
      nome: 'A4',
      descricao: 'Formato A4',
      largura: 21,
      altura: 29.7,
      larguraUtil: 20,
      alturaUtil: 28.7,
      unidadeDimensao: 'CENTIMETRO',
    });
    expect((manual as any).toRequest()).toEqual(payloadClone);
  });

  it('Cor: cloneFrom preserva nome/descricao e salva por POST normal', () => {
    const service = graficaServiceSpy();
    service.listarCores.and.returnValue(of([{ id: 32, codigo: '4X4', nome: '4x4', descricao: 'Frente e verso', ativo: true }]));
    service.salvarCor.and.returnValue(of({} as any));

    const clone = new GraficaCorFormComponent(fb, service, route('32'), routerSpy(), toastrSpy());
    clone.ngOnInit();
    clone.salvar();

    const payloadClone = service.salvarCor.calls.mostRecent().args[0];
    expect(payloadClone).toEqual({ codigo: '4X4', nome: '4x4', descricao: 'Frente e verso', ativo: true });
    expect(service.salvarCor.calls.mostRecent().args[1]).toBeUndefined();

    const manual = new GraficaCorFormComponent(fb, service, route(), routerSpy(), toastrSpy());
    manual.form.reset({ nome: '4x4', descricao: 'Frente e verso' });
    expect((manual as any).toRequest()).toEqual(payloadClone);
  });

  it('Servico: cloneFrom copia precificacao por valor sem ids internos e salva por POST normal', () => {
    const service = graficaServiceSpy();
    service.listarServicos.and.returnValue(of([{
      id: 42,
      codigo: 'ARTE_FINAL',
      nome: 'Arte final',
      descricao: 'Tratamento de arquivo',
      ativo: true,
      politicas: [{
        id: 900,
        nome: 'Tabela original',
        tipo: 'POR_LOTE',
        ativo: true,
        selecoes: [],
        faixas: [],
        lotes: [
          { id: 901, quantidade: 10, valorLote: 40 },
          { id: 902, quantidade: 20, valorLote: 70 },
        ],
      }],
    } as any]));
    service.salvarServico.and.returnValue(of({} as any));

    const clone = new GraficaServicoFormComponent(fb, service, route('42'), routerSpy(), toastrSpy());
    clone.ngOnInit();
    clone.salvar();

    const payloadClone = service.salvarServico.calls.mostRecent().args[0];
    expect(payloadClone).toEqual({
      codigo: 'ARTE_FINAL',
      nome: 'Arte final',
      descricao: 'Tratamento de arquivo',
      politicas: [{
        nome: 'Preço do serviço',
        tipo: 'POR_LOTE',
        ativo: true,
        multiplicaQuantidade: false,
        valorFixo: null,
        precoMetroQuadrado: null,
        minimoMetroQuadrado: null,
        alturaMaxima: null,
        larguraMaxima: null,
        largurasLinearesPermitidas: null,
        modoCobranca: null,
        unidadeDimensao: null,
        selecaoOpcaoIds: [],
        faixas: [],
        lotes: [
          { quantidade: 10, valorLote: 40 },
          { quantidade: 20, valorLote: 70 },
        ],
      }],
      ativo: true,
    });
    expect(JSON.stringify(payloadClone)).not.toContain('"id"');
    expect(service.salvarServico.calls.mostRecent().args[1]).toBeUndefined();

    const manual = new GraficaServicoFormComponent(fb, service, route(), routerSpy(), toastrSpy());
    manual.form.reset({ nome: 'Arte final', descricao: 'Tratamento de arquivo' });
    manual.precoForm = (manual as any).criarPrecoForm({
      tipo: 'QUANTIDADE',
      lotes: [
        { quantidade: 10, valorLote: 40 },
        { quantidade: 20, valorLote: 70 },
      ],
    });
    expect((manual as any).toRequest()).toEqual(payloadClone);
  });
});

function route(cloneFrom?: string): any {
  return {
    paramMap: of(convertToParamMap({})),
    snapshot: {
      queryParamMap: convertToParamMap(cloneFrom ? { cloneFrom } : {}),
    },
  };
}

function routerSpy(): jasmine.SpyObj<Router> {
  return jasmine.createSpyObj<Router>('Router', ['navigate']);
}

function toastrSpy(): jasmine.SpyObj<ToastrService> {
  return jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
}

function graficaServiceSpy(): jasmine.SpyObj<GraficaProdutoService> {
  return jasmine.createSpyObj<GraficaProdutoService>('GraficaProdutoService', [
    'listarMateriais',
    'salvarMaterial',
    'listarFormatos',
    'salvarFormato',
    'listarCores',
    'salvarCor',
    'listarServicos',
    'salvarServico',
  ]);
}
