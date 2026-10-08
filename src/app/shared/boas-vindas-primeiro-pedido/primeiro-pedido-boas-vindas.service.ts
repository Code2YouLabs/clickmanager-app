import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap, take } from 'rxjs/operators';
import { OnboardingV2Service } from 'src/app/pages/onboarding-v2/services/onboarding-v2.service';
import { AuthService } from 'src/app/services/auth.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { Usuario } from 'src/app/models/usuario/usuario.model';
import { isOnboardingV2Finished } from 'src/app/pages/onboarding-v2/models/onboarding-v2.models';
import { PRIMEIRO_PEDIDO_JORNADA, PRIMEIRO_PEDIDO_PERMISSOES } from '../jornadas/jornada.constants';
import { JornadaProgressoResponse } from '../jornadas/jornada.models';
import { JornadaService } from '../jornadas/jornada.service';
import { PrimeiroPedidoBoasVindasComponent } from './primeiro-pedido-boas-vindas.component';
import { PrimeiroPedidoBoasVindasFlowService } from './primeiro-pedido-boas-vindas-flow.service';

export interface PrimeiroPedidoElegibilidadeResultado {
  mostrar: boolean;
  motivo?: string;
  jornada?: JornadaProgressoResponse;
}

@Injectable({ providedIn: 'root' })
export class PrimeiroPedidoBoasVindasService {
  private readonly avaliando = new Set<string>();
  private readonly avaliados = new Set<string>();
  private dialogRef?: MatDialogRef<PrimeiroPedidoBoasVindasComponent>;

  constructor(
    private readonly authService: AuthService,
    private readonly onboardingV2Service: OnboardingV2Service,
    private readonly jornadaService: JornadaService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly dialog: MatDialog,
    private readonly flow: PrimeiroPedidoBoasVindasFlowService,
  ) {
    this.authService.usuario$.subscribe((usuario) => {
      if (!usuario) {
        this.reset();
      }
    });
  }

  avaliarEExibir(usuario: Usuario): void {
    const key = this.key(usuario);
    if (!key || this.avaliando.has(key) || this.avaliados.has(key) || this.dialogRef) {
      return;
    }

    this.avaliando.add(key);
    this.avaliarElegibilidade(usuario)
      .pipe(finalize(() => this.avaliando.delete(key)))
      .subscribe((resultado) => {
        if (resultado.mostrar || resultado.motivo !== 'contexto_incompativel') {
          this.avaliados.add(key);
        }
        if (!resultado.mostrar) {
          return;
        }

        this.abrirDialog(usuario);
      });
  }

  avaliarElegibilidade(usuario: Usuario): Observable<PrimeiroPedidoElegibilidadeResultado> {
    if (!this.possuiContextoElegivel(usuario)) {
      return of({ mostrar: false, motivo: 'contexto_incompativel' });
    }

    return this.featureFlagService.carregar().pipe(
      switchMap(() => forkJoin({
        onboarding: this.onboardingV2Service.fetchProgress().pipe(
          catchError(() => of(null)),
        ),
        jornada: this.jornadaService.consultar(PRIMEIRO_PEDIDO_JORNADA).pipe(
          catchError(() => of(null)),
        ),
      })),
      map(({ onboarding, jornada }) => {
        if (!onboarding || onboarding.onboardingVersion !== 'v2' || !isOnboardingV2Finished(onboarding)) {
          return { mostrar: false, motivo: 'onboarding_nao_concluido' };
        }

        if (!jornada) {
          return { mostrar: false, motivo: 'jornada_indisponivel' };
        }

        if (jornada.status !== 'NAO_INICIADO' || !!jornada.oferecidoEm) {
          return { mostrar: false, motivo: 'jornada_ja_tratada', jornada };
        }

        return { mostrar: true, jornada };
      }),
    );
  }

  reset(): void {
    this.avaliando.clear();
    this.avaliados.clear();
    this.dialogRef?.close();
    this.dialogRef = undefined;
  }

  private abrirDialog(usuario: Usuario): void {
    this.dialogRef = this.dialog.open(PrimeiroPedidoBoasVindasComponent, {
      width: '560px',
      maxWidth: 'calc(100vw - 32px)',
      disableClose: true,
      autoFocus: 'dialog',
      restoreFocus: true,
      panelClass: 'primeiro-pedido-welcome-dialog',
      data: {
        empresaNome: usuario.empresa?.nome ?? null,
      },
    });

    this.dialogRef.afterClosed().pipe(take(1)).subscribe(() => {
      this.dialogRef = undefined;
    });
  }

  private possuiContextoElegivel(usuario: Usuario): boolean {
    if (!usuario?.id || !usuario.empresa?.id || usuario.proprietario !== true) {
      return false;
    }

    if (this.authService.getTipoEmpresa(usuario) !== TipoEmpresa.GRAFICA) {
      return false;
    }

    if (!this.flow.onboardingConcluidoNesteFluxo(usuario)) {
      return false;
    }

    if (!this.featureFlagService.isEnabled('GRAFICA')) {
      return false;
    }

    return PRIMEIRO_PEDIDO_PERMISSOES.every((permissao) => this.authService.temPermissao(permissao));
  }

  private key(usuario: Usuario): string | null {
    const usuarioId = usuario.id;
    const empresaId = usuario.empresa?.id;
    return usuarioId && empresaId ? `${usuarioId}:${empresaId}` : null;
  }
}
