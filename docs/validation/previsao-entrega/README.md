# Previsão de entrega — etapa 2

Branch: `feature/previsao-entrega-pedido-etapa-2`. Contratos e regras de domínio: repositório irmão, `clickmanager-backend/docs/domains/pedido-previsao-entrega.md`.

## Integração entregue

- Configurações → Pedidos (`/page/config/pedidos`), protegida por `PEDIDOS_CONFIGURAR`. GET/PUT de configurações existentes, limites e mensagens do contrato; mudanças afetam pedidos novos. Falha de leitura mantém erro/retry, sem apresentar defaults como carregados.
- Pedido novo por produto/serviço e conversões de rascunho/orçamento: `PedidoPrevisaoFormComponent` compartilhado, calendário e horário. Envia AUTOMATICA com snapshot, EXPLICITA com offset, ou SEM_PREVISAO. A prévia automática não é enviada como data explícita. Datas passadas exigem confirmação; voltar ao padrão é uma ação explícita. Orçamentos/rascunhos não recebem prazo próprio.
- Edição por `PedidoPrevisaoDialogComponent`: PATCH com versão esperada e data explícita ou null. Em 409 preserva o valor digitado, bloqueia nova gravação até recarregar e exige novo clique consciente em Salvar; revalida o status atualizado.
- `PedidoPrazoIndicadorComponent` único em detalhe, lista e Kanban: texto, ícone e data/hora exata em Brasília, sem depender de hover, sem piscar ou colorir o card inteiro. Conclusão sem horário histórico não inventa um instante. Cancelado tem apresentação neutra distinta.
- `PedidoPrazoRelogio`: um timer por tela, próximas fronteiras do backend, cleanup e revalidação ao retomar a aba. Consultas de revalidação usam o `SILENT_REQUEST` existente; no detalhe preservam campos comerciais em edição.
- Filtro de prazo e ordenação por previsão usam o backend antes de paginação/contagem. Integração com DataTable, KanbanBoard e painel mobile existentes; troca de consulta reinicia páginas/colunas e descarta respostas obsoletas. Carregamento progressivo e reordenação após drag and drop preservados. Busca textual continua local.
- Guards, menus, atalhos e ações exigem permissões canônicas de Pedido. Não houve concessões automáticas a perfis customizados; sua revisão administrativa é pendência de disponibilização.

## Contratos acrescentados no backend

`GET /api/comercial/pedidos` aceita `prazo` e `sort=previsaoEntrega,asc|desc`. Valores do filtro: DENTRO_DO_PRAZO, PROXIMO_DO_PRAZO, ATRASADO (inclui críticos), ATRASO_CRITICO, PRODUCAO_CONCLUIDA e SEM_PREVISAO (previsão nula em qualquer status). Nulos ficam por último nas duas direções; ID desempata.

`prazo` do resumo/detalhe acrescenta `situacao`, `referenciaEm` e `proximaMudancaEm`. A página acrescenta os dois últimos campos considerando também registros fora da página/filtro temporal. O frontend apresenta a situação enviada; não recalcula faixas pela data do calendário. Edição e criação usam os contratos da etapa 1, sem endpoints paralelos.

## Verificação automatizada

- Build de produção: `npm run build:prod`, aprovado (avisos existentes de Sass/CommonJS).
- Rodada final focada em lista, beta list, editor, integração prazo/Kanban, serviço comercial, configuração, formulário/diálogo e timezone: **132 testes aprovados**, ChromeHeadless, configuração `application-theme`. Inclui conversões, versão/409, modos de criação, erro/retry, datas civis/offset, horário inexistente, filtros/ordenação, respostas obsoletas e limpeza do relógio.
- Rodada comercial ampliada: 449 testes, 448 aprovados e uma falha assíncrona `NG0205: Injector has already been destroyed`, originada em `MatAutocompleteTrigger.openPanel` após teardown. Reproduzida na baseline original `6fecc79` sem a funcionalidade: 437 testes, 436 aprovados e a mesma pilha. A atribuição do runner varia entre testes de lista; não foi declarada resolvida nem alterado o autocomplete fora do escopo.
- Backend: 47 testes, 45 aprovados e as duas falhas arquiteturais preexistentes identificadas nominalmente na documentação de domínio; quatro testes PostgreSQL aprovados. Build aprovado; comparação com baseline sem novas arestas de dependência.

## Conferência visual

Chrome real, build de produção local, dados fictícios e APIs interceptadas; navegador em **Pacific/Honolulu**, apresentação de previsão em **America/Sao_Paulo**. Viewports 1440×1000 e 390×1000. Não se acessou uma empresa real.

Capturas revisadas: configuração, listagem, criação e detalhe nas duas larguras; Kanban desktop; painel de filtros, calendário, edição e conflito 409 mobile. Arquivos PNG neste diretório. Ajustado alinhamento de calendário/horário e removido spinner global das revalidações temporais usando o mecanismo existente. Não houve overflow horizontal da página nas medidas coletadas; Kanban mantém sua rolagem horizontal interna.

`medidas.json` contém a inspeção automática do shell completo. Seus apontamentos de hierarquia de títulos (PageCard usa h6), sombras, espaçamento e superfícies incluem padrões preexistentes mantidos para respeitar a estrutura do app. Não representa aprovação integral do shell por um checklist de design. A conferência visual não substitui testes automatizados, uso em dispositivo físico ou auditoria de acessibilidade com leitor de tela.

## Limites e próxima etapa

Sem worker, geração/envio de notificações, push, merge ou deploy. Sem migration nesta etapa. Permanecem o ensaio integrado em homologação e a revisão dos perfis customizados antes da disponibilização. A base para etapa 3 inclui cálculo canônico, snapshots, revisão/versão e próximas fronteiras; worker, destinatários com autorização efetiva, deduplicação concorrente e invalidação de avisos devem integrar o módulo de notificações existente.
