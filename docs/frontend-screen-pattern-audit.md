# Auditoria de padrões de tela do App — #85

Data: 24/09/2026. Repositório: `clickmanager-app` (app.clickmanager). Base: `c818b4810412d78b85f7603ba4531cf4896a3bd0`.

## Escopo, fontes e método

Esta entrega executa somente auditoria e decisão de arquitetura. Nenhum componente, CSS, rota, comportamento ou regra de negócio foi alterado. As classificações abaixo são recomendações para implementação posterior, não depreciações já executadas.

Issues lidas integralmente via GitHub: [épico #79](https://github.com/Code2YouLabs/clickmanager-app/issues/79), [auditoria #85](https://github.com/Code2YouLabs/clickmanager-app/issues/85), [fundação #86](https://github.com/Code2YouLabs/clickmanager-app/issues/86) e [piloto #87](https://github.com/Code2YouLabs/clickmanager-app/issues/87). O remote local ainda usa `leonardombr89/clickmanager-app`; o GitHub resolve as issues para `Code2YouLabs/clickmanager-app`.

Foi varrida toda a árvore `src/app`, incluindo componentes standalone, declarações múltiplas no mesmo arquivo, templates externos e inline, layouts, páginas, shared, core, diretivas, serviços e rotas. O censo do apêndice identifica declarações Angular por AST TypeScript; snippets de código demonstrativo em strings não contam como componentes reais. O inventário detalha os elementos estruturais e reutilizáveis; o censo também registra páginas e exemplos que não devem virar infraestrutura compartilhada.

**Contagem de consumidores:** arquivos de template ou TS com uso do seletor, ou abertura direta por `MatDialog.open`. Três instâncias no mesmo template contam como um consumidor. Imports e referências de rota são registrados separadamente; não equivalem a uso visual. Seletores/classes homônimos foram desambiguados pelos imports (especialmente `ListarProdutosComponent` e `InputTextareaComponent`). A contagem exclui aberturas de dialogs no mesmo arquivo de sua declaração; isso afeta, por exemplo, os wizards internos do editor comercial. Referências dinâmicas por variáveis e aliases podem escapar da contagem; números são aproximações estáticas, não telemetria. Zero consumidores não comprova código morto. Specs relacionados indicam existência de teste, não cobertura integral nem aprovação.

A responsividade foi auditada no código (templates, SCSS, breakpoints e handlers), sem sessão autenticada ou validação visual no navegador. Não se afirma paridade visual, acessibilidade validada ou maturidade mobile apenas pela existência de media queries. Todos os caminhos são relativos à raiz deste repositório.

## Estado atual

O projeto usa Angular 19, Angular Material/CDK, Reactive Forms, RxJS, Tabler, máscaras e Toastr. `MaterialModule` e `SharedComponentsModule` coexistem com imports standalone. O `package.json` não declara consumo do workspace irmão `design-system`; mover primitivas para esse pacote agora não é pré-requisito da fundação e não faz parte desta auditoria.

Há duas camadas de shell distintas:

- `layouts/full`: navegação, sidebar, header global, topbar mobile, sheets, conteúdo roteado e navegação inferior. `BlankComponent` atende experiências sem navegação completa; `PrintComponent`, impressão. Esses layouts não substituem o container de uma tela.
- `page-card`: container de página com `card-header`, conteúdo projetado e footer opcional já implementado e testado. `section-card` compõe seções internas. Não há justificativa para criar outro page-shell.

A adoção é desigual: `page-card` tem 58 consumidores diretos; `card-header`, 39 (incluindo o próprio `page-card`); `section-card`, 75. Não somar essas contagens como páginas únicas. `data-table` tem oito consumidores na Gráfica. Catálogo/Produto combina infraestrutura existente com filtros, tabela, estados e ações locais. A pasta `components` mistura estrutura genérica, regra comercial, onboarding, billing e widgets do template.

Existem **três contextos comerciais a preservar**: Pedido tradicional (`pages/pedido`, com abas Todos/Orçamentos/Rascunhos), Orçamento independente (`pages/orcamentos`) e Comercial da Gráfica (`pages/grafica/comercial-beta`, com rotas próprias para pedidos/orçamentos/rascunhos e um editor contextual). Rascunho não é apenas uma tela ausente a criar: aparece tanto como contexto/status do Pedido quanto como recurso comercial da Gráfica. A #87 deve validar sua matriz de rotas antes da migração.

## Inventário e classificação

Significados: **KEEP** preserva o componente adequado; **EVOLVE** mantém sua identidade e amplia o contrato; **CONSOLIDATE** reúne soluções concorrentes; **MIGRATE** indica consumidores que devem adotar o contrato comum; **DEPRECATE** propõe encerrar novos usos e remover apenas após comprovar migração/ausência de dependentes; **FEATURE-SPECIFIC** mantém composição e regras no domínio. Uma recomendação de depreciação não autoriza remoção nesta tarefa.

| Componente | Responsabilidade | Consumidores diretos aproximados / exemplos | Concorrentes | Classificação |
|---|---|---|---|---|
| `FullComponent`, `BlankComponent`, `PrintComponent` | Shell global, autenticação/onboarding e impressão | Rotas em `app.routes.ts` | Headers globais/locais podem repetir título, mas shells têm outra responsabilidade | KEEP; Full EVOLVE no contrato mobile |
| `page-card` | Header + body + footer projetado | 58; Produto form/detail, Pedido, Gráfica, Fiscal | MatCard montado em páginas | EVOLVE, base canônica |
| `card-header` | Título/subtítulo, ajuda, ação com rota/permissão, projeção | 39; page-card, Catálogo list, Clientes, Orçamentos | Headers locais, mobile-page-header, topbar global | EVOLVE / CONSOLIDATE |
| `section-card` | Seção titulada com ações e body | 75; forms, data-table e domínio comercial | Cards/sections inline | KEEP; consolidar aliases sem quebra futura |
| `tabs-section-card` | Wrapper de MatTabGroup | 0 | MatTabGroup direto | DEPRECATE proposto; não canônico |
| `data-table` + `DataTableCellDirective` | Listagem tipada com filtros, busca, sort, expansão, ações e paginação | 8; Gráfica produtos/categorias/cadastros/cores/formatos/materiais/serviços/comercial | Tabela, tabela-generica, pedido-tabela, MatTable local | EVOLVE / CONSOLIDATE, base canônica |
| `components/tabela/ListarProdutosComponent` | Busca/listagem/seleção de Produto técnico, com serviço e navegação próprios | 0 usos/imports identificados | Página homônima, seletores de produto | FEATURE-SPECIFIC; DEPRECATE condicional |
| `tabela-generica` | API declarada de tabela; template só contém um título | 0 | data-table | DEPRECATE |
| `pedido-tabela` | Colunas, expansão, links e paginação de Pedido | 1 template, três abas | data-table + células comerciais | MIGRATE estrutura; preservar projeções FEATURE-SPECIFIC |
| `list-filter-bar` | Pesquisa, selects simples e limpar | 1; Orçamentos list | Toolbar data-table, filtro-pesquisa-card | CONSOLIDATE, destino composável dos filtros |
| `filtro-pesquisa-card` | SectionCard + pesquisa + status string | 2; Pedido e Funcionários | list-filter-bar | MIGRATE; DEPRECATE após migração |
| `status-filter` | Escolha ativo/inativo/todos (boolean/null) | 0 | Chips/selects inline, filtros data-table | CONSOLIDATE; DEPRECATE após absorção semântica |
| `input-pesquisa` | FormControl de busca com debounce e valor externo | 17; filtros e cadastros | Busca interna data-table e inputs locais | EVOLVE / CONSOLIDATE |
| Inputs de texto, número, moeda, email, telefone, documento, CEP, data, options, multi-select, autocomplete, unit | Entrada, máscaras, erro/validação e seleção | APIs e consumidores individuais no apêndice | Material inline; duplicata textarea | KEEP / EVOLVE por contrato; duplicata DEPRECATE |
| `rich-text-editor`, `rich-text-preview-field` | Editor CVA e campo com visualização | 4 e 1 | Preview local em Produto | KEEP; MIGRATE somente composição equivalente |
| `hierarchy-tree`, `dual-list-transfer` | Hierarquia/seleção e transferência de itens | 2 e 1 | Árvores/listas locais | KEEP; não forçar em data-table |
| `metric-card`, `manual-link` | Indicador e acesso contextual à ajuda | 5 e 2 | Cards/links locais | KEEP |
| `ConfirmDialogComponent` | Confirmação textual com resultado booleano | 48 chamadas diretas | Confirmações locais/template | EVOLVE; canônico para confirmações simples |
| `dialog-form-shell.scss` | Estilo de formulário em dialog, não componente Angular | Uso por stylesheet (apêndice de padrões) | Estilos inline de dialogs | KEEP; evitar criar shell sem avaliar composição Material |
| `mobile-page-header` | Título central, voltar, badge e ação | 0 | card-header e Full mobile-topbar | CONSOLIDATE; DEPRECATE após decisão de titularidade |
| `mobile-fab-action` | Ação primária flutuante | 12; cadastros, Pedido, Site | CTA inline/mobile header | EVOLVE |
| `mobile-sheet-header` | Handle, título e hint de sheet | 1; Full | Headers de sheets locais | KEEP |
| `mobile-summary-sheet` | Overlay com conteúdo projetado e fechar | 3; Pedido form/detail e demo-whatsapp | Sheets locais, Material/CDK overlay | EVOLVE |
| `mobile-total-bar` | Total/resumo, expansão e duas ações | 21; Pedido, Cliente, cadastros e demos | Footer de page-card e ações mobile locais | CONSOLIDATE apresentação; resumo comercial FEATURE-SPECIFIC |
| `itens-pedido-section`, `cliente-selector-card`, `pedido-info-card`, `pedido-fluxo-controles`, `pagamentos-section`, `resumo-financeiro-card`, `observacoes-card` | Composição comercial, controles e resumo | 4, 3, 2, 2, 2, 2 e 4 | Seções comerciais inline, inclusive beta/mobile | FEATURE-SPECIFIC; reaproveitar sem mover agora |
| `status-badge`, `product-identity`, `preco-selector`, `produto-selector` e dialogs de variação | Semântica/status/configuração de domínio | 18, 1, 10, 1; demais no apêndice | Chips e campos comerciais locais | FEATURE-SPECIFIC (status-badge exige separar mapa semântico de primitivo visual) |
| `endereco-form` | FormGroup e endereço reutilizável | 2 | Endereço inline mobile | FEATURE-SPECIFIC para identidade/endereço; não primitivo de DS |
| Onboarding shell/wizard/selection, setup-progress, tour | Fluxo guiado e progresso de preparação | 4 / 0 / 1 / 2 / 3 | Onboarding páginas e experiências demo | FEATURE-SPECIFIC |
| Billing banner/pricing card | Aviso e seleção de assinatura | 1 / 1 | Cards comerciais locais | FEATURE-SPECIFIC |
| Galeria/upload Depósito; preview Storage; características/status Catálogo; componentes Links; wizards e dialogs locais | Reuso entre telas com contrato de negócio | Detalhamento individual no apêndice | Implementações locais de cada domínio | FEATURE-SPECIFIC |
| LoadingService + LoadingInterceptor | Overlay global de requisições | Registro/injeção; não selector | Loading por tabela/página | KEEP infraestrutura; CONSOLIDATE política de estados |
| PermissionGuard, TemPermissaoDirective, AuthService | Controle de acesso/visibilidade | Rotas, headers e ações | Checks locais | KEEP autorização; EVOLVE apresentação sem permissão |
| Empty/error/retry locais, ações de form e paginação Material | Padrões sem componente app único | Catálogo, Orçamento, Depósito, Links, Comercial | Estados internos data-table e footer page-card | CONSOLIDATE / MIGRATE |

O apêndice de fichas complementa esta tabela com caminhos, APIs, consumidores completos, dependências, responsividade e specs por componente. O censo final registra o restante da superfície, incluindo legado do template, para não confundir “fora da fundação” com “não encontrado”.

## Componentes concorrentes: comparação e decisão

### Tabelas, listas e paginação

| Critério | data-table | tabela (ListarProdutos) | tabela-generica | pedido-tabela | MatTable inline |
|---|---|---|---|---|---|
| Flexibilidade/API | `DataTableColumn<T>`, templates por chave, rowKey, filtros tipados, actions, paginação controlada e sort | Colunas fixas, showActions/showSelect/hideHeader/selectedId, selectedChange | Dados/colunas `any`, paginar/filtrar/editar/excluir declarados | PedidoListagem, flags de colunas, PageEvent/Sort | Total liberdade e repetição de contratos |
| Acoplamento | MaterialModule, SectionCard, forms/RxJS; não busca dados | ProdutoService, Router, Toastr, confirmação e permissões | Material, sem serviço | Modelo Pedido, Router e StatusBadge | Container conhece serviço/estado/markup |
| Regra de negócio | Callbacks recebidos; não define endpoints/status | Exclusão, navegação técnica e consulta Produto | Nenhuma implementada na view | Colunas e links comerciais | Varia por tela |
| Desktop | Tabela, ações menu/botões, expansão e paginator | Implementação real de Produto | **Não renderiza tabela**: HTML é `<h3>Tabela generica</h3>` | Expansão/sort/paginação reais | Real nas referências |
| Mobile | Overflow de tabela; toolbar em coluna em 760px; não há template de card mobile | Não oferece contrato genérico mobile | Ausente | Container troca por lista mobile própria | Scroll em Produto/Clientes; branches em Orçamentos |
| Maturidade/testes | 8 consumidores; 9 testes focados em projeção, filtros, debounce, sort, página, ações e estados | 0 consumidores detectados; sem spec próprio | 0; sem spec; esqueleto | 1 consumidor; sem spec próprio | Catálogo list/Clientes sem spec próprio; Orçamentos list tem spec |
| Decisão | EVOLVE como base | Não promover a shared; verificar eventual dependente antes de DEPRECATE | DEPRECATE, não investir para competir | MIGRATE motor; domínio permanece na feature | MIGRATE por equivalência após #86 |

A recomendação de `data-table` resulta da API desacoplada, projeção e comportamento testado, não de idade ou popularidade. Faltam erro, retry, permissão, empty com ação, alternativa mobile e contrato de paginação incremental. Não possui seleção de linhas genérica: seleção de Produto e árvores não pode ser declarada migrável sem analisar essa lacuna. Não transferir endpoints, labels de status ou exclusão para a tabela. A diretiva `appDataTableCell` recebe a chave da coluna e projeta `TemplateRef` com a linha; a chave especial `__expandedDetail` fornece a expansão. O slot `[data-table-toolbar-actions]` já existe. Preservar esses pontos de extensão na consolidação.

Paginação deve ter **um único proprietário**: a feature controla `pageIndex/pageSize/totalItems`, sort e busca; o componente emite intenção. Filtros/busca reiniciam a página no container. O compartilhado não pode inferir se uma API filtra no servidor ou se o container filtra uma página localmente. Pedido mobile acumula páginas; o Comercial beta aplica busca/contexto próprios; Orçamentos usa filtros e tamanho mobile distintos. Não converter essas estratégias silenciosamente.

### Filtros, busca e status

| Solução | API e flexibilidade | Acoplamento / domínio | Desktop/mobile | Maturidade e recomendação |
|---|---|---|---|---|
| Toolbar data-table | select/multi-select; string/number/boolean/null/arrays; chips e expansão; busca debounce 300ms padrão | Tipos genéricos; acoplada ao renderizador de tabela | Layout responsivo 760px | Testada; aproveitar comportamento |
| list-filter-bar | Selects de string, `{key,value}`, searchValue, clear | InputPesquisa + Material; sem negócio | Flex/grid responsivo em SCSS | 1 consumidor, sem spec; EVOLVE como composição reutilizável |
| filtro-pesquisa-card | Pesquisa + um status string; sentinela `TODOS` | SectionCard/InputPesquisa; impõe representação de status | Grid 2fr/1fr; uma coluna em 768px, sem collapse | 2 consumidores, sem spec; adaptar/migrar |
| status-filter | boolean/null, labels configuráveis | Material chips, apenas ativo/inativo | Não define apresentação mobile | 0 consumidor, sem spec; preservar semântica no contrato comum |
| InputPesquisa | `value`, `valorAlterado`, label opcional; debounce 400ms | FormControl interno | Largura depende do container | 17 consumidores, sem spec; não empilhar debounce |
| Produto inline | FormGroup com texto/categoria/marca/ativo/destaque | Catálogo carrega opções; debounce 300ms sobre o grupo | Grid 1100/700px | Sem spec de listagem; MIGRATE estrutura, manter consultas |
| Orçamentos inline complementar | Datas para período personalizado | Regra de período da feature | Mobile não reproduz todo o painel desktop | Não reduzir a selects de string |

**Destino:** evoluir `list-filter-bar` para possuir a apresentação dos filtros; `data-table` passa a compô-la mantendo sua API pública durante transição. Reusar tipos de valores de `data-table`; não criar segundo modelo concorrente nem outro filtro “V2”. Introduzir projeção para filtros específicos (datas/hierarquia) sem conhecer Catálogo/Orçamento. `filtro-pesquisa-card` pode ser adaptador temporário até seus dois consumidores migrarem. Um único debounce por interação, com valor externo sincronizável; defaults atuais só mudam com teste de compatibilidade. Boolean `false`, `null`, string `TODOS` e arrays não são intercambiáveis.

### Header, container, footer e tabs

`page-card` já compõe `card-header`; são complementares. Os slots existentes são `[page-header-actions]`, body padrão, `[page-footer-left]` e `[page-footer-right]`. `showFooter`, `headerDivider` e `footerDivider` controlam áreas reais com três testes de projeção/divisores. `card-header` aceita ação com rota e permissão, ajuda interna/externa e projeção livre. É acoplado a Router/TemPermissao, portanto Shared App, não Design System.

`section-card` aceita aliases `title/titulo`, `subtitle/subtitulo`, `divider`, `fixedHeight`, `[section-card-actions]` e `[actions]`. É o contrato de seção a manter. Compatibilidade precede eventual uniformização de idioma; não remover aliases usados.

Headers inline em `layouts/full` são globais e carregam título/ações de navegação. Não substituí-los indiscriminadamente por `card-header`. `mobile-page-header` não tem usos detectados e não resolve a duplicação atual. Consolidar o header de **página** em card-header/page-card, definindo como se coordena com o título do shell global para evitar dois títulos/volta duplicada.

O footer de page-card já empilha abaixo de 768px. Falta contrato uniforme de processamento, submit e bloqueio, não um novo shell. Projeção de botão `type=submit` fora do `<form>` exige associação explícita por `form=id` ou composição que preserve semântica; evitar ligar simultaneamente click e submit. Salvar/cancelar permanecem handlers da feature. `grafica-produto-form.component.ts` já usa `[showFooter]="true"` e botão projetado com `form="grafica-produto-form"`: é evidência concreta melhor que copiar as ações inline de Catálogo. `mobile-total-bar` não é equivalente a footer: contém resumo, status e expansão, mas é usado também em formulários comuns. Compartilhar apresentação de ações sem forçar cálculo financeiro em cadastro.

`tabs-section-card` apenas projeta conteúdo em MatTabGroup; não expõe índice selecionado nem evento de troca usados no Produto. Sem consumidores nem testes, não é base canônica. Manter Material tabs no conteúdo com estado controlado pela feature. Se houver necessidade futura de wrapper, validar projeção/lazy content/foco antes de investir.

### Inputs, dialogs e estados

Os inputs existentes recebem principalmente `FormControl`; `unit-input` e `rich-text-editor` oferecem CVA. Não converter tudo para um modelo único nesta fundação. Preservar máscara, touched/disabled, tipos e validação. `input-cep` busca endereço e não deve ir automaticamente ao DS. `input-unidade-medida` é um adaptador simples de input-options com opções recebidas; sua eventual promoção a primitivo depende do contrato do DS existente, sem necessidade de migração nesta fundação. Há duas classes e seletores `InputTextareaComponent`/`app-input-textarea` em `inputs/input-text` e `inputs/input-textarea`; só a segunda tem imports/consumidores detectados. Classificar a primeira como candidata a depreciação, não apagar.

`ConfirmDialogComponent` tem contrato por `MAT_DIALOG_DATA` (`title/message/confirmText/cancelText/confirmColor`) e `MatDialogRef.close(boolean)`, não Input/Output. É canônico para confirmação simples. Dialogs de cliente, serviço, variação, pagamento, arquivos e wizard continuam na feature. Confirmar rascunho do SmartCalc e dialogs de exclusão do template não são prova de equivalência total. `dialog-form-shell.scss` padroniza estilo, mas não oferece ações/estado/foco como um componente. Evitar um wrapper genérico gigante.

`LoadingService` cria overlay no `document.body`, contabiliza requisições e impõe duração mínima; o interceptor ignora `/api/demo/` e `SILENT_REQUEST`. Isso é infraestrutura, não estado de conteúdo. `data-table` possui overlay e vazio filtrado, mas não recebe erro/retry/forbidden. Na listagem de Produto, falha gera toast e pode terminar visualmente em “Nenhum produto encontrado”. Orçamentos desktop já diferencia erro + retry, loading e vazio filtrado; seu branch mobile não reproduz o estado de erro. No Comercial beta, o handler de erro limpa `itens` e `totalItens`, também convertendo falha em vazio. O estado da tela deve ser explícito, sem modificar a política HTTP global nesta etapa.

`permissionGuard` redireciona com toast e `TemPermissaoDirective` controla visibilidade; `card-header.permissao` só protege sua ação configurada. Não existe um permission-state compartilhado equivalente à autorização de rotas. Propor apresentação local de acesso negado, mantendo guard, diretiva e servidor como responsáveis pela autorização.

## Referência Produto: criação, edição e consulta

Referência principal: `pages/catalogo/produtos/catalogo-produto-{list,form,detail}.component.ts`. Não confundir com `pages/cadastro-tecnico/produtos` ou `pages/grafica/produtos`, que possuem modelos/serviços e rotas diferentes.

| Tela | Compartilhado atual | Inline / duplicação | O que aproveitar / não copiar |
|---|---|---|---|
| Listagem Catálogo | card-header, CatalogoStatusChip, ConfirmDialog | MatCard, cinco filtros, spinner/overlay, MatTable/colunas/ações, vazio, paginator e media queries | Preservar filtros tipados, permissões e navegação; migrar estrutura para page-card/data-table; não copiar tratamento toast-only como estado de erro |
| Criação Catálogo | page-card, section-card, inputs texto/número/moeda/textarea, rich-text-editor, galeria Depósito, características Catálogo | Tabs Material, selects, toggle, preview HTML, grid, loading de características e ações finais | Boa organização por Identificação/Comercial/Imagens/Características; footer existente é melhor destino que nova `.actions` por página |
| Edição Catálogo | Mesmo componente do cadastro, `produtoId/isEdit`, validação e guard de alterações pendentes | Carregamento, dirty state, upload e habilitação da aba Calculadora | Preservar guard, uploads e dirty; não esconder dependências específicas numa abstração de formulário genérico |
| Detalhe Catálogo | page-card, section-card, CatalogoStatusChip, StorageImagePreview | Informações, galeria/layout e ações contextuais locais | Boa composição de consulta; estados de carregamento/erro devem ser formalizados sem inventar formulário de edição |
| Produto Gráfica | page-card/data-table, templates de célula e forms compartilhados | Conteúdo comercial e configurações complexas | Referência melhor para listagem genérica; não importar regras de Gráfica para Catálogo |
| Produto técnico | Componentes tradicionais e branches mobile | Form extenso, variações e footer mobile separado | Referência de riscos de duplicação e regras existentes; não canônico por homonímia |

O formulário Catálogo tem testes de integração da aba Calculadora (módulo, permissão, query param, produtoId e navegação de validação). Isso não equivale a cobertura completa de criar/editar, uploads, responsividade ou todos os estados. List/detail não possuem specs diretos identificados. Templates/estilos inline dessas três telas violam a organização preferida para código grande; registrar extração futura, sem alterá-los nesta auditoria.

## Comparação com telas maduras e diferenças reais

| Contexto / arquivos | Estrutura que se repete | Diferença funcional a preservar | Destino |
|---|---|---|---|
| Pedido `listar-pedido` | Header, filtros, seção, tabela, sort/paginator, vazio e ações | Abas Todos/Orçamentos/Rascunhos; mobile com cards, chips e carregamento incremental | page-card + filtro comum + motor data-table com templates da feature |
| Pedido `form-pedido` / `detalhes-pedido` | Cliente, itens, observações, pagamentos, resumo, ações | Form mobile por etapas, detalhe com transições, permissão e restrições financeiras | Manter domínio reutilizável; centralizar shell/ações/estados gradualmente |
| Orçamentos `listar-orcamentos` | Header, busca, filtros, métricas, tabela, paginação e estados | Período personalizado, origem/status, ações WhatsApp, conversão/cancelamento; erro/retry desktop | Preservar métricas e datas projetadas; mesma resolução de estados em ambos viewports |
| Orçamentos `form-orcamento` / `detalhe-orcamento` | Seções, cliente/contato, itens e ações | Contato pode preceder cliente cadastrado; descrever item, preço, impressão e vínculo/conversão têm regras próprias | page-card/section-card; não substituir cegamente por form-pedido |
| Gráfica `comercial-beta-list` | Já usa page-card/data-table e expansão | `route.data.tipo` escolhe rascunhos/orçamentos/pedidos; labels, origem dos dados e ações contextualizados | Piloto existente da base; completar estados sem unificar entidades |
| Gráfica `comercial-beta-editor` | page-card, sections, cliente/itens/observações/fluxo | Rascunho pode converter; orçamento aprova/recusa; pedido possui pagamentos/workflow; configuradores embutidos | Reutilizar domínio, não construir uma única tela genérica que apague essas diferenças |
| Clientes `listar-cliente` / `form-cliente` | Header, pesquisa, tabela/paginator; campos/endereço/ações | Cadastro mobile usa etapas; máscaras de documentos/telefone/CEP e endereço | Migração depois do piloto #87; não copiar estrutura bifurcada |
| Funcionários e Folha | PageCard, filtros, estados, detalhe e dialogs | Status laboral, acordos e competências | Exemplos para validar filtro/composição; domínio isolado |
| Storage, Depósito, Links | Listas, estados, retry, tabs e dialogs | Upload/progresso, lixeira, analytics e prévia pública | Referências adicionais de estados; não transformar todas as listas em tabela |
| SmartCalc e onboarding | Shell/sections/ações/progresso | Passos, preço/configuração, seleção e progresso assíncrono | Arquétipo fluxo especial |

## Arquétipos oficiais propostos

### Listagem

`page-card` contém header/ações, filtros comuns, área de conteúdo e paginação. `data-table` é a implementação canônica para **dados tabulares**; árvore, seleção dupla e listas de mídia mantêm renderizadores adequados. Cabeçalho e ação principal são definidos uma vez. Filtros de domínio são projetados; consultas e mapeamento de URL pertencem à feature.

Contrato futuro: dados e chave estável; colunas/templates; ações com id, label, visible/disabled; busca/filtros controlados; sort; paginação controlada; estado explícito; retry emitido ao container. Uma representação mobile pode projetar item/card usando os mesmos dados/ações/estado. Não criar ProdutoDesktopComponent/ProdutoMobileComponent.

Para primeira carga, resolver em ordem: acesso negado quando conhecido → carregamento inicial → erro sem dados → vazio filtrado/não filtrado → conteúdo. Atualização com dados preservados deve distinguir `refreshing` e erro de atualização, sem apagar dados nem exibir vazio falso. Estado de acesso não substitui segurança do backend. Paginação não aparece como conteúdo válido em erro inicial/sem permissão. Não aplicar precedência de maneira que esconda erro atrás de array vazio.

### Cadastro / edição

`page-card` + um formulário da feature + `section-card` por assunto; MatTabGroup somente quando a tarefa justificar. Campos consomem inputs existentes. Contrato de ações: voltar/cancelar, salvar, disabled, pending/saving, associação a form e mensagem de validação; handlers e persistência ficam no container. Footer usa slots existentes, com processamento anunciado e prevenção de submissão repetida. Validação, foco no erro, dirty/guard, upload e bloqueios não podem desaparecer ao mover a área de ações.

Criação e edição compartilham estrutura, sem exigir uma “API CRUD universal”. Estado inicial de edição não pode mostrar formulário vazio como se fosse criação. Ações mobile simples devem derivar da mesma definição de ações; resumo financeiro continua opcional e pertencente ao fluxo comercial.

### Detalhe / consulta

`page-card` com título/identificação, ações contextuais no header, `section-card` por assunto e estados explícitos. Dados somente leitura, arquivos e histórico são conteúdo de feature. Ações de alterar status, imprimir, converter ou cobrar não são o footer “Salvar” de um formulário. Edição de seção pode usar formulário local e estado independente. Pedido e Orçamento conservam seus componentes de domínio e restrições; Catálogo detail serve como exemplo de consulta simples.

### Fluxo especial

Onboarding mantém `onboarding-shell` e passos; SmartCalc/configuradores mantêm sua composição, seleção, preview e navegação contextual. Podem consumir header, seção, estado e ações comuns sem serem encaixados numa tabela ou form monolítico. Impressão usa PrintComponent e layouts próprios. Wizards de preço/serviço/produto permanecem na feature, ainda que reutilizados por Pedido e Orçamento.

## Mobile: situação atual e fronteiras

| Elemento | Estado observado | Evolução centralizada recomendada |
|---|---|---|
| Header global Full + headers locais | Full implementa topbar móvel e título por rota; card-header faz wrap; mobile-page-header não é consumido | Definir titularidade de título/voltar e ação de página antes de absorver header mobile |
| FAB | CSS até 768px, bottom fixo de 76px + safe area; sem Input disabled | Contrato de ação/visibilidade/disabled e offset compartilhado com shell |
| Sheet header | Handle/título/hint usado pelo Full | Manter papel distinto do header da página |
| Summary sheet | CSS até 900px, offsets/z-index recebidos, conteúdo projetado e fechamento | Revisar foco inicial/restauração, Escape, scroll e semântica de dialog; template não possui focus trap explícito |
| Total bar | CSS até 900px; resumo/status, clique/toque/teclado, expansão, ações e offset | Separar definição de ações de resumo; não generalizar status comercial para DS |
| data-table | Tabela em scroll e toolbar empilhada em 760px | Contrato de item alternativo opcional; não prometer lista mobile que ainda não existe |
| Pedido | Branch desktop/mobile de lista/form/detail; mobile carrega mais resultados | Compartilhar dados/ações/estados; preservar estratégia incremental até decisão própria |
| Orçamentos | Branch mobile com busca/cards; filtros, paginação visível e erro/retry desktop não são equivalentes | Testar paridade por capacidade, não apenas por aparência |
| Cliente | Form com branch e etapas mobile em 900px | Compartilhar campos e validação; manter sequência se requisito de produto |
| Produto Catálogo | Um template, grids 1100/700 na lista e 900 no form | Boa direção estrutural; deslocar comportamento comum ao shared sem copiar breakpoints por tela |

Breakpoints 640/700/720/760/768/900 coexistem. Mudá-los agora seria mudança visual. A #86 deve documentar compatibilidade e delimitar o que pertence ao shell, ao componente e ao domínio, incluindo safe area, bottom nav, z-index e espaço reservado para ações fixas. Não basta renomear branches como componentes mobile: isso preservaria duas implementações da mesma interação.

## Arquitetura proposta

| Camada | Responsabilidade / candidatos | Não deve carregar |
|---|---|---|
| Design System | Tokens, tipografia, espaçamento, cores semânticas, botão/campo/badge/surface/indicador genérico; avaliar capacidades do DS existente antes de exportar | AuthService, rotas do App, HTTP de Catálogo, status comerciais, forms de Pedido |
| Shared App | page-card/card-header/section-card, composição de filtros/listagem/estados/ações, confirmação simples, apresentação responsiva e coordenação com layouts | Preço, estoque, conversão, pagamento, itens de pedido, endpoint ou transição de status |
| Feature | Catálogo, Comercial, Gráfica, Cliente, Storage, billing, onboarding; componentes compartilháveis **dentro** do domínio | Cópias de estrutura de página quando o contrato compartilhado já atende |

A localização física atual não define a camada: `components/itens-pedido-section` é domínio, assim como `preco-selector` e mapas de status. A galeria de Depósito usada por Catálogo/Gráfica continua sendo serviço/composição de mídia com semântica própria; reuso entre features exige contrato explícito, não promoção automática a shared. A futura migração de pastas deve ser trabalho separado e incremental.

## Decisões propostas e validação humana

| ID | Problema | Opções existentes | Recomendação | Impacto esperado / consumidores afetados |
|---|---|---|---|---|
| D1 | Shell repetido | page-card; MatCard local; novo shell | Evoluir page-card e card-header existentes | Uniformiza conteúdo/ações em 58 consumidores e futuros migrados; compatibilidade de slots obrigatória |
| D2 | Motores de listagem concorrentes | data-table; tabela; tabela-generica; pedido-tabela; inline | data-table canônico para tabelas; células comerciais na feature | Oito consumidores existentes + Produto/Pedido/Orçamentos/Clientes futuros; requer estados e contrato mobile antes de migração |
| D3 | Filtros duplicados | Toolbar data-table; list-filter-bar; filtro-pesquisa-card; status-filter | list-filter-bar composável, tipos derivados da API existente; data-table delega apresentação | Oito consumidores de tabela, Orçamentos, Pedido e Funcionários; adapters mantêm sentinelas/debounce |
| D4 | Ações de form locais | Footer page-card; `.actions`; mobile-total-bar | Evoluir footer/projeção existente com contrato único de intenção e processamento | Produto, formulários técnicos, Cliente e comerciais; preservar submit/dirty/guard |
| D5 | Falha parece lista vazia | Toast/global overlay; estados locais; empty/loading data-table | Estado explícito no conteúdo com retry; aproveitar Orçamentos desktop | Todos os arquétipos; não mudar interceptors silenciosamente |
| D6 | Dois títulos e dois layouts | Full topbar; card-header; mobile-page-header; branches | Titularidade global/local documentada; card-header responsivo; ações compartilhadas | Full e telas com branches; exige validação humana de navegação/título |
| D7 | Shared contém negócio | Pasta components atual; feature local; DS | Classificar por dependência/semântica, preservar domínio comercial | Itens/cliente/resumo/fluxo/configuração; nenhuma mudança de preço/workflow |
| D8 | Wrappers sem implementação/uso | tabela-generica, tabs-section-card, textarea duplicado, tabela antiga | Depreciação futura condicionada a varredura de imports/rotas e migração | Sem consumidores diretos encontrados; não remover por contagem isolada |
| D9 | Piloto comercial ambíguo | Pedido tradicional/abas; Orçamentos; Comercial beta | Matriz explícita dos três contextos na #87 | Validar quais rotas são prioritárias; não substituir entidades distintas |
| D10 | Convenção Angular desigual | TS inline extenso; arquivos separados | Preferir `.ts/.html/.scss/.spec.ts` separados em evolução futura | Produto, Gráfica/editor/wizards e componentes inline extensos; sem extração nesta fase |

**Validação humana antes da implementação:** aprovar D1–D5 como contratos canônicos; definir em D6 onde título/voltar aparecem no mobile; confirmar em D9 o primeiro conjunto de rotas da #87; confirmar quais fluxos exigem lista incremental ou seleção (não resolver por estética). As demais classificações orientam trabalho futuro. Não é necessário bloquear a entrega documental por essas decisões; são pontos de revisão para a #86/#87, não pedidos de autorização para alterar produção agora.

## Plano exato para #86

| Ordem | Ação | Componentes / contratos | Critério de saída |
|---|---|---|---|
| 1 | Manter e documentar | Full/Blank/Print, section-card, inputs existentes, hierarchy-tree, dual-list-transfer, metric-card, manual-link, rich-text-editor/preview | Slots, tipos, responsabilidade e compatibilidade publicados; não mover arquivos |
| 2 | Evoluir shell/ações | page-card + card-header; footer existente | Título/subtítulo/ações/projeção/submit/saving/disabled; empilhamento preservado; testes de header e footer |
| 3 | Consolidar filtro | list-filter-bar + toolbar data-table + InputPesquisa; adapters temporários para filtro-pesquisa-card/status-filter | Tipos boolean/null/array preservados, projeção de datas, busca controlada, um debounce, clear previsível |
| 4 | Evoluir conteúdo | data-table + seus models/directive; contrato de estados reutilizável pela composição page-card | loading inicial/refreshing, empty filtrado, error/retry, forbidden; prioridade e preservação de dados testadas; decidir menor implementação reutilizável sem shell paralelo |
| 5 | Evoluir contrato responsivo | card-header/page-card/list-filter-bar/data-table + FAB/summary-sheet/total-bar; manter sheet-header | Uma definição de ações/estado, item mobile projetável, offsets/foco documentados; nenhuma migração em massa/redesign |
| 6 | Validar referência | Uma listagem/form representativa acordada; Gráfica já usa page-card/data-table; Catálogo é referência funcional | Cobrir filtros, paginação, permissões, salvar/voltar e estados em desktop/mobile básico; eventual alteração de tela pertence à #86, não a esta entrega |
| 7 | Marcar migração/depreciação futura | tabela-generica; tabela antiga após confirmação; tabs-section-card; textarea `inputs/input-text`; mobile-page-header; filtro-pesquisa-card/status-filter após absorção | Não remover código com consumidor; registrar substituto e checklist; pedido-tabela só deixa de renderizar estrutura própria após #87 |
| 8 | Entregar para #87 | Matriz Pedido tradicional + Orçamentos + Gráfica/Rascunhos | Preservar domain components, status, preços, conversões e pagamentos; Clientes e demais lotes depois |

**Manter específicos:** cliente-selector-card, itens-pedido-section, pedido-info-card, pedido-fluxo-controles, pagamentos-section, resumo-financeiro-card, observacoes-card, preço/seletores/configuradores, galeria/upload, status semântico e onboarding. A #86 não deve “universalizar” esses componentes. **Migrar futuramente:** MatCard/header/ações/filtros/tabelas/estados inline equivalentes e estrutura de pedido-tabela. **Não criar:** V2, page-shell concorrente, CRUD universal, tabela nova ou componentes separados por viewport.

Testes necessários na implementação: projeção e submit fora/dentro do form; debounce/sincronização/reset; filtros `false/null/arrays`; paginação/sort e expansão; visible/disabled/permissão; retry sem mostrar vazio; teclado/foco e restauração em sheet; representação mobile usando os mesmos handlers; regressão do domínio nos pilotos. Esta auditoria não adiciona testes que espelham documentação.

## Convenção Angular e legado

Preferência futura: `componente/componente.ts`, `.html`, `.scss`, `.spec.ts`, sem impor renomeação dos atuais `.component.*` nesta tarefa. Templates grandes e estilos significativos inline aparecem em Catálogo, Gráfica, Fiscal, Storage, rich-text e unit-input; o apêndice quantifica templates inline. O editor comercial contém múltiplas classes/dialogs no mesmo TS, além de templates extensos. A extração deve ocorrer em trabalho próprio ou ao evoluir a área, sem alterar comportamento.

`pages/tables`, `pages/ui-components`, `pages/forms`, `pages/charts`, widgets/dashboard1/dashboard2, `code-view` e apps demonstrativos carregam herança do template. Vários estão efetivamente referenciados em `app.routes.ts`; **não são declarados mortos**. Suas tabelas/paginators/dialogs não devem virar padrão por estarem disponíveis. Nenhum deles foi removido ou refatorado. O apêndice registra essas declarações separadamente da decisão de fundação.

## Validação antes/depois

O checkout estava limpo antes da auditoria. Após a escrita, `git status --short` aponta somente `?? docs/frontend-screen-pattern-audit.md`; `git diff --exit-code` não aponta alterações em arquivos rastreados. Builds geram apenas saídas/cache ignorados. Não houve push, PR ou atualização de issues.

| Verificação | Antes da documentação | Depois da documentação |
|---|---|---|
| `npm run build` (produção por default do angular.json) | Exit 0, 25,781 s; 40 warnings | Exit 0, 29,766 s; 40 warnings |
| `npm test -- --watch=false --browsers=ChromeHeadless` | Exit 1; 355 executados, 348 passaram, 7 falharam | Exit 1; 355 executados, 348 passaram, as mesmas 7 falharam |
| Lint | Não configurado: nenhum script lint no package.json nem target lint no angular.json | Configuração inalterada; não instalar/configurar linter nesta tarefa |
| Integridade documental | Não aplicável | Links relativos locais verificados; somente o Markdown novo no checkout |

Os sete testes que falham são da suíte `GraficaProdutoFormComponent`, todos com `TypeError: this.categoriaService.listarTodas is not a function`:

- restaura snapshot original ao cancelar clone;
- cria payload de clone sem reaproveitar ids de acabamento e politica;
- carrega clone com valores do produto original sem reaproveitar ids internos;
- clone mantendo nome original deixa familia ser resolvida pelo backend;
- clone mudando apenas cor cria novo catalogoProduto;
- clone mudando apenas material cria novo catalogoProduto;
- clone mudando apenas formato cria novo catalogoProduto.

As listas de falhas foram comparadas independentemente da ordem aleatória da suíte. A baseline não está verde; não se atribui aprovação integral aos testes. Nenhuma falha foi corrigida por estar fora do escopo. Os warnings de build incluem imports não utilizados, optional chaining redundante, Sass e dependências CommonJS; a quantidade se mantém em 40.

Na primeira tentativa restrita, Karma não pôde abrir a porta 9876 (`EPERM`); o build encerrou com código 134 sem diagnóstico no log. Ambas as validações foram refeitas antes da escrita com permissões de execução adequadas e repetidas depois nas mesmas condições. Esses problemas de ambiente não foram classificados como falhas do código.

Logs da sessão (temporários, fora do repositório): `/tmp/cm-audit-build-before-unrestricted.log`, `/tmp/cm-audit-build-after.log`, `/tmp/cm-audit-test-before-unrestricted.log` e `/tmp/cm-audit-test-after.log`. O resultado persistente é este documento; os logs temporários podem deixar de existir. Não houve teste visual autenticado ou alteração de produção.


## Apêndice A — Fichas verificáveis dos componentes

As dependências são imports relevantes do arquivo (arquivos com vários componentes podem compartilhar imports). APIs abaixo são declarações existentes, não a proposta futura. A lista de specs é relacionada por classe no diretório, podendo conter mais de uma suíte. Ausência de media query local não significa ausência de responsividade: grids utilitários, Material, stylesheet global e container também participam. Os marcadores extraídos complementam a análise comportamental das seções anteriores.

### `app-billing-banner` — `BillingBannerComponent`

**Arquivo:** [src/app/components/billing-banner/billing-banner.component.ts](../src/app/components/billing-banner/billing-banner.component.ts).

**Responsabilidade / decisão:** Aviso de situação da assinatura. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/layouts/full/full.component.html](../src/app/layouts/full/full.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/icon`; `@angular/material/button`; `@angular/router`; `src/app/pages/billing/services/billing-state.service`; `src/app/services/auth.service`; `src/app/models/usuario/usuario.model`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-card-header` — `CardHeaderComponent`

**Arquivo:** [src/app/components/card-header/card-header.component.ts](../src/app/components/card-header/card-header.component.ts).

**Responsabilidade / decisão:** Título, subtítulo, ajuda e ações de página. **EVOLVE**.

**Inputs:** `titulo!: string;`; `subtitulo?: string;`; `botaoTexto?: string;`; `botaoIcone: string = 'add';`; `botaoRota?: string | any[];`; `mostrarDivisor: boolean = false;`; `helpTexto: string = 'Ajuda';`; `helpIcone: string = 'help_outline';`; `helpRota?: string | any[];`; `helpFragment?: string;`; `helpExterno: boolean = false;`; `botaoCor: 'primary' | 'accent' | 'warn' = 'primary';`; `permissao: string | string[] = '';`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (39):** [src/app/components/onboarding/onboarding-wizard.component.html](../src/app/components/onboarding/onboarding-wizard.component.html); [src/app/components/page-card/page-card.component.html](../src/app/components/page-card/page-card.component.html); [src/app/pages/billing/billing-blocked/billing-blocked.component.html](../src/app/pages/billing/billing-blocked/billing-blocked.component.html); [src/app/pages/billing/billing-confirmation/billing-confirmation.component.html](../src/app/pages/billing/billing-confirmation/billing-confirmation.component.html); [src/app/pages/billing/billing-pagamento/billing-pagamento.component.html](../src/app/pages/billing/billing-pagamento/billing-pagamento.component.html); [src/app/pages/billing/billing-pay/billing-pay.component.html](../src/app/pages/billing/billing-pay/billing-pay.component.html); [src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html); [src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html](../src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html); [src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html](../src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html); [src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html](../src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html); [src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html](../src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html); [src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html](../src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html); [src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts); [src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts](../src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts); [src/app/pages/clicktv/components/midias/clicktv-midias.component.html](../src/app/pages/clicktv/components/midias/clicktv-midias.component.html); [src/app/pages/clicktv/components/playlists/clicktv-playlists.component.html](../src/app/pages/clicktv/components/playlists/clicktv-playlists.component.html); [src/app/pages/clicktv/components/telas/clicktv-telas.component.html](../src/app/pages/clicktv/components/telas/clicktv-telas.component.html); [src/app/pages/cliente/form-cliente/form-cliente.component.html](../src/app/pages/cliente/form-cliente/form-cliente.component.html); [src/app/pages/cliente/listar-cliente/listar-cliente.component.html](../src/app/pages/cliente/listar-cliente/listar-cliente.component.html); [src/app/pages/config/email-servidor/email-servidor.component.html](../src/app/pages/config/email-servidor/email-servidor.component.html); [src/app/pages/config/folha-config/folha-config.component.html](../src/app/pages/config/folha-config/folha-config.component.html); [src/app/pages/config/presenca-publica/presenca-publica.component.html](../src/app/pages/config/presenca-publica/presenca-publica.component.html); [src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html](../src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html); [src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html](../src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html); [src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html](../src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html); [src/app/pages/empresa/empresa-form.component.html](../src/app/pages/empresa/empresa-form.component.html); [src/app/pages/links/pages/analytics/links-analytics.component.html](../src/app/pages/links/pages/analytics/links-analytics.component.html); [src/app/pages/links/pages/editor/links-editor.component.html](../src/app/pages/links/pages/editor/links-editor.component.html); [src/app/pages/links/pages/lista/links-lista.component.html](../src/app/pages/links/pages/lista/links-lista.component.html); [src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.html](../src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.html); [src/app/pages/orcamentos/form-orcamento/form-orcamento.component.html](../src/app/pages/orcamentos/form-orcamento/form-orcamento.component.html); [src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html](../src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html); [src/app/pages/perfil/gerenciar-perfil/gerenciar-perfil.component.html](../src/app/pages/perfil/gerenciar-perfil/gerenciar-perfil.component.html); [src/app/pages/site/banners/listar-banners/listar-banners.component.html](../src/app/pages/site/banners/listar-banners/listar-banners.component.html); [src/app/pages/site/configuracoes/site-configuracoes.component.html](../src/app/pages/site/configuracoes/site-configuracoes.component.html); [src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html](../src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html); [src/app/pages/usuarios/form-usuario/form-usuario.component.html](../src/app/pages/usuarios/form-usuario/form-usuario.component.html); [src/app/pages/usuarios/listar-usuarios/listar-usuarios.component.html](../src/app/pages/usuarios/listar-usuarios/listar-usuarios.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/router`; `@angular/material/button`; `@angular/material/icon`; `@angular/material/tooltip`; `src/app/diretivas/tem-permissao.directive`; `@angular/material/divider`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-cliente-selector-card` — `ClienteSelectorCardComponent`

**Arquivo:** [src/app/components/cliente-selector-card/cliente-selector-card.component.ts](../src/app/components/cliente-selector-card/cliente-selector-card.component.ts).

**Responsabilidade / decisão:** Seleção, exibição e edição do cliente comercial. **FEATURE-SPECIFIC**.

**Inputs:** `control!: FormControl;`; `buscarFn!: (termo: string) => Observable<any[]>;`; `displayWith!: (item: any) => string;`; `minimoCaracteres = 3;`; `multiplo = false;`; `label = 'Selecionar cliente';`; `titulo = 'Dados do cliente';`; `divider = true;`; `renderCard = true;`; `cliente: any | null = null;`; `editando = false;`; `salvando = false;`; `emptyMessage = 'Nenhum cliente definido para este pedido.';`; `showEmptyAlert = true;`; `inativo = false;`.

**Outputs:** `editarCliente = new EventEmitter<void>();`; `cancelarEdicao = new EventEmitter<void>();`; `salvarCliente = new EventEmitter<void>();`; `criarCliente = new EventEmitter<void>();`.

**Consumidores diretos (3):** [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html); [src/app/pages/pedido/form-pedido/form-pedido.component.html](../src/app/pages/pedido/form-pedido/form-pedido.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `rxjs`; `@angular/material/button`; `@angular/material/icon`; `../section-card/section-card.component`; `../inputs/auto-complete/auto-complete.component`; `src/app/pipe/telefone.pipe`.

**Responsividade (evidência estática):** `@media (max-width: 640px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-code-view` — `AppCodeViewComponent`

**Arquivo:** [src/app/components/code-view/code-view.component.ts](../src/app/components/code-view/code-view.component.ts).

**Responsabilidade / decisão:** Exibição de código nos exemplos do template. **FEATURE-SPECIFIC**.

**Inputs:** `isTitle!: boolean;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (47):** [src/app/pages/charts/area/area.component.html](../src/app/pages/charts/area/area.component.html); [src/app/pages/charts/candlestick/candlestick.component.html](../src/app/pages/charts/candlestick/candlestick.component.html); [src/app/pages/charts/column/column.component.html](../src/app/pages/charts/column/column.component.html); [src/app/pages/charts/doughnut-pie/doughnut-pie.component.html](../src/app/pages/charts/doughnut-pie/doughnut-pie.component.html); [src/app/pages/charts/gredient/gredient.component.html](../src/app/pages/charts/gredient/gredient.component.html); [src/app/pages/charts/line/line.component.html](../src/app/pages/charts/line/line.component.html); [src/app/pages/charts/radial-radar/radial-radar.component.html](../src/app/pages/charts/radial-radar/radial-radar.component.html); [src/app/pages/forms/form-elements/autocomplete/autocomplete.component.html](../src/app/pages/forms/form-elements/autocomplete/autocomplete.component.html); [src/app/pages/forms/form-elements/button/button.component.html](../src/app/pages/forms/form-elements/button/button.component.html); [src/app/pages/forms/form-elements/checkbox/checkbox.component.html](../src/app/pages/forms/form-elements/checkbox/checkbox.component.html); [src/app/pages/forms/form-elements/datepicker/datepicker.component.html](../src/app/pages/forms/form-elements/datepicker/datepicker.component.html); [src/app/pages/forms/form-elements/radio/radio.component.html](../src/app/pages/forms/form-elements/radio/radio.component.html); [src/app/pages/forms/form-horizontal/form-horizontal.component.html](../src/app/pages/forms/form-horizontal/form-horizontal.component.html); [src/app/pages/forms/form-layouts/form-layouts.component.html](../src/app/pages/forms/form-layouts/form-layouts.component.html); [src/app/pages/forms/form-vertical/form-vertical.component.html](../src/app/pages/forms/form-vertical/form-vertical.component.html); [src/app/pages/forms/form-wizard/form-wizard.component.html](../src/app/pages/forms/form-wizard/form-wizard.component.html); [src/app/pages/tables/basic-table/basic-table.component.html](../src/app/pages/tables/basic-table/basic-table.component.html); [src/app/pages/tables/dynamic-table/dynamic-table.component.html](../src/app/pages/tables/dynamic-table/dynamic-table.component.html); [src/app/pages/tables/expand-table/expand-table.component.html](../src/app/pages/tables/expand-table/expand-table.component.html); [src/app/pages/tables/filterable-table/filterable-table.component.html](../src/app/pages/tables/filterable-table/filterable-table.component.html); [src/app/pages/tables/footer-row-table/footer-row-table.component.html](../src/app/pages/tables/footer-row-table/footer-row-table.component.html); [src/app/pages/tables/http-table/http-table.component.html](../src/app/pages/tables/http-table/http-table.component.html); [src/app/pages/tables/mix-table/mix-table.component.html](../src/app/pages/tables/mix-table/mix-table.component.html); [src/app/pages/tables/multi-header-footer-table/multi-header-footer-table.component.html](../src/app/pages/tables/multi-header-footer-table/multi-header-footer-table.component.html); [src/app/pages/tables/pagination-table/pagination-table.component.html](../src/app/pages/tables/pagination-table/pagination-table.component.html); [src/app/pages/tables/row-context-table/row-context-table.component.html](../src/app/pages/tables/row-context-table/row-context-table.component.html); [src/app/pages/tables/selection-table/selection-table.component.html](../src/app/pages/tables/selection-table/selection-table.component.html); [src/app/pages/tables/sortable-table/sortable-table.component.html](../src/app/pages/tables/sortable-table/sortable-table.component.html); [src/app/pages/tables/sticky-column-table/sticky-column-table.component.html](../src/app/pages/tables/sticky-column-table/sticky-column-table.component.html); [src/app/pages/tables/sticky-header-footer-table/sticky-header-footer-table.component.html](../src/app/pages/tables/sticky-header-footer-table/sticky-header-footer-table.component.html); [src/app/pages/ui-components/badge/badge.component.html](../src/app/pages/ui-components/badge/badge.component.html); [src/app/pages/ui-components/chips/chips.component.html](../src/app/pages/ui-components/chips/chips.component.html); [src/app/pages/ui-components/dialog/dialog.component.html](../src/app/pages/ui-components/dialog/dialog.component.html); [src/app/pages/ui-components/divider/divider.component.html](../src/app/pages/ui-components/divider/divider.component.html); [src/app/pages/ui-components/expansion/expansion.component.html](../src/app/pages/ui-components/expansion/expansion.component.html); [src/app/pages/ui-components/lists/lists.component.html](../src/app/pages/ui-components/lists/lists.component.html); [src/app/pages/ui-components/menu/menu.component.html](../src/app/pages/ui-components/menu/menu.component.html); [src/app/pages/ui-components/paginator/paginator.component.html](../src/app/pages/ui-components/paginator/paginator.component.html); [src/app/pages/ui-components/progress/progress.component.html](../src/app/pages/ui-components/progress/progress.component.html); [src/app/pages/ui-components/progress-snipper/progress-snipper.component.html](../src/app/pages/ui-components/progress-snipper/progress-snipper.component.html); [src/app/pages/ui-components/ripples/ripples.component.html](../src/app/pages/ui-components/ripples/ripples.component.html); [src/app/pages/ui-components/slide-toggle/slide-toggle.component.html](../src/app/pages/ui-components/slide-toggle/slide-toggle.component.html); [src/app/pages/ui-components/slider/slider.component.html](../src/app/pages/ui-components/slider/slider.component.html); [src/app/pages/ui-components/snackbar/snackbar.component.html](../src/app/pages/ui-components/snackbar/snackbar.component.html); [src/app/pages/ui-components/tabs/tabs.component.html](../src/app/pages/ui-components/tabs/tabs.component.html); [src/app/pages/ui-components/toolbar/toolbar.component.html](../src/app/pages/ui-components/toolbar/toolbar.component.html); [src/app/pages/ui-components/tooltips/tooltips.component.html](../src/app/pages/ui-components/tooltips/tooltips.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/card`; `@angular/material/tabs`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-comparativo-pedidos` — `AppComparativoPedidosComponent`

**Arquivo:** [src/app/components/dashboard1/comparativo-pedidos/comparativo-pedidos.component.ts](../src/app/components/dashboard1/comparativo-pedidos/comparativo-pedidos.component.ts).

**Responsabilidade / decisão:** Composição de comparativo pedidos; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/dashboards/dashboard1/dashboard1.component.html](../src/app/pages/dashboards/dashboard1/dashboard1.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `src/app/material.module`; `angular-tabler-icons`; `ng-apexcharts`; `../dashboard.service`; `rxjs`; `@angular/router`.

**Responsividade (evidência estática):** `@media (min-width: 1024px)`; `@media (max-width: 767px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-congratulate-card` — `AppCongratulateCardComponent`

**Arquivo:** [src/app/components/dashboard1/congratulate-card/congratulate-card.component.ts](../src/app/components/dashboard1/congratulate-card/congratulate-card.component.ts).

**Responsabilidade / decisão:** Composição de congratulate card; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (0):** Nenhuma detectada.

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `rxjs`; `../../../material.module`; `angular-tabler-icons`; `../dashboard.service`; `@angular/router`.

**Responsividade (evidência estática):** `@media (max-width: 767px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-customers` — `AppCustomersComponent`

**Arquivo:** [src/app/components/dashboard1/customers/customers.component.ts](../src/app/components/dashboard1/customers/customers.component.ts).

**Responsabilidade / decisão:** Composição de customers; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (0):** Nenhuma detectada.

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `ng-apexcharts`; `../../../material.module`; `angular-tabler-icons`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-latest-deals` — `AppLatestDealsComponent`

**Arquivo:** [src/app/components/dashboard1/latest-deals/latest-deals.component.ts](../src/app/components/dashboard1/latest-deals/latest-deals.component.ts).

**Responsabilidade / decisão:** Composição de latest deals; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (0):** Nenhuma detectada.

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `../../../material.module`; `angular-tabler-icons`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-latest-reviews` — `AppLatestReviewsComponent`

**Arquivo:** [src/app/components/dashboard1/latest-reviews/latest-reviews.component.ts](../src/app/components/dashboard1/latest-reviews/latest-reviews.component.ts).

**Responsabilidade / decisão:** Composição de latest reviews; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (0):** Nenhuma detectada.

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `../../../material.module`; `@angular/material/menu`; `@angular/material/button`; `@angular/material/checkbox`; `@angular/cdk/collections`; `@angular/material/table`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-payments` — `AppPaymentsComponent`

**Arquivo:** [src/app/components/dashboard1/payments/payments.component.ts](../src/app/components/dashboard1/payments/payments.component.ts).

**Responsabilidade / decisão:** Composição de payments; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (0):** Nenhuma detectada.

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `ng-apexcharts`; `../../../material.module`; `angular-tabler-icons`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-receita-resumo` — `AppReceitaResumoComponent`

**Arquivo:** [src/app/components/dashboard1/receita-resumo/receita-resumo.component.ts](../src/app/components/dashboard1/receita-resumo/receita-resumo.component.ts).

**Responsabilidade / decisão:** Composição de receita resumo; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/dashboards/dashboard1/dashboard1.component.html](../src/app/pages/dashboards/dashboard1/dashboard1.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `ng-apexcharts`; `../../../material.module`; `angular-tabler-icons`; `../dashboard.service`; `rxjs`; `@angular/router`; `../../section-card/section-card.component`.

**Responsividade (evidência estática):** `@media (min-width: 1024px)`; `@media (max-width: 767px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-status-grid` — `AppStatusGridComponent`

**Arquivo:** [src/app/components/dashboard1/status-grid/status-grid.component.ts](../src/app/components/dashboard1/status-grid/status-grid.component.ts).

**Responsabilidade / decisão:** Composição de status grid; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/dashboards/dashboard1/dashboard1.component.html](../src/app/pages/dashboards/dashboard1/dashboard1.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/router`; `rxjs`; `../dashboard.service`; `../../section-card/section-card.component`.

**Responsividade (evidência estática):** `@media (max-width: 767px)`; `@media (min-width: 1024px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-top-projects` — `AppTopProjectsComponent`

**Arquivo:** [src/app/components/dashboard1/top-projects/top-projects.component.ts](../src/app/components/dashboard1/top-projects/top-projects.component.ts).

**Responsabilidade / decisão:** Composição de top projects; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (0):** Nenhuma detectada.

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `../../../material.module`; `@angular/material/menu`; `@angular/material/button`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-visit-usa` — `AppVisitUsaComponent`

**Arquivo:** [src/app/components/dashboard1/visit-usa/visit-usa.component.ts](../src/app/components/dashboard1/visit-usa/visit-usa.component.ts).

**Responsabilidade / decisão:** Composição de visit usa; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (0):** Nenhuma detectada.

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `angular-tabler-icons`; `src/app/material.module`; `@amcharts/amcharts5`; `@amcharts/amcharts5/themes/Animated`; `@amcharts/amcharts5/map`; `@amcharts/amcharts5-geodata/worldLow`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-blog-card` — `AppBlogCardComponent`

**Arquivo:** [src/app/components/dashboard2/blog-card/blog-card.component.ts](../src/app/components/dashboard2/blog-card/blog-card.component.ts).

**Responsabilidade / decisão:** Composição de blog card; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/dashboards/dashboard2/dashboard2.component.html](../src/app/pages/dashboards/dashboard2/dashboard2.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `../../../material.module`; `angular-tabler-icons`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-new-goals` — `AppNewGoalsComponent`

**Arquivo:** [src/app/components/dashboard2/new-goals/new-goals.component.ts](../src/app/components/dashboard2/new-goals/new-goals.component.ts).

**Responsabilidade / decisão:** Composição de new goals; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/dashboards/dashboard2/dashboard2.component.html](../src/app/pages/dashboards/dashboard2/dashboard2.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `../../../material.module`; `angular-tabler-icons`; `@angular/material/progress-bar`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-product-sales` — `AppProductSalesComponent`

**Arquivo:** [src/app/components/dashboard2/product-sales/product-sales.component.ts](../src/app/components/dashboard2/product-sales/product-sales.component.ts).

**Responsabilidade / decisão:** Composição de product sales; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/dashboards/dashboard2/dashboard2.component.html](../src/app/pages/dashboards/dashboard2/dashboard2.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `ng-apexcharts`; `../../../material.module`; `angular-tabler-icons`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-profile-card` — `AppProfileCardComponent`

**Arquivo:** [src/app/components/dashboard2/profile-card/profile-card.component.ts](../src/app/components/dashboard2/profile-card/profile-card.component.ts).

**Responsabilidade / decisão:** Composição de profile card; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/dashboards/dashboard2/dashboard2.component.html](../src/app/pages/dashboards/dashboard2/dashboard2.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `../../../material.module`; `angular-tabler-icons`; `@angular/material/progress-bar`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-profile-expance` — `AppProfileExpanceCpmponent`

**Arquivo:** [src/app/components/dashboard2/profile-expance/profile-expance.component.ts](../src/app/components/dashboard2/profile-expance/profile-expance.component.ts).

**Responsabilidade / decisão:** Composição de profile expance; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/dashboards/dashboard2/dashboard2.component.html](../src/app/pages/dashboards/dashboard2/dashboard2.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `ng-apexcharts`; `../../../material.module`; `angular-tabler-icons`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-top-cards` — `AppTopCardsComponent`

**Arquivo:** [src/app/components/dashboard2/top-cards/top-cards.component.ts](../src/app/components/dashboard2/top-cards/top-cards.component.ts).

**Responsabilidade / decisão:** Composição de top cards; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/dashboards/dashboard2/dashboard2.component.html](../src/app/pages/dashboards/dashboard2/dashboard2.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `../../../material.module`; `angular-tabler-icons`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-top-employees` — `AppTopEmployeesComponent`

**Arquivo:** [src/app/components/dashboard2/top-employees/top-employees.component.ts](../src/app/components/dashboard2/top-employees/top-employees.component.ts).

**Responsabilidade / decisão:** Composição de top employees; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/dashboards/dashboard2/dashboard2.component.html](../src/app/pages/dashboards/dashboard2/dashboard2.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `../../../material.module`; `@angular/material/menu`; `@angular/material/button`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-traffic-distribution` — `AppTrafficDistributionComponent`

**Arquivo:** [src/app/components/dashboard2/traffic-distribution/traffic-distribution.component.ts](../src/app/components/dashboard2/traffic-distribution/traffic-distribution.component.ts).

**Responsabilidade / decisão:** Composição de traffic distribution; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/dashboards/dashboard2/dashboard2.component.html](../src/app/pages/dashboards/dashboard2/dashboard2.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `ng-apexcharts`; `../../../material.module`; `angular-tabler-icons`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-upcoming-schedules` — `AppUpcomingSchedulesComponent`

**Arquivo:** [src/app/components/dashboard2/upcoming-schedules/upcoming-schedules.component.ts](../src/app/components/dashboard2/upcoming-schedules/upcoming-schedules.component.ts).

**Responsabilidade / decisão:** Composição de upcoming schedules; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/dashboards/dashboard2/dashboard2.component.html](../src/app/pages/dashboards/dashboard2/dashboard2.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `../../../material.module`; `angular-tabler-icons`; `ngx-scrollbar`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-welcome-card` — `AppWelcomeCardComponent`

**Arquivo:** [src/app/components/dashboard2/welcome-card/welcome-card.component.ts](../src/app/components/dashboard2/welcome-card/welcome-card.component.ts).

**Responsabilidade / decisão:** Composição de welcome card; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/dashboards/dashboard2/dashboard2.component.html](../src/app/pages/dashboards/dashboard2/dashboard2.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `../../../material.module`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-data-table` — `DataTableComponent`

**Arquivo:** [src/app/components/data-table/data-table.component.ts](../src/app/components/data-table/data-table.component.ts).

**Responsabilidade / decisão:** Tabela tipada, filtros, busca, estados, expansão, ações e paginação. **EVOLVE**.

**Inputs:** `columns: DataTableColumn<T>[] = [];`; `data: T[] = [];`; `filters: DataTableFilter[] = [];`; `filterState: DataTableFilterState = {};`; `search: DataTableSearchConfig = { enabled: false };`; `pagination: DataTablePagination | null = null;`; `loading = false;`; `showTable = true;`; `actions: DataTableAction<T>[] = [];`; `actionsMode: DataTableActionsMode = 'menu';`; `expandable = false;`; `expandOnRowClick = false;`; `expandAriaLabel = 'Expandir linha';`; `sort: DataTableSort = { active: '', direction: '' };`; `emptyState: DataTableEmptyState = {};`; `rowKey: keyof T | string | ((row: T) => unknown) = 'id';`; `filtersLabel = 'Filtros';`; `clearFiltersLabel = 'Limpar filtros';`.

**Outputs:** `searchChange = new EventEmitter<string>();`; `filterChange = new EventEmitter<DataTableFilterState>();`; `clearFilters = new EventEmitter<void>();`; `pageChange = new EventEmitter<PageEvent>();`; `sortChange = new EventEmitter<Sort>();`; `action = new EventEmitter<DataTableActionEvent<T>>();`.

**Consumidores diretos (8):** [src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts](../src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts); [src/app/pages/grafica/categorias/grafica-categorias.component.ts](../src/app/pages/grafica/categorias/grafica-categorias.component.ts); [src/app/pages/grafica/comercial-beta/comercial-beta-list.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-list.component.ts); [src/app/pages/grafica/cores/grafica-cores.component.ts](../src/app/pages/grafica/cores/grafica-cores.component.ts); [src/app/pages/grafica/formatos/grafica-formatos.component.ts](../src/app/pages/grafica/formatos/grafica-formatos.component.ts); [src/app/pages/grafica/materiais/grafica-materiais.component.ts](../src/app/pages/grafica/materiais/grafica-materiais.component.ts); [src/app/pages/grafica/produtos/grafica-produtos.component.ts](../src/app/pages/grafica/produtos/grafica-produtos.component.ts); [src/app/pages/grafica/servicos/grafica-servicos.component.ts](../src/app/pages/grafica/servicos/grafica-servicos.component.ts).

**Testes relacionados:** [src/app/components/data-table/data-table.component.spec.ts](../src/app/components/data-table/data-table.component.spec.ts).

**Dependências:** `@angular/animations`; `@angular/forms`; `@angular/material/paginator`; `@angular/material/sort`; `rxjs`; `src/app/material.module`; `../section-card/section-card.component`; `./data-table-cell.directive`; `./data-table.models`.

**Responsividade (evidência estática):** `@media (max-width: 760px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-acabamento-variacao-dialog` — `AcabamentoVariacaoDialogComponent`

**Arquivo:** [src/app/components/dialog/acabamento-variacao-dialog/acabamento-variacao-dialog.component.ts](../src/app/components/dialog/acabamento-variacao-dialog/acabamento-variacao-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: acabamento variacao. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.ts](../src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `@angular/material/button`; `@angular/material/chips`; `@angular/material/icon`; `src/app/components/preco/preco-selector.component`; `src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component`; `src/app/models/acabamento/tipo-aplicacao-acabamento.enum`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-acabamento-variacao-editar-dialog` — `AcabamentoVariacaoEditarDialogComponent`

**Arquivo:** [src/app/components/dialog/acabamento-variacao-editar-dialog/acabamento-variacao-editar-dialog.component.ts](../src/app/components/dialog/acabamento-variacao-editar-dialog/acabamento-variacao-editar-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: acabamento variacao editar. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (0):** Nenhuma detectada.

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `@angular/material/button`; `@angular/material/icon`; `src/app/components/preco/preco-selector.component`; `src/app/models/acabamento/tipo-aplicacao-acabamento.enum`; `src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-confirm-dialog` — `ConfirmDialogComponent`

**Arquivo:** [src/app/components/dialog/confirm-dialog/confirm-dialog.component.ts](../src/app/components/dialog/confirm-dialog/confirm-dialog.component.ts).

**Responsabilidade / decisão:** Confirmação textual via MAT_DIALOG_DATA e resultado booleano. **EVOLVE**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (48):** [src/app/components/tabela/listar-produtos.component.ts](../src/app/components/tabela/listar-produtos.component.ts); [src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.ts](../src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.ts); [src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.ts](../src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.ts); [src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.ts](../src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.ts); [src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.ts](../src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.ts); [src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.ts](../src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.ts); [src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.ts](../src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.ts); [src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts); [src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts); [src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts); [src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts](../src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts); [src/app/pages/clicktv/components/midias/clicktv-midias.component.ts](../src/app/pages/clicktv/components/midias/clicktv-midias.component.ts); [src/app/pages/clicktv/components/playlist-editor/clicktv-playlist-editor.component.ts](../src/app/pages/clicktv/components/playlist-editor/clicktv-playlist-editor.component.ts); [src/app/pages/clicktv/components/playlists/clicktv-playlists.component.ts](../src/app/pages/clicktv/components/playlists/clicktv-playlists.component.ts); [src/app/pages/clicktv/components/telas/clicktv-telas.component.ts](../src/app/pages/clicktv/components/telas/clicktv-telas.component.ts); [src/app/pages/cliente/listar-cliente/listar-cliente.component.ts](../src/app/pages/cliente/listar-cliente/listar-cliente.component.ts); [src/app/pages/config/presenca-publica/presenca-publica.component.ts](../src/app/pages/config/presenca-publica/presenca-publica.component.ts); [src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.ts](../src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.ts); [src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.ts](../src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.ts); [src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.ts](../src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.ts); [src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts](../src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts); [src/app/pages/grafica/categorias/grafica-categorias.component.ts](../src/app/pages/grafica/categorias/grafica-categorias.component.ts); [src/app/pages/grafica/cores/grafica-cores.component.ts](../src/app/pages/grafica/cores/grafica-cores.component.ts); [src/app/pages/grafica/formatos/grafica-formatos.component.ts](../src/app/pages/grafica/formatos/grafica-formatos.component.ts); [src/app/pages/grafica/materiais/grafica-materiais.component.ts](../src/app/pages/grafica/materiais/grafica-materiais.component.ts); [src/app/pages/grafica/produtos/grafica-produto-form.component.ts](../src/app/pages/grafica/produtos/grafica-produto-form.component.ts); [src/app/pages/grafica/produtos/grafica-produtos.component.ts](../src/app/pages/grafica/produtos/grafica-produtos.component.ts); [src/app/pages/grafica/servicos/grafica-servicos.component.ts](../src/app/pages/grafica/servicos/grafica-servicos.component.ts); [src/app/pages/links/pages/editor/links-editor.component.ts](../src/app/pages/links/pages/editor/links-editor.component.ts); [src/app/pages/links/pages/lista/links-lista.component.ts](../src/app/pages/links/pages/lista/links-lista.component.ts); [src/app/pages/onboarding/onboarding-page.component.ts](../src/app/pages/onboarding/onboarding-page.component.ts); [src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.ts](../src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.ts); [src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.ts](../src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.ts); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.ts](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.ts); [src/app/pages/pedido/form-pedido/form-pedido.component.ts](../src/app/pages/pedido/form-pedido/form-pedido.component.ts); [src/app/pages/perfil/gerenciar-perfil/gerenciar-perfil.component.ts](../src/app/pages/perfil/gerenciar-perfil/gerenciar-perfil.component.ts); [src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.ts](../src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.ts); [src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.ts](../src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.ts); [src/app/pages/site/banners/listar-banners/listar-banners.component.ts](../src/app/pages/site/banners/listar-banners/listar-banners.component.ts); [src/app/pages/site/paginas/blocos/listar-blocos/listar-blocos.component.ts](../src/app/pages/site/paginas/blocos/listar-blocos/listar-blocos.component.ts); [src/app/pages/site/paginas/listar-paginas/listar-paginas.component.ts](../src/app/pages/site/paginas/listar-paginas/listar-paginas.component.ts); [src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.ts](../src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.ts); [src/app/pages/storage/components/storage-lixeira/storage-lixeira.component.ts](../src/app/pages/storage/components/storage-lixeira/storage-lixeira.component.ts); [src/app/pages/storage/components/storage-videos/storage-videos.component.ts](../src/app/pages/storage/components/storage-videos/storage-videos.component.ts); [src/app/pages/suporte/suporte.component.ts](../src/app/pages/suporte/suporte.component.ts); [src/app/pages/usuarios/listar-usuarios/listar-usuarios.component.ts](../src/app/pages/usuarios/listar-usuarios/listar-usuarios.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/dialog`; `@angular/material/button`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 14 linhas; sem bloco de estilos inline.

### `app-variacao-detalhe-dialog` — `VariacaoDetalheDialogComponent`

**Arquivo:** [src/app/components/dialog/variacao-detalhe-dialog/variacao-detalhe-dialog.component.ts](../src/app/components/dialog/variacao-detalhe-dialog/variacao-detalhe-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: variacao detalhe. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.ts](../src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/dialog`; `@angular/material/icon`; `@angular/material/button`; `@angular/material/divider`; `@angular/material/chips`; `@angular/material/list`; `src/app/models/preco/preco.model`; `src/app/models/preco/preco-response.model`; `src/app/models/politica-revenda.model`; `src/app/models/acabamento/acabamento.model`; `src/app/models/produto/variacao.model`; `src/app/models/servico/servico-response.model`; `@angular/material/table`.

**Responsividade (evidência estática):** `@media (max-width: 720px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-variacao-editar-dialog` — `VariacaoEditarDialogComponent`

**Arquivo:** [src/app/components/dialog/variacao-editar-dialog/variacao-editar-dialog.component.ts](../src/app/components/dialog/variacao-editar-dialog/variacao-editar-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: variacao editar. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.ts](../src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `@angular/material/button`; `@angular/material/divider`; `@angular/material/icon`; `src/app/components/inputs/input-multi-select/input-multi-select-component`; `src/app/components/preco/preco-selector.component`; `src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/models/variacao.model`; `src/app/models/politica-revenda.model`; `../variacao-detalhe-dialog/variacao-detalhe-dialog.component`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-dual-list-transfer` — `DualListTransferComponent`

**Arquivo:** [src/app/components/dual-list-transfer/dual-list-transfer.component.ts](../src/app/components/dual-list-transfer/dual-list-transfer.component.ts).

**Responsabilidade / decisão:** Transferência/seleção entre duas listas. **KEEP**.

**Inputs:** `items: DualListTransferItem[] = [];`; `selectedIds: number[] = [];`; `disabled = false;`; `leftTitle = 'Disponíveis';`; `rightTitle = 'Selecionados';`; `editActionLabel = 'Editar item';`; `leftSubtitle = '';`; `rightSubtitle = '';`; `itemTemplate?: TemplateRef<{ $implicit: DualListTransferItem }>;`.

**Outputs:** `selectedIdsChange = new EventEmitter<number[]>();`.

**Consumidores diretos (1):** [src/app/pages/smart-calc-config/smart-calc-config/smart-calc-config.component.html](../src/app/pages/smart-calc-config/smart-calc-config/smart-calc-config.component.html).

**Testes relacionados:** [src/app/components/dual-list-transfer/dual-list-transfer.component.spec.ts](../src/app/components/dual-list-transfer/dual-list-transfer.component.spec.ts).

**Dependências:** `@angular/router`; `@angular/material/button`; `@angular/material/button-toggle`; `@angular/material/icon`; `../inputs/input-pesquisa/input-pesquisa.component`; `../status-badge/status-badge.component`; `../section-card/section-card.component`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-endereco-form` — `EnderecoFormComponent`

**Arquivo:** [src/app/components/endereco-form/endereco-form.component.ts](../src/app/components/endereco-form/endereco-form.component.ts).

**Responsabilidade / decisão:** Criação e emissão de formulário de endereço. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** `formReady = new EventEmitter<FormGroup>();`.

**Consumidores diretos (2):** [src/app/pages/cliente/form-cliente/form-cliente.component.html](../src/app/pages/cliente/form-cliente/form-cliente.component.html); [src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html](../src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `../inputs/input-texto/input-texto-restrito.component`; `../section-card/section-card.component`; `../inputs/input-cep/input-cep.component`; `src/app/models/endereco/endereco.viacep.model`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-filtro-pesquisa-card` — `FiltroPesquisaCardComponent`

**Arquivo:** [src/app/components/filtro-pesquisa-card/filtro-pesquisa-card.component.ts](../src/app/components/filtro-pesquisa-card/filtro-pesquisa-card.component.ts).

**Responsabilidade / decisão:** Pesquisa e seleção de status dentro de seção. **MIGRATE → DEPRECATE**.

**Inputs:** `titulo = 'Pesquisar';`; `placeholder = 'Digite para pesquisar...';`; `statusOptions: string[] = [];`; `statusSelecionado = 'TODOS';`; `mostrarStatus = true;`.

**Outputs:** `pesquisar = new EventEmitter<string>();`; `statusChange = new EventEmitter<string>();`.

**Consumidores diretos (2):** [src/app/pages/funcionarios/listar-funcionarios/listar-funcionarios.component.html](../src/app/pages/funcionarios/listar-funcionarios/listar-funcionarios.component.html); [src/app/pages/pedido/listar-pedido/listar-pedido.component.html](../src/app/pages/pedido/listar-pedido/listar-pedido.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/form-field`; `@angular/material/select`; `@angular/material/core`; `../section-card/section-card.component`; `../inputs/input-pesquisa/input-pesquisa.component`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-hierarchy-tree` — `HierarchyTreeComponent`

**Arquivo:** [src/app/components/hierarchy-tree/hierarchy-tree.component.ts](../src/app/components/hierarchy-tree/hierarchy-tree.component.ts).

**Responsabilidade / decisão:** Árvore com expansão, seleção e ações configuráveis. **KEEP**.

**Inputs:** `nodes: HierarchyTreeNode<T>[] = [];`; `actions: HierarchyTreeAction<T>[] = [];`; `loading = false;`; `title = '';`; `subtitle = '';`; `emptyTitle = 'Nenhum item encontrado';`; `emptyDescription = '';`; `expandAll = false;`; `expandRoots = true;`; `showDragHandle = false;`; `selectable = false;`; `selectionDisabled = false;`; `compact = false;`; `selectionStates = new Map<string | number, HierarchyTreeSelectionState>();`.

**Outputs:** `selectionChange = new EventEmitter<{ node: HierarchyTreeNode<T>; checked: boolean }>();`; `action = new EventEmitter<HierarchyTreeActionEvent<T>>();`.

**Consumidores diretos (2):** [src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.html](../src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.html); [src/app/pages/grafica/categorias/grafica-categorias.component.ts](../src/app/pages/grafica/categorias/grafica-categorias.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/cdk/tree`; `@angular/material/core`; `@angular/material/tree`; `src/app/material.module`; `../section-card/section-card.component`.

**Responsividade (evidência estática):** `@media (max-width: 760px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-auto-complete` — `AutoCompleteComponent`

**Arquivo:** [src/app/components/inputs/auto-complete/auto-complete.component.ts](../src/app/components/inputs/auto-complete/auto-complete.component.ts).

**Responsabilidade / decisão:** Entrada/seleção de auto complete com contrato de formulário próprio. **KEEP**.

**Inputs:** `control!: FormControl;`; `placeholder = 'Buscar...';`; `buscarFn!: (termo: string) => Observable<any[]>;`; `label = '';`; `displayWith: (item: any) => string = () => '';`; `minimoCaracteres = 1;`; `multiplo = false;`.

**Outputs:** `selecionado = new EventEmitter<any>();`.

**Consumidores diretos (5):** [src/app/components/cliente-selector-card/cliente-selector-card.component.html](../src/app/components/cliente-selector-card/cliente-selector-card.component.html); [src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html](../src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.ts](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.ts); [src/app/pages/pedido/form-pedido/form-pedido.component.html](../src/app/pages/pedido/form-pedido/form-pedido.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `rxjs`; `rxjs/operators`; `@angular/material/form-field`; `@angular/material/input`; `@angular/material/autocomplete`; `@angular/material/core`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-input-cep` — `InputCepComponent`

**Arquivo:** [src/app/components/inputs/input-cep/input-cep.component.ts](../src/app/components/inputs/input-cep/input-cep.component.ts).

**Responsabilidade / decisão:** Entrada/seleção de cep com contrato de formulário próprio. **KEEP**.

**Inputs:** `control!: FormControl;`; `label: string = 'CEP';`; `placeholder: string = '00000-000';`; `autoBuscar = true;`; `showSearchButton = false;`; `searchButtonText = 'Buscar endereço';`.

**Outputs:** `enderecoEncontrado = new EventEmitter<EnderecoViaCep | null>();`.

**Consumidores diretos (3):** [src/app/components/endereco-form/endereco-form.component.html](../src/app/components/endereco-form/endereco-form.component.html); [src/app/pages/cliente/form-cliente/form-cliente.component.html](../src/app/pages/cliente/form-cliente/form-cliente.component.html); [src/app/pages/empresa/empresa-form.component.html](../src/app/pages/empresa/empresa-form.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/form-field`; `@angular/material/input`; `@angular/material/button`; `rxjs/operators`; `src/app/utils/cep-util.service`; `src/app/models/endereco/endereco.viacep.model`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-input-data` — `InputDataComponent`

**Arquivo:** [src/app/components/inputs/input-data/input-data.component.ts](../src/app/components/inputs/input-data/input-data.component.ts).

**Responsabilidade / decisão:** Entrada/seleção de data com contrato de formulário próprio. **KEEP**.

**Inputs:** `control!: FormControl;`; `label: string = 'Data';`; `placeholder: string = 'dd/mm/aaaa';`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (3):** [src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html](../src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html); [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts); [src/app/pages/pedido/form-pedido/form-pedido.component.html](../src/app/pages/pedido/form-pedido/form-pedido.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/form-field`; `@angular/material/input`; `@angular/material/datepicker`; `@angular/material/core`; `@angular/material/icon`; `@angular/material/datepicker`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-input-documento` — `InputDocumentoComponent`

**Arquivo:** [src/app/components/inputs/input-documento/input-documento.component.ts](../src/app/components/inputs/input-documento/input-documento.component.ts).

**Responsabilidade / decisão:** Entrada/seleção de documento com contrato de formulário próprio. **KEEP**.

**Inputs:** `control!: FormControl;`; `label: string = 'CPF ou CNPJ';`; `placeholder: string = '';`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (3):** [src/app/pages/cliente/form-cliente/form-cliente.component.html](../src/app/pages/cliente/form-cliente/form-cliente.component.html); [src/app/pages/empresa/empresa-form.component.html](../src/app/pages/empresa/empresa-form.component.html); [src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html](../src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/form-field`; `@angular/material/input`; `@angular/forms`; `rxjs/operators`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-input-email` — `InputEmailComponent`

**Arquivo:** [src/app/components/inputs/input-email/input-custom.component.ts](../src/app/components/inputs/input-email/input-custom.component.ts).

**Responsabilidade / decisão:** Entrada/seleção de email com contrato de formulário próprio. **KEEP**.

**Inputs:** `control!: FormControl;`; `label: string = 'E-mail';`; `placeholder: string = 'Digite seu e-mail';`; `autocomplete: string = 'email';`; `maxlength: number = 200;`; `requiredError: string = 'Campo obrigatório';`; `emailError: string = 'E-mail inválido';`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (7):** [src/app/pages/cliente/form-cliente/form-cliente.component.html](../src/app/pages/cliente/form-cliente/form-cliente.component.html); [src/app/pages/config/email-servidor/email-servidor-teste-dialog.component.html](../src/app/pages/config/email-servidor/email-servidor-teste-dialog.component.html); [src/app/pages/config/email-servidor/email-servidor.component.html](../src/app/pages/config/email-servidor/email-servidor.component.html); [src/app/pages/empresa/empresa-form.component.html](../src/app/pages/empresa/empresa-form.component.html); [src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html](../src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html); [src/app/pages/onboarding-v2/company-step/onboarding-v2-company-page.component.html](../src/app/pages/onboarding-v2/company-step/onboarding-v2-company-page.component.html); [src/app/pages/onboarding-v2/entry/onboarding-v2-entry-page.component.html](../src/app/pages/onboarding-v2/entry/onboarding-v2-entry-page.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/form-field`; `@angular/material/input`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-input-moeda` — `InputMoedaComponent`

**Arquivo:** [src/app/components/inputs/input-moeda/input-moeda.component.ts](../src/app/components/inputs/input-moeda/input-moeda.component.ts).

**Responsabilidade / decisão:** Entrada/seleção de moeda com contrato de formulário próprio. **KEEP**.

**Inputs:** `control!: FormControl;`; `label: string = 'Valor';`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (12):** [src/app/components/pagamentos-section/pagamentos-section.component.html](../src/app/components/pagamentos-section/pagamentos-section.component.html); [src/app/components/preco/preco-selector.component.html](../src/app/components/preco/preco-selector.component.html); [src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts); [src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html](../src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html); [src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html](../src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html); [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts); [src/app/pages/orcamentos/form-orcamento/form-orcamento.component.html](../src/app/pages/orcamentos/form-orcamento/form-orcamento.component.html); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html); [src/app/pages/pedido/dialog-descrever-item/dialog-descrever-item.component.html](../src/app/pages/pedido/dialog-descrever-item/dialog-descrever-item.component.html); [src/app/pages/pedido/form-pedido/form-pedido.component.html](../src/app/pages/pedido/form-pedido/form-pedido.component.html); [src/app/pages/pessoas/folha/components/dialog-criar-acordo/dialog-criar-acordo.component.html](../src/app/pages/pessoas/folha/components/dialog-criar-acordo/dialog-criar-acordo.component.html); [src/app/pages/pessoas/folha/components/dialog-valor-acao/dialog-valor-acao.component.html](../src/app/pages/pessoas/folha/components/dialog-valor-acao/dialog-valor-acao.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/form-field`; `@angular/material/input`; `rxjs`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-input-multi-select` — `InputMultiSelectComponent`

**Arquivo:** [src/app/components/inputs/input-multi-select/input-multi-select-component.ts](../src/app/components/inputs/input-multi-select/input-multi-select-component.ts).

**Responsabilidade / decisão:** Entrada/seleção de multi select com contrato de formulário próprio. **KEEP**.

**Inputs:** `control!: FormControl;`; `label = 'Selecionar';`; `visualStyle: 'default' | 'subtle' = 'default';`; `options: { id: any; nome: string }[] = [];`; `searchPlaceholder = 'Buscar opção';`; `showSelectedCount = true;`; `hideSelectedFromList = false;`; `cardMinHeight = 220;`; `listHeight = 180;`; `disableListScroll = false;`; `showStickyFooter = false;`; `concludeButtonText = 'Concluir';`; `concludeButtonDisabled = false;`; `footerSelectionLabel = 'selecionado(s)';`.

**Outputs:** `conclude = new EventEmitter<void>();`.

**Consumidores diretos (4):** [src/app/components/dialog/variacao-editar-dialog/variacao-editar-dialog.component.html](../src/app/components/dialog/variacao-editar-dialog/variacao-editar-dialog.component.html); [src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.html); [src/app/pages/demo/demo-smartcalc.component.html](../src/app/pages/demo/demo-smartcalc.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/card`; `@angular/material/list`; `@angular/material/form-field`; `@angular/material/input`; `@angular/material/chips`; `@angular/material/icon`; `@angular/material/button`; `rxjs/operators`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-input-numerico` — `InputNumericoComponent`

**Arquivo:** [src/app/components/inputs/input-numerico/input-numerico.component.ts](../src/app/components/inputs/input-numerico/input-numerico.component.ts).

**Responsabilidade / decisão:** Entrada/seleção de numerico com contrato de formulário próprio. **KEEP**.

**Inputs:** `control!: FormControl;`; `label: string = 'Número';`; `placeholder: string = '';`; `valor = '';`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (13):** [src/app/components/preco/preco-selector.component.html](../src/app/components/preco/preco-selector.component.html); [src/app/pages/apps/smart-calc/smart-calc.component.html](../src/app/pages/apps/smart-calc/smart-calc.component.html); [src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.html](../src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.html); [src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts); [src/app/pages/config/email-servidor/email-servidor.component.html](../src/app/pages/config/email-servidor/email-servidor.component.html); [src/app/pages/config/folha-config/folha-config.component.html](../src/app/pages/config/folha-config/folha-config.component.html); [src/app/pages/demo/demo-smartcalc.component.html](../src/app/pages/demo/demo-smartcalc.component.html); [src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html](../src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html); [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts); [src/app/pages/pedido/dialog-adicionar-produto/preco-demanda-component/preco-demanda-config.component.html](../src/app/pages/pedido/dialog-adicionar-produto/preco-demanda-component/preco-demanda-config.component.html); [src/app/pages/pedido/dialog-adicionar-produto/preco-fixo-component/preco-fixo-config.component.html](../src/app/pages/pedido/dialog-adicionar-produto/preco-fixo-component/preco-fixo-config.component.html); [src/app/pages/pedido/dialog-adicionar-produto/preco-metro-component/preco-metro-config.component.html](../src/app/pages/pedido/dialog-adicionar-produto/preco-metro-component/preco-metro-config.component.html); [src/app/pages/pedido/dialog-descrever-item/dialog-descrever-item.component.html](../src/app/pages/pedido/dialog-descrever-item/dialog-descrever-item.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/form-field`; `@angular/material/input`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-input-options` — `InputOptionsComponent`

**Arquivo:** [src/app/components/inputs/input-options/input-options.component.ts](../src/app/components/inputs/input-options/input-options.component.ts).

**Responsabilidade / decisão:** Entrada/seleção de options com contrato de formulário próprio. **KEEP**.

**Inputs:** `control!: FormControl;`; `label: string = 'Selecione uma opção';`; `placeholder: string = '- Selecione -';`; `options: any[] = [];`; `labelKey: string = 'nome';`; `valueKey: string = 'id';`; `showNull: boolean = true;`; `clearable: boolean = false;`; `nullLabel: string = '-- Selecione --';`; `disabled: boolean = false;`; `createLabel: string | null = null;`; `createDisabled: boolean = false;`; `hierarchical: boolean = false;`; `searchable: boolean = false;`; `optionSubtitleKey: string = 'subtitle';`; `optionLevelKey: string = 'level';`; `optionPathKey: string = 'path';`; `selectedLabelKey: string | null = null;`; `searchKeys: string[] = [];`.

**Outputs:** `createClick = new EventEmitter<void>();`.

**Consumidores diretos (21):** [src/app/components/inputs/input-unidade-medida/input-unidade-medida.component.ts](../src/app/components/inputs/input-unidade-medida/input-unidade-medida.component.ts); [src/app/components/pagamentos-section/pagamentos-section.component.html](../src/app/components/pagamentos-section/pagamentos-section.component.html); [src/app/components/preco/preco-selector.component.html](../src/app/components/preco/preco-selector.component.html); [src/app/pages/apps/smart-calc/smart-calc.component.html](../src/app/pages/apps/smart-calc/smart-calc.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/calculadora-materiais/produto-calculadora-materiais-tab.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/calculadora-materiais/produto-calculadora-materiais-tab.component.html); [src/app/pages/config/folha-config/folha-config.component.html](../src/app/pages/config/folha-config/folha-config.component.html); [src/app/pages/demo/demo-smartcalc.component.html](../src/app/pages/demo/demo-smartcalc.component.html); [src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html](../src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html); [src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts](../src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts); [src/app/pages/grafica/categorias/grafica-categoria-form.component.ts](../src/app/pages/grafica/categorias/grafica-categoria-form.component.ts); [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts); [src/app/pages/grafica/formatos/grafica-formato-form.component.ts](../src/app/pages/grafica/formatos/grafica-formato-form.component.ts); [src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.ts); [src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts); [src/app/pages/grafica/produtos/grafica-produto-form.component.ts](../src/app/pages/grafica/produtos/grafica-produto-form.component.ts); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html); [src/app/pages/pedido/form-pedido/form-pedido.component.html](../src/app/pages/pedido/form-pedido/form-pedido.component.html); [src/app/pages/pessoas/folha/components/dialog-criar-acordo/dialog-criar-acordo.component.html](../src/app/pages/pessoas/folha/components/dialog-criar-acordo/dialog-criar-acordo.component.html); [src/app/pages/pessoas/folha/components/dialog-renegociar-acordos/dialog-renegociar-acordos.component.html](../src/app/pages/pessoas/folha/components/dialog-renegociar-acordos/dialog-renegociar-acordos.component.html); [src/app/pages/pessoas/folha/components/dialog-valor-acao/dialog-valor-acao.component.html](../src/app/pages/pessoas/folha/components/dialog-valor-acao/dialog-valor-acao.component.html); [src/app/pages/site/configuracoes/site-configuracoes.component.html](../src/app/pages/site/configuracoes/site-configuracoes.component.html).

**Testes relacionados:** [src/app/components/inputs/input-options/input-options.component.spec.ts](../src/app/components/inputs/input-options/input-options.component.spec.ts).

**Dependências:** `@angular/forms`; `@angular/material/form-field`; `@angular/material/input`; `@angular/material/select`; `@angular/material/core`; `@angular/material/button`; `@angular/material/icon`; `@angular/material/tooltip`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; estilos inline.

### `app-input-pesquisa` — `InputPesquisaComponent`

**Arquivo:** [src/app/components/inputs/input-pesquisa/input-pesquisa.component.ts](../src/app/components/inputs/input-pesquisa/input-pesquisa.component.ts).

**Responsabilidade / decisão:** Entrada/seleção de pesquisa com contrato de formulário próprio. **EVOLVE**.

**Inputs:** `placeholder = 'Digite para pesquisar...';`; `showLabel = true;`; `value = '';`.

**Outputs:** `valorAlterado = new EventEmitter<string>();`.

**Consumidores diretos (17):** [src/app/components/dual-list-transfer/dual-list-transfer.component.html](../src/app/components/dual-list-transfer/dual-list-transfer.component.html); [src/app/components/filtro-pesquisa-card/filtro-pesquisa-card.component.html](../src/app/components/filtro-pesquisa-card/filtro-pesquisa-card.component.html); [src/app/components/list-filter-bar/list-filter-bar.component.html](../src/app/components/list-filter-bar/list-filter-bar.component.html); [src/app/components/produto-selector/produto-selector-dialog.component.ts](../src/app/components/produto-selector/produto-selector-dialog.component.ts); [src/app/components/tabela/listar-produtos.component.html](../src/app/components/tabela/listar-produtos.component.html); [src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html); [src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html](../src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html); [src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html](../src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html); [src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html](../src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html); [src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html](../src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html); [src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html](../src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html); [src/app/pages/cliente/listar-cliente/listar-cliente.component.html](../src/app/pages/cliente/listar-cliente/listar-cliente.component.html); [src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html](../src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html); [src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html](../src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html); [src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html](../src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html); [src/app/pages/site/banners/listar-banners/listar-banners.component.html](../src/app/pages/site/banners/listar-banners/listar-banners.component.html); [src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html](../src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/form-field`; `@angular/material/input`; `rxjs/operators`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-input-telefone` — `InputTelefoneComponent`

**Arquivo:** [src/app/components/inputs/input-telefone/input-telefone.component.ts](../src/app/components/inputs/input-telefone/input-telefone.component.ts).

**Responsabilidade / decisão:** Entrada/seleção de telefone com contrato de formulário próprio. **KEEP**.

**Inputs:** `control!: FormControl;`; `label: string = 'Telefone';`; `placeholder: string = '';`; `autocomplete: string = 'tel';`; `maxLength: number = 11;`; `required: boolean = true;`; `requiredError: string = 'Campo obrigatório';`; `invalidError: string = 'Telefone inválido';`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (8):** [src/app/pages/apps/calculadoras/pisos/calculadora-pisos-contato-orcamento-dialog.component.ts](../src/app/pages/apps/calculadoras/pisos/calculadora-pisos-contato-orcamento-dialog.component.ts); [src/app/pages/cliente/form-cliente/form-cliente.component.html](../src/app/pages/cliente/form-cliente/form-cliente.component.html); [src/app/pages/empresa/empresa-form.component.html](../src/app/pages/empresa/empresa-form.component.html); [src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html](../src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html); [src/app/pages/onboarding-v2/company-step/onboarding-v2-company-page.component.html](../src/app/pages/onboarding-v2/company-step/onboarding-v2-company-page.component.html); [src/app/pages/onboarding-v2/entry/onboarding-v2-entry-page.component.html](../src/app/pages/onboarding-v2/entry/onboarding-v2-entry-page.component.html); [src/app/pages/pessoas/folha/components/dialog-folha-whatsapp/dialog-folha-whatsapp.component.html](../src/app/pages/pessoas/folha/components/dialog-folha-whatsapp/dialog-folha-whatsapp.component.html); [src/app/pages/site/configuracoes/site-configuracoes.component.html](../src/app/pages/site/configuracoes/site-configuracoes.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/form-field`; `@angular/material/input`; `@angular/forms`; `rxjs/operators`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-input-textarea` — `InputTextareaComponent`

**Arquivo:** [src/app/components/inputs/input-text/input-textarea.component.ts](../src/app/components/inputs/input-text/input-textarea.component.ts).

**Responsabilidade / decisão:** Entrada/seleção de textarea com contrato de formulário próprio. **DEPRECATE proposto**.

**Inputs:** `control!: FormControl;`; `label: string = 'Textarea';`; `placeholder: string = '';`; `rows: number = 5;`; `maxlength: number = 255;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (0):** Nenhuma detectada.

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/form-field`; `@angular/material/input`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-input-textarea` — `InputTextareaComponent`

**Arquivo:** [src/app/components/inputs/input-textarea/input-textarea.component.ts](../src/app/components/inputs/input-textarea/input-textarea.component.ts).

**Responsabilidade / decisão:** Entrada/seleção de textarea com contrato de formulário próprio. **KEEP**.

**Inputs:** `control!: FormControl;`; `label: string = 'Textarea';`; `placeholder: string = '';`; `rows: number = 5;`; `maxlength: number = 255;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (25):** [src/app/components/observacoes-card/observacoes-card.component.html](../src/app/components/observacoes-card/observacoes-card.component.html); [src/app/pages/cadastro-tecnico/acabamentos/form-acabamento/form-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/form-acabamento/form-acabamento.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.html); [src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html](../src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html); [src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts); [src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html](../src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html); [src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html](../src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html); [src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html](../src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html); [src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts](../src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts); [src/app/pages/grafica/categorias/grafica-categoria-form.component.ts](../src/app/pages/grafica/categorias/grafica-categoria-form.component.ts); [src/app/pages/grafica/comercial-beta/orcamento-comercial-whatsapp-page.component.ts](../src/app/pages/grafica/comercial-beta/orcamento-comercial-whatsapp-page.component.ts); [src/app/pages/grafica/comercial-beta/pedido-comercial-whatsapp-page.component.ts](../src/app/pages/grafica/comercial-beta/pedido-comercial-whatsapp-page.component.ts); [src/app/pages/grafica/cores/grafica-cor-form.component.ts](../src/app/pages/grafica/cores/grafica-cor-form.component.ts); [src/app/pages/grafica/formatos/grafica-formato-form.component.ts](../src/app/pages/grafica/formatos/grafica-formato-form.component.ts); [src/app/pages/grafica/materiais/grafica-material-form.component.ts](../src/app/pages/grafica/materiais/grafica-material-form.component.ts); [src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.ts); [src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts); [src/app/pages/grafica/servicos/grafica-servico-form.component.ts](../src/app/pages/grafica/servicos/grafica-servico-form.component.ts); [src/app/pages/pessoas/folha/components/dialog-criar-acordo/dialog-criar-acordo.component.html](../src/app/pages/pessoas/folha/components/dialog-criar-acordo/dialog-criar-acordo.component.html); [src/app/pages/pessoas/folha/components/dialog-renegociar-acordos/dialog-renegociar-acordos.component.html](../src/app/pages/pessoas/folha/components/dialog-renegociar-acordos/dialog-renegociar-acordos.component.html); [src/app/pages/pessoas/folha/components/dialog-valor-acao/dialog-valor-acao.component.html](../src/app/pages/pessoas/folha/components/dialog-valor-acao/dialog-valor-acao.component.html); [src/app/pages/site/banners/form-banner/form-banner.component.html](../src/app/pages/site/banners/form-banner/form-banner.component.html); [src/app/pages/site/configuracoes/site-configuracoes.component.html](../src/app/pages/site/configuracoes/site-configuracoes.component.html); [src/app/pages/site/paginas/blocos/form-bloco/form-bloco.component.html](../src/app/pages/site/paginas/blocos/form-bloco/form-bloco.component.html); [src/app/pages/site/paginas/form-pagina/form-pagina.component.html](../src/app/pages/site/paginas/form-pagina/form-pagina.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/form-field`; `@angular/material/input`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-input-texto-restrito` — `InputTextoRestritoComponent`

**Arquivo:** [src/app/components/inputs/input-texto/input-texto-restrito.component.ts](../src/app/components/inputs/input-texto/input-texto-restrito.component.ts).

**Responsabilidade / decisão:** Entrada/seleção de texto restrito com contrato de formulário próprio. **KEEP**.

**Inputs:** `control!: FormControl;`; `label: string = '';`; `placeholder: string = '';`; `autocomplete: string = 'off';`; `inputmode: string | null = null;`; `maxlength: number = 200;`; `bloquearNumeros: boolean = false;`; `requiredError: string = 'Campo obrigatório';`; `invalidError: string = 'Valor inválido';`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (36):** [src/app/components/endereco-form/endereco-form.component.html](../src/app/components/endereco-form/endereco-form.component.html); [src/app/components/preco/preco-selector.component.html](../src/app/components/preco/preco-selector.component.html); [src/app/pages/apps/calculadoras/pisos/calculadora-pisos-contato-orcamento-dialog.component.ts](../src/app/pages/apps/calculadoras/pisos/calculadora-pisos-contato-orcamento-dialog.component.ts); [src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.html](../src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.html); [src/app/pages/cadastro-tecnico/acabamentos/form-acabamento/form-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/form-acabamento/form-acabamento.component.html); [src/app/pages/cadastro-tecnico/cores/form-cores/form-cores.component.html](../src/app/pages/cadastro-tecnico/cores/form-cores/form-cores.component.html); [src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.html](../src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.html); [src/app/pages/cadastro-tecnico/materiais/form-material/form-material.component.html](../src/app/pages/cadastro-tecnico/materiais/form-material/form-material.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.html); [src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html](../src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html); [src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts); [src/app/pages/cliente/form-cliente/form-cliente.component.html](../src/app/pages/cliente/form-cliente/form-cliente.component.html); [src/app/pages/config/email-servidor/email-servidor.component.html](../src/app/pages/config/email-servidor/email-servidor.component.html); [src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html](../src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html); [src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html](../src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html); [src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html](../src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html); [src/app/pages/empresa/empresa-form.component.html](../src/app/pages/empresa/empresa-form.component.html); [src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html](../src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html); [src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts](../src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts); [src/app/pages/grafica/categorias/grafica-categoria-form.component.ts](../src/app/pages/grafica/categorias/grafica-categoria-form.component.ts); [src/app/pages/grafica/cores/grafica-cor-form.component.ts](../src/app/pages/grafica/cores/grafica-cor-form.component.ts); [src/app/pages/grafica/formatos/grafica-formato-form.component.ts](../src/app/pages/grafica/formatos/grafica-formato-form.component.ts); [src/app/pages/grafica/materiais/grafica-material-form.component.ts](../src/app/pages/grafica/materiais/grafica-material-form.component.ts); [src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.ts); [src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts); [src/app/pages/grafica/produtos/grafica-produto-form.component.ts](../src/app/pages/grafica/produtos/grafica-produto-form.component.ts); [src/app/pages/grafica/servicos/grafica-servico-form.component.ts](../src/app/pages/grafica/servicos/grafica-servico-form.component.ts); [src/app/pages/onboarding-v2/company-step/onboarding-v2-company-page.component.html](../src/app/pages/onboarding-v2/company-step/onboarding-v2-company-page.component.html); [src/app/pages/onboarding-v2/entry/onboarding-v2-entry-page.component.html](../src/app/pages/onboarding-v2/entry/onboarding-v2-entry-page.component.html); [src/app/pages/pedido/dialog-descrever-item/dialog-descrever-item.component.html](../src/app/pages/pedido/dialog-descrever-item/dialog-descrever-item.component.html); [src/app/pages/pedido/form-pedido/form-pedido.component.html](../src/app/pages/pedido/form-pedido/form-pedido.component.html); [src/app/pages/perfil/modal-perfil/perfil-dialog.component.html](../src/app/pages/perfil/modal-perfil/perfil-dialog.component.html); [src/app/pages/site/banners/form-banner/form-banner.component.html](../src/app/pages/site/banners/form-banner/form-banner.component.html); [src/app/pages/site/configuracoes/site-configuracoes.component.html](../src/app/pages/site/configuracoes/site-configuracoes.component.html); [src/app/pages/site/paginas/blocos/form-bloco/form-bloco.component.html](../src/app/pages/site/paginas/blocos/form-bloco/form-bloco.component.html); [src/app/pages/site/paginas/form-pagina/form-pagina.component.html](../src/app/pages/site/paginas/form-pagina/form-pagina.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/form-field`; `@angular/material/input`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-input-unidade-medida` — `InputUnidadeMedidaComponent`

**Arquivo:** [src/app/components/inputs/input-unidade-medida/input-unidade-medida.component.ts](../src/app/components/inputs/input-unidade-medida/input-unidade-medida.component.ts).

**Responsabilidade / decisão:** Entrada/seleção de unidade medida com contrato de formulário próprio. **KEEP**.

**Inputs:** `control!: FormControl;`; `label = 'Unidade de Medida';`; `placeholder = '- Selecione -';`; `options: UnidadeMedidaOption[] = [];`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (1):** [src/app/components/preco/preco-selector.component.html](../src/app/components/preco/preco-selector.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `../input-options/input-options.component`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 10 linhas; sem bloco de estilos inline.

### `app-unit-input` — `UnitInputComponent`

**Arquivo:** [src/app/components/inputs/unit-input/unit-input.component.ts](../src/app/components/inputs/unit-input/unit-input.component.ts).

**Responsabilidade / decisão:** Entrada/seleção de unit com contrato de formulário próprio. **KEEP**.

**Inputs:** `label = '';`; `placeholder = '';`; `unit: 'm' | 'm²' | '%' | 'un' | 'caixa' | 'kg' | 'L' | string = '';`; `min: number | null = null;`; `max: number | null = null;`; `decimals = 2;`; `requiredError = false;`; `required = false;`; `name = '';`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (4):** [src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.html](../src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.html); [src/app/pages/grafica/formatos/grafica-formato-form.component.ts](../src/app/pages/grafica/formatos/grafica-formato-form.component.ts); [src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.ts); [src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts).

**Testes relacionados:** [src/app/components/inputs/unit-input/unit-input.component.spec.ts](../src/app/components/inputs/unit-input/unit-input.component.spec.ts).

**Dependências:** `@angular/forms`; `@angular/material/form-field`; `@angular/material/input`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 21 linhas; estilos inline.

### `app-itens-pedido-section` — `ItensPedidoSectionComponent`

**Arquivo:** [src/app/components/itens-pedido-section/itens-pedido-section.component.ts](../src/app/components/itens-pedido-section/itens-pedido-section.component.ts).

**Responsabilidade / decisão:** Itens comerciais e ações de busca/quantidade/remoção. **FEATURE-SPECIFIC**.

**Inputs:** `titulo = 'Itens do pedido';`; `itemContextoLabel = 'pedido';`; `itens: ItemPedidoView[] = [];`; `subtotal: number = 0;`; `permitirAlterarQuantidade: boolean = true;`; `mostrarAcoes: boolean = true;`; `mostrarDescreverItens: boolean = true;`; `mostrarBuscaRapida: boolean = false;`; `buscarProdutosLabel = 'Buscar produtos';`; `buscaRapidaLabel = 'Busca rápida';`; `descreverItensLabel = 'Descrever itens';`; `inativo = false;`.

**Outputs:** `buscarProdutos = new EventEmitter<void>();`; `buscaRapida = new EventEmitter<void>();`; `descreverItens = new EventEmitter<void>();`; `removerItem = new EventEmitter<number>();`; `alterarQuantidade = new EventEmitter<{ index: number; quantidade: number }>();`.

**Consumidores diretos (4):** [src/app/pages/demo/demo-pedido.component.html](../src/app/pages/demo/demo-pedido.component.html); [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html); [src/app/pages/pedido/form-pedido/form-pedido.component.html](../src/app/pages/pedido/form-pedido/form-pedido.component.html).

**Testes relacionados:** [src/app/components/itens-pedido-section/itens-pedido-section.component.spec.ts](../src/app/components/itens-pedido-section/itens-pedido-section.component.spec.ts).

**Dependências:** `@angular/forms`; `@angular/material/button`; `@angular/material/icon`; `@angular/material/tooltip`; `../section-card/section-card.component`.

**Responsividade (evidência estática):** `@media (max-width: 900px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-list-filter-bar` — `ListFilterBarComponent`

**Arquivo:** [src/app/components/list-filter-bar/list-filter-bar.component.ts](../src/app/components/list-filter-bar/list-filter-bar.component.ts).

**Responsabilidade / decisão:** Composição de pesquisa, selects e limpar filtros. **CONSOLIDATE**.

**Inputs:** `placeholder = 'Digite para pesquisar...';`; `searchValue = '';`; `showSearchLabel = false;`; `filters: ListFilterDefinition[] = [];`; `showClear = false;`.

**Outputs:** `searchChange = new EventEmitter<string>();`; `filterChange = new EventEmitter<ListFilterChange>();`; `clear = new EventEmitter<void>();`.

**Consumidores diretos (1):** [src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html](../src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/button`; `@angular/material/form-field`; `@angular/material/icon`; `@angular/material/select`; `../inputs/input-pesquisa/input-pesquisa.component`.

**Responsividade (evidência estática):** `@media (max-width: 1180px)`; `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-manual-link` — `ManualLinkComponent`

**Arquivo:** [src/app/components/manual-link/manual-link.component.ts](../src/app/components/manual-link/manual-link.component.ts).

**Responsabilidade / decisão:** Navegação de ajuda contextual. **KEEP**.

**Inputs:** `routerLink: any[] | string = '/page/ajuda';`; `fragment: string | undefined = undefined;`; `label: string = 'Ajuda';`; `icon: string = 'help_outline';`; `color: 'primary' | 'accent' | 'warn' = 'primary';`; `onlyIcon: boolean = false;`; `ariaLabel: string = 'Abrir manual';`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (2):** [src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.html](../src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.html); [src/app/pages/notificacoes/notificacoes.component.html](../src/app/pages/notificacoes/notificacoes.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/button`; `@angular/material/icon`; `@angular/material/tooltip`; `@angular/router`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-metric-card` — `MetricCardComponent`

**Arquivo:** [src/app/components/metric-card/metric-card.component.ts](../src/app/components/metric-card/metric-card.component.ts).

**Responsabilidade / decisão:** Indicador com título/valor/detalhe e ação. **KEEP**.

**Inputs:** `label = '';`; `value = '';`; `detail = '';`; `info = '';`; `icon = 'info-circle';`; `accent: MetricCardAccent = 'primary';`; `disabled = false;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (5):** [src/app/pages/apps/smart-calc/smart-calc.component.html](../src/app/pages/apps/smart-calc/smart-calc.component.html); [src/app/pages/dashboards/dashboard1/dashboard1.component.html](../src/app/pages/dashboards/dashboard1/dashboard1.component.html); [src/app/pages/deposito/dashboard/deposito-dashboard-page.component.html](../src/app/pages/deposito/dashboard/deposito-dashboard-page.component.html); [src/app/pages/links/pages/analytics/links-analytics.component.html](../src/app/pages/links/pages/analytics/links-analytics.component.html); [src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html](../src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `angular-tabler-icons`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-mobile-fab-action` — `MobileFabActionComponent`

**Arquivo:** [src/app/components/mobile-fab-action/mobile-fab-action.component.ts](../src/app/components/mobile-fab-action/mobile-fab-action.component.ts).

**Responsabilidade / decisão:** Ação primária flutuante. **EVOLVE**.

**Inputs:** `label = '';`; `icon = 'add';`; `compact = false;`; `ariaLabel = '';`.

**Outputs:** `action = new EventEmitter<void>();`.

**Consumidores diretos (12):** [src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html); [src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html](../src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html); [src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html](../src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html); [src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html](../src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html); [src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html](../src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html); [src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html](../src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html); [src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html](../src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html); [src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html](../src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html); [src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html](../src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html); [src/app/pages/pedido/listar-pedido/listar-pedido.component.html](../src/app/pages/pedido/listar-pedido/listar-pedido.component.html); [src/app/pages/site/banners/listar-banners/listar-banners.component.html](../src/app/pages/site/banners/listar-banners/listar-banners.component.html); [src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html](../src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/button`; `@angular/material/icon`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-mobile-page-header` — `MobilePageHeaderComponent`

**Arquivo:** [src/app/components/mobile-page-header/mobile-page-header.component.ts](../src/app/components/mobile-page-header/mobile-page-header.component.ts).

**Responsabilidade / decisão:** Header móvel com título, voltar e ação. **CONSOLIDATE**.

**Inputs:** `title = '';`; `showBack = true;`; `backAriaLabel = 'Voltar';`; `badgeText = '';`; `actionIcon = '';`; `actionAriaLabel = 'Ação';`.

**Outputs:** `back = new EventEmitter<void>();`; `action = new EventEmitter<void>();`.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (0):** Nenhuma detectada.

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/button`; `@angular/material/icon`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-mobile-sheet-header` — `MobileSheetHeaderComponent`

**Arquivo:** [src/app/components/mobile-sheet-header/mobile-sheet-header.component.ts](../src/app/components/mobile-sheet-header/mobile-sheet-header.component.ts).

**Responsabilidade / decisão:** Título e hint de sheet. **KEEP**.

**Inputs:** `title = '';`; `hint = '';`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (1):** [src/app/layouts/full/full.component.html](../src/app/layouts/full/full.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** Angular core/common.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-mobile-summary-sheet` — `MobileSummarySheetComponent`

**Arquivo:** [src/app/components/mobile-summary-sheet/mobile-summary-sheet.component.ts](../src/app/components/mobile-summary-sheet/mobile-summary-sheet.component.ts).

**Responsabilidade / decisão:** Overlay/sheet de resumo com projeção. **EVOLVE**.

**Inputs:** `open = false;`; `bottomOffset = '0px';`; `backdropZIndex = 58;`; `sheetZIndex = 59;`; `closeAriaLabel = 'Fechar painel';`.

**Outputs:** `close = new EventEmitter<void>();`.

**Consumidores diretos (3):** [src/app/pages/demo/demo-whatsapp.component.html](../src/app/pages/demo/demo-whatsapp.component.html); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html); [src/app/pages/pedido/form-pedido/form-pedido.component.html](../src/app/pages/pedido/form-pedido/form-pedido.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/animations`.

**Responsividade (evidência estática):** `@media (max-width: 900px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-mobile-total-bar` — `MobileTotalBarComponent`

**Arquivo:** [src/app/components/mobile-total-bar/mobile-total-bar.component.ts](../src/app/components/mobile-total-bar/mobile-total-bar.component.ts).

**Responsabilidade / decisão:** Resumo, status, expansão e ações fixas móveis. **CONSOLIDATE**.

**Inputs:** `label = 'Total estimado';`; `valueText = '';`; `status: string | null | undefined = null;`; `detailText = 'Ver detalhes';`; `expandable = true;`; `expanded = false;`; `loading = false;`; `secondaryActionText = '';`; `secondaryActionDisabled = false;`; `secondaryActionAriaLabel = 'Executar ação secundária';`; `actionText = '';`; `actionDisabled = false;`; `expandAriaLabel = 'Ver detalhes do cálculo';`; `actionAriaLabel = 'Executar ação principal';`; `bottomOffset = '0px';`; `attachedToBottomNav = false;`.

**Outputs:** `expand = new EventEmitter<void>();`; `secondaryAction = new EventEmitter<void>();`; `action = new EventEmitter<void>();`.

**Consumidores diretos (21):** [src/app/pages/apps/smart-calc/smart-calc.component.html](../src/app/pages/apps/smart-calc/smart-calc.component.html); [src/app/pages/cadastro-tecnico/acabamentos/form-acabamento/form-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/form-acabamento/form-acabamento.component.html); [src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.html); [src/app/pages/cadastro-tecnico/cores/form-cores/form-cores.component.html](../src/app/pages/cadastro-tecnico/cores/form-cores/form-cores.component.html); [src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.html](../src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.html); [src/app/pages/cadastro-tecnico/materiais/form-material/form-material.component.html](../src/app/pages/cadastro-tecnico/materiais/form-material/form-material.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.html); [src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html](../src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html); [src/app/pages/cliente/form-cliente/form-cliente.component.html](../src/app/pages/cliente/form-cliente/form-cliente.component.html); [src/app/pages/demo/demo-home.component.html](../src/app/pages/demo/demo-home.component.html); [src/app/pages/demo/demo-pedido.component.html](../src/app/pages/demo/demo-pedido.component.html); [src/app/pages/demo/demo-smartcalc.component.html](../src/app/pages/demo/demo-smartcalc.component.html); [src/app/pages/demo/demo-whatsapp.component.html](../src/app/pages/demo/demo-whatsapp.component.html); [src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html](../src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html); [src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html](../src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html); [src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html](../src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html); [src/app/pages/pedido/form-pedido/form-pedido.component.html](../src/app/pages/pedido/form-pedido/form-pedido.component.html); [src/app/pages/site/banners/form-banner/form-banner.component.html](../src/app/pages/site/banners/form-banner/form-banner.component.html); [src/app/pages/site/paginas/form-pagina/form-pagina.component.html](../src/app/pages/site/paginas/form-pagina/form-pagina.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/button`; `@angular/material/icon`; `../status-badge/status-badge.component`.

**Responsividade (evidência estática):** `@media (max-width: 900px)`; `@media (max-width: 460px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-observacoes-card` — `ObservacoesCardComponent`

**Arquivo:** [src/app/components/observacoes-card/observacoes-card.component.ts](../src/app/components/observacoes-card/observacoes-card.component.ts).

**Responsabilidade / decisão:** Leitura/edição/salvamento de observações. **FEATURE-SPECIFIC**.

**Inputs:** `titulo = 'Observações';`; `renderCard = true;`; `divider = true;`; `control!: FormControl<string>;`; `label = 'Observações';`; `placeholder = 'Anotações sobre o pedido';`; `textoSalvo = '';`; `salvando = false;`; `salvo = false;`; `emptyMessage = 'Nenhuma observação cadastrada.';`; `inativo = false;`.

**Outputs:** `salvar = new EventEmitter<void>();`.

**Consumidores diretos (4):** [src/app/pages/demo/demo-pedido.component.html](../src/app/pages/demo/demo-pedido.component.html); [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html); [src/app/pages/pedido/form-pedido/form-pedido.component.html](../src/app/pages/pedido/form-pedido/form-pedido.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/button`; `@angular/material/icon`; `../section-card/section-card.component`; `../inputs/input-textarea/input-textarea.component`.

**Responsividade (evidência estática):** `@media (max-width: 640px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-onboarding-selection-step` — `OnboardingSelectionStepComponent`

**Arquivo:** [src/app/components/onboarding/onboarding-selection-step.component.ts](../src/app/components/onboarding/onboarding-selection-step.component.ts).

**Responsabilidade / decisão:** Seleção múltipla em passo do onboarding. **FEATURE-SPECIFIC**.

**Inputs:** `titulo = '';`; `subtitulo = '';`; `ajuda = '';`; `featuredTitle = 'Mais usados';`; `items: OnboardingSelectionOption[] = [];`; `loading = false;`; `selectedIds = new Set<number>();`.

**Outputs:** `toggleAll = new EventEmitter<boolean>();`; `toggleItem = new EventEmitter<{ checked: boolean; id: number }>();`.

**Consumidores diretos (1):** [src/app/pages/onboarding/onboarding-page.component.html](../src/app/pages/onboarding/onboarding-page.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `src/app/material.module`; `../section-card/section-card.component`.

**Responsividade (evidência estática):** `@media (max-width: 992px)`; `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-onboarding-shell` — `OnboardingShellComponent`

**Arquivo:** [src/app/components/onboarding/onboarding-shell.component.ts](../src/app/components/onboarding/onboarding-shell.component.ts).

**Responsabilidade / decisão:** Estrutura de passos, progresso e ações do onboarding. **FEATURE-SPECIFIC**.

**Inputs:** `tituloFluxo = 'Configuração inicial';`; `tituloEtapa = '';`; `subtituloEtapa = '';`; `progressoComplementar = '';`; `passoAtual = 1;`; `totalPassos = 1;`; `progressoPercentual = 0;`; `semanticSteps = false;`; `completed = false;`; `skipDisabled = false;`; `navigationInHeader = false;`; `showExit = true;`; `showFooter = true;`; `showBack = true;`; `showSkip = false;`; `showPrimary = true;`; `primaryLabel = 'Próximo';`; `primaryDisabled = false;`; `primaryLoading = false;`; `primaryHint = '';`.

**Outputs:** `voltar = new EventEmitter<void>();`; `pular = new EventEmitter<void>();`; `principal = new EventEmitter<void>();`; `sair = new EventEmitter<void>();`.

**Consumidores diretos (4):** [src/app/pages/onboarding/onboarding-page.component.html](../src/app/pages/onboarding/onboarding-page.component.html); [src/app/pages/onboarding-v2/company-step/onboarding-v2-company-page.component.html](../src/app/pages/onboarding-v2/company-step/onboarding-v2-company-page.component.html); [src/app/pages/onboarding-v2/products-step/onboarding-v2-products-page.component.html](../src/app/pages/onboarding-v2/products-step/onboarding-v2-products-page.component.html); [src/app/pages/onboarding-v2/summary-step/onboarding-v2-summary-page.component.html](../src/app/pages/onboarding-v2/summary-step/onboarding-v2-summary-page.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `src/app/material.module`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-onboarding-wizard` — `OnboardingWizardComponent`

**Arquivo:** [src/app/components/onboarding/onboarding-wizard.component.ts](../src/app/components/onboarding/onboarding-wizard.component.ts).

**Responsabilidade / decisão:** Fluxo guiado de configuração. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (0):** Nenhuma detectada.

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/stepper`; `@angular/material/checkbox`; `@angular/material/dialog`; `src/app/material.module`; `ngx-toastr`; `src/app/layouts/full/vertical/sidebar/branding.component`; `./onboarding.service`; `../card-header/card-header.component`; `src/app/pages/empresa/empresa-form.component`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-pagamentos-section` — `PagamentosSectionComponent`

**Arquivo:** [src/app/components/pagamentos-section/pagamentos-section.component.ts](../src/app/components/pagamentos-section/pagamentos-section.component.ts).

**Responsabilidade / decisão:** Composição dos lançamentos de pagamento. **FEATURE-SPECIFIC**.

**Inputs:** `pagamentoNovo: FormGroup | null = null;`; `pagamentosControls: FormGroup[] = [];`; `formasPagamento: any[] = [];`; `pago: number = 0;`; `restante: number = 0;`; `pagamentosLista: any[] = [];`; `expanded: boolean = false;`; `mostrarAcoes: boolean = true;`; `mostrarConfirmado: boolean = true;`; `mostrarData: boolean = true;`; `inativo: boolean = false;`.

**Outputs:** `addPagamento = new EventEmitter<void>();`; `removerPagamento = new EventEmitter<number>();`.

**Consumidores diretos (2):** [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html); [src/app/pages/pedido/form-pedido/form-pedido.component.html](../src/app/pages/pedido/form-pedido/form-pedido.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `rxjs`; `@angular/material/expansion`; `@angular/material/icon`; `@angular/material/button`; `@angular/material/divider`; `../section-card/section-card.component`; `../inputs/input-options/input-options.component`; `../shared-components.module`.

**Responsividade (evidência estática):** `@media (max-width: 767px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-page-card` — `PageCardComponent`

**Arquivo:** [src/app/components/page-card/page-card.component.ts](../src/app/components/page-card/page-card.component.ts).

**Responsabilidade / decisão:** Container de página: header, conteúdo e footer projetados. **EVOLVE**.

**Inputs:** `titulo: string = '';`; `subtitulo?: string;`; `botaoTexto?: string;`; `botaoIcone: string = 'arrow_back';`; `botaoCor: 'primary' | 'accent' | 'warn' = 'primary';`; `botaoRota?: string | any[];`; `permissao: string | string[] = '';`; `mostrarDivisor: boolean = true;`; `headerDivider?: boolean;`; `contentPadding: boolean = true;`; `showFooter: boolean = false;`; `footerDivider: boolean = true;`; `helpTexto: string = 'Ajuda';`; `helpIcone: string = 'help_outline';`; `helpRota?: string | any[];`; `helpFragment?: string;`; `helpExterno: boolean = false;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (58):** [src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.html](../src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.html); [src/app/pages/apps/fiscal/configuracoes/fiscal-configuracoes.component.ts](../src/app/pages/apps/fiscal/configuracoes/fiscal-configuracoes.component.ts); [src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts](../src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts); [src/app/pages/apps/fiscal/documentos/fiscal-documentos.component.ts](../src/app/pages/apps/fiscal/documentos/fiscal-documentos.component.ts); [src/app/pages/apps/fiscal/emitir/fiscal-emitir.component.ts](../src/app/pages/apps/fiscal/emitir/fiscal-emitir.component.ts); [src/app/pages/apps/fiscal/inutilizacoes/fiscal-inutilizacoes.component.ts](../src/app/pages/apps/fiscal/inutilizacoes/fiscal-inutilizacoes.component.ts); [src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts](../src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts); [src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts](../src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts); [src/app/pages/apps/smart-calc/smart-calc.component.html](../src/app/pages/apps/smart-calc/smart-calc.component.html); [src/app/pages/cadastro-tecnico/acabamentos/form-acabamento/form-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/form-acabamento/form-acabamento.component.html); [src/app/pages/cadastro-tecnico/cores/form-cores/form-cores.component.html](../src/app/pages/cadastro-tecnico/cores/form-cores/form-cores.component.html); [src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.html](../src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.html); [src/app/pages/cadastro-tecnico/materiais/form-material/form-material.component.html](../src/app/pages/cadastro-tecnico/materiais/form-material/form-material.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.html); [src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html](../src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html); [src/app/pages/calculadora-materiais/calculadora-materiais.component.html](../src/app/pages/calculadora-materiais/calculadora-materiais.component.html); [src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts); [src/app/pages/catalogo/categorias/catalogo-categoria-form.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-form.component.ts); [src/app/pages/catalogo/marcas/catalogo-marca-form.component.ts](../src/app/pages/catalogo/marcas/catalogo-marca-form.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-detail.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-detail.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts); [src/app/pages/config/aplicativos-atalhos/aplicativos-atalhos.component.html](../src/app/pages/config/aplicativos-atalhos/aplicativos-atalhos.component.html); [src/app/pages/dashboards/dashboard1/dashboard1.component.html](../src/app/pages/dashboards/dashboard1/dashboard1.component.html); [src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html](../src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html); [src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html](../src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html); [src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html](../src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html); [src/app/pages/funcionarios/detalhe-funcionario/detalhe-funcionario.component.html](../src/app/pages/funcionarios/detalhe-funcionario/detalhe-funcionario.component.html); [src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html](../src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html); [src/app/pages/funcionarios/listar-funcionarios/listar-funcionarios.component.html](../src/app/pages/funcionarios/listar-funcionarios/listar-funcionarios.component.html); [src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts](../src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts); [src/app/pages/grafica/categorias/grafica-categoria-form.component.ts](../src/app/pages/grafica/categorias/grafica-categoria-form.component.ts); [src/app/pages/grafica/categorias/grafica-categorias.component.ts](../src/app/pages/grafica/categorias/grafica-categorias.component.ts); [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts); [src/app/pages/grafica/comercial-beta/comercial-beta-list.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-list.component.ts); [src/app/pages/grafica/comercial-beta/orcamento-comercial-impressao-page.component.ts](../src/app/pages/grafica/comercial-beta/orcamento-comercial-impressao-page.component.ts); [src/app/pages/grafica/comercial-beta/orcamento-comercial-whatsapp-page.component.ts](../src/app/pages/grafica/comercial-beta/orcamento-comercial-whatsapp-page.component.ts); [src/app/pages/grafica/comercial-beta/pedido-comercial-impressao-page.component.ts](../src/app/pages/grafica/comercial-beta/pedido-comercial-impressao-page.component.ts); [src/app/pages/grafica/comercial-beta/pedido-comercial-whatsapp-page.component.ts](../src/app/pages/grafica/comercial-beta/pedido-comercial-whatsapp-page.component.ts); [src/app/pages/grafica/cores/grafica-cor-form.component.ts](../src/app/pages/grafica/cores/grafica-cor-form.component.ts); [src/app/pages/grafica/cores/grafica-cores.component.ts](../src/app/pages/grafica/cores/grafica-cores.component.ts); [src/app/pages/grafica/formatos/grafica-formato-form.component.ts](../src/app/pages/grafica/formatos/grafica-formato-form.component.ts); [src/app/pages/grafica/formatos/grafica-formatos.component.ts](../src/app/pages/grafica/formatos/grafica-formatos.component.ts); [src/app/pages/grafica/materiais/grafica-materiais.component.ts](../src/app/pages/grafica/materiais/grafica-materiais.component.ts); [src/app/pages/grafica/materiais/grafica-material-form.component.ts](../src/app/pages/grafica/materiais/grafica-material-form.component.ts); [src/app/pages/grafica/produtos/grafica-produto-form.component.ts](../src/app/pages/grafica/produtos/grafica-produto-form.component.ts); [src/app/pages/grafica/produtos/grafica-produtos.component.ts](../src/app/pages/grafica/produtos/grafica-produtos.component.ts); [src/app/pages/grafica/servicos/grafica-servico-form.component.ts](../src/app/pages/grafica/servicos/grafica-servico-form.component.ts); [src/app/pages/grafica/servicos/grafica-servicos.component.ts](../src/app/pages/grafica/servicos/grafica-servicos.component.ts); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html); [src/app/pages/pedido/form-pedido/form-pedido.component.html](../src/app/pages/pedido/form-pedido/form-pedido.component.html); [src/app/pages/pedido/listar-pedido/listar-pedido.component.html](../src/app/pages/pedido/listar-pedido/listar-pedido.component.html); [src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.html](../src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.html); [src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.html](../src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.html); [src/app/pages/site/banners/form-banner/form-banner.component.html](../src/app/pages/site/banners/form-banner/form-banner.component.html); [src/app/pages/site/paginas/form-pagina/form-pagina.component.html](../src/app/pages/site/paginas/form-pagina/form-pagina.component.html); [src/app/pages/smart-calc-config/smart-calc-config/smart-calc-config.component.html](../src/app/pages/smart-calc-config/smart-calc-config/smart-calc-config.component.html); [src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.html](../src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.html); [src/app/pages/suporte/suporte.component.html](../src/app/pages/suporte/suporte.component.html).

**Testes relacionados:** [src/app/components/page-card/page-card.component.spec.ts](../src/app/components/page-card/page-card.component.spec.ts).

**Dependências:** `@angular/material/card`; `@angular/material/divider`; `../card-header/card-header.component`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-pedido-fluxo-controles` — `PedidoFluxoControlesComponent`

**Arquivo:** [src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.ts](../src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.ts).

**Responsabilidade / decisão:** Transições e comandos do workflow comercial. **FEATURE-SPECIFIC**.

**Inputs:** `titulo = 'Fluxo do pedido';`; `renderCard = true;`; `divider = true;`; `inativo = false;`; `isReadOnly = false;`; `isOrcamento = false;`; `orcamentoVencido = false;`; `trocandoStatus = false;`; `carregandoStatus = false;`; `statusAtual!: string;`; `restaPagar = 0;`; `totalPago = 0;`; `temPagamentos = false;`; `statusControl!: FormControl;`; `statusOptions: string[] = [];`; `transicoes: { status: string; label: string; bloqueado: boolean; motivo?: string }[] = [];`; `fluxoSteps: { status: string; label: string; atual?: boolean; concluido?: boolean }[] = [];`; `descricaoStatus: string | null = null;`; `permiteAdicionarPagamento = false;`; `permiteFinalizar = false;`; `permiteIniciarProducao = false;`; `hints: string[] = [];`.

**Outputs:** `confirmarPedido = new EventEmitter<void>();`; `irParaPagamentos = new EventEmitter<void>();`; `iniciarProducao = new EventEmitter<void>();`; `marcarPronto = new EventEmitter<void>();`; `marcarEntregue = new EventEmitter<void>();`; `solicitarEntregaSemPagamento = new EventEmitter<void>();`; `editarStatus = new EventEmitter<void>();`; `cancelarStatus = new EventEmitter<void>();`; `salvarStatus = new EventEmitter<void>();`; `aprovarOrcamento = new EventEmitter<void>();`; `cancelarPedido = new EventEmitter<void>();`; `finalizarPedido = new EventEmitter<void>();`; `trocarStatusSelecionado = new EventEmitter<string>();`; `solicitarProducaoSemPagamento = new EventEmitter<void>();`.

**Consumidores diretos (2):** [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/button`; `@angular/material/icon`; `@angular/material/form-field`; `@angular/material/select`; `@angular/material/core`; `@angular/router`; `@angular/material/menu`; `@angular/material/dialog`; `@angular/material/expansion`; `../section-card/section-card.component`; `../manual-link/manual-link.component`; `./pedido-trocar-status-dialog.component`; `../status-badge/status-badge.component`.

**Responsividade (evidência estática):** `@media (max-width: 640px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-pedido-trocar-status-dialog` — `PedidoTrocarStatusDialogComponent`

**Arquivo:** [src/app/components/pedido-fluxo-controles/pedido-trocar-status-dialog.component.ts](../src/app/components/pedido-fluxo-controles/pedido-trocar-status-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: pedido trocar status. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.ts](../src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/dialog`; `@angular/material/button`; `@angular/material/form-field`; `@angular/material/select`; `@angular/material/core`; `@angular/forms`; `src/app/pipes/status-label.pipe`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-pedido-info-card` — `PedidoInfoCardComponent`

**Arquivo:** [src/app/components/pedido-info-card/pedido-info-card.component.ts](../src/app/components/pedido-info-card/pedido-info-card.component.ts).

**Responsabilidade / decisão:** Identificação e informações do pedido. **FEATURE-SPECIFIC**.

**Inputs:** `titulo = 'Dados do pedido';`; `renderCard = true;`; `divider = false;`; `pedido: any | null = null;`; `inativo = false;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (2):** [src/app/pages/demo/demo-pedido.component.html](../src/app/pages/demo/demo-pedido.component.html); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/button`; `@angular/material/icon`; `@angular/material/form-field`; `@angular/material/select`; `@angular/material/core`; `@angular/forms`; `../section-card/section-card.component`; `../status-badge/status-badge.component`.

**Responsividade (evidência estática):** `@media (max-width: 640px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-pedido-tabela` — `PedidoTabelaComponent`

**Arquivo:** [src/app/components/pedido-tabela/pedido-tabela.component.ts](../src/app/components/pedido-tabela/pedido-tabela.component.ts).

**Responsabilidade / decisão:** Tabela de Pedido com colunas comerciais e expansão. **MIGRATE (estrutura); FEATURE-SPECIFIC (domínio)**.

**Inputs:** `data: PedidoListagem[] = [];`; `total = 0;`; `pageSize = 10;`; `sortActive = 'dataCriacao';`; `sortDirection: 'asc' | 'desc' | '' = 'desc';`; `mostrarNumero = true;`; `mostrarOrcamento = false;`; `mostrarStatus = true;`.

**Outputs:** `pageChange = new EventEmitter<PageEvent>();`; `sortChange = new EventEmitter<Sort>();`.

**Consumidores diretos (1):** [src/app/pages/pedido/listar-pedido/listar-pedido.component.html](../src/app/pages/pedido/listar-pedido/listar-pedido.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/router`; `@angular/animations`; `@angular/material/table`; `@angular/material/paginator`; `@angular/material/sort`; `@angular/material/icon`; `../status-badge/status-badge.component`; `src/app/models/pedido/pedido-listagem.model`.

**Responsividade (evidência estática):** `@media (max-width: 640px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-preco-selector` — `PrecoSelectorComponent`

**Arquivo:** [src/app/components/preco/preco-selector.component.ts](../src/app/components/preco/preco-selector.component.ts).

**Responsabilidade / decisão:** Seleção/configuração dos tipos de preço no FormGroup. **FEATURE-SPECIFIC**.

**Inputs:** `formGroup!: FormGroup;`; `tiposDisponiveis?: string[];`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (10):** [src/app/components/dialog/acabamento-variacao-dialog/acabamento-variacao-dialog.component.html](../src/app/components/dialog/acabamento-variacao-dialog/acabamento-variacao-dialog.component.html); [src/app/components/dialog/acabamento-variacao-editar-dialog/acabamento-variacao-editar-dialog.component.html](../src/app/components/dialog/acabamento-variacao-editar-dialog/acabamento-variacao-editar-dialog.component.html); [src/app/components/dialog/variacao-editar-dialog/variacao-editar-dialog.component.html](../src/app/components/dialog/variacao-editar-dialog/variacao-editar-dialog.component.html); [src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.html); [src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html](../src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html); [src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts](../src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts); [src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts); [src/app/pages/grafica/produtos/grafica-produto-form.component.ts](../src/app/pages/grafica/produtos/grafica-produto-form.component.ts); [src/app/pages/grafica/servicos/grafica-servico-form.component.ts](../src/app/pages/grafica/servicos/grafica-servico-form.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/card`; `@angular/material/icon`; `@angular/material/button`; `@angular/material/button-toggle`; `rxjs`; `../inputs/input-moeda/input-moeda.component`; `../inputs/input-numerico/input-numerico.component`; `../inputs/input-texto/input-texto-restrito.component`; `../inputs/input-unidade-medida/input-unidade-medida.component`; `../inputs/input-options/input-options.component`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-pricing-card` — `PricingCardComponent`

**Arquivo:** [src/app/components/pricing-card/pricing-card.component.ts](../src/app/components/pricing-card/pricing-card.component.ts).

**Responsabilidade / decisão:** Apresentação/seleção de plano de assinatura. **FEATURE-SPECIFIC**.

**Inputs:** `plano!: PlanoPublico;`; `popular: boolean = false;`; `imgSrc?: string;`; `ativo: boolean = false;`; `mostrarAnual: boolean = false;`; `selecionarTexto: string = 'Escolher plano';`.

**Outputs:** `escolher = new EventEmitter<PlanoPublico>();`.

**Consumidores diretos (1):** [src/app/pages/billing/billing-pagamento/billing-pagamento.component.html](../src/app/pages/billing/billing-pagamento/billing-pagamento.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/card`; `@angular/material/button`; `angular-tabler-icons`; `src/app/types/plano-publico.type`.

**Responsividade (evidência estática):** `@media (min-width: 992px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-product-identity` — `ProductIdentityComponent`

**Arquivo:** [src/app/components/product-identity/product-identity.component.ts](../src/app/components/product-identity/product-identity.component.ts).

**Responsabilidade / decisão:** Nome/material/formato/cor do produto. **FEATURE-SPECIFIC**.

**Inputs:** `name = '';`; `material?: string | null;`; `format?: string | null;`; `color?: string | null;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (1):** [src/app/pages/smart-calc-config/smart-calc-config/smart-calc-config.component.html](../src/app/pages/smart-calc-config/smart-calc-config/smart-calc-config.component.html).

**Testes relacionados:** [src/app/components/product-identity/product-identity.component.spec.ts](../src/app/components/product-identity/product-identity.component.spec.ts).

**Dependências:** Angular core/common.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 4 linhas; estilos inline.

### `app-produto-selector-dialog` — `ProdutoSelectorDialogComponent`

**Arquivo:** [src/app/components/produto-selector/produto-selector-dialog.component.ts](../src/app/components/produto-selector/produto-selector-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: produto selector. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.ts](../src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/dialog`; `rxjs`; `rxjs/operators`; `src/app/components/inputs/input-pesquisa/input-pesquisa.component`; `src/app/material.module`; `src/app/pages/apps/calculadoras/pisos/calculadora-pisos.models`.

**Responsividade (evidência estática):** `@media (max-width: 600px)`.

**Organização:** template inline com 42 linhas; estilos inline.

### `app-produto-selector` — `ProdutoSelectorComponent`

**Arquivo:** [src/app/components/produto-selector/produto-selector.component.ts](../src/app/components/produto-selector/produto-selector.component.ts).

**Responsabilidade / decisão:** Busca/seleção de produto da calculadora por função recebida. **FEATURE-SPECIFIC**.

**Inputs:** `control!: FormControl<string | CalculadoraPisoProduto | null>;`; `buscarFn!: (termo: string) => Observable<CalculadoraPisoProduto[]>;`; `label = 'Produto';`; `placeholder = 'Digite o código, nome ou clique para escolher';`.

**Outputs:** `produtoSelecionado = new EventEmitter<CalculadoraPisoProduto>();`; `verTodosProdutos = new EventEmitter<void>();`.

**Consumidores diretos (1):** [src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.html](../src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.html).

**Testes relacionados:** [src/app/components/produto-selector/produto-selector.component.spec.ts](../src/app/components/produto-selector/produto-selector.component.spec.ts).

**Dependências:** `@angular/forms`; `@angular/material/autocomplete`; `rxjs`; `rxjs/operators`; `src/app/material.module`; `src/app/pages/apps/calculadoras/pisos/calculadora-pisos.models`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 42 linhas; estilos inline.

### `app-resumo-financeiro-card` — `ResumoFinanceiroCardComponent`

**Arquivo:** [src/app/components/resumo-financeiro-card/resumo-financeiro-card.component.ts](../src/app/components/resumo-financeiro-card/resumo-financeiro-card.component.ts).

**Responsabilidade / decisão:** Resumo financeiro do pedido. **FEATURE-SPECIFIC**.

**Inputs:** `titulo = 'Resumo financeiro';`; `divider = true;`; `total = 0;`; `subtotal = 0;`; `pago = 0;`; `frete = 0;`; `restaPagar = 0;`; `desconto = 0;`; `inativo = false;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (2):** [src/app/pages/demo/demo-pedido.component.html](../src/app/pages/demo/demo-pedido.component.html); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `../section-card/section-card.component`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-rich-text-editor` — `RichTextEditorComponent`

**Arquivo:** [src/app/components/rich-text-editor/rich-text-editor.component.ts](../src/app/components/rich-text-editor/rich-text-editor.component.ts).

**Responsabilidade / decisão:** Editor de texto rico integrado por ControlValueAccessor. **KEEP**.

**Inputs:** `placeholder = 'Digite o conteudo';`; `minHeight = 180;`; `maxLength?: number;`; `error?: string | null;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (4):** [src/app/components/rich-text-preview-field/rich-text-preview-field.component.ts](../src/app/components/rich-text-preview-field/rich-text-preview-field.component.ts); [src/app/pages/catalogo/categorias/catalogo-categoria-form.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-form.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts); [src/app/pages/grafica/produtos/grafica-produto-form.component.ts](../src/app/pages/grafica/produtos/grafica-produto-form.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `ngx-editor`; `src/app/material.module`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 19 linhas; estilos inline.

### `app-rich-text-preview-field` — `RichTextPreviewFieldComponent`

**Arquivo:** [src/app/components/rich-text-preview-field/rich-text-preview-field.component.ts](../src/app/components/rich-text-preview-field/rich-text-preview-field.component.ts).

**Responsabilidade / decisão:** Campo de texto rico com visualização/edição. **KEEP**.

**Inputs:** `control!: FormControl<string | null>;`; `label = 'Texto formatado';`; `hint?: string;`; `placeholder = 'Digite o conteúdo';`; `minHeight = 180;`; `maxLength?: number;`; `error?: string | null;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (1):** [src/app/pages/grafica/categorias/grafica-categoria-form.component.ts](../src/app/pages/grafica/categorias/grafica-categoria-form.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `src/app/material.module`; `../rich-text-editor/rich-text-editor.component`.

**Responsividade (evidência estática):** `@media (max-width: 700px)`.

**Organização:** template inline com 24 linhas; estilos inline.

### `app-section-card` — `SectionCardComponent`

**Arquivo:** [src/app/components/section-card/section-card.component.ts](../src/app/components/section-card/section-card.component.ts).

**Responsabilidade / decisão:** Seção com título, subtítulo, divisor, ações e conteúdo. **KEEP**.

**Inputs:** `title?: string;`; `titulo?: string;`; `subtitle?: string;`; `subtitulo?: string;`; `divider: boolean = true;`; `fixedHeight: boolean = false;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (75):** [src/app/components/cliente-selector-card/cliente-selector-card.component.html](../src/app/components/cliente-selector-card/cliente-selector-card.component.html); [src/app/components/dashboard1/receita-resumo/receita-resumo.component.html](../src/app/components/dashboard1/receita-resumo/receita-resumo.component.html); [src/app/components/dashboard1/status-grid/status-grid.component.html](../src/app/components/dashboard1/status-grid/status-grid.component.html); [src/app/components/data-table/data-table.component.html](../src/app/components/data-table/data-table.component.html); [src/app/components/dual-list-transfer/dual-list-transfer.component.html](../src/app/components/dual-list-transfer/dual-list-transfer.component.html); [src/app/components/endereco-form/endereco-form.component.html](../src/app/components/endereco-form/endereco-form.component.html); [src/app/components/filtro-pesquisa-card/filtro-pesquisa-card.component.html](../src/app/components/filtro-pesquisa-card/filtro-pesquisa-card.component.html); [src/app/components/hierarchy-tree/hierarchy-tree.component.html](../src/app/components/hierarchy-tree/hierarchy-tree.component.html); [src/app/components/itens-pedido-section/itens-pedido-section.component.html](../src/app/components/itens-pedido-section/itens-pedido-section.component.html); [src/app/components/observacoes-card/observacoes-card.component.html](../src/app/components/observacoes-card/observacoes-card.component.html); [src/app/components/onboarding/onboarding-selection-step.component.html](../src/app/components/onboarding/onboarding-selection-step.component.html); [src/app/components/pagamentos-section/pagamentos-section.component.html](../src/app/components/pagamentos-section/pagamentos-section.component.html); [src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.html](../src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.html); [src/app/components/pedido-info-card/pedido-info-card.component.html](../src/app/components/pedido-info-card/pedido-info-card.component.html); [src/app/components/resumo-financeiro-card/resumo-financeiro-card.component.html](../src/app/components/resumo-financeiro-card/resumo-financeiro-card.component.html); [src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts](../src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts); [src/app/pages/apps/fiscal/documentos/fiscal-documentos.component.ts](../src/app/pages/apps/fiscal/documentos/fiscal-documentos.component.ts); [src/app/pages/apps/fiscal/emitir/fiscal-emitir.component.ts](../src/app/pages/apps/fiscal/emitir/fiscal-emitir.component.ts); [src/app/pages/apps/fiscal/inutilizacoes/fiscal-inutilizacoes.component.ts](../src/app/pages/apps/fiscal/inutilizacoes/fiscal-inutilizacoes.component.ts); [src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts](../src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts); [src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts](../src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts); [src/app/pages/apps/smart-calc/smart-calc.component.html](../src/app/pages/apps/smart-calc/smart-calc.component.html); [src/app/pages/cadastro-tecnico/acabamentos/form-acabamento/form-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/form-acabamento/form-acabamento.component.html); [src/app/pages/cadastro-tecnico/cores/form-cores/form-cores.component.html](../src/app/pages/cadastro-tecnico/cores/form-cores/form-cores.component.html); [src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.html](../src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.html); [src/app/pages/cadastro-tecnico/materiais/form-material/form-material.component.html](../src/app/pages/cadastro-tecnico/materiais/form-material/form-material.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/calculadora-materiais/produto-calculadora-materiais-tab.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/calculadora-materiais/produto-calculadora-materiais-tab.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.html); [src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html](../src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html); [src/app/pages/calculadora-materiais/calculadora-materiais.component.html](../src/app/pages/calculadora-materiais/calculadora-materiais.component.html); [src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts); [src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts); [src/app/pages/catalogo/categorias/catalogo-categoria-form.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-form.component.ts); [src/app/pages/catalogo/marcas/catalogo-marca-form.component.ts](../src/app/pages/catalogo/marcas/catalogo-marca-form.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-detail.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-detail.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts); [src/app/pages/config/aplicativos-atalhos/aplicativos-atalhos.component.html](../src/app/pages/config/aplicativos-atalhos/aplicativos-atalhos.component.html); [src/app/pages/config/folha-config/folha-config.component.html](../src/app/pages/config/folha-config/folha-config.component.html); [src/app/pages/dashboards/dashboard1/dashboard1.component.html](../src/app/pages/dashboards/dashboard1/dashboard1.component.html); [src/app/pages/demo/demo-home.component.html](../src/app/pages/demo/demo-home.component.html); [src/app/pages/demo/demo-pedido.component.html](../src/app/pages/demo/demo-pedido.component.html); [src/app/pages/demo/demo-whatsapp.component.html](../src/app/pages/demo/demo-whatsapp.component.html); [src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html](../src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html); [src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html](../src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html); [src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html](../src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html); [src/app/pages/funcionarios/detalhe-funcionario/detalhe-funcionario.component.html](../src/app/pages/funcionarios/detalhe-funcionario/detalhe-funcionario.component.html); [src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html](../src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html); [src/app/pages/funcionarios/listar-funcionarios/listar-funcionarios.component.html](../src/app/pages/funcionarios/listar-funcionarios/listar-funcionarios.component.html); [src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts](../src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts); [src/app/pages/grafica/categorias/grafica-categoria-form.component.ts](../src/app/pages/grafica/categorias/grafica-categoria-form.component.ts); [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts); [src/app/pages/grafica/comercial-beta/orcamento-comercial-whatsapp-page.component.ts](../src/app/pages/grafica/comercial-beta/orcamento-comercial-whatsapp-page.component.ts); [src/app/pages/grafica/comercial-beta/pedido-comercial-whatsapp-page.component.ts](../src/app/pages/grafica/comercial-beta/pedido-comercial-whatsapp-page.component.ts); [src/app/pages/grafica/comercial-beta/pedido-documentos-acoes.component.ts](../src/app/pages/grafica/comercial-beta/pedido-documentos-acoes.component.ts); [src/app/pages/grafica/cores/grafica-cor-form.component.ts](../src/app/pages/grafica/cores/grafica-cor-form.component.ts); [src/app/pages/grafica/formatos/grafica-formato-form.component.ts](../src/app/pages/grafica/formatos/grafica-formato-form.component.ts); [src/app/pages/grafica/materiais/grafica-material-form.component.ts](../src/app/pages/grafica/materiais/grafica-material-form.component.ts); [src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts); [src/app/pages/grafica/produtos/grafica-produto-form.component.ts](../src/app/pages/grafica/produtos/grafica-produto-form.component.ts); [src/app/pages/grafica/servicos/grafica-servico-form.component.ts](../src/app/pages/grafica/servicos/grafica-servico-form.component.ts); [src/app/pages/onboarding/onboarding-page.component.html](../src/app/pages/onboarding/onboarding-page.component.html); [src/app/pages/onboarding-v2/company-step/onboarding-v2-company-page.component.html](../src/app/pages/onboarding-v2/company-step/onboarding-v2-company-page.component.html); [src/app/pages/onboarding-v2/summary-step/onboarding-v2-summary-page.component.html](../src/app/pages/onboarding-v2/summary-step/onboarding-v2-summary-page.component.html); [src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.html](../src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.html); [src/app/pages/orcamentos/form-orcamento/form-orcamento.component.html](../src/app/pages/orcamentos/form-orcamento/form-orcamento.component.html); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html); [src/app/pages/pedido/form-pedido/form-pedido.component.html](../src/app/pages/pedido/form-pedido/form-pedido.component.html); [src/app/pages/pedido/listar-pedido/listar-pedido.component.html](../src/app/pages/pedido/listar-pedido/listar-pedido.component.html); [src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.html](../src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.html); [src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.html](../src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.html); [src/app/pages/site/banners/form-banner/form-banner.component.html](../src/app/pages/site/banners/form-banner/form-banner.component.html); [src/app/pages/site/paginas/blocos/listar-blocos/listar-blocos.component.html](../src/app/pages/site/paginas/blocos/listar-blocos/listar-blocos.component.html); [src/app/pages/site/paginas/form-pagina/form-pagina.component.html](../src/app/pages/site/paginas/form-pagina/form-pagina.component.html); [src/app/pages/smart-calc-config/smart-calc-config/smart-calc-config.component.html](../src/app/pages/smart-calc-config/smart-calc-config/smart-calc-config.component.html); [src/app/pages/suporte/suporte.component.html](../src/app/pages/suporte/suporte.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/card`; `@angular/material/divider`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-setup-progress` — `SetupProgressComponent`

**Arquivo:** [src/app/components/setup-progress/setup-progress.component.ts](../src/app/components/setup-progress/setup-progress.component.ts).

**Responsabilidade / decisão:** Progresso de preparação/importação de domínio. **FEATURE-SPECIFIC**.

**Inputs:** `job!: SetupProgress;`; `onboarding = false;`; `animarEtapas = false;`.

**Outputs:** `etapasConcluidas = new EventEmitter<void>();`.

**Consumidores diretos (2):** [src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.html](../src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.html); [src/app/pages/onboarding-v2/summary-step/onboarding-v2-summary-page.component.html](../src/app/pages/onboarding-v2/summary-step/onboarding-v2-summary-page.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `src/app/material.module`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 50 linhas; estilos inline.

### `app-status-badge` — `StatusBadgeComponent`

**Arquivo:** [src/app/components/status-badge/status-badge.component.ts](../src/app/components/status-badge/status-badge.component.ts).

**Responsabilidade / decisão:** Representação de status com mapa semântico do App. **FEATURE-SPECIFIC**.

**Inputs:** `status: string | null | undefined;`; `compact = false;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (18):** [src/app/components/dual-list-transfer/dual-list-transfer.component.html](../src/app/components/dual-list-transfer/dual-list-transfer.component.html); [src/app/components/mobile-total-bar/mobile-total-bar.component.html](../src/app/components/mobile-total-bar/mobile-total-bar.component.html); [src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.html](../src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.html); [src/app/components/pedido-info-card/pedido-info-card.component.html](../src/app/components/pedido-info-card/pedido-info-card.component.html); [src/app/components/pedido-tabela/pedido-tabela.component.html](../src/app/components/pedido-tabela/pedido-tabela.component.html); [src/app/pages/demo/demo-pedido.component.html](../src/app/pages/demo/demo-pedido.component.html); [src/app/pages/funcionarios/detalhe-funcionario/detalhe-funcionario.component.html](../src/app/pages/funcionarios/detalhe-funcionario/detalhe-funcionario.component.html); [src/app/pages/funcionarios/listar-funcionarios/listar-funcionarios.component.html](../src/app/pages/funcionarios/listar-funcionarios/listar-funcionarios.component.html); [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts); [src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.html](../src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.html); [src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html](../src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html); [src/app/pages/pedido/listar-pedido/listar-pedido.component.html](../src/app/pages/pedido/listar-pedido/listar-pedido.component.html); [src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.html](../src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.html); [src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.html](../src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.html); [src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.html](../src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.html); [src/app/pages/storage/components/storage-lixeira/storage-lixeira.component.html](../src/app/pages/storage/components/storage-lixeira/storage-lixeira.component.html); [src/app/pages/suporte/suporte.component.html](../src/app/pages/suporte/suporte.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/icon`; `src/app/pipes/status-label.pipe`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-status-filter` — `StatusFilterComponent`

**Arquivo:** [src/app/components/status-filter/status-filter.component.ts](../src/app/components/status-filter/status-filter.component.ts).

**Responsabilidade / decisão:** Chips para ativo, inativo ou todos. **CONSOLIDATE**.

**Inputs:** `title = 'Status';`; `selected: boolean | null = null;`; `labelAtivos = 'Ativos';`; `labelInativos = 'Inativos';`; `labelTodos = 'Todos';`.

**Outputs:** `selectionChange = new EventEmitter<boolean | null>();`.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (0):** Nenhuma detectada.

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/chips`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-listar-produtos` — `ListarProdutosComponent`

**Arquivo:** [src/app/components/tabela/listar-produtos.component.ts](../src/app/components/tabela/listar-produtos.component.ts).

**Responsabilidade / decisão:** Listagem/seleção de produtos técnicos com consulta e ações de domínio. **FEATURE-SPECIFIC; DEPRECATE condicional**.

**Inputs:** `showActions = true;`; `showSelect = false;`; `hideHeader = false;`; `selectedId: number | null = null;`.

**Outputs:** `selectedChange = new EventEmitter<ProdutoListagem>();`.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (0):** Nenhuma detectada.

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/card`; `@angular/material/paginator`; `@angular/material/table`; `@angular/material/progress-spinner`; `@angular/material/icon`; `@angular/material/chips`; `@angular/material/button`; `@angular/router`; `@angular/material/dialog`; `ngx-toastr`; `angular-tabler-icons`; `src/app/components/dialog/confirm-dialog/confirm-dialog.component`; `src/app/diretivas/tem-permissao.directive`; `src/app/components/inputs/input-pesquisa/input-pesquisa.component`; `src/app/models/produto/produto-listagem.model`; `src/app/models/produto/produto.model`; `@angular/material/tooltip`; `@angular/material/radio`; `src/app/pages/cadastro-tecnico/services/produto.service`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-tabela-generica` — `TabelaGenericaComponent`

**Arquivo:** [src/app/components/tabela-generica/tabela-generica.component.ts](../src/app/components/tabela-generica/tabela-generica.component.ts).

**Responsabilidade / decisão:** API de tabela ainda sem renderização implementada. **DEPRECATE proposto**.

**Inputs:** `displayedColumns: string[] = [];`; `dados: any[] = [];`; `totalRegistros = 0;`; `pageSize = 10;`; `loading = false;`.

**Outputs:** `paginar = new EventEmitter<PageEvent>();`; `filtrar = new EventEmitter<string>();`; `editar = new EventEmitter<any>();`; `excluir = new EventEmitter<any>();`.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (0):** Nenhuma detectada.

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/form-field`; `@angular/material/icon`; `@angular/material/input`; `@angular/material/paginator`; `@angular/material/table`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-tabs-section-card` — `TabsSectionCardComponent`

**Arquivo:** [src/app/components/tabs-section-card/tabs-section-card.component.ts](../src/app/components/tabs-section-card/tabs-section-card.component.ts).

**Responsabilidade / decisão:** Projeção de tabs em MatTabGroup. **DEPRECATE proposto**.

**Inputs:** `stretchTabs = false;`; `alignTabs: 'start' | 'center' | 'end' = 'start';`; `animationDuration = '300ms';`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (0):** Nenhuma detectada.

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/tabs`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-blank` — `BlankComponent`

**Arquivo:** [src/app/layouts/blank/blank.component.ts](../src/app/layouts/blank/blank.component.ts).

**Responsabilidade / decisão:** Shell sem navegação completa e aplicação do tema. **KEEP**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (1):** [src/app/app.routes.ts](../src/app/app.routes.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `src/app/services/core.service`; `src/app/config`; `@angular/router`; `src/app/material.module`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-full` — `FullComponent`

**Arquivo:** [src/app/layouts/full/full.component.ts](../src/app/layouts/full/full.component.ts).

**Responsabilidade / decisão:** Shell global com navegação, viewport mobile e router outlet. **EVOLVE**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (1):** [src/app/app.routes.ts](../src/app/app.routes.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/cdk/layout`; `rxjs`; `@angular/material/sidenav`; `@angular/material/dialog`; `src/app/services/core.service`; `src/app/config`; `rxjs/operators`; `@angular/router`; `./vertical/sidebar/sidebar-data`; `../../services/nav.service`; `./vertical/sidebar/nav-item/nav-item.component`; `@angular/router`; `src/app/material.module`; `./vertical/sidebar/sidebar.component`; `ngx-scrollbar`; `angular-tabler-icons`; `./vertical/header/header.component`; `./shared/breadcrumb/breadcrumb.component`; `./shared/customizer/customizer.component`; `src/app/components/mobile-sheet-header/mobile-sheet-header.component`; `src/app/services/auth.service`; `./vertical/sidebar/nav-item/nav-item`; `src/app/models/usuario/usuario.model`; `../../components/billing-banner/billing-banner.component`; `src/app/pages/billing/services/billing.service`; `src/app/pages/billing/services/billing-state.service`; `src/app/components/onboarding/onboarding-flow.service`; `src/app/utils/imagem-util`; `src/app/pages/notificacoes/models/notificacao.model`; `src/app/pages/notificacoes/services/notificacao.service`; `src/app/pages/notificacoes/components/notificacao-enviar-dialog.component`; `src/app/models/empresa/tipo-empresa.enum`; `src/app/pages/catalogo/shared/services/catalogo-empresa-context.service`; `src/app/models/config/configuracao-aplicativos.model`; `src/app/services/configuracao-aplicativos.service`; `src/app/services/feature-flag.service`; `./vertical/sidebar/menu-filter`.

**Responsividade (evidência estática):** `isMobileScreen`; `isMobileLayout`; `BreakpointObserver`; `isMobileBottomNavActive`; `isMobileItemExpanded`; `isMobileItemActive`; `@media (max-width: 768px)`; `@media (min-width: 1024px)`; `@media (max-width: 1023px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-breadcrumb` — `AppBreadcrumbComponent`

**Arquivo:** [src/app/layouts/full/shared/breadcrumb/breadcrumb.component.ts](../src/app/layouts/full/shared/breadcrumb/breadcrumb.component.ts).

**Responsabilidade / decisão:** Breadcrumb derivado da navegação. **KEEP**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/layouts/full/full.component.html](../src/app/layouts/full/full.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/platform-browser`; `@angular/router`; `@angular/router`; `rxjs/operators`; `angular-tabler-icons`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-customizer` — `CustomizerComponent`

**Arquivo:** [src/app/layouts/full/shared/customizer/customizer.component.ts](../src/app/layouts/full/shared/customizer/customizer.component.ts).

**Responsabilidade / decisão:** Configuração visual herdada do template. **KEEP**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** `optionsChange = new EventEmitter<AppSettings>();`.

**Consumidores diretos (1):** [src/app/layouts/full/full.component.html](../src/app/layouts/full/full.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `src/app/config`; `src/app/services/core.service`; `angular-tabler-icons`; `src/app/material.module`; `@angular/forms`; `ngx-scrollbar`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-header` — `HeaderComponent`

**Arquivo:** [src/app/layouts/full/vertical/header/header.component.ts](../src/app/layouts/full/vertical/header/header.component.ts).

**Responsabilidade / decisão:** Header global e comandos de navegação. **KEEP**.

**Inputs:** `showToggle = true;`; `toggleChecked = false;`.

**Outputs:** `toggleMobileNav = new EventEmitter<void>();`; `toggleMobileFilterNav = new EventEmitter<void>();`; `toggleCollapsed = new EventEmitter<void>();`.

**Consumidores diretos (1):** [src/app/layouts/full/full.component.html](../src/app/layouts/full/full.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `src/app/services/core.service`; `@angular/material/dialog`; `angular-tabler-icons`; `src/app/material.module`; `@angular/router`; `ngx-scrollbar`; `src/app/services/auth.service`; `src/app/models/usuario/usuario.model`; `src/app/utils/imagem-util`; `src/app/pages/notificacoes/models/notificacao.model`; `src/app/pages/notificacoes/services/notificacao.service`; `src/app/pages/notificacoes/components/notificacao-enviar-dialog.component`; `rxjs`; `src/app/models/config/configuracao-aplicativos.model`; `src/app/services/configuracao-aplicativos.service`; `src/app/services/feature-flag.service`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-branding` — `BrandingComponent`

**Arquivo:** [src/app/layouts/full/vertical/sidebar/branding.component.ts](../src/app/layouts/full/vertical/sidebar/branding.component.ts).

**Responsabilidade / decisão:** Marca do App no shell/autenticação. **KEEP**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (13):** [src/app/components/onboarding/onboarding-wizard.component.html](../src/app/components/onboarding/onboarding-wizard.component.html); [src/app/layouts/full/vertical/sidebar/sidebar.component.html](../src/app/layouts/full/vertical/sidebar/sidebar.component.html); [src/app/pages/authentication/boxed-forgot-password/boxed-forgot-password.component.html](../src/app/pages/authentication/boxed-forgot-password/boxed-forgot-password.component.html); [src/app/pages/authentication/boxed-login/boxed-login.component.html](../src/app/pages/authentication/boxed-login/boxed-login.component.html); [src/app/pages/authentication/boxed-register/boxed-register.component.html](../src/app/pages/authentication/boxed-register/boxed-register.component.html); [src/app/pages/authentication/boxed-reset-password/boxed-reset-password.component.html](../src/app/pages/authentication/boxed-reset-password/boxed-reset-password.component.html); [src/app/pages/authentication/boxed-two-steps/boxed-two-steps.component.html](../src/app/pages/authentication/boxed-two-steps/boxed-two-steps.component.html); [src/app/pages/authentication/cadastro-concluido/cadastro-concluido.component.html](../src/app/pages/authentication/cadastro-concluido/cadastro-concluido.component.html); [src/app/pages/authentication/side-forgot-password/side-forgot-password.component.html](../src/app/pages/authentication/side-forgot-password/side-forgot-password.component.html); [src/app/pages/authentication/side-login/side-login.component.html](../src/app/pages/authentication/side-login/side-login.component.html); [src/app/pages/authentication/side-register/side-register.component.html](../src/app/pages/authentication/side-register/side-register.component.html); [src/app/pages/authentication/side-two-steps/side-two-steps.component.html](../src/app/pages/authentication/side-two-steps/side-two-steps.component.html); [src/app/pages/theme-pages/landingpage/landingpage.component.html](../src/app/pages/theme-pages/landingpage/landingpage.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `src/app/services/core.service`; `@angular/router`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 17 linhas; sem bloco de estilos inline.

### `app-nav-item` — `AppNavItemComponent`

**Arquivo:** [src/app/layouts/full/vertical/sidebar/nav-item/nav-item.component.ts](../src/app/layouts/full/vertical/sidebar/nav-item/nav-item.component.ts).

**Responsabilidade / decisão:** Item navegável da sidebar. **KEEP**.

**Inputs:** `item: NavItem | any;`; `depth: any;`.

**Outputs:** `toggleMobileLink: any = new EventEmitter<void>();`; `notify: EventEmitter<boolean> = new EventEmitter<boolean>();`.

**Consumidores diretos (2):** [src/app/layouts/full/full.component.html](../src/app/layouts/full/full.component.html); [src/app/layouts/full/vertical/sidebar/nav-item/nav-item.component.html](../src/app/layouts/full/vertical/sidebar/nav-item/nav-item.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `./nav-item`; `@angular/router`; `../../../../../services/nav.service`; `@angular/animations`; `@ngx-translate/core`; `angular-tabler-icons`; `src/app/material.module`.

**Responsividade (evidência estática):** `window.innerWidth`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-sidebar` — `SidebarComponent`

**Arquivo:** [src/app/layouts/full/vertical/sidebar/sidebar.component.ts](../src/app/layouts/full/vertical/sidebar/sidebar.component.ts).

**Responsabilidade / decisão:** Navegação lateral. **KEEP**.

**Inputs:** `showToggle = true;`.

**Outputs:** `toggleMobileNav = new EventEmitter<void>();`; `toggleCollapsed = new EventEmitter<void>();`.

**Consumidores diretos (1):** [src/app/layouts/full/full.component.html](../src/app/layouts/full/full.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `./branding.component`; `angular-tabler-icons`; `src/app/material.module`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-print-layout` — `PrintComponent`

**Arquivo:** [src/app/layouts/print/print.component.ts](../src/app/layouts/print/print.component.ts).

**Responsabilidade / decisão:** Outlet para impressão sem shell administrativo. **KEEP**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (1):** [src/app/app.routes.ts](../src/app/app.routes.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/router`; `src/app/material.module`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 1 linhas; sem bloco de estilos inline.

### `app-delete-dialog` — `AppDeleteDialogComponent`

**Arquivo:** [src/app/pages/apps/contact-list/delete-dialog/delete-dialog.component.ts](../src/app/pages/apps/contact-list/delete-dialog/delete-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: delete. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (2):** [src/app/pages/apps/contact-list/detail/detail.component.ts](../src/app/pages/apps/contact-list/detail/detail.component.ts); [src/app/pages/apps/contact-list/listing/listing.component.ts](../src/app/pages/apps/contact-list/listing/listing.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/button`; `@angular/material/dialog`; `@angular/material/dialog`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-delete-dialog` — `AppDeleteDialogComponent`

**Arquivo:** [src/app/pages/apps/kanban/delete-dialog/delete-dialog.component.ts](../src/app/pages/apps/kanban/delete-dialog/delete-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: delete. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (2):** [src/app/pages/apps/kanban/kanban.component.ts](../src/app/pages/apps/kanban/kanban.component.ts); [src/app/pages/apps/todo/todo.component.ts](../src/app/pages/apps/todo/todo.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/button`; `@angular/material/dialog`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-produto-calculadora-materiais-tab` — `ProdutoCalculadoraMateriaisTabComponent`

**Arquivo:** [src/app/pages/cadastro-tecnico/produtos/form-produto/calculadora-materiais/produto-calculadora-materiais-tab.component.ts](../src/app/pages/cadastro-tecnico/produtos/form-produto/calculadora-materiais/produto-calculadora-materiais-tab.component.ts).

**Responsabilidade / decisão:** Composição de produto calculadora materiais tab; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** `produtoId!: number;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (2):** [src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.html); [src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts).

**Testes relacionados:** [src/app/pages/cadastro-tecnico/produtos/form-produto/calculadora-materiais/produto-calculadora-materiais-tab.component.spec.ts](../src/app/pages/cadastro-tecnico/produtos/form-produto/calculadora-materiais/produto-calculadora-materiais-tab.component.spec.ts).

**Dependências:** `@angular/forms`; `@angular/router`; `ngx-toastr`; `src/app/components/inputs/input-options/input-options.component`; `src/app/components/section-card/section-card.component`; `src/app/material.module`; `src/app/pages/calculadora-materiais/shared/calculadora-material.service`; `src/app/pages/calculadora-materiais/shared/calculadora-material.models`.

**Responsividade (evidência estática):** `@media (max-width: 900px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-catalogo-produto-caracteristicas` — `CatalogoProdutoCaracteristicasComponent`

**Arquivo:** [src/app/pages/catalogo/shared/components/catalogo-produto-caracteristicas.component.ts](../src/app/pages/catalogo/shared/components/catalogo-produto-caracteristicas.component.ts).

**Responsabilidade / decisão:** Editor de características dinâmicas conforme categoria. **FEATURE-SPECIFIC**.

**Inputs:** `definicoes: CatalogoCaracteristica[] = [];`; `valores: CatalogoProdutoCaracteristica[] = [];`.

**Outputs:** `validChange = new EventEmitter<boolean>();`.

**Consumidores diretos (1):** [src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `src/app/material.module`; `../models/catalogo.models`; `../utils/catalogo-utils`.

**Responsividade (evidência estática):** `@media(max-width: 1100px)`; `@media(max-width: 760px)`.

**Organização:** template inline com 68 linhas; estilos inline.

### `app-catalogo-status-chip` — `CatalogoStatusChipComponent`

**Arquivo:** [src/app/pages/catalogo/shared/components/catalogo-status-chip.component.ts](../src/app/pages/catalogo/shared/components/catalogo-status-chip.component.ts).

**Responsabilidade / decisão:** Representação de ativo/inativo do Catálogo. **FEATURE-SPECIFIC**.

**Inputs:** `ativo?: boolean | null = true;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (6):** [src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts); [src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts); [src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts); [src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts](../src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-detail.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-detail.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** Angular core/common.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 5 linhas; estilos inline.

### `app-clicktv-midia-preview-dialog` — `ClickTvMidiaPreviewDialogComponent`

**Arquivo:** [src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts](../src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: clicktv midia preview. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/clicktv/components/midias/clicktv-midias.component.ts](../src/app/pages/clicktv/components/midias/clicktv-midias.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `src/app/material.module`; `../../models/clicktv.models`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 24 linhas; estilos inline.

### `app-clicktv-upload-dialog` — `ClickTvUploadDialogComponent`

**Arquivo:** [src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts](../src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: clicktv upload. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/clicktv/components/midias/clicktv-midias.component.ts](../src/app/pages/clicktv/components/midias/clicktv-midias.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `src/app/material.module`; `../../models/clicktv.models`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 26 linhas; estilos inline.

### `app-clicktv-name-dialog` — `ClickTvNameDialogComponent`

**Arquivo:** [src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts](../src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: clicktv name. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (2):** [src/app/pages/clicktv/components/midias/clicktv-midias.component.ts](../src/app/pages/clicktv/components/midias/clicktv-midias.component.ts); [src/app/pages/clicktv/components/playlists/clicktv-playlists.component.ts](../src/app/pages/clicktv/components/playlists/clicktv-playlists.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `src/app/material.module`; `../../models/clicktv.models`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 16 linhas; estilos inline.

### `app-clicktv-playlist-dialog` — `ClickTvPlaylistDialogComponent`

**Arquivo:** [src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts](../src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: clicktv playlist. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/clicktv/components/playlists/clicktv-playlists.component.ts](../src/app/pages/clicktv/components/playlists/clicktv-playlists.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `src/app/material.module`; `../../models/clicktv.models`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 16 linhas; estilos inline.

### `app-clicktv-tela-dialog` — `ClickTvTelaDialogComponent`

**Arquivo:** [src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts](../src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: clicktv tela. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/clicktv/components/telas/clicktv-telas.component.ts](../src/app/pages/clicktv/components/telas/clicktv-telas.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `src/app/material.module`; `../../models/clicktv.models`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 21 linhas; estilos inline.

### `app-clicktv-midias` — `ClickTvMidiasComponent`

**Arquivo:** [src/app/pages/clicktv/components/midias/clicktv-midias.component.ts](../src/app/pages/clicktv/components/midias/clicktv-midias.component.ts).

**Responsabilidade / decisão:** Composição de clicktv midias; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (1):** [src/app/pages/clicktv/clicktv.routes.ts](../src/app/pages/clicktv/clicktv.routes.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/common/http`; `@angular/forms`; `@angular/material/dialog`; `@angular/material/paginator`; `rxjs`; `ngx-toastr`; `src/app/material.module`; `src/app/components/card-header/card-header.component`; `src/app/components/dialog/confirm-dialog/confirm-dialog.component`; `src/app/diretivas/tem-permissao.directive`; `../../models/clicktv.models`; `../../services/clicktv.service`; `../dialogs/clicktv-dialogs.component`.

**Responsividade (evidência estática):** `@media (max-width: 700px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-clicktv-playlist-editor` — `ClickTvPlaylistEditorComponent`

**Arquivo:** [src/app/pages/clicktv/components/playlist-editor/clicktv-playlist-editor.component.ts](../src/app/pages/clicktv/components/playlist-editor/clicktv-playlist-editor.component.ts).

**Responsabilidade / decisão:** Composição de clicktv playlist editor; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (1):** [src/app/pages/clicktv/clicktv.routes.ts](../src/app/pages/clicktv/clicktv.routes.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/common/http`; `@angular/forms`; `@angular/material/dialog`; `@angular/router`; `ngx-toastr`; `src/app/components/dialog/confirm-dialog/confirm-dialog.component`; `src/app/diretivas/tem-permissao.directive`; `src/app/material.module`; `../../models/clicktv.models`; `../../services/clicktv.service`.

**Responsividade (evidência estática):** `@media (max-width: 700px)`; `@media (max-width: 900px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-clicktv-playlists` — `ClickTvPlaylistsComponent`

**Arquivo:** [src/app/pages/clicktv/components/playlists/clicktv-playlists.component.ts](../src/app/pages/clicktv/components/playlists/clicktv-playlists.component.ts).

**Responsabilidade / decisão:** Composição de clicktv playlists; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (1):** [src/app/pages/clicktv/clicktv.routes.ts](../src/app/pages/clicktv/clicktv.routes.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `@angular/material/paginator`; `@angular/router`; `ngx-toastr`; `src/app/components/card-header/card-header.component`; `src/app/components/dialog/confirm-dialog/confirm-dialog.component`; `src/app/diretivas/tem-permissao.directive`; `src/app/material.module`; `../../models/clicktv.models`; `../../services/clicktv.service`; `../dialogs/clicktv-dialogs.component`.

**Responsividade (evidência estática):** `@media (max-width: 700px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-clicktv-telas` — `ClickTvTelasComponent`

**Arquivo:** [src/app/pages/clicktv/components/telas/clicktv-telas.component.ts](../src/app/pages/clicktv/components/telas/clicktv-telas.component.ts).

**Responsabilidade / decisão:** Composição de clicktv telas; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (1):** [src/app/pages/clicktv/clicktv.routes.ts](../src/app/pages/clicktv/clicktv.routes.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/common/http`; `@angular/forms`; `@angular/material/dialog`; `@angular/material/paginator`; `ngx-toastr`; `src/app/components/card-header/card-header.component`; `src/app/components/dialog/confirm-dialog/confirm-dialog.component`; `src/app/diretivas/tem-permissao.directive`; `src/app/material.module`; `../../models/clicktv.models`; `../../services/clicktv.service`; `../dialogs/clicktv-dialogs.component`.

**Responsividade (evidência estática):** `@media (max-width: 700px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-cliente-create-dialog` — `ClienteCreateDialogComponent`

**Arquivo:** [src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component.ts](../src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: cliente create. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (2):** [src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.ts](../src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.ts); [src/app/pages/orcamentos/form-orcamento/form-orcamento.component.ts](../src/app/pages/orcamentos/form-orcamento/form-orcamento.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `ngx-mask`; `ngx-toastr`; `src/app/material.module`; `src/app/models/cliente/cliente-request.model`; `src/app/models/cliente/cliente-response.model`; `src/app/utils/mensagem.util`; `../cliente.service`.

**Responsividade (evidência estática):** `@media (max-width: 720px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-email-servidor-teste-dialog` — `EmailServidorTesteDialogComponent`

**Arquivo:** [src/app/pages/config/email-servidor/email-servidor-teste-dialog.component.ts](../src/app/pages/config/email-servidor/email-servidor-teste-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: email servidor teste. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/config/email-servidor/email-servidor.component.ts](../src/app/pages/config/email-servidor/email-servidor.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/dialog`; `@angular/forms`; `src/app/components/inputs/input-email/input-custom.component`; `@angular/material/form-field`; `@angular/material/input`; `@angular/material/button`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-deposito-imagem-galeria` — `DepositoImagemGaleriaComponent`

**Arquivo:** [src/app/pages/deposito/components/deposito-imagem-galeria/deposito-imagem-galeria.component.ts](../src/app/pages/deposito/components/deposito-imagem-galeria/deposito-imagem-galeria.component.ts).

**Responsabilidade / decisão:** Upload, imagem principal e ordenação de galeria de produtos. **FEATURE-SPECIFIC**.

**Inputs:** `context = 'produtos';`; `uploadEndpoint?: string;`; `maxImages?: number | null;`; `imagemPrincipal?: DepositoImagem | null;`; `imagens: DepositoImagem[] = [];`; `gerenciarPrincipal = false;`.

**Outputs:** `imagemPrincipalChange = new EventEmitter<DepositoImagem | null>();`; `imagensChange = new EventEmitter<DepositoImagem[]>();`; `uploadingChange = new EventEmitter<boolean>();`.

**Consumidores diretos (3):** [src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts); [src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html](../src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html); [src/app/pages/grafica/produtos/grafica-produto-form.component.ts](../src/app/pages/grafica/produtos/grafica-produto-form.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/button`; `@angular/material/icon`; `@angular/material/progress-spinner`; `@angular/material/tooltip`; `rxjs`; `rxjs/operators`; `../../models/deposito.models`; `../../services/deposito-imagem.service`; `../../utils/deposito-image.util`; `../../utils/deposito-image-upload-validation.util`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-deposito-imagem-upload` — `DepositoImagemUploadComponent`

**Arquivo:** [src/app/pages/deposito/components/deposito-imagem-upload/deposito-imagem-upload.component.ts](../src/app/pages/deposito/components/deposito-imagem-upload/deposito-imagem-upload.component.ts).

**Responsabilidade / decisão:** Upload e retorno de imagem do Depósito. **FEATURE-SPECIFIC**.

**Inputs:** `context = 'geral';`; `label = 'Imagem';`; `imagemAtual?: DepositoImagem | null;`; `principal = false;`.

**Outputs:** `imagemSelecionada = new EventEmitter<DepositoImagem | null>();`; `uploadingChange = new EventEmitter<boolean>();`.

**Consumidores diretos (3):** [src/app/pages/catalogo/marcas/catalogo-marca-form.component.ts](../src/app/pages/catalogo/marcas/catalogo-marca-form.component.ts); [src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html](../src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html); [src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html](../src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/button`; `@angular/material/icon`; `@angular/material/progress-spinner`; `../../models/deposito.models`; `../../services/deposito-imagem.service`; `../../utils/deposito-image.util`; `../../utils/deposito-image-upload-validation.util`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-lista-dinamica-input` — `ListaDinamicaInputComponent`

**Arquivo:** [src/app/pages/deposito/components/lista-dinamica-input/lista-dinamica-input.component.ts](../src/app/pages/deposito/components/lista-dinamica-input/lista-dinamica-input.component.ts).

**Responsabilidade / decisão:** Lista editável de strings com FormControl. **FEATURE-SPECIFIC**.

**Inputs:** `control!: FormControl<string[] | null>;`; `label!: string;`; `placeholder = 'Adicionar item';`; `buttonLabel = 'Adicionar';`; `helperText = '';`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (1):** [src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html](../src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `src/app/material.module`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-empresa-form` — `EmpresaFormComponent`

**Arquivo:** [src/app/pages/empresa/empresa-form.component.ts](../src/app/pages/empresa/empresa-form.component.ts).

**Responsabilidade / decisão:** Composição de empresa form; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** `modoOnboarding = false;`; `esconderAcoesOnboarding = false;`; `onboardingSection: EmpresaOnboardingSection = 'all';`.

**Outputs:** `empresaSalva = new EventEmitter<void>();`.

**Consumidores diretos (2):** [src/app/components/onboarding/onboarding-wizard.component.html](../src/app/components/onboarding/onboarding-wizard.component.html); [src/app/pages/onboarding/onboarding-page.component.html](../src/app/pages/onboarding/onboarding-page.component.html).

**Testes relacionados:** [src/app/pages/empresa/empresa-form.component.spec.ts](../src/app/pages/empresa/empresa-form.component.spec.ts).

**Dependências:** `@angular/forms`; `@angular/material/input`; `@angular/material/form-field`; `@angular/material/button`; `@angular/material/icon`; `@angular/material/tabs`; `@angular/material/card`; `@angular/material/select`; `@angular/material/radio`; `@angular/material/slide-toggle`; `@angular/material/progress-spinner`; `angular-tabler-icons`; `ngx-mask`; `src/app/utils/imagem-util`; `ngx-toastr`; `src/app/utils/validador-util`; `src/app/models/endereco/endereco.viacep.model`; `src/app/utils/cep-util.service`; `./empresa-form.service`; `src/app/services/auth.service`; `rxjs`; `src/app/models/empresa/empresa.model`; `src/app/components/inputs/input-texto/input-texto-restrito.component`; `src/app/components/inputs/input-email/input-custom.component`; `src/app/components/inputs/input-telefone/input-telefone.component`; `src/app/components/inputs/input-documento/input-documento.component`; `src/app/components/inputs/input-cep/input-cep.component`; `./empresa-identidade-publica.service`; `../links/models/links.models`; `../links/utils/links-url.util`; `src/app/components/card-header/card-header.component`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-dialog-motivo-status` — `DialogMotivoStatusComponent`

**Arquivo:** [src/app/pages/funcionarios/components/dialog-motivo-status/dialog-motivo-status.component.ts](../src/app/pages/funcionarios/components/dialog-motivo-status/dialog-motivo-status.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: motivo status. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/funcionarios/detalhe-funcionario/detalhe-funcionario.component.ts](../src/app/pages/funcionarios/detalhe-funcionario/detalhe-funcionario.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/button`; `@angular/material/dialog`; `@angular/material/form-field`; `@angular/material/input`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 35 linhas; sem bloco de estilos inline.

### `app-biblioteca-produtos-selector` — `BibliotecaProdutosSelectorComponent`

**Arquivo:** [src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.ts](../src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.ts).

**Responsabilidade / decisão:** Seleção/importação de produtos da biblioteca. **FEATURE-SPECIFIC**.

**Inputs:** `onboarding = false;`; `animarEtapas = false;`; `mostrarAcaoAdicionar = true;`; `mostrarIntroducao = true;`.

**Outputs:** `etapasConcluidas = new EventEmitter<void>();`; `importado = new EventEmitter<BibliotecaResultado>();`; `preparacao = new EventEmitter<SetupProgress | null>(true);`; `ocupado = new EventEmitter<boolean>(true);`.

**Consumidores diretos (2):** [src/app/pages/grafica/biblioteca/biblioteca-dialog.component.ts](../src/app/pages/grafica/biblioteca/biblioteca-dialog.component.ts); [src/app/pages/onboarding-v2/products-step/onboarding-v2-products-page.component.html](../src/app/pages/onboarding-v2/products-step/onboarding-v2-products-page.component.html).

**Testes relacionados:** [src/app/pages/grafica/biblioteca/biblioteca-contextos.spec.ts](../src/app/pages/grafica/biblioteca/biblioteca-contextos.spec.ts); [src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.spec.ts](../src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.spec.ts).

**Dependências:** `@angular/forms`; `rxjs`; `src/app/components/setup-progress/setup-progress.component`; `src/app/material.module`; `src/app/components/hierarchy-tree/hierarchy-tree.component`; `./biblioteca.service`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-grafica-produto-busca-rapida-dialog` — `GraficaProdutoBuscaRapidaDialogComponent`

**Arquivo:** [src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.ts](../src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: grafica produto busca rapida. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts).

**Testes relacionados:** [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.spec.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.spec.ts); [src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.spec.ts](../src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.spec.ts).

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `@angular/material/paginator`; `rxjs`; `src/app/material.module`; `../../catalogo/shared/utils/catalogo-utils`; `../shared/grafica.models`; `../shared/grafica.service`.

**Responsividade (evidência estática):** `@media (max-width: 680px)`.

**Organização:** template inline com 63 linhas; estilos inline.

### `app-grafica-cadastro-rapido-dialog` — `GraficaCadastroRapidoDialogComponent`

**Arquivo:** [src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: grafica cadastro rapido. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/grafica/produtos/grafica-produto-form.component.ts](../src/app/pages/grafica/produtos/grafica-produto-form.component.ts).

**Testes relacionados:** [src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.spec.ts](../src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.spec.ts).

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `ngx-toastr`; `rxjs`; `src/app/components/inputs/input-options/input-options.component`; `src/app/components/inputs/input-textarea/input-textarea.component`; `src/app/components/inputs/input-texto/input-texto-restrito.component`; `src/app/components/inputs/unit-input/unit-input.component`; `src/app/material.module`; `../../catalogo/shared/models/catalogo.models`; `../../catalogo/shared/services/catalogo.service`; `../../catalogo/shared/utils/catalogo-utils`; `../shared/grafica.models`; `../shared/grafica.service`.

**Responsividade (evidência estática):** `@media (max-width: 720px)`.

**Organização:** template inline com 111 linhas; estilos inline.

### `app-grafica-produto-acabamento-dialog` — `GraficaProdutoAcabamentoDialogComponent`

**Arquivo:** [src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: grafica produto acabamento. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/grafica/produtos/grafica-produto-form.component.ts](../src/app/pages/grafica/produtos/grafica-produto-form.component.ts).

**Testes relacionados:** [src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.spec.ts](../src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.spec.ts).

**Dependências:** `../shared/grafica.models`; `@angular/forms`; `@angular/material/dialog`; `rxjs`; `src/app/material.module`; `src/app/components/inputs/input-texto/input-texto-restrito.component`; `src/app/components/inputs/input-options/input-options.component`; `src/app/components/inputs/input-textarea/input-textarea.component`; `src/app/components/inputs/unit-input/unit-input.component`; `src/app/components/preco/preco-selector.component`; `src/app/components/section-card/section-card.component`.

**Responsividade (evidência estática):** `@media (max-width: 640px)`; `@media (max-width: 600px)`.

**Organização:** template inline com 91 linhas; estilos inline.

### `app-links-item-dialog` — `LinksItemDialogComponent`

**Arquivo:** [src/app/pages/links/components/item-dialog/links-item-dialog.component.ts](../src/app/pages/links/components/item-dialog/links-item-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: links item. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/links/pages/editor/links-editor.component.ts](../src/app/pages/links/pages/editor/links-editor.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `src/app/material.module`; `../../models/links.models`; `../../utils/links-item-url.util`.

**Responsividade (evidência estática):** `@media (max-width: 640px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-links-preview-dialog` — `LinksPreviewDialogComponent`

**Arquivo:** [src/app/pages/links/components/preview-dialog/links-preview-dialog.component.ts](../src/app/pages/links/components/preview-dialog/links-preview-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: links preview. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/links/pages/editor/links-editor.component.ts](../src/app/pages/links/pages/editor/links-editor.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/dialog`; `src/app/material.module`; `../../models/links.models`; `../public-preview/links-public-preview.component`.

**Responsividade (evidência estática):** `@media (max-width: 600px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-links-public-preview` — `LinksPublicPreviewComponent`

**Arquivo:** [src/app/pages/links/components/public-preview/links-public-preview.component.ts](../src/app/pages/links/components/public-preview/links-public-preview.component.ts).

**Responsabilidade / decisão:** Prévia do modelo público de Links. **FEATURE-SPECIFIC**.

**Inputs:** `model!: LinksPreviewModel;`; `interactive = false;`; `compact = false;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (2):** [src/app/pages/links/components/preview-dialog/links-preview-dialog.component.html](../src/app/pages/links/components/preview-dialog/links-preview-dialog.component.html); [src/app/pages/links/pages/editor/links-editor.component.html](../src/app/pages/links/pages/editor/links-editor.component.html).

**Testes relacionados:** [src/app/pages/links/components/public-preview/links-public-preview.component.spec.ts](../src/app/pages/links/components/public-preview/links-public-preview.component.spec.ts).

**Dependências:** `src/app/material.module`; `../../models/links.models`; `../../utils/links-theme.util`.

**Responsividade (evidência estática):** `@media (max-width: 360px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-links-share-dialog` — `LinksShareDialogComponent`

**Arquivo:** [src/app/pages/links/components/share-dialog/links-share-dialog.component.ts](../src/app/pages/links/components/share-dialog/links-share-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: links share. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/links/pages/lista/links-lista.component.ts](../src/app/pages/links/pages/lista/links-lista.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/dialog`; `src/app/material.module`; `../share-panel/links-share-panel.component`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-links-share-panel` — `LinksSharePanelComponent`

**Arquivo:** [src/app/pages/links/components/share-panel/links-share-panel.component.ts](../src/app/pages/links/components/share-panel/links-share-panel.component.ts).

**Responsabilidade / decisão:** Compartilhamento e QR code da URL pública. **FEATURE-SPECIFIC**.

**Inputs:** `url = '';`; `slug = '';`; `showOpen = true;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (2):** [src/app/pages/links/components/share-dialog/links-share-dialog.component.html](../src/app/pages/links/components/share-dialog/links-share-dialog.component.html); [src/app/pages/links/pages/editor/links-editor.component.html](../src/app/pages/links/pages/editor/links-editor.component.html).

**Testes relacionados:** [src/app/pages/links/components/share-panel/links-share-panel.component.spec.ts](../src/app/pages/links/components/share-panel/links-share-panel.component.spec.ts).

**Dependências:** `ngx-toastr`; `qrcode`; `src/app/material.module`.

**Responsividade (evidência estática):** `@media (max-width: 760px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-notificacao-enviar-dialog` — `NotificacaoEnviarDialogComponent`

**Arquivo:** [src/app/pages/notificacoes/components/notificacao-enviar-dialog.component.ts](../src/app/pages/notificacoes/components/notificacao-enviar-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: notificacao enviar. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (3):** [src/app/layouts/full/full.component.ts](../src/app/layouts/full/full.component.ts); [src/app/layouts/full/vertical/header/header.component.ts](../src/app/layouts/full/vertical/header/header.component.ts); [src/app/pages/notificacoes/notificacoes.component.ts](../src/app/pages/notificacoes/notificacoes.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `ngx-toastr`; `src/app/models/usuario/usuario.model`; `src/app/material.module`; `src/app/pages/usuarios/services/usuario.service`; `../models/notificacao.model`; `../services/notificacao.service`.

**Responsividade (evidência estática):** `@media (max-width: 700px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-segment-selector` — `SegmentSelectorComponent`

**Arquivo:** [src/app/pages/onboarding-v2/components/segment-selector/segment-selector.component.ts](../src/app/pages/onboarding-v2/components/segment-selector/segment-selector.component.ts).

**Responsabilidade / decisão:** Composição de segment selector; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** `segments: SegmentOption[] = [];`; `selected: TipoEmpresa | null = null;`.

**Outputs:** `segmentSelected = new EventEmitter<TipoEmpresa>();`.

**Consumidores diretos (1):** [src/app/pages/onboarding-v2/entry/onboarding-v2-entry-page.component.html](../src/app/pages/onboarding-v2/entry/onboarding-v2-entry-page.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `src/app/models/empresa/tipo-empresa.enum`.

**Responsividade (evidência estática):** `@media (max-width: 991px)`; `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-dialog-adicionar-produto-mobile` — `DialogAdicionarProdutoMobileComponent`

**Arquivo:** [src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto-mobile.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto-mobile.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: adicionar produto mobile. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (2):** [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.ts](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.ts); [src/app/pages/pedido/form-pedido/form-pedido.component.ts](../src/app/pages/pedido/form-pedido/form-pedido.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `@angular/material/checkbox`; `@angular/material/icon`; `@angular/material/button`; `@angular/material/form-field`; `@angular/material/input`; `@angular/material/progress-spinner`; `rxjs`; `../../cadastro-tecnico/services/produto.service`; `src/app/models/produto/produto-listagem.model`; `src/app/models/preco/preco-response.model`; `src/app/models/servico/servico-response.model`; `src/app/models/acabamento/acabamento-variacao-response.model`; `./steps/configurar-preco-step/configurar-preco-step.component`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-dialog-adicionar-produto` — `DialogAdicionarProdutoComponent`

**Arquivo:** [src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: adicionar produto. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (2):** [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.ts](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.ts); [src/app/pages/pedido/form-pedido/form-pedido.component.ts](../src/app/pages/pedido/form-pedido/form-pedido.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `@angular/material/stepper`; `@angular/material/button`; `@angular/material/radio`; `@angular/material/divider`; `@angular/material/checkbox`; `@angular/material/tooltip`; `@angular/material/icon`; `@angular/material/card`; `@angular/material/dialog`; `@angular/material/progress-spinner`; `../../cadastro-tecnico/services/produto.service`; `./steps/selecionar-produto-step/selecionar-produto-step.component`; `./steps/escolher-variacao-step/escolher-variacao-step.component`; `./steps/servicos-step/servicos-step.component`; `./steps/revisao-step/revisao-step.component`; `src/app/models/produto/produto-listagem.model`; `src/app/models/preco/preco-response.model`; `src/app/models/servico/servico-response.model`; `./steps/configurar-preco-step/configurar-preco-step.component`; `src/app/models/acabamento/acabamento-variacao-response.model`.

**Responsividade (evidência estática):** `@media (max-width: 720px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-preco-demanda-config` — `PrecoDemandaConfigComponent`

**Arquivo:** [src/app/pages/pedido/dialog-adicionar-produto/preco-demanda-component/preco-demanda-config.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/preco-demanda-component/preco-demanda-config.component.ts).

**Responsabilidade / decisão:** Composição de preco demanda config; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** `produto: any;`.

**Outputs:** `adicionar = new EventEmitter<any>();`.

**Consumidores diretos (1):** [src/app/pages/pedido/dialog-adicionar-produto/steps/configurar-preco-step/configurar-preco-step.component.html](../src/app/pages/pedido/dialog-adicionar-produto/steps/configurar-preco-step/configurar-preco-step.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `src/app/components/inputs/input-numerico/input-numerico.component`; `src/app/models/preco/faixa-demanda.model`; `@angular/material/button`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-preco-fixo-config` — `PrecoFixoConfigComponent`

**Arquivo:** [src/app/pages/pedido/dialog-adicionar-produto/preco-fixo-component/preco-fixo-config.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/preco-fixo-component/preco-fixo-config.component.ts).

**Responsabilidade / decisão:** Composição de preco fixo config; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** `produto: any;`.

**Outputs:** `adicionar = new EventEmitter<any>();`.

**Consumidores diretos (1):** [src/app/pages/pedido/dialog-adicionar-produto/steps/configurar-preco-step/configurar-preco-step.component.html](../src/app/pages/pedido/dialog-adicionar-produto/steps/configurar-preco-step/configurar-preco-step.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/button`; `src/app/components/inputs/input-numerico/input-numerico.component`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-preco-metro-config` — `PrecoMetroConfigComponent`

**Arquivo:** [src/app/pages/pedido/dialog-adicionar-produto/preco-metro-component/preco-metro-config.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/preco-metro-component/preco-metro-config.component.ts).

**Responsabilidade / decisão:** Composição de preco metro config; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** `produto: any = null;`.

**Outputs:** `adicionar = new EventEmitter<any>();`; `readyChange = new EventEmitter<boolean>();`.

**Consumidores diretos (1):** [src/app/pages/pedido/dialog-adicionar-produto/steps/configurar-preco-step/configurar-preco-step.component.html](../src/app/pages/pedido/dialog-adicionar-produto/steps/configurar-preco-step/configurar-preco-step.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/divider`; `@angular/material/button`; `@angular/material/icon`; `../../../../components/inputs/input-numerico/input-numerico.component`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-preco-quantidade-config` — `PrecoQuantidadeConfigComponent`

**Arquivo:** [src/app/pages/pedido/dialog-adicionar-produto/preco-quantidade-component/preco-quantidade-config.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/preco-quantidade-component/preco-quantidade-config.component.ts).

**Responsabilidade / decisão:** Composição de preco quantidade config; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** `produto: any;`.

**Outputs:** `adicionar = new EventEmitter<any>();`.

**Consumidores diretos (1):** [src/app/pages/pedido/dialog-adicionar-produto/steps/configurar-preco-step/configurar-preco-step.component.html](../src/app/pages/pedido/dialog-adicionar-produto/steps/configurar-preco-step/configurar-preco-step.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/button`; `@angular/material/radio`; `@angular/material/card`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-configurar-preco-step` — `ConfigurarPrecoStepComponent`

**Arquivo:** [src/app/pages/pedido/dialog-adicionar-produto/steps/configurar-preco-step/configurar-preco-step.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/steps/configurar-preco-step/configurar-preco-step.component.ts).

**Responsabilidade / decisão:** Etapa de domínio: configurar preco. **FEATURE-SPECIFIC**.

**Inputs:** `produto: ProdutoListagem | null = null;`; `resumoPreco: any = null;`; `baseResumoTexto: string | null = null;`; `baseSubtotal: number | null = null;`.

**Outputs:** `configConcluida = new EventEmitter<any>();`; `precoReadyChange = new EventEmitter<boolean>();`.

**Consumidores diretos (2):** [src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto-mobile.component.html](../src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto-mobile.component.html); [src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto.component.html](../src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/card`; `@angular/material/icon`; `src/app/models/produto/produto-listagem.model`; `../../preco-fixo-component/preco-fixo-config.component`; `../../preco-quantidade-component/preco-quantidade-config.component`; `../../preco-demanda-component/preco-demanda-config.component`; `../../preco-metro-component/preco-metro-config.component`.

**Responsividade (evidência estática):** `@media (max-width: 1100px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-escolher-variacao-step` — `EscolherVariacaoStepComponent`

**Arquivo:** [src/app/pages/pedido/dialog-adicionar-produto/steps/escolher-variacao-step/escolher-variacao-step.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/steps/escolher-variacao-step/escolher-variacao-step.component.ts).

**Responsabilidade / decisão:** Etapa de domínio: escolher variacao. **FEATURE-SPECIFIC**.

**Inputs:** `form!: FormGroup;`; `variacoes: Variacao[] = [];`; `loadingVariacoes = false;`; `resumoVariacaoComAcab: string | null = null;`; `precoResumoFn!: (p: Preco | null | undefined) => string;`; `isSelectedFn!: (id: number) => boolean;`.

**Outputs:** `acabamentoToggle = new EventEmitter<{ id: number; checked: boolean }>();`; `selectionChange = new EventEmitter<{ variacao: Variacao | null; servicos: ServicoResponse[]; acabamentos: AcabamentoVariacaoResponse[]; }>();`.

**Consumidores diretos (1):** [src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto.component.html](../src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/radio`; `@angular/material/divider`; `@angular/material/checkbox`; `@angular/material/tooltip`; `@angular/material/icon`; `@angular/material/progress-spinner`; `src/app/models/preco/preco-response.model`; `src/app/models/acabamento/acabamento-variacao-response.model`; `src/app/models/servico/servico-response.model`.

**Responsividade (evidência estática):** `@media (max-width: 960px)`; `@media (max-width: 720px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-revisao-step` — `RevisaoStepComponent`

**Arquivo:** [src/app/pages/pedido/dialog-adicionar-produto/steps/revisao-step/revisao-step.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/steps/revisao-step/revisao-step.component.ts).

**Responsabilidade / decisão:** Etapa de domínio: revisao. **FEATURE-SPECIFIC**.

**Inputs:** `produtoBase: { id: number; nome: string; descricao: string | null } | null = null;`; `selectedVariacao: any = null;`; `baseResumoTexto: string | null = null;`; `baseQtd: number = 1;`; `baseUnit: number | null = null;`; `baseSubtotal: number | null = null;`; `acabamentosSelecionadosDetalhe: AcabamentoVariacaoResponse[] = [];`; `servicosSelecionadosDetalhe: ServicoResponse[] = [];`; `adicionaisFixosSubtotal: number = 0;`; `totalConhecido: number | null = null;`; `qtdeVariaveis: number = 0;`; `moneyFn!: (v?: number | null) => string;`; `unitFromPrecoFn!: (p?: any) => number | null;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (1):** [src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto.component.html](../src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/divider`; `@angular/material/icon`; `src/app/models/servico/servico-response.model`; `src/app/models/acabamento/acabamento-variacao-response.model`.

**Responsividade (evidência estática):** `@media print`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-selecionar-produto-step` — `SelecionarProdutoStepComponent`

**Arquivo:** [src/app/pages/pedido/dialog-adicionar-produto/steps/selecionar-produto-step/selecionar-produto-step.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/steps/selecionar-produto-step/selecionar-produto-step.component.ts).

**Responsabilidade / decisão:** Etapa de domínio: selecionar produto. **FEATURE-SPECIFIC**.

**Inputs:** `selectedId: number | null = null;`.

**Outputs:** `selectedChange = new EventEmitter<ProdutoListagem>();`.

**Consumidores diretos (1):** [src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto.component.html](../src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/form-field`; `@angular/material/input`; `@angular/material/icon`; `@angular/material/button`; `@angular/material/paginator`; `@angular/material/progress-spinner`; `@angular/material/card`; `@angular/material/divider`; `rxjs`; `src/app/pages/cadastro-tecnico/services/produto.service`; `src/app/models/produto/produto-listagem.model`.

**Responsividade (evidência estática):** `@media (max-width: 900px)`; `@media (max-width: 640px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-servicos-step` — `ServicosStepComponent`

**Arquivo:** [src/app/pages/pedido/dialog-adicionar-produto/steps/servicos-step/servicos-step.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/steps/servicos-step/servicos-step.component.ts).

**Responsabilidade / decisão:** Etapa de domínio: servicos. **FEATURE-SPECIFIC**.

**Inputs:** `servicosDisponiveis: ServicoResponse[] = [];`; `control!: FormControl<number[]>;`; `precoResumoFn!: (p: Preco | null | undefined) => string;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (1):** [src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto.component.html](../src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/checkbox`; `@angular/material/tooltip`; `@angular/material/icon`; `src/app/models/servico/servico-response.model`; `src/app/models/preco/preco-response.model`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-dialog-descrever-item` — `DialogDescreverItemComponent`

**Arquivo:** [src/app/pages/pedido/dialog-descrever-item/dialog-descrever-item.component.ts](../src/app/pages/pedido/dialog-descrever-item/dialog-descrever-item.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: descrever item. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (2):** [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.ts](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.ts); [src/app/pages/pedido/form-pedido/form-pedido.component.ts](../src/app/pages/pedido/form-pedido/form-pedido.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `src/app/material.module`; `src/app/components/inputs/input-moeda/input-moeda.component`; `src/app/components/inputs/input-numerico/input-numerico.component`; `src/app/components/inputs/input-texto/input-texto-restrito.component`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-perfil-dialog` — `PerfilDialogComponent`

**Arquivo:** [src/app/pages/perfil/modal-perfil/perfil-dialog.component.ts](../src/app/pages/perfil/modal-perfil/perfil-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: perfil. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/perfil/gerenciar-perfil/gerenciar-perfil.component.ts](../src/app/pages/perfil/gerenciar-perfil/gerenciar-perfil.component.ts).

**Testes relacionados:** [src/app/pages/perfil/modal-perfil/perfil-dialog.component.spec.ts](../src/app/pages/perfil/modal-perfil/perfil-dialog.component.spec.ts).

**Dependências:** `@angular/material/dialog`; `@angular/forms`; `@angular/material/button`; `ngx-toastr`; `@angular/material/slide-toggle`; `@angular/material/checkbox`; `src/app/components/inputs/input-texto/input-texto-restrito.component`; `angular-tabler-icons`; `src/app/models/permissao.model`.

**Responsividade (evidência estática):** `@media (max-width: 720px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-trocar-perfil-dialog` — `TrocarPerfilDialogComponent`

**Arquivo:** [src/app/pages/perfil/modal-trocar-perfil/trocar-perfil-dialog.component.ts](../src/app/pages/perfil/modal-trocar-perfil/trocar-perfil-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: trocar perfil. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/perfil/gerenciar-perfil/gerenciar-perfil.component.ts](../src/app/pages/perfil/gerenciar-perfil/gerenciar-perfil.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/dialog`; `@angular/forms`; `@angular/material/button`; `@angular/material/form-field`; `@angular/material/select`; `@angular/material/input`; `ngx-toastr`; `src/app/models/perfil.model`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-dialog-criar-acordo` — `DialogCriarAcordoComponent`

**Arquivo:** [src/app/pages/pessoas/folha/components/dialog-criar-acordo/dialog-criar-acordo.component.ts](../src/app/pages/pessoas/folha/components/dialog-criar-acordo/dialog-criar-acordo.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: criar acordo. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.ts](../src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `@angular/material/button`; `src/app/components/inputs/input-options/input-options.component`; `src/app/components/inputs/input-moeda/input-moeda.component`; `src/app/components/inputs/input-textarea/input-textarea.component`; `../../models/folha.model`.

**Responsividade (evidência estática):** `@media (max-width: 640px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-dialog-criar-competencia` — `DialogCriarCompetenciaComponent`

**Arquivo:** [src/app/pages/pessoas/folha/components/dialog-criar-competencia/dialog-criar-competencia.component.ts](../src/app/pages/pessoas/folha/components/dialog-criar-competencia/dialog-criar-competencia.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: criar competencia. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.ts](../src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/button`; `@angular/material/dialog`; `@angular/material/form-field`; `@angular/material/input`; `@angular/material/select`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-dialog-folha-whatsapp` — `DialogFolhaWhatsappComponent`

**Arquivo:** [src/app/pages/pessoas/folha/components/dialog-folha-whatsapp/dialog-folha-whatsapp.component.ts](../src/app/pages/pessoas/folha/components/dialog-folha-whatsapp/dialog-folha-whatsapp.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: folha whatsapp. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.ts](../src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `@angular/material/button`; `@angular/material/icon`; `src/app/components/inputs/input-telefone/input-telefone.component`; `ngx-toastr`.

**Responsividade (evidência estática):** `@media (max-width: 640px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-dialog-renegociar-acordos` — `DialogRenegociarAcordosComponent`

**Arquivo:** [src/app/pages/pessoas/folha/components/dialog-renegociar-acordos/dialog-renegociar-acordos.component.ts](../src/app/pages/pessoas/folha/components/dialog-renegociar-acordos/dialog-renegociar-acordos.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: renegociar acordos. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.ts](../src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `@angular/material/button`; `@angular/material/checkbox`; `src/app/components/inputs/input-options/input-options.component`; `src/app/components/inputs/input-textarea/input-textarea.component`.

**Responsividade (evidência estática):** `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-dialog-valor-acao` — `DialogValorAcaoComponent`

**Arquivo:** [src/app/pages/pessoas/folha/components/dialog-valor-acao/dialog-valor-acao.component.ts](../src/app/pages/pessoas/folha/components/dialog-valor-acao/dialog-valor-acao.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: valor acao. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.ts](../src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `@angular/material/button`; `src/app/components/inputs/input-options/input-options.component`; `src/app/components/inputs/input-moeda/input-moeda.component`; `src/app/components/inputs/input-textarea/input-textarea.component`.

**Responsividade (evidência estática):** `@media (max-width: 640px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-storage-admin-page` — `StorageAdminPageComponent`

**Arquivo:** [src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.ts](../src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.ts).

**Responsabilidade / decisão:** Composição de storage admin page; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (0):** Nenhum detectado por seletor/abertura direta entre arquivos.

**Referências TS/rota/import (1):** [src/app/pages/pages.routes.ts](../src/app/pages/pages.routes.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/tabs`; `src/app/components/page-card/page-card.component`; `src/app/diretivas/tem-permissao.directive`; `../storage-arquivos-lista/storage-arquivos-lista.component`; `../storage-dashboard/storage-dashboard.component`; `../storage-lixeira/storage-lixeira.component`; `../storage-reconciliacao/storage-reconciliacao.component`; `../storage-videos/storage-videos.component`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template externo; sem bloco de estilos inline.

### `app-storage-arquivos-lista` — `StorageArquivosListaComponent`

**Arquivo:** [src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.ts](../src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.ts).

**Responsabilidade / decisão:** Composição de storage arquivos lista; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.html](../src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/button`; `@angular/material/dialog`; `@angular/material/form-field`; `@angular/material/icon`; `@angular/material/input`; `@angular/material/progress-spinner`; `@angular/material/select`; `@angular/material/table`; `ngx-toastr`; `src/app/components/dialog/confirm-dialog/confirm-dialog.component`; `src/app/components/status-badge/status-badge.component`; `src/app/diretivas/tem-permissao.directive`; `../../models/storage.models`; `../../services/storage.service`; `../../utils/storage-format.util`; `../storage-detalhe-dialog/storage-detalhe-dialog.component`; `../storage-image-preview/storage-image-preview.component`.

**Responsividade (evidência estática):** `@media (max-width: 900px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-storage-dashboard` — `StorageDashboardComponent`

**Arquivo:** [src/app/pages/storage/components/storage-dashboard/storage-dashboard.component.ts](../src/app/pages/storage/components/storage-dashboard/storage-dashboard.component.ts).

**Responsabilidade / decisão:** Composição de storage dashboard; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.html](../src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/card`; `@angular/material/icon`; `@angular/material/progress-spinner`; `ngx-toastr`; `../../models/storage.models`; `../../services/storage.service`; `../../utils/storage-format.util`.

**Responsividade (evidência estática):** `@media (max-width: 1200px)`; `@media (max-width: 600px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-storage-detalhe-dialog` — `StorageDetalheDialogComponent`

**Arquivo:** [src/app/pages/storage/components/storage-detalhe-dialog/storage-detalhe-dialog.component.ts](../src/app/pages/storage/components/storage-detalhe-dialog/storage-detalhe-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: storage detalhe. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.ts](../src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/button`; `@angular/material/dialog`; `@angular/material/icon`; `../../models/storage.models`; `../storage-image-preview/storage-image-preview.component`; `../../utils/storage-format.util`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 22 linhas; estilos inline.

### `app-storage-image-preview` — `StorageImagePreviewComponent`

**Arquivo:** [src/app/pages/storage/components/storage-image-preview/storage-image-preview.component.ts](../src/app/pages/storage/components/storage-image-preview/storage-image-preview.component.ts).

**Responsabilidade / decisão:** Prévia de mídia com variante de imagem. **FEATURE-SPECIFIC**.

**Inputs:** `media?: StorageMediaLike | null;`; `variant: StorageImageVariantType = 'CARD';`; `alt = 'Arquivo';`; `width?: number | null;`; `height?: number | null;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (5):** [src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts](../src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-detail.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-detail.component.ts); [src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.html](../src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.html); [src/app/pages/storage/components/storage-detalhe-dialog/storage-detalhe-dialog.component.ts](../src/app/pages/storage/components/storage-detalhe-dialog/storage-detalhe-dialog.component.ts); [src/app/pages/storage/components/storage-lixeira/storage-lixeira.component.html](../src/app/pages/storage/components/storage-lixeira/storage-lixeira.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `../../models/storage.models`; `../../utils/storage-media-url.util`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 12 linhas; estilos inline.

### `app-storage-lixeira` — `StorageLixeiraComponent`

**Arquivo:** [src/app/pages/storage/components/storage-lixeira/storage-lixeira.component.ts](../src/app/pages/storage/components/storage-lixeira/storage-lixeira.component.ts).

**Responsabilidade / decisão:** Composição de storage lixeira; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.html](../src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/button`; `@angular/material/dialog`; `@angular/material/icon`; `@angular/material/progress-spinner`; `@angular/material/table`; `ngx-toastr`; `src/app/components/dialog/confirm-dialog/confirm-dialog.component`; `src/app/components/status-badge/status-badge.component`; `src/app/diretivas/tem-permissao.directive`; `../../models/storage.models`; `../../services/storage.service`; `../../utils/storage-format.util`; `../storage-image-preview/storage-image-preview.component`.

**Responsividade (evidência estática):** `@media (max-width: 900px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-storage-reconciliacao` — `StorageReconciliacaoComponent`

**Arquivo:** [src/app/pages/storage/components/storage-reconciliacao/storage-reconciliacao.component.ts](../src/app/pages/storage/components/storage-reconciliacao/storage-reconciliacao.component.ts).

**Responsabilidade / decisão:** Composição de storage reconciliacao; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.html](../src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/button`; `@angular/material/card`; `@angular/material/icon`; `@angular/material/progress-spinner`; `ngx-toastr`; `src/app/diretivas/tem-permissao.directive`; `../../models/storage.models`; `../../services/storage.service`.

**Responsividade (evidência estática):** `@media (max-width: 900px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-storage-video-status` — `StorageVideoStatusComponent`

**Arquivo:** [src/app/pages/storage/components/storage-video-status/storage-video-status.component.ts](../src/app/pages/storage/components/storage-video-status/storage-video-status.component.ts).

**Responsabilidade / decisão:** Composição de storage video status; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** `status?: string | null;`.

**Outputs:** Nenhum decorador declarado.

**Consumidores diretos (1):** [src/app/pages/storage/components/storage-videos/storage-videos.component.html](../src/app/pages/storage/components/storage-videos/storage-videos.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/icon`.

**Responsividade (evidência estática):** sem marcador explícito de breakpoint/viewport no componente e nos arquivos de estilo/template declarados.

**Organização:** template inline com 6 linhas; estilos inline.

### `app-storage-video-upload` — `StorageVideoUploadComponent`

**Arquivo:** [src/app/pages/storage/components/storage-video-upload/storage-video-upload.component.ts](../src/app/pages/storage/components/storage-video-upload/storage-video-upload.component.ts).

**Responsabilidade / decisão:** Composição de storage video upload; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** `videoEnviado = new EventEmitter<StorageVideo>();`.

**Consumidores diretos (1):** [src/app/pages/storage/components/storage-videos/storage-videos.component.html](../src/app/pages/storage/components/storage-videos/storage-videos.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/button`; `@angular/material/form-field`; `@angular/material/icon`; `@angular/material/input`; `@angular/material/progress-spinner`; `ngx-toastr`; `../../models/storage.models`; `../../services/storage.service`.

**Responsividade (evidência estática):** `@media (max-width: 900px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-storage-videos` — `StorageVideosComponent`

**Arquivo:** [src/app/pages/storage/components/storage-videos/storage-videos.component.ts](../src/app/pages/storage/components/storage-videos/storage-videos.component.ts).

**Responsabilidade / decisão:** Composição de storage videos; conteúdo e integração próprios da feature. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.html](../src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/button`; `@angular/material/card`; `@angular/material/dialog`; `@angular/material/icon`; `@angular/material/progress-spinner`; `rxjs`; `ngx-toastr`; `src/app/components/dialog/confirm-dialog/confirm-dialog.component`; `src/app/diretivas/tem-permissao.directive`; `../../models/storage.models`; `../../services/storage.service`; `../../utils/storage-format.util`; `../../utils/storage-media-url.util`; `../storage-video-status/storage-video-status.component`; `../storage-video-upload/storage-video-upload.component`.

**Responsividade (evidência estática):** `@media (max-width: 900px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-chamado-suporte-dialog` — `ChamadoSuporteDialogComponent`

**Arquivo:** [src/app/pages/suporte/components/chamado-suporte-dialog.component.ts](../src/app/pages/suporte/components/chamado-suporte-dialog.component.ts).

**Responsabilidade / decisão:** Dialog de domínio: chamado suporte. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (1):** [src/app/pages/suporte/suporte.component.ts](../src/app/pages/suporte/suporte.component.ts).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/forms`; `@angular/material/dialog`; `ngx-toastr`; `src/app/material.module`; `../models/chamado-suporte.model`; `../services/suporte.service`.

**Responsividade (evidência estática):** `@media (max-width: 767px)`.

**Organização:** template externo; sem bloco de estilos inline.

### `app-onboarding-tour` — `OnboardingTourComponent`

**Arquivo:** [src/app/shared/onboarding/onboarding-tour.component.ts](../src/app/shared/onboarding/onboarding-tour.component.ts).

**Responsabilidade / decisão:** Tour contextual de demonstração. **FEATURE-SPECIFIC**.

**Inputs:** Nenhum decorador declarado.

**Outputs:** Nenhum decorador declarado.

Contrato adicional deve ser lido no arquivo: dialogs usam injeção de dados/MatDialogRef; páginas e layouts usam serviços/rotas, sem presumir ausência de API.

**Consumidores diretos (3):** [src/app/pages/demo/demo-pedido.component.html](../src/app/pages/demo/demo-pedido.component.html); [src/app/pages/demo/demo-smartcalc.component.html](../src/app/pages/demo/demo-smartcalc.component.html); [src/app/pages/demo/demo-whatsapp.component.html](../src/app/pages/demo/demo-whatsapp.component.html).

**Testes relacionados:** Nenhum spec relacionado identificado no diretório.

**Dependências:** `@angular/material/button`; `@angular/material/icon`; `./onboarding-step.model`; `./onboarding.service`.

**Responsividade (evidência estática):** `window.innerWidth`; `isMobile`; `@media (max-width: 768px)`.

**Organização:** template externo; sem bloco de estilos inline.

## Apêndice B — Implementações inline e padrões sem componente

Índice de arquivos de produção com ocorrências dos padrões. Exclui specs e `pages/**/code/*` (snippets demonstrativos). Inclui páginas de template reais, que continuam fora da consolidação funcional enquanto não houver lote específico. A ocorrência não implica que todos devam migrar: impressão, árvores, mídia e domínio têm exceções descritas acima.

### Tabelas Material — 66 arquivos

[src/app/components/dashboard1/latest-reviews/latest-reviews.component.html](../src/app/components/dashboard1/latest-reviews/latest-reviews.component.html); [src/app/components/dashboard1/top-projects/top-projects.component.html](../src/app/components/dashboard1/top-projects/top-projects.component.html); [src/app/components/dashboard2/top-employees/top-employees.component.html](../src/app/components/dashboard2/top-employees/top-employees.component.html); [src/app/components/data-table/data-table.component.html](../src/app/components/data-table/data-table.component.html); [src/app/components/pedido-tabela/pedido-tabela.component.html](../src/app/components/pedido-tabela/pedido-tabela.component.html); [src/app/components/tabela/listar-produtos.component.html](../src/app/components/tabela/listar-produtos.component.html); [src/app/pages/apps/employee/employee.component.html](../src/app/pages/apps/employee/employee.component.html); [src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts](../src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts); [src/app/pages/apps/fiscal/documentos/fiscal-documentos.component.ts](../src/app/pages/apps/fiscal/documentos/fiscal-documentos.component.ts); [src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts](../src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts); [src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts](../src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts); [src/app/pages/apps/invoice/invoice-list/invoice-list.component.html](../src/app/pages/apps/invoice/invoice-list/invoice-list.component.html); [src/app/pages/apps/invoice/invoice-view/invoice-view.component.html](../src/app/pages/apps/invoice/invoice-view/invoice-view.component.html); [src/app/pages/apps/tickets/tickets.component.html](../src/app/pages/apps/tickets/tickets.component.html); [src/app/pages/billing/minha-assinatura/minha-assinatura.component.html](../src/app/pages/billing/minha-assinatura/minha-assinatura.component.html); [src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html); [src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.html); [src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html](../src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html); [src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html](../src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html); [src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html](../src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.html); [src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html](../src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html); [src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html](../src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html); [src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts); [src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts); [src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts); [src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts](../src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts); [src/app/pages/clicktv/components/playlists/clicktv-playlists.component.html](../src/app/pages/clicktv/components/playlists/clicktv-playlists.component.html); [src/app/pages/clicktv/components/telas/clicktv-telas.component.html](../src/app/pages/clicktv/components/telas/clicktv-telas.component.html); [src/app/pages/cliente/listar-cliente/listar-cliente.component.html](../src/app/pages/cliente/listar-cliente/listar-cliente.component.html); [src/app/pages/datatable/kichen-sink/kichen-sink.component.html](../src/app/pages/datatable/kichen-sink/kichen-sink.component.html); [src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html](../src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html); [src/app/pages/deposito/dashboard/deposito-dashboard-page.component.html](../src/app/pages/deposito/dashboard/deposito-dashboard-page.component.html); [src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html](../src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html); [src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html](../src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html); [src/app/pages/funcionarios/listar-funcionarios/listar-funcionarios.component.html](../src/app/pages/funcionarios/listar-funcionarios/listar-funcionarios.component.html); [src/app/pages/links/pages/analytics/links-analytics.component.html](../src/app/pages/links/pages/analytics/links-analytics.component.html); [src/app/pages/links/pages/editor/links-editor.component.html](../src/app/pages/links/pages/editor/links-editor.component.html); [src/app/pages/links/pages/lista/links-lista.component.html](../src/app/pages/links/pages/lista/links-lista.component.html); [src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.html](../src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.html); [src/app/pages/orcamentos/form-orcamento/form-orcamento.component.html](../src/app/pages/orcamentos/form-orcamento/form-orcamento.component.html); [src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html](../src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html); [src/app/pages/perfil/gerenciar-perfil/gerenciar-perfil.component.html](../src/app/pages/perfil/gerenciar-perfil/gerenciar-perfil.component.html); [src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.html](../src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.html); [src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.html](../src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.html); [src/app/pages/site/banners/listar-banners/listar-banners.component.html](../src/app/pages/site/banners/listar-banners/listar-banners.component.html); [src/app/pages/site/paginas/blocos/listar-blocos/listar-blocos.component.html](../src/app/pages/site/paginas/blocos/listar-blocos/listar-blocos.component.html); [src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html](../src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html); [src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.html](../src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.html); [src/app/pages/storage/components/storage-lixeira/storage-lixeira.component.html](../src/app/pages/storage/components/storage-lixeira/storage-lixeira.component.html); [src/app/pages/tables/basic-table/basic-table.component.html](../src/app/pages/tables/basic-table/basic-table.component.html); [src/app/pages/tables/dynamic-table/dynamic-table.component.html](../src/app/pages/tables/dynamic-table/dynamic-table.component.html); [src/app/pages/tables/expand-table/expand-table.component.html](../src/app/pages/tables/expand-table/expand-table.component.html); [src/app/pages/tables/filterable-table/filterable-table.component.html](../src/app/pages/tables/filterable-table/filterable-table.component.html); [src/app/pages/tables/footer-row-table/footer-row-table.component.html](../src/app/pages/tables/footer-row-table/footer-row-table.component.html); [src/app/pages/tables/http-table/http-table.component.html](../src/app/pages/tables/http-table/http-table.component.html); [src/app/pages/tables/mix-table/mix-table.component.html](../src/app/pages/tables/mix-table/mix-table.component.html); [src/app/pages/tables/multi-header-footer-table/multi-header-footer-table.component.html](../src/app/pages/tables/multi-header-footer-table/multi-header-footer-table.component.html); [src/app/pages/tables/pagination-table/pagination-table.component.html](../src/app/pages/tables/pagination-table/pagination-table.component.html); [src/app/pages/tables/row-context-table/row-context-table.component.html](../src/app/pages/tables/row-context-table/row-context-table.component.html); [src/app/pages/tables/selection-table/selection-table.component.html](../src/app/pages/tables/selection-table/selection-table.component.html); [src/app/pages/tables/sortable-table/sortable-table.component.html](../src/app/pages/tables/sortable-table/sortable-table.component.html); [src/app/pages/tables/sticky-column-table/sticky-column-table.component.html](../src/app/pages/tables/sticky-column-table/sticky-column-table.component.html); [src/app/pages/tables/sticky-header-footer-table/sticky-header-footer-table.component.html](../src/app/pages/tables/sticky-header-footer-table/sticky-header-footer-table.component.html); [src/app/pages/usuarios/listar-usuarios/listar-usuarios.component.html](../src/app/pages/usuarios/listar-usuarios/listar-usuarios.component.html).

### Paginação Material — 33 arquivos

[src/app/components/data-table/data-table.component.html](../src/app/components/data-table/data-table.component.html); [src/app/components/pedido-tabela/pedido-tabela.component.html](../src/app/components/pedido-tabela/pedido-tabela.component.html); [src/app/components/tabela/listar-produtos.component.html](../src/app/components/tabela/listar-produtos.component.html); [src/app/pages/apps/employee/employee.component.html](../src/app/pages/apps/employee/employee.component.html); [src/app/pages/apps/invoice/invoice-list/invoice-list.component.html](../src/app/pages/apps/invoice/invoice-list/invoice-list.component.html); [src/app/pages/apps/tickets/tickets.component.html](../src/app/pages/apps/tickets/tickets.component.html); [src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html); [src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html](../src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html); [src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html](../src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html); [src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html](../src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html); [src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html](../src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html); [src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html](../src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html); [src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts); [src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts](../src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts); [src/app/pages/clicktv/components/midias/clicktv-midias.component.html](../src/app/pages/clicktv/components/midias/clicktv-midias.component.html); [src/app/pages/clicktv/components/playlists/clicktv-playlists.component.html](../src/app/pages/clicktv/components/playlists/clicktv-playlists.component.html); [src/app/pages/clicktv/components/telas/clicktv-telas.component.html](../src/app/pages/clicktv/components/telas/clicktv-telas.component.html); [src/app/pages/cliente/listar-cliente/listar-cliente.component.html](../src/app/pages/cliente/listar-cliente/listar-cliente.component.html); [src/app/pages/datatable/kichen-sink/kichen-sink.component.html](../src/app/pages/datatable/kichen-sink/kichen-sink.component.html); [src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html](../src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html); [src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html](../src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html); [src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html](../src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html); [src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.ts](../src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.ts); [src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html](../src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html); [src/app/pages/pedido/dialog-adicionar-produto/steps/selecionar-produto-step/selecionar-produto-step.component.html](../src/app/pages/pedido/dialog-adicionar-produto/steps/selecionar-produto-step/selecionar-produto-step.component.html); [src/app/pages/site/banners/listar-banners/listar-banners.component.html](../src/app/pages/site/banners/listar-banners/listar-banners.component.html); [src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html](../src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html); [src/app/pages/tables/http-table/http-table.component.html](../src/app/pages/tables/http-table/http-table.component.html); [src/app/pages/tables/mix-table/mix-table.component.html](../src/app/pages/tables/mix-table/mix-table.component.html); [src/app/pages/tables/pagination-table/pagination-table.component.html](../src/app/pages/tables/pagination-table/pagination-table.component.html); [src/app/pages/ui-components/paginator/paginator.component.html](../src/app/pages/ui-components/paginator/paginator.component.html); [src/app/pages/usuarios/listar-usuarios/listar-usuarios.component.html](../src/app/pages/usuarios/listar-usuarios/listar-usuarios.component.html).

### Tabs Material — 13 arquivos

[src/app/components/code-view/code-view.component.html](../src/app/components/code-view/code-view.component.html); [src/app/components/dashboard2/upcoming-schedules/upcoming-schedules.component.html](../src/app/components/dashboard2/upcoming-schedules/upcoming-schedules.component.html); [src/app/components/tabs-section-card/tabs-section-card.component.html](../src/app/components/tabs-section-card/tabs-section-card.component.html); [src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts](../src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts); [src/app/pages/empresa/empresa-form.component.html](../src/app/pages/empresa/empresa-form.component.html); [src/app/pages/forms/form-horizontal/form-horizontal.component.html](../src/app/pages/forms/form-horizontal/form-horizontal.component.html); [src/app/pages/forms/form-vertical/form-vertical.component.html](../src/app/pages/forms/form-vertical/form-vertical.component.html); [src/app/pages/links/pages/editor/links-editor.component.html](../src/app/pages/links/pages/editor/links-editor.component.html); [src/app/pages/pedido/listar-pedido/listar-pedido.component.html](../src/app/pages/pedido/listar-pedido/listar-pedido.component.html); [src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.html](../src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.html); [src/app/pages/theme-pages/account-setting/account-setting.component.html](../src/app/pages/theme-pages/account-setting/account-setting.component.html); [src/app/pages/ui-components/tabs/tabs.component.html](../src/app/pages/ui-components/tabs/tabs.component.html).

### Loading visual local — 91 arquivos

[src/app/components/dashboard1/latest-deals/latest-deals.component.html](../src/app/components/dashboard1/latest-deals/latest-deals.component.html); [src/app/components/dashboard1/top-projects/top-projects.component.html](../src/app/components/dashboard1/top-projects/top-projects.component.html); [src/app/components/dashboard1/visit-usa/visit-usa.component.html](../src/app/components/dashboard1/visit-usa/visit-usa.component.html); [src/app/components/dashboard2/new-goals/new-goals.component.html](../src/app/components/dashboard2/new-goals/new-goals.component.html); [src/app/components/data-table/data-table.component.html](../src/app/components/data-table/data-table.component.html); [src/app/components/hierarchy-tree/hierarchy-tree.component.html](../src/app/components/hierarchy-tree/hierarchy-tree.component.html); [src/app/components/onboarding/onboarding-selection-step.component.html](../src/app/components/onboarding/onboarding-selection-step.component.html); [src/app/components/onboarding/onboarding-shell.component.html](../src/app/components/onboarding/onboarding-shell.component.html); [src/app/components/onboarding/onboarding-wizard.component.html](../src/app/components/onboarding/onboarding-wizard.component.html); [src/app/components/produto-selector/produto-selector-dialog.component.ts](../src/app/components/produto-selector/produto-selector-dialog.component.ts); [src/app/components/produto-selector/produto-selector.component.ts](../src/app/components/produto-selector/produto-selector.component.ts); [src/app/components/setup-progress/setup-progress.component.ts](../src/app/components/setup-progress/setup-progress.component.ts); [src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.html](../src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.html); [src/app/pages/apps/fiscal/configuracoes/fiscal-configuracoes.component.ts](../src/app/pages/apps/fiscal/configuracoes/fiscal-configuracoes.component.ts); [src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts](../src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts); [src/app/pages/apps/fiscal/documentos/fiscal-documentos.component.ts](../src/app/pages/apps/fiscal/documentos/fiscal-documentos.component.ts); [src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts](../src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts); [src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts](../src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts); [src/app/pages/apps/smart-calc/smart-calc.component.html](../src/app/pages/apps/smart-calc/smart-calc.component.html); [src/app/pages/billing/billing-pay/billing-pay.component.html](../src/app/pages/billing/billing-pay/billing-pay.component.html); [src/app/pages/billing/billing-return/billing-return.component.html](../src/app/pages/billing/billing-return/billing-return.component.html); [src/app/pages/billing/minha-assinatura/minha-assinatura.component.html](../src/app/pages/billing/minha-assinatura/minha-assinatura.component.html); [src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html); [src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html](../src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html); [src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html](../src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html); [src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html](../src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/calculadora-materiais/produto-calculadora-materiais-tab.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/calculadora-materiais/produto-calculadora-materiais-tab.component.html); [src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html](../src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html); [src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html](../src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html); [src/app/pages/calculadora-materiais/calculadora-materiais.component.html](../src/app/pages/calculadora-materiais/calculadora-materiais.component.html); [src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts); [src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts](../src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts); [src/app/pages/clicktv/components/midias/clicktv-midias.component.html](../src/app/pages/clicktv/components/midias/clicktv-midias.component.html); [src/app/pages/clicktv/components/playlist-editor/clicktv-playlist-editor.component.html](../src/app/pages/clicktv/components/playlist-editor/clicktv-playlist-editor.component.html); [src/app/pages/clicktv/components/playlists/clicktv-playlists.component.html](../src/app/pages/clicktv/components/playlists/clicktv-playlists.component.html); [src/app/pages/clicktv/components/telas/clicktv-telas.component.html](../src/app/pages/clicktv/components/telas/clicktv-telas.component.html); [src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component.html](../src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component.html); [src/app/pages/config/aplicativos-atalhos/aplicativos-atalhos.component.html](../src/app/pages/config/aplicativos-atalhos/aplicativos-atalhos.component.html); [src/app/pages/config/folha-config/folha-config.component.html](../src/app/pages/config/folha-config/folha-config.component.html); [src/app/pages/config/presenca-publica/presenca-publica.component.html](../src/app/pages/config/presenca-publica/presenca-publica.component.html); [src/app/pages/demo/demo-smartcalc.component.html](../src/app/pages/demo/demo-smartcalc.component.html); [src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html](../src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html); [src/app/pages/deposito/components/deposito-imagem-galeria/deposito-imagem-galeria.component.html](../src/app/pages/deposito/components/deposito-imagem-galeria/deposito-imagem-galeria.component.html); [src/app/pages/deposito/components/deposito-imagem-upload/deposito-imagem-upload.component.html](../src/app/pages/deposito/components/deposito-imagem-upload/deposito-imagem-upload.component.html); [src/app/pages/deposito/dashboard/deposito-dashboard-page.component.html](../src/app/pages/deposito/dashboard/deposito-dashboard-page.component.html); [src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html](../src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html); [src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html](../src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html); [src/app/pages/empresa/empresa-form.component.html](../src/app/pages/empresa/empresa-form.component.html); [src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.html](../src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.html); [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts); [src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.ts](../src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.ts); [src/app/pages/grafica/comercial-beta/orcamento-comercial-impressao-page.component.ts](../src/app/pages/grafica/comercial-beta/orcamento-comercial-impressao-page.component.ts); [src/app/pages/grafica/comercial-beta/orcamento-comercial-whatsapp-page.component.ts](../src/app/pages/grafica/comercial-beta/orcamento-comercial-whatsapp-page.component.ts); [src/app/pages/grafica/comercial-beta/pedido-comercial-impressao-page.component.ts](../src/app/pages/grafica/comercial-beta/pedido-comercial-impressao-page.component.ts); [src/app/pages/grafica/comercial-beta/pedido-comercial-whatsapp-page.component.ts](../src/app/pages/grafica/comercial-beta/pedido-comercial-whatsapp-page.component.ts); [src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.ts); [src/app/pages/links/components/share-panel/links-share-panel.component.html](../src/app/pages/links/components/share-panel/links-share-panel.component.html); [src/app/pages/links/pages/analytics/links-analytics.component.html](../src/app/pages/links/pages/analytics/links-analytics.component.html); [src/app/pages/links/pages/editor/links-editor.component.html](../src/app/pages/links/pages/editor/links-editor.component.html); [src/app/pages/links/pages/lista/links-lista.component.html](../src/app/pages/links/pages/lista/links-lista.component.html); [src/app/pages/onboarding-v2/company-step/onboarding-v2-company-page.component.html](../src/app/pages/onboarding-v2/company-step/onboarding-v2-company-page.component.html); [src/app/pages/onboarding-v2/entry/onboarding-v2-entry-page.component.html](../src/app/pages/onboarding-v2/entry/onboarding-v2-entry-page.component.html); [src/app/pages/onboarding-v2/products-step/onboarding-v2-products-page.component.html](../src/app/pages/onboarding-v2/products-step/onboarding-v2-products-page.component.html); [src/app/pages/onboarding-v2/summary-step/onboarding-v2-summary-page.component.html](../src/app/pages/onboarding-v2/summary-step/onboarding-v2-summary-page.component.html); [src/app/pages/onboarding/onboarding-page.component.html](../src/app/pages/onboarding/onboarding-page.component.html); [src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.html](../src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.html); [src/app/pages/orcamentos/form-orcamento/form-orcamento.component.html](../src/app/pages/orcamentos/form-orcamento/form-orcamento.component.html); [src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html](../src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html); [src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto-mobile.component.html](../src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto-mobile.component.html); [src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto.component.html](../src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto.component.html); [src/app/pages/pedido/dialog-adicionar-produto/steps/escolher-variacao-step/escolher-variacao-step.component.html](../src/app/pages/pedido/dialog-adicionar-produto/steps/escolher-variacao-step/escolher-variacao-step.component.html); [src/app/pages/pedido/dialog-adicionar-produto/steps/selecionar-produto-step/selecionar-produto-step.component.html](../src/app/pages/pedido/dialog-adicionar-produto/steps/selecionar-produto-step/selecionar-produto-step.component.html); [src/app/pages/pedido/listar-pedido/listar-pedido.component.html](../src/app/pages/pedido/listar-pedido/listar-pedido.component.html); [src/app/pages/site/banners/form-banner/form-banner.component.html](../src/app/pages/site/banners/form-banner/form-banner.component.html); [src/app/pages/site/banners/listar-banners/listar-banners.component.html](../src/app/pages/site/banners/listar-banners/listar-banners.component.html); [src/app/pages/site/configuracoes/site-configuracoes.component.html](../src/app/pages/site/configuracoes/site-configuracoes.component.html); [src/app/pages/site/paginas/blocos/listar-blocos/listar-blocos.component.html](../src/app/pages/site/paginas/blocos/listar-blocos/listar-blocos.component.html); [src/app/pages/site/paginas/form-pagina/form-pagina.component.html](../src/app/pages/site/paginas/form-pagina/form-pagina.component.html); [src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html](../src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html); [src/app/pages/smart-calc-config/smart-calc-config/smart-calc-config.component.html](../src/app/pages/smart-calc-config/smart-calc-config/smart-calc-config.component.html); [src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.html](../src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.html); [src/app/pages/storage/components/storage-dashboard/storage-dashboard.component.html](../src/app/pages/storage/components/storage-dashboard/storage-dashboard.component.html); [src/app/pages/storage/components/storage-lixeira/storage-lixeira.component.html](../src/app/pages/storage/components/storage-lixeira/storage-lixeira.component.html); [src/app/pages/storage/components/storage-reconciliacao/storage-reconciliacao.component.html](../src/app/pages/storage/components/storage-reconciliacao/storage-reconciliacao.component.html); [src/app/pages/storage/components/storage-video-upload/storage-video-upload.component.html](../src/app/pages/storage/components/storage-video-upload/storage-video-upload.component.html); [src/app/pages/storage/components/storage-videos/storage-videos.component.html](../src/app/pages/storage/components/storage-videos/storage-videos.component.html); [src/app/pages/tables/http-table/http-table.component.html](../src/app/pages/tables/http-table/http-table.component.html); [src/app/pages/ui-components/progress-snipper/progress-snipper.component.html](../src/app/pages/ui-components/progress-snipper/progress-snipper.component.html); [src/app/pages/ui-components/progress/progress.component.html](../src/app/pages/ui-components/progress/progress.component.html).

### Estado vazio local — 87 arquivos

[src/app/components/cliente-selector-card/cliente-selector-card.component.html](../src/app/components/cliente-selector-card/cliente-selector-card.component.html); [src/app/components/dashboard1/receita-resumo/receita-resumo.component.html](../src/app/components/dashboard1/receita-resumo/receita-resumo.component.html); [src/app/components/data-table/data-table.component.html](../src/app/components/data-table/data-table.component.html); [src/app/components/dual-list-transfer/dual-list-transfer.component.html](../src/app/components/dual-list-transfer/dual-list-transfer.component.html); [src/app/components/hierarchy-tree/hierarchy-tree.component.html](../src/app/components/hierarchy-tree/hierarchy-tree.component.html); [src/app/components/hierarchy-tree/hierarchy-tree.component.ts](../src/app/components/hierarchy-tree/hierarchy-tree.component.ts); [src/app/components/inputs/auto-complete/auto-complete.component.html](../src/app/components/inputs/auto-complete/auto-complete.component.html); [src/app/components/inputs/input-multi-select/input-multi-select-component.html](../src/app/components/inputs/input-multi-select/input-multi-select-component.html); [src/app/components/inputs/input-options/input-options.component.html](../src/app/components/inputs/input-options/input-options.component.html); [src/app/components/itens-pedido-section/itens-pedido-section.component.html](../src/app/components/itens-pedido-section/itens-pedido-section.component.html); [src/app/components/observacoes-card/observacoes-card.component.html](../src/app/components/observacoes-card/observacoes-card.component.html); [src/app/components/produto-selector/produto-selector-dialog.component.ts](../src/app/components/produto-selector/produto-selector-dialog.component.ts); [src/app/components/produto-selector/produto-selector.component.ts](../src/app/components/produto-selector/produto-selector.component.ts); [src/app/layouts/full/full.component.html](../src/app/layouts/full/full.component.html); [src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.html](../src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.html); [src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts](../src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts); [src/app/pages/apps/fiscal/documentos/fiscal-documentos.component.ts](../src/app/pages/apps/fiscal/documentos/fiscal-documentos.component.ts); [src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts](../src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts); [src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts](../src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts); [src/app/pages/apps/smart-calc/smart-calc.component.html](../src/app/pages/apps/smart-calc/smart-calc.component.html); [src/app/pages/billing/minha-assinatura/minha-assinatura.component.html](../src/app/pages/billing/minha-assinatura/minha-assinatura.component.html); [src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html); [src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.html); [src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html](../src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html); [src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html](../src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html); [src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html](../src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.html); [src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html](../src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html); [src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html](../src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html); [src/app/pages/calculadora-materiais/calculadora-materiais.component.html](../src/app/pages/calculadora-materiais/calculadora-materiais.component.html); [src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts); [src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts); [src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts); [src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts](../src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts); [src/app/pages/catalogo/shared/components/catalogo-produto-caracteristicas.component.ts](../src/app/pages/catalogo/shared/components/catalogo-produto-caracteristicas.component.ts); [src/app/pages/clicktv/components/midias/clicktv-midias.component.html](../src/app/pages/clicktv/components/midias/clicktv-midias.component.html); [src/app/pages/clicktv/components/playlists/clicktv-playlists.component.html](../src/app/pages/clicktv/components/playlists/clicktv-playlists.component.html); [src/app/pages/clicktv/components/telas/clicktv-telas.component.html](../src/app/pages/clicktv/components/telas/clicktv-telas.component.html); [src/app/pages/config/aplicativos-atalhos/aplicativos-atalhos.component.html](../src/app/pages/config/aplicativos-atalhos/aplicativos-atalhos.component.html); [src/app/pages/dashboards/dashboard-chart-view/dashboard-chart-view.component.html](../src/app/pages/dashboards/dashboard-chart-view/dashboard-chart-view.component.html); [src/app/pages/demo/demo-smartcalc.component.html](../src/app/pages/demo/demo-smartcalc.component.html); [src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html](../src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html); [src/app/pages/deposito/components/deposito-imagem-galeria/deposito-imagem-galeria.component.html](../src/app/pages/deposito/components/deposito-imagem-galeria/deposito-imagem-galeria.component.html); [src/app/pages/deposito/components/lista-dinamica-input/lista-dinamica-input.component.html](../src/app/pages/deposito/components/lista-dinamica-input/lista-dinamica-input.component.html); [src/app/pages/deposito/dashboard/deposito-dashboard-page.component.html](../src/app/pages/deposito/dashboard/deposito-dashboard-page.component.html); [src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html](../src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html); [src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html](../src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html); [src/app/pages/funcionarios/listar-funcionarios/listar-funcionarios.component.html](../src/app/pages/funcionarios/listar-funcionarios/listar-funcionarios.component.html); [src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.html](../src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.html); [src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts](../src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts); [src/app/pages/grafica/categorias/grafica-categorias.component.ts](../src/app/pages/grafica/categorias/grafica-categorias.component.ts); [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts); [src/app/pages/grafica/comercial-beta/comercial-beta-list.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-list.component.ts); [src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.ts](../src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.ts); [src/app/pages/grafica/cores/grafica-cores.component.ts](../src/app/pages/grafica/cores/grafica-cores.component.ts); [src/app/pages/grafica/formatos/grafica-formatos.component.ts](../src/app/pages/grafica/formatos/grafica-formatos.component.ts); [src/app/pages/grafica/materiais/grafica-materiais.component.ts](../src/app/pages/grafica/materiais/grafica-materiais.component.ts); [src/app/pages/grafica/produtos/grafica-produto-form.component.ts](../src/app/pages/grafica/produtos/grafica-produto-form.component.ts); [src/app/pages/grafica/produtos/grafica-produtos.component.ts](../src/app/pages/grafica/produtos/grafica-produtos.component.ts); [src/app/pages/grafica/servicos/grafica-servicos.component.ts](../src/app/pages/grafica/servicos/grafica-servicos.component.ts); [src/app/pages/links/components/public-preview/links-public-preview.component.html](../src/app/pages/links/components/public-preview/links-public-preview.component.html); [src/app/pages/links/pages/analytics/links-analytics.component.html](../src/app/pages/links/pages/analytics/links-analytics.component.html); [src/app/pages/links/pages/editor/links-editor.component.html](../src/app/pages/links/pages/editor/links-editor.component.html); [src/app/pages/links/pages/lista/links-lista.component.html](../src/app/pages/links/pages/lista/links-lista.component.html); [src/app/pages/notificacoes/notificacoes.component.html](../src/app/pages/notificacoes/notificacoes.component.html); [src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.html](../src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.html); [src/app/pages/orcamentos/form-orcamento/form-orcamento.component.html](../src/app/pages/orcamentos/form-orcamento/form-orcamento.component.html); [src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html](../src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html); [src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto-mobile.component.html](../src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto-mobile.component.html); [src/app/pages/pedido/dialog-adicionar-produto/steps/configurar-preco-step/configurar-preco-step.component.html](../src/app/pages/pedido/dialog-adicionar-produto/steps/configurar-preco-step/configurar-preco-step.component.html); [src/app/pages/pedido/dialog-adicionar-produto/steps/escolher-variacao-step/escolher-variacao-step.component.html](../src/app/pages/pedido/dialog-adicionar-produto/steps/escolher-variacao-step/escolher-variacao-step.component.html); [src/app/pages/pedido/dialog-adicionar-produto/steps/selecionar-produto-step/selecionar-produto-step.component.html](../src/app/pages/pedido/dialog-adicionar-produto/steps/selecionar-produto-step/selecionar-produto-step.component.html); [src/app/pages/pedido/dialog-adicionar-produto/steps/servicos-step/servicos-step.component.html](../src/app/pages/pedido/dialog-adicionar-produto/steps/servicos-step/servicos-step.component.html); [src/app/pages/pedido/form-pedido/form-pedido.component.html](../src/app/pages/pedido/form-pedido/form-pedido.component.html); [src/app/pages/pedido/listar-pedido/listar-pedido.component.html](../src/app/pages/pedido/listar-pedido/listar-pedido.component.html); [src/app/pages/pedido/pedido-imprimir/layouts/pedido-completo/imprimir-pedido-completo/imprimir-pedido-completo.component.html](../src/app/pages/pedido/pedido-imprimir/layouts/pedido-completo/imprimir-pedido-completo/imprimir-pedido-completo.component.html); [src/app/pages/pedido/pedido-imprimir/layouts/pedido-duas-vias/imprimir-pedido-duas-vias/imprimir-pedido-duas-vias.component.html](../src/app/pages/pedido/pedido-imprimir/layouts/pedido-duas-vias/imprimir-pedido-duas-vias/imprimir-pedido-duas-vias.component.html); [src/app/pages/perfil/modal-perfil/perfil-dialog.component.html](../src/app/pages/perfil/modal-perfil/perfil-dialog.component.html); [src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.html](../src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.html); [src/app/pages/site/banners/banner-preview/banner-preview.component.html](../src/app/pages/site/banners/banner-preview/banner-preview.component.html); [src/app/pages/site/banners/listar-banners/listar-banners.component.html](../src/app/pages/site/banners/listar-banners/listar-banners.component.html); [src/app/pages/site/paginas/blocos/listar-blocos/listar-blocos.component.html](../src/app/pages/site/paginas/blocos/listar-blocos/listar-blocos.component.html); [src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html](../src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html); [src/app/pages/smart-calc-config/smart-calc-config/smart-calc-config.component.html](../src/app/pages/smart-calc-config/smart-calc-config/smart-calc-config.component.html); [src/app/pages/suporte/suporte.component.html](../src/app/pages/suporte/suporte.component.html).

### Erro e retry local — 11 arquivos

[src/app/pages/billing/billing-return/billing-return.component.html](../src/app/pages/billing/billing-return/billing-return.component.html); [src/app/pages/deposito/components/deposito-imagem-upload/deposito-imagem-upload.component.html](../src/app/pages/deposito/components/deposito-imagem-upload/deposito-imagem-upload.component.html); [src/app/pages/deposito/dashboard/deposito-dashboard-page.component.html](../src/app/pages/deposito/dashboard/deposito-dashboard-page.component.html); [src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.ts](../src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.ts); [src/app/pages/grafica/comercial-beta/orcamento-comercial-impressao-page.component.ts](../src/app/pages/grafica/comercial-beta/orcamento-comercial-impressao-page.component.ts); [src/app/pages/grafica/comercial-beta/orcamento-comercial-whatsapp-page.component.ts](../src/app/pages/grafica/comercial-beta/orcamento-comercial-whatsapp-page.component.ts); [src/app/pages/grafica/comercial-beta/pedido-comercial-impressao-page.component.ts](../src/app/pages/grafica/comercial-beta/pedido-comercial-impressao-page.component.ts); [src/app/pages/grafica/comercial-beta/pedido-comercial-whatsapp-page.component.ts](../src/app/pages/grafica/comercial-beta/pedido-comercial-whatsapp-page.component.ts); [src/app/pages/links/pages/analytics/links-analytics.component.html](../src/app/pages/links/pages/analytics/links-analytics.component.html); [src/app/pages/onboarding-v2/summary-step/onboarding-v2-summary-page.component.html](../src/app/pages/onboarding-v2/summary-step/onboarding-v2-summary-page.component.html); [src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html](../src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html).

### Ações locais de formulário — 94 arquivos

[src/app/components/cliente-selector-card/cliente-selector-card.component.html](../src/app/components/cliente-selector-card/cliente-selector-card.component.html); [src/app/components/data-table/data-table.component.html](../src/app/components/data-table/data-table.component.html); [src/app/components/dialog/acabamento-variacao-dialog/acabamento-variacao-dialog.component.html](../src/app/components/dialog/acabamento-variacao-dialog/acabamento-variacao-dialog.component.html); [src/app/components/dialog/acabamento-variacao-editar-dialog/acabamento-variacao-editar-dialog.component.html](../src/app/components/dialog/acabamento-variacao-editar-dialog/acabamento-variacao-editar-dialog.component.html); [src/app/components/dialog/variacao-editar-dialog/variacao-editar-dialog.component.html](../src/app/components/dialog/variacao-editar-dialog/variacao-editar-dialog.component.html); [src/app/components/hierarchy-tree/hierarchy-tree.component.html](../src/app/components/hierarchy-tree/hierarchy-tree.component.html); [src/app/components/itens-pedido-section/itens-pedido-section.component.html](../src/app/components/itens-pedido-section/itens-pedido-section.component.html); [src/app/components/mobile-total-bar/mobile-total-bar.component.html](../src/app/components/mobile-total-bar/mobile-total-bar.component.html); [src/app/components/observacoes-card/observacoes-card.component.html](../src/app/components/observacoes-card/observacoes-card.component.html); [src/app/components/onboarding/onboarding-selection-step.component.html](../src/app/components/onboarding/onboarding-selection-step.component.html); [src/app/components/onboarding/onboarding-shell.component.html](../src/app/components/onboarding/onboarding-shell.component.html); [src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.html](../src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.html); [src/app/components/produto-selector/produto-selector-dialog.component.ts](../src/app/components/produto-selector/produto-selector-dialog.component.ts); [src/app/components/section-card/section-card.component.html](../src/app/components/section-card/section-card.component.html); [src/app/layouts/full/full.component.html](../src/app/layouts/full/full.component.html); [src/app/layouts/full/vertical/header/header.component.html](../src/app/layouts/full/vertical/header/header.component.html); [src/app/pages/apps/calculadoras/pisos/calculadora-pisos-contato-orcamento-dialog.component.ts](../src/app/pages/apps/calculadoras/pisos/calculadora-pisos-contato-orcamento-dialog.component.ts); [src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.html](../src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.html); [src/app/pages/apps/fiscal/configuracoes/fiscal-configuracoes.component.ts](../src/app/pages/apps/fiscal/configuracoes/fiscal-configuracoes.component.ts); [src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts](../src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts); [src/app/pages/apps/fiscal/inutilizacoes/fiscal-inutilizacoes.component.ts](../src/app/pages/apps/fiscal/inutilizacoes/fiscal-inutilizacoes.component.ts); [src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts](../src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts); [src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts](../src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts); [src/app/pages/apps/smart-calc/smart-calc.component.html](../src/app/pages/apps/smart-calc/smart-calc.component.html); [src/app/pages/billing/billing-confirmation/billing-confirmation.component.html](../src/app/pages/billing/billing-confirmation/billing-confirmation.component.html); [src/app/pages/billing/minha-assinatura/minha-assinatura.component.html](../src/app/pages/billing/minha-assinatura/minha-assinatura.component.html); [src/app/pages/cadastro-tecnico/acabamentos/form-acabamento/form-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/form-acabamento/form-acabamento.component.html); [src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.html); [src/app/pages/cadastro-tecnico/cores/form-cores/form-cores.component.html](../src/app/pages/cadastro-tecnico/cores/form-cores/form-cores.component.html); [src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.html](../src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.html); [src/app/pages/cadastro-tecnico/materiais/form-material/form-material.component.html](../src/app/pages/cadastro-tecnico/materiais/form-material/form-material.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/calculadora-materiais/produto-calculadora-materiais-tab.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/calculadora-materiais/produto-calculadora-materiais-tab.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.html); [src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html](../src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html); [src/app/pages/calculadora-materiais/calculadora-materiais.component.html](../src/app/pages/calculadora-materiais/calculadora-materiais.component.html); [src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts); [src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts); [src/app/pages/catalogo/categorias/catalogo-categoria-form.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-form.component.ts); [src/app/pages/catalogo/marcas/catalogo-marca-form.component.ts](../src/app/pages/catalogo/marcas/catalogo-marca-form.component.ts); [src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts); [src/app/pages/clicktv/components/playlist-editor/clicktv-playlist-editor.component.html](../src/app/pages/clicktv/components/playlist-editor/clicktv-playlist-editor.component.html); [src/app/pages/clicktv/components/playlists/clicktv-playlists.component.html](../src/app/pages/clicktv/components/playlists/clicktv-playlists.component.html); [src/app/pages/config/aplicativos-atalhos/aplicativos-atalhos.component.html](../src/app/pages/config/aplicativos-atalhos/aplicativos-atalhos.component.html); [src/app/pages/config/email-servidor/email-servidor.component.html](../src/app/pages/config/email-servidor/email-servidor.component.html); [src/app/pages/config/folha-config/folha-config.component.html](../src/app/pages/config/folha-config/folha-config.component.html); [src/app/pages/config/presenca-publica/presenca-publica.component.html](../src/app/pages/config/presenca-publica/presenca-publica.component.html); [src/app/pages/dashboards/dashboard1/dashboard1.component.html](../src/app/pages/dashboards/dashboard1/dashboard1.component.html); [src/app/pages/demo/demo-pedido.component.html](../src/app/pages/demo/demo-pedido.component.html); [src/app/pages/demo/demo-shell.component.html](../src/app/pages/demo/demo-shell.component.html); [src/app/pages/demo/demo-smartcalc.component.html](../src/app/pages/demo/demo-smartcalc.component.html); [src/app/pages/demo/demo-whatsapp.component.html](../src/app/pages/demo/demo-whatsapp.component.html); [src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html](../src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html); [src/app/pages/deposito/components/deposito-imagem-galeria/deposito-imagem-galeria.component.html](../src/app/pages/deposito/components/deposito-imagem-galeria/deposito-imagem-galeria.component.html); [src/app/pages/deposito/components/deposito-imagem-upload/deposito-imagem-upload.component.html](../src/app/pages/deposito/components/deposito-imagem-upload/deposito-imagem-upload.component.html); [src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html](../src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html); [src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html](../src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html); [src/app/pages/empresa/empresa-form.component.html](../src/app/pages/empresa/empresa-form.component.html); [src/app/pages/grafica/biblioteca/biblioteca-dialog.component.ts](../src/app/pages/grafica/biblioteca/biblioteca-dialog.component.ts); [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts); [src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.ts](../src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.ts); [src/app/pages/grafica/comercial-beta/orcamento-comercial-impressao-page.component.ts](../src/app/pages/grafica/comercial-beta/orcamento-comercial-impressao-page.component.ts); [src/app/pages/grafica/comercial-beta/orcamento-comercial-whatsapp-page.component.ts](../src/app/pages/grafica/comercial-beta/orcamento-comercial-whatsapp-page.component.ts); [src/app/pages/grafica/comercial-beta/pedido-comercial-impressao-page.component.ts](../src/app/pages/grafica/comercial-beta/pedido-comercial-impressao-page.component.ts); [src/app/pages/grafica/comercial-beta/pedido-comercial-whatsapp-page.component.ts](../src/app/pages/grafica/comercial-beta/pedido-comercial-whatsapp-page.component.ts); [src/app/pages/grafica/comercial-beta/pedido-documentos-acoes.component.ts](../src/app/pages/grafica/comercial-beta/pedido-documentos-acoes.component.ts); [src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts); [src/app/pages/grafica/produtos/grafica-produto-form.component.ts](../src/app/pages/grafica/produtos/grafica-produto-form.component.ts); [src/app/pages/links/components/item-dialog/links-item-dialog.component.html](../src/app/pages/links/components/item-dialog/links-item-dialog.component.html); [src/app/pages/links/components/share-panel/links-share-panel.component.html](../src/app/pages/links/components/share-panel/links-share-panel.component.html); [src/app/pages/links/pages/editor/links-editor.component.html](../src/app/pages/links/pages/editor/links-editor.component.html); [src/app/pages/links/pages/lista/links-lista.component.html](../src/app/pages/links/pages/lista/links-lista.component.html); [src/app/pages/notificacoes/notificacoes.component.html](../src/app/pages/notificacoes/notificacoes.component.html); [src/app/pages/onboarding-v2/entry/onboarding-v2-entry-page.component.html](../src/app/pages/onboarding-v2/entry/onboarding-v2-entry-page.component.html); [src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.html](../src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.html); [src/app/pages/orcamentos/form-orcamento/form-orcamento.component.html](../src/app/pages/orcamentos/form-orcamento/form-orcamento.component.html); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html); [src/app/pages/pedido/form-pedido/form-pedido.component.html](../src/app/pages/pedido/form-pedido/form-pedido.component.html); [src/app/pages/pedido/pedido-imprimir/etiquetas/imprimir-etiquetas.page.html](../src/app/pages/pedido/pedido-imprimir/etiquetas/imprimir-etiquetas.page.html); [src/app/pages/pedido/pedido-imprimir/imprimir-pedido.page.html](../src/app/pages/pedido/pedido-imprimir/imprimir-pedido.page.html); [src/app/pages/perfil/modal-perfil/perfil-dialog.component.html](../src/app/pages/perfil/modal-perfil/perfil-dialog.component.html); [src/app/pages/pessoas/folha/components/dialog-renegociar-acordos/dialog-renegociar-acordos.component.html](../src/app/pages/pessoas/folha/components/dialog-renegociar-acordos/dialog-renegociar-acordos.component.html); [src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.html](../src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.html); [src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.html](../src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.html); [src/app/pages/site/banners/form-banner/form-banner.component.html](../src/app/pages/site/banners/form-banner/form-banner.component.html); [src/app/pages/site/banners/site-banner-image-upload/site-banner-image-upload.component.html](../src/app/pages/site/banners/site-banner-image-upload/site-banner-image-upload.component.html); [src/app/pages/site/configuracoes/site-configuracoes.component.html](../src/app/pages/site/configuracoes/site-configuracoes.component.html); [src/app/pages/site/paginas/blocos/bloco-image-upload/bloco-image-upload.component.html](../src/app/pages/site/paginas/blocos/bloco-image-upload/bloco-image-upload.component.html); [src/app/pages/site/paginas/blocos/listar-blocos/listar-blocos.component.html](../src/app/pages/site/paginas/blocos/listar-blocos/listar-blocos.component.html); [src/app/pages/site/paginas/form-pagina/form-pagina.component.html](../src/app/pages/site/paginas/form-pagina/form-pagina.component.html); [src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.html](../src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.html); [src/app/pages/storage/components/storage-videos/storage-videos.component.html](../src/app/pages/storage/components/storage-videos/storage-videos.component.html); [src/app/pages/suporte/suporte.component.html](../src/app/pages/suporte/suporte.component.html); [src/app/shared/onboarding/onboarding-tour.component.html](../src/app/shared/onboarding/onboarding-tour.component.html).

### Branches mobile de página — 32 arquivos

[src/app/layouts/full/full.component.html](../src/app/layouts/full/full.component.html); [src/app/pages/ajuda/ajuda.component.html](../src/app/pages/ajuda/ajuda.component.html); [src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html); [src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.html](../src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.html); [src/app/pages/cadastro-tecnico/cores/form-cores/form-cores.component.html](../src/app/pages/cadastro-tecnico/cores/form-cores/form-cores.component.html); [src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html](../src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html); [src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.html](../src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.html); [src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html](../src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html); [src/app/pages/cadastro-tecnico/materiais/form-material/form-material.component.html](../src/app/pages/cadastro-tecnico/materiais/form-material/form-material.component.html); [src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html](../src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html); [src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.html](../src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.html); [src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html](../src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html); [src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html](../src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html); [src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html](../src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html); [src/app/pages/cliente/form-cliente/form-cliente.component.html](../src/app/pages/cliente/form-cliente/form-cliente.component.html); [src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html](../src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html); [src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html](../src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html); [src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html](../src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html); [src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html](../src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html); [src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html](../src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html); [src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html](../src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html); [src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html](../src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html); [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html); [src/app/pages/pedido/form-pedido/form-pedido.component.html](../src/app/pages/pedido/form-pedido/form-pedido.component.html); [src/app/pages/pedido/listar-pedido/listar-pedido.component.html](../src/app/pages/pedido/listar-pedido/listar-pedido.component.html); [src/app/pages/pedido/pedido-imprimir/etiquetas/imprimir-etiquetas.page.html](../src/app/pages/pedido/pedido-imprimir/etiquetas/imprimir-etiquetas.page.html); [src/app/pages/pedido/pedido-imprimir/imprimir-pedido.page.html](../src/app/pages/pedido/pedido-imprimir/imprimir-pedido.page.html); [src/app/pages/site/banners/form-banner/form-banner.component.html](../src/app/pages/site/banners/form-banner/form-banner.component.html); [src/app/pages/site/banners/listar-banners/listar-banners.component.html](../src/app/pages/site/banners/listar-banners/listar-banners.component.html); [src/app/pages/site/paginas/form-pagina/form-pagina.component.html](../src/app/pages/site/paginas/form-pagina/form-pagina.component.html); [src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html](../src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html); [src/app/shared/onboarding/onboarding-tour.component.html](../src/app/shared/onboarding/onboarding-tour.component.html).

### Infraestrutura e convenções transversais

- `LoadingService` / `LoadingInterceptor`: overlay global, `SILENT_REQUEST`, finalize; spec em `interceptors/loading.interceptor.spec.ts`.
- `ErrorMessageInterceptor` e Toastr: apresentação global de mensagens, sem contrato de retry de conteúdo.
- `PermissionGuard`, `TemPermissaoDirective`, `AuthService`: autorização/visibilidade; nenhum componente de permission-state identificado.
- `components/utils/form-errors.util.ts`, `components/validators/require-at-least-one-selected.ts`: validação utilitária, não shell visual.
- `components/dialog/dialog-form-shell.scss`: quatro referências em `produto-selector-dialog`, `grafica-produto-acabamento-dialog`, `biblioteca-dialog` e `calculadora-pisos-contato-orcamento-dialog`.
- `components/shared-components.module.ts` e `material.module.ts`: agregação de imports/exports, não novos padrões de tela.

## Apêndice C — Censo completo de declarações Angular

Foram identificadas **398 declarações reais**, sendo **67 com template inline**. Este censo inclui componentes de rota, dialogs, widgets e exemplos. Classificação FEATURE-SPECIFIC significa manter a composição no respectivo contexto; não certifica maturidade nem sugere extrair toda página. As fichas anteriores cobrem os candidatos estruturais/reutilizáveis.

| Componente | Arquivo | Usos diretos | Specs relacionados | Classificação |
|---|---|---:|---:|---|

| `AppComponent` | [src/app/app.component.ts](../src/app/app.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `BillingBannerComponent` | [src/app/components/billing-banner/billing-banner.component.ts](../src/app/components/billing-banner/billing-banner.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `CardHeaderComponent` | [src/app/components/card-header/card-header.component.ts](../src/app/components/card-header/card-header.component.ts) | 39 | 0 | EVOLVE |

| `ClienteSelectorCardComponent` | [src/app/components/cliente-selector-card/cliente-selector-card.component.ts](../src/app/components/cliente-selector-card/cliente-selector-card.component.ts) | 3 | 0 | FEATURE-SPECIFIC |

| `AppCodeViewComponent` | [src/app/components/code-view/code-view.component.ts](../src/app/components/code-view/code-view.component.ts) | 47 | 0 | FEATURE-SPECIFIC |

| `AppComparativoPedidosComponent` | [src/app/components/dashboard1/comparativo-pedidos/comparativo-pedidos.component.ts](../src/app/components/dashboard1/comparativo-pedidos/comparativo-pedidos.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppCongratulateCardComponent` | [src/app/components/dashboard1/congratulate-card/congratulate-card.component.ts](../src/app/components/dashboard1/congratulate-card/congratulate-card.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppCustomersComponent` | [src/app/components/dashboard1/customers/customers.component.ts](../src/app/components/dashboard1/customers/customers.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppLatestDealsComponent` | [src/app/components/dashboard1/latest-deals/latest-deals.component.ts](../src/app/components/dashboard1/latest-deals/latest-deals.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppLatestReviewsComponent` | [src/app/components/dashboard1/latest-reviews/latest-reviews.component.ts](../src/app/components/dashboard1/latest-reviews/latest-reviews.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppPaymentsComponent` | [src/app/components/dashboard1/payments/payments.component.ts](../src/app/components/dashboard1/payments/payments.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppReceitaResumoComponent` | [src/app/components/dashboard1/receita-resumo/receita-resumo.component.ts](../src/app/components/dashboard1/receita-resumo/receita-resumo.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppStatusGridComponent` | [src/app/components/dashboard1/status-grid/status-grid.component.ts](../src/app/components/dashboard1/status-grid/status-grid.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppTopProjectsComponent` | [src/app/components/dashboard1/top-projects/top-projects.component.ts](../src/app/components/dashboard1/top-projects/top-projects.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppVisitUsaComponent` | [src/app/components/dashboard1/visit-usa/visit-usa.component.ts](../src/app/components/dashboard1/visit-usa/visit-usa.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppBlogCardComponent` | [src/app/components/dashboard2/blog-card/blog-card.component.ts](../src/app/components/dashboard2/blog-card/blog-card.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppNewGoalsComponent` | [src/app/components/dashboard2/new-goals/new-goals.component.ts](../src/app/components/dashboard2/new-goals/new-goals.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppProductSalesComponent` | [src/app/components/dashboard2/product-sales/product-sales.component.ts](../src/app/components/dashboard2/product-sales/product-sales.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppProfileCardComponent` | [src/app/components/dashboard2/profile-card/profile-card.component.ts](../src/app/components/dashboard2/profile-card/profile-card.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppProfileExpanceCpmponent` | [src/app/components/dashboard2/profile-expance/profile-expance.component.ts](../src/app/components/dashboard2/profile-expance/profile-expance.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppTopCardsComponent` | [src/app/components/dashboard2/top-cards/top-cards.component.ts](../src/app/components/dashboard2/top-cards/top-cards.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppTopEmployeesComponent` | [src/app/components/dashboard2/top-employees/top-employees.component.ts](../src/app/components/dashboard2/top-employees/top-employees.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppTrafficDistributionComponent` | [src/app/components/dashboard2/traffic-distribution/traffic-distribution.component.ts](../src/app/components/dashboard2/traffic-distribution/traffic-distribution.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppUpcomingSchedulesComponent` | [src/app/components/dashboard2/upcoming-schedules/upcoming-schedules.component.ts](../src/app/components/dashboard2/upcoming-schedules/upcoming-schedules.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppWelcomeCardComponent` | [src/app/components/dashboard2/welcome-card/welcome-card.component.ts](../src/app/components/dashboard2/welcome-card/welcome-card.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `DataTableComponent` | [src/app/components/data-table/data-table.component.ts](../src/app/components/data-table/data-table.component.ts) | 8 | 1 | EVOLVE |

| `AcabamentoVariacaoDialogComponent` | [src/app/components/dialog/acabamento-variacao-dialog/acabamento-variacao-dialog.component.ts](../src/app/components/dialog/acabamento-variacao-dialog/acabamento-variacao-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AcabamentoVariacaoEditarDialogComponent` | [src/app/components/dialog/acabamento-variacao-editar-dialog/acabamento-variacao-editar-dialog.component.ts](../src/app/components/dialog/acabamento-variacao-editar-dialog/acabamento-variacao-editar-dialog.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ConfirmDialogComponent` | [src/app/components/dialog/confirm-dialog/confirm-dialog.component.ts](../src/app/components/dialog/confirm-dialog/confirm-dialog.component.ts) | 48 | 0 | EVOLVE |

| `VariacaoDetalheDialogComponent` | [src/app/components/dialog/variacao-detalhe-dialog/variacao-detalhe-dialog.component.ts](../src/app/components/dialog/variacao-detalhe-dialog/variacao-detalhe-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `VariacaoEditarDialogComponent` | [src/app/components/dialog/variacao-editar-dialog/variacao-editar-dialog.component.ts](../src/app/components/dialog/variacao-editar-dialog/variacao-editar-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `DualListTransferComponent` | [src/app/components/dual-list-transfer/dual-list-transfer.component.ts](../src/app/components/dual-list-transfer/dual-list-transfer.component.ts) | 1 | 1 | KEEP |

| `EnderecoFormComponent` | [src/app/components/endereco-form/endereco-form.component.ts](../src/app/components/endereco-form/endereco-form.component.ts) | 2 | 0 | FEATURE-SPECIFIC |

| `FiltroPesquisaCardComponent` | [src/app/components/filtro-pesquisa-card/filtro-pesquisa-card.component.ts](../src/app/components/filtro-pesquisa-card/filtro-pesquisa-card.component.ts) | 2 | 0 | MIGRATE → DEPRECATE |

| `HierarchyTreeComponent` | [src/app/components/hierarchy-tree/hierarchy-tree.component.ts](../src/app/components/hierarchy-tree/hierarchy-tree.component.ts) | 2 | 0 | KEEP |

| `AutoCompleteComponent` | [src/app/components/inputs/auto-complete/auto-complete.component.ts](../src/app/components/inputs/auto-complete/auto-complete.component.ts) | 5 | 0 | KEEP |

| `InputCepComponent` | [src/app/components/inputs/input-cep/input-cep.component.ts](../src/app/components/inputs/input-cep/input-cep.component.ts) | 3 | 0 | KEEP |

| `InputDataComponent` | [src/app/components/inputs/input-data/input-data.component.ts](../src/app/components/inputs/input-data/input-data.component.ts) | 3 | 0 | KEEP |

| `InputDocumentoComponent` | [src/app/components/inputs/input-documento/input-documento.component.ts](../src/app/components/inputs/input-documento/input-documento.component.ts) | 3 | 0 | KEEP |

| `InputEmailComponent` | [src/app/components/inputs/input-email/input-custom.component.ts](../src/app/components/inputs/input-email/input-custom.component.ts) | 7 | 0 | KEEP |

| `InputMoedaComponent` | [src/app/components/inputs/input-moeda/input-moeda.component.ts](../src/app/components/inputs/input-moeda/input-moeda.component.ts) | 12 | 0 | KEEP |

| `InputMultiSelectComponent` | [src/app/components/inputs/input-multi-select/input-multi-select-component.ts](../src/app/components/inputs/input-multi-select/input-multi-select-component.ts) | 4 | 0 | KEEP |

| `InputNumericoComponent` | [src/app/components/inputs/input-numerico/input-numerico.component.ts](../src/app/components/inputs/input-numerico/input-numerico.component.ts) | 13 | 0 | KEEP |

| `InputOptionsComponent` | [src/app/components/inputs/input-options/input-options.component.ts](../src/app/components/inputs/input-options/input-options.component.ts) | 21 | 1 | KEEP |

| `InputPesquisaComponent` | [src/app/components/inputs/input-pesquisa/input-pesquisa.component.ts](../src/app/components/inputs/input-pesquisa/input-pesquisa.component.ts) | 17 | 0 | EVOLVE |

| `InputTelefoneComponent` | [src/app/components/inputs/input-telefone/input-telefone.component.ts](../src/app/components/inputs/input-telefone/input-telefone.component.ts) | 8 | 0 | KEEP |

| `InputTextareaComponent` | [src/app/components/inputs/input-text/input-textarea.component.ts](../src/app/components/inputs/input-text/input-textarea.component.ts) | 0 | 0 | DEPRECATE proposto |

| `InputTextareaComponent` | [src/app/components/inputs/input-textarea/input-textarea.component.ts](../src/app/components/inputs/input-textarea/input-textarea.component.ts) | 25 | 0 | KEEP |

| `InputTextoRestritoComponent` | [src/app/components/inputs/input-texto/input-texto-restrito.component.ts](../src/app/components/inputs/input-texto/input-texto-restrito.component.ts) | 36 | 0 | KEEP |

| `InputUnidadeMedidaComponent` | [src/app/components/inputs/input-unidade-medida/input-unidade-medida.component.ts](../src/app/components/inputs/input-unidade-medida/input-unidade-medida.component.ts) | 1 | 0 | KEEP |

| `UnitInputComponent` | [src/app/components/inputs/unit-input/unit-input.component.ts](../src/app/components/inputs/unit-input/unit-input.component.ts) | 4 | 1 | KEEP |

| `ItensPedidoSectionComponent` | [src/app/components/itens-pedido-section/itens-pedido-section.component.ts](../src/app/components/itens-pedido-section/itens-pedido-section.component.ts) | 4 | 1 | FEATURE-SPECIFIC |

| `ListFilterBarComponent` | [src/app/components/list-filter-bar/list-filter-bar.component.ts](../src/app/components/list-filter-bar/list-filter-bar.component.ts) | 1 | 0 | CONSOLIDATE |

| `ManualLinkComponent` | [src/app/components/manual-link/manual-link.component.ts](../src/app/components/manual-link/manual-link.component.ts) | 2 | 0 | KEEP |

| `MetricCardComponent` | [src/app/components/metric-card/metric-card.component.ts](../src/app/components/metric-card/metric-card.component.ts) | 5 | 0 | KEEP |

| `MobileFabActionComponent` | [src/app/components/mobile-fab-action/mobile-fab-action.component.ts](../src/app/components/mobile-fab-action/mobile-fab-action.component.ts) | 12 | 0 | EVOLVE |

| `MobilePageHeaderComponent` | [src/app/components/mobile-page-header/mobile-page-header.component.ts](../src/app/components/mobile-page-header/mobile-page-header.component.ts) | 0 | 0 | CONSOLIDATE |

| `MobileSheetHeaderComponent` | [src/app/components/mobile-sheet-header/mobile-sheet-header.component.ts](../src/app/components/mobile-sheet-header/mobile-sheet-header.component.ts) | 1 | 0 | KEEP |

| `MobileSummarySheetComponent` | [src/app/components/mobile-summary-sheet/mobile-summary-sheet.component.ts](../src/app/components/mobile-summary-sheet/mobile-summary-sheet.component.ts) | 3 | 0 | EVOLVE |

| `MobileTotalBarComponent` | [src/app/components/mobile-total-bar/mobile-total-bar.component.ts](../src/app/components/mobile-total-bar/mobile-total-bar.component.ts) | 21 | 0 | CONSOLIDATE |

| `ObservacoesCardComponent` | [src/app/components/observacoes-card/observacoes-card.component.ts](../src/app/components/observacoes-card/observacoes-card.component.ts) | 4 | 0 | FEATURE-SPECIFIC |

| `OnboardingSelectionStepComponent` | [src/app/components/onboarding/onboarding-selection-step.component.ts](../src/app/components/onboarding/onboarding-selection-step.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `OnboardingShellComponent` | [src/app/components/onboarding/onboarding-shell.component.ts](../src/app/components/onboarding/onboarding-shell.component.ts) | 4 | 0 | FEATURE-SPECIFIC |

| `OnboardingWizardComponent` | [src/app/components/onboarding/onboarding-wizard.component.ts](../src/app/components/onboarding/onboarding-wizard.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `PagamentosSectionComponent` | [src/app/components/pagamentos-section/pagamentos-section.component.ts](../src/app/components/pagamentos-section/pagamentos-section.component.ts) | 2 | 0 | FEATURE-SPECIFIC |

| `PageCardComponent` | [src/app/components/page-card/page-card.component.ts](../src/app/components/page-card/page-card.component.ts) | 58 | 1 | EVOLVE |

| `PedidoFluxoControlesComponent` | [src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.ts](../src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component.ts) | 2 | 0 | FEATURE-SPECIFIC |

| `PedidoTrocarStatusDialogComponent` | [src/app/components/pedido-fluxo-controles/pedido-trocar-status-dialog.component.ts](../src/app/components/pedido-fluxo-controles/pedido-trocar-status-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `PedidoInfoCardComponent` | [src/app/components/pedido-info-card/pedido-info-card.component.ts](../src/app/components/pedido-info-card/pedido-info-card.component.ts) | 2 | 0 | FEATURE-SPECIFIC |

| `PedidoTabelaComponent` | [src/app/components/pedido-tabela/pedido-tabela.component.ts](../src/app/components/pedido-tabela/pedido-tabela.component.ts) | 1 | 0 | MIGRATE (estrutura); FEATURE-SPECIFIC (domínio) |

| `PrecoSelectorComponent` | [src/app/components/preco/preco-selector.component.ts](../src/app/components/preco/preco-selector.component.ts) | 10 | 0 | FEATURE-SPECIFIC |

| `PricingCardComponent` | [src/app/components/pricing-card/pricing-card.component.ts](../src/app/components/pricing-card/pricing-card.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `ProductIdentityComponent` | [src/app/components/product-identity/product-identity.component.ts](../src/app/components/product-identity/product-identity.component.ts) | 1 | 1 | FEATURE-SPECIFIC |

| `ProdutoSelectorDialogComponent` | [src/app/components/produto-selector/produto-selector-dialog.component.ts](../src/app/components/produto-selector/produto-selector-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `ProdutoSelectorComponent` | [src/app/components/produto-selector/produto-selector.component.ts](../src/app/components/produto-selector/produto-selector.component.ts) | 1 | 1 | FEATURE-SPECIFIC |

| `ResumoFinanceiroCardComponent` | [src/app/components/resumo-financeiro-card/resumo-financeiro-card.component.ts](../src/app/components/resumo-financeiro-card/resumo-financeiro-card.component.ts) | 2 | 0 | FEATURE-SPECIFIC |

| `RichTextEditorComponent` | [src/app/components/rich-text-editor/rich-text-editor.component.ts](../src/app/components/rich-text-editor/rich-text-editor.component.ts) | 4 | 0 | KEEP |

| `RichTextPreviewFieldComponent` | [src/app/components/rich-text-preview-field/rich-text-preview-field.component.ts](../src/app/components/rich-text-preview-field/rich-text-preview-field.component.ts) | 1 | 0 | KEEP |

| `SectionCardComponent` | [src/app/components/section-card/section-card.component.ts](../src/app/components/section-card/section-card.component.ts) | 75 | 0 | KEEP |

| `SetupProgressComponent` | [src/app/components/setup-progress/setup-progress.component.ts](../src/app/components/setup-progress/setup-progress.component.ts) | 2 | 0 | FEATURE-SPECIFIC |

| `StatusBadgeComponent` | [src/app/components/status-badge/status-badge.component.ts](../src/app/components/status-badge/status-badge.component.ts) | 18 | 0 | FEATURE-SPECIFIC |

| `StatusFilterComponent` | [src/app/components/status-filter/status-filter.component.ts](../src/app/components/status-filter/status-filter.component.ts) | 0 | 0 | CONSOLIDATE |

| `ListarProdutosComponent` | [src/app/components/tabela/listar-produtos.component.ts](../src/app/components/tabela/listar-produtos.component.ts) | 0 | 0 | FEATURE-SPECIFIC; DEPRECATE condicional |

| `TabelaGenericaComponent` | [src/app/components/tabela-generica/tabela-generica.component.ts](../src/app/components/tabela-generica/tabela-generica.component.ts) | 0 | 0 | DEPRECATE proposto |

| `TabsSectionCardComponent` | [src/app/components/tabs-section-card/tabs-section-card.component.ts](../src/app/components/tabs-section-card/tabs-section-card.component.ts) | 0 | 0 | DEPRECATE proposto |

| `BlankComponent` | [src/app/layouts/blank/blank.component.ts](../src/app/layouts/blank/blank.component.ts) | 0 | 0 | KEEP |

| `FullComponent` | [src/app/layouts/full/full.component.ts](../src/app/layouts/full/full.component.ts) | 0 | 0 | EVOLVE |

| `AppBreadcrumbComponent` | [src/app/layouts/full/shared/breadcrumb/breadcrumb.component.ts](../src/app/layouts/full/shared/breadcrumb/breadcrumb.component.ts) | 1 | 0 | KEEP |

| `CustomizerComponent` | [src/app/layouts/full/shared/customizer/customizer.component.ts](../src/app/layouts/full/shared/customizer/customizer.component.ts) | 1 | 0 | KEEP |

| `HeaderComponent` | [src/app/layouts/full/vertical/header/header.component.ts](../src/app/layouts/full/vertical/header/header.component.ts) | 1 | 0 | KEEP |

| `BrandingComponent` | [src/app/layouts/full/vertical/sidebar/branding.component.ts](../src/app/layouts/full/vertical/sidebar/branding.component.ts) | 13 | 0 | KEEP |

| `AppNavItemComponent` | [src/app/layouts/full/vertical/sidebar/nav-item/nav-item.component.ts](../src/app/layouts/full/vertical/sidebar/nav-item/nav-item.component.ts) | 2 | 0 | KEEP |

| `SidebarComponent` | [src/app/layouts/full/vertical/sidebar/sidebar.component.ts](../src/app/layouts/full/vertical/sidebar/sidebar.component.ts) | 1 | 0 | KEEP |

| `PrintComponent` | [src/app/layouts/print/print.component.ts](../src/app/layouts/print/print.component.ts) | 0 | 0 | KEEP |

| `AjudaComponent` | [src/app/pages/ajuda/ajuda.component.ts](../src/app/pages/ajuda/ajuda.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppBlogsComponent` | [src/app/pages/apps/blogs/blogs.component.ts](../src/app/pages/apps/blogs/blogs.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppBlogDetailsComponent` | [src/app/pages/apps/blogs/details/details.component.ts](../src/app/pages/apps/blogs/details/details.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `CalculadoraPisosContatoOrcamentoDialogComponent` | [src/app/pages/apps/calculadoras/pisos/calculadora-pisos-contato-orcamento-dialog.component.ts](../src/app/pages/apps/calculadoras/pisos/calculadora-pisos-contato-orcamento-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `CalculadoraPisosComponent` | [src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.ts](../src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `AppChatComponent` | [src/app/pages/apps/chat/chat.component.ts](../src/app/pages/apps/chat/chat.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppContactDialogContentComponent` | [src/app/pages/apps/contact/contact.component.ts](../src/app/pages/apps/contact/contact.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ContactFormDialogComponent` | [src/app/pages/apps/contact-list/contact-form-dialog/contact-form-dialog.component.ts](../src/app/pages/apps/contact-list/contact-form-dialog/contact-form-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppContactListComponent` | [src/app/pages/apps/contact-list/contact-list.component.ts](../src/app/pages/apps/contact-list/contact-list.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppDeleteDialogComponent` | [src/app/pages/apps/contact-list/delete-dialog/delete-dialog.component.ts](../src/app/pages/apps/contact-list/delete-dialog/delete-dialog.component.ts) | 2 | 0 | FEATURE-SPECIFIC |

| `AppContactListDetailComponent` | [src/app/pages/apps/contact-list/detail/detail.component.ts](../src/app/pages/apps/contact-list/detail/detail.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppListingComponent` | [src/app/pages/apps/contact-list/listing/listing.component.ts](../src/app/pages/apps/contact-list/listing/listing.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppCourseDetailComponent` | [src/app/pages/apps/courses/course-detail/course-detail.component.ts](../src/app/pages/apps/courses/course-detail/course-detail.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppCoursesComponent` | [src/app/pages/apps/courses/courses.component.ts](../src/app/pages/apps/courses/courses.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `DetailComponent` | [src/app/pages/apps/email/detail/detail.component.ts](../src/app/pages/apps/email/detail/detail.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppEmailComponent` | [src/app/pages/apps/email/email.component.ts](../src/app/pages/apps/email/email.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListingDialogDataExampleDialogComponent` | [src/app/pages/apps/email/listing/listing.component.ts](../src/app/pages/apps/email/listing/listing.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListingComponent` | [src/app/pages/apps/email/listing/listing.component.ts](../src/app/pages/apps/email/listing/listing.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppAddEmployeeComponent` | [src/app/pages/apps/employee/add/add.component.ts](../src/app/pages/apps/employee/add/add.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppEmployeeDialogContentComponent` | [src/app/pages/apps/employee/employee.component.ts](../src/app/pages/apps/employee/employee.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FiscalConfiguracoesComponent` | [src/app/pages/apps/fiscal/configuracoes/fiscal-configuracoes.component.ts](../src/app/pages/apps/fiscal/configuracoes/fiscal-configuracoes.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FiscalDocumentoDetalheComponent` | [src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts](../src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FiscalDocumentosComponent` | [src/app/pages/apps/fiscal/documentos/fiscal-documentos.component.ts](../src/app/pages/apps/fiscal/documentos/fiscal-documentos.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FiscalEmitirComponent` | [src/app/pages/apps/fiscal/emitir/fiscal-emitir.component.ts](../src/app/pages/apps/fiscal/emitir/fiscal-emitir.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FiscalInutilizacoesComponent` | [src/app/pages/apps/fiscal/inutilizacoes/fiscal-inutilizacoes.component.ts](../src/app/pages/apps/fiscal/inutilizacoes/fiscal-inutilizacoes.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FiscalProdutosComponent` | [src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts](../src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FiscalRegrasComponent` | [src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts](../src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `CalendarFormDialogComponent` | [src/app/pages/apps/fullcalendar/calendar-form-dialog/calendar-form-dialog.component.ts](../src/app/pages/apps/fullcalendar/calendar-form-dialog/calendar-form-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `CalendarDialogComponent` | [src/app/pages/apps/fullcalendar/fullcalendar.component.ts](../src/app/pages/apps/fullcalendar/fullcalendar.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppFullcalendarComponent` | [src/app/pages/apps/fullcalendar/fullcalendar.component.ts](../src/app/pages/apps/fullcalendar/fullcalendar.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppAddInvoiceComponent` | [src/app/pages/apps/invoice/add-invoice/add-invoice.component.ts](../src/app/pages/apps/invoice/add-invoice/add-invoice.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AddedDialogComponent` | [src/app/pages/apps/invoice/add-invoice/added-dialog/added-dialog.component.ts](../src/app/pages/apps/invoice/add-invoice/added-dialog/added-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppEditInvoiceComponent` | [src/app/pages/apps/invoice/edit-invoice/edit-invoice.component.ts](../src/app/pages/apps/invoice/edit-invoice/edit-invoice.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `OkDialogComponent` | [src/app/pages/apps/invoice/edit-invoice/ok-dialog/ok-dialog.component.ts](../src/app/pages/apps/invoice/edit-invoice/ok-dialog/ok-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppConfirmDeleteDialogComponent` | [src/app/pages/apps/invoice/invoice-list/confirm-delete-dialog.component.ts](../src/app/pages/apps/invoice/invoice-list/confirm-delete-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppInvoiceListComponent` | [src/app/pages/apps/invoice/invoice-list/invoice-list.component.ts](../src/app/pages/apps/invoice/invoice-list/invoice-list.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppInvoiceViewComponent` | [src/app/pages/apps/invoice/invoice-view/invoice-view.component.ts](../src/app/pages/apps/invoice/invoice-view/invoice-view.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppDeleteDialogComponent` | [src/app/pages/apps/kanban/delete-dialog/delete-dialog.component.ts](../src/app/pages/apps/kanban/delete-dialog/delete-dialog.component.ts) | 2 | 0 | FEATURE-SPECIFIC |

| `AppKanbanDialogComponent` | [src/app/pages/apps/kanban/kanban-dialog.component.ts](../src/app/pages/apps/kanban/kanban-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppKanbanComponent` | [src/app/pages/apps/kanban/kanban.component.ts](../src/app/pages/apps/kanban/kanban.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppOkDialogComponent` | [src/app/pages/apps/kanban/ok-dialog/ok-dialog.component.ts](../src/app/pages/apps/kanban/ok-dialog/ok-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppNotesComponent` | [src/app/pages/apps/notes/notes.component.ts](../src/app/pages/apps/notes/notes.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppPermissionComponent` | [src/app/pages/apps/permission/permission.component.ts](../src/app/pages/apps/permission/permission.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ConfirmRascunhoDialog` | [src/app/pages/apps/smart-calc/confirm-rascunho.dialog.ts](../src/app/pages/apps/smart-calc/confirm-rascunho.dialog.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `SmartCalcComponent` | [src/app/pages/apps/smart-calc/smart-calc.component.ts](../src/app/pages/apps/smart-calc/smart-calc.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppTaskComponent` | [src/app/pages/apps/task/task.component.ts](../src/app/pages/apps/task/task.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `AppTicketlistComponent` | [src/app/pages/apps/tickets/tickets.component.ts](../src/app/pages/apps/tickets/tickets.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `TicketDialogComponent` | [src/app/pages/apps/tickets/tickets.component.ts](../src/app/pages/apps/tickets/tickets.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppTodoComponent` | [src/app/pages/apps/todo/todo.component.ts](../src/app/pages/apps/todo/todo.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppBoxedForgotPasswordComponent` | [src/app/pages/authentication/boxed-forgot-password/boxed-forgot-password.component.ts](../src/app/pages/authentication/boxed-forgot-password/boxed-forgot-password.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppBoxedLoginComponent` | [src/app/pages/authentication/boxed-login/boxed-login.component.ts](../src/app/pages/authentication/boxed-login/boxed-login.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppBoxedRegisterComponent` | [src/app/pages/authentication/boxed-register/boxed-register.component.ts](../src/app/pages/authentication/boxed-register/boxed-register.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppBoxedResetPasswordComponent` | [src/app/pages/authentication/boxed-reset-password/boxed-reset-password.component.ts](../src/app/pages/authentication/boxed-reset-password/boxed-reset-password.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppBoxedTwoStepsComponent` | [src/app/pages/authentication/boxed-two-steps/boxed-two-steps.component.ts](../src/app/pages/authentication/boxed-two-steps/boxed-two-steps.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppCadastroConcluidoComponent` | [src/app/pages/authentication/cadastro-concluido/cadastro-concluido.component.ts](../src/app/pages/authentication/cadastro-concluido/cadastro-concluido.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppErrorComponent` | [src/app/pages/authentication/error/error.component.ts](../src/app/pages/authentication/error/error.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppMaintenanceComponent` | [src/app/pages/authentication/maintenance/maintenance.component.ts](../src/app/pages/authentication/maintenance/maintenance.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppSideForgotPasswordComponent` | [src/app/pages/authentication/side-forgot-password/side-forgot-password.component.ts](../src/app/pages/authentication/side-forgot-password/side-forgot-password.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppSideLoginComponent` | [src/app/pages/authentication/side-login/side-login.component.ts](../src/app/pages/authentication/side-login/side-login.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppSideRegisterComponent` | [src/app/pages/authentication/side-register/side-register.component.ts](../src/app/pages/authentication/side-register/side-register.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppSideTwoStepsComponent` | [src/app/pages/authentication/side-two-steps/side-two-steps.component.ts](../src/app/pages/authentication/side-two-steps/side-two-steps.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `BillingBlockedComponent` | [src/app/pages/billing/billing-blocked/billing-blocked.component.ts](../src/app/pages/billing/billing-blocked/billing-blocked.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `BillingConfirmationComponent` | [src/app/pages/billing/billing-confirmation/billing-confirmation.component.ts](../src/app/pages/billing/billing-confirmation/billing-confirmation.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `BillingPagamentoComponent` | [src/app/pages/billing/billing-pagamento/billing-pagamento.component.ts](../src/app/pages/billing/billing-pagamento/billing-pagamento.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `BillingPayComponent` | [src/app/pages/billing/billing-pay/billing-pay.component.ts](../src/app/pages/billing/billing-pay/billing-pay.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `BillingReturnComponent` | [src/app/pages/billing/billing-return/billing-return.component.ts](../src/app/pages/billing/billing-return/billing-return.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `MinhaAssinaturaComponent` | [src/app/pages/billing/minha-assinatura/minha-assinatura.component.ts](../src/app/pages/billing/minha-assinatura/minha-assinatura.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FormAcabamentoComponent` | [src/app/pages/cadastro-tecnico/acabamentos/form-acabamento/form-acabamento.component.ts](../src/app/pages/cadastro-tecnico/acabamentos/form-acabamento/form-acabamento.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListarAcabamentoComponent` | [src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.ts](../src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `VariacoesAcabamentoComponent` | [src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.ts](../src/app/pages/cadastro-tecnico/acabamentos/variacoes-acabamento/variacoes-acabamento.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `FormCoresComponent` | [src/app/pages/cadastro-tecnico/cores/form-cores/form-cores.component.ts](../src/app/pages/cadastro-tecnico/cores/form-cores/form-cores.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListarCoresComponent` | [src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.ts](../src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FormFormatoComponent` | [src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.ts](../src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListarFormatoComponent` | [src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.ts](../src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FormMaterialComponent` | [src/app/pages/cadastro-tecnico/materiais/form-material/form-material.component.ts](../src/app/pages/cadastro-tecnico/materiais/form-material/form-material.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListarMaterialComponent` | [src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.ts](../src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ProdutoCalculadoraMateriaisTabComponent` | [src/app/pages/cadastro-tecnico/produtos/form-produto/calculadora-materiais/produto-calculadora-materiais-tab.component.ts](../src/app/pages/cadastro-tecnico/produtos/form-produto/calculadora-materiais/produto-calculadora-materiais-tab.component.ts) | 2 | 1 | FEATURE-SPECIFIC |

| `FormProdutoComponent` | [src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.ts](../src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `PoliticaRevendaComponent` | [src/app/pages/cadastro-tecnico/produtos/form-produto/politica-revenda/politica-revenda.component.ts](../src/app/pages/cadastro-tecnico/produtos/form-produto/politica-revenda/politica-revenda.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `VariacoesProdutoComponent` | [src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.ts](../src/app/pages/cadastro-tecnico/produtos/form-produto/variacoes-produto/variacoes-produto.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `ListarProdutosComponent` | [src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.ts](../src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FormServicoComponent` | [src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.ts](../src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListarServicoComponent` | [src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.ts](../src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `CalculadoraMateriaisComponent` | [src/app/pages/calculadora-materiais/calculadora-materiais.component.ts](../src/app/pages/calculadora-materiais/calculadora-materiais.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `CatalogoCaracteristicasComponent` | [src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `CatalogoCategoriaCaracteristicasComponent` | [src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `CatalogoCaracteristicaDialogComponent` | [src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `CatalogoCategoriaFormComponent` | [src/app/pages/catalogo/categorias/catalogo-categoria-form.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-form.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `CatalogoCategoriaListComponent` | [src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `CatalogoMarcaFormComponent` | [src/app/pages/catalogo/marcas/catalogo-marca-form.component.ts](../src/app/pages/catalogo/marcas/catalogo-marca-form.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `CatalogoMarcaListComponent` | [src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts](../src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `CatalogoProdutoDetailComponent` | [src/app/pages/catalogo/produtos/catalogo-produto-detail.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-detail.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `CatalogoProdutoFormComponent` | [src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `CatalogoProdutoListComponent` | [src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `CatalogoProdutoCaracteristicasComponent` | [src/app/pages/catalogo/shared/components/catalogo-produto-caracteristicas.component.ts](../src/app/pages/catalogo/shared/components/catalogo-produto-caracteristicas.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `CatalogoStatusChipComponent` | [src/app/pages/catalogo/shared/components/catalogo-status-chip.component.ts](../src/app/pages/catalogo/shared/components/catalogo-status-chip.component.ts) | 6 | 0 | FEATURE-SPECIFIC |

| `AppAreaChartComponent` | [src/app/pages/charts/area/area.component.ts](../src/app/pages/charts/area/area.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppCandlestickChartComponent` | [src/app/pages/charts/candlestick/candlestick.component.ts](../src/app/pages/charts/candlestick/candlestick.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppColumnChartComponent` | [src/app/pages/charts/column/column.component.ts](../src/app/pages/charts/column/column.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppDoughnutpieChartComponent` | [src/app/pages/charts/doughnut-pie/doughnut-pie.component.ts](../src/app/pages/charts/doughnut-pie/doughnut-pie.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppGredientChartComponent` | [src/app/pages/charts/gredient/gredient.component.ts](../src/app/pages/charts/gredient/gredient.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppLineChartComponent` | [src/app/pages/charts/line/line.component.ts](../src/app/pages/charts/line/line.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppRadialRadarChartComponent` | [src/app/pages/charts/radial-radar/radial-radar.component.ts](../src/app/pages/charts/radial-radar/radial-radar.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ClickTvMidiaPreviewDialogComponent` | [src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts](../src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `ClickTvUploadDialogComponent` | [src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts](../src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `ClickTvNameDialogComponent` | [src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts](../src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts) | 2 | 0 | FEATURE-SPECIFIC |

| `ClickTvPlaylistDialogComponent` | [src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts](../src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `ClickTvTelaDialogComponent` | [src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts](../src/app/pages/clicktv/components/dialogs/clicktv-dialogs.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `ClickTvMidiasComponent` | [src/app/pages/clicktv/components/midias/clicktv-midias.component.ts](../src/app/pages/clicktv/components/midias/clicktv-midias.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ClickTvPlaylistEditorComponent` | [src/app/pages/clicktv/components/playlist-editor/clicktv-playlist-editor.component.ts](../src/app/pages/clicktv/components/playlist-editor/clicktv-playlist-editor.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ClickTvPlaylistsComponent` | [src/app/pages/clicktv/components/playlists/clicktv-playlists.component.ts](../src/app/pages/clicktv/components/playlists/clicktv-playlists.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ClickTvTelasComponent` | [src/app/pages/clicktv/components/telas/clicktv-telas.component.ts](../src/app/pages/clicktv/components/telas/clicktv-telas.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ClienteCreateDialogComponent` | [src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component.ts](../src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component.ts) | 2 | 0 | FEATURE-SPECIFIC |

| `FormClienteComponent` | [src/app/pages/cliente/form-cliente/form-cliente.component.ts](../src/app/pages/cliente/form-cliente/form-cliente.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListarClienteComponent` | [src/app/pages/cliente/listar-cliente/listar-cliente.component.ts](../src/app/pages/cliente/listar-cliente/listar-cliente.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AplicativosAtalhosComponent` | [src/app/pages/config/aplicativos-atalhos/aplicativos-atalhos.component.ts](../src/app/pages/config/aplicativos-atalhos/aplicativos-atalhos.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `EmailServidorTesteDialogComponent` | [src/app/pages/config/email-servidor/email-servidor-teste-dialog.component.ts](../src/app/pages/config/email-servidor/email-servidor-teste-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `EmailServidorComponent` | [src/app/pages/config/email-servidor/email-servidor.component.ts](../src/app/pages/config/email-servidor/email-servidor.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FolhaConfigComponent` | [src/app/pages/config/folha-config/folha-config.component.ts](../src/app/pages/config/folha-config/folha-config.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `PresencaPublicaComponent` | [src/app/pages/config/presenca-publica/presenca-publica.component.ts](../src/app/pages/config/presenca-publica/presenca-publica.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `AppDashboardChartViewComponent` | [src/app/pages/dashboards/dashboard-chart-view/dashboard-chart-view.component.ts](../src/app/pages/dashboards/dashboard-chart-view/dashboard-chart-view.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppDashboard1Component` | [src/app/pages/dashboards/dashboard1/dashboard1.component.ts](../src/app/pages/dashboards/dashboard1/dashboard1.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppDashboard2Component` | [src/app/pages/dashboards/dashboard2/dashboard2.component.ts](../src/app/pages/dashboards/dashboard2/dashboard2.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppAddKichenSinkComponent` | [src/app/pages/datatable/kichen-sink/add/add.component.ts](../src/app/pages/datatable/kichen-sink/add/add.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppKichenSinkDialogContentComponent` | [src/app/pages/datatable/kichen-sink/kichen-sink.component.ts](../src/app/pages/datatable/kichen-sink/kichen-sink.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `DemoHomeComponent` | [src/app/pages/demo/demo-home.component.ts](../src/app/pages/demo/demo-home.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `DemoPedidoComponent` | [src/app/pages/demo/demo-pedido.component.ts](../src/app/pages/demo/demo-pedido.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `DemoShellComponent` | [src/app/pages/demo/demo-shell.component.ts](../src/app/pages/demo/demo-shell.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `DemoSmartcalcComponent` | [src/app/pages/demo/demo-smartcalc.component.ts](../src/app/pages/demo/demo-smartcalc.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `DemoWhatsappComponent` | [src/app/pages/demo/demo-whatsapp.component.ts](../src/app/pages/demo/demo-whatsapp.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FormCategoriaDepositoComponent` | [src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.ts](../src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListarCategoriasDepositoComponent` | [src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.ts](../src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `DepositoImagemGaleriaComponent` | [src/app/pages/deposito/components/deposito-imagem-galeria/deposito-imagem-galeria.component.ts](../src/app/pages/deposito/components/deposito-imagem-galeria/deposito-imagem-galeria.component.ts) | 3 | 0 | FEATURE-SPECIFIC |

| `DepositoImagemUploadComponent` | [src/app/pages/deposito/components/deposito-imagem-upload/deposito-imagem-upload.component.ts](../src/app/pages/deposito/components/deposito-imagem-upload/deposito-imagem-upload.component.ts) | 3 | 0 | FEATURE-SPECIFIC |

| `ListaDinamicaInputComponent` | [src/app/pages/deposito/components/lista-dinamica-input/lista-dinamica-input.component.ts](../src/app/pages/deposito/components/lista-dinamica-input/lista-dinamica-input.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `DepositoDashboardPageComponent` | [src/app/pages/deposito/dashboard/deposito-dashboard-page.component.ts](../src/app/pages/deposito/dashboard/deposito-dashboard-page.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FormItemDepositoComponent` | [src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.ts](../src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListarItensDepositoComponent` | [src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.ts](../src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FormMarcaDepositoComponent` | [src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.ts](../src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListarMarcasDepositoComponent` | [src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.ts](../src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `EmpresaFormComponent` | [src/app/pages/empresa/empresa-form.component.ts](../src/app/pages/empresa/empresa-form.component.ts) | 2 | 1 | FEATURE-SPECIFIC |

| `AppAutocompleteComponent` | [src/app/pages/forms/form-elements/autocomplete/autocomplete.component.ts](../src/app/pages/forms/form-elements/autocomplete/autocomplete.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppButtonComponent` | [src/app/pages/forms/form-elements/button/button.component.ts](../src/app/pages/forms/form-elements/button/button.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppCheckboxComponent` | [src/app/pages/forms/form-elements/checkbox/checkbox.component.ts](../src/app/pages/forms/form-elements/checkbox/checkbox.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppDatepickerComponent` | [src/app/pages/forms/form-elements/datepicker/datepicker.component.ts](../src/app/pages/forms/form-elements/datepicker/datepicker.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppRadioComponent` | [src/app/pages/forms/form-elements/radio/radio.component.ts](../src/app/pages/forms/form-elements/radio/radio.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppFormHorizontalComponent` | [src/app/pages/forms/form-horizontal/form-horizontal.component.ts](../src/app/pages/forms/form-horizontal/form-horizontal.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppFormLayoutsComponent` | [src/app/pages/forms/form-layouts/form-layouts.component.ts](../src/app/pages/forms/form-layouts/form-layouts.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppFormToastrComponent` | [src/app/pages/forms/form-toastr/form-toastr.component.ts](../src/app/pages/forms/form-toastr/form-toastr.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppFormVerticalComponent` | [src/app/pages/forms/form-vertical/form-vertical.component.ts](../src/app/pages/forms/form-vertical/form-vertical.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppFormWizardComponent` | [src/app/pages/forms/form-wizard/form-wizard.component.ts](../src/app/pages/forms/form-wizard/form-wizard.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `DialogMotivoStatusComponent` | [src/app/pages/funcionarios/components/dialog-motivo-status/dialog-motivo-status.component.ts](../src/app/pages/funcionarios/components/dialog-motivo-status/dialog-motivo-status.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `DetalheFuncionarioComponent` | [src/app/pages/funcionarios/detalhe-funcionario/detalhe-funcionario.component.ts](../src/app/pages/funcionarios/detalhe-funcionario/detalhe-funcionario.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FormFuncionarioComponent` | [src/app/pages/funcionarios/form-funcionario/form-funcionario.component.ts](../src/app/pages/funcionarios/form-funcionario/form-funcionario.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListarFuncionariosComponent` | [src/app/pages/funcionarios/listar-funcionarios/listar-funcionarios.component.ts](../src/app/pages/funcionarios/listar-funcionarios/listar-funcionarios.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `BibliotecaProdutosSelectorComponent` | [src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.ts](../src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.ts) | 2 | 2 | FEATURE-SPECIFIC |

| `GraficaCadastroListComponent` | [src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts](../src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `GraficaCategoriaFormComponent` | [src/app/pages/grafica/categorias/grafica-categoria-form.component.ts](../src/app/pages/grafica/categorias/grafica-categoria-form.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `GraficaCategoriasComponent` | [src/app/pages/grafica/categorias/grafica-categorias.component.ts](../src/app/pages/grafica/categorias/grafica-categorias.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `GraficaServicoWizardDialogComponent` | [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ComercialBetaEditorComponent` | [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `GraficaProdutoWizardDialogComponent` | [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `ComercialBetaListComponent` | [src/app/pages/grafica/comercial-beta/comercial-beta-list.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-list.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `GraficaProdutoBuscaRapidaDialogComponent` | [src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.ts](../src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.ts) | 1 | 2 | FEATURE-SPECIFIC |

| `OrcamentoComercialImpressaoPageComponent` | [src/app/pages/grafica/comercial-beta/orcamento-comercial-impressao-page.component.ts](../src/app/pages/grafica/comercial-beta/orcamento-comercial-impressao-page.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `OrcamentoComercialWhatsappPageComponent` | [src/app/pages/grafica/comercial-beta/orcamento-comercial-whatsapp-page.component.ts](../src/app/pages/grafica/comercial-beta/orcamento-comercial-whatsapp-page.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `PedidoComercialImpressaoPageComponent` | [src/app/pages/grafica/comercial-beta/pedido-comercial-impressao-page.component.ts](../src/app/pages/grafica/comercial-beta/pedido-comercial-impressao-page.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `PedidoComercialWhatsappPageComponent` | [src/app/pages/grafica/comercial-beta/pedido-comercial-whatsapp-page.component.ts](../src/app/pages/grafica/comercial-beta/pedido-comercial-whatsapp-page.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `PedidoDocumentosAcoesComponent` | [src/app/pages/grafica/comercial-beta/pedido-documentos-acoes.component.ts](../src/app/pages/grafica/comercial-beta/pedido-documentos-acoes.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `GraficaCorFormComponent` | [src/app/pages/grafica/cores/grafica-cor-form.component.ts](../src/app/pages/grafica/cores/grafica-cor-form.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `GraficaCoresComponent` | [src/app/pages/grafica/cores/grafica-cores.component.ts](../src/app/pages/grafica/cores/grafica-cores.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `GraficaFormatoFormComponent` | [src/app/pages/grafica/formatos/grafica-formato-form.component.ts](../src/app/pages/grafica/formatos/grafica-formato-form.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `GraficaFormatosComponent` | [src/app/pages/grafica/formatos/grafica-formatos.component.ts](../src/app/pages/grafica/formatos/grafica-formatos.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `GraficaMateriaisComponent` | [src/app/pages/grafica/materiais/grafica-materiais.component.ts](../src/app/pages/grafica/materiais/grafica-materiais.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `GraficaMaterialFormComponent` | [src/app/pages/grafica/materiais/grafica-material-form.component.ts](../src/app/pages/grafica/materiais/grafica-material-form.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `GraficaCadastroRapidoDialogComponent` | [src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.ts) | 1 | 1 | FEATURE-SPECIFIC |

| `GraficaProdutoAcabamentoDialogComponent` | [src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts) | 1 | 1 | FEATURE-SPECIFIC |

| `GraficaProdutoFormComponent` | [src/app/pages/grafica/produtos/grafica-produto-form.component.ts](../src/app/pages/grafica/produtos/grafica-produto-form.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `GraficaProdutosComponent` | [src/app/pages/grafica/produtos/grafica-produtos.component.ts](../src/app/pages/grafica/produtos/grafica-produtos.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `GraficaServicoFormComponent` | [src/app/pages/grafica/servicos/grafica-servico-form.component.ts](../src/app/pages/grafica/servicos/grafica-servico-form.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `GraficaServicosComponent` | [src/app/pages/grafica/servicos/grafica-servicos.component.ts](../src/app/pages/grafica/servicos/grafica-servicos.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `LinksItemDialogComponent` | [src/app/pages/links/components/item-dialog/links-item-dialog.component.ts](../src/app/pages/links/components/item-dialog/links-item-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `LinksPreviewDialogComponent` | [src/app/pages/links/components/preview-dialog/links-preview-dialog.component.ts](../src/app/pages/links/components/preview-dialog/links-preview-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `LinksPublicPreviewComponent` | [src/app/pages/links/components/public-preview/links-public-preview.component.ts](../src/app/pages/links/components/public-preview/links-public-preview.component.ts) | 2 | 1 | FEATURE-SPECIFIC |

| `LinksShareDialogComponent` | [src/app/pages/links/components/share-dialog/links-share-dialog.component.ts](../src/app/pages/links/components/share-dialog/links-share-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `LinksSharePanelComponent` | [src/app/pages/links/components/share-panel/links-share-panel.component.ts](../src/app/pages/links/components/share-panel/links-share-panel.component.ts) | 2 | 1 | FEATURE-SPECIFIC |

| `LinksAnalyticsComponent` | [src/app/pages/links/pages/analytics/links-analytics.component.ts](../src/app/pages/links/pages/analytics/links-analytics.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `LinksEditorComponent` | [src/app/pages/links/pages/editor/links-editor.component.ts](../src/app/pages/links/pages/editor/links-editor.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `LinksListaComponent` | [src/app/pages/links/pages/lista/links-lista.component.ts](../src/app/pages/links/pages/lista/links-lista.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `NotificacaoEnviarDialogComponent` | [src/app/pages/notificacoes/components/notificacao-enviar-dialog.component.ts](../src/app/pages/notificacoes/components/notificacao-enviar-dialog.component.ts) | 3 | 0 | FEATURE-SPECIFIC |

| `AppNotificacoesComponent` | [src/app/pages/notificacoes/notificacoes.component.ts](../src/app/pages/notificacoes/notificacoes.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `OnboardingPageComponent` | [src/app/pages/onboarding/onboarding-page.component.ts](../src/app/pages/onboarding/onboarding-page.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `OnboardingV2CompanyPageComponent` | [src/app/pages/onboarding-v2/company-step/onboarding-v2-company-page.component.ts](../src/app/pages/onboarding-v2/company-step/onboarding-v2-company-page.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `SegmentSelectorComponent` | [src/app/pages/onboarding-v2/components/segment-selector/segment-selector.component.ts](../src/app/pages/onboarding-v2/components/segment-selector/segment-selector.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `OnboardingV2EntryPageComponent` | [src/app/pages/onboarding-v2/entry/onboarding-v2-entry-page.component.ts](../src/app/pages/onboarding-v2/entry/onboarding-v2-entry-page.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `OnboardingV2ProductsPageComponent` | [src/app/pages/onboarding-v2/products-step/onboarding-v2-products-page.component.ts](../src/app/pages/onboarding-v2/products-step/onboarding-v2-products-page.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `OnboardingV2SummaryPageComponent` | [src/app/pages/onboarding-v2/summary-step/onboarding-v2-summary-page.component.ts](../src/app/pages/onboarding-v2/summary-step/onboarding-v2-summary-page.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `DetalheOrcamentoComponent` | [src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.ts](../src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `FormOrcamentoComponent` | [src/app/pages/orcamentos/form-orcamento/form-orcamento.component.ts](../src/app/pages/orcamentos/form-orcamento/form-orcamento.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `ListarOrcamentosComponent` | [src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.ts](../src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `DetalhesPedidoComponent` | [src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.ts](../src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `DialogAdicionarProdutoMobileComponent` | [src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto-mobile.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto-mobile.component.ts) | 2 | 0 | FEATURE-SPECIFIC |

| `DialogAdicionarProdutoComponent` | [src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/dialog-adicionar-produto.component.ts) | 2 | 0 | FEATURE-SPECIFIC |

| `PrecoDemandaConfigComponent` | [src/app/pages/pedido/dialog-adicionar-produto/preco-demanda-component/preco-demanda-config.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/preco-demanda-component/preco-demanda-config.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `PrecoFixoConfigComponent` | [src/app/pages/pedido/dialog-adicionar-produto/preco-fixo-component/preco-fixo-config.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/preco-fixo-component/preco-fixo-config.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `PrecoMetroConfigComponent` | [src/app/pages/pedido/dialog-adicionar-produto/preco-metro-component/preco-metro-config.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/preco-metro-component/preco-metro-config.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `PrecoQuantidadeConfigComponent` | [src/app/pages/pedido/dialog-adicionar-produto/preco-quantidade-component/preco-quantidade-config.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/preco-quantidade-component/preco-quantidade-config.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `ConfigurarPrecoStepComponent` | [src/app/pages/pedido/dialog-adicionar-produto/steps/configurar-preco-step/configurar-preco-step.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/steps/configurar-preco-step/configurar-preco-step.component.ts) | 2 | 0 | FEATURE-SPECIFIC |

| `EscolherVariacaoStepComponent` | [src/app/pages/pedido/dialog-adicionar-produto/steps/escolher-variacao-step/escolher-variacao-step.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/steps/escolher-variacao-step/escolher-variacao-step.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `RevisaoStepComponent` | [src/app/pages/pedido/dialog-adicionar-produto/steps/revisao-step/revisao-step.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/steps/revisao-step/revisao-step.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `SelecionarProdutoStepComponent` | [src/app/pages/pedido/dialog-adicionar-produto/steps/selecionar-produto-step/selecionar-produto-step.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/steps/selecionar-produto-step/selecionar-produto-step.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `ServicosStepComponent` | [src/app/pages/pedido/dialog-adicionar-produto/steps/servicos-step/servicos-step.component.ts](../src/app/pages/pedido/dialog-adicionar-produto/steps/servicos-step/servicos-step.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `DialogDescreverItemComponent` | [src/app/pages/pedido/dialog-descrever-item/dialog-descrever-item.component.ts](../src/app/pages/pedido/dialog-descrever-item/dialog-descrever-item.component.ts) | 2 | 0 | FEATURE-SPECIFIC |

| `FormPedidoComponent` | [src/app/pages/pedido/form-pedido/form-pedido.component.ts](../src/app/pages/pedido/form-pedido/form-pedido.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListarPedidoComponent` | [src/app/pages/pedido/listar-pedido/listar-pedido.component.ts](../src/app/pages/pedido/listar-pedido/listar-pedido.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ImprimirEtiquetasPageComponent` | [src/app/pages/pedido/pedido-imprimir/etiquetas/imprimir-etiquetas.page.ts](../src/app/pages/pedido/pedido-imprimir/etiquetas/imprimir-etiquetas.page.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ImprimirPedidoPageComponent` | [src/app/pages/pedido/pedido-imprimir/imprimir-pedido.page.ts](../src/app/pages/pedido/pedido-imprimir/imprimir-pedido.page.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ImprimirEtiquetasLayoutComponent` | [src/app/pages/pedido/pedido-imprimir/layouts/etiquetas/imprimir-etiquetas-layout.component.ts](../src/app/pages/pedido/pedido-imprimir/layouts/etiquetas/imprimir-etiquetas-layout.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ImprimirPedidoCompletoComponent` | [src/app/pages/pedido/pedido-imprimir/layouts/pedido-completo/imprimir-pedido-completo/imprimir-pedido-completo.component.ts](../src/app/pages/pedido/pedido-imprimir/layouts/pedido-completo/imprimir-pedido-completo/imprimir-pedido-completo.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ImprimirPedidoDuasViasComponent` | [src/app/pages/pedido/pedido-imprimir/layouts/pedido-duas-vias/imprimir-pedido-duas-vias/imprimir-pedido-duas-vias.component.ts](../src/app/pages/pedido/pedido-imprimir/layouts/pedido-duas-vias/imprimir-pedido-duas-vias/imprimir-pedido-duas-vias.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ImprimirWhatsAppComponent` | [src/app/pages/pedido/pedido-imprimir-whatsapp/imprimir-whatsapp.component.ts](../src/app/pages/pedido/pedido-imprimir-whatsapp/imprimir-whatsapp.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `GerenciarPerfilComponent` | [src/app/pages/perfil/gerenciar-perfil/gerenciar-perfil.component.ts](../src/app/pages/perfil/gerenciar-perfil/gerenciar-perfil.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `PerfilDialogComponent` | [src/app/pages/perfil/modal-perfil/perfil-dialog.component.ts](../src/app/pages/perfil/modal-perfil/perfil-dialog.component.ts) | 1 | 1 | FEATURE-SPECIFIC |

| `TrocarPerfilDialogComponent` | [src/app/pages/perfil/modal-trocar-perfil/trocar-perfil-dialog.component.ts](../src/app/pages/perfil/modal-trocar-perfil/trocar-perfil-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `DialogCriarAcordoComponent` | [src/app/pages/pessoas/folha/components/dialog-criar-acordo/dialog-criar-acordo.component.ts](../src/app/pages/pessoas/folha/components/dialog-criar-acordo/dialog-criar-acordo.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `DialogCriarCompetenciaComponent` | [src/app/pages/pessoas/folha/components/dialog-criar-competencia/dialog-criar-competencia.component.ts](../src/app/pages/pessoas/folha/components/dialog-criar-competencia/dialog-criar-competencia.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `DialogFolhaWhatsappComponent` | [src/app/pages/pessoas/folha/components/dialog-folha-whatsapp/dialog-folha-whatsapp.component.ts](../src/app/pages/pessoas/folha/components/dialog-folha-whatsapp/dialog-folha-whatsapp.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `DialogRenegociarAcordosComponent` | [src/app/pages/pessoas/folha/components/dialog-renegociar-acordos/dialog-renegociar-acordos.component.ts](../src/app/pages/pessoas/folha/components/dialog-renegociar-acordos/dialog-renegociar-acordos.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `DialogValorAcaoComponent` | [src/app/pages/pessoas/folha/components/dialog-valor-acao/dialog-valor-acao.component.ts](../src/app/pages/pessoas/folha/components/dialog-valor-acao/dialog-valor-acao.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `DetalheFolhaPagamentoComponent` | [src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.ts](../src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListarFolhaPagamentoComponent` | [src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.ts](../src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `BannerPreviewComponent` | [src/app/pages/site/banners/banner-preview/banner-preview.component.ts](../src/app/pages/site/banners/banner-preview/banner-preview.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `FormBannerComponent` | [src/app/pages/site/banners/form-banner/form-banner.component.ts](../src/app/pages/site/banners/form-banner/form-banner.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListarBannersComponent` | [src/app/pages/site/banners/listar-banners/listar-banners.component.ts](../src/app/pages/site/banners/listar-banners/listar-banners.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `SiteBannerImageUploadComponent` | [src/app/pages/site/banners/site-banner-image-upload/site-banner-image-upload.component.ts](../src/app/pages/site/banners/site-banner-image-upload/site-banner-image-upload.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `SiteConfiguracoesComponent` | [src/app/pages/site/configuracoes/site-configuracoes.component.ts](../src/app/pages/site/configuracoes/site-configuracoes.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `BlocoImageUploadComponent` | [src/app/pages/site/paginas/blocos/bloco-image-upload/bloco-image-upload.component.ts](../src/app/pages/site/paginas/blocos/bloco-image-upload/bloco-image-upload.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `BlocoPreviewComponent` | [src/app/pages/site/paginas/blocos/bloco-preview/bloco-preview.component.ts](../src/app/pages/site/paginas/blocos/bloco-preview/bloco-preview.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `FormBlocoComponent` | [src/app/pages/site/paginas/blocos/form-bloco/form-bloco.component.ts](../src/app/pages/site/paginas/blocos/form-bloco/form-bloco.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `ListarBlocosComponent` | [src/app/pages/site/paginas/blocos/listar-blocos/listar-blocos.component.ts](../src/app/pages/site/paginas/blocos/listar-blocos/listar-blocos.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `FormPaginaComponent` | [src/app/pages/site/paginas/form-pagina/form-pagina.component.ts](../src/app/pages/site/paginas/form-pagina/form-pagina.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListarPaginasComponent` | [src/app/pages/site/paginas/listar-paginas/listar-paginas.component.ts](../src/app/pages/site/paginas/listar-paginas/listar-paginas.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `CalculadoraConfigComponent` | [src/app/pages/smart-calc-config/smart-calc-config/smart-calc-config.component.ts](../src/app/pages/smart-calc-config/smart-calc-config/smart-calc-config.component.ts) | 0 | 1 | FEATURE-SPECIFIC |

| `StarterComponent` | [src/app/pages/starter/starter.component.ts](../src/app/pages/starter/starter.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `StorageAdminPageComponent` | [src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.ts](../src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `StorageArquivosListaComponent` | [src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.ts](../src/app/pages/storage/components/storage-arquivos-lista/storage-arquivos-lista.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `StorageDashboardComponent` | [src/app/pages/storage/components/storage-dashboard/storage-dashboard.component.ts](../src/app/pages/storage/components/storage-dashboard/storage-dashboard.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `StorageDetalheDialogComponent` | [src/app/pages/storage/components/storage-detalhe-dialog/storage-detalhe-dialog.component.ts](../src/app/pages/storage/components/storage-detalhe-dialog/storage-detalhe-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `StorageImagePreviewComponent` | [src/app/pages/storage/components/storage-image-preview/storage-image-preview.component.ts](../src/app/pages/storage/components/storage-image-preview/storage-image-preview.component.ts) | 5 | 0 | FEATURE-SPECIFIC |

| `StorageLixeiraComponent` | [src/app/pages/storage/components/storage-lixeira/storage-lixeira.component.ts](../src/app/pages/storage/components/storage-lixeira/storage-lixeira.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `StorageReconciliacaoComponent` | [src/app/pages/storage/components/storage-reconciliacao/storage-reconciliacao.component.ts](../src/app/pages/storage/components/storage-reconciliacao/storage-reconciliacao.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `StorageVideoStatusComponent` | [src/app/pages/storage/components/storage-video-status/storage-video-status.component.ts](../src/app/pages/storage/components/storage-video-status/storage-video-status.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `StorageVideoUploadComponent` | [src/app/pages/storage/components/storage-video-upload/storage-video-upload.component.ts](../src/app/pages/storage/components/storage-video-upload/storage-video-upload.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `StorageVideosComponent` | [src/app/pages/storage/components/storage-videos/storage-videos.component.ts](../src/app/pages/storage/components/storage-videos/storage-videos.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `ChamadoSuporteDialogComponent` | [src/app/pages/suporte/components/chamado-suporte-dialog.component.ts](../src/app/pages/suporte/components/chamado-suporte-dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `SuporteComponent` | [src/app/pages/suporte/suporte.component.ts](../src/app/pages/suporte/suporte.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppBasicTableComponent` | [src/app/pages/tables/basic-table/basic-table.component.ts](../src/app/pages/tables/basic-table/basic-table.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppDynamicTableComponent` | [src/app/pages/tables/dynamic-table/dynamic-table.component.ts](../src/app/pages/tables/dynamic-table/dynamic-table.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppExpandTableComponent` | [src/app/pages/tables/expand-table/expand-table.component.ts](../src/app/pages/tables/expand-table/expand-table.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppFilterableTableComponent` | [src/app/pages/tables/filterable-table/filterable-table.component.ts](../src/app/pages/tables/filterable-table/filterable-table.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppFooterRowTableComponent` | [src/app/pages/tables/footer-row-table/footer-row-table.component.ts](../src/app/pages/tables/footer-row-table/footer-row-table.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppHttpTableComponent` | [src/app/pages/tables/http-table/http-table.component.ts](../src/app/pages/tables/http-table/http-table.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppMixTableComponent` | [src/app/pages/tables/mix-table/mix-table.component.ts](../src/app/pages/tables/mix-table/mix-table.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppMultiHeaderFooterTableComponent` | [src/app/pages/tables/multi-header-footer-table/multi-header-footer-table.component.ts](../src/app/pages/tables/multi-header-footer-table/multi-header-footer-table.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppPaginationTableComponent` | [src/app/pages/tables/pagination-table/pagination-table.component.ts](../src/app/pages/tables/pagination-table/pagination-table.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppRowContextTableComponent` | [src/app/pages/tables/row-context-table/row-context-table.component.ts](../src/app/pages/tables/row-context-table/row-context-table.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppSelectionTableComponent` | [src/app/pages/tables/selection-table/selection-table.component.ts](../src/app/pages/tables/selection-table/selection-table.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppSortableTableComponent` | [src/app/pages/tables/sortable-table/sortable-table.component.ts](../src/app/pages/tables/sortable-table/sortable-table.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppStickyColumnTableComponent` | [src/app/pages/tables/sticky-column-table/sticky-column-table.component.ts](../src/app/pages/tables/sticky-column-table/sticky-column-table.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppStickyHeaderFooterTableComponent` | [src/app/pages/tables/sticky-header-footer-table/sticky-header-footer-table.component.ts](../src/app/pages/tables/sticky-header-footer-table/sticky-header-footer-table.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppAccountSettingComponent` | [src/app/pages/theme-pages/account-setting/account-setting.component.ts](../src/app/pages/theme-pages/account-setting/account-setting.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppFaqComponent` | [src/app/pages/theme-pages/faq/faq.component.ts](../src/app/pages/theme-pages/faq/faq.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppLandingpageComponent` | [src/app/pages/theme-pages/landingpage/landingpage.component.ts](../src/app/pages/theme-pages/landingpage/landingpage.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppPricingComponent` | [src/app/pages/theme-pages/pricing/pricing.component.ts](../src/app/pages/theme-pages/pricing/pricing.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppTreeviewComponent` | [src/app/pages/theme-pages/treeview/treeview.component.ts](../src/app/pages/theme-pages/treeview/treeview.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppBadgeComponent` | [src/app/pages/ui-components/badge/badge.component.ts](../src/app/pages/ui-components/badge/badge.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppChipsComponent` | [src/app/pages/ui-components/chips/chips.component.ts](../src/app/pages/ui-components/chips/chips.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppDialogOverviewComponent` | [src/app/pages/ui-components/dialog/dialog.component.ts](../src/app/pages/ui-components/dialog/dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppDialogContentComponent` | [src/app/pages/ui-components/dialog/dialog.component.ts](../src/app/pages/ui-components/dialog/dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppDialogDataComponent` | [src/app/pages/ui-components/dialog/dialog.component.ts](../src/app/pages/ui-components/dialog/dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppDialogMenuComponent` | [src/app/pages/ui-components/dialog/dialog.component.ts](../src/app/pages/ui-components/dialog/dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `DialogOverviewExampleDialog` | [src/app/pages/ui-components/dialog/dialog.component.ts](../src/app/pages/ui-components/dialog/dialog.component.ts) | 1 | 0 | FEATURE-SPECIFIC |

| `AppDialogComponent` | [src/app/pages/ui-components/dialog/dialog.component.ts](../src/app/pages/ui-components/dialog/dialog.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppDividerComponent` | [src/app/pages/ui-components/divider/divider.component.ts](../src/app/pages/ui-components/divider/divider.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppExpansionComponent` | [src/app/pages/ui-components/expansion/expansion.component.ts](../src/app/pages/ui-components/expansion/expansion.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppListsComponent` | [src/app/pages/ui-components/lists/lists.component.ts](../src/app/pages/ui-components/lists/lists.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppMenuComponent` | [src/app/pages/ui-components/menu/menu.component.ts](../src/app/pages/ui-components/menu/menu.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppPaginatorComponent` | [src/app/pages/ui-components/paginator/paginator.component.ts](../src/app/pages/ui-components/paginator/paginator.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppProgressComponent` | [src/app/pages/ui-components/progress/progress.component.ts](../src/app/pages/ui-components/progress/progress.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppProgressSnipperComponent` | [src/app/pages/ui-components/progress-snipper/progress-snipper.component.ts](../src/app/pages/ui-components/progress-snipper/progress-snipper.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppRipplesComponent` | [src/app/pages/ui-components/ripples/ripples.component.ts](../src/app/pages/ui-components/ripples/ripples.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppSlideToggleComponent` | [src/app/pages/ui-components/slide-toggle/slide-toggle.component.ts](../src/app/pages/ui-components/slide-toggle/slide-toggle.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppSliderComponent` | [src/app/pages/ui-components/slider/slider.component.ts](../src/app/pages/ui-components/slider/slider.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `PizzaPartyComponent` | [src/app/pages/ui-components/snackbar/snackbar.component.ts](../src/app/pages/ui-components/snackbar/snackbar.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppSnackbarComponent` | [src/app/pages/ui-components/snackbar/snackbar.component.ts](../src/app/pages/ui-components/snackbar/snackbar.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppTabsComponent` | [src/app/pages/ui-components/tabs/tabs.component.ts](../src/app/pages/ui-components/tabs/tabs.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppToolbarComponent` | [src/app/pages/ui-components/toolbar/toolbar.component.ts](../src/app/pages/ui-components/toolbar/toolbar.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppTooltipsComponent` | [src/app/pages/ui-components/tooltips/tooltips.component.ts](../src/app/pages/ui-components/tooltips/tooltips.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `FormUsuarioComponent` | [src/app/pages/usuarios/form-usuario/form-usuario.component.ts](../src/app/pages/usuarios/form-usuario/form-usuario.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `ListarUsuariosComponent` | [src/app/pages/usuarios/listar-usuarios/listar-usuarios.component.ts](../src/app/pages/usuarios/listar-usuarios/listar-usuarios.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppBannersComponent` | [src/app/pages/widgets/banners/banners.component.ts](../src/app/pages/widgets/banners/banners.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppCardsComponent` | [src/app/pages/widgets/cards/cards.component.ts](../src/app/pages/widgets/cards/cards.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `AppChartsComponent` | [src/app/pages/widgets/charts/charts.component.ts](../src/app/pages/widgets/charts/charts.component.ts) | 0 | 0 | FEATURE-SPECIFIC |

| `OnboardingTourComponent` | [src/app/shared/onboarding/onboarding-tour.component.ts](../src/app/shared/onboarding/onboarding-tour.component.ts) | 3 | 0 | FEATURE-SPECIFIC |


### Templates inline extensos (mais de 40 linhas)

| Componente | Arquivo | Linhas do template |
|---|---|---:|

| `ProdutoSelectorDialogComponent` | [src/app/components/produto-selector/produto-selector-dialog.component.ts](../src/app/components/produto-selector/produto-selector-dialog.component.ts) | 42 |

| `ProdutoSelectorComponent` | [src/app/components/produto-selector/produto-selector.component.ts](../src/app/components/produto-selector/produto-selector.component.ts) | 42 |

| `SetupProgressComponent` | [src/app/components/setup-progress/setup-progress.component.ts](../src/app/components/setup-progress/setup-progress.component.ts) | 50 |

| `FiscalConfiguracoesComponent` | [src/app/pages/apps/fiscal/configuracoes/fiscal-configuracoes.component.ts](../src/app/pages/apps/fiscal/configuracoes/fiscal-configuracoes.component.ts) | 50 |

| `FiscalProdutosComponent` | [src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts](../src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts) | 41 |

| `FiscalRegrasComponent` | [src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts](../src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts) | 41 |

| `CatalogoCaracteristicasComponent` | [src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts) | 71 |

| `CatalogoCategoriaCaracteristicasComponent` | [src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts) | 56 |

| `CatalogoCaracteristicaDialogComponent` | [src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-caracteristicas.component.ts) | 49 |

| `CatalogoCategoriaListComponent` | [src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts](../src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts) | 60 |

| `CatalogoProdutoDetailComponent` | [src/app/pages/catalogo/produtos/catalogo-produto-detail.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-detail.component.ts) | 41 |

| `CatalogoProdutoFormComponent` | [src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts](../src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts) | 64 |

| `CatalogoProdutoCaracteristicasComponent` | [src/app/pages/catalogo/shared/components/catalogo-produto-caracteristicas.component.ts](../src/app/pages/catalogo/shared/components/catalogo-produto-caracteristicas.component.ts) | 68 |

| `GraficaCadastroListComponent` | [src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts](../src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts) | 149 |

| `GraficaCategoriaFormComponent` | [src/app/pages/grafica/categorias/grafica-categoria-form.component.ts](../src/app/pages/grafica/categorias/grafica-categoria-form.component.ts) | 57 |

| `GraficaCategoriasComponent` | [src/app/pages/grafica/categorias/grafica-categorias.component.ts](../src/app/pages/grafica/categorias/grafica-categorias.component.ts) | 91 |

| `GraficaServicoWizardDialogComponent` | [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts) | 72 |

| `ComercialBetaEditorComponent` | [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts) | 309 |

| `GraficaProdutoWizardDialogComponent` | [src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-editor.component.ts) | 554 |

| `ComercialBetaListComponent` | [src/app/pages/grafica/comercial-beta/comercial-beta-list.component.ts](../src/app/pages/grafica/comercial-beta/comercial-beta-list.component.ts) | 62 |

| `GraficaProdutoBuscaRapidaDialogComponent` | [src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.ts](../src/app/pages/grafica/comercial-beta/grafica-produto-busca-rapida-dialog.component.ts) | 63 |

| `OrcamentoComercialImpressaoPageComponent` | [src/app/pages/grafica/comercial-beta/orcamento-comercial-impressao-page.component.ts](../src/app/pages/grafica/comercial-beta/orcamento-comercial-impressao-page.component.ts) | 52 |

| `OrcamentoComercialWhatsappPageComponent` | [src/app/pages/grafica/comercial-beta/orcamento-comercial-whatsapp-page.component.ts](../src/app/pages/grafica/comercial-beta/orcamento-comercial-whatsapp-page.component.ts) | 70 |

| `PedidoComercialImpressaoPageComponent` | [src/app/pages/grafica/comercial-beta/pedido-comercial-impressao-page.component.ts](../src/app/pages/grafica/comercial-beta/pedido-comercial-impressao-page.component.ts) | 52 |

| `PedidoComercialWhatsappPageComponent` | [src/app/pages/grafica/comercial-beta/pedido-comercial-whatsapp-page.component.ts](../src/app/pages/grafica/comercial-beta/pedido-comercial-whatsapp-page.component.ts) | 70 |

| `GraficaCoresComponent` | [src/app/pages/grafica/cores/grafica-cores.component.ts](../src/app/pages/grafica/cores/grafica-cores.component.ts) | 49 |

| `GraficaFormatoFormComponent` | [src/app/pages/grafica/formatos/grafica-formato-form.component.ts](../src/app/pages/grafica/formatos/grafica-formato-form.component.ts) | 98 |

| `GraficaFormatosComponent` | [src/app/pages/grafica/formatos/grafica-formatos.component.ts](../src/app/pages/grafica/formatos/grafica-formatos.component.ts) | 57 |

| `GraficaMateriaisComponent` | [src/app/pages/grafica/materiais/grafica-materiais.component.ts](../src/app/pages/grafica/materiais/grafica-materiais.component.ts) | 49 |

| `GraficaCadastroRapidoDialogComponent` | [src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-cadastro-rapido-dialog.component.ts) | 111 |

| `GraficaProdutoAcabamentoDialogComponent` | [src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts](../src/app/pages/grafica/produtos/grafica-produto-acabamento-dialog.component.ts) | 91 |

| `GraficaProdutoFormComponent` | [src/app/pages/grafica/produtos/grafica-produto-form.component.ts](../src/app/pages/grafica/produtos/grafica-produto-form.component.ts) | 175 |

| `GraficaProdutosComponent` | [src/app/pages/grafica/produtos/grafica-produtos.component.ts](../src/app/pages/grafica/produtos/grafica-produtos.component.ts) | 106 |

| `GraficaServicoFormComponent` | [src/app/pages/grafica/servicos/grafica-servico-form.component.ts](../src/app/pages/grafica/servicos/grafica-servico-form.component.ts) | 45 |

| `GraficaServicosComponent` | [src/app/pages/grafica/servicos/grafica-servicos.component.ts](../src/app/pages/grafica/servicos/grafica-servicos.component.ts) | 53 |

| `ImprimirWhatsAppComponent` | [src/app/pages/pedido/pedido-imprimir-whatsapp/imprimir-whatsapp.component.ts](../src/app/pages/pedido/pedido-imprimir-whatsapp/imprimir-whatsapp.component.ts) | 47 |
