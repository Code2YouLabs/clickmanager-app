import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { GraficaProdutoService } from '../shared/grafica.service';
import { GraficaProdutoBuscaRapidaDialogComponent } from './grafica-produto-busca-rapida-dialog.component';

describe('GraficaProdutoBuscaRapidaDialogComponent', () => {
  let fixture: ComponentFixture<GraficaProdutoBuscaRapidaDialogComponent>;
  let component: GraficaProdutoBuscaRapidaDialogComponent;
  let service: jasmine.SpyObj<GraficaProdutoService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<GraficaProdutoBuscaRapidaDialogComponent>>;

  beforeEach(() => {
    service = jasmine.createSpyObj('GraficaProdutoService', ['listar', 'listarServicos']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    service.listar.and.returnValue(of({
      content: [produto()],
      pageNumber: 0,
      pageSize: 10,
      totalElements: 1,
      totalPages: 1,
      last: true,
    }));
    service.listarServicos.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [GraficaProdutoBuscaRapidaDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: GraficaProdutoService, useValue: service },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });

    fixture = TestBed.createComponent(GraficaProdutoBuscaRapidaDialogComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('carrega primeira pagina paginada ao abrir', fakeAsync(() => {
    fixture.detectChanges();
    tick(0);

    expect(service.listar).toHaveBeenCalledWith(jasmine.objectContaining({
      page: 0,
      size: 10,
      ativo: true,
      search: null,
      sort: 'nome,asc',
    }));
    expect(component.itens.length).toBe(1);
    expect(component.itens[0].tipo).toBe('PRODUTO');
  }));

  it('aplica debounce pesquisando por nome ou codigo', fakeAsync(() => {
    fixture.detectChanges();
    tick(0);
    service.listar.calls.reset();

    component.pesquisaControl.setValue('PAN-001');
    tick(349);
    expect(service.listar).not.toHaveBeenCalled();
    tick(1);

    expect(service.listar).toHaveBeenCalledWith(jasmine.objectContaining({
      page: 0,
      size: 10,
      search: 'PAN-001',
    }));
  }));

  it('troca pagina mantendo termo atual', fakeAsync(() => {
    fixture.detectChanges();
    tick(0);
    component.pesquisaControl.setValue('panfleto 10x15');
    tick(350);
    service.listar.calls.reset();

    component.onPage({ pageIndex: 2, pageSize: 10, length: 31 });
    tick(0);

    expect(service.listar).toHaveBeenCalledWith(jasmine.objectContaining({
      page: 2,
      size: 10,
      search: 'panfleto 10x15',
    }));
  }));

  it('mostra estado sem resultado e seleciona produto fechando modal', fakeAsync(() => {
    service.listar.and.returnValue(of({
      content: [],
      pageNumber: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    }));
    fixture.detectChanges();
    tick(0);

    expect(component.emptyMessage).toBe('Nenhum item encontrado.');

    const selecionado = produto();
    component.selecionar({ tipo: 'PRODUTO', produto: selecionado });

    expect(dialogRef.close).toHaveBeenCalledWith({ tipo: 'PRODUTO', produto: selecionado });
  }));

  it('inclui servicos ativos junto dos produtos', fakeAsync(() => {
    service.listarServicos.and.returnValue(of([{
      id: 44,
      codigo: 'LOGO',
      nome: 'Criação de Logomarca',
      descricao: 'Serviço avulso',
      ativo: true,
      politicas: [],
    }]));

    fixture.detectChanges();
    tick(0);

    expect(component.itens.map((item) => item.tipo)).toEqual(['SERVICO', 'PRODUTO']);
  }));
});

function produto() {
  return {
    id: 11,
    catalogoProdutoId: 123,
    catalogoProdutoCodigo: 'PAN-001',
    catalogoProdutoNome: 'Panfleto',
    ativo: true,
    material: { id: 1, codigo: 'APERGAMINHADO', nome: 'Apergaminhado 180g', ativo: true },
    formato: { id: 2, codigo: '10X15', nome: '10x15', ativo: true },
    cor: { id: 3, codigo: '4X4', nome: '4x4', ativo: true },
    acabamentos: [],
    parametros: [],
  };
}
