import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Formato } from 'src/app/models/formato.model';
import { FormatoService } from '../../services/formato.service';
import { CardHeaderComponent } from "src/app/components/card-header/card-header.component";
import { SharedComponentsModule } from 'src/app/components/shared-components.module';
import { InputNumericoComponent } from 'src/app/components/inputs/input-numerico/input-numerico.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MobileTotalBarComponent } from 'src/app/components/mobile-total-bar/mobile-total-bar.component';

@Component({
  selector: 'app-form-formato',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    CardHeaderComponent,
    SharedComponentsModule,
    InputNumericoComponent,
    PageCardComponent,
    SectionCardComponent,
    MobileTotalBarComponent
],
  templateUrl: './form-formato.component.html',
  styleUrl: './form-formato.component.scss'
})
export class FormFormatoComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  isCloneMode = false;
  formatoId!: number;
  isMobileView = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private formatoService: FormatoService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.atualizarViewport();
    this.form = this.fb.group({
      nome: ['', Validators.required],
      larguraCm: [null, [Validators.required, Validators.min(0.1)]],
      alturaCm: [null, [Validators.required, Validators.min(0.1)]],
      larguraUtilCm: [null, [Validators.min(0.1)]],
      alturaUtilCm: [null, [Validators.min(0.1)]]
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.formatoId = +id;
        this.carregarFormato(this.formatoId);
        return;
      }

      const cloneFrom = Number(this.route.snapshot.queryParamMap.get('cloneFrom'));
      if (Number.isFinite(cloneFrom) && cloneFrom > 0) {
        this.isCloneMode = true;
        this.carregarFormato(cloneFrom, true);
      }
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.atualizarViewport();
  }

  carregarFormato(id: number, comoClone = false): void {
    this.formatoService.buscarPorId(id).subscribe({
      next: (formato: Formato) => {
        this.form.patchValue({
          nome: comoClone ? this.nomeClone(formato.nome) : formato.nome,
          larguraCm: formato.larguraCm,
          alturaCm: formato.alturaCm,
          larguraUtilCm: formato.larguraUtilCm,
          alturaUtilCm: formato.alturaUtilCm
        });
      },
      error: () => {
        this.toastr.error('Erro ao carregar formato.');
        this.router.navigate(['/page/cadastro-tecnico/formatos']);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const formatoData = this.form.value as Formato;

    if (this.isEditMode) {
      this.formatoService.atualizar(this.formatoId, formatoData).subscribe({
        next: () => {
          this.toastr.success('Formato atualizado com sucesso!');
          this.router.navigate(['/page/cadastro-tecnico/formatos']);
        },
        error: () => this.toastr.error('Erro ao atualizar formato.')
      });
    } else {
      this.formatoService.salvar(formatoData).subscribe({
        next: () => {
          this.toastr.success('Formato criado com sucesso!');
          this.router.navigate(['/page/cadastro-tecnico/formatos']);
        },
        error: () => this.toastr.error('Erro ao criar formato.')
      });
    }
  }

  updateErrorMessage(): void {
    Object.keys(this.form.controls).forEach(field => {
      const control = this.form.get(field);
      if (control && control.invalid && (control.dirty || control.touched)) {
        control.markAsTouched();
      }
    });
  }

  getErrorMessage(campo: string): string {
    const control = this.form.get(campo);
    if (control?.hasError('required')) {
      return 'Campo obrigatório';
    }
    if (control?.hasError('min')) {
      return 'Valor deve ser maior que zero';
    }
    return 'Campo inválido';
  }

  get nomeControl(): FormControl {
    return this.form.get('nome') as FormControl;
  }

  get alturaControl(): FormControl {
    return this.form.get('alturaCm') as FormControl;
  }

  get alturaUtilControl(): FormControl {
    return this.form.get('alturaUtilCm') as FormControl;
  }

  get larguraControl(): FormControl {
    return this.form.get('larguraCm') as FormControl;
  }

  get larguraUtilControl(): FormControl {
    return this.form.get('larguraUtilCm') as FormControl;
  }

  get tituloPagina(): string {
    if (this.isCloneMode) {
      return 'Clonar Formato';
    }
    return this.isEditMode ? 'Editar Formato' : 'Novo Formato';
  }

  get textoAcaoPrincipal(): string {
    return this.isEditMode ? 'Atualizar' : 'Salvar';
  }

  voltar(): void {
    this.router.navigate(['/page/cadastro-tecnico/formatos']);
  }

  private atualizarViewport(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.isMobileView = window.innerWidth <= 768;
  }

  private nomeClone(nome: string): string {
    return `${nome || 'Formato'} Cópia`;
  }
}
