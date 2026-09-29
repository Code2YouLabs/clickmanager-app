import { TipoEmpresa } from '../empresa/tipo-empresa.enum';
import {
  APLICATIVOS_CATALOGO,
  aplicativosDisponiveisParaSegmento,
  aplicativosVisiveis,
  ConfiguracaoAplicativos,
} from './configuracao-aplicativos.model';

describe('configuração de aplicativos', () => {
  const preferido: ConfiguracaoAplicativos = {
    aplicativos: [
      { aplicativo: 'SMARTCALC', ativo: true },
      { aplicativo: 'SMARTCALC_CONFIG', ativo: true },
      { aplicativo: 'CALCULADORA_REVESTIMENTO', ativo: true },
    ],
    atalhos: [],
  };

  it('mantém apenas aplicativos de uso no catálogo configurável', () => {
    expect(APLICATIVOS_CATALOGO.map((app) => app.aplicativo)).toEqual([
      'SMARTCALC',
      'CALCULADORA_REVESTIMENTO',
    ]);
  });

  it('filtra catálogo por segmento da empresa', () => {
    expect(aplicativosDisponiveisParaSegmento(TipoEmpresa.GRAFICA).map((app) => app.aplicativo)).toEqual(['SMARTCALC']);
    expect(aplicativosDisponiveisParaSegmento(TipoEmpresa.DEPOSITO).map((app) => app.aplicativo)).toEqual(['CALCULADORA_REVESTIMENTO']);
  });

  it('exibe somente quando preferência, módulo, permissão e segmento permitem', () => {
    expect(aplicativosVisiveis(preferido, () => true, () => true, TipoEmpresa.GRAFICA).map((app) => app.aplicativo)).toEqual(['SMARTCALC']);
    expect(aplicativosVisiveis(preferido, () => true, () => true, TipoEmpresa.DEPOSITO).map((app) => app.aplicativo)).toEqual(['CALCULADORA_REVESTIMENTO']);
    expect(aplicativosVisiveis(preferido, () => false, () => true, TipoEmpresa.GRAFICA)).toEqual([]);
    expect(aplicativosVisiveis(preferido, () => true, () => false, TipoEmpresa.GRAFICA)).toEqual([]);
  });

  it('não exibe quando a empresa ocultou o aplicativo', () => {
    const oculto: ConfiguracaoAplicativos = {
      aplicativos: [{ aplicativo: 'CALCULADORA_REVESTIMENTO', ativo: false }],
      atalhos: [],
    };

    expect(aplicativosVisiveis(oculto, () => true, () => true, TipoEmpresa.DEPOSITO)).toEqual([]);
  });
});
