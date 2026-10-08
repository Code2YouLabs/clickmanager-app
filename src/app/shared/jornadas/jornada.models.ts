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
  contexto?: JornadaContexto | null;
  oferecidoEm?: string | null;
  iniciadoEm?: string | null;
  ultimaInteracaoEm?: string | null;
  concluidoEm?: string | null;
  ignoradoEm?: string | null;
  abandonadoEm?: string | null;
}

export interface JornadaContexto {
  pedidoId?: number | null;
}

export interface JornadaOperacaoRequest {
  etapa?: string | null;
  contexto?: JornadaContexto | null;
}

export interface JornadaDefinicao {
  chave: string;
  versao: number;
  etapaInicial: string;
  rotaInicial: string;
}
