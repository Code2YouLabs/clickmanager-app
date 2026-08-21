import { CatalogoPaginaResponse } from '../../catalogo/shared/models/catalogo.models';

export type GraficaTipoParametro = 'SELECAO' | 'NUMERO_INTEIRO' | 'NUMERO_DECIMAL' | 'TEXTO';

export interface GraficaProduto {
  id: number;
  catalogoProdutoId: number;
  catalogoProdutoCodigo?: string | null;
  catalogoProdutoNome?: string | null;
  catalogoProdutoAtivo?: boolean | null;
  ativo: boolean;
  parametros: GraficaParametro[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface GraficaParametro {
  id: number;
  codigo: string;
  nome: string;
  tipoDado: GraficaTipoParametro;
  ordem: number;
  obrigatorio: boolean;
  ativo: boolean;
  opcoes: GraficaOpcao[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface GraficaOpcao {
  id: number;
  codigo: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface GraficaProdutoRequest {
  catalogoProdutoId: number;
  ativo?: boolean;
}

export interface GraficaParametroRequest {
  codigo: string;
  nome: string;
  tipoDado: GraficaTipoParametro;
  ordem?: number | null;
  obrigatorio?: boolean | null;
  ativo?: boolean | null;
}

export interface GraficaOpcaoRequest {
  codigo: string;
  nome: string;
  ordem?: number | null;
  ativo?: boolean | null;
}

export interface GraficaOrdenacaoRequest {
  itens: Array<{ id: number; ordem: number }>;
}

export type GraficaProdutoPage = CatalogoPaginaResponse<GraficaProduto>;
