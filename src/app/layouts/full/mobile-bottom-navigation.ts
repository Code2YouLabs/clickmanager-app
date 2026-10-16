import { NavItem } from './vertical/sidebar/nav-item/nav-item';

export interface MobileBottomNavItem {
  key: string;
  label: string;
  icon: string;
  route?: string;
  startsWith?: string[];
  special?: boolean;
  action?: 'drawer' | 'apps' | 'profile';
}

/** Select shortcuts from the existing authorized menu; never grants access or changes guards. */
export function buildGraficaMobileBottomNav(menu: NavItem[], isFeatureEnabled: (key: string) => boolean): MobileBottomNavItem[] {
  const find = (items: NavItem[], route: string): NavItem | undefined => {
    for (const item of items) {
      if (!item.disabled && !item.children?.length && item.route === route) return item;
      const child = item.children && !item.disabled ? find(item.children, route) : undefined;
      if (child) return child;
    }
    return undefined;
  };
  const shortcut = (key: string, route: string, label: string, icon: string, feature?: string): MobileBottomNavItem | undefined =>
    find(menu, route) && (!feature || isFeatureEnabled(feature)) ? { key, label, icon, route, startsWith: [route] } : undefined;
  const dashboard = shortcut('dashboard', '/dashboards/dashboard1', 'Dashboard', 'layout-dashboard');
  const pedidos = shortcut('pedidos', '/page/grafica/comercial/pedidos', 'Pedidos', 'file-text', 'GRAFICA');
  const smartcalc = shortcut('smartcalc', '/smartcalc', 'SmartCalc', 'calculator', 'SMARTCALC');
  const clientes = shortcut('clientes', '/page/cliente', 'Clientes', 'users');
  const catalogoNode = menu.find(item => !item.disabled && item.route === '/page/grafica/produtos' && item.children?.length);
  const catalogoRoutes = (catalogoNode?.children || [])
    .filter(item => !item.disabled && !item.children?.length && !!item.route).map(item => item.route!);
  const catalogoRoute = catalogoRoutes[0];
  const catalogo: MobileBottomNavItem | undefined = catalogoRoute && isFeatureEnabled('GRAFICA')
    ? { key: 'catalogo', label: 'Catálogo', icon: 'package', route: catalogoRoute,
        startsWith: catalogoRoutes } : undefined;
  const apps: MobileBottomNavItem = { key: 'atalhos', label: 'Atalhos', icon: 'grid-dots', action: 'apps' };
  const more: MobileBottomNavItem = { key: 'mais', label: 'Mais', icon: 'menu-2', action: 'drawer' };
  const primary = smartcalc || pedidos || catalogo || dashboard || clientes;
  if (!primary) return [apps, more];
  const first = (smartcalc ? [pedidos, catalogo, clientes] : [catalogo, clientes])
    .find(item => item && item.key !== primary.key && item.key !== dashboard?.key);
  if (first && dashboard && dashboard.key !== primary.key) {
    return [first, apps, { ...primary, special: true }, dashboard, more];
  }
  // Restricted profiles keep a real central destination; the complete menu remains in Mais.
  return [apps, { ...primary, special: true }, more];
}
