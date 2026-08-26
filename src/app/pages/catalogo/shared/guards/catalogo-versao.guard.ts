import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { AuthService } from 'src/app/services/auth.service';
import { CatalogoEmpresaContextService } from '../services/catalogo-empresa-context.service';

export const catalogoNovoGuard: CanActivateFn = () => {
  const contextService = inject(CatalogoEmpresaContextService);
  const router = inject(Router);
  const auth = inject(AuthService);

  return contextService.resolveOnce().pipe(
    map((context) => {
      if (context.tipoEmpresa === TipoEmpresa.GRAFICA) {
        return true;
      }

      if (context.tipoEmpresa === TipoEmpresa.DEPOSITO && context.versaoCatalogo === 'CATALOGO_NOVO') {
        return true;
      }

      return router.createUrlTree([legacyRoute(auth)]);
    })
  );
};

export const depositoLegadoGuard: CanActivateFn = () => {
  const contextService = inject(CatalogoEmpresaContextService);
  const router = inject(Router);
  const auth = inject(AuthService);

  return contextService.resolveOnce().pipe(
    map((context) => {
      if (context.tipoEmpresa !== TipoEmpresa.DEPOSITO || context.versaoCatalogo === 'LEGADO_DEPOSITO') {
        return true;
      }

      return router.createUrlTree([catalogoRoute(auth)]);
    })
  );
};

function catalogoRoute(auth: AuthService): string {
  if (auth.temPermissao('CATALOGO_PRODUTOS_VER')) {
    return '/page/catalogo/produtos';
  }
  if (auth.temPermissao('CATALOGO_CATEGORIAS_VER')) {
    return '/page/catalogo/categorias';
  }
  if (auth.temPermissao('CATALOGO_MARCAS_VER')) {
    return '/page/catalogo/marcas';
  }
  return '/page/deposito';
}

function legacyRoute(auth: AuthService): string {
  if (auth.temPermissao('DEPOSITO_ITENS_VER')) {
    return '/page/deposito/itens';
  }
  if (auth.temPermissao('DEPOSITO_CATEGORIAS_VER')) {
    return '/page/deposito/categorias';
  }
  if (auth.temPermissao('DEPOSITO_MARCAS_VER')) {
    return '/page/deposito/marcas';
  }
  return '/page/deposito';
}
