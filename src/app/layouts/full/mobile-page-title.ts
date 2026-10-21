import { ActivatedRouteSnapshot, PRIMARY_OUTLET } from '@angular/router';
import { NavItem } from './vertical/sidebar/nav-item/nav-item';

/** Resolves only shell presentation; never changes document/breadcrumb titles or access rules. */
export function resolveMobilePageTitle(root: ActivatedRouteSnapshot, url: string, menu: NavItem[]): string {
  const path = normalizePath(url);
  const routes: ActivatedRouteSnapshot[] = [];
  let route: ActivatedRouteSnapshot | undefined = root;
  while (route) {
    routes.push(route);
    route = route.children.find(child => child.outlet === PRIMARY_OUTLET);
  }
  // Reading the activated data also supports resolved titles and lazy/parameterized routes.
  const metadata = routes.reverse().map(item => item.data)
    .find(data => text(data['mobileTitle']) || text(data['title']));
  const mobileTitle = text(metadata?.['mobileTitle']);
  if (mobileTitle) return mobileTitle;

  const matches: { label: string; path: string; depth: number }[] = [];
  const visit = (items: NavItem[], depth = 0): void => {
    for (const item of items) {
      if (item.route && item.displayName && !item.external) {
        const menuPath = normalizePath(item.route);
        if (path === menuPath || (menuPath !== '/' && path.startsWith(menuPath + '/'))) {
          matches.push({ label: item.displayName, path: menuPath, depth });
        }
      }
      if (item.children) visit(item.children, depth + 1);
    }
  };
  visit(menu);
  matches.sort((a, b) => b.path.length - a.path.length || b.depth - a.depth);
  const exact = matches.find(item => item.path === path);
  return exact?.label || text(metadata?.['title']) || matches[0]?.label || 'ClickManager';
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizePath(url: string): string {
  return url.split(/[?#]/)[0].split('/').map(segment => segment.split(';')[0]).join('/').replace(/\/$/, '') || '/';
}
