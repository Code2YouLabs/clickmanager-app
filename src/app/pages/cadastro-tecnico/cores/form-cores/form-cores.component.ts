import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Cor } from 'src/app/models/cor.model';
import { CorService } from '../../services/cor.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CardHeaderComponent } from "src/app/components/card-header/card-header.component";
import { SharedComponentsModule } from 'src/app/components/shared-components.module';
import { extrairMensagemErro } from 'src/app/utils/mensagem.util';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MobileTotalBarComponent } from 'src/app/components/mobile-total-bar/mobile-total-bar.component';

@Component({
  selector: 'app-form-cores',
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
  templateUrl: './form-cores.component.html',
  styleUrl: './form-cores.component.scss'
})
export class FormCoresComponent implements OnInit{
  form!: FormGroup;
  isEditMode = false;
  isCloneMode = false;
  corId!: number;
  isMobileView = false;
  private cloneNomeOriginal?: string;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private coresService: CorService,
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
        this.corId = +id;
        this.carregarCor(this.corId);
        return;
      }

      const cloneFrom = Number(this.route.snapshot.queryParamMap.get('cloneFrom'));
      if (Number.isFinite(cloneFrom) && cloneFrom > 0) {
        this.isCloneMode = true;
        this.carregarCor(cloneFrom, true);
      }
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.atualizarViewport();
  }

  carregarCor(id: number, comoClone = false): void {
    this.coresService.buscarPorId(id).subscribe({
      next: (cor: Cor) => {
        if (comoClone) {
          this.cloneNomeOriginal = cor.nome;
        }
        this.form.patchValue({
          nome: comoClone ? this.nomeClone(cor.nome) : cor.nome,
          descricao: cor.descricao
        });
      },
      error: (err) => {
        this.toastr.error(extrairMensagemErro(err, 'Erro ao carregar cor.'));
        this.router.navigate(['/page/cadastro-tecnico/cores']);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    if (this.cloneNomeInvalido) {
      this.toastr.warning('Altere o nome para salvar o clone.');
      return;
    }

    const corData = this.form.value as Cor;

    if (this.isEditMode) {
      this.coresService.atualizar(this.corId, corData).subscribe({
        next: () => {
          this.toastr.success('Cor atualizada com sucesso!');
          this.router.navigate(['/page/cadastro-tecnico/cores']);
        },
        error: (err) => this.toastr.error(extrairMensagemErro(err, 'Erro ao atualizar cor.'))
      });
    } else {
      this.coresService.salvar(corData).subscribe({
        next: () => {
          this.toastr.success('Cor criada com sucesso!');
          this.router.navigate(['/page/cadastro-tecnico/cores']);
        },
        error: (err) => this.toastr.error(extrairMensagemErro(err, 'Erro ao criar cor.'))
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
      return 'Clonar Cor';
    }
    return this.isEditMode ? 'Editar Cor' : 'Nova Cor';
  }

  get textoAcaoPrincipal(): string {
    return this.isEditMode ? 'Atualizar' : 'Salvar';
  }

  get cloneNomeInvalido(): boolean {
    return this.isCloneMode && this.nomeIgualAoOriginal(this.form?.get('nome')?.value);
  }

  voltar(): void {
    this.router.navigate(['/page/cadastro-tecnico/cores']);
  }

  private atualizarViewport(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.isMobileView = window.innerWidth <= 768;
  }

  private nomeClone(nome: string): string {
    return `${nome || 'Cor'} Cópia`;
  }

  private nomeIgualAoOriginal(nome: string | null | undefined): boolean {
    return this.normalizarNome(nome) === this.normalizarNome(this.cloneNomeOriginal);
  }

  private normalizarNome(nome: string | null | undefined): string {
    return (nome || '').trim().toLocaleLowerCase('pt-BR');
  }
}
