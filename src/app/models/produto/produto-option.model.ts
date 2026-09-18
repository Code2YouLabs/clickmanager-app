export interface ProdutoOption {
  id: number;
  familiaProdutoGraficoId?: number;
  catalogoProdutoId?: number;
  nome: string;
  codigo?: string | null;
  familiaNome?: string | null;
  formatoNome?: string | null;
  suportado?: boolean;
  habilitado?: boolean;
  motivos?: string[];
}
