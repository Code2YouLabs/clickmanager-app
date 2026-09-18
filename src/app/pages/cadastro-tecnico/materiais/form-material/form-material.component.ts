import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Material } from 'src/app/models/material.model';
import { MaterialService } from '../../services/material.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CardHeaderComponent } from "src/app/components/card-header/card-header.component";
import { SharedComponentsModule } from 'src/app/components/shared-components.module';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MobileTotalBarComponent } from 'src/app/components/mobile-total-bar/mobile-total-bar.component';

@Component({
  selector: 'app-form-material',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    CardHeaderComponent,
    SharedComponentsModule,
    PageCardComponent,
    SectionCardComponent,
    MobileTotalBarComponent
],
  templateUrl: './form-material.component.html',
  styleUrl: './form-material.component.scss'
})
export class FormMaterialComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  isCloneMode = false;
  materialId!: number;
  isMobileView = false;
  private cloneNomeOriginal?: string;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private materialService: MaterialService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.atualizarViewport();
    this.form = this.fb.group({
      nome: ['', Validators.required],
      descricao: ['', Validators.required]
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.materialId = +id;
        this.carregarMaterial(this.materialId);
        return;
      }

      const cloneFrom = Number(this.route.snapshot.queryParamMap.get('cloneFrom'));
      if (Number.isFinite(cloneFrom) && cloneFrom > 0) {
        this.isCloneMode = true;
        this.carregarMaterial(cloneFrom, true);
      }
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.atualizarViewport();
  }

  carregarMaterial(id: number, comoClone = false): void {
    this.materialService.buscarPorId(id).subscribe({
      next: (material: Material) => {
        if (comoClone) {
          this.cloneNomeOriginal = material.nome;
        }
        this.form.patchValue({
          nome: comoClone ? this.nomeClone(material.nome) : material.nome,
          descricao: material.descricao
        });
      },
      error: () => {
        this.toastr.error('Erro ao carregar material.');
        this.router.navigate(['/page/cadastro-tecnico/materiais']);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    if (this.cloneNomeInvalido) {
      this.toastr.warning('Altere o nome para salvar o clone.');
      return;
    }

    const materialData = this.form.value as Material;

    if (this.isEditMode) {
      this.materialService.atualizar(this.materialId, materialData).subscribe({
        next: () => {
          this.toastr.success('Material atualizado com sucesso!');
          this.router.navigate(['/page/cadastro-tecnico/materiais']);
        },
        error: () => this.toastr.error('Erro ao atualizar material.')
      });
    } else {
      this.materialService.salvar(materialData).subscribe({
        next: () => {
          this.toastr.success('Material criado com sucesso!');
          this.router.navigate(['/page/cadastro-tecnico/materiais']);
        },
        error: () => this.toastr.error('Erro ao criar material.')
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
    return 'Campo inválido';
  }

  get nomeControl(): FormControl {
    return this.form.get('nome') as FormControl;
  }

  get descricaoControl(): FormControl {
    return this.form.get('descricao') as FormControl;
  }

  get tituloPagina(): string {
    if (this.isCloneMode) {
      return 'Clonar Material';
    }
    return this.isEditMode ? 'Editar Material' : 'Novo Material';
  }

  get textoAcaoPrincipal(): string {
    return this.isEditMode ? 'Atualizar' : 'Salvar';
  }

  get cloneNomeInvalido(): boolean {
    return this.isCloneMode && this.nomeIgualAoOriginal(this.form?.get('nome')?.value);
  }

  voltar(): void {
    this.router.navigate(['/page/cadastro-tecnico/materiais']);
  }

  private atualizarViewport(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.isMobileView = window.innerWidth <= 768;
  }

  private nomeClone(nome: string): string {
    return `${nome || 'Material'} Cópia`;
  }

  private nomeIgualAoOriginal(nome: string | null | undefined): boolean {
    return this.normalizarNome(nome) === this.normalizarNome(this.cloneNomeOriginal);
  }

  private normalizarNome(nome: string | null | undefined): string {
    return (nome || '').trim().toLocaleLowerCase('pt-BR');
  }
}
