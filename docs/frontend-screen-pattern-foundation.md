# Fundação de telas — issue #86

Implementação baseada nas decisões D1–D5 da [auditoria #85](frontend-screen-pattern-audit.md), no épico #79 e no escopo de migração futura da #87. Branch `feature/86-consolidar-componentes-base`, criada da `develop` atualizada em `6ef43c861fa523ff4159dd4e5f236ee78a146a96`.

Aplicada a [skill anthropics/frontend-design](https://www.ui-skills.com/skills/anthropics/frontend-design) para hierarquia, estados, acessibilidade e responsividade, preservando a identidade existente do ERP.

## Contratos

### Página e cadastro

`page-card` e `card-header` continuam sendo o shell. Slots de conteúdo, header e footer, rotas, ajuda e permissões existentes permanecem disponíveis. `section-card` continua compondo seções de formulário.

`PageCardAction` acrescenta ações declarativas ao footer: `id`, `label`, `disabled`, `pendingLabel`, `color`, `primary` e `type`. Uma ação `type: 'submit'` exige `form`, associado ao ID real do formulário. O submit nativo aciona apenas o handler do formulário; `footerAction` emite somente comandos `type: 'button'`. A feature continua responsável por salvar, validar e pelo destino do Voltar. Cancelar é tratado pelo PageCard e não emite comando para a tela.

Padrão de cancelamento do footer: botão contornado, texto vermelho e fundo vermelho suave, seguindo Produtos. O PageCard gera automaticamente o botão Cancelar quando recebe `formState`; a tela não declara essa ação, seu texto, cor ou handler. Intenções `cancel` antigas são normalizadas para o botão padrão, sem duplicação. A ação gerada é sempre `type: 'button'`, nunca submit. O CSS fica centralizado no PageCard. Todos os 11 pontos de descarte de formulário identificados no levantamento adotam o botão gerado, sem Cancelar projetado ou handler local. Ações desabilitadas usam o estado disabled do Material.

Comportamento de Cancelar: `formState` aceita a classe compartilhada `PageFormState`, e não um callback ou objeto com reset arbitrário. As telas fornecem apenas o formulário, o modo e o momento de carregamento; a decisão de descarte pertence ao componente. Na criação, `begin('create')` captura os defaults vazios antes de qualquer preenchimento; cancelar os restaura. Na edição, `begin('edit')` bloqueia o cancelamento até `loaded()` registrar os dados recebidos do backend. O reset usa uma cópia isolada dessa base, sem nova consulta, sem salvar e sem navegar; também limpa dirty/touched/submitted e recompõe a estrutura de FormArrays, removendo linhas adicionadas e restaurando as removidas com seus validators. A intenção `cancel` nunca é encaminhada a `footerAction`. Durante saving ou bloqueio das ações, não executa reset. Sem base registrada, o botão permanece desabilitado.

Formulários compostos podem registrar um adaptador de dados extras (`read`/`write`), como preço dinâmico, imagens e acabamentos de Produtos; a decisão entre limpar/restaurar e a cópia do snapshot permanecem no shared. Clonar é criação: o cancelamento limpa o cadastro, não reaplica os dados do produto de origem. Navegação de saída fica no Voltar do header; navegação após salvar continua conforme o fluxo de cada módulo.

`saving`, `savingText` e `actionsDisabled` representam processamento e bloqueiam as ações declarativas. Botões projetados continuam sob controle do consumidor, que deve vincular seu próprio `disabled`. O header oferece `actionDisabled`, `actionPending` e `actionPendingText`; o PageCard encaminha `headerActionDisabled`. O título ganhou semântica de heading sem trocar tipografia; ações podem quebrar linha em viewports menores.

### Busca e filtros

`list-filter-bar` mantém o modo `flat` e o evento string legado `filterChange`. O modo `section` incorpora a toolbar antes mantida pelo DataTable, preservando seus estilos. `stateChange` emite `DataTableFilterState` com strings, números, booleanos, `false`, `null` e arrays sem conversão em string. `clear` e `stateChange({})` indicam limpeza.

`InputPesquisa` concentra o único debounce, configurável por `debounceMs`. O padrão legado permanece em 400 ms; a toolbar da tabela mantém 300 ms, trim e deduplicação. Atualizações externas de valor cancelam buscas ainda pendentes e não emitem outra busca.

`[list-filter-actions]` projeta ações junto à busca. `[list-filter-custom]` projeta filtros de domínio; usar `hasCustomFilters` quando não houver definições select. A feature controla valores e eventos desses filtros. Na tabela, os slots correspondentes são `[data-table-toolbar-actions]` (preservado) e `[data-table-custom-filters]` (novo).

O adaptador DataTable preserva seu contrato anterior: remove filtros vazios (`null`, `undefined`, string vazia e array vazio) antes de emitir `filterChange`; mantém `false` e zero. A barra isolada conserva `null` em `stateChange`.

### Listagem e estados

`DataTableColumn<T>`, `appDataTableCell`, `__expandedDetail`, ações, expansão, sort e paginação permanecem. A feature mantém HTTP, dados, busca, filtros, ordenação e totais. A tabela somente apresenta estado e emite intenção.

Precedência: `forbidden` → `loading/refreshing` sem dados → `error` sem dados → vazio/conteúdo. Com dados, loading/refreshing preserva a tabela e informa atualização; erro de refresh preserva dados e oferece retry. `retryEnabled` controla a ação; `retry` emite intenção. `filtered` permite indicar filtros externos; busca e filtros conhecidos também selecionam o vazio filtrado. `tableLabel`, regiões de status/alerta, `aria-busy`, ações nomeadas e reduced motion tornam os estados compreensíveis para tecnologias assistivas.

### Extensão mobile opcional

`ng-template[appDataTableItem]` permite conteúdo alternativo até 760 px. É opt-in; sem template a tabela existente permanece em todos os tamanhos. Importar `DataTableItemDirective` no consumidor e vincular `[appDataTableItem]="dados"` para inferência estrita do tipo do template. A renderização usa sempre `DataTable.data`.

O contexto fornece `$implicit`/`row`, `actions` visíveis, `emitAction(row, id)`, `expanded` e `toggle(row)`. O consumidor desenha o item e vincula o disabled de cada ação; o emissor compartilhado também verifica visible/disabled. Estados e paginação são os mesmos. Nenhum item mobile foi ativado no piloto nesta issue.

Full layout mantém navegação global; PageCard/CardHeader mantém contexto da página. `mobile-fab-action`, `mobile-summary-sheet`, `mobile-total-bar` e `mobile-sheet-header` permanecem compatíveis e sem alterações; regras financeiras/status não foram transferidas ao shared.

## Piloto: Produtos gráficos

`/page/grafica/produtos` mantém título, subtítulo, ajuda, Novo produto, Biblioteca, colunas, ações, preços e parâmetros de backend. Agora fornece estados explícitos de erro/retry, 403 e refreshing, preservando os dados em falhas de atualização. Respostas obsoletas de listagem são ignoradas. Template e estilos foram extraídos para arquivos próprios.

Clone, exclusão, biblioteca, configuração de venda, categorias, preços e permissões continuam na feature. Interceptors, guards e política HTTP global não foram alterados.

## Validação e evidências

Status: **#86 pronta para revisão final**.

- `npm run build`: exit 0, bundle de produção gerado em `dist/clickmanager-app`; não foi usado `ngc` como substituto. [Log](validation/issue-86/build.log).
- `npm test -- --watch=false --browsers=ChromeHeadless`: 378 executados, 371 passaram, sete falharam, exit 1 exclusivamente pelas falhas conhecidas. [Log final](validation/issue-86/full-tests.log).
- Baseline: 355 executados, 348 passaram, sete falharam. Comparação dos nomes confirmou exatamente as mesmas sete falhas de `GraficaProdutoFormComponent`, com `categoriaService.listarTodas is not a function`. [Baseline](validation/issue-86/baseline-tests.log).
- Novas falhas na execução final: **0**.
- Seis grupos focados (PageCard, CardHeader, ListFilterBar, InputPesquisa, DataTable e Produtos gráficos): 44 executados, 44 passaram, exit 0. [Log](validation/issue-86/focused-tests.log).
- Primeira execução completa nesta validação encontrou uma falha adicional no novo teste de expansão. O teste ativava `expandable` após a primeira renderização; a montagem foi corrigida para configurar expansão inicialmente, como nos consumidores. O teste mantém as asserções de detalhe projetado, expansão, toolbar e ação invisível. Nenhum código funcional foi alterado para esse ajuste.
- Adicionados três testes diretos de InputPesquisa: debounce legado, sincronização externa/cancelamento pendente e cancelamento ao destruir. A cobertura integrada da barra continua verificando debounce único e filtros tipados.
- A tentativa anterior de build no sandbox terminou com 134, sem diagnóstico de compilação/TypeScript ou evidência de falta de memória. O mesmo comando oficial concluiu fora do sandbox, sem mudança funcional; o abort anterior não demonstra erro de código. Karma no sandbox registrou `listen EPERM 0.0.0.0:9876`; execução autorizada fora do sandbox funcionou.
- Servidor antigo PID 13725, confirmado pelo cwd do projeto, encerrado; nova instância iniciada com `npm start -- --host 127.0.0.1`. Não foi necessário apagar caches nem alterar código para reiniciar.
- Capturas anteriores: [desktop largo](screenshots/issue-86/before-wide.png), [desktop comum](screenshots/issue-86/before-desktop.png), [tablet](screenshots/issue-86/before-tablet.png), [mobile](screenshots/issue-86/before-mobile.png).
- Validação visual autenticada de `/page/grafica/produtos` concluída manualmente pelo usuário e aprovada. Conforme informado pelo usuário, não foram identificadas regressões relevantes.
- A aprovação visual final é o registro da validação manual do usuário; `stale-server-desktop.png` **não é evidência de depois**.

## Depreciações e continuidade

Nenhum candidato foi removido: tabela-generica, tabela antiga, tabs-section-card, textarea duplicado, mobile-page-header, filtro-pesquisa-card e status-filter. A auditoria permanece como inventário; remoção exige migração de dependentes ou comprovação de ausência de consumidores. MobilePageHeader não foi promovido.

A #87 deve migrar Pedidos, Orçamentos e Rascunhos gradualmente, escolhendo tabela apenas para dados tabulares e mantendo composição e regras comerciais nas features. Filtros de período/hierarquia podem ser projetados. Cadastros devem escolher entre footer projetado existente e ações declarativas, mantendo um único caminho de submit. A iniciativa mobile posterior definirá apresentação dos itens projetados e sua UX; esta fundação não decide layout comercial nem cálculos financeiros.


## Cobertura global do Cancelar do PageCard

Levantamento de todos os usos de `app-page-card` na branch. Todos os pontos que ofereciam **descarte de formulário** foram migrados:

| Consumidor | Base de criação | Base de edição / dados adicionais |
|---|---|---|
| Clientes | Campos/endereço vazios | Cliente recebido do backend |
| Produtos gráficos | Defaults vazios, inclusive clone | Produto, preço, imagens, galeria e acabamentos |
| Cores gráficas | Defaults vazios, inclusive clone | Cor carregada |
| Materiais gráficos | Defaults vazios, inclusive clone | Material carregado |
| Formatos gráficos | Defaults vazios, inclusive clone | Formato e dimensões carregados |
| Categorias gráficas | Defaults vazios, inclusive clone | Categoria carregada |
| Serviços gráficos | Defaults vazios, inclusive clone | Serviço e preço dinâmico |
| Cadastros gráficos genéricos | Estado de Novo antes do clone | Registro selecionado e preço |
| Configuração SmartCalc | Configuração única existente | Ativação e conjunto de produtos carregados, atualizados após salvar |
| Pedido legado | Cliente, itens e pagamentos vazios; ajustes iniciais | Não oferece edição nesta tela |
| Editor Comercial (Pedidos/Orçamentos/Rascunhos) | Dados vazios da composição | Dados carregados e campos locais, sem desfazer operações financeiras persistidas |

Não restam botões locais de descarte rotulados Cancelar nesses consumidores. As ocorrências remanescentes são ações de negócio (cancelamento de pedido, orçamento, recebimento ou documento fiscal) e fechamento de diálogos. Elas não podem ser convertidas em reset de formulário. Listagens, consultas e ferramentas sem ação de descarte continuam usando PageCard como shell, sem receber uma ação sem contexto de formulário.

Para novos cadastros, fornecer `formState`, registrar `begin('create' | 'edit')` e `loaded()` quando os dados de edição chegarem. O footer e seu Cancelar aparecem por padrão; `footerActions` contém somente Salvar e demais comandos. Não criar handler `cancelar`, link de saída rotulado Cancelar ou CSS local. Voltar permanece no header.

A mesma regra é coberta por testes do PageCard/PageFormState e por testes dos consumidores: criação, edição, clone, carregamento, bloqueio, cópia profunda, FormArrays, estado externo, reset sem navegação e preservação de recebimentos persistidos.

Validação da ampliação global nesta branch: `npm test -- --watch=false --browsers=ChromeHeadless` — **440/440**, exit 0; `npm run build` — **exit 0**. Evidências atuais em [suíte completa](validation/clientes/full-tests.log) e [build](validation/clientes/build.log). Os números históricos da #86 acima permanecem como registro daquela entrega.
