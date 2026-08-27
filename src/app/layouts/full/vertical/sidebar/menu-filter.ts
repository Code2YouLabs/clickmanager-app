import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { Usuario } from 'src/app/models/usuario/usuario.model';
import { CatalogoVersaoAdministrativa } from 'src/app/pages/catalogo/shared/services/catalogo-empresa-context.service';
import { NavItem } from './nav-item/nav-item';

export interface MenuFilterOptions {
  permissoesUsuario: string[];
  tipoEmpresa: TipoEmpresa;
  versaoCatalogo: CatalogoVersaoAdministrativa;
  usuario: Usuario;
  isFeatureEnabled: (featureKey: string) => boolean;
}

export function filtrarMenuPrincipal(items: NavItem[], options: MenuFilterOptions): NavItem[] {
  const possuiPermissao = (requeridas?: string[]) => {
    return options.usuario.proprietario === true
      || !requeridas
      || requeridas.some((permissao) => options.permissoesUsuario.includes(permissao));
  };

  const aceitaTipoEmpresa = (tiposPermitidos?: TipoEmpresa[]) =>
    !tiposPermitidos || tiposPermitidos.includes(options.tipoEmpresa);

  const aceitaVersaoCatalogo = (modo?: CatalogoVersaoAdministrativa) =>
    !modo || options.tipoEmpresa !== TipoEmpresa.DEPOSITO || modo === options.versaoCatalogo;

  const aceitaProprietario = (proprietarioOnly?: boolean) =>
    !proprietarioOnly || options.usuario.proprietario === true;

  const aceitaFeature = (featureKey?: string) =>
    !featureKey || options.isFeatureEnabled(featureKey);

  const filtrar = (menus: NavItem[]): NavItem[] =>
    menus
      .filter((menu) =>
        aceitaTipoEmpresa(menu.allowedEmpresaTipos)
        && aceitaVersaoCatalogo(menu.catalogoModo)
        && aceitaProprietario(menu.proprietarioOnly)
        && aceitaFeature(menu.featureKey)
        && possuiPermissao(menu.requiredPermission)
      )
      .map((menu) => ({
        ...menu,
        children: menu.children ? filtrar(menu.children) : undefined
      }))
      .filter((menu) => menu.children ? menu.children.length > 0 : !!menu.route || !!menu.navCap);

  return removerSecoesVazias(filtrar(items));
}

export function removerSecoesVazias(items: NavItem[]): NavItem[] {
  return items.filter((item, index) => {
    if (!item.navCap) {
      return true;
    }

    const nextSectionIndex = items
      .slice(index + 1)
      .findIndex((next) => !!next.navCap);
    const sectionItems = nextSectionIndex === -1
      ? items.slice(index + 1)
      : items.slice(index + 1, index + 1 + nextSectionIndex);

    return sectionItems.some((next) => !next.navCap);
  });
}
