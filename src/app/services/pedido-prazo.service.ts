import { HttpContext } from '@angular/common/http';
import { SILENT_REQUEST } from '../interceptors/loading.interceptor';
import { PedidoPrazoIndicadores } from '../models/pedido/pedido-prazo-indicadores.model';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { PedidoPrazoParametros } from '../models/pedido/pedido-prazo.model';
import { PedidoComercialDetalhe } from '../pages/grafica/shared/grafica.models';
@Injectable({providedIn: 'root'})
export class PedidoPrazoService {
  constructor(private api: ApiService) {}
  indicadores() { return this.api.get<PedidoPrazoIndicadores>('api/comercial/pedidos/indicadores-prazo', undefined, new HttpContext().set(SILENT_REQUEST, true)); }
  configuracao() { return this.api.get<{parametros: PedidoPrazoParametros}>('api/comercial/pedidos/configuracoes'); }
  configurar(p: PedidoPrazoParametros) { return this.api.put('api/comercial/pedidos/configuracoes', p); }
  editar(id: number, versaoEsperada: number, dataHora: string | null) { return this.api.patch<PedidoComercialDetalhe>(`api/comercial/pedidos/${id}/previsao`, {versaoEsperada, dataHora}); }
  pedido(id: number) { return this.api.get<PedidoComercialDetalhe>(`api/comercial/pedidos/${id}`); }
}
