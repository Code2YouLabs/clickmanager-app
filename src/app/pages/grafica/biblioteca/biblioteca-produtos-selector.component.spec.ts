import { fakeAsync, tick, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';
import { BibliotecaProdutosSelectorComponent } from './biblioteca-produtos-selector.component';
import { BibliotecaItem, BibliotecaResultado, BibliotecaService } from './biblioteca.service';

const produto: BibliotecaItem = { id: 1, tipo: 'PRODUTO', nome: 'Impressão A4', descricao: 'Colorida', categoria: 'Impressão > Papel', material: 'Sulfite', formato: 'A4', cor: '4x0', tiposPreco: ['FIXO'], acabamentos: ['Corte'], jaExiste: false };
const servico: BibliotecaItem = { ...produto, tipo: 'SERVICO', nome: 'Criação de arte', categoria: 'Serviços', acabamentos: [] };
describe('BibliotecaProdutosSelectorComponent', () => {
  let component: BibliotecaProdutosSelectorComponent;
  let api: jasmine.SpyObj<BibliotecaService>;
  beforeEach(() => {
    api = jasmine.createSpyObj('BibliotecaService', ['listar','importar']);
    api.listar.and.returnValue(of([produto,servico]));
    component = new BibliotecaProdutosSelectorComponent(api);
    component.ngOnInit();
  });
  afterEach(() => component.ngOnDestroy());
  it('pesquisa com debounce e combina a categoria', fakeAsync(() => {
    component.pesquisar('impressao'); tick(299); expect(component.filtrados.length).toBe(2);
    tick(1); expect(component.filtrados).toEqual([produto]);
    component.categoria = 'Serviços'; expect(component.filtrados).toEqual([]);
  }));
  it('seleciona todos os resultados preservando ids iguais de tipos diferentes', () => {
    component.selecionarTodos(true); expect(component.selecionados.size).toBe(2);
    component.categoria = 'Serviços'; component.selecionarTodos(false);
    expect(component.selecionados.has('PRODUTO:1')).toBeTrue(); expect(component.selecionados.has('SERVICO:1')).toBeFalse();
  });
  it('mostra sucesso parcial e atualiza o estado atual da empresa', () => {
    const resultado: BibliotecaResultado = { importados: [{ bibliotecaProdutoId: 1, nome: produto.nome }], ignorados: [{bibliotecaProdutoId: 1,nome: servico.nome,motivo:'DUPLICADO'}], erros: [] };
    api.importar.and.returnValue(of(resultado));
    component.selecionarTodos(true); component.adicionar();
    expect(api.importar).toHaveBeenCalledWith([produto,servico]); expect(component.resultado).toBe(resultado);
    expect(component.selecionados.size).toBe(0); expect(api.listar).toHaveBeenCalledTimes(2);
  });
  it('bloqueia envio repetido e mantém seleção após falha', () => {
    const resposta = new Subject<BibliotecaResultado>(); api.importar.and.returnValue(resposta);
    component.marcar(produto,true); component.adicionar(); component.adicionar();
    expect(api.importar).toHaveBeenCalledTimes(1);
    resposta.error(new Error('SQL segredo'));
    expect(component.importando).toBeFalse(); expect(component.selecionados.size).toBe(1);
    expect(component.erro).not.toContain('SQL');
  });
  it('renderiza a interface real com ações e acabamentos', async () => {
    await TestBed.configureTestingModule({ imports: [BibliotecaProdutosSelectorComponent,NoopAnimationsModule], providers: [{ provide: BibliotecaService,useValue: api }] }).compileComponents();
    const fixture = TestBed.createComponent(BibliotecaProdutosSelectorComponent); fixture.detectChanges();
    fixture.componentInstance.modo = 'detalhada'; fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Adicionar à empresa');
    expect(fixture.nativeElement.textContent).toContain('Acabamentos disponíveis');
    fixture.destroy();
  });
  it('monta categorias reais em profundidade arbitrária, inclusive com itens e subcategorias', () => {
    component.itens = [produto, { ...produto, id: 2, categoria: 'Impressão' },
      { ...produto, id: 3, categoria: 'Impressão > Papel > Especial' }];
    expect(component.arvore.length).toBe(1);
    const raiz = component.arvore[0];
    expect(raiz.label).toBe('Impressão');
    expect(raiz.children!.map(n => n.label)).toEqual(['Papel', 'Impressão A4 · Sulfite · A4 · 4x0']);
    expect(raiz.children![0].children![1].label).toBe('Especial');
    expect(component.estados.get(raiz.id)!.total).toBe(3);
  });
  it('seleciona e desmarca descendentes sem alterar outros ramos', () => {
    const raiz = component.arvore[0];
    component.marcarNo({ node: raiz, checked: true });
    expect([...component.selecionados]).toEqual(['PRODUTO:1']);
    expect(component.estados.get(raiz.id)!.checked).toBeTrue();
    component.marcarNo({ node: raiz, checked: false });
    expect(component.selecionados.size).toBe(0);
  });
  it('atualiza estado intermediário de todos os ancestrais sem reconstruir a árvore', () => {
    component.itens = [produto, { ...produto, id: 2, formato: 'A3' }];
    const arvore = component.arvore;
    component.marcar(produto, true);
    for (const node of [arvore[0], arvore[0].children![0]]) {
      expect(component.estados.get(node.id)).toEqual({ checked: false, indeterminate: true, selected: 1, total: 2 });
    }
    expect(component.algunsSelecionados).toBeTrue();
    expect(component.arvore).toBe(arvore);
    component.marcarNo({ node: arvore[0].children![0], checked: true });
    expect(component.todosSelecionados).toBeTrue();
    expect(component.estados.get(arvore[0].id)!.indeterminate).toBeFalse();
  });
  it('busca mantém ancestrais, remove ramos vazios e limita seleção ao conjunto exibido', fakeAsync(() => {
    component.itens = [produto, { ...produto, id: 2, formato: 'A3', nome: 'Impressão A3' }, servico];
    component.pesquisar('a3'); tick(300);
    expect(component.arvore.map(n => n.label)).toEqual(['Impressão']);
    expect(component.arvore[0].children![0].label).toBe('Papel');
    component.marcarNo({ node: component.arvore[0], checked: true });
    expect([...component.selecionados]).toEqual(['PRODUTO:2']);
    component.selecionarTodos(false); component.selecionarTodos(true);
    expect([...component.selecionados]).toEqual(['PRODUTO:2']);
    component.pesquisar(''); tick(300);
    expect(component.estados.get(component.arvore[0].id)!.indeterminate).toBeTrue();
  }));
  it('preserva um único conjunto ao alternar modos nos dois sentidos e importar a seleção da árvore', () => {
    const selecao = component.selecionados;
    expect(component.modo).toBe('arvore');
    component.marcarNo({ node: component.arvore[0], checked: true });
    component.modo = 'detalhada';
    expect(component.selecionados.has(component.chave(produto))).toBeTrue();
    component.marcar(servico, true); component.modo = 'arvore';
    expect(component.selecionados).toBe(selecao);
    expect(component.todosSelecionados).toBeTrue();
    api.importar.and.returnValue(of({ importados: [], ignorados: [], erros: [] }));
    component.adicionar();
    expect(api.importar).toHaveBeenCalledWith([produto, servico]);
  });

});
