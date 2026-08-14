import { aplicativosVisiveis, ConfiguracaoAplicativos } from './configuracao-aplicativos.model';

describe('aplicativosVisiveis', () => {
  const preferido: ConfiguracaoAplicativos = {
    aplicativos: [{ aplicativo: 'CALCULADORA_REVESTIMENTO', ativo: true }],
    atalhos: [],
  };

  it('exibe somente quando preferência, módulo e permissão permitem', () => {
    expect(aplicativosVisiveis(preferido, () => true, () => true)).toHaveSize(1);
    expect(aplicativosVisiveis(preferido, () => false, () => true)).toEqual([]);
    expect(aplicativosVisiveis(preferido, () => true, () => false)).toEqual([]);
  });

  it('não exibe quando a empresa ocultou o aplicativo', () => {
    const oculto: ConfiguracaoAplicativos = {
      aplicativos: [{ aplicativo: 'CALCULADORA_REVESTIMENTO', ativo: false }],
      atalhos: [],
    };

    expect(aplicativosVisiveis(oculto, () => true, () => true)).toEqual([]);
  });
});
