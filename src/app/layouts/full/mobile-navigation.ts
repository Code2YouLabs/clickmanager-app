import { NavItem } from './vertical/sidebar/nav-item/nav-item';

export interface MobileNavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

/** Presentation only: retain the desktop captions, order and original filtered item trees. */
export function buildMobileNavGroups(items: NavItem[]): MobileNavGroup[] {
  const groups: MobileNavGroup[] = [];
  let group: MobileNavGroup | undefined;
  for (const item of items) {
    if (item.navCap) {
      group = { id: mobileNavItemId(item), title: item.navCap, items: [] };
      groups.push(group);
    } else {
      // Support captionless navigation without inventing a visible group name.
      if (!group) {
        group = { id: 'mobile-nav-root', title: '', items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }
  }
  return groups.filter(group => group.items.length > 0);
}

export function mobileNavItemKey(item: NavItem): string {
  return item.navCap || item.route || item.displayName || item.iconName || '';
}

/** Ancestry disambiguates a parent and child that share a destination (e.g. Catálogo/Produtos). */
export function mobileNavItemId(item: NavItem, parentId = 'mobile-nav'): string {
  return parentId + '--' + encodeURIComponent(mobileNavItemKey(item));
}

/** Mais is the existing global drawer: expose Help once as a supporting action, outside its main list. */
export function buildMobileMoreNavigation(items: NavItem[]): { groups: MobileNavGroup[]; help?: NavItem } {
  const help = items.find(item => item.route === '/page/ajuda');
  return { groups: buildMobileNavGroups(items.filter(item => item !== help)), help };
}
