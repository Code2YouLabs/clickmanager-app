import { CatalogoPaginaResponse, CatalogoProdutoImagem, CatalogoProdutoImagemRequest } from '../../catalogo/shared/models/catalogo.models';

export type GraficaTipoParametro = 'SELECAO' | 'NUMERO_INTEIRO' | 'NUMERO_DECIMAL' | 'TEXTO';
export type GraficaTipoPrecificacao = 'FIXO' | 'POR_FAIXA_QUANTIDADE' | 'POR_LOTE' | 'POR_METRO_QUADRADO';
export type GraficaPrecificacaoStatus = 'CONFIGURACAO_INCOMPLETA' | 'CONFIGURACAO_INVALIDA' | 'SEM_PRECO_CONFIGURADO' | 'PRECO_CALCULADO';

export interface GraficaProduto {
  id: number;
  catalogoProdutoId: number;
  catalogoProdutoCodigo?: string | null;
  catalogoProdutoNome?: string | null;
  catalogoProdutoDescricao?: string | null;
  catalogoCategoriaId?: number | null;
  catalogoCategoriaNome?: string | null;
  catalogoProdutoExibirNoSite?: boolean | null;
  imagens?: CatalogoProdutoImagem[] | null;
  catalogoProdutoAtivo?: boolean | null;
  ativo: boolean;
  material?: GraficaCadastro | null;
  formato?: GraficaFormato | null;
  cor?: GraficaCadastro | null;
  acabamentos: GraficaCadastro[];
  servicos: GraficaCadastro[];
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
  catalogoProdutoId?: number | null;
  ativo?: boolean;
  produto?: GraficaCatalogoProdutoMinimoRequest | null;
  materialId?: number | null;
  formatoId?: number | null;
  corId?: number | null;
  acabamentoIds?: number[];
  servicoIds?: number[];
}

export interface GraficaProdutoListParams {
  page?: number;
  size?: number;
  search?: string | null;
  ativo?: boolean | null;
  materialId?: number | null;
  formatoId?: number | null;
  corId?: number | null;
  acabamentoIds?: number[];
  servicoIds?: number[];
  sort?: string | null;
}

export interface GraficaCatalogoProdutoMinimoRequest {
  codigo?: string | null;
  nome: string;
  categoriaId?: number | null;
  unidadeVenda?: string | null;
  descricao?: string | null;
  exibirNoSite?: boolean | null;
  imagens?: CatalogoProdutoImagemRequest[];
}

export interface GraficaCatalogoProdutoMinimoResponse {
  produtoId: number;
  codigo: string;
  nome: string;
  slug: string;
  categoriaId?: number | null;
  categoriaNome?: string | null;
  unidadeVenda?: string | null;
  ativo: boolean;
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

export interface GraficaPrecoSelecao {
  parametroId: number;
  parametroCodigo: string;
  parametroNome: string;
  opcaoId: number;
  opcaoCodigo: string;
  opcaoNome: string;
}

export interface GraficaPrecoFaixa {
  id?: number | null;
  inicio: number;
  fim?: number | null;
  valorUnitario: number;
}

export interface GraficaPrecoLote {
  id?: number | null;
  quantidade: number;
  valorLote: number;
}

export interface GraficaPrecoPolitica {
  id?: number | null;
  nome: string;
  tipo: GraficaTipoPrecificacao;
  ativo: boolean;
  multiplicaQuantidade?: boolean | null;
  valorFixo?: number | null;
  precoMetroQuadrado?: number | null;
  minimoMetroQuadrado?: number | null;
  especificidade?: number | null;
  selecoes: GraficaPrecoSelecao[];
  faixas: GraficaPrecoFaixa[];
  lotes: GraficaPrecoLote[];
}

export interface GraficaPrecoPoliticaRequest {
  id?: number | null;
  nome: string;
  tipo: GraficaTipoPrecificacao;
  ativo?: boolean | null;
  multiplicaQuantidade?: boolean | null;
  valorFixo?: number | null;
  precoMetroQuadrado?: number | null;
  minimoMetroQuadrado?: number | null;
  selecaoOpcaoIds?: number[];
  faixas?: GraficaPrecoFaixa[];
  lotes?: GraficaPrecoLote[];
}

export interface GraficaPrecificacaoRequest {
  selecoes?: Record<string, string>;
  opcaoIds?: number[];
  quantidade?: number | null;
  largura?: number | null;
  altura?: number | null;
  unidadeDimensao?: 'METRO' | 'CENTIMETRO' | 'MILIMETRO';
}

export interface GraficaCadastro {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
}

export interface GraficaCadastroRequest {
  codigo: string;
  nome: string;
  descricao?: string | null;
  ativo?: boolean | null;
}

export interface GraficaFormato {
  id: number;
  codigo: string;
  nome: string;
  largura?: number | null;
  altura?: number | null;
  unidadeDimensao?: 'METRO' | 'CENTIMETRO' | 'MILIMETRO' | null;
  ativo: boolean;
}

export interface GraficaFormatoRequest {
  codigo: string;
  nome: string;
  largura?: number | null;
  altura?: number | null;
  unidadeDimensao?: 'METRO' | 'CENTIMETRO' | 'MILIMETRO' | null;
  ativo?: boolean | null;
}


export interface GraficaPrecificacaoResultado {
  status: GraficaPrecificacaoStatus;
  mensagem: string;
  produtoGraficoId: number;
  catalogoProdutoId: number;
  selecoesResolvidas: GraficaPrecoSelecao[];
  tipoPrecificacao?: GraficaTipoPrecificacao | null;
  quantidadeSolicitada?: number | null;
  valorUnitario?: number | null;
  valorTotal?: number | null;
  largura?: number | null;
  altura?: number | null;
  unidadeDimensao?: string | null;
  areaReal?: number | null;
  areaFaturada?: number | null;
  regraAplicadaId?: number | null;
  regraAplicadaNome?: string | null;
  detalhes: string[];
}

export interface GraficaOrcamentoItemRequest {
  precificacao: GraficaPrecificacaoRequest;
  desconto?: number | null;
  observacao?: string | null;
  idempotencyKey?: string | null;
}

export interface GraficaOrcamentoItemResponse {
  orcamentoId: number;
  produtoGraficoId: number;
  catalogoProdutoId: number;
  valorGrafico: number;
  desconto: number;
  subtotal: number;
  snapshotGrafica: string;
}

export type GraficaProdutoPage = CatalogoPaginaResponse<GraficaProduto>;
