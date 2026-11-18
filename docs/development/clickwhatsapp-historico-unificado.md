# ClickWhatsApp — Histórico unificado na Visão geral

## Base, escopo e responsabilidade

Base limpa: `fix/clickwhatsapp-confirmacao-conexao` / `059b90e40a246a0188158dbea7091bffbbba73ad`. Branch: `feature/clickwhatsapp-historico-unificado`, sem merge/push. Backend parte de b627859c e fornece consulta unificada paginada. Não havia AGENTS.md no workspace/ancestrais. Foram consultadas arquitetura/relatórios ClickWhatsApp, padrões DataTable/painel lateral e fluxo Git. Skill frontend-design aplicada respeitando os componentes, tipografia, cores e espaçamentos existentes.

Visão geral concentra indicadores e histórico operacional. Mensagens mantém conversas/composição. Automações fica exclusivamente com os seis acontecimentos, configurações, templates, variáveis e editor. Configurações mantém conexão/habilitação/preferências. Nenhuma alteração no aviso de validade, assinatura, billing, estilos globais, header ou navegação inferior.

## Componente e contratos

`HistoricoUnificadoComponent` é standalone e encapsula somente consulta/estado visual. Usa o DataTable compartilhado, Material Sort/Paginator, StatusBadge e `openMobileSidePanel`. Não envia mensagens ou aciona automações.

`GET /api/clickwhatsapp/historico` recebe inicio/fim, pesquisa, tipo, situacao, acontecimento, motivo, page/size, sort/direction e referencia. DTOs locais RegistroHistorico e PaginaHistorico correspondem a HistoricoUnificado.Item/Pagina. O servidor realiza união, deduplicação, busca, filtros, ordenação e paginação; o App não junta páginas/fontes e não inventa mensagens para ocorrências.

`GET /api/clickwhatsapp/historico/{id}` atualiza o detalhe da ocorrência sem mensagem. Mensagens reaproveitam os endpoints/detalhe/tentativas existentes; INCERTA pode consultar evidências existentes somente por GET, sem investigação ou liberação automática.

O identificador lógico de uma automação é preservado quando ela gera mensagem. Uma ocorrência sem mensagem aparece Não enviada, e o detalhe informa se a preparação segue pendente ou foi encerrada. Só a mensagem associada determina sua situação real. Motivo desconhecido/ausente é apresentado como Motivo não informado, sem converter falha técnica em entrega comprovada.

## Interação

- Histórico abaixo da situação operacional/alertas; período independente dos indicadores, padrão últimos 7 dias. O fim padrão inclui o minuto atual; o corte temporal do servidor impede incluir operações posteriores à consulta.
- Busca global com debounce de 350 ms do DataTable, tamanho mínimo 3 como Conversas, validação discreta e cancelamento HTTP para evitar respostas antigas. Alterar pesquisa reinicia página e preserva filtros.
- Painel lateral de filtros: Hoje/7/30 dias ou intervalo personalizado, Tipo, Situação, Acontecimento apenas quando Automática e Motivo seguro retornado pelo servidor. Indicador de filtros ativos, Limpar filtros e cancelamento sem aplicar. Ordenação permanece ao limpar.
- Colunas: Data, Tipo, Cliente/destinatário, Pedido, Situação, Motivo, Ações. Data/tipo/pedido/situação são ordenáveis no servidor, asc/desc; início Data desc. Nome/máscara não recebem ordenação artificial sem chave global segura; ações não são ordenáveis.
- Paginação no servidor, 20 por padrão e opções 50/100 suportadas pelo componente; total e corte temporal preservados nas páginas seguintes. Mudanças de filtros/sort reiniciam a consulta.
- Nome autorizado por referência exata; fallback para telefone mascarado, sem escolher outro cliente apenas por telefone compartilhado. Telefone completo continua restrito ao detalhe já autorizado do backend.
- Registro de mensagem emite seleção para o detalhe existente. Ocorrência sem mensagem tem painel lateral próprio, com Pedido, acontecimento, data, motivo, etapa, validade e encerramento. Não consulta ou inventa tentativas inexistentes. Fechar preserva busca/filtros/ordenação/página/scroll.
- Vazio, loading, erro HTTP, permissão restrita e pesquisa de legado ainda não indexado têm apresentação explícita.

Em mobile, usa o template de itens do DataTable, priorizando cliente/máscara, data, situação e acesso ao detalhe, com informações adicionais abaixo. Sem scroll infinito ou tabela comprimida horizontalmente. Painéis usam largura/altura responsivas e impedem empilhamento pelo fluxo; navegação/destruição cancela requests e fecha o painel.

## Indicadores e limpeza

Os sete indicadores continuam usando o resumo e os cálculos existentes do núcleo. Ocorrências sem mensagem não são somadas a Mensagens ou backlog de mensagens. A soma visual de preparações ao backlog introduzida no ajuste anterior foi removida conforme o requisito desta entrega; endpoints/cálculos do resumo não foram modificados.

Automações removeu Últimas ocorrências, listagem/links de mensagens de processamento e solicita `incluirHistorico=false`. API legada/dados permanecem no backend. Contador, seis acontecimentos, estado ativo/inativo, atualização, editor lateral, variáveis, prévia, templates, ativação e tratamento de erro preservados. Testes receberam novas expectativas apenas para a seção retirada e o parâmetro explícito; testes do editor continuam executados.

## Segurança, atualização e retenção

O backend mantém autoridade sobre aplicação, Empresa autenticada, vínculos históricos, permissões e conteúdo. Não há IDs empresariais configuráveis no body nem credenciais no navegador.

Migration backend nova: 155-clickwhatsapp-historico.yaml. Bases antigas podem precisar da preparação offline descrita no relatório backend de mesmo nome. Ela não ocorre no GET nem no browser; a listagem avisa quando a pesquisa legada ainda não está completa. Não reidrata texto/telefone já expurgado nem amplia retenção. Origem sem comprovação fica Outra.

Antes de liberar a atualização em um ambiente real: backup/chave preservados, migration aplicada, projeções de legado preparadas por operador autorizado, compatibilidade da configuração existente e smoke test com dados de teste. Nenhum desses passos foi executado em produção ou nos bancos locais de negócio nesta entrega.

## Verificação

Testes Angular ClickWhatsApp cobrem tabela, vazio/loading/erro, busca debounce e cancelamento, filtros/limpeza, sort asc/desc, paginação, detalhe de mensagem e ocorrência, motivo desconhecido, permissão e preservação do estado. Regressões mantêm testes do editor, conversas, configuração e indicadores. Aviso intacto conferido também pelo escopo do diff: nenhum arquivo global/billing/assinatura modificado.

Navegador isolado com API simulada/dados fictícios: 1440, 1024, 820, 390 e 360 px, sem transbordamento horizontal. Screenshots: tabela mista, filtros, detalhe de ocorrência sem mensagem; adicionalmente vazio/loading/erro, permissões restritas, filtros combinados aplicados, ordenação, página 2, detalhe de mensagem e Automações sem histórico. Diretório de evidências local: `/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-historico-unificado`.

Sem envio real, chamada remota Evolution, automação real, alteração de regra de envio, `.env`, push ou deploy. O backend e a sessão WhatsApp de uso local não foram reiniciados/modificados.

Resultado: **119 testes Angular aprovados**; build de desenvolvimento e TypeScript app/spec noEmit aprovados; git diff check aprovado. Backend correspondente: 92 testes de integração/saída/arquitetura ClickWhatsApp e 5 de arquitetura Clientes aprovados, build JDK 21 aprovado. O backend possui procedimento offline testado para preparar a pesquisa de bases anteriores, sem inserir mensagem ou iniciar workers.
