import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { PedidoPrazoService } from 'src/app/services/pedido-prazo.service';
import { PedidoPrazoIndicadores } from 'src/app/models/pedido/pedido-prazo-indicadores.model';
import { PedidoPrazoSituacao } from 'src/app/models/pedido/pedido-prazo.model';
import { PedidoPrazoRelogio } from 'src/app/shared/pedido-prazo/pedido-prazo-relogio';
import { acentoPrazo, acentoSituacaoPrazo } from 'src/app/shared/pedido-prazo/pedido-prazo-acento';
import { MetricCardComponent } from '../../metric-card/metric-card.component';
import { SectionCardComponent } from '../../section-card/section-card.component';
import { PedidoPrazoIndicadorComponent } from '../../pedido-prazo-indicador/pedido-prazo-indicador.component';

@Component({selector:'app-pedido-prazo-dashboard', standalone:true,
  imports:[CommonModule, MatButtonModule, MetricCardComponent, SectionCardComponent, PedidoPrazoIndicadorComponent],
  templateUrl:'./pedido-prazo-dashboard.component.html', styleUrl:'./pedido-prazo-dashboard.component.scss'})
export class PedidoPrazoDashboardComponent implements OnInit, OnChanges, OnDestroy {
  @Input() refreshToken = 0;
  @Output() refreshState = new EventEmitter<{id:'prazo';refreshing:boolean}>();
  dados: PedidoPrazoIndicadores | null = null;
  carregando = false;
  erro: string | null = null;
  private request?: Subscription;
  private relogio = new PedidoPrazoRelogio(() => this.carregar());
  readonly acento = acentoSituacaoPrazo;
  readonly acentoPedido = acentoPrazo;
  constructor(private service: PedidoPrazoService, private router: Router) {}
  ngOnInit() { this.carregar(); }
  ngOnChanges(changes: SimpleChanges) { if (changes['refreshToken'] && !changes['refreshToken'].firstChange) this.carregar(); }
  ngOnDestroy() { this.relogio.destruir(); this.request?.unsubscribe(); }
  carregar() {
    this.request?.unsubscribe();
    this.relogio.limpar();
    this.carregando = true;
    this.erro = null;
    this.refreshState.emit({id:'prazo',refreshing:true});
    this.request = this.service.indicadores().pipe(finalize(() => {
      this.carregando = false;
      this.refreshState.emit({id:'prazo',refreshing:false});
    })).subscribe({
      next: dados => { this.dados = dados; this.relogio.agendar(dados); },
      error: () => {
        this.dados = null;
        this.erro = 'Não foi possível carregar os prazos de entrega.';
      }
    });
  }
  abrirFiltro(prazo: PedidoPrazoSituacao) {
    if (this.carregando || !this.dados || this.erro) return;
    this.router.navigate(['/page/grafica/comercial/pedidos'], {queryParams:{prazo,somenteAbertos:true,sort:'previsaoEntrega,asc'}});
  }
  abrirPedido(id: number) { this.router.navigate(['/page/comercial/pedidos',id]); }
}
