import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthTokenStorageService } from '../services/auth-token-storage.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(
    private tokenStorage: AuthTokenStorageService,
    private toastrService: ToastrService,
    private authService: AuthService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.isDemoEndpoint(req.url)) {
      return next.handle(req);
    }

    const isAuthRequest = this.isAuthEndpoint(req.url);
    const token = isAuthRequest ? null : this.tokenStorage.getToken();
    const authReq = token ? this.addTokenHeader(req, token) : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Não tratar endpoints de autenticação como sessão expirada.
        if (isAuthRequest) {
          return throwError(() => error);
        }

        if (error.status === 401) {
          const accessToken = this.tokenStorage.getToken();
          const refreshToken = this.tokenStorage.getRefreshToken();
          // Sem token de acesso e sem refresh token, não existe sessão para expirar.
          // Em telas públicas isso deve apenas propagar o 401 sem forçar logout/toast.
          if (!accessToken && !refreshToken) {
            return throwError(() => error);
          }

          // 401 é falha de autenticação. Se existe refresh token, tente renovar
          // mesmo quando o relógio do cliente ainda não marcou o access token como expirado.
          if (!refreshToken) {
            return throwError(() => error);
          }

          return this.handle401Error(authReq, next);
        }

        return throwError(() => error);
      })
    );
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);
      const refreshFn = (this.authService as any)?.refreshToken;
      if (typeof refreshFn !== 'function') {
        this.isRefreshing = false;
        this.toastrService.warning('Sua sessão expirou. Faça login novamente.', 'Sessão Expirada');
        this.authService.logout();
        return throwError(() => new Error('Sessão expirada'));
      }

      return refreshFn.call(this.authService).pipe(
        switchMap((tokens: any) => {
          const accessToken = String(tokens?.accessToken || '');
          if (!accessToken) {
            throw new Error('Token de acesso inválido');
          }
          this.isRefreshing = false;
          this.refreshTokenSubject.next(accessToken);
          return next.handle(this.addTokenHeader(request, accessToken));
        }),
        catchError(err => {
          this.isRefreshing = false;

          // Se o refresh funcionou mas a requisição original continuou 401,
          // não forçar logout global aqui.
          if (err instanceof HttpErrorResponse && err.status === 401 && !this.isAuthEndpoint(err.url || '')) {
            return throwError(() => err);
          }

          this.toastrService.warning('Sua sessão expirou. Faça login novamente.', 'Sessão Expirada');
          this.authService.logout();
          return throwError(() => err);
        })
      );
    }

    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => next.handle(this.addTokenHeader(request, token!)))
    );
  }

  private addTokenHeader(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  private isAuthEndpoint(url: string): boolean {
    return url.includes('/auth/login') || url.includes('/auth/refresh');
  }

  private isDemoEndpoint(url: string): boolean {
    return url.includes('/api/demo/');
  }
}
