import { PagesRoutes } from '../../pages.routes';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';

describe('Rotas definitivas do Comercial da Gráfica', () => {
  for (const tipo of ['pedidos', 'orcamentos', 'rascunhos']) {
    it(`mantém listagem, novo e detalhe de ${tipo} com guards e segmento`, () => {
      for (const suffix of ['', '/novo', '/:id']) {
        const route = PagesRoutes.find(item => item.path === `grafica/comercial/${tipo}${suffix}`);
        expect(route?.loadComponent).toBeDefined(); expect(route?.canActivate?.length).toBeGreaterThan(0);
        expect(route?.data?.['tipo']).toBe(tipo); expect(route?.data?.['featureKey']).toBe('GRAFICA');
        expect(route?.data?.['allowedEmpresaTipos']).toContain(TipoEmpresa.GRAFICA);
        expect(route?.data?.['requiredPermission']?.length).toBeGreaterThan(0);
      }
      expect(PagesRoutes.findIndex(route => route.path === `grafica/comercial/${tipo}/novo`))
        .toBeLessThan(PagesRoutes.findIndex(route => route.path === `grafica/comercial/${tipo}/:id`));
    });
  }
  it('mantém documentos e WhatsApp com rotas canônicas protegidas', () => {
    for (const path of ['pedidos/:id/impressao', 'pedidos/:id/impressao/duas-vias', 'pedidos/:id/impressao/etiqueta', 'pedidos/:id/whatsapp', 'orcamentos/:id/impressao', 'orcamentos/:id/whatsapp']) {
      const route = PagesRoutes.find(item => item.path === `grafica/comercial/${path}`);
      expect(route?.loadComponent).toBeDefined(); expect(route?.canActivate?.length).toBeGreaterThan(0);
    }
  });
  it('mantém apenas redirects de compatibilidade, sem implementação antiga', () => {
    const aliases = PagesRoutes.filter(route => route.path?.startsWith('grafica/comercial-beta/'));
    expect(aliases.length).toBe(15);
    for (const route of aliases) {
      expect(route.redirectTo).toBe(route.path!.replace('comercial-beta', 'comercial'));
      expect(route.pathMatch).toBe('full'); expect(route.loadComponent).toBeUndefined(); expect(route.component).toBeUndefined();
    }
  });
});

// Exercise Angular's redirect matching, including document suffixes and query parameters.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
@Component({ standalone: true, template: '' })
class RouteTarget {}

describe('Compatibilidade de URLs comerciais publicadas', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('preserva id, formato e filtro ao redirecionar sem carregar componentes antigos', async () => {
    const aliases = PagesRoutes.filter(route => route.path?.startsWith('grafica/comercial-beta/'));
    const targets = PagesRoutes.filter(route => route.path?.startsWith('grafica/comercial/')).map(route => ({ path: route.path, component: RouteTarget }));
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'page', children: [...aliases, ...targets] }])] });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/page/grafica/comercial-beta/pedidos/22/impressao/etiqueta');
    expect(router.url).toBe('/page/grafica/comercial/pedidos/22/impressao/etiqueta');
    await router.navigateByUrl('/page/grafica/comercial-beta/pedidos?status=PRONTO');
    expect(router.url).toBe('/page/grafica/comercial/pedidos?status=PRONTO');
    await router.navigateByUrl('/page/grafica/comercial-beta/rascunhos/novo');
    expect(router.url).toBe('/page/grafica/comercial/rascunhos/novo');
  });
});
