import { of } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { CalculadoraConfigService } from './calculadora-config.service';

describe('CalculadoraConfigService', () => {
  it('grava ativação e IDs dos produtos concretos', () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['post', 'get']);
    api.post.and.returnValue(of({ id: 1, ativo: true, produtosDisponiveis: [] }));
    const service = new CalculadoraConfigService(api);
    service.salvar({ ativo: true, produtoGraficoIds: [11, 13] }).subscribe(res => expect(res.config).toEqual({ id: 1, ativo: true }));
    expect(api.post).toHaveBeenCalledWith('api/grafica/smartcalc/config', { ativo: true, produtoGraficoIds: [11, 13] });
  });

  it('carrega produtos com estados de suporte', () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['post', 'get']);
    const disponiveis = [{ id: 5, nome: 'Produto configurado', suportado: false, motivos: ['FORMATO_AUSENTE'] }];
    api.get.and.returnValue(of({ id: 1, ativo: false, produtosDisponiveis: disponiveis }));
    new CalculadoraConfigService(api).getConfigCompleta().subscribe(res => {
      expect(res.config).toEqual({ id: 1, ativo: false });
      expect(res.produtosDisponiveis).toEqual(disponiveis);
    });
  });
});
