export type JornadaStatus =
  | 'NAO_INICIADO'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDO'
  | 'IGNORADO'
  | 'ABANDONADO';

export interface JornadaProgressoResponse {
  jornada: string;
  versao: number;
  status: JornadaStatus;
  etapaAtual?: string | null;
  oferecidoEm?: string | null;
  iniciadoEm?: string | null;
  ultimaInteracaoEm?: string | null;
  concluidoEm?: string | null;
  ignoradoEm?: string | null;
  abandonadoEm?: string | null;
}

export interface JornadaOperacaoRequest {
  etapa?: string | null;
}

export interface JornadaDefinicao {
  chave: string;
  versao: number;
  etapaInicial: string;
  rotaInicial: string;
}
