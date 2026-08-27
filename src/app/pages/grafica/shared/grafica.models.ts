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
  materialIds?: number[];
  formatoId?: number | null;
  formatoIds?: number[];
  corId?: number | null;
  corIds?: number[];
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
  codigo?: string | null;
  nome: string;
  descricao?: string | null;
  ativo?: boolean | null;
}

export interface GraficaAcabamento extends GraficaCadastro {
  materialId?: number | null;
  materialNome?: string | null;
  formatoId?: number | null;
  formatoNome?: string | null;
  aplicacao?: 'PECA' | 'FOLHA' | 'METRO_QUADRADO' | 'METRO_LINEAR' | 'SERVICO' | null;
  precoConfiguracao?: Record<string, any> | null;
}

export interface GraficaAcabamentoRequest extends GraficaCadastroRequest {
  materialId?: number | null;
  formatoId?: number | null;
  aplicacao?: 'PECA' | 'FOLHA' | 'METRO_QUADRADO' | 'METRO_LINEAR' | 'SERVICO' | null;
  precoConfiguracao?: Record<string, any> | null;
}

export interface GraficaServico extends GraficaCadastro {
  precoConfiguracao?: Record<string, any> | null;
}

export interface GraficaServicoRequest extends GraficaCadastroRequest {
  precoConfiguracao?: Record<string, any> | null;
}

export interface GraficaFormato {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  largura?: number | null;
  altura?: number | null;
  larguraUtil?: number | null;
  alturaUtil?: number | null;
  unidadeDimensao?: 'METRO' | 'CENTIMETRO' | 'MILIMETRO' | null;
  ativo: boolean;
}

export interface GraficaFormatoRequest {
  codigo?: string | null;
  nome: string;
  descricao?: string | null;
  largura?: number | null;
  altura?: number | null;
  larguraUtil?: number | null;
  alturaUtil?: number | null;
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

export interface GraficaPagina<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface ItemComercialResolvido {
  origem: 'CATALOGO' | 'GRAFICA' | 'SMARTCALC';
  catalogoProdutoId: number;
  codigoProduto?: string | null;
  nomeProduto?: string | null;
  unidadeVenda?: string | null;
  caracteristicasResumo?: string | null;
  quantidade: number;
  valorUnitario: number;
  desconto?: number | null;
  acrescimo?: number | null;
  valorTotal: number;
  observacao?: string | null;
  snapshotComercial?: string | null;
  ordem?: number | null;
}

export interface ComposicaoComercialResolvida {
  empresaId?: number | null;
  clienteId?: number | null;
  clienteNome?: string | null;
  clienteDocumento?: string | null;
  clienteTelefone?: string | null;
  clienteEmail?: string | null;
  origem?: string | null;
  referenciaOrigem?: string | null;
  observacaoInterna?: string | null;
  observacaoCliente?: string | null;
  desconto?: number | null;
  acrescimo?: number | null;
  frete?: number | null;
  itens: ItemComercialResolvido[];
}

export interface GraficaComercialComposicaoRequest {
  empresaId?: number | null;
  clienteId?: number | null;
  clienteNome?: string | null;
  clienteDocumento?: string | null;
  clienteTelefone?: string | null;
  clienteEmail?: string | null;
  precificacao: GraficaPrecificacaoRequest;
  desconto?: number | null;
  acrescimo?: number | null;
  frete?: number | null;
  observacaoInterna?: string | null;
  observacaoCliente?: string | null;
  observacaoItem?: string | null;
  adicionais?: Array<{
    linhaComercial?: boolean | null;
    catalogoProdutoId?: number | null;
    codigoProduto?: string | null;
    nomeProduto?: string | null;
    descricaoProduto?: string | null;
    unidadeVenda?: string | null;
    quantidade?: number | null;
    valorUnitario?: number | null;
    desconto?: number | null;
    acrescimo?: number | null;
    valorTotal?: number | null;
    observacao?: string | null;
    snapshot?: Record<string, any> | null;
  }>;
}

export interface GraficaComercialDestinoResponse {
  tipo: 'RASCUNHO' | 'ORCAMENTO' | 'PEDIDO';
  id: number;
  referencia?: string | null;
  status?: string | null;
  total?: number | null;
}

export interface ComercialItemResponse {
  id: number;
  origem: string;
  catalogoProdutoId: number;
  codigoProduto?: string | null;
  nomeProduto: string;
  unidadeVenda?: string | null;
  quantidade: number;
  valorUnitario: number;
  desconto?: number | null;
  acrescimo?: number | null;
  valorTotal: number;
  ordem?: number | null;
}

export interface RascunhoComercialResponse {
  id: number;
  empresaId: number;
  clienteId?: number | null;
  clienteNome?: string | null;
  status: string;
  subtotal: number;
  desconto: number;
  acrescimo: number;
  frete: number;
  total: number;
  convertidoParaTipo?: string | null;
  convertidoParaId?: number | null;
  convertidoEm?: string | null;
  itens: ComercialItemResponse[];
}

export interface PedidoComercialResumo {
  pedidoId?: number;
  id?: number;
  numero: string;
  status: string;
  clienteNome?: string | null;
  total: number;
  createdAt?: string | null;
}

export interface PedidoComercialDetalhe extends PedidoComercialResumo {
  empresaId?: number | null;
  itens: ComercialItemResponse[];
}

export interface OrcamentoComercialResumo {
  id: number;
  protocolo: string;
  nomeCliente?: string | null;
  status: string;
  totalEstimado?: number | null;
  createdAt?: string | null;
}
