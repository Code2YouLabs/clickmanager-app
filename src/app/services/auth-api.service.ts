import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuthTokens } from '../models/auth-tokens.interface';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  constructor(private api: ApiService) {}

  login(username: string, password: string): Observable<AuthTokens> {
    return this.api.post<AuthTokens>('auth/login', { username, password });
  }

  loginGoogle(payload: { credential?: string; accessToken?: string }): Observable<AuthTokens> {
    return this.api.post<AuthTokens>('auth/google', payload);
  }

  refreshToken(refreshToken: string): Observable<AuthTokens> {
    return this.api.post<AuthTokens>('auth/refresh', { refreshToken });
  }

  register(username: string, senha: string, nome: string): Observable<any> {
    return this.api.post('auth/register', { username, senha, nome });
  }

  recuperarSenha(email: string): Observable<void> {
    return this.api.post<void>('auth/recuperar-senha', { email });
  }

  resetarSenha(token: string, novaSenha: string): Observable<void> {
    return this.api.post<void>('auth/resetar-senha', { token, novaSenha });
  }

  verificarSeTemUsuarios(): Observable<boolean> {
    return this.api.get<boolean>('auth/tem-usuarios');
  }
}
