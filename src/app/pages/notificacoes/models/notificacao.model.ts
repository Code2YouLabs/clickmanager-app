export type NotificacaoNivel = 'INFO' | 'SUCESSO' | 'ATENCAO' | 'CRITICO';
export type NotificacaoTipoDestino = 'USUARIOS_ESPECIFICOS' | 'EMPRESA_INTEIRA' | 'TODAS_EMPRESAS';

export interface NotificacaoItem {
  id: number;
  titulo: string;
  resumo?: string | null;
  conteudo?: string | null;
  link?: string | null;
  nivel: NotificacaoNivel;
  tipoDestino: NotificacaoTipoDestino;
  criadaEm: string;
  criadaPorUsuarioId?: number | null;
  invalidadaEm?: string | null;
  lida: boolean;
  lidaEm?: string | null;
}

export interface NotificacaoResumoResponse {
  naoLidas: number;
  itens: NotificacaoItem[];
}

export interface NotificacaoPaginadaResponse {
  pagina: number;
  tamanho: number;
  totalItens: number;
  totalPaginas: number;
  naoLidas: number;
  itens: NotificacaoItem[];
}

export interface NotificacaoCriarRequest {
  titulo: string;
  resumo?: string | null;
  conteudo: string;
  link?: string | null;
  nivel: NotificacaoNivel;
  tipoDestino: NotificacaoTipoDestino;
  expiraEm?: string | null;
  usuarioIds?: number[] | null;
}

export interface NotificacaoEnvioResponse {
  notificacoesCriadas: number;
  destinatariosCriados: number;
}
