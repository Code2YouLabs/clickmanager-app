import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';

export interface EmailServidorConfig {
  id?: number;
  host: string;
  porta: number;
  usuario: string;
  senha: string;
  remetente: string;
  usarSsl: boolean;
}

export interface EmailServidorTesteRequest {
  emailDestino: string;
  mensagem: string;
  host: string;
  porta: number;
  usuario: string;
  senha: string;
  remetente: string;
  usarSsl: boolean;
  id?: number;
}

@Injectable({ providedIn: 'root' })
export class EmailServidorService {
  private readonly endpoint = 'api/config/email-servidor';

  constructor(private api: ApiService) {}

  obter(): Observable<EmailServidorConfig> {
    return this.api.get<EmailServidorConfig>(this.endpoint);
  }

  salvar(config: EmailServidorConfig): Observable<void> {
    return this.api.post<void>(this.endpoint, config);
  }

  atualizar(config: EmailServidorConfig): Observable<void> {
    return this.api.put<void>(this.endpoint, config);
  }

  testarEnvio(payload: EmailServidorTesteRequest): Observable<void> {
    return this.api.post<void>(`${this.endpoint}/teste`, payload);
  }
}
