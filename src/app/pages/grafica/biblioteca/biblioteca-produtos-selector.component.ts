import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import { BibliotecaItem, BibliotecaResultado, BibliotecaService } from './biblioteca.service';

@Component({
  selector: 'app-biblioteca-produtos-selector', standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './biblioteca-produtos-selector.component.html',
  styleUrls: ['./biblioteca-produtos-selector.component.scss'],
})
export class BibliotecaProdutosSelectorComponent implements OnInit, OnDestroy {
  @Output() importado = new EventEmitter<BibliotecaResultado>();
  @Output() ocupado = new EventEmitter<boolean>();
  itens: BibliotecaItem[] = [];
  selecionados = new Set<string>();
  categoria = '';
  busca = '';
  termo = '';
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
  get filtrados() {
    return this.itens.filter(i => (!this.categoria || i.categoria === this.categoria) &&
      this.normalizar([i.nome,i.descricao,i.material,i.formato,i.cor,i.categoria].join(' ')).includes(this.termo));
  }
  get todosSelecionados() { return this.filtrados.length > 0 && this.filtrados.every(i => this.selecionados.has(this.chave(i))); }
  marcar(item: BibliotecaItem, valor: boolean) {
    if (this.importando) return;
    const chave = this.chave(item);
    if (valor) this.selecionados.add(chave); else this.selecionados.delete(chave);
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
        this.resultado = resultado; this.selecionados.clear(); this.importado.emit(resultado); this.carregar();
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
