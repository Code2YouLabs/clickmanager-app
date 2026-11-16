import { inject, Injectable } from '@angular/core';
import { distinctUntilChanged, map } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { Mensagem, OperacaoEnvio } from './clickwhatsapp.models';

export function contextoEnvio(usuario: { id?: number; empresa?: { id?: number } } | null): string | null {
  return usuario ? `${usuario.id}/${usuario.empresa?.id}` : null;
}

export interface EnvioPendente {
  readonly conexao: string;
  readonly operacao: OperacaoEnvio;
  mensagem: string;
  repetivel: boolean;
}

export interface EnvioDocumento extends EnvioPendente {
  resultado?: Mensagem;
}

/** Memória da sessão do App. O rascunho nunca é escrito no navegador. */
@Injectable({ providedIn: 'root' })
export class ClickWhatsAppEnvioStore {
  pendente: EnvioPendente | null = null;
  readonly documentos = new Map<string, EnvioDocumento>();

  constructor() {
    inject(AuthService).usuario$.pipe(map(contextoEnvio), distinctUntilChanged()).subscribe(() => {
      this.pendente = null;
      this.documentos.clear();
    });
  }
}
