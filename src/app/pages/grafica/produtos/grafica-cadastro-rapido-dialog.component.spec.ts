import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { GraficaProdutoService } from '../shared/grafica.service';
import { GraficaCadastroRapidoDialogComponent } from './grafica-cadastro-rapido-dialog.component';

describe('GraficaCadastroRapidoDialogComponent', () => {
  let fixture: ComponentFixture<GraficaCadastroRapidoDialogComponent>;
  let component: GraficaCadastroRapidoDialogComponent;
  let service: jasmine.SpyObj<GraficaProdutoService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<GraficaCadastroRapidoDialogComponent>>;
  let data: { tipo: 'material' | 'formato' | 'cor' };

  function create(tipo: 'material' | 'formato' | 'cor'): void {
    data = { tipo };
    service = jasmine.createSpyObj('GraficaProdutoService', ['salvarMaterial', 'salvarFormato', 'salvarCor']);
    service.salvarMaterial.and.returnValue(of({ id: 1, codigo: 'COUCHE_150G', nome: 'Couchê 150g', ativo: true }));
    service.salvarFormato.and.returnValue(of({ id: 2, codigo: 'A4', nome: 'A4', ativo: true }));
    service.salvarCor.and.returnValue(of({ id: 3, codigo: '4X4', nome: '4x4', ativo: true }));
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [GraficaCadastroRapidoDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: GraficaProdutoService, useValue: service },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });

    fixture = TestBed.createComponent(GraficaCadastroRapidoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('material usa nome obrigatorio e descricao opcional sem exigir codigo', () => {
    create('material');
    component.form.patchValue({ nome: 'Couchê 150g', descricao: 'Papel couché' });

    component.salvar();

    expect(service.salvarMaterial).toHaveBeenCalledWith({
      codigo: 'COUCHE_150G',
      nome: 'Couchê 150g',
      descricao: 'Papel couché',
      ativo: true,
    });
  });

  it('cor usa nome obrigatorio e descricao opcional sem exigir codigo', () => {
    create('cor');
    component.form.patchValue({ nome: '4x4', descricao: '' });

    component.salvar();

    expect(service.salvarCor).toHaveBeenCalledWith({
      codigo: '4X4',
      nome: '4x4',
      descricao: null,
      ativo: true,
    });
  });

  it('formato exige unidade altura e largura e preserva medidas uteis opcionais', () => {
    create('formato');

    component.form.patchValue({ nome: 'A4' });
    expect(component.form.invalid).toBeTrue();

    component.form.patchValue({
      unidadeDimensao: 'CENTIMETRO',
      altura: 29.7,
      largura: 21,
      alturaUtil: 28,
      larguraUtil: 20,
      descricao: 'Formato A4',
    });
    component.salvar();

    expect(service.salvarFormato).toHaveBeenCalledWith({
      codigo: 'A4',
      nome: 'A4',
      descricao: 'Formato A4',
      largura: 21,
      altura: 29.7,
      larguraUtil: 20,
      alturaUtil: 28,
      unidadeDimensao: 'CENTIMETRO',
      ativo: true,
    });
  });
});
