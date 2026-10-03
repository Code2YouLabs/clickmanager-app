import { TipoEmpresa } from '../empresa/tipo-empresa.enum';

export type AplicativoSistema = 'CALCULADORA_REVESTIMENTO' | 'SMARTCALC' | 'SMARTCALC_CONFIG';

export interface AplicativoEmpresa {
  aplicativo: AplicativoSistema;
  ativo: boolean;
}

export interface AtalhoEmpresa {
  id?: number;
  nome: string;
  url: string;
  novaAba: boolean;
  ativo: boolean;
  ordem: number;
}

export interface ConfiguracaoAplicativos {
  aplicativos: AplicativoEmpresa[];
  atalhos: AtalhoEmpresa[];
}

export interface AplicativoCatalogo {
  aplicativo: AplicativoSistema;
  nome: string;
  descricao: string;
  icone: string;
  imagem: string;
  rota: string;
  modulo: string;
  permissao: string;
  allowedEmpresaTipos: readonly TipoEmpresa[];
}

export const APLICATIVOS_CATALOGO: readonly AplicativoCatalogo[] = [
  {
    aplicativo: 'SMARTCALC',
    nome: 'SmartCalc',
    descricao: 'Calculadora inteligente para gráfica.',
    icone: 'calculator',
    imagem: 'assets/images/svgs/icon-connect.svg',
    rota: '/smartcalc',
    modulo: 'SMARTCALC',
    permissao: 'SMARTCALC_USAR',
    allowedEmpresaTipos: [TipoEmpresa.GRAFICA],
  },
  {
    aplicativo: 'CALCULADORA_REVESTIMENTO',
    nome: 'Calculadora de revestimento',
    descricao: 'Caixas, ambientes e percentual de perda.',
    icone: 'calculator',
    imagem: 'assets/images/svgs/icon-connect.svg',
    rota: '/apps/calculadoras/pisos',
    modulo: 'CALCULADORA_MATERIAIS',
    permissao: 'CALCULADORA_MATERIAIS_USAR',
    allowedEmpresaTipos: [TipoEmpresa.DEPOSITO],
  },
] as const;

export function aplicativosDisponiveisParaSegmento(tipoEmpresa: TipoEmpresa): AplicativoCatalogo[] {
  return APLICATIVOS_CATALOGO.filter((app) => app.allowedEmpresaTipos.includes(tipoEmpresa));
}

export function aplicativosVisiveis(
  configuracao: ConfiguracaoAplicativos | null,
  moduloHabilitado: (modulo: string) => boolean,
  possuiPermissao: (permissao: string) => boolean,
  tipoEmpresa: TipoEmpresa,
): AplicativoCatalogo[] {
  const preferidos = new Set(
    (configuracao?.aplicativos || [])
      .filter((app) => app.ativo)
      .map((app) => app.aplicativo)
  );

  return aplicativosDisponiveisParaSegmento(tipoEmpresa).filter((app) =>
    preferidos.has(app.aplicativo)
    && moduloHabilitado(app.modulo)
    && possuiPermissao(app.permissao)
  );
}
