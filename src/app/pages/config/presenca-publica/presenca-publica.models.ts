export interface PresencaPublicaResponse {
  slugPublico: string | null;
  dominioProprio?: string | null;
  dominioProprioAtivo?: boolean | null;
}

export interface PresencaPublicaDominioProprioRequest {
  dominio: string | null;
  ativo: boolean;
}
