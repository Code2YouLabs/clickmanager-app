# Pedidos — painel de filtros e ordenação compartilhada

18/11/2026. Base limpa App: fix/clickwhatsapp-icones-confirmacao / db92071. Branch: feature/pedidos-filtros-painel-ordenacao. Sem AGENTS.md no workspace/ancestrais. Skill frontend-design aplicada mantendo o design system existente, DataTable, painel lateral e responsividade.

## Padrão compartilhado

O componente se chama **painel lateral** (drawer). DataTable, por meio de ListFilterBar, passa a oferecer um ícone junto à pesquisa que abre esse painel no desktop/mobile, sem accordion. Portanto as telas que já usam o componente compartilham a apresentação; os filtros e regras de negócio continuam pertencendo à tela consumidora.

Reutiliza openMobileSidePanel, foco/trap/fechamento, rascunho de filtros, Aplicar, limpar e chips ativos. Seleções só são confirmadas ao aplicar; sair descarta o rascunho. Alternar viewport fecha o painel, sem aplicar seleções incompletas. No mobile, o ícone permanece junto à pesquisa e ações extras, como Biblioteca de Produtos, ocupam a linha seguinte. Não altera o header/navegação globais. Modos flat/inline explícitos permanecem compatíveis.

Tipos de filtro compartilhados novos: date e text, além de select/multi-select. Valores tipados, `false`, zero, arrays e templates de domínio continuam preservados. Ícone tem aria-label com contagem, tooltip e indicação visual de filtros ativos. Não duplica acionadores no cabeçalho.

## Pedidos

ComercialListComponent usa filtros combináveis:

- Criação de/até e previsão de entrega de/até (datas inclusivas por dia).
- Cliente, pelo nome do snapshot comercial, aplicado pelo servidor.
- Status.
- Prazo de entrega e acompanhamento já existentes, preservados.
- Incluir entregues e cancelados, para consulta conjunta explícita de encerrados.

Por padrão, mostra pedidos não entregues e não cancelados, incluindo PRONTO, e ordena por criação decrescente. Selecionar explicitamente ENTREGUE/CANCELADO ou incluir encerrados permite consultá-los. A semântica antiga do filtro de acompanhamento do dashboard não foi alterada: ele continua excluindo produção concluída quando escolhido.

Ordenação por Número, Data de criação, Cliente, Previsão de entrega, Status e Total, asc/desc no servidor, antes da paginação. Coluna Ações não é ordenável. Mapeia chaves visuais para whitelist do backend (`numero`, `createdAt`, `clienteNome`, `previsaoEntrega`, `status`, `total`). Previsão sem data permanece ao final. Filtros e sort são preservados na URL; alterar a consulta reinicia a paginação e cancela respostas anteriores.

Lista e Kanban recebem as mesmas datas/cliente/status. Kanban inicial não abre colunas encerradas sem seleção explícita. Filtros de prazo, atualização ao cruzar fronteiras temporais, fluxo de primeiro Pedido, paginação mobile progressiva e ações comerciais continuam cobertos por regressões.

A pesquisa livre já existente continua restrita à página/cards carregados e mantém aviso explícito. Não se confunde com o filtro Cliente, que consulta todo o conjunto no backend. Não foi implementada busca global fictícia ou sort local dos dez resultados da página.

O endpoint existente GET /api/comercial/pedidos recebeu parâmetros opcionais no backend; sem endpoint/migration nova. Para usar os filtros novos, carregar as versões correspondentes do backend/App. Nenhuma configuração operacional nova.

## Verificações

267 testes aprovados: ListFilterBar, DataTable, integração PageCard, ComercialList, consulta temporal/relógio de prazo, GraficaProdutoService, Produtos mobile e ClickWhatsApp. Expectativas visuais antigas foram adaptadas ao painel/ícone; asserções de tipos, autorização, callbacks únicos, cancelamento, paginação, foco, templates e responsividade continuam executadas.

Backend: 40 testes de Pedido aprovados em PostgreSQL descartável/serviço/segurança. A suíte arquitetural ampliada tem uma falha preexistente de dashboard Gráfica → persistência de Orçamento, reproduzida no checkout da base, sem relação com os arquivos alterados. Detalhes no relatório backend de mesmo nome.

Build de desenvolvimento com NG_BUILD_MAX_WORKERS=2 aprovado, com avisos Sass preexistentes; TypeScript app/spec noEmit e git diff --check aprovados. Navegador isolado, APIs fictícias: 1440/1024/820/390/360 px sem overflow; lista ordenada, ícone, painel com quatro datas, cliente, aplicação dos filtros e sort por Total conferidos. Evidências locais em `/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/pedidos-filtros-painel`.

Somente mudanças no componente compartilhado, suas regressões e na listagem/serviço comercial. Aviso de assinatura, cobrança e estilos globais intactos. Sem envio, automação real, mudança de sessão WhatsApp, produção, deploy ou push.

## Correção visual do painel — 18/11/2026

O layout interno do overlay estava dentro do breakpoint mobile, deixando o desktop herdar a disposição horizontal dos filtros e perder o espaçamento do cabeçalho/rodapé. Os estilos específicos de `.list-filter-mobile-panel` agora se aplicam em todos os tamanhos: uma coluna, cabeçalho alinhado, margens internas, corpo com rolagem e botão Aplicar no rodapé. Mantém a largura desktop de 560 px e tela inteira no mobile, sem mudar os filtros, rascunhos ou regras de negócio.

Verificação da correção: 53 testes de ListFilterBar/DataTable/PageCard aprovados; build development aprovado. Navegador isolado em 1440/1024/820/390/360 px: validado display flex do painel, uma coluna de campos, padding mínimo de 16 px, largura desktop de até 560 px, rodapé no limite inferior e ausência de overflow horizontal. Aplicação dos filtros e sort continuam verificados com APIs simuladas.
