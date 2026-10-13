import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { PRIMEIRO_PEDIDO_JORNADA, PRIMEIRO_PEDIDO_PERMISSOES } from 'src/app/shared/jornadas/jornada.constants';
import { AjudaSecao } from './ajuda.models';

const grafica = [TipoEmpresa.GRAFICA];
const deposito = [TipoEmpresa.DEPOSITO];
const todosSegmentos = [TipoEmpresa.GRAFICA, TipoEmpresa.DEPOSITO];

export const AJUDA_SECOES: AjudaSecao[] = [
  {
    id: 'primeiro-pedido',
    titulo: 'Primeiro Pedido',
    descricao: 'Aprenda a criar uma venda e acompanhar o pedido pelo Kanban.',
    grupo: 'Comecando',
    icon: 'rocket_launch',
    allowedEmpresaTipos: grafica,
    featureKey: 'GRAFICA',
    requiredPermissions: [...PRIMEIRO_PEDIDO_PERMISSOES],
    destaque: true,
    atalhoRapido: true,
    ordemAtalho: 5,
    palavrasChave: ['tutorial', 'primeiro pedido', 'pedido', 'venda', 'kanban', 'comercial', 'primeiros passos'],
    aliases: ['tutorial-primeiro-pedido', 'primeiro-pedido-v1'],
    tutorial: {
      id: 'PRIMEIRO_PEDIDO_V1',
      jornada: PRIMEIRO_PEDIDO_JORNADA,
    },
    passos: [
      'Crie um pedido real para um cliente da gráfica.',
      'Adicione um item vendido e confirme o pedido.',
      'Acompanhe o pedido no Kanban e mova o card para concluir o tutorial.',
    ],
  },
  {
    id: 'clientes',
    titulo: 'Clientes',
    descricao: 'Cadastro e uso de clientes nos pedidos e orçamentos.',
    grupo: 'Clientes',
    icon: 'groups',
    allowedEmpresaTipos: todosSegmentos,
    atalhoRapido: true,
    ordemAtalho: 10,
    palavrasChave: ['cliente', 'cadastro', 'contato', 'documento', 'endereco'],
    passos: [
      'Cadastre nome, e-mail, telefone e documento. Endereço é opcional, mas ajuda na entrega e no atendimento.',
      'Use a busca da lista para localizar o cliente antes de criar pedidos, orçamentos ou atendimentos.',
      'Mantenha telefone e e-mail atualizados para facilitar contatos, cobranças e envio de informações.',
    ],
  },
  {
    id: 'smartcalc',
    titulo: 'SmartCalc',
    descricao: 'Como configurar e usar o cálculo de preços da gráfica.',
    grupo: 'Comercial',
    icon: 'calculate',
    allowedEmpresaTipos: grafica,
    featureKey: 'SMARTCALC',
    atalhoRapido: true,
    ordemAtalho: 20,
    palavrasChave: ['calculadora', 'preco', 'm2', 'metro quadrado', 'variacao', 'pedido'],
    passos: [
      'Cadastre produtos gráficos com variações de material, formato e cor antes de vender pelo SmartCalc.',
      'No pedido ou orçamento, selecione produto e variação; o SmartCalc mostra preço e opcionais compatíveis.',
      'Preencha quantidade e, quando o preço for por metro, largura e altura. O sistema calcula subtotal automaticamente.',
      'Marque serviços e acabamentos opcionais, como laminação, corte, arte ou instalação.',
      'Se o valor parecer incorreto, confira variação, tipo de preço e campos obrigatórios da regra escolhida.',
    ],
  },
  {
    id: 'produtos',
    titulo: 'Produtos gráficos',
    descricao: 'Manual para produtos, materiais, formatos, cores, serviços e acabamentos.',
    grupo: 'Catalogo',
    icon: 'inventory_2',
    allowedEmpresaTipos: grafica,
    featureKey: 'GRAFICA',
    atalhoRapido: true,
    ordemAtalho: 30,
    palavrasChave: ['produto grafico', 'variacao', 'material', 'formato', 'cor', 'servico'],
    itens: [
      {
        titulo: 'Como pensar o cadastro',
        detalhes: [
          'Produto é o modelo comercial; variação é a combinação técnica usada no SmartCalc e no pedido.',
          'Cada variação junta material, formato e cor. Serviços e acabamentos entram como opcionais compatíveis.',
          'A base bem cadastrada evita preço manual e reduz diferenças entre vendedores.',
        ],
      },
      {
        titulo: 'O que cadastrar antes',
        detalhes: [
          'Materiais: base física do item, como Vinil brilho, Couché 180g ou Lona.',
          'Formatos: dimensões e área útil, como A4, A3, SRA3 ou tamanhos próprios.',
          'Cores: padrão de impressão, como 4x0, 4x4 ou 1x0.',
          'Serviços e acabamentos: cobranças e complementos técnicos aplicados às variações.',
        ],
      },
      {
        titulo: 'Como aparece no pedido',
        detalhes: [
          'O usuário escolhe o produto e depois a variação compatível.',
          'A variação determina o tipo de preço e os extras disponíveis.',
          'Para itens fora do catálogo, use a descrição manual no fluxo comercial quando disponível.',
        ],
      },
    ],
  },
  {
    id: 'catalogo',
    titulo: 'Catálogo técnico da gráfica',
    descricao: 'Produtos, variações, serviços e acabamentos usados pela operação gráfica.',
    grupo: 'Catalogo',
    icon: 'category',
    allowedEmpresaTipos: grafica,
    featureKey: 'GRAFICA',
    atalhoRapido: true,
    ordemAtalho: 40,
    palavrasChave: ['catalogo', 'tecnico', 'produtos', 'variacoes', 'servicos'],
    aliases: ['catalogo-grafica'],
    itens: [
      {
        titulo: 'Produtos e variações',
        detalhes: [
          'Defina materiais, formatos e cores; cada combinação vira uma variação vendável.',
          'Os tipos de preço podem ser fixo, por metro, por quantidade/faixa ou por demanda.',
        ],
      },
      {
        titulo: 'Serviços e acabamentos',
        detalhes: [
          'Cadastre serviços adicionais e acabamentos padrão.',
          'Vincule-os às variações para que apareçam no SmartCalc e no fluxo comercial.',
        ],
      },
    ],
  },
  {
    id: 'catalogo-deposito',
    titulo: 'Catálogo do depósito',
    descricao: 'Produtos, categorias e marcas para a operação de depósito.',
    grupo: 'Catalogo',
    icon: 'category',
    allowedEmpresaTipos: deposito,
    atalhoRapido: true,
    ordemAtalho: 40,
    palavrasChave: ['catalogo', 'deposito', 'produto', 'item', 'categoria', 'marca', 'estoque'],
    aliases: ['catalogo'],
    itens: [
      {
        titulo: 'Produtos e itens',
        detalhes: [
          'Use o catálogo para organizar os itens vendidos ou controlados pelo depósito.',
          'Categorias e marcas ajudam a padronizar filtros, relatórios e localização de produtos.',
          'Quando a empresa usa o catálogo novo, as rotas de produtos, categorias e marcas ficam separadas por permissão.',
        ],
      },
      {
        titulo: 'Boas práticas',
        detalhes: [
          'Evite duplicar produtos com nomes parecidos; prefira completar categoria, marca e descrição.',
          'Revise permissões do usuário quando uma opção do catálogo não aparecer no menu.',
        ],
      },
    ],
  },
  {
    id: 'acabamentos',
    titulo: 'Acabamentos',
    descricao: 'Como cadastrar acabamentos e variações de aplicação e preço.',
    grupo: 'Catalogo',
    icon: 'auto_awesome',
    allowedEmpresaTipos: grafica,
    featureKey: 'GRAFICA',
    atalhoRapido: true,
    ordemAtalho: 50,
    palavrasChave: ['laminacao', 'verniz', 'corte', 'dobra', 'variacao'],
    itens: [
      {
        titulo: 'O que é um acabamento',
        detalhes: [
          'Acabamento é uma configuração extra aplicada ao produto, como laminação, verniz, corte especial ou dobra.',
          'O cadastro define nome, descrição e regras de preço por material, formato e tipo de aplicação.',
        ],
      },
      {
        titulo: 'Como revisar',
        detalhes: [
          'Gere variações em lote quando a mesma regra vale para vários materiais ou formatos.',
          'Ajuste exceções individualmente e evite combinações repetidas.',
          'Antes de salvar, confirme se existe pelo menos uma variação pronta.',
        ],
      },
    ],
  },
  {
    id: 'fluxo-pedido',
    titulo: 'Montar pedido ou orçamento',
    descricao: 'Como usar catálogo e SmartCalc dentro do fluxo comercial.',
    grupo: 'Comercial',
    icon: 'assignment',
    allowedEmpresaTipos: grafica,
    featureKey: 'GRAFICA',
    atalhoRapido: true,
    ordemAtalho: 60,
    palavrasChave: ['pedido', 'orcamento', 'rascunho', 'venda', 'itens'],
    aliases: ['pedidos'],
    passos: [
      'Selecione o cliente antes de adicionar itens.',
      'Clique em Adicionar produto, escolha produto e variação; o sistema mostra preço e opcionais compatíveis.',
      'Revise quantidade, medidas, valor unitário, subtotal, serviços e acabamentos.',
      'Finalize como orçamento ou pedido conforme o fluxo do cliente.',
      'Registre pagamentos e acompanhe a evolução do status quando o pedido estiver confirmado.',
    ],
  },
  {
    id: 'status-pedido',
    titulo: 'Fluxo do pedido e status',
    descricao: 'Diferenças entre pedido, orçamento, rascunho e mudanças permitidas.',
    grupo: 'Comercial',
    icon: 'sync_alt',
    allowedEmpresaTipos: grafica,
    featureKey: 'GRAFICA',
    atalhoRapido: true,
    ordemAtalho: 70,
    palavrasChave: ['status', 'pedido', 'orcamento', 'rascunho', 'producao', 'entregue'],
    itens: [
      {
        titulo: 'Visão geral',
        detalhes: [
          'Pedido segue fases como rascunho, pendente, aguardando pagamento, produção, pronto e entregue.',
          'Orçamento é um documento pré-pedido e segue para produção somente depois da aprovação.',
          'Fases finais tendem a restringir edição de dados e itens para preservar o histórico.',
        ],
      },
      {
        titulo: 'Boas práticas',
        detalhes: [
          'Revise cliente, itens e observações antes de avançar fases.',
          'Use cancelamento apenas quando o fluxo realmente não deve continuar.',
          'Pagamentos podem permanecer disponíveis mesmo em fases de consulta, conforme permissão e regra do pedido.',
        ],
      },
    ],
  },
  {
    id: 'orcamentos-deposito',
    titulo: 'Orçamentos do depósito',
    descricao: 'Como acompanhar e organizar orçamentos no segmento de depósito.',
    grupo: 'Comercial',
    icon: 'file_text',
    allowedEmpresaTipos: deposito,
    atalhoRapido: true,
    ordemAtalho: 70,
    palavrasChave: ['orcamento', 'deposito', 'comercial', 'cliente'],
    passos: [
      'Use a lista de orçamentos para localizar propostas por cliente, status ou período.',
      'Abra o detalhe para conferir informações, itens e histórico disponível.',
      'Se uma ação não aparecer, confira as permissões de orçamento do usuário.',
    ],
  },
  {
    id: 'funcionarios',
    titulo: 'Funcionários',
    descricao: 'Cadastro, edição e ciclo de vida do funcionário.',
    grupo: 'Pessoas',
    icon: 'badge',
    allowedEmpresaTipos: grafica,
    featureKey: 'funcionarios',
    atalhoRapido: true,
    ordemAtalho: 80,
    palavrasChave: ['funcionario', 'colaborador', 'afastar', 'desligar', 'readmitir'],
    itens: [
      {
        titulo: 'Estados possíveis',
        detalhes: [
          'ATIVO: funcionário em atividade normal.',
          'AFASTADO: funcionário temporariamente afastado.',
          'DESLIGADO: vínculo encerrado; dados ficam em histórico.',
        ],
      },
      {
        titulo: 'Fluxo de status',
        detalhes: [
          'Funcionário ativo pode ser afastado ou desligado.',
          'Funcionário afastado pode retornar ao trabalho ou ser desligado.',
          'Funcionário desligado pode ser readmitido, mas não deve ser editado diretamente.',
        ],
      },
      {
        titulo: 'Histórico',
        detalhes: [
          'Movimentações, salário, passagem e snapshots registram o contexto de cada alteração.',
          'Use motivos claros nas mudanças para facilitar consultas futuras.',
        ],
      },
    ],
  },
  {
    id: 'folha-pagamento',
    titulo: 'Folha de pagamento',
    descricao: 'Abrir competência, lançar valores, registrar pagamentos e fechar o mês.',
    grupo: 'Pessoas',
    icon: 'payments',
    allowedEmpresaTipos: grafica,
    featureKey: 'folhaPagamento',
    atalhoRapido: true,
    ordemAtalho: 90,
    palavrasChave: ['folha', 'pagamento', 'competencia', 'adiantamento', 'emprestimo', 'contracheque'],
    itens: [
      {
        titulo: 'Fluxo recomendado',
        detalhes: [
          'Selecione a competência do mês e revise os valores dos colaboradores.',
          'Faça lançamentos de provento, desconto, adiantamento ou empréstimo quando necessário.',
          'Registre pagamentos e feche a competência somente quando o saldo pendente estiver resolvido.',
        ],
      },
      {
        titulo: 'Status',
        detalhes: [
          'Competência pode ficar ABERTA ou FECHADA.',
          'Folha do colaborador pode aparecer como ABERTO, PARCIAL, PAGO ou FECHADO.',
        ],
      },
    ],
  },
  {
    id: 'folha-configuracao',
    titulo: 'Configuração da folha',
    descricao: 'Regra padrão de pagamento e políticas de acordos e passagem.',
    grupo: 'Pessoas',
    icon: 'tune',
    allowedEmpresaTipos: grafica,
    featureKey: 'folhaPagamento',
    atalhoRapido: true,
    ordemAtalho: 100,
    palavrasChave: ['configuracao folha', 'quinto dia util', 'dia fixo', 'passagem', 'acordos'],
    itens: [
      {
        titulo: 'Regras principais',
        detalhes: [
          'A regra de pagamento pode usar dia fixo ou quinto dia útil.',
          'Políticas de acordos controlam adiantamento, empréstimo, limite percentual, parcelas e carência.',
          'A política de passagem define se o valor não entra na folha, entra como provento ou como desconto.',
        ],
      },
    ],
  },
  {
    id: 'notificacoes',
    titulo: 'Notificações',
    descricao: 'Como visualizar, enviar e acompanhar notificações dentro do sistema.',
    grupo: 'Administracao',
    icon: 'notifications',
    allowedEmpresaTipos: todosSegmentos,
    atalhoRapido: true,
    ordemAtalho: 110,
    palavrasChave: ['notificacao', 'aviso', 'sino', 'mensagem', 'link'],
    itens: [
      {
        titulo: 'Visualização',
        detalhes: [
          'O topo do sistema mostra um resumo das notificações mais recentes.',
          'A tela de notificações exibe lista, detalhe e status de leitura do usuário logado.',
          'Quando você abre uma notificação, ela pode ser marcada como lida automaticamente.',
        ],
      },
      {
        titulo: 'Envio',
        detalhes: [
          'Enviar notificações depende de permissão específica.',
          'Use título curto, resumo objetivo e link relacionado quando a mensagem precisar levar o usuário a uma tela.',
        ],
      },
    ],
  },
  {
    id: 'billing',
    titulo: 'Assinatura e pagamentos',
    descricao: 'Status da assinatura, planos e cobranças.',
    grupo: 'Conta',
    icon: 'credit_card',
    allowedEmpresaTipos: todosSegmentos,
    palavrasChave: ['assinatura', 'pagamento', 'plano', 'boleto', 'fatura', 'cobranca'],
    passos: [
      'A tela Minha assinatura mostra status, periodicidade, valor e próxima cobrança.',
      'Pagamentos pendentes podem exibir link de boleto ou fatura quando disponível.',
      'Durante trial ou troca de plano, siga as ações exibidas na própria tela.',
    ],
  },
  {
    id: 'onboarding',
    titulo: 'Onboarding da empresa',
    descricao: 'Configuração inicial guiada para preparar a empresa gráfica.',
    grupo: 'Comecando',
    icon: 'rocket_launch',
    allowedEmpresaTipos: grafica,
    palavrasChave: ['onboarding', 'primeiro acesso', 'configuracao inicial'],
    passos: [
      'Revise dados da empresa e configurações iniciais do ambiente.',
      'Selecione materiais, formatos, cores, serviços e acabamentos padrão quando o fluxo solicitar.',
      'Proprietários podem retomar ajustes iniciais conforme as opções disponíveis no perfil ou configuração.',
    ],
  },
  {
    id: 'conta',
    titulo: 'Conta, usuários e permissões',
    descricao: 'Perfil, senha, usuários e controle de acesso.',
    grupo: 'Administracao',
    icon: 'manage_accounts',
    allowedEmpresaTipos: todosSegmentos,
    palavrasChave: ['conta', 'usuario', 'perfil', 'permissao', 'senha', 'acesso'],
    passos: [
      'Atualize seus dados em Meu Perfil quando precisar alterar nome, telefone, foto ou senha.',
      'Usuários e perfis controlam quem pode ver, criar, editar ou excluir recursos.',
      'Quando uma tela não aparecer no menu, confira segmento da empresa, módulo ativo e permissões do perfil.',
    ],
  },
  {
    id: 'faq',
    titulo: 'Dúvidas rápidas',
    descricao: 'Respostas curtas para situações comuns.',
    grupo: 'Comecando',
    icon: 'help_outline',
    allowedEmpresaTipos: todosSegmentos,
    palavrasChave: ['duvida', 'faq', 'erro', 'ajuda', 'suporte'],
    itens: [
      {
        titulo: 'Uma tela não aparece no menu',
        detalhes: [
          'Confirme se a empresa pertence ao segmento esperado para aquela tela.',
          'Verifique se o módulo está ativo no plano e se o perfil possui permissão de acesso.',
        ],
      },
      {
        titulo: 'Link de pagamento não aparece',
        detalhes: [
          'Links de pagamento ou fatura dependem do status da cobrança e dos dados retornados pelo backend.',
        ],
      },
      {
        titulo: 'Não encontrei o assunto',
        detalhes: [
          'Use a busca com outro termo ou abra um chamado de suporte pela ação da página.',
        ],
      },
    ],
  },
];
