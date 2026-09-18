import { StorageMediaLike } from 'src/app/pages/storage/models/storage.models';

export interface CatalogoPaginaResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface CatalogoListParams {
  page?: number;
  size?: number;
  sort?: string;
  texto?: string;
  ativo?: boolean | null;
  destaque?: boolean | null;
  categoriaPaiId?: number | null;
  categoriaId?: number | null;
  marcaId?: number | null;
  tipo?: CatalogoTipoCaracteristica | null;
  filtravel?: boolean | null;
  exibirNoSite?: boolean | null;
}

export type CatalogoUnidadeVenda =
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

export type CatalogoTipoCaracteristica =
  | 'TEXTO'
  | 'TEXTO_LONGO'
  | 'INTEIRO'
  | 'DECIMAL'
  | 'BOOLEANO'
  | 'DATA'
  | 'SELECAO_UNICA'
  | 'SELECAO_MULTIPLA';

export type CatalogoUnidadeCaracteristica =
  | 'SEM_UNIDADE'
  | 'MILIMETRO'
  | 'CENTIMETRO'
  | 'METRO'
  | 'MILIMETRO_QUADRADO'
  | 'CENTIMETRO_QUADRADO'
  | 'METRO_QUADRADO'
  | 'MILILITRO'
  | 'LITRO'
  | 'GRAMA'
  | 'QUILOGRAMA'
  | 'UNIDADE'
  | 'PECA'
  | 'CAIXA'
  | 'PORCENTAGEM'
  | 'MINUTO'
  | 'HORA'
  | 'DIA';

export interface CatalogoCategoria {
  id: number;
  codigo: string;
  nome: string;
  slug: string;
  descricaoCurta?: string | null;
  descricaoCompleta?: string | null;
  categoriaPaiId?: number | null;
  categoriaPaiNome?: string | null;
  ordemExibicao?: number | null;
  destaque?: boolean | null;
  ativo?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type CatalogoCategoriaRequest = Omit<CatalogoCategoria, 'id' | 'categoriaPaiNome' | 'createdAt' | 'updatedAt'>;

export interface CatalogoCategoriaOption {
  id: number;
  codigo: string;
  nome: string;
  slug: string;
  ativo?: boolean | null;
}

export interface CatalogoMarca {
  id: number;
  codigo: string;
  nome: string;
  slug: string;
  descricao?: string | null;
  imagem?: StorageMediaLike | null;
  ordemExibicao?: number | null;
  destaque?: boolean | null;
  ativo?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CatalogoMarcaRequest {
  codigo: string;
  nome: string;
  slug: string;
  descricao?: string | null;
  imagemArquivoId?: number | null;
  ordemExibicao?: number | null;
  destaque?: boolean | null;
  ativo?: boolean | null;
}

export interface CatalogoMarcaOption {
  id: number;
  codigo: string;
  nome: string;
  slug: string;
  ativo?: boolean | null;
}

export interface CatalogoProdutoComercial {
  precoVenda?: number | null;
  precoPromocional?: number | null;
  exibirPreco?: boolean | null;
  sobConsulta?: boolean | null;
  permiteOrcamento?: boolean | null;
}

export interface CatalogoProdutoImagem {
  id?: number | null;
  arquivoId: number;
  arquivo?: StorageMediaLike | null;
  principal?: boolean | null;
  ordem?: number | null;
  ativo?: boolean | null;
}

export interface CatalogoProdutoListItem {
  id: number;
  codigo: string;
  nome: string;
  slug: string;
  descricaoCurta?: string | null;
  categoriaId?: number | null;
  categoriaNome?: string | null;
  marcaId?: number | null;
  marcaNome?: string | null;
  unidadeVenda?: CatalogoUnidadeVenda | null;
  precoVenda?: number | null;
  precoPromocional?: number | null;
  exibirPreco?: boolean | null;
  sobConsulta?: boolean | null;
  ordemExibicao?: number | null;
  destaque?: boolean | null;
  ativo?: boolean | null;
}

export interface CatalogoProduto {
  id: number;
  codigo: string;
  nome: string;
  slug: string;
  descricaoCurta?: string | null;
  descricaoCompleta?: string | null;
  categoria?: CatalogoCategoriaOption | null;
  marca?: CatalogoMarcaOption | null;
  unidadeVenda?: CatalogoUnidadeVenda | null;
  ordemExibicao?: number | null;
  destaque?: boolean | null;
  ativo?: boolean | null;
  exibirNoSite?: boolean | null;
  comercial?: CatalogoProdutoComercial | null;
  imagens?: CatalogoProdutoImagem[] | null;
  caracteristicas?: CatalogoProdutoCaracteristica[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CatalogoProdutoRequest {
  codigo: string;
  nome: string;
  slug: string;
  descricaoCurta?: string | null;
  descricaoCompleta?: string | null;
  categoriaId?: number | null;
  marcaId?: number | null;
  unidadeVenda?: CatalogoUnidadeVenda | null;
  ordemExibicao?: number | null;
  destaque?: boolean | null;
  ativo?: boolean | null;
  exibirNoSite?: boolean | null;
  comercial?: CatalogoProdutoComercial | null;
  imagens?: CatalogoProdutoImagemRequest[];
  caracteristicas?: CatalogoProdutoCaracteristicaRequest[];
}

export interface CatalogoProdutoImagemRequest {
  arquivoId: number;
  principal?: boolean | null;
  ordem?: number | null;
  ativo?: boolean | null;
}

export interface CatalogoProdutoOption {
  id: number;
  codigo: string;
  nome: string;
  slug: string;
  ativo?: boolean | null;
}

export interface CatalogoCaracteristicaOpcao {
  id?: number | null;
  codigo: string;
  nome: string;
  ordemExibicao?: number | null;
  ativo?: boolean | null;
}

export interface CatalogoCaracteristica {
  id: number;
  categoriaId: number;
  categoriaNome?: string | null;
  codigo: string;
  nome: string;
  descricao?: string | null;
  tipo: CatalogoTipoCaracteristica;
  unidade?: CatalogoUnidadeCaracteristica | null;
  obrigatoria?: boolean | null;
  filtravel?: boolean | null;
  exibirNaListagem?: boolean | null;
  exibirNoSite?: boolean | null;
  ordemExibicao?: number | null;
  valorMinimo?: number | null;
  valorMaximo?: number | null;
  casasDecimais?: number | null;
  herdada?: boolean | null;
  categoriaOrigemId?: number | null;
  categoriaOrigemNome?: string | null;
  ativo?: boolean | null;
  opcoes?: CatalogoCaracteristicaOpcao[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CatalogoCaracteristicaRequest {
  codigo: string;
  nome: string;
  descricao?: string | null;
  tipo: CatalogoTipoCaracteristica;
  unidade?: CatalogoUnidadeCaracteristica | null;
  obrigatoria?: boolean | null;
  filtravel?: boolean | null;
  exibirNaListagem?: boolean | null;
  exibirNoSite?: boolean | null;
  ordemExibicao?: number | null;
  valorMinimo?: number | null;
  valorMaximo?: number | null;
  casasDecimais?: number | null;
  ativo?: boolean | null;
  opcoes?: CatalogoCaracteristicaOpcao[];
}

export interface CatalogoCategoriaEstruturaProduto {
  categoriaId: number;
  categoriaNome: string;
  caracteristicas: CatalogoCaracteristica[];
}

export interface CatalogoProdutoCaracteristica {
  id?: number | null;
  caracteristicaId: number;
  codigo: string;
  nome: string;
  tipo: CatalogoTipoCaracteristica;
  unidade?: CatalogoUnidadeCaracteristica | null;
  obrigatoria?: boolean | null;
  exibirNaListagem?: boolean | null;
  exibirNoSite?: boolean | null;
  ativo?: boolean | null;
  valorTexto?: string | null;
  valorInteiro?: number | null;
  valorDecimal?: number | null;
  valorBooleano?: boolean | null;
  valorData?: string | null;
  opcoes?: CatalogoCaracteristicaOpcao[] | null;
  valorFormatado?: string | null;
}

export interface CatalogoProdutoCaracteristicaRequest {
  caracteristicaId: number;
  valorTexto?: string | null;
  valorInteiro?: number | null;
  valorDecimal?: number | null;
  valorBooleano?: boolean | null;
  valorData?: string | null;
  opcaoIds?: number[] | null;
}
