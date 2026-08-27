import { Routes } from '@angular/router';
import { StarterComponent } from './starter/starter.component';
import { EmpresaFormComponent } from './empresa/empresa-form.component';
import { ListarUsuariosComponent } from './usuarios/listar-usuarios/listar-usuarios.component';
import { FormUsuarioComponent } from './usuarios/form-usuario/form-usuario.component';
import { FormProdutoComponent } from './cadastro-tecnico/produtos/form-produto/form-produto.component';
import { ListarCoresComponent } from './cadastro-tecnico/cores/listar-cores/listar-cores.component';
import { FormCoresComponent } from './cadastro-tecnico/cores/form-cores/form-cores.component';
import { ListarMaterialComponent } from './cadastro-tecnico/materiais/listar-material/listar-material.component';
import { FormMaterialComponent } from './cadastro-tecnico/materiais/form-material/form-material.component';
import { FormAcabamentoComponent } from './cadastro-tecnico/acabamentos/form-acabamento/form-acabamento.component';
import { ListarAcabamentoComponent } from './cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component';
import { FormFormatoComponent } from './cadastro-tecnico/formatos/form-formato/form-formato.component';
import { ListarFormatoComponent } from './cadastro-tecnico/formatos/listar-formato/listar-formato.component';
import { ListarProdutosComponent } from './cadastro-tecnico/produtos/listar-produtos/listar-produtos.component';
import { FormPedidoComponent } from './pedido/form-pedido/form-pedido.component';
import { ListarPedidoComponent } from 'src/app/pages/pedido/listar-pedido/listar-pedido.component';
import { DetalhesPedidoComponent } from 'src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component';
import { FormServicoComponent } from './cadastro-tecnico/servicos/form-servico/form-servico.component';
import { ListarServicoComponent } from './cadastro-tecnico/servicos/listar-servicos/listar-servicos.component';
import { CalculadoraConfigComponent } from './smart-calc-config/smart-calc-config/smart-calc-config.component';
import { EmailServidorComponent } from './config/email-servidor/email-servidor.component';
import { FolhaConfigComponent } from './config/folha-config/folha-config.component';
import { GerenciarPerfilComponent } from './perfil/gerenciar-perfil/gerenciar-perfil.component';
import { AjudaComponent } from './ajuda/ajuda.component';
import { ListarFuncionariosComponent } from './funcionarios/listar-funcionarios/listar-funcionarios.component';
import { FormFuncionarioComponent } from './funcionarios/form-funcionario/form-funcionario.component';
import { DetalheFuncionarioComponent } from './funcionarios/detalhe-funcionario/detalhe-funcionario.component';
import { ListarFolhaPagamentoComponent } from './pessoas/folha/listar-folha/listar-folha-pagamento.component';
import { DetalheFolhaPagamentoComponent } from './pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component';
import { SuporteComponent } from './suporte/suporte.component';
import { featureModuleGuard } from '../guards/feature-module.guard';
import { permissionGuard } from '../guards/permission.guard';
import { ListarCategoriasDepositoComponent } from './deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component';
import { FormCategoriaDepositoComponent } from './deposito/categorias/form-categoria-deposito/form-categoria-deposito.component';
import { ListarMarcasDepositoComponent } from './deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component';
import { FormMarcaDepositoComponent } from './deposito/marcas/form-marca-deposito/form-marca-deposito.component';
import { ListarItensDepositoComponent } from './deposito/itens/listar-itens-deposito/listar-itens-deposito.component';
import { FormItemDepositoComponent } from './deposito/itens/form-item-deposito/form-item-deposito.component';
import { DepositoDashboardPageComponent } from './deposito/dashboard/deposito-dashboard-page.component';
import { ListarOrcamentosComponent } from './orcamentos/listar-orcamentos/listar-orcamentos.component';
import { DetalheOrcamentoComponent } from './orcamentos/detalhe-orcamento/detalhe-orcamento.component';
import { FormOrcamentoComponent } from './orcamentos/form-orcamento/form-orcamento.component';
import { DEPOSITO_ROUTE_DATA, GRAFICA_ROUTE_DATA, SHARED_ROUTE_DATA } from '../guards/empresa-tipo-route-data';
import { TipoEmpresa } from '../models/empresa/tipo-empresa.enum';
import { ListarBannersComponent } from './site/banners/listar-banners/listar-banners.component';
import { FormBannerComponent } from './site/banners/form-banner/form-banner.component';
import { ListarPaginasComponent } from './site/paginas/listar-paginas/listar-paginas.component';
import { FormPaginaComponent } from './site/paginas/form-pagina/form-pagina.component';
import { SiteConfiguracoesComponent } from './site/configuracoes/site-configuracoes.component';
import { StorageAdminPageComponent } from './storage/components/storage-admin-page/storage-admin-page.component';
import { depositoLegadoGuard } from './catalogo/shared/guards/catalogo-versao.guard';
import { PresencaPublicaComponent } from './config/presenca-publica/presenca-publica.component';

export const PagesRoutes: Routes = [
  {
    path: '',
    component: StarterComponent,
    data: {
      title: 'Starter Page',
    },
  },
  {
    path: 'empresa',
    component: EmpresaFormComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['DADOS_EMPRESA'],
      title: 'Dados da Empresa',
      urls: [
        { title: 'Dashboard', url: '/dashboards/dashboard1' },
        { title: 'Dados da Empresa' }
      ]
    }
  },
  {
    path: 'perfil',
    component: GerenciarPerfilComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['PERFIS_PERMISSOES_VER'],
      title: 'Gerenciamento de perfil dos usuários',
      urls: [
        { title: 'Dashboard', url: '/dashboards/dashboard1' },
        { title: 'Gerenciamento de perfil dos usuários' }
      ]
    }
  },
  {
    path: 'ajuda',
    component: AjudaComponent,
    data: {
      ...SHARED_ROUTE_DATA,
      title: 'Central de ajuda',
      urls: [
        { title: 'Dashboard', url: '/dashboards/dashboard1' },
        { title: 'Ajuda' }
      ]
    }
  },
  {
    path: 'funcionarios',
    component: ListarFuncionariosComponent,
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      featureKey: 'funcionarios',
      requiredPermission: ['FUNCIONARIO_VER'],
      title: 'Gestão de Funcionários',
      urls: [
        { title: 'Dashboard', url: '/dashboards/dashboard1' },
        { title: 'Funcionários' }
      ]
    }
  },
  {
    path: 'funcionarios/novo',
    component: FormFuncionarioComponent,
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      featureKey: 'funcionarios',
      requiredPermission: ['FUNCIONARIO_CRIAR'],
      title: 'Novo Funcionário',
      urls: [
        { title: 'Funcionários', url: '/page/funcionarios' },
        { title: 'Novo Funcionário' }
      ]
    }
  },
  {
    path: 'funcionarios/editar/:id',
    component: FormFuncionarioComponent,
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      featureKey: 'funcionarios',
      requiredPermission: ['FUNCIONARIO_EDITAR'],
      title: 'Editar Funcionário',
      urls: [
        { title: 'Funcionários', url: '/page/funcionarios' },
        { title: 'Editar Funcionário' }
      ]
    }
  },
  {
    path: 'funcionarios/detalhe/:id',
    component: DetalheFuncionarioComponent,
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      featureKey: 'funcionarios',
      requiredPermission: ['FUNCIONARIO_VER'],
      title: 'Detalhe do Funcionário',
      urls: [
        { title: 'Funcionários', url: '/page/funcionarios' },
        { title: 'Detalhe' }
      ]
    }
  },
  {
    path: 'suporte',
    component: SuporteComponent,
    data: {
      ...SHARED_ROUTE_DATA,
      title: 'Suporte',
      urls: [
        { title: 'Dashboard', url: '/dashboards/dashboard1' },
        { title: 'Suporte' }
      ]
    }
  },
  {
    path: 'suporte/:id',
    component: SuporteComponent,
    data: {
      ...SHARED_ROUTE_DATA,
      title: 'Detalhe do chamado',
      urls: [
        { title: 'Dashboard', url: '/dashboards/dashboard1' },
        { title: 'Suporte', url: '/page/suporte' },
        { title: 'Detalhe' }
      ]
    }
  },
  {
    path: 'grafica/produtos',
    loadComponent: () => import('./grafica/produtos/grafica-produtos.component').then((m) => m.GraficaProdutosComponent),
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      featureKey: 'GRAFICA',
      requiredPermission: ['GRAFICA_PRODUTOS_VER'],
      title: 'Produtos graficos',
      urls: [
        { title: 'Grafica' },
        { title: 'Produtos graficos' }
      ]
    }
  },
  {
    path: 'grafica/produtos/novo',
    loadComponent: () => import('./grafica/produtos/grafica-produto-form.component').then((m) => m.GraficaProdutoFormComponent),
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      featureKey: 'GRAFICA',
      requiredPermission: ['GRAFICA_PRODUTOS_EDITAR'],
      title: 'Novo produto grafico',
      urls: [
        { title: 'Grafica' },
        { title: 'Produtos graficos', url: '/page/grafica/produtos' },
        { title: 'Novo produto grafico' }
      ]
    }
  },
  {
    path: 'grafica/produtos/:id/editar',
    loadComponent: () => import('./grafica/produtos/grafica-produto-form.component').then((m) => m.GraficaProdutoFormComponent),
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      featureKey: 'GRAFICA',
      requiredPermission: ['GRAFICA_PRODUTOS_EDITAR'],
      title: 'Configurar produto grafico',
      urls: [
        { title: 'Grafica' },
        { title: 'Produtos graficos', url: '/page/grafica/produtos' },
        { title: 'Configurar produto grafico' }
      ]
    }
  },
  {
    path: 'grafica/categorias',
    loadComponent: () => import('./grafica/categorias/grafica-categorias.component').then((m) => m.GraficaCategoriasComponent),
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      featureKey: 'GRAFICA',
      requiredPermission: ['GRAFICA_PRODUTOS_VER'],
      title: 'Categorias graficas',
      urls: [
        { title: 'Grafica' },
        { title: 'Categorias graficas' }
      ]
    }
  },
  {
    path: 'grafica/categorias/novo',
    loadComponent: () => import('./grafica/categorias/grafica-categoria-form.component').then((m) => m.GraficaCategoriaFormComponent),
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      featureKey: 'GRAFICA',
      requiredPermission: ['GRAFICA_PRODUTOS_EDITAR'],
      title: 'Nova categoria grafica',
      urls: [
        { title: 'Grafica' },
        { title: 'Categorias graficas', url: '/page/grafica/categorias' },
        { title: 'Nova categoria grafica' }
      ]
    }
  },
  {
    path: 'grafica/categorias/:id/editar',
    loadComponent: () => import('./grafica/categorias/grafica-categoria-form.component').then((m) => m.GraficaCategoriaFormComponent),
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      featureKey: 'GRAFICA',
      requiredPermission: ['GRAFICA_PRODUTOS_EDITAR'],
      title: 'Editar categoria grafica',
      urls: [
        { title: 'Grafica' },
        { title: 'Categorias graficas', url: '/page/grafica/categorias' },
        { title: 'Editar categoria grafica' }
      ]
    }
  },
  {
    path: 'grafica/:tipo',
    loadComponent: () => import('./grafica/cadastros/grafica-cadastro-list.component').then((m) => m.GraficaCadastroListComponent),
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      featureKey: 'GRAFICA',
      requiredPermission: ['GRAFICA_PRODUTOS_VER'],
      title: 'Cadastro grafico',
      urls: [
        { title: 'Grafica' },
        { title: 'Cadastro grafico' }
      ]
    }
  },
  {
    path: 'site',
    redirectTo: 'site/banners',
    pathMatch: 'full',
  },
  {
    path: 'site/banners',
    component: ListarBannersComponent,
    canActivate: [depositoLegadoGuard, permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['SITE_BANNERS_VER'],
      title: 'Banners do site',
      urls: [
        { title: 'Meu Site', url: '/page/site/banners' },
        { title: 'Banners' }
      ]
    }
  },
  {
    path: 'site/banners/novo',
    component: FormBannerComponent,
    canActivate: [depositoLegadoGuard, permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['SITE_BANNERS_CADASTRAR'],
      title: 'Novo banner',
      urls: [
        { title: 'Banners do site', url: '/page/site/banners' },
        { title: 'Novo banner' }
      ]
    }
  },
  {
    path: 'site/banners/editar/:id',
    component: FormBannerComponent,
    canActivate: [depositoLegadoGuard, permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['SITE_BANNERS_EDITAR'],
      title: 'Editar banner',
      urls: [
        { title: 'Banners do site', url: '/page/site/banners' },
        { title: 'Editar banner' }
      ]
    }
  },
  {
    path: 'site/paginas',
    component: ListarPaginasComponent,
    canActivate: [depositoLegadoGuard, permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['SITE_PAGINAS_VER'],
      title: 'Páginas do site',
      urls: [
        { title: 'Meu Site', url: '/page/site/paginas' },
        { title: 'Páginas' }
      ]
    }
  },
  {
    path: 'site/paginas/nova',
    component: FormPaginaComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['SITE_PAGINAS_CADASTRAR'],
      title: 'Nova página',
      urls: [
        { title: 'Páginas do site', url: '/page/site/paginas' },
        { title: 'Nova página' }
      ]
    }
  },
  {
    path: 'site/paginas/editar/:id',
    component: FormPaginaComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['SITE_PAGINAS_EDITAR'],
      title: 'Editar página',
      urls: [
        { title: 'Páginas do site', url: '/page/site/paginas' },
        { title: 'Editar página' }
      ]
    }
  },
  {
    path: 'site/configuracoes',
    component: SiteConfiguracoesComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['SITE_CONFIG_VER'],
      title: 'Configurações do site',
      urls: [
        { title: 'Meu Site', url: '/page/site/configuracoes' },
        { title: 'Configurações' }
      ]
    }
  },
  {
    path: 'site/armazenamento',
    component: StorageAdminPageComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['STORAGE_DASHBOARD_VER', 'STORAGE_ARQUIVOS_VER', 'STORAGE_LIXEIRA_VER', 'STORAGE_VIDEOS_VER'],
      title: 'Armazenamento',
      urls: [
        { title: 'Configurações', url: '/page/site/armazenamento' },
        { title: 'Armazenamento' }
      ]
    }
  },
  {
    path: 'site/armazenamento/arquivos',
    component: StorageAdminPageComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['STORAGE_ARQUIVOS_VER'],
      title: 'Arquivos do Storage',
      urls: [
        { title: 'Configurações', url: '/page/site/armazenamento' },
        { title: 'Armazenamento', url: '/page/site/armazenamento' },
        { title: 'Arquivos' }
      ]
    }
  },
  {
    path: 'site/armazenamento/lixeira',
    component: StorageAdminPageComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['STORAGE_LIXEIRA_VER'],
      title: 'Lixeira do Storage',
      urls: [
        { title: 'Configurações', url: '/page/site/armazenamento' },
        { title: 'Armazenamento', url: '/page/site/armazenamento' },
        { title: 'Lixeira' }
      ]
    }
  },
  {
    path: 'site/armazenamento/videos',
    component: StorageAdminPageComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['STORAGE_VIDEOS_VER'],
      title: 'Vídeos do Storage',
      urls: [
        { title: 'Configurações', url: '/page/site/armazenamento' },
        { title: 'Armazenamento', url: '/page/site/armazenamento' },
        { title: 'Vídeos' }
      ]
    }
  },
  {
    path: 'site/armazenamento/reconciliacao',
    component: StorageAdminPageComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['STORAGE_RECONCILIAR'],
      title: 'Reconciliação do Storage',
      urls: [
        { title: 'Configurações', url: '/page/site/armazenamento' },
        { title: 'Armazenamento', url: '/page/site/armazenamento' },
        { title: 'Reconciliação' }
      ]
    }
  },
  {
    path: 'folha-pagamento',
    component: ListarFolhaPagamentoComponent,
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      featureKey: 'folhaPagamento',
      requiredPermission: ['FOLHA_VER'],
      title: 'Folha de Pagamento',
      urls: [
        { title: 'Gestão de Pessoas', url: '/page/funcionarios' },
        { title: 'Folha de Pagamento' }
      ]
    }
  },
  {
    path: 'folha-pagamento/detalhe/:competencia/:funcionarioId',
    component: DetalheFolhaPagamentoComponent,
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      featureKey: 'folhaPagamento',
      requiredPermission: ['FOLHA_VER', 'FOLHA_EDITAR'],
      title: 'Detalhe da Folha',
      urls: [
        { title: 'Folha de Pagamento', url: '/page/folha-pagamento' },
        { title: 'Detalhe da Folha' }
      ]
    }
  },
  {
    path: 'config/presenca-publica',
    component: PresencaPublicaComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['DADOS_EMPRESA'],
      title: 'Presença Pública',
      urls: [
        { title: 'Configurações', url: '/page/config/presenca-publica' },
        { title: 'Presença Pública' }
      ]
    }
  },
  {
    path: 'config/folha-pagamento',
    component: FolhaConfigComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['FOLHA_CONFIGURAR'],
      title: 'Configuração da Folha',
      urls: [
        { title: 'Configurações', url: '/page/config/email-servidor' },
        { title: 'Configuração da Folha' }
      ]
    }
  },
  {
    path: 'usuarios/novo',
    component: FormUsuarioComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['USUARIO_CADASTRAR'],
      title: 'Cadastro de novo usuário',
      urls: [
        { title: 'Novo usuário', url: '/dashboards/dashboard1' },
        { title: 'Cadastro de novo usuário' }
      ]
    }
  },
  {
    path: 'usuarios/editar/:id',
    component: FormUsuarioComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['USUARIO_EDITAR'],
      title: 'Editar usuário',
      urls: [
        { title: 'Usuários', url: '/usuarios' },
        { title: 'Editar usuário' }
      ]
    }
  },
  {
    path: 'usuarios/listar',
    component: ListarUsuariosComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['USUARIOS_VER'],
      title: 'Lista de usuários',
      urls: [
        { title: 'Lista de usuários', url: '/dashboards/dashboard1' },
        { title: 'Lista de usuários' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/cores',
    component: ListarCoresComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PRODUTOS_VER'],
      title: 'Lsita de Cores',
      urls: [
        { title: 'Lsita de Cores', url: '/cadastro-tecnico' },
        { title: 'Cores' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/cores/nova',
    component: FormCoresComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PRODUTOS_CADASTRAR'],
      title: 'Nova Cor',
      urls: [
        { title: 'Cadastro Técnico', url: '/cadastro-tecnico' },
        { title: 'Nova Cor' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/cores/editar/:id',
    component: FormCoresComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PRODUTOS_EDITAR'],
      title: 'Editar Cor',
      urls: [
        { title: 'Cadastro Técnico', url: '/cadastro-tecnico' },
        { title: 'Editar Cor' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/materiais',
    component: ListarMaterialComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PRODUTOS_VER'],
      title: 'Lista de Materiais',
      urls: [
        { title: 'Cadastro Técnico', url: '/cadastro-tecnico' },
        { title: 'Lista de Materiais' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/materiais/nova',
    component: FormMaterialComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PRODUTOS_CADASTRAR'],
      title: 'Novo Material',
      urls: [
        { title: 'Cadastro Técnico', url: '/cadastro-tecnico' },
        { title: 'Novo Material' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/materiais/editar/:id',
    component: FormMaterialComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PRODUTOS_EDITAR'],
      title: 'Editar Material',
      urls: [
        { title: 'Cadastro Técnico', url: '/cadastro-tecnico' },
        { title: 'Editar Material' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/acabamentos',
    component: ListarAcabamentoComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PRODUTOS_VER'],
      title: 'Lista de Acabamentos',
      urls: [
        { title: 'Cadastro Técnico', url: '/cadastro-tecnico' },
        { title: 'Lista de Acabamentos' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/acabamentos/criar',
    component: FormAcabamentoComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PRODUTOS_CADASTRAR'],
      title: 'Novo Acabamento',
      urls: [
        { title: 'Cadastro Técnico', url: '/cadastro-tecnico' },
        { title: 'Novo Acabamento' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/acabamentos/editar/:id',
    component: FormAcabamentoComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PRODUTOS_EDITAR'],
      title: 'Editar Acabamento',
      urls: [
        { title: 'Cadastro Técnico', url: '/cadastro-tecnico' },
        { title: 'Editar Acabamento' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/formatos',
    component: ListarFormatoComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PRODUTOS_VER'],
      title: 'Lista de Formatos',
      urls: [
        { title: 'Cadastro Técnico', url: '/cadastro-tecnico' },
        { title: 'Lista de Formatos' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/formatos/criar',
    component: FormFormatoComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PRODUTOS_CADASTRAR'],
      title: 'Novo Formato',
      urls: [
        { title: 'Cadastro Técnico', url: '/cadastro-tecnico' },
        { title: 'Novo Formato' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/formatos/editar/:id',
    component: FormFormatoComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PRODUTOS_EDITAR'],
      title: 'Editar Formato',
      urls: [
        { title: 'Cadastro Técnico', url: '/cadastro-tecnico' },
        { title: 'Editar Formato' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/produtos',
    component: ListarProdutosComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PRODUTOS_VER'],
      title: 'Lista de Produtos',
      urls: [
        { title: 'Cadastro Técnico', url: '/cadastro-tecnico' },
        { title: 'Lista de Produtos' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/produtos/criar',
    component: FormProdutoComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PRODUTOS_CADASTRAR'],
      title: 'Criar Produto',
      urls: [
        { title: 'Lista de produtos', url: '/page/cadastro-tecnico/produtos' },
        { title: 'Criar Produto' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/produtos/editar/:id',
    component: FormProdutoComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PRODUTOS_EDITAR'],
      title: 'Editar Produto',
      urls: [
        { title: 'Lista de produtos', url: '/page/cadastro-tecnico/produtos' },
        { title: 'Editar Produto' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/servico',
    component: ListarServicoComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['SERVICOS_VER'],
      title: 'Lista de Serviços',
      urls: [
        { title: 'Serviços', url: '/servico' },
        { title: 'Lista de Serviços' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/servico/criar',
    component: FormServicoComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['SERVICOS_CADASTRAR'],
      title: 'Criar Serviço',
      urls: [
        { title: 'Lista de Serviços', url: '/page/cadastro-tecnico/servico' },
        { title: 'Criar Serviço' }
      ]
    }
  },
  {
    path: 'cadastro-tecnico/servico/editar/:id',
    component: FormServicoComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['SERVICOS_EDITAR'],
      title: 'Editar Serviço',
      urls: [
        { title: 'Lista de Serviços', url: '/page/cadastro-tecnico/servico' },
        { title: 'Editar Serviço' }
      ]
    }
  },
  {
    path: 'deposito',
    component: DepositoDashboardPageComponent,
    canActivate: [permissionGuard],
    data: {
      ...DEPOSITO_ROUTE_DATA,
      requiredPermission: ['DEPOSITO_DASHBOARD_VER'],
      title: 'Dashboard do Depósito',
      urls: [
        { title: 'Dashboard' }
      ]
    }
  },
  {
    path: 'catalogo',
    loadChildren: () =>
      import('./catalogo/catalogo.routes').then((m) => m.CatalogoRoutes),
    data: {
      ...SHARED_ROUTE_DATA,
      title: 'Catálogo',
    }
  },
  {
    path: 'deposito/categorias',
    component: ListarCategoriasDepositoComponent,
    canActivate: [depositoLegadoGuard, permissionGuard],
    data: {
      ...DEPOSITO_ROUTE_DATA,
      requiredPermission: ['DEPOSITO_CATEGORIAS_VER'],
      title: 'Categorias de Depósito',
      urls: [
        { title: 'Depósito', url: '/page/deposito/categorias' },
        { title: 'Categorias' }
      ]
    }
  },
  {
    path: 'deposito/categorias/nova',
    component: FormCategoriaDepositoComponent,
    canActivate: [depositoLegadoGuard, permissionGuard],
    data: {
      ...DEPOSITO_ROUTE_DATA,
      requiredPermission: ['DEPOSITO_CATEGORIAS_CADASTRAR'],
      title: 'Nova Categoria de Depósito',
      urls: [
        { title: 'Categorias de Depósito', url: '/page/deposito/categorias' },
        { title: 'Nova Categoria' }
      ]
    }
  },
  {
    path: 'deposito/categorias/editar/:id',
    component: FormCategoriaDepositoComponent,
    canActivate: [depositoLegadoGuard, permissionGuard],
    data: {
      ...DEPOSITO_ROUTE_DATA,
      requiredPermission: ['DEPOSITO_CATEGORIAS_EDITAR'],
      title: 'Editar Categoria de Depósito',
      urls: [
        { title: 'Categorias de Depósito', url: '/page/deposito/categorias' },
        { title: 'Editar Categoria' }
      ]
    }
  },
  {
    path: 'deposito/itens',
    component: ListarItensDepositoComponent,
    canActivate: [depositoLegadoGuard, permissionGuard],
    data: {
      ...DEPOSITO_ROUTE_DATA,
      requiredPermission: ['DEPOSITO_ITENS_VER'],
      title: 'Itens de Depósito',
      urls: [
        { title: 'Depósito', url: '/page/deposito/itens' },
        { title: 'Itens' }
      ]
    }
  },
  {
    path: 'deposito/itens/novo',
    component: FormItemDepositoComponent,
    canActivate: [depositoLegadoGuard, permissionGuard],
    data: {
      ...DEPOSITO_ROUTE_DATA,
      requiredPermission: ['DEPOSITO_ITENS_CADASTRAR'],
      title: 'Novo Item de Depósito',
      urls: [
        { title: 'Itens de Depósito', url: '/page/deposito/itens' },
        { title: 'Novo Item' }
      ]
    }
  },
  {
    path: 'deposito/itens/editar/:id',
    component: FormItemDepositoComponent,
    canActivate: [depositoLegadoGuard, permissionGuard],
    data: {
      ...DEPOSITO_ROUTE_DATA,
      requiredPermission: ['DEPOSITO_ITENS_EDITAR'],
      title: 'Editar Item de Depósito',
      urls: [
        { title: 'Itens de Depósito', url: '/page/deposito/itens' },
        { title: 'Editar Item' }
      ]
    }
  },
  {
    path: 'deposito/marcas',
    component: ListarMarcasDepositoComponent,
    canActivate: [depositoLegadoGuard, permissionGuard],
    data: {
      ...DEPOSITO_ROUTE_DATA,
      requiredPermission: ['DEPOSITO_MARCAS_VER'],
      title: 'Marcas de Depósito',
      urls: [
        { title: 'Depósito', url: '/page/deposito/marcas' },
        { title: 'Marcas' }
      ]
    }
  },
  {
    path: 'deposito/marcas/nova',
    component: FormMarcaDepositoComponent,
    canActivate: [depositoLegadoGuard, permissionGuard],
    data: {
      ...DEPOSITO_ROUTE_DATA,
      requiredPermission: ['DEPOSITO_MARCAS_CADASTRAR'],
      title: 'Nova Marca de Depósito',
      urls: [
        { title: 'Marcas de Depósito', url: '/page/deposito/marcas' },
        { title: 'Nova Marca' }
      ]
    }
  },
  {
    path: 'deposito/marcas/editar/:id',
    component: FormMarcaDepositoComponent,
    canActivate: [depositoLegadoGuard, permissionGuard],
    data: {
      ...DEPOSITO_ROUTE_DATA,
      requiredPermission: ['DEPOSITO_MARCAS_EDITAR'],
      title: 'Editar Marca de Depósito',
      urls: [
        { title: 'Marcas de Depósito', url: '/page/deposito/marcas' },
        { title: 'Editar Marca' }
      ]
    }
  },
  {
    path: 'calculadora-materiais',
    loadComponent: () =>
      import('./calculadora-materiais/calculadora-materiais.component').then(
        (m) => m.CalculadoraMateriaisComponent
      ),
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      featureKey: 'CALCULADORA_MATERIAIS',
      requiredPermission: ['CALCULADORA_MATERIAIS_CONFIGURAR'],
      title: 'Calculadora de Materiais',
      urls: [
        { title: 'Calculadora de Materiais' }
      ]
    }
  },
  {
    path: 'deposito/orcamentos',
    redirectTo: 'orcamentos',
    pathMatch: 'full',
  },
  {
    path: 'deposito/orcamentos/:id',
    redirectTo: 'orcamentos/:id',
    pathMatch: 'full',
  },
  {
    path: 'orcamentos',
    component: ListarOrcamentosComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['ORCAMENTOS_VER'],
      title: 'Orçamentos',
      urls: [
        { title: 'Orçamentos' }
      ]
    }
  },
  {
    path: 'orcamentos/novo',
    component: FormOrcamentoComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['ORCAMENTOS_CRIAR'],
      title: 'Novo Orçamento',
      urls: [
        { title: 'Orçamentos', url: '/page/orcamentos' },
        { title: 'Novo Orçamento' }
      ]
    }
  },
  {
    path: 'orcamentos/:id',
    component: DetalheOrcamentoComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['ORCAMENTOS_VER'],
      title: 'Detalhes do Orçamento',
      urls: [
        { title: 'Orçamentos', url: '/page/orcamentos' },
        { title: 'Detalhes' }
      ]
    }
  },
  {
    path: 'pedido',
    component: ListarPedidoComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PEDIDOS_VER'],
      title: 'Lista de Pedidos',
      urls: [
        { title: 'Pedidos', url: '/pedido' },
        { title: 'Lista de Pedidos' }
      ]
    }
  },
  {
    path: 'pedido/criar',
    component: FormPedidoComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PEDIDOS_CADASTRAR'],
      title: 'Criar Pedido',
      urls: [
        { title: 'Lista de Pedidos', url: '/page/pedido' },
        { title: 'Criar Pedido' }
      ]
    }
  },
  {
    path: 'pedido/detalhe/:id',
    component: DetalhesPedidoComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['PEDIDOS_VER', 'PEDIDOS_EDITAR'],
      title: 'Detalhes Pedido',
      urls: [
        { title: 'Detalhes de Pedidos', url: '/page/pedido' },
        { title: 'Detalhes Pedido' }
      ]
    }
  },
  {
    path: 'cliente',
    loadChildren: () => import('./cliente/cliente.routes').then((m) => m.ClienteRoutes),
  },
  {
    path: 'calculadora/config/criar',
    component: CalculadoraConfigComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['CONFIG_CALCULADORAS'],
      title: 'Configuração SmartCalc',
      urls: [
        { title: 'Configuração SmartCalc', url: '/page/calculadora/config' },
        { title: 'Configuração SmartCalc' }
      ]
    }
  },
  {
    path: 'calculadora/config/editar/:id',
    component: CalculadoraConfigComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['CONFIG_CALCULADORAS'],
      title: 'Editar Configuração',
      urls: [
        { title: 'Lista de Configurações', url: '/page/calculadora/config' },
        { title: 'Editar Configuração' }
      ]
    }
  },
  {
    path: 'config/aplicativos-atalhos',
    loadComponent: () =>
      import('./config/aplicativos-atalhos/aplicativos-atalhos.component').then(
        (m) => m.AplicativosAtalhosComponent
      ),
    canActivate: [permissionGuard],
    data: {
      ...DEPOSITO_ROUTE_DATA,
      allowedEmpresaTipos: [TipoEmpresa.GRAFICA, TipoEmpresa.DEPOSITO],
      requiredPermission: ['CONFIGURACOES_APLICATIVOS_ATALHOS_VER', 'CONFIGURACOES_APLICATIVOS_ATALHOS_EDITAR'],
      title: 'Aplicativos e atalhos',
      urls: [
        { title: 'Configurações', url: '/page/config/aplicativos-atalhos' },
        { title: 'Aplicativos e atalhos' }
      ]
    }
  },
  {
    path: 'clicktv',
    loadChildren: () =>
      import('./clicktv/clicktv.routes').then((m) => m.CLICKTV_ROUTES),
  },
  {
    path: 'links',
    loadChildren: () =>
      import('./links/links.routes').then((m) => m.LINKS_ROUTES),
  },
  {
    path: 'config/email-servidor',
    component: EmailServidorComponent,
    canActivate: [permissionGuard],
    data: {
      ...GRAFICA_ROUTE_DATA,
      requiredPermission: ['CONFIG_EMAIL'],
      title: 'Servidor de E-mail',
      urls: [
        { title: 'Configurações', url: '/dashboards/dashboard1' },
        { title: 'Servidor de E-mail' }
      ]
    }
  }
];
