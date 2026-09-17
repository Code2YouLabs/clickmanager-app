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
    expect(fixture.nativeElement.textContent).toContain('Adicionar à empresa');
    expect(fixture.nativeElement.textContent).toContain('Acabamentos disponíveis');
    fixture.destroy();
  });
});
