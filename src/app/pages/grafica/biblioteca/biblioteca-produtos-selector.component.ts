import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, finalize, takeUntil, Subscription, timeout } from 'rxjs';
import { SetupProgress, SetupProgressComponent, preparacaoAtiva } from 'src/app/components/setup-progress/setup-progress.component';
import { MaterialModule } from 'src/app/material.module';
import { HierarchyTreeComponent, HierarchyTreeNode, HierarchyTreeSelectionState } from 'src/app/components/hierarchy-tree/hierarchy-tree.component';
import { BibliotecaItem, BibliotecaResultado, BibliotecaService } from './biblioteca.service';

@Component({
  selector: 'app-biblioteca-produtos-selector', standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, HierarchyTreeComponent, SetupProgressComponent],
  templateUrl: './biblioteca-produtos-selector.component.html',
  styleUrls: ['./biblioteca-produtos-selector.component.scss'],
})
export class BibliotecaProdutosSelectorComponent implements OnInit, OnDestroy {
  @Input() onboarding = false;
  job: SetupProgress | null = null;
  reconectando = true;
  private acompanhamento?: Subscription;
  @Input() mostrarAcaoAdicionar = true;
  @Input() mostrarIntroducao = true;
  @Output() importado = new EventEmitter<BibliotecaResultado>();
  @Output() preparacao = new EventEmitter<SetupProgress | null>(true);
  @Output() ocupado = new EventEmitter<boolean>(true);
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
    this.reconectar();
  }
  ngOnDestroy() { this.acompanhamento?.unsubscribe(); this.destruir.next(); this.destruir.complete(); }
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
  reconectar() {
    this.acompanhamento?.unsubscribe();
    this.reconectando = true; this.erro = ''; this.ocupado.emit(true);
    this.service.ultima().pipe(takeUntil(this.destruir)).subscribe({
      next: job => {
        this.reconectando = false;
        if (job) {
          this.job = job; this.preparacao.emit(job);
          if (preparacaoAtiva(job)) { this.importando = true; this.observar(job.id); return; }
          this.receber(job, false);
        } else { this.job = null; this.preparacao.emit(null); this.importando = false; this.ocupado.emit(false); }
        if (!this.onboarding || !job) this.carregar();
      },
      error: () => { this.reconectando = false; this.erro = 'Não foi possível consultar a preparação. Reconecte antes de continuar.'; },
    });
  }
  adicionar() {
    if (this.importando || this.reconectando || this.erro || !this.selecionados.size) return;
    const itens = this.itens.filter(i => this.selecionados.has(this.chave(i)));
    this.importando = true; this.ocupado.emit(true); this.erro = ''; this.resultado = null;
    this.service.importar(itens, this.onboarding).pipe(timeout(15000), takeUntil(this.destruir)).subscribe({
      next: job => { this.job = job; this.preparacao.emit(job); this.selecionados.clear(); this.observar(job.id); },
      error: () => {
        // POST pode ter sido confirmado mesmo se a resposta se perdeu. Consultar antes de permitir novo envio.
        this.reconectar();
      },
    });
  }
  private observar(id: number) {
    this.acompanhamento?.unsubscribe();
    this.acompanhamento = this.service.acompanhar(id).pipe(takeUntil(this.destruir)).subscribe({
      next: job => this.receber(job, true),
      error: () => this.erro = 'A conexão com o progresso foi interrompida. A importação continua no servidor. Reconecte para acompanhar.',
    });
  }
  private receber(job: SetupProgress, notificar: boolean) {
    this.job = job; this.preparacao.emit(job); this.importando = preparacaoAtiva(job); this.ocupado.emit(this.importando);
    if (this.importando) return;
    this.selecionados.clear(); this.estados.forEach(e => { e.selected = 0; this.atualizarEstado(e); });
    const resultado: BibliotecaResultado = {
      importados: job.itens.filter(i => i.status === 'CRIADO').map(i => ({bibliotecaProdutoId: i.templateId, nome: i.nome || '', servicoId: i.tipo === 'SERVICO' ? i.criadoId || undefined : undefined})),
      ignorados: job.itens.filter(i => i.status === 'DUPLICADO').map(i => ({bibliotecaProdutoId: i.templateId, nome: i.nome || '', motivo: i.mensagem || ''})),
      erros: job.itens.filter(i => i.status === 'ERRO').map(i => ({bibliotecaProdutoId: i.templateId, nome: i.nome || '', mensagem: i.mensagem || ''})),
    };
    this.resultado = resultado;
    if (notificar) { this.importado.emit(resultado); if (!this.onboarding) this.carregar(); }
  }
  configuracao(item: BibliotecaItem) { return [item.material, item.formato, item.cor].filter(Boolean).join(" · "); }
  preco(tipo: string) {
    return ({ FIXO: 'Preço fixo', POR_FAIXA_QUANTIDADE: 'Faixas de quantidade', POR_LOTE: 'Lotes', POR_METRO_QUADRADO: 'Por metro / m²' } as Record<string,string>)[tipo] || tipo;
  }
  private normalizar(v: string) { return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
}
