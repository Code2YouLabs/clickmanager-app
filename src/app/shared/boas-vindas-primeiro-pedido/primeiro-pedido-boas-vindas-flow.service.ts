import { Injectable } from '@angular/core';
import { Usuario } from 'src/app/models/usuario/usuario.model';

@Injectable({ providedIn: 'root' })
export class PrimeiroPedidoBoasVindasFlowService {
  private readonly storagePrefix = 'clickmanager.primeiro-pedido.boas-vindas.onboarding-concluido';

  marcarOnboardingConcluido(usuario: Usuario | null | undefined): void {
    const key = this.storageKey(usuario);
    if (!key) {
      return;
    }

    try {
      sessionStorage.setItem(key, '1');
    } catch {
      // A marcação é apenas uma proteção de fluxo; falhas de storage não devem travar o onboarding.
    }
  }

  onboardingConcluidoNesteFluxo(usuario: Usuario | null | undefined): boolean {
    const key = this.storageKey(usuario);
    if (!key) {
      return false;
    }

    try {
      return sessionStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  }

  limparOnboardingConcluido(usuario: Usuario | null | undefined): void {
    const key = this.storageKey(usuario);
    if (!key) {
      return;
    }

    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore storage failures.
    }
  }

  private storageKey(usuario: Usuario | null | undefined): string | null {
    const usuarioId = usuario?.id;
    const empresaId = usuario?.empresa?.id;
    return usuarioId && empresaId ? `${this.storagePrefix}.${usuarioId}.${empresaId}` : null;
  }
}
