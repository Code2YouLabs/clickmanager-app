import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { Usuario } from '../models/usuario/usuario.model';
import { ToastrService } from 'ngx-toastr';
import { decodeToken } from '../utils/token.util';
import { JwtPayload } from '../pages/authentication/jwt-payload.interface';
import { NgxPermissionsService } from 'ngx-permissions';
import { UsuarioService } from './usuario.service';
import { AuthTokenStorageService } from './auth-token-storage.service';
import { AuthApiService } from './auth-api.service';
import { AuthTokens } from '../models/auth-tokens.interface';
import { resolveTipoEmpresa, TipoEmpresa } from '../models/empresa/tipo-empresa.enum';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private jwtPayload: JwtPayload | null = null;
  private usuarioSubject = new BehaviorSubject<Usuario | null>(null);
  usuario$ = this.usuarioSubject.asObservable();

  constructor(
    private permissionsService: NgxPermissionsService,
    private usuarioService: UsuarioService,
    private authApi: AuthApiService,
    private tokenStorage: AuthTokenStorageService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.initJwt();
  }

  login(username: string, password: string, lembrar = false): Observable<Usuario> {
    lembrar ? this.tokenStorage.usarLocalStorage() : this.tokenStorage.usarSessionStorage();
  
    return this.authApi.login(username, password).pipe(
      tap(tokens => this.persistirTokens(tokens)),
      switchMap(() => this.carregarUsuarioCompleto())
    );
  }

  loginGoogle(payload: { credential?: string; accessToken?: string }, lembrar = false): Observable<Usuario> {
    lembrar ? this.tokenStorage.usarLocalStorage() : this.tokenStorage.usarSessionStorage();

    return this.authApi.loginGoogle(payload).pipe(
      tap(tokens => this.persistirTokens(tokens)),
      switchMap(() => this.carregarUsuarioCompleto())
    );
  }

  autenticarComTokens(tokens: AuthTokens, lembrar = false): Observable<Usuario> {
    lembrar ? this.tokenStorage.usarLocalStorage() : this.tokenStorage.usarSessionStorage();

    return new Observable<Usuario>(observer => {
      try {
        this.persistirTokens(tokens);
      } catch (error) {
        observer.error(error);
        return;
      }

      this.carregarUsuarioCompleto().subscribe({
        next: usuario => {
          observer.next(usuario);
          observer.complete();
        },
        error: err => observer.error(err),
      });
    });
  }

  private initJwt(): void {
    const token = this.tokenStorage.getToken();
    if (!token) return;

    this.jwtPayload = decodeToken(token);
  }

  public carregarUsuarioCompleto(): Observable<Usuario> {
    return this.usuarioService.buscarAtual().pipe(
      tap(usuario => {
        if (usuario?.proprietario && usuario.empresa) {
          usuario.onboardingIgnorado = usuario.onboardingIgnorado ?? usuario.empresa.onboardingIgnorado;
        }
        this.carregarPermissoes(usuario);
        this.usuarioSubject.next(usuario);
      }),
      catchError(err => {
        this.toastr.error('Erro ao carregar dados do usuário');
        return throwError(() => err);
      })
    );
  }

  private carregarPermissoes(usuario: Usuario): void {
    const perfil = usuario.perfil;
    if (!perfil || !Array.isArray(perfil.permissoes)) {
      this.permissionsService.flushPermissions();
      return;
    }

    const permissoesChave = perfil.permissoes
      .map(p => p?.chave)
      .filter((chave): chave is string => typeof chave === 'string');

    this.permissionsService.loadPermissions(permissoesChave);
  }

  logout(): void {
    const hadSession = Boolean(
      this.tokenStorage.getAccessToken() ||
      this.tokenStorage.getRefreshToken() ||
      this.usuarioSubject.value
    );

    this.tokenStorage.limparTokens();
    this.jwtPayload = null;
    this.usuarioSubject.next(null);
    this.permissionsService.flushPermissions();
    if (hadSession) {
      this.toastr.info('Você saiu do sistema.');
    }
    setTimeout(() => this.router.navigateByUrl('/authentication/login'), 200);
  }

  clearSession(): void {
    this.tokenStorage.limparTokens();
    this.jwtPayload = null;
    this.usuarioSubject.next(null);
    this.permissionsService.flushPermissions();
  }

  temPermissao(permissao: string): boolean {
    if (this.usuarioSubject.value?.proprietario === true) {
      return true;
    }

    const permissoes = this.permissionsService.getPermissions();
    return Object.prototype.hasOwnProperty.call(permissoes, permissao);
  }

  temAlgumaPermissao(permissoes: string[]): boolean {
    if (!Array.isArray(permissoes) || permissoes.length === 0) {
      return false;
    }
    return permissoes.some((permissao) => this.temPermissao(permissao));
  }

  isAuthenticated(): boolean {
    const accessToken = this.tokenStorage.getToken();
    if (!accessToken) {
      return false;
    }

    if (!this.isAccessTokenExpired(accessToken)) {
      return true;
    }

    if (this.hasValidRefreshToken()) {
      return true;
    }

    this.clearSession();
    return false;
  }

  getUsuario(): Usuario {
    const usuario = this.usuarioSubject.value;
    if (!usuario) throw new Error('Usuário não autenticado');
    return usuario;
  }

  getUsuarioNome(): string | null {
    return this.usuarioSubject.value?.nome || null;
  }

  getTipoEmpresa(usuario?: Usuario | null): TipoEmpresa {
    return resolveTipoEmpresa((usuario || this.usuarioSubject.value)?.empresa?.tipoEmpresa);
  }

  getDefaultRouteForUsuario(usuario?: Usuario | null): string {
    const usuarioResolvido = usuario || this.usuarioSubject.value;
    const tipoEmpresa = this.getTipoEmpresa(usuarioResolvido);

    if (usuarioResolvido?.proprietario === true) {
      return tipoEmpresa === TipoEmpresa.DEPOSITO
        ? '/page/deposito'
        : '/dashboards/dashboard1';
    }

    if (tipoEmpresa === TipoEmpresa.DEPOSITO) {
      if (this.temPermissaoDisponivel('DEPOSITO_DASHBOARD_VER', usuarioResolvido)) {
        return '/page/deposito';
      }

      if (this.temPermissaoDisponivel('CATALOGO_PRODUTOS_VER', usuarioResolvido)) {
        return '/page/catalogo/produtos';
      }

      if (this.temPermissaoDisponivel('CATALOGO_CATEGORIAS_VER', usuarioResolvido)) {
        return '/page/catalogo/categorias';
      }

      if (this.temPermissaoDisponivel('CATALOGO_MARCAS_VER', usuarioResolvido)) {
        return '/page/catalogo/marcas';
      }

      if (this.temPermissaoDisponivel('DEPOSITO_ITENS_VER', usuarioResolvido)) {
        return '/page/deposito/itens';
      }

      if (this.temPermissaoDisponivel('DEPOSITO_CATEGORIAS_VER', usuarioResolvido)) {
        return '/page/deposito/categorias';
      }
    }

    if (this.temPermissaoDisponivel('ORCAMENTOS_VER', usuarioResolvido)) {
      return '/page/orcamentos';
    }

    if (this.temPermissaoDisponivel('SITE_CONFIG_VER', usuarioResolvido)) {
      return '/page/site/configuracoes';
    }

    if (this.temPermissaoDisponivel('SITE_BANNERS_VER', usuarioResolvido)) {
      return '/page/site/banners';
    }

    if (this.temPermissaoDisponivel('SITE_PAGINAS_VER', usuarioResolvido)) {
      return '/page/site/paginas';
    }

    if (this.temPermissaoDisponivel('STORAGE_DASHBOARD_VER', usuarioResolvido)) {
      return '/page/site/armazenamento';
    }

    if (this.temPermissaoDisponivel('STORAGE_ARQUIVOS_VER', usuarioResolvido)) {
      return '/page/site/armazenamento/arquivos';
    }

    if (this.temPermissaoDisponivel('DADOS_EMPRESA', usuarioResolvido)) {
      return '/page/empresa';
    }

    return tipoEmpresa === TipoEmpresa.DEPOSITO
      ? '/page/ajuda'
      : '/dashboards/dashboard1';
  }

  getOnboardingRouteForUsuario(onboardingConcluido = false, usuario?: Usuario | null): string {
    const tipoEmpresa = this.getTipoEmpresa(usuario);
    if (tipoEmpresa === TipoEmpresa.DEPOSITO) {
      return this.getDefaultRouteForUsuario(usuario);
    }

    return onboardingConcluido
      ? this.getDefaultRouteForUsuario(usuario)
      : '/onboarding';
  }

  getJwtPayload(): JwtPayload | null {
    return this.jwtPayload;
  }

  getJwtId(): number | null {
    return this.jwtPayload?.id || null;
  }

  getToken(): string | null {
    return this.tokenStorage.getAccessToken();
  }

  getRefreshToken(): string | null {
    return this.tokenStorage.getRefreshToken();
  }

  register(username: string, senha: string, nome: string): Observable<any> {
    return this.authApi.register(username, senha, nome);
  }

  recuperarSenha(email: string): Observable<void> {
    return this.authApi.recuperarSenha(email);
  }

  resetarSenha(token: string, novaSenha: string): Observable<void> {
    return this.authApi.resetarSenha(token, novaSenha);
  }

  verificarSeTemUsuarios(): Observable<boolean> {
    return this.authApi.verificarSeTemUsuarios();
  }

  refreshToken(): Observable<AuthTokens> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Refresh token ausente'));
    }

    return this.authApi.refreshToken(refreshToken).pipe(tap(tokens => this.persistirTokens(tokens)));
  }

  isAccessTokenExpired(token: string): boolean {
    try {
      const payload = decodeToken(token);
      if (!payload?.exp) return true;

      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch {
      return true;
    }
  }

  hasValidRefreshToken(): boolean {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const payload = decodeToken(refreshToken);
      if (!payload?.exp) return true;

      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch {
      // Se o refresh token não for JWT, considere-o válido e deixe o backend decidir.
      return true;
    }
  }

  private persistirTokens(tokens: AuthTokens): void {
    this.tokenStorage.salvarTokens(tokens.accessToken, tokens.refreshToken);
    this.jwtPayload = decodeToken(tokens.accessToken);
  }

  private temPermissaoDisponivel(permissao: string, usuario?: Usuario | null): boolean {
    const permissoesUsuario = usuario?.perfil?.permissoes || [];
    const possuiNoUsuario = permissoesUsuario.some((item) => item?.chave === permissao);

    return possuiNoUsuario || this.temPermissao(permissao);
  }
}
