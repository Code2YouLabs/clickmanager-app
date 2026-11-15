import { inject, Injectable } from '@angular/core';
import { distinctUntilChanged, map } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { OperacaoEnvio } from './clickwhatsapp.models';

export function contextoEnvio(usuario: { id?: number; empresa?: { id?: number } } | null): string | null {
  return usuario ? `${usuario.id}/${usuario.empresa?.id}` : null;
}

export interface EnvioPendente {
  readonly conexao: string;
  readonly operacao: OperacaoEnvio;
  mensagem: string;
  repetivel: boolean;
}

/** Memória da sessão do App. O rascunho nunca é escrito no navegador. */
@Injectable({ providedIn: 'root' })
export class ClickWhatsAppEnvioStore {
  pendente: EnvioPendente | null = null;

  constructor() {
    inject(AuthService).usuario$.pipe(map(contextoEnvio), distinctUntilChanged()).subscribe(() => {
      this.pendente = null;
    });
  }
}
