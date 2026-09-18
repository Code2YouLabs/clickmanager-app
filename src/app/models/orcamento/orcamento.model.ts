export type OrcamentoPaginaResponse<T> = {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

export type OrcamentoListParams = {
  textoPesquisa?: string;
  page?: number;
  size?: number;
  sort?: string;
};

export type OrcamentoStatus =
  | 'NOVO'
  | 'EM_ATENDIMENTO'
  | 'AGUARDANDO_CLIENTE'
  | 'CONVERTIDO'
  | 'PERDIDO';

export type OrcamentoOrigem =
  | 'SITE'
  | 'BALCAO'
  | 'SMARTCALC'
  | 'API'
  | 'INTEGRACAO'
  | 'OUTRO';

export type FormatoImpressaoOrcamento = 'A4' | 'TERMICA_80MM';

export const FORMATO_IMPRESSAO_ORCAMENTO_API: Record<FormatoImpressaoOrcamento, string> = {
  A4: 'a4',
  TERMICA_80MM: 'termica-80mm',
};

export type TipoItemOrcamento = 'CATALOGO' | 'LIVRE';

export type OrcamentoListagemParams = OrcamentoListParams & {
  status?: OrcamentoStatus;
  origem?: OrcamentoOrigem;
  dataInicio?: string;
  dataFim?: string;
};

export type OrcamentoUnidadeVenda =
  | 'UNIDADE'
  | 'METRO'
  | 'METRO_QUADRADO'
  | 'METRO_CUBICO'
  | 'CAIXA'
  | 'PACOTE'
  | 'SACO'
  | 'LITRO'
  | 'MILILITRO'
  | 'QUILOGRAMA'
  | 'GRAMA'
  | 'PAR'
  | 'JOGO'
  | 'ROLO';

export type OrcamentoContatoRequest = {
  nomeContato: string;
  telefoneContato: string;
  emailContato?: string | null;
  clienteId?: number | null;
};

export type OrcamentoItemRequest = {
  tipoItem: TipoItemOrcamento;
  produtoId?: number | null;
  descricao: string;
  unidade: OrcamentoUnidadeVenda | string;
  quantidade: number;
  valorUnitario: number;
  desconto?: number | null;
  observacao?: string | null;
};

export type OrcamentoCriarRequest = OrcamentoContatoRequest & {
  observacaoGeral?: string | null;
  origem?: OrcamentoOrigem;
  itens: OrcamentoItemRequest[];
};

export type OrcamentoSnapshot = Record<string, unknown>;

export type OrcamentoItem = {
  id: number;
  tipoItem?: TipoItemOrcamento | string | null;
  produtoId?: number | null;
  produtoSlug?: string | null;
  produtoNome?: string | null;
  descricao?: string | null;
  quantidade?: number | null;
  unidade?: OrcamentoUnidadeVenda | string | null;
  unidadeVenda?: OrcamentoUnidadeVenda | null;
  valorUnitario?: number | null;
  precoUnitario?: number | null;
  precoPromocional?: number | null;
  desconto?: number | null;
  sobConsulta?: boolean | null;
  observacao?: string | null;
  subtotal?: number | null;
  subtotalEstimado?: number | null;
  ordem?: number | null;
  snapshot?: OrcamentoSnapshot | null;
  snapshotGrafica?: string | null;
};

export type Orcamento = {
  id: number;
  empresaId?: number | null;
  clienteId?: number | null;
  nomeContato?: string | null;
  telefoneContato?: string | null;
  emailContato?: string | null;
  nome?: string | null;
  telefone?: string | null;
  email?: string | null;
  quantidadeItens?: number | null;
  criadoEm?: string | null;
  nomeCliente?: string | null;
  telefoneCliente?: string | null;
  emailCliente?: string | null;
  mensagem?: string | null;
  observacaoGeral?: string | null;
  observacaoInterna?: string | null;
  origem?: OrcamentoOrigem | string | null;
  responsavelNome?: string | null;
  usuarioResponsavelNome?: string | null;
  protocolo?: string | null;
  status?: OrcamentoStatus | null;
  total?: number | null;
  totalEstimado?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  atualizadoEm?: string | null;
  itens?: OrcamentoItem[] | null;
  historico?: OrcamentoHistorico[] | null;
};

export type OrcamentoHistorico = {
  id?: number | null;
  data?: string | null;
  criadoEm?: string | null;
  createdAt?: string | null;
  statusAnterior?: OrcamentoStatus | string | null;
  statusNovo?: OrcamentoStatus | string | null;
  descricao?: string | null;
  observacao?: string | null;
  usuarioNome?: string | null;
};

export type OrcamentoResumo = {
  novos: number;
  emAtendimento: number;
  aguardandoCliente: number;
  convertidos: number;
  perdidos?: number;
};
