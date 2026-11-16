import { navItems } from 'src/app/layouts/full/vertical/sidebar/sidebar-data';
import { buildMobileMoreNavigation } from 'src/app/layouts/full/mobile-navigation';
import { CLICKWHATSAPP_ROUTES } from './clickwhatsapp.routes';

describe('Destinos do ClickWhatsApp', () => {
  it('publica as mesmas quatro áreas no sidebar e no menu Mais', () => {
    const destinos = CLICKWHATSAPP_ROUTES.map(({ path }) => '/page/clickwhatsapp' + (path ? '/' + path : ''));
    const desktop = navItems.find(item => item.displayName === 'ClickWhatsApp');
    const mobile = buildMobileMoreNavigation(navItems).groups
      .find(group => group.title === 'Presença Digital')?.items.find(item => item.displayName === 'ClickWhatsApp');
    expect(desktop?.children?.map(item => item.route)).toEqual(destinos);
    expect(mobile?.children?.map(item => item.route)).toEqual(destinos);
    expect(desktop?.children?.map(item => item.bgcolor)).toEqual(destinos.map(() => 'transparent'));
    expect(desktop?.children?.[0].exactRoute).toBeTrue();
    expect(CLICKWHATSAPP_ROUTES[0].pathMatch).toBe('full');
    expect(CLICKWHATSAPP_ROUTES[2].canDeactivate?.length).toBe(1);
  });
});
