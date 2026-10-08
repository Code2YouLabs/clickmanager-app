import { JornadaDefinicao } from './jornada.models';

export const PRIMEIRO_PEDIDO_JORNADA: JornadaDefinicao = {
  chave: 'PRIMEIRO_PEDIDO',
  versao: 1,
  etapaInicial: 'inicio',
  rotaInicial: '/page/grafica/comercial/pedidos',
};

export const PRIMEIRO_PEDIDO_PERMISSOES = [
  'PEDIDOS_VER',
  'PEDIDOS_CADASTRAR',
  'GRAFICA_PRODUTOS_VER',
] as const;
