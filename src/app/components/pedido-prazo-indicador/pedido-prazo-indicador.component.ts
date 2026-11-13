import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PedidoPrazo, PedidoPrazoSituacao } from 'src/app/models/pedido/pedido-prazo.model';
import { dataExataSP } from 'src/app/shared/pedido-prazo/pedido-fuso';
@Component({selector:'app-pedido-prazo-indicador', standalone:true, imports:[CommonModule,MatIconModule], templateUrl:'./pedido-prazo-indicador.component.html', styleUrl:'./pedido-prazo-indicador.component.scss'})
export class PedidoPrazoIndicadorComponent {
 @Input() prazo?: PedidoPrazo | null;
 readonly labels: Record<PedidoPrazoSituacao,string> = {DENTRO_DO_PRAZO:'Dentro do prazo',PROXIMO_DO_PRAZO:'Próximo do prazo',ATRASADO:'Atrasado',ATRASO_CRITICO:'Atraso crítico',PRODUCAO_CONCLUIDA:'Produção concluída',SEM_PREVISAO:'Sem previsão',CANCELADO:'Acompanhamento encerrado — cancelado'};
 get situacao(): PedidoPrazoSituacao {return this.prazo?.situacao || 'SEM_PREVISAO';}
 get icone() {return this.situacao === 'PRODUCAO_CONCLUIDA' ? 'task_alt' : this.situacao === 'ATRASO_CRITICO' ? 'warning' : 'schedule';}
 exata = dataExataSP;
}
