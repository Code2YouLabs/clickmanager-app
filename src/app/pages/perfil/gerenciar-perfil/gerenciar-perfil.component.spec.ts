import { of, Subject, throwError } from 'rxjs';
import { Perfil } from 'src/app/models/perfil.model';
import { GerenciarPerfilComponent } from './gerenciar-perfil.component';

describe('GerenciarPerfilComponent', () => {
  let service: any;
  let dialog: any;
  let toastr: any;
  let auth: any;
  let component: GerenciarPerfilComponent;
  let permissoes: Set<string>;

  const perfil = (id: number, nome = `Perfil ${id}`): Perfil => ({ id, nome, descricao: `Descrição ${id}`, permissoes: [] });

  beforeEach(() => {
    permissoes = new Set([
      'PERFIS_PERMISSOES_VER', 'PERFIS_PERMISSOES_CADASTRAR',
      'PERFIS_PERMISSOES_EDITAR', 'PERFIS_PERMISSOES_EXCLUIR',
    ]);
    service = jasmine.createSpyObj('PerfilService', [
      'listar', 'listarUsuariosDoPerfil', 'listarPermissoesDisponiveis', 'listarPermissoesPorPerfil',
      'obter', 'salvar', 'atualizar', 'excluir', 'trocarPerfil',
    ]);
    service.listar.and.returnValue(of([]));
    service.listarUsuariosDoPerfil.and.returnValue(of([]));
    service.listarPermissoesDisponiveis.and.returnValue(of([]));
    service.listarPermissoesPorPerfil.and.returnValue(of([]));
    service.obter.and.callFake((id: number) => of(perfil(id)));
    service.salvar.and.returnValue(of(perfil(10)));
    service.atualizar.and.returnValue(of(perfil(1)));
    service.excluir.and.returnValue(of(undefined));
    service.trocarPerfil.and.returnValue(of({ id: 4, nome: 'Ana' }));
    dialog = { open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(undefined) }) };
    toastr = jasmine.createSpyObj('ToastrService', ['success', 'warning', 'error']);
    auth = jasmine.createSpyObj('AuthService', ['temPermissao', 'getUsuario', 'carregarUsuarioCompleto']);
    auth.temPermissao.and.callFake((value: string) => permissoes.has(value));
    auth.getUsuario.and.returnValue({ id: 99, perfil: perfil(99) });
    auth.carregarUsuarioCompleto.and.returnValue(of({}));
    component = new GerenciarPerfilComponent(service, dialog, toastr, auth);
  });

  it('carrega perfis e representa lista vazia sem confundir com loading ou erro', () => {
    component.ngOnInit();
    expect(service.listar).toHaveBeenCalled();
    expect(component.perfis).toEqual([]);
    expect(component.carregandoPerfis).toBeFalse();
    expect(component.erroPerfis).toBeNull();
  });

  it('registra erro de perfis e permite retry', () => {
    service.listar.and.returnValues(throwError(() => ({ message: 'Falha de rede' })), of([perfil(1)]));
    component.carregarPerfis(false);
    expect(component.erroPerfis).toBe('Falha de rede');
    component.carregarPerfis(false);
    expect(component.perfis.length).toBe(1);
    expect(component.erroPerfis).toBeNull();
  });

  it('não consulta perfis quando o acesso é forbidden', () => {
    permissoes.delete('PERFIS_PERMISSOES_VER');
    component.ngOnInit();
    expect(component.podeVer).toBeFalse();
    expect(service.listar).not.toHaveBeenCalled();
  });

  it('seleciona perfil, carrega usuários e representa coleção vazia', () => {
    service.listarUsuariosDoPerfil.and.returnValue(of([]));
    component.selecionarPerfil(perfil(1));
    expect(component.perfilSelecionado?.id).toBe(1);
    expect(service.listarUsuariosDoPerfil).toHaveBeenCalledWith(1);
    expect(component.usuarios).toEqual([]);
    expect(component.carregandoUsuarios).toBeFalse();
  });

  it('registra erro ao carregar usuários e repete para o perfil atual', () => {
    service.listarUsuariosDoPerfil.and.returnValues(throwError(() => new Error('Usuários indisponíveis')), of([{ id: 4, nome: 'Ana' }]));
    component.selecionarPerfil(perfil(1));
    expect(component.erroUsuarios).toBe('Usuários indisponíveis');
    component.repetirUsuarios();
    expect(component.usuarios[0].nome).toBe('Ana');
  });

  it('descarta resposta obsoleta ao trocar rapidamente de perfil', () => {
    const primeira = new Subject<any[]>();
    const segunda = new Subject<any[]>();
    service.listarUsuariosDoPerfil.and.returnValues(primeira, segunda);
    component.selecionarPerfil(perfil(1));
    component.selecionarPerfil(perfil(2));
    segunda.next([{ id: 2, nome: 'Atual' }]); segunda.complete();
    primeira.next([{ id: 1, nome: 'Obsoleto' }]); primeira.complete();
    expect(component.perfilSelecionado?.id).toBe(2);
    expect(component.usuarios.map(usuario => usuario.nome)).toEqual(['Atual']);
  });

  it('carrega catálogo antes de abrir novo perfil e não abre se o catálogo falhar', () => {
    service.listarPermissoesDisponiveis.and.returnValues(of([{ id: 1, chave: 'VER', titulo: 'Ver' }]), throwError(() => new Error('Catálogo falhou')));
    component.openDialogPerfil('Add');
    expect(dialog.open).toHaveBeenCalled();
    dialog.open.calls.reset();
    component.openDialogPerfil('Add');
    expect(dialog.open).not.toHaveBeenCalled();
    expect(toastr.error).toHaveBeenCalledWith('Catálogo falhou');
  });

  it('carrega perfil, permissões e usuários em conjunto e informa proprietário', () => {
    service.listarUsuariosDoPerfil.and.returnValue(of([{ id: 3, proprietario: true }]));
    component.openDialogPerfil('Edit', perfil(7));
    const config = dialog.open.calls.mostRecent().args[1];
    expect(service.obter).toHaveBeenCalledWith(7);
    expect(service.listarPermissoesPorPerfil).toHaveBeenCalledWith(7);
    expect(config.data.perfilProprietario).toBeTrue();
  });

  it('preserva payload explícito de todas as permissões ao salvar', () => {
    dialog.open.and.returnValue({ afterClosed: () => of({ event: 'Save', data: {
      nome: 'Vendas', descricao: 'Comercial', permissoes: { 1: true, 2: false },
    } }) });
    component.openDialogPerfil('Add');
    expect(service.salvar).toHaveBeenCalledWith({
      nome: 'Vendas', descricao: 'Comercial',
      permissoes: [{ id: 1, selecionada: true }, { id: 2, selecionada: false }],
    });
  });

  it('atualiza perfil e recarrega permissões efetivas do usuário logado', () => {
    auth.getUsuario.and.returnValue({ id: 2, perfil: perfil(7) });
    component.atualizarPerfil(7, { nome: 'Vendas', descricao: '', permissoes: [] });
    expect(service.atualizar).toHaveBeenCalled();
    expect(auth.carregarUsuarioCompleto).toHaveBeenCalled();
  });

  it('preserva tratamento de erro se o refresh da sessão falhar após salvar', () => {
    auth.getUsuario.and.returnValue({ id: 2, perfil: perfil(7) });
    auth.carregarUsuarioCompleto.and.returnValue(throwError(() => new Error('Sessão falhou')));
    component.atualizarPerfil(7, { nome: 'Vendas', descricao: '', permissoes: [] });
    expect(toastr.error).toHaveBeenCalledWith('Sessão falhou');
  });

  it('impede exclusão quando a consulta encontra usuários vinculados', () => {
    service.listarUsuariosDoPerfil.and.returnValue(of([{ id: 1 }]));
    component.excluir(7);
    expect(service.excluir).not.toHaveBeenCalled();
    expect(dialog.open).not.toHaveBeenCalled();
    expect(toastr.warning).toHaveBeenCalled();
  });

  it('consulta vínculos, confirma e exclui perfil sem usuários', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(true) });
    component.excluir(7);
    expect(service.listarUsuariosDoPerfil).toHaveBeenCalledWith(7);
    expect(service.excluir).toHaveBeenCalledWith(7);
    expect(service.listar).toHaveBeenCalled();
  });

  it('não exclui quando a confirmação é cancelada', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(false) });
    component.excluir(7);
    expect(service.excluir).not.toHaveBeenCalled();
  });

  it('troca perfil do usuário com o resultado do diálogo e atualiza a tela', () => {
    component.perfis = [perfil(1), perfil(2)];
    dialog.open.and.returnValue({ afterClosed: () => of({ usuarioId: 4, novoPerfilId: 2 }) });
    component.openDialogTrocarPerfil({ id: 4, nome: 'Ana', perfil: perfil(1) });
    expect(service.trocarPerfil).toHaveBeenCalledWith(4, 2);
    expect(service.listar).toHaveBeenCalled();
  });
});
