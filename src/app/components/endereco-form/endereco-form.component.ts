import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputTextoRestritoComponent } from '../inputs/input-texto/input-texto-restrito.component';
import { SectionCardComponent } from '../section-card/section-card.component';
import { InputCepComponent } from '../inputs/input-cep/input-cep.component';
import { EnderecoViaCep } from 'src/app/models/endereco/endereco.viacep.model';

@Component({
  selector: 'app-endereco-form',
  standalone: true,
  templateUrl: './endereco-form.component.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextoRestritoComponent,
    SectionCardComponent,
    InputCepComponent
  ]
})
export class EnderecoFormComponent implements OnInit {
    @Input() enderecoFormGroup?: FormGroup;
    @Output() formReady = new EventEmitter<FormGroup>();
    enderecoForm!: FormGroup;

  constructor(
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.enderecoForm = this.enderecoFormGroup ?? this.fb.group({
      cep: [''],
      logradouro: [''],
      numero: [''],
      complemento: [''],
      bairro: [''],
      cidade: [''],
      estado: [''],
    });

    this.formReady.emit(this.enderecoForm);
  }

  getControl(nome: string): FormControl {
    const control = this.enderecoForm.get(nome);
    if (!control) throw new Error(`FormControl '${nome}' não encontrado`);
    return control as FormControl;
  }

  onEnderecoEncontrado(endereco: EnderecoViaCep | null): void {
    if (!endereco) return;
    this.enderecoForm.patchValue({
      logradouro: endereco.logradouro || '',
      bairro: endereco.bairro || '',
      cidade: endereco.localidade || '',
      estado: endereco.uf || ''
    });
  }
}
