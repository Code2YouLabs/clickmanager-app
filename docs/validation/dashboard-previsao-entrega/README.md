# Previsão de entrega no dashboard

Implementado na branch `feature/dashboard-previsao-entrega-pedido` nos repositórios app e backend.

## Composição e integração

- `PedidoPrazoDashboardComponent` reutiliza `SectionCardComponent`, `MetricCardComponent` (opções aditivas compact/accentColor) e `PedidoPrazoIndicadorComponent`. Os cards anteriores mantêm seu padrão.
- Quatro indicadores operacionais: dentro, próximos, atrasados (inclui críticos) e sem previsão. Atalho para apenas críticos e até cinco prioridades.
- O app lê `GET /api/comercial/pedidos/indicadores-prazo` do owner canônico. Não calcula totais sobre pedidos carregados.
- Visível com `PEDIDOS_VER` e capabilities `PEDIDOS`/`GRAFICA`, pois a listagem atual de destino pertence à área Gráfica. O backend não depende de segmento.
- Os cliques enviam `prazo`, `somenteAbertos=true` e `sort=previsaoEntrega,asc`. O filtro de acompanhamento é visível e removível na listagem; acompanha lista, paginação e Kanban.
- As prioridades abrem `/page/comercial/pedidos/:id`. Conclusão de produção e cancelamento saem do universo operacional, inclusive pedidos sem previsão.
- `PedidoPrazoRelogio` revalida nas fronteiras e ao retomar a aba. O botão Atualizar do dashboard inclui o novo bloco. Solicitações anteriores são canceladas; erros não aparecem como zeros e retiram dados antigos, com retry.
- Datas usam o indicador compartilhado com fuso de Brasília. Sem migrations e sem alterações no sistema de alertas.

## Validação

- 27 testes Angular aprovados: widget, navegação, cancelamento de respostas antigas, falha de acesso, timer, composição desktop/mobile, sincronização do refresh, filtros de lista/Kanban e parâmetros HTTP.
- A fixture preexistente de dashboard mobile recebeu a permissão canônica `PEDIDOS_CADASTRAR`, coerente com as expectativas existentes para Novo pedido; o código de autorização não foi alterado.
- `npm run build:prod` aprovado, com avisos preexistentes de dependências CommonJS/budgets.
- Backend: 41 testes de negócio/API aprovados, incluindo PostgreSQL real em schemas descartáveis; pacote compilado. ArchUnit mantém duas falhas preexistentes, sem novas dependências na comparação com o baseline.
- Revisão visual em 1440 e 390px, Chrome com API simulada e dados fictícios. Sem overflow horizontal ou erros no console. Timezone do navegador Pacific/Honolulu para conferir a apresentação explícita em Brasília.
- As capturas não substituem um ensaio integrado em homologação. Nenhum dado operacional foi criado ou alterado para esta validação.

[Desktop](dashboard-1440.png) · [Mobile](dashboard-390.png)

## Ajuste de disposição

Previsão de entrega fica ao lado de Etapas dos pedidos em desktop; Receita por forma de pagamento ocupa a linha seguinte inteira.
Os indicadores e prioridades se adaptam à largura da coluna por container queries. No celular os blocos ficam empilhados,
com etapas antes dos prazos e receita ao final. Build de produção e os 13 testes existentes do dashboard aprovados.
Conferência em 1440 e 390px com API simulada, sem overflow horizontal nem erros no console.

## Harmonização dos indicadores

Etapas de pedidos e status dos orçamentos passaram a reutilizar `MetricCardComponent` em modo compacto, como a previsão.
Os dois blocos usam duas colunas, espaçamento de 12px, padding de 14px, rótulos de 14px, números de 26px com algarismos tabulares,
detalhes de 13px, borda lateral de 5px e ícones de 24px. Rótulo, quantidade e detalhe têm a mesma ordem em desktop e mobile.
Foram retirados os estilos anteriores de etapas que conflitavam com o componente compartilhado. Navegação, valores e filtros preservados.
O subtítulo de previsão foi reduzido para alinhar a hierarquia dos cabeçalhos.
26 testes existentes aprovados e build de produção aprovado. Conferência visual com API simulada em desktop/mobile, sem overflow nem erros no console.

## Disposição final das seções

Previsão de entrega ocupa uma linha inteira, com quatro indicadores lado a lado quando há espaço.
Abaixo, Etapas dos pedidos e Status dos orçamentos ficam lado a lado; Receita por forma de pagamento vem por último.
No celular, a previsão antecede as etapas e os orçamentos, com receita ao final. Os dados continuam nos mesmos componentes e serviços.
Build de produção e 26 testes aprovados. Conferência em 1440/390px com dados fictícios, sem overflow nem erros de console.

## Atalhos no cabeçalho

O botão isolado Novo pedido e o painel lateral foram substituídos por um botão Atalhos contornado,
com ícone e menu Angular Material compartilhado entre desktop e mobile. O gráfico passa a ocupar toda a largura.
O menu inclui Novo pedido, Rascunhos e SmartCalc conforme as permissões/capabilities já existentes;
sem ações autorizadas, o botão é ocultado. Rascunhos usa o ícone Material `drafts`.

15 testes do dashboard aprovados, incluindo navegação pelos três destinos, ocultação sem permissão e filtro de SmartCalc.
Build de produção aprovado. Revisão visual em 1440/390px com API simulada, sem overflow nem erros no console;
Escape fecha o menu nos dois tamanhos. Nenhuma API, permissão ou regra de negócio alterada.

[Menu desktop](atalhos-desktop.png) · [Menu mobile](atalhos-mobile.png)

## Receita logo abaixo da evolução comercial

Receita por forma de pagamento foi movida para imediatamente abaixo de Evolução comercial, ambas em linhas inteiras.
A ordem também foi aplicada no celular: evolução, receita, previsão e painéis de status.

## Ações dos gráficos no cabeçalho

Os botões Ver gráfico foram movidos para o slot de ações de `SectionCardComponent`, em Evolução comercial e Receita por forma de pagamento.
Ambos usam Material stroked button, ícone de ampliar e o mesmo estilo Sass compartilhado, com área de toque de 44px no celular.
Os botões e os estilos antigos dos rodapés foram removidos. A ação da evolução chama a instância do widget para preservar os filtros;
a receita mantém seu método de navegação e o período selecionado. Cada botão tem um nome acessível específico.

Build de produção e 25 testes aprovados, incluindo ação no cabeçalho, filtros e navegação detalhada.
Capturas com API simulada em 1440/390px confirmam os dois botões nos cabeçalhos, sem overflow ou erros de console.

[Evolução desktop](grafico-topo-evolucao-1440.png) · [Receita mobile](grafico-topo-receita-390.png)

## Verificação consolidada antes do commit

48 testes do app aprovados cobrindo todos os widgets do dashboard, composição desktop/mobile, filtros de prazo de lista/Kanban e serviço HTTP.
Build de produção aprovado. Backend validado com 41 testes de negócio/API, incluindo PostgreSQL real, e pacote compilado.
