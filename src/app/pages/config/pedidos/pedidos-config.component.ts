import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { PedidoPrazoService } from 'src/app/services/pedido-prazo.service';
import { Subject, takeUntil, finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
@Component({standalone:true,selector:'app-pedidos-config',imports:[CommonModule,ReactiveFormsModule,MaterialModule,PageCardComponent],templateUrl:'./pedidos-config.component.html',styleUrl:'./pedidos-config.component.scss'})
export class PedidosConfigComponent implements OnInit, OnDestroy {
 carregando=false; salvando=false; erro=''; carregada=false; private destroy$=new Subject<void>();
 form=new FormGroup({prazo:new FormControl(7,{nonNullable:true,validators:[Validators.required,Validators.min(1)]}),unidade:new FormControl<'HORAS'|'DIAS'>('DIAS',{nonNullable:true}),atencaoHoras:new FormControl(24,{nonNullable:true,validators:[Validators.required,Validators.min(0),Validators.max(87600)]}),atrasoCriticoHoras:new FormControl(48,{nonNullable:true,validators:[Validators.required,Validators.min(1),Validators.max(87600)]})});
 constructor(private api:PedidoPrazoService,private toastr:ToastrService){}
 ngOnInit(){this.carregar();}
 get limite(){return this.form.controls.unidade.value==='DIAS'?3650:87600;}
 get invalido(){const p=this.form.getRawValue();return this.form.invalid || p.prazo>this.limite || ![p.prazo,p.atencaoHoras,p.atrasoCriticoHoras].every(Number.isInteger);}
 carregar(){this.carregando=true;this.carregada=false;this.erro='';this.api.configuracao().pipe(takeUntil(this.destroy$),finalize(()=>this.carregando=false)).subscribe({next:c=>{this.form.setValue(c.parametros);this.carregada=true;},error:()=>this.erro='Não foi possível carregar as configurações de Pedidos.'});}
 salvar(){if(!this.carregada||this.invalido||this.salvando)return;this.salvando=true;this.api.configurar(this.form.getRawValue()).pipe(takeUntil(this.destroy$),finalize(()=>this.salvando=false)).subscribe({next:()=>this.toastr.success('Configuração de Pedidos salva.'),error:e=>this.toastr.error(e.error?.message||'Não foi possível salvar. Tente novamente.')});}
 ngOnDestroy(){this.destroy$.next();this.destroy$.complete();}
}
