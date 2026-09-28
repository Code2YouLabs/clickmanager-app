import { SiteBannerService } from './site-banner.service';

describe('SiteBannerService', () => {
  let api: jasmine.SpyObj<any>;
  let service: SiteBannerService;

  beforeEach(() => {
    api = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'patch', 'delete']);
    service = new SiteBannerService(api);
  });

  it('lista preservando busca servidor, pagina, tamanho e ordenacao', () => {
    api.get.and.returnValue({} as any);

    service.listar({ textoPesquisa: '  promo  ', page: 2, size: 20, sort: 'ordem,asc' });

    const params = api.get.calls.mostRecent().args[1];
    expect(api.get).toHaveBeenCalledWith('api/site/banners', jasmine.anything());
    expect(params.get('textoPesquisa')).toBe('promo');
    expect(params.get('page')).toBe('2');
    expect(params.get('size')).toBe('20');
    expect(params.get('sort')).toBe('ordem,asc');
  });

  it('envia FormData com campos e arquivo apenas quando existe imagem', () => {
    const file = new File(['banner'], 'banner.webp', { type: 'image/webp' });
    api.post.and.returnValue({} as any);

    service.criar({
      titulo: 'Banner',
      ordem: 3,
      ativo: true,
      abrirEmNovaAba: false,
      posicaoTexto: 'CENTRO',
      corTexto: 'CLARO',
      overlayAtivo: true,
      overlayOpacidade: 45,
      dataInicio: '2026-09-28T00:00:00',
      dataFim: '2026-09-30T23:59:59',
      imagem: file,
    });

    const formData = api.post.calls.mostRecent().args[1] as FormData;
    expect(formData.get('titulo')).toBe('Banner');
    expect(formData.get('ordem')).toBe('3');
    expect(formData.get('ativo')).toBe('true');
    expect(formData.get('abrirEmNovaAba')).toBe('false');
    const uploaded = formData.get('file') as File;
    expect(uploaded.name).toBe('banner.webp');
    expect(uploaded.type).toBe('image/webp');
  });

  it('na atualizacao nao envia arquivo quando nenhuma nova imagem foi selecionada', () => {
    api.put.and.returnValue({} as any);

    service.atualizar(10, { titulo: 'Banner atualizado', imagem: null });

    const formData = api.put.calls.mostRecent().args[1] as FormData;
    expect(api.put.calls.mostRecent().args[0]).toBe('api/site/banners/10');
    expect(formData.get('titulo')).toBe('Banner atualizado');
    expect(formData.has('file')).toBeFalse();
  });
});
