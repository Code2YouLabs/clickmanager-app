export type TipoItemLinks =
  | 'LINK'
  | 'WHATSAPP'
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'TIKTOK'
  | 'YOUTUBE'
  | 'LINKEDIN'
  | 'EMAIL'
  | 'TELEFONE'
  | 'LOCALIZACAO'
  | 'GOOGLE_AVALIACOES';

export type TemaPaginaLinks = 'CLARO' | 'ESCURO';
export type FormatoBotaoLinks = 'ARREDONDADO' | 'SUAVE' | 'QUADRADO';

export const LINKS_APARENCIA_PADRAO = {
  tema: 'CLARO' as TemaPaginaLinks,
  corPrincipal: '#0D6EFD',
  corFundo: '#F6F8FB',
  formatoBotao: 'ARREDONDADO' as FormatoBotaoLinks,
} as const;

export interface LinksIdentidadePublica {
  nome: string | null;
  slug: string | null;
  logoUrl: string | null;
}

export interface PaginaLinksResumo {
  id: number;
  slug: string;
  titulo: string;
  descricao: string | null;
  ativa: boolean;
  publicada: boolean;
  principal: boolean;
  tema: TemaPaginaLinks;
  corPrincipal: string;
  corFundo: string;
  formatoBotao: FormatoBotaoLinks;
  quantidadeItens: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginaLinksItem {
  id: number;
  tipo: TipoItemLinks;
  titulo: string;
  subtitulo: string | null;
  url: string;
  ordem: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginaLinksDetalhe {
  id: number;
  slug: string;
  titulo: string;
  descricao: string | null;
  ativa: boolean;
  publicada: boolean;
  principal: boolean;
  tema: TemaPaginaLinks;
  corPrincipal: string;
  corFundo: string;
  formatoBotao: FormatoBotaoLinks;
  createdAt: string;
  updatedAt: string;
  identidade: LinksIdentidadePublica | null;
  itens: PaginaLinksItem[];
}

export type PeriodoAnalyticsLinks = '7d' | '30d';

export interface LinksAnalyticsRankingItem {
  itemId: number;
  tipo: TipoItemLinks;
  titulo: string;
  cliques: number;
  percentual: number;
}

export interface LinksAnalyticsResumo {
  periodo: PeriodoAnalyticsLinks;
  visualizacoes: number;
  cliques: number;
  taxaClique: number;
  ranking: LinksAnalyticsRankingItem[];
}

export interface PaginaLinksRequest {
  titulo: string;
  descricao?: string | null;
  tema?: TemaPaginaLinks | null;
  corPrincipal?: string | null;
  corFundo?: string | null;
  formatoBotao?: FormatoBotaoLinks | null;
}

export interface LinksPreviewModel {
  titulo: string;
  descricao: string | null;
  identidade: LinksIdentidadePublica | null;
  tema: TemaPaginaLinks;
  corPrincipal: string;
  corFundo: string;
  formatoBotao: FormatoBotaoLinks;
  itens: PaginaLinksItem[];
}

export interface PaginaLinksItemRequest {
  tipo: TipoItemLinks;
  titulo: string;
  subtitulo?: string | null;
  url: string;
  ordem?: number | null;
}

export interface PaginaLinksOrdenacaoRequest {
  itens: Array<{ itemId: number; ordem: number }>;
}

export interface TipoItemLinksOpcao {
  tipo: TipoItemLinks;
  label: string;
  icon: string;
  tituloPadrao: string;
  subtitulo?: string;
}

export const LINKS_PERMISSOES = {
  ver: 'LINKS_VER',
  criar: 'LINKS_CRIAR',
  editar: 'LINKS_EDITAR',
  publicar: 'LINKS_PUBLICAR',
  excluir: 'LINKS_EXCLUIR',
  dadosEmpresa: 'DADOS_EMPRESA',
} as const;

export const TIPOS_ITEM_LINKS: TipoItemLinksOpcao[] = [
  { tipo: 'WHATSAPP', label: 'WhatsApp', icon: 'chat', tituloPadrao: 'Fale conosco' },
  { tipo: 'INSTAGRAM', label: 'Instagram', icon: 'photo_camera', tituloPadrao: 'Instagram' },
  { tipo: 'FACEBOOK', label: 'Facebook', icon: 'public', tituloPadrao: 'Facebook' },
  { tipo: 'TIKTOK', label: 'TikTok', icon: 'music_note', tituloPadrao: 'TikTok' },
  { tipo: 'YOUTUBE', label: 'YouTube', icon: 'play_circle', tituloPadrao: 'YouTube' },
  { tipo: 'LINKEDIN', label: 'LinkedIn', icon: 'business_center', tituloPadrao: 'LinkedIn' },
  { tipo: 'GOOGLE_AVALIACOES', label: 'Avaliações do Google', icon: 'star', tituloPadrao: 'Avalie-nos no Google' },
  { tipo: 'LOCALIZACAO', label: 'Localização', icon: 'location_on', tituloPadrao: 'Como chegar' },
  { tipo: 'TELEFONE', label: 'Telefone', icon: 'call', tituloPadrao: 'Ligue para nós' },
  { tipo: 'EMAIL', label: 'E-mail', icon: 'mail', tituloPadrao: 'Envie um e-mail' },
  { tipo: 'LINK', label: 'Outro link', icon: 'link', tituloPadrao: 'Meu link' },
];
