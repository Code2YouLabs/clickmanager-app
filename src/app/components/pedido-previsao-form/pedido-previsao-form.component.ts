import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { InputDataComponent } from '../inputs/input-data/input-data.component';
import { PedidoPrazo, PedidoPrazoParametros, PedidoPrevisaoDefinicao } from 'src/app/models/pedido/pedido-prazo.model';
import { PedidoPrazoService } from 'src/app/services/pedido-prazo.service';
import { dataCivil, dataCalendario, partesSP, horarioSP, previaSP } from 'src/app/shared/pedido-prazo/pedido-fuso';
import { Subject, takeUntil } from 'rxjs';
@Component({selector: 'app-pedido-previsao-form', standalone: true,
 imports: [CommonModule, ReactiveFormsModule, FormsModule, MaterialModule, InputDataComponent],
 templateUrl: './pedido-previsao-form.component.html', styleUrl: './pedido-previsao-form.component.scss'})
export class PedidoPrevisaoFormComponent implements OnInit, OnDestroy {
 @Input() edicao = false;
 @Input() prazo: PedidoPrazo | null = null;
 @Output() estado = new EventEmitter<boolean>();
 habilitada = true; automatica = true; carregando = false; erro = ''; confirmadoPassado = false;
 parametros: PedidoPrazoParametros | null = null;
 data = new FormControl<Date | null>(null); hora = ''; private destroy$ = new Subject<void>();
 ngOnInit() {
   if (this.edicao) {
     this.automatica = false; this.habilitada = !!this.prazo?.previsaoEntrega;
     if (this.prazo?.previsaoEntrega) this.preencher(partesSP(this.prazo.previsaoEntrega));
     this.parametros = this.prazo?.parametros || null;
     this.notificar();
   } else this.carregar();
   this.data.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.editada());
 }
 carregar() {
   this.carregando = true; this.erro = '';
   this.api.configuracao().pipe(takeUntil(this.destroy$)).subscribe({next: c => {
     this.parametros = c.parametros; this.carregando = false;
     if (this.automatica) this.preencher(previaSP(c.parametros)); this.notificar();
   }, error: () => {this.carregando = false; this.erro = 'Não foi possível carregar o prazo padrão.'; this.notificar();}});
 }
 constructor(private api: PedidoPrazoService) {}
 private preencher(p: {data: string; hora: string}) {this.data.setValue(dataCalendario(p.data), {emitEvent:false}); this.hora = p.hora;}
 editada() {this.automatica = false; this.confirmadoPassado = false; this.notificar();}
 padrao() {if (!this.parametros) return; this.automatica = true; this.confirmadoPassado = false; this.preencher(previaSP(this.parametros)); this.notificar();}
 alternar() {if (this.habilitada && !this.data.value) this.preencher(partesSP(Date.now())); this.notificar();}
 get dataHora(): string | null {return this.data.value && !isNaN(this.data.value.getTime()) ? horarioSP(dataCivil(this.data.value), this.hora) : null;}
 get passada() {return this.habilitada && !this.automatica && !!this.dataHora && new Date(this.dataHora).getTime() < Date.now();}
 get valida() {return !this.habilitada || (!this.carregando && (!this.erro || this.edicao) && (this.automatica ? !!this.parametros : !!this.dataHora) && (!this.passada || this.confirmadoPassado));}
 notificar() {this.estado.emit(this.valida);}
 definicao(): PedidoPrevisaoDefinicao | null {
   if (!this.valida) {this.data.markAsTouched(); this.notificar(); return null;}
   if (!this.habilitada) return {modo:'SEM_PREVISAO'};
   return this.automatica ? {modo:'AUTOMATICA', parametros:{...this.parametros!}} : {modo:'EXPLICITA', dataHora:this.dataHora!};
 }
 ngOnDestroy() {this.destroy$.next(); this.destroy$.complete();}
}
