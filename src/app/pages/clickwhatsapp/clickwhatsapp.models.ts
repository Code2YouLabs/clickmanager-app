export type Fase = 'PENDENTE' | 'RESERVADA' | 'CHAMADA_INICIADA' | 'ACEITA' | 'INCERTA' | 'EXPIRADA' | 'CANCELADA' | 'FALHA';
export type Confirmacao = 'NAO_CONFIRMADA' | 'ACEITA_PROVEDOR' | 'CONFIRMADA_SERVIDOR' | 'ENTREGUE' | 'LIDA';

export interface Preferencia {
  pausada: boolean;
  versao: number;
  quarentena: boolean;
  motivo: string | null;
}
export interface Estado {
  observado: 'DESCONHECIDO' | 'AUSENTE' | 'FECHADA' | 'CONECTANDO' | 'ABERTA';
  observadoEm: string | null;
  motivo: string | null;
}
export interface Direito {
  global: boolean;
  local: boolean;
  revisaoGlobal: number;
  revisaoLocal: number;
  revisaoEmpresa: number;
}
export interface AcoesPermitidas {
  habilitarDireito: boolean;
  desabilitarDireito: boolean;
  criarConexao: boolean;
  provisionar: boolean;
  gerarQr: boolean;
  reconciliar: boolean;
  consultarWebhook: boolean;
  configurarWebhook: boolean;
  pausarEnvios: boolean;
  retomarEnvios: boolean;
  desconectar: boolean;
  enviarMensagem: boolean;
  consultarHistorico: boolean;
}

export type SituacaoProvisionamento = 'NAO_PROVISIONADA' | 'EM_ANDAMENTO' | 'PROVISIONADA' | 'DESCONHECIDA';
export interface Configuracao {
  configurarAutomacoes?: boolean;
  acoesPermitidas: AcoesPermitidas;
  provisionamento: { situacao: SituacaoProvisionamento } | null;
  direito: Direito;
  aplicacaoAutorizada: boolean;
  permissoes: { habilitar: boolean; configurar: boolean; enviar: boolean; consultar: boolean };
  conexao: string | null;
  preferencia: Preferencia | null;
  estado: Estado | null;
  motivos: string[];
}
export interface Mensagem {
  id: string;
  conexao: string;
  fase: Fase;
  confirmacao: Confirmacao;
  criadaEm: string;
  validaAte: string;
  aceitaEm: string | null;
  servidorEm: string | null;
  entregueEm: string | null;
  lidaEm: string | null;
  erro: string | null;
}
export interface ItemHistorico {
  mensagem: Mensagem;
  destinatario: string | null;
  nomeCliente: string | null;
  clienteId: number | null;
  tipoOrigem: 'AVULSA' | 'PEDIDO_MANUAL' | 'ORCAMENTO_MANUAL' | 'PEDIDO_AUTOMATICO' | 'NAO_IDENTIFICADA';
  conteudoDisponivel: boolean;
}
export interface Detalhe {
  mensagem: Mensagem;
  destinatario: string | null;
  texto: string | null;
  conteudoDisponivel: boolean;
}
export interface Tentativa {
  id: string;
  numero: number;
  resultado: string;
  chamadaIniciadaEm: string | null;
  respondidaEm: string | null;
  erro: string | null;
}
export interface Resumo {
  inicio: string;
  fim: string;
  fuso: string;
  calculadoEm: string;
  mensagens: { total: number; aceitas: number; entregues: number; lidas: number; falhas: number; backlogAtual: number; incertasAtuais: number };
  conexao: string | null;
  preferencia: Preferencia | null;
  estado: Estado | null;
}
export interface Periodo { inicio: string; fim: string }
export interface Filtro extends Periodo { fase: Fase | ''; pagina: number; tamanho: number }
export interface Qr { situacao: 'DISPONIVEL' | 'INDISPONIVEL' | 'JA_CONECTADA'; imagem: string | null; expiraEm: string | null }
export type Webhook = 'NAO_CONFIGURADO' | 'CONFIRMADO' | 'DIVERGENTE' | 'INCERTO' | 'REJEITADO';
export interface OperacaoEnvio {
  readonly chave: string;
  readonly corpo: Readonly<{ numero: string; texto: string; expiraEm: string; clienteId?: number }>;
}
export function novaOperacao(numero: string, texto: string, agora = Date.now(), clienteId?: number): OperacaoEnvio {
  return Object.freeze({
    chave: crypto.randomUUID(),
    corpo: Object.freeze({ numero, texto, ...(clienteId ? { clienteId } : {}), expiraEm: new Date(agora + 3600_000).toISOString() }),
  });
}

export const FASES: Record<Fase, string> = {
  PENDENTE: 'Na fila', RESERVADA: 'Reservada', CHAMADA_INICIADA: 'Envio iniciado',
  ACEITA: 'Aceita', INCERTA: 'Resultado incerto', EXPIRADA: 'Expirada', CANCELADA: 'Cancelada', FALHA: 'Falha',
};
export const CONFIRMACOES: Record<Confirmacao, string> = {
  NAO_CONFIRMADA: 'Sem confirmação', ACEITA_PROVEDOR: 'Aceita pelo provedor', CONFIRMADA_SERVIDOR: 'Confirmada pelo servidor',
  ENTREGUE: 'Entregue', LIDA: 'Lida',
};
export const ESTADOS: Record<Estado['observado'], string> = {
  ABERTA: 'Conectada', FECHADA: 'Desconectada', AUSENTE: 'Instância ausente',
  CONECTANDO: 'Conectando', DESCONHECIDO: 'Estado precisa ser atualizado',
};
export const WEBHOOKS: Record<Webhook, string> = {
  NAO_CONFIGURADO: 'Não configurado', CONFIRMADO: 'Confirmado', DIVERGENTE: 'Configuração divergente',
  INCERTO: 'Não foi possível confirmar', REJEITADO: 'Configuração recusada',
};

const ERROS: Record<string, string> = {
  ACESSO_NEGADO: 'Você não tem acesso a esta ação.',
  PERMISSAO_NEGADA: 'Você não tem acesso a esta ação.',
  DIREITO_INATIVO: 'O ClickWhatsApp está desabilitado para a empresa.',
  APLICACAO_BLOQUEADA: 'O ClickWhatsApp está indisponível neste ambiente.',
  ENVIOS_PAUSADOS: 'Os envios estão pausados.',
  CONEXAO_INACESSIVEL: 'A conexão não está disponível.',
  IDEMPOTENCIA_CONFLITO: 'Esta solicitação já tem outros dados registrados.',
  IDEMPOTENCIA_AUTORIA_CONFLITO: 'Esta solicitação já está vinculada a outro usuário.',
  PREFERENCIA_CONFLITO: 'A configuração foi alterada em outra sessão.',
  CONEXAO_NAO_VIGENTE: 'A conexão ativa mudou. Atualize a configuração.',
  REQUISICAO_INVALIDA: 'Confira os dados informados.',
  PERIODO_INVALIDO: 'Escolha um período válido de até 93 dias.',
  SAIDA_CAPACIDADE: 'A fila atingiu a capacidade do sistema. A solicitação não foi registrada.',
  CHAVE_MENSAGEM_INVALIDA: 'O serviço de mensagens está temporariamente indisponível.',
  CONTEUDO_INDISPONIVEL: 'O conteúdo desta mensagem está indisponível.',
  CLICKWHATSAPP_INDISPONIVEL: 'O ClickWhatsApp está temporariamente indisponível.',
  CLIENTE_INACESSIVEL: 'O cliente selecionado não está disponível.',
  CLIENTE_TELEFONE_DIVERGENTE: 'O telefone do cliente mudou. Selecione o cadastro novamente.',
  DESTINATARIO_INVALIDO: 'Informe um número internacional com código do país.',
  VALIDADE_INVALIDA: 'A validade da solicitação terminou ou está fora do limite.',
  COMANDO_INVALIDO: 'Confira o número e o tamanho da mensagem.',
  RESULTADO_INCERTO: 'Não foi possível determinar com segurança o resultado desta tentativa.',
  ERRO_PROVEDOR_EVIDENCIADO: 'O WhatsApp registrou um erro nesta mensagem.',
  POLITICA_REVOGADA: 'A solicitação foi cancelada após uma alteração de acesso.',
};
export function falha(erro: unknown): { status: number; codigo: string; mensagem: string } {
  const e = erro as { status?: number; error?: { codigo?: string } } | null;
  const status = e?.status ?? -1;
  const codigo = e?.error?.codigo ?? '';
  const porStatus: Record<number, string> = {
    0: 'A conexão foi interrompida. Não foi possível confirmar a resposta.',
    400: 'Confira os dados informados.', 401: 'Sua sessão precisa ser renovada.',
    402: 'O acesso operacional da empresa está bloqueado.', 403: 'Você não tem acesso a esta ação.',
    404: 'O registro não está disponível.', 409: 'O estado mudou. Atualize a página antes de continuar.',
    503: 'O ClickWhatsApp está temporariamente indisponível.',
  };
  return { status, codigo, mensagem: ERROS[codigo] ?? porStatus[status] ?? 'Não foi possível concluir esta operação.' };
}
export function motivo(codigo: string): string {
  return ERROS[codigo] ?? 'A operação precisa de atenção. Consulte o estado atual.';
}

export type ResultadoInvestigacao = 'RESOLVIDA_COM_EVIDENCIA' | 'PERMANECE_INCERTA' | 'EVIDENCIA_CONTRADITORIA' | 'SEM_TRANSMISSAO' | 'INVESTIGACAO_INDISPONIVEL';

export interface OcorrenciaOperacional {
  podeInvestigar: boolean;
  ocorrencia: {
    mensagem: string;
    tentativa: string;
    iniciadaEm: string;
    fase: Fase;
    resultado: ResultadoInvestigacao;
    motivo: string;
    evidencia: { estado: string; recebidaEm: string } | null;
    historico: { registradaEm: string; ator: number; resultado: ResultadoInvestigacao; motivo: string; anterior: string; posterior: string }[];
  };
}

export interface ItemOcorrencia {
  mensagem: string;
  conexao: string;
  tentativa: string;
  iniciadaEm: string;
  fase: Fase;
}

export interface PaginaConversas<T> { itens: T[]; temMais: boolean }
export interface Conversa { id: string; ultima: ItemHistorico; previa: string | null }
export interface DestinatarioConversa { numero: string; nome: string; clienteId?: number }
