import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import { HierarchyTreeComponent, HierarchyTreeNode, HierarchyTreeSelectionState } from 'src/app/components/hierarchy-tree/hierarchy-tree.component';
import { BibliotecaItem, BibliotecaResultado, BibliotecaService } from './biblioteca.service';

@Component({
  selector: 'app-biblioteca-produtos-selector', standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, HierarchyTreeComponent],
  templateUrl: './biblioteca-produtos-selector.component.html',
  styleUrls: ['./biblioteca-produtos-selector.component.scss'],
})
export class BibliotecaProdutosSelectorComponent implements OnInit, OnDestroy {
  @Output() importado = new EventEmitter<BibliotecaResultado>();
  @Output() ocupado = new EventEmitter<boolean>();
  modo: 'arvore' | 'detalhada' = 'arvore';
  arvore: HierarchyTreeNode<BibliotecaItem | null>[] = [];
  estados = new Map<string | number, HierarchyTreeSelectionState>();
  // Índices reconstruídos apenas quando os dados ou filtros mudam.
  private ancestrais = new Map<string, string[]>();
  private descendentes = new Map<string | number, BibliotecaItem[]>();
  private lista: BibliotecaItem[] = [];
  get itens() { return this.lista; }
  set itens(valor: BibliotecaItem[]) { this.lista = valor; this.atualizarVisualizacao(); }
  filtrados: BibliotecaItem[] = [];
  selecionados = new Set<string>();
  private categoriaAtual = '';
  get categoria() { return this.categoriaAtual; }
  set categoria(valor: string) { this.categoriaAtual = valor; this.atualizarVisualizacao(); }
  busca = '';
  private termoAtual = '';
  get termo() { return this.termoAtual; }
  set termo(valor: string) { this.termoAtual = valor; this.atualizarVisualizacao(); }
  carregando = false;
  importando = false;
  erro = '';
  resultado: BibliotecaResultado | null = null;
  private readonly pesquisa = new Subject<string>();
  private readonly destruir = new Subject<void>();
  constructor(private readonly service: BibliotecaService) {}
  ngOnInit() {
    this.pesquisa.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destruir)).subscribe(v => this.termo = this.normalizar(v));
    this.carregar();
  }
  ngOnDestroy() { this.destruir.next(); this.destruir.complete(); }
  carregar() {
    this.carregando = true; this.erro = '';
    this.service.listar().pipe(takeUntil(this.destruir), finalize(() => this.carregando = false)).subscribe({
      next: itens => this.itens = itens,
      error: () => this.erro = 'Não foi possível carregar a biblioteca. Tente novamente.',
    });
  }
  pesquisar(valor: string) { this.pesquisa.next(valor); }
  chave(item: BibliotecaItem) { return `${item.tipo}:${item.id}`; }
  get categorias() { return [...new Set(this.itens.map(i => i.categoria))].sort((a,b) => a.localeCompare(b, 'pt-BR')); }
  private atualizarVisualizacao() {
    this.filtrados = this.itens.filter(i => (!this.categoria || i.categoria === this.categoria) &&
      this.normalizar([i.nome,i.descricao,i.material,i.formato,i.cor,i.categoria].join(' ')).includes(this.termo));
    this.arvore = []; this.estados = new Map(); this.ancestrais.clear(); this.descendentes.clear();
    const categorias = new Map<string, HierarchyTreeNode<BibliotecaItem | null>>();
    for (const item of this.filtrados) {
      const caminho = item.categoria.split(' > ');
      let filhos = this.arvore;
      const pais: string[] = [];
      caminho.forEach((label, index) => {
        const id = 'categoria:' + JSON.stringify(caminho.slice(0, index + 1));
        let node = categorias.get(id);
        if (!node) {
          node = { id, label, data: null, children: [] };
          categorias.set(id, node); filhos.push(node); this.descendentes.set(id, []);
          this.estados.set(id, { checked: false, indeterminate: false, selected: 0, total: 0 });
        }
        this.descendentes.get(id)!.push(item); pais.push(id);
        const estado = this.estados.get(id)!;
        estado.total++; if (this.selecionados.has(this.chave(item))) estado.selected++;
        filhos = node.children!;
      });
      const id = this.chave(item);
      filhos.push({ id, label: [item.nome, this.configuracao(item)].filter(Boolean).join(' · '),
        meta: item.tipo === 'SERVICO' ? 'Serviço' : null, data: item });
      this.ancestrais.set(id, pais); this.descendentes.set(id, [item]);
      this.estados.set(id, { checked: this.selecionados.has(id), indeterminate: false, selected: this.selecionados.has(id) ? 1 : 0, total: 1 });
    }
    this.estados.forEach(estado => this.atualizarEstado(estado));
  }
  private atualizarEstado(estado: HierarchyTreeSelectionState) {
    estado.checked = estado.total > 0 && estado.selected === estado.total;
    estado.indeterminate = estado.selected > 0 && !estado.checked;
  }
  marcarNo(evento: { node: HierarchyTreeNode<BibliotecaItem | null>; checked: boolean }) {
    this.descendentes.get(evento.node.id)?.forEach(item => this.marcar(item, evento.checked));
  }
  get algunsSelecionados() { return !this.todosSelecionados && this.filtrados.some(i => this.selecionados.has(this.chave(i))); }
  get todosSelecionados() { return this.filtrados.length > 0 && this.filtrados.every(i => this.selecionados.has(this.chave(i))); }
  marcar(item: BibliotecaItem, valor: boolean) {
    if (this.importando) return;
    const chave = this.chave(item);
    if (this.selecionados.has(chave) === valor) return;
    if (valor) this.selecionados.add(chave); else this.selecionados.delete(chave);
    for (const id of [chave, ...(this.ancestrais.get(chave) || [])]) {
      const estado = this.estados.get(id);
      if (estado) { estado.selected += valor ? 1 : -1; this.atualizarEstado(estado); }
    }
  }
  selecionarTodos(valor: boolean) { this.filtrados.forEach(i => this.marcar(i, valor)); }
  adicionar() {
    if (this.importando || !this.selecionados.size) return;
    const itens = this.itens.filter(i => this.selecionados.has(this.chave(i)));
    this.importando = true; this.ocupado.emit(true); this.erro = ''; this.resultado = null;
    this.service.importar(itens).pipe(takeUntil(this.destruir), finalize(() => {
      this.importando = false; this.ocupado.emit(false);
    })).subscribe({
      next: resultado => {
        this.resultado = resultado;
        this.selecionados.clear();
        this.estados.forEach(estado => { estado.selected = 0; this.atualizarEstado(estado); });
        this.importado.emit(resultado); this.carregar();
      },
      error: () => this.erro = 'Não foi possível confirmar o resultado. Atualize a biblioteca antes de tentar novamente; itens que já existem serão ignorados.',
    });
  }
  configuracao(item: BibliotecaItem) { return [item.material, item.formato, item.cor].filter(Boolean).join(" · "); }
  preco(tipo: string) {
    return ({ FIXO: 'Preço fixo', POR_FAIXA_QUANTIDADE: 'Faixas de quantidade', POR_LOTE: 'Lotes', POR_METRO_QUADRADO: 'Por metro / m²' } as Record<string,string>)[tipo] || tipo;
  }
  private normalizar(v: string) { return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
}
