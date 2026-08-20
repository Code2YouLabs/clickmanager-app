export type SiteWhatsappExibicao =
  | 'ICONE'
  | 'ICONE_TEXTO';

export interface SiteConfigResponse {
  siteAtivo: boolean;
  slugPublico: string;
  dominioCustom?: string | null;
  dominioCustomAtivo?: boolean | null;
  dominioVerificado?: boolean | null;
  statusDominio?: string | null;
  faviconUrl?: string | null;

  orcamentoAtivo: boolean;

  whatsappAtivo: boolean;
  whatsappTelefone?: string | null;
  whatsappExibicao: SiteWhatsappExibicao;
  whatsappTexto?: string | null;
  whatsappMensagemInicial?: string | null;
}

export interface SiteConfigUpdateRequest {
  siteAtivo: boolean;
  slugPublico?: string | null;
  dominioCustom?: string | null;

  orcamentoAtivo: boolean;

  whatsappAtivo: boolean;
  whatsappTelefone?: string | null;
  whatsappExibicao: SiteWhatsappExibicao;
  whatsappTexto?: string | null;
  whatsappMensagemInicial?: string | null;
}
