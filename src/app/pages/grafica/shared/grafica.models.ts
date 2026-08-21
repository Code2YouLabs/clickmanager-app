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
  dependencias?: GraficaDependencia[];
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

export interface GraficaOpcoesLoteRequest {
  valores: string[];
}

export interface GraficaDependencia {
  id: number;
  parametroOrigemId: number;
  parametroOrigemNome: string;
  opcaoOrigemId: number;
  opcaoOrigemNome: string;
  parametroDestinoId: number;
  parametroDestinoNome: string;
  opcaoDestinoId: number;
  opcaoDestinoNome: string;
  ativo: boolean;
}

export interface GraficaDependenciaRequest {
  opcaoOrigemId: number;
  parametroDestinoId: number;
  opcoesDestinoIds: number[];
}

export interface GraficaOpcoesProgressivasRequest {
  selecoes: Record<string, string>;
  proximoParametro?: string | null;
}

export interface GraficaOpcoesProgressivasResponse {
  proximoParametro?: GraficaParametro | null;
  opcoes: GraficaOpcao[];
}

export type GraficaProdutoPage = CatalogoPaginaResponse<GraficaProduto>;
