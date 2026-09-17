import { Injectable } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

export interface BibliotecaItem {
  id: number;
  tipo: 'PRODUTO' | 'SERVICO';
  nome: string;
  descricao: string;
  categoria: string;
  material?: string;
  formato?: string;
  cor?: string;
  tiposPreco: string[];
  acabamentos: string[];
  jaExiste: boolean;
}
export interface BibliotecaResultado {
  importados: { bibliotecaProdutoId: number; nome: string; servicoId?: number }[];
  ignorados: { bibliotecaProdutoId: number; nome: string; motivo: string }[];
  erros: { bibliotecaProdutoId: number; nome: string; mensagem: string }[];
}
@Injectable({ providedIn: 'root' })
export class BibliotecaService {
  constructor(private readonly api: ApiService) {}
  listar() { return this.api.get<BibliotecaItem[]>('api/grafica/biblioteca/itens'); }
  importar(itens: BibliotecaItem[]) {
    return this.api.post<BibliotecaResultado>('api/grafica/biblioteca/importar', {
      produtoIds: itens.filter(i => i.tipo === 'PRODUTO').map(i => i.id),
      servicoIds: itens.filter(i => i.tipo === 'SERVICO').map(i => i.id),
    });
  }
}
