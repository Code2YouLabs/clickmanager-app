import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { FormOrcamentoComponent } from './form-orcamento.component';

describe('FormOrcamentoComponent', () => {
  let component: FormOrcamentoComponent;
  let orcamentoService: any;
  let authService: any;
  let clienteService: any;
  let featureFlagService: any;
  let router: any;

  beforeEach(() => {
    orcamentoService = {
      criar: jasmine.createSpy('criar').and.returnValue(of({ id: 77 })),
    };
    authService = {
      temPermissao: jasmine.createSpy('temPermissao').and.returnValue(true),
    };
    clienteService = {
      buscarPorNome: jasmine.createSpy('buscarPorNome').and.returnValue(of({ content: [], pageNumber: 0, pageSize: 10, totalElements: 0, totalPages: 0, last: true })),
    };
    featureFlagService = {
      carregar: jasmine.createSpy('carregar').and.returnValue(of({ CLIENTES: true })),
    };
    router = {
      navigate: jasmine.createSpy('navigate'),
    };

    component = new FormOrcamentoComponent(
      new FormBuilder(),
      clienteService,
      {
        listar: jasmine.createSpy('listar').and.returnValue(of({ content: [], pageNumber: 0, pageSize: 10, totalElements: 0, totalPages: 0, last: true })),
        detalhar: jasmine.createSpy('detalhar').and.returnValue(of({})),
      } as any,
      orcamentoService,
      authService,
      featureFlagService,
      { open: jasmine.createSpy('open') } as any,
      { warning: jasmine.createSpy('warning'), success: jasmine.createSpy('success'), error: jasmine.createSpy('error') } as any,
      router,
    );
    component.ngOnInit();
  });

  it('valida nome e telefone do contato', () => {
    component.contatoForm.patchValue({ nomeContato: '', telefoneContato: '' });

    expect(component.contatoForm.invalid).toBeTrue();
    expect(component.contatoForm.controls.nomeContato.hasError('required')).toBeTrue();
    expect(component.contatoForm.controls.telefoneContato.hasError('required')).toBeTrue();
  });

  it('inclui produto de catalogo', () => {
    component.produtoSelecionado = {
      id: 10,
      codigo: 'SKU-10',
      nome: 'Produto teste',
      slug: 'produto-teste',
      unidadeVenda: 'UNIDADE',
      precoVenda: 30,
    };
    component.itemForm.patchValue({
      descricao: 'Produto teste',
      unidade: 'UNIDADE',
      quantidade: 2,
      valorUnitario: 30,
      desconto: 5,
    });

    component.salvarItem();

    expect(component.itens.length).toBe(1);
    expect(component.itens[0].tipoItem).toBe('CATALOGO');
    expect(component.itens[0].produtoId).toBe(10);
    expect(component.subtotal(component.itens[0])).toBe(55);
  });

  it('inclui item livre sem produto cadastrado', () => {
    component.usarLivre();
    component.itemForm.patchValue({
      descricao: 'Serviço avulso',
      unidade: 'UNIDADE',
      quantidade: 1,
      valorUnitario: 45,
      desconto: 0,
    });

    component.salvarItem();

    expect(component.itens.length).toBe(1);
    expect(component.itens[0].tipoItem).toBe('LIVRE');
    expect(component.itens[0].produtoId).toBeNull();
    expect(component.itens[0].descricao).toBe('Serviço avulso');
  });

  it('edita e remove item', () => {
    component.usarLivre();
    component.itemForm.patchValue({ descricao: 'Item original', unidade: 'UNIDADE', quantidade: 1, valorUnitario: 10, desconto: 0 });
    component.salvarItem();

    component.editarItem(0);
    component.itemForm.patchValue({ descricao: 'Item editado', valorUnitario: 20 });
    component.salvarItem();

    expect(component.itens[0].descricao).toBe('Item editado');
    expect(component.itens[0].valorUnitario).toBe(20);

    component.removerItem(0);
    expect(component.itens.length).toBe(0);
  });

  it('bloqueia orçamento sem itens', () => {
    component.contatoForm.patchValue({ nomeContato: 'Maria', telefoneContato: '11999999999' });

    component.salvarOrcamento();

    expect(orcamentoService.criar).not.toHaveBeenCalled();
  });

  it('envia orçamento misto com origem BALCAO ao endpoint oficial via service', () => {
    component.contatoForm.patchValue({ nomeContato: 'Maria', telefoneContato: '11999999999', emailContato: 'maria@teste.com' });
    component.usarLivre();
    component.itemForm.patchValue({ descricao: 'Item livre', unidade: 'UNIDADE', quantidade: 1, valorUnitario: 10, desconto: 0 });
    component.salvarItem();
    component.usarCatalogo();
    component.produtoSelecionado = { id: 2, codigo: 'P2', nome: 'Produto 2', slug: 'produto-2', unidadeVenda: 'CAIXA', precoVenda: 20 };
    component.itemForm.patchValue({ descricao: 'Produto 2', unidade: 'CAIXA', quantidade: 3, valorUnitario: 20, desconto: 5 });
    component.salvarItem();

    component.salvarOrcamento();

    const payload = orcamentoService.criar.calls.mostRecent().args[0];
    expect(payload.origem).toBe('BALCAO');
    expect(payload.clienteId).toBeNull();
    expect(payload.itens.map((item: any) => item.tipoItem)).toEqual(['LIVRE', 'CATALOGO']);
    expect(router.navigate).toHaveBeenCalledWith(['/page/orcamentos', 77]);
  });

  it('envia clienteId quando cliente foi selecionado', () => {
    component.contatoForm.patchValue({ nomeContato: 'Maria', telefoneContato: '11999999999', emailContato: 'maria@teste.com' });
    (component as any).aplicarCliente({ id: 25, nome: 'Maria Cliente', telefone: '11888887777', email: 'cliente@teste.com' });
    component.usarLivre();
    component.itemForm.patchValue({ descricao: 'Item livre', unidade: 'UNIDADE', quantidade: 1, valorUnitario: 10, desconto: 0 });
    component.salvarItem();

    component.salvarOrcamento();

    const payload = orcamentoService.criar.calls.mostRecent().args[0];
    expect(payload.clienteId).toBe(25);
    expect(payload.nomeContato).toBe('Maria Cliente');
    expect(payload.telefoneContato).toBe('11888887777');
  });

  it('bloqueia acesso local sem ORCAMENTOS_CRIAR', () => {
    authService.temPermissao.and.returnValue(false);
    component.ngOnInit();

    expect(router.navigate).toHaveBeenCalledWith(['/page/orcamentos']);
  });

  it('trata erro do backend ao salvar', () => {
    orcamentoService.criar.and.returnValue(throwError(() => new Error('erro')));
    component.contatoForm.patchValue({ nomeContato: 'Maria', telefoneContato: '11999999999' });
    component.usarLivre();
    component.itemForm.patchValue({ descricao: 'Item livre', unidade: 'UNIDADE', quantidade: 1, valorUnitario: 10, desconto: 0 });
    component.salvarItem();

    component.salvarOrcamento();

    expect(orcamentoService.criar).toHaveBeenCalled();
  });
});
