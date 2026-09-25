# Fundação de telas — issue #86

Implementação baseada nas decisões D1–D5 da [auditoria #85](frontend-screen-pattern-audit.md), no épico #79 e no escopo de migração futura da #87. Branch `feature/86-consolidar-componentes-base`, criada da `develop` atualizada em `6ef43c861fa523ff4159dd4e5f236ee78a146a96`.

Aplicada a [skill anthropics/frontend-design](https://www.ui-skills.com/skills/anthropics/frontend-design) para hierarquia, estados, acessibilidade e responsividade, preservando a identidade existente do ERP.

## Contratos

### Página e cadastro

`page-card` e `card-header` continuam sendo o shell. Slots de conteúdo, header e footer, rotas, ajuda e permissões existentes permanecem disponíveis. `section-card` continua compondo seções de formulário.

`PageCardAction` acrescenta ações declarativas ao footer: `id`, `label`, `disabled`, `pendingLabel`, `color`, `primary` e `type`. Uma ação `type: 'submit'` exige `form`, associado ao ID real do formulário. O submit nativo aciona apenas o handler do formulário; `footerAction` emite somente comandos `type: 'button'`. A feature continua responsável por salvar, cancelar, validar e navegar.

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
