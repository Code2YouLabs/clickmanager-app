import { NavigationStart, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { contextoEnvio } from 'src/app/pages/clickwhatsapp/clickwhatsapp-envio.store';
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { distinctUntilChanged, filter, map, merge, skip, take, takeUntil, timeout } from 'rxjs';
import { SILENT_REQUEST } from 'src/app/interceptors/loading.interceptor';
import { environment } from 'src/environments/environment';
import { CanalDocumento } from './compartilhamento-clickwhatsapp.component';
import { RevisaoDocumentoComponent } from './revisao-documento.component';

@Injectable({ providedIn: 'root' })
export class RevisaoDocumentoService {
  private readonly http = inject(HttpClient);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  private contexto: string | null = null;
  private consulta?: { habilitado: boolean; ate: number };

  constructor() {
    this.auth.usuario$.pipe(map(contextoEnvio),distinctUntilChanged()).subscribe(contexto => {
      this.contexto = contexto;
      this.consulta = undefined;
    });
  }

  get manualAtivo() { return this.consulta?.habilitado === false && this.consulta.ate > Date.now(); }

  preparar(endpoint: string) {
    if (this.consulta && this.consulta.ate > Date.now()) return;
    const contexto = this.contexto;
    this.http.get<CanalDocumento>(environment.apiUrl + endpoint, {
      context: new HttpContext().set(SILENT_REQUEST, true),
    }).pipe(timeout(12000),take(1)).subscribe({
      next: canal => {
        if (contexto === this.contexto) this.consulta = { habilitado: canal.habilitado, ate: Date.now() + 30000 };
      },
      error: () => { this.consulta = undefined; },
    });
  }

  abrir(endpoint: string, numero: string, texto: string, legado: () => void) {
    const revisar = () => this.dialog.open(RevisaoDocumentoComponent, {
      data: { endpoint, numero, texto }, width: '640px', maxWidth: 'calc(100vw - 24px)', maxHeight: 'calc(100dvh - 24px)',
    });
    if (this.consulta && this.consulta.ate > Date.now()) {
      this.consulta.habilitado ? revisar() : legado();
      return;
    }
    this.http.get<CanalDocumento>(environment.apiUrl + endpoint, {
      context: new HttpContext().set(SILENT_REQUEST, true),
    }).pipe(timeout(12000),take(1),takeUntil(merge(
      this.router.events.pipe(filter(e => e instanceof NavigationStart)),
      this.auth.usuario$.pipe(map(contextoEnvio),distinctUntilChanged(),skip(1)),
    ))).subscribe({
      next: canal => canal.habilitado ? revisar() : legado(),
      error: revisar,
    });
  }
}
