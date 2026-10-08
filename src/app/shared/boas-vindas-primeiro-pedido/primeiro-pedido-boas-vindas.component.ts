import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';
import { MaterialModule } from 'src/app/material.module';
import { PRIMEIRO_PEDIDO_JORNADA } from '../jornadas/jornada.constants';
import { JornadaService } from '../jornadas/jornada.service';

export interface PrimeiroPedidoBoasVindasData {
  empresaNome?: string | null;
}

@Component({
  selector: 'app-primeiro-pedido-boas-vindas',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialModule],
  templateUrl: './primeiro-pedido-boas-vindas.component.html',
  styleUrl: './primeiro-pedido-boas-vindas.component.scss',
})
export class PrimeiroPedidoBoasVindasComponent implements OnInit {
  readonly jornada = PRIMEIRO_PEDIDO_JORNADA;
  oferecendo = false;
  iniciando = false;
  ignorando = false;
  erroOferta: string | null = null;
  erroAcao: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: PrimeiroPedidoBoasVindasData,
    private readonly dialogRef: MatDialogRef<PrimeiroPedidoBoasVindasComponent>,
    private readonly jornadaService: JornadaService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.registrarOferta();
  }

  criarPrimeiroPedido(): void {
    if (this.iniciando || this.ignorando) {
      return;
    }

    this.erroAcao = null;
    this.iniciando = true;
    this.jornadaService
      .iniciar(this.jornada, { etapa: this.jornada.etapaInicial })
      .pipe(finalize(() => this.iniciando = false))
      .subscribe({
        next: () => {
          this.dialogRef.close('iniciado');
          this.router.navigateByUrl(this.jornada.rotaInicial);
        },
        error: () => {
          this.erroAcao = 'Não foi possível iniciar agora. Tente novamente em instantes.';
          this.toastr.error(this.erroAcao);
        },
      });
  }

  explorarSozinho(): void {
    if (this.iniciando || this.ignorando) {
      return;
    }

    this.erroAcao = null;
    this.ignorando = true;
    this.jornadaService
      .ignorar(this.jornada)
      .pipe(finalize(() => this.ignorando = false))
      .subscribe({
        next: () => this.dialogRef.close('ignorado'),
        error: () => {
          this.erroAcao = 'Não foi possível salvar sua escolha. Tente novamente.';
          this.toastr.error(this.erroAcao);
        },
      });
  }

  private registrarOferta(): void {
    this.oferecendo = true;
    this.erroOferta = null;
    this.jornadaService
      .oferecer(this.jornada)
      .pipe(finalize(() => this.oferecendo = false))
      .subscribe({
        error: () => {
          this.erroOferta = 'Não conseguimos registrar esta apresentação, mas você pode continuar.';
          this.toastr.warning(this.erroOferta);
        },
      });
  }
}
