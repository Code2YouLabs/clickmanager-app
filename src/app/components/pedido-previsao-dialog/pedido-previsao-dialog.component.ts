import { CommonModule } from '@angular/common';
import { Component, Inject, ViewChild, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { PedidoPrevisaoFormComponent } from '../pedido-previsao-form/pedido-previsao-form.component';
import { PedidoComercialDetalhe } from 'src/app/pages/grafica/shared/grafica.models';
import { PedidoPrazoService } from 'src/app/services/pedido-prazo.service';
import { finalize, Subject, takeUntil } from 'rxjs';
@Component({selector:'app-pedido-previsao-dialog',standalone:true,imports:[CommonModule,MaterialModule,PedidoPrevisaoFormComponent],templateUrl:'./pedido-previsao-dialog.component.html',styleUrl:'./pedido-previsao-dialog.component.scss'})
export class PedidoPrevisaoDialogComponent implements OnDestroy {
 @ViewChild(PedidoPrevisaoFormComponent) form?: PedidoPrevisaoFormComponent;
 valida = false; ocupado = false; conflito = false; erro = ''; aviso = ''; versao?: number;
 private destroy$ = new Subject<void>();
 constructor(@Inject(MAT_DIALOG_DATA) public data: {pedido?: PedidoComercialDetalhe}, private api: PedidoPrazoService, public ref: MatDialogRef<PedidoPrevisaoDialogComponent>) {this.versao = data.pedido?.prazo?.versao;}
 get editavel() {return !this.data.pedido || ['AGUARDANDO_PAGAMENTO','PENDENTE','EM_PRODUCAO'].includes(this.data.pedido.status);}
 salvar() {
  if (this.ocupado || this.conflito || !this.editavel) return;
  const d = this.form?.definicao(); if (!d) return;
  if (!this.data.pedido) {this.ref.close(d); return;}
  if (this.versao == null) {this.erro = 'Recarregue os dados antes de editar.'; return;}
  this.ocupado = true; this.erro = ''; this.ref.disableClose = true;
  this.api.editar(this.data.pedido.id!, this.versao, d.modo === 'SEM_PREVISAO' ? null : d.modo === 'EXPLICITA' ? d.dataHora : null)
   .pipe(takeUntil(this.destroy$),finalize(() => {this.ocupado=false; this.ref.disableClose=false;})).subscribe({next:p=>this.ref.close(p),error:e=>{
    this.conflito = e.status === 409; this.erro = this.conflito ? 'O pedido foi alterado. Sua previsão digitada foi preservada. Recarregue os dados antes de decidir se deseja reaplicá-la.' : e.error?.message || 'Não foi possível salvar a previsão.';
   }});
 }
 recarregar() {
  if (!this.data.pedido || this.ocupado) return;
  this.ocupado=true;
  this.api.pedido(this.data.pedido.id!).pipe(takeUntil(this.destroy$),finalize(()=>this.ocupado=false)).subscribe({next:p=>{
   this.data.pedido=p; this.versao=p.prazo?.versao; this.conflito=false; this.erro='';
   this.aviso=this.editavel ? 'Dados recarregados. Revise a previsão digitada e escolha Salvar para reaplicá-la.' : 'O status atual não permite editar a previsão.';
  },error:()=>this.erro='Não foi possível recarregar. Tente novamente.'});
 }
 ngOnDestroy(){this.destroy$.next();this.destroy$.complete();}
}
