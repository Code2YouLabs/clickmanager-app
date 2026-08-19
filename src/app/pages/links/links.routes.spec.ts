import { LINKS_ROUTES } from './links.routes';

describe('LINKS_ROUTES', () => {
  it('protege listagem por modulo LINKS e permissao LINKS_VER', () => {
    const rota = LINKS_ROUTES.find((item) => item.path === '');
    expect(rota?.data?.['featureKey']).toBe('LINKS');
    expect(rota?.data?.['requiredPermission']).toEqual(['LINKS_VER']);
  });

  it('protege criacao e editor com permissoes especificas', () => {
    const nova = LINKS_ROUTES.find((item) => item.path === 'nova');
    const editor = LINKS_ROUTES.find((item) => item.path === ':id');
    expect(nova?.data?.['requiredPermission']).toEqual(['LINKS_CRIAR']);
    expect(editor?.data?.['requiredPermission']).toEqual(['LINKS_VER', 'LINKS_EDITAR']);
  });
});
