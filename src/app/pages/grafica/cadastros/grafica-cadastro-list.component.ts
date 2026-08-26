import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { GraficaCadastro, GraficaCadastroRequest, GraficaFormato, GraficaFormatoRequest } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';
import { catalogoErrorMessage, catalogoSlugify } from '../../catalogo/shared/utils/catalogo-utils';

type CadastroTipo = 'materiais' | 'formatos' | 'cores' | 'acabamentos' | 'servicos';
type Item = GraficaCadastro | GraficaFormato;

@Component({
  selector: 'app-grafica-cadastro-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, PageCardComponent, SectionCardComponent],
  template: `
    <app-page-card [titulo]="titulo" subtitulo="Cadastro rápido e direto, baseado no fluxo legado." botaoTexto="Produtos" [botaoRota]="['/page/grafica/produtos']" botaoIcone="arrow_back">
      <div class="cadastro-shell">
        <app-section-card titulo="Cadastro" [subtitulo]="subtitulo">
          <form [formGroup]="form" class="cadastro-form" (ngSubmit)="salvar()">
            <mat-form-field appearance="outline">
              <mat-label>Nome</mat-label>
              <input matInput formControlName="nome" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Código</mat-label>
              <input matInput formControlName="codigo" />
            </mat-form-field>
            <mat-form-field appearance="outline" *ngIf="tipo !== 'cores' && tipo !== 'formatos'">
              <mat-label>Descrição</mat-label>
              <textarea matInput rows="3" formControlName="descricao"></textarea>
            </mat-form-field>
            <ng-container *ngIf="tipo === 'formatos'">
              <mat-form-field appearance="outline">
                <mat-label>Largura</mat-label>
                <input matInput type="number" formControlName="largura" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Altura</mat-label>
                <input matInput type="number" formControlName="altura" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Unidade</mat-label>
                <mat-select formControlName="unidadeDimensao">
                  <mat-option [value]="null">Sem unidade</mat-option>
                  <mat-option value="CENTIMETRO">Centímetro</mat-option>
                  <mat-option value="MILIMETRO">Milímetro</mat-option>
                  <mat-option value="METRO">Metro</mat-option>
                </mat-select>
              </mat-form-field>
            </ng-container>
            <mat-checkbox formControlName="ativo">Ativo</mat-checkbox>
            <div class="actions">
              <button mat-stroked-button type="button" (click)="limpar()">Limpar</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || salvando">
                <mat-icon>save</mat-icon>{{ editandoId ? 'Salvar alterações' : 'Cadastrar' }}
              </button>
            </div>
          </form>
        </app-section-card>

        <app-section-card titulo="Registros" subtitulo="Itens reutilizáveis disponíveis para produtos gráficos.">
          <table mat-table [dataSource]="itens" *ngIf="itens.length">
            <ng-container matColumnDef="nome">
              <th mat-header-cell *matHeaderCellDef>Nome</th>
              <td mat-cell *matCellDef="let item">
                <strong>{{ item.nome }}</strong>
                <small>{{ item.codigo }}</small>
              </td>
            </ng-container>
            <ng-container matColumnDef="detalhe">
              <th mat-header-cell *matHeaderCellDef>Detalhe</th>
              <td mat-cell *matCellDef="let item">{{ detalhe(item) }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let item">{{ item.ativo ? 'Ativo' : 'Inativo' }}</td>
            </ng-container>
            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef>Ações</th>
              <td mat-cell *matCellDef="let item">
                <button mat-icon-button matTooltip="Editar" (click)="editar(item)"><mat-icon>edit</mat-icon></button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="colunas"></tr>
            <tr mat-row *matRowDef="let row; columns: colunas"></tr>
          </table>
          <div class="empty" *ngIf="!itens.length">Nenhum registro cadastrado.</div>
        </app-section-card>
      </div>
    </app-page-card>
  `,
  styles: [`
    .cadastro-shell{display:grid;grid-template-columns:minmax(280px,420px) 1fr;gap:16px}
    .cadastro-form{display:flex;flex-direction:column;gap:12px}
    .actions{display:flex;justify-content:flex-end;gap:10px}
    table{width:100%}
    td small{display:block;color:#6b7280}
    .empty{text-align:center;color:#6b7280;padding:24px}
    @media(max-width:900px){.cadastro-shell{grid-template-columns:1fr}.actions{flex-direction:column-reverse}.actions button{width:100%}}
  `],
})
export class GraficaCadastroListComponent implements OnInit {
  tipo: CadastroTipo = 'materiais';
  itens: Item[] = [];
  editandoId?: number;
  salvando = false;
  colunas = ['nome', 'detalhe', 'status', 'acoes'];

  form = this.fb.group({
    codigo: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    nome: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    descricao: this.fb.control<string | null>(null),
    largura: this.fb.control<number | null>(null),
    altura: this.fb.control<number | null>(null),
    unidadeDimensao: this.fb.control<'METRO' | 'CENTIMETRO' | 'MILIMETRO' | null>(null),
    ativo: this.fb.control(true, { nonNullable: true }),
  });

  get titulo(): string {
    return {
      materiais: 'Materiais gráficos',
      formatos: 'Formatos gráficos',
      cores: 'Cores gráficas',
      acabamentos: 'Acabamentos gráficos',
      servicos: 'Serviços gráficos',
    }[this.tipo];
  }

  get subtitulo(): string {
    return this.tipo === 'formatos' ? 'Preserve nome e dimensões úteis do legado.' : 'Informe nome, código, descrição e status.';
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly service: GraficaProdutoService,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.tipo = (params.get('tipo') || 'materiais') as CadastroTipo;
      this.limpar();
      this.carregar();
    });
    this.form.controls.nome.valueChanges.subscribe((nome) => {
      if (!this.editandoId && nome && !this.form.controls.codigo.dirty) {
        this.form.controls.codigo.setValue(catalogoSlugify(nome).toUpperCase().replace(/-/g, '_'));
      }
    });
  }

  carregar(): void {
    this.listar().subscribe({
      next: (itens: Item[]) => this.itens = itens || [],
      error: (error: unknown) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar os registros.')),
    });
  }

  salvar(): void {
    if (this.form.invalid) return;
    this.salvando = true;
    const raw = this.form.getRawValue();
    const request = this.tipo === 'formatos'
      ? { codigo: raw.codigo, nome: raw.nome, largura: raw.largura, altura: raw.altura, unidadeDimensao: raw.unidadeDimensao, ativo: raw.ativo }
      : { codigo: raw.codigo, nome: raw.nome, descricao: raw.descricao, ativo: raw.ativo };
    this.salvarRequest(request).subscribe({
      next: () => {
        this.salvando = false;
        this.toastr.success('Registro salvo.');
        this.limpar();
        this.carregar();
      },
      error: (error: unknown) => {
        this.salvando = false;
        this.toastr.error(catalogoErrorMessage(error, 'Não foi possível salvar o registro.'));
      },
    });
  }

  editar(item: Item): void {
    this.editandoId = item.id;
    this.form.patchValue({
      codigo: item.codigo,
      nome: item.nome,
      descricao: 'descricao' in item ? item.descricao || null : null,
      largura: 'largura' in item ? item.largura || null : null,
      altura: 'altura' in item ? item.altura || null : null,
      unidadeDimensao: 'unidadeDimensao' in item ? item.unidadeDimensao || null : null,
      ativo: item.ativo,
    });
    this.form.controls.codigo.markAsDirty();
  }

  limpar(): void {
    this.editandoId = undefined;
    this.form.reset({ codigo: '', nome: '', descricao: null, largura: null, altura: null, unidadeDimensao: null, ativo: true });
    this.form.controls.codigo.markAsPristine();
  }

  detalhe(item: Item): string {
    if ('largura' in item) {
      const largura = item.largura ? `${item.largura}` : '-';
      const altura = item.altura ? `${item.altura}` : '-';
      return `${largura} x ${altura} ${item.unidadeDimensao || ''}`.trim();
    }
    return 'descricao' in item && item.descricao ? item.descricao : '-';
  }

  private listar(): Observable<Item[]> {
    switch (this.tipo) {
      case 'materiais': return this.service.listarMateriais();
      case 'formatos': return this.service.listarFormatos();
      case 'cores': return this.service.listarCores();
      case 'acabamentos': return this.service.listarAcabamentos();
      case 'servicos': return this.service.listarServicos();
    }
  }

  private salvarRequest(request: GraficaCadastroRequest | GraficaFormatoRequest): Observable<Item> {
    switch (this.tipo) {
      case 'materiais': return this.service.salvarMaterial(request as GraficaCadastroRequest, this.editandoId);
      case 'formatos': return this.service.salvarFormato(request as GraficaFormatoRequest, this.editandoId);
      case 'cores': return this.service.salvarCor(request as GraficaCadastroRequest, this.editandoId);
      case 'acabamentos': return this.service.salvarAcabamento(request as GraficaCadastroRequest, this.editandoId);
      case 'servicos': return this.service.salvarServico(request as GraficaCadastroRequest, this.editandoId);
    }
  }
}
