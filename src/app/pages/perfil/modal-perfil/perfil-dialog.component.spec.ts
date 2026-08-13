import { FormBuilder, NonNullableFormBuilder } from '@angular/forms';
import { PerfilDialogComponent } from './perfil-dialog.component';
import { PermissaoCatalogo } from 'src/app/models/permissao.model';

describe('PerfilDialogComponent', () => {
  function criarComponente(options: { selecionadas?: string[]; perfilProprietario?: boolean } = {}) {
    const dialogRef = { close: jasmine.createSpy('close') };
    const toastr = { warning: jasmine.createSpy('warning') };
    const selecionadas = new Set(options.selecionadas || []);
    const data = {
      action: 'Edit',
      perfil: {
        id: 7,
        nome: 'Vendedor',
        descricao: 'Equipe comercial',
        permissoes: catalogo().filter(permissao => selecionadas.has(permissao.chave)),
      },
      permissoesCatalogo: catalogo().map(permissao => ({
        ...permissao,
        selecionada: selecionadas.has(permissao.chave),
      })),
      perfilProprietario: !!options.perfilProprietario,
    };

    const component = new PerfilDialogComponent(
      new FormBuilder().nonNullable,
      dialogRef as any,
      data,
      toastr as any,
    );
    component.ngOnInit();

    return { component, dialogRef, toastr };
  }

  it('agrupa permissões por módulo e recurso usando dados do catálogo', () => {
    const { component } = criarComponente();

    expect(component.modulos.map(modulo => modulo.codigo)).toEqual(['CATALOGO', 'ORCAMENTOS']);
    expect(component.modulos[0].recursos.map(recurso => recurso.codigo)).toEqual(['PRODUTOS']);
    expect(component.modulos[1].recursos.map(recurso => recurso.codigo)).toEqual(['ORCAMENTOS']);
  });

  it('inicia módulos e recursos com permissões selecionadas expandidos', () => {
    const { component } = criarComponente({ selecionadas: ['ORCAMENTOS_VER'] });
    const orcamentos = component.modulos.find(modulo => modulo.codigo === 'ORCAMENTOS')!;
    const recurso = orcamentos.recursos[0];

    expect(component.moduloExpandido(orcamentos)).toBeTrue();
    expect(component.recursoExpandido(orcamentos, recurso)).toBeTrue();
  });

  it('filtra por busca sem perder seleção existente', () => {
    const { component } = criarComponente({ selecionadas: ['ORCAMENTOS_VER'] });

    component.onBuscaChange('cancelar');

    expect(component.modulosFiltrados.length).toBe(1);
    expect(component.modulosFiltrados[0].codigo).toBe('ORCAMENTOS');
    expect(component.modulosFiltrados[0].recursos[0].permissoes.map(permissao => permissao.chave)).toEqual(['ORCAMENTOS_CANCELAR']);
    expect(component.totalSelecionadas).toBe(1);
  });

  it('filtra somente selecionadas e preserva seleção ao alternar o filtro', () => {
    const { component } = criarComponente({ selecionadas: ['CATALOGO_PRODUTOS_VER', 'ORCAMENTOS_VER'] });

    component.alternarSomenteSelecionadas(true);

    expect(component.modulosFiltrados.length).toBe(2);
    expect(component.modulosFiltrados.flatMap(modulo => modulo.recursos.flatMap(recurso => recurso.permissoes)).map(p => p.chave))
      .toEqual(['CATALOGO_PRODUTOS_VER', 'ORCAMENTOS_VER']);

    component.alternarSomenteSelecionadas(false);

    expect(component.totalSelecionadas).toBe(2);
    expect(component.modulosFiltrados.flatMap(modulo => modulo.recursos.flatMap(recurso => recurso.permissoes)).length).toBe(5);
  });

  it('seleciona módulo, recurso e permissão individual com estado parcial', () => {
    const { component } = criarComponente();
    const orcamentos = component.modulos.find(modulo => modulo.codigo === 'ORCAMENTOS')!;
    const recurso = orcamentos.recursos[0];

    component.selecionarRecurso(recurso, true);

    expect(component.recursoSelecionado(recurso)).toBeTrue();
    expect(component.moduloSelecionado(orcamentos)).toBeTrue();
    expect(component.contadorModulo(orcamentos)).toBe('3/3');

    const catalogo = component.modulos.find(modulo => modulo.codigo === 'CATALOGO')!;
    component.selecionarModulo(catalogo, true);
    component.getPermissaoControl('1').setValue(false);

    expect(component.moduloParcial(catalogo)).toBeTrue();
    expect(component.contadorModulo(catalogo)).toBe('1/2');
  });

  it('selecionar visíveis atua somente no resultado filtrado', () => {
    const { component } = criarComponente();

    component.onBuscaChange('orcamento');
    component.selecionarTodos(true);

    expect(component.totalSelecionadas).toBe(3);
    expect(component.modulos.find(modulo => modulo.codigo === 'CATALOGO')!.recursos[0].permissoes.some(p => component.getPermissaoControl(String(p.id)).value))
      .toBeFalse();
  });

  it('salva o estado final das permissões sem depender dos filtros', () => {
    const { component, dialogRef } = criarComponente({ selecionadas: ['ORCAMENTOS_VER'] });

    component.onBuscaChange('catalogo');
    component.selecionarTodos(true);
    component.salvar();

    const payload = dialogRef.close.calls.mostRecent().args[0].data;
    const selecionadas = Object.entries(payload.permissoes)
      .filter(([, value]) => value)
      .map(([id]) => Number(id));

    expect(payload.nome).toBe('Vendedor');
    expect(selecionadas.sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it('marca contexto de proprietário sem sincronizar permissões artificialmente', () => {
    const { component } = criarComponente({ perfilProprietario: true });

    expect(component.avisoProprietario).toBeTrue();
    expect(component.totalSelecionadas).toBe(0);
  });
});

function catalogo(): PermissaoCatalogo[] {
  return [
    permissao(1, 'CATALOGO_PRODUTOS_VER', 'Ver produtos', 'CATALOGO', 'Catálogo', 1, 'PRODUTOS', 'Produtos', 'VER'),
    permissao(2, 'CATALOGO_PRODUTOS_EDITAR', 'Editar produtos', 'CATALOGO', 'Catálogo', 1, 'PRODUTOS', 'Produtos', 'EDITAR'),
    permissao(3, 'ORCAMENTOS_VER', 'Ver orçamentos', 'ORCAMENTOS', 'Orçamentos', 2, 'ORCAMENTOS', 'Orçamentos', 'VER'),
    permissao(4, 'ORCAMENTOS_CRIAR', 'Criar orçamento', 'ORCAMENTOS', 'Orçamentos', 2, 'ORCAMENTOS', 'Orçamentos', 'CRIAR'),
    permissao(5, 'ORCAMENTOS_CANCELAR', 'Cancelar orçamento', 'ORCAMENTOS', 'Orçamentos', 2, 'ORCAMENTOS', 'Orçamentos', 'CANCELAR'),
  ];
}

function permissao(
  id: number,
  chave: string,
  titulo: string,
  moduloCodigo: string,
  moduloTitulo: string,
  moduloOrdem: number,
  recurso: string,
  recursoTitulo: string,
  acao: string,
): PermissaoCatalogo {
  return {
    id,
    chave,
    titulo,
    descricao: `${titulo} no módulo ${moduloTitulo}`,
    modulo: { codigo: moduloCodigo, titulo: moduloTitulo, ordem: moduloOrdem },
    recurso,
    recursoTitulo,
    acao,
    ordem: id,
  };
}
