# Padronização Frontend - ClickTV / Playlists

Projeto: `clickmanager-app`

Branch: `feature/padronizar-clicktv-playlists`

SHA base: `04ea9bcaafb85996d47de39ee98e3a663b6d263a`

Épico: `#79`

## Baseline

Antes da alteração, a suíte Angular completa foi executada em `develop`:

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `564 SUCCESS`.

Falhas preexistentes: `0`.

## Estrutura Anterior

`/page/clicktv/playlists` usava dois `mat-card`: um para filtros e outro para tabela, com `CardHeader`, toolbar local, `MatTable` e `MatPaginator` próprios.

`/page/clicktv/playlists/:id` usava heading paralelo, dois `mat-card` locais e estados de erro tratados principalmente por toast.

## Estrutura Final

Listagem:

- `PageCard` como shell único.
- `page-header-actions` para `Nova playlist`.
- `DataTable` para filtros, estados, tabela, ações, item mobile e paginação.
- `ListFilterBar` indireto pelo DataTable.

Editor:

- `PageCard` com ação canônica `Voltar`.
- `SectionCard` para `Biblioteca de mídias`.
- `SectionCard` para `Sequência de reprodução`.
- Sem footer, sem `PageFormState`, sem Salvar/Cancelar global.

## Componentes Compartilhados Reutilizados

- `PageCard`
- `DataTable`
- `DataTableCellDirective`
- `appDataTableItem`
- `ListFilterBar`
- `InputPesquisa`
- `SectionCard`
- `ConfirmDialog`
- `dialog-form-shell.scss`
- `InputTextoRestrito`
- `InputTextarea`
- `InputOptions`

`StatusBadge` não foi alterado. O badge local `ATIVA/INATIVA` foi preservado para não ampliar semântica compartilhada sem necessidade.

## Listagem

Contratos preservados:

- `GET /api/clicktv/playlists`
- `nome`
- `orientacao`
- `ativa`
- `page`
- `size`

Colunas preservadas:

- Nome
- Orientação
- Itens
- Versão
- Status
- Ações

Nome continua mostrando `nome` e `descrição`. Itens continua usando `quantidadeItensAtivos / quantidadeItens`. Versão continua em `v{versao}`.

## Filtros Server-Side

Busca por `nome` usa o debounce único do `InputPesquisa` dentro do `DataTable/ListFilterBar`.

Orientação usa `CLICKTV_ORIENTACOES`, preservando:

- `HORIZONTAL`
- `VERTICAL`
- `QUADRADA`
- `INDEFINIDA`

Status preserva:

- Todos: `ativa = undefined`
- Ativa: `ativa = true`
- Inativa: `ativa = false`

O valor `false` é preservado como filtro válido.

Qualquer mudança em busca, orientação ou status faz `page = 0` e recarrega no servidor. Limpar filtros zera busca, orientação, status e página, preservando `size`.

## Paginação

Paginação permanece server-side:

- `page`
- `size`
- `totalElements`

Opções preservadas:

- `10`
- `20`
- `50`

Não foi criada paginação local.

## Estados Da Listagem

A listagem diferencia:

- Loading inicial.
- Refreshing com dados preservados.
- Erro inicial com retry.
- Erro de atualização com dados preservados.
- Forbidden.
- Empty sem filtros.
- Empty filtrado.
- Conteúdo.

Erro HTTP não vira `Nenhuma playlist encontrada`.

## Ações Da Listagem

Preservadas:

- Editar conteúdo: navega para `/page/clicktv/playlists/:id`.
- Editar dados: abre `ClickTvPlaylistDialogComponent` e usa `PUT /api/clicktv/playlists/:id`.
- Duplicar: usa `ClickTvNameDialogComponent` com nome inicial `{nome} (cópia)` e `POST /api/clicktv/playlists/:id/duplicar`.
- Desativar: usa `ConfirmDialogComponent` e `DELETE /api/clicktv/playlists/:id`.

Playlist inativa mantém a ação Desativar desabilitada.

## Editor

`/page/clicktv/playlists/:id` mantém o editor como rota, não dialog.

O header usa:

- Título: nome da playlist, ou `Editor de playlist` durante carregamento.
- Subtítulo: orientação, versão e duração configurada.
- Voltar para `/page/clicktv/playlists`.

Falha do detalhe da playlist mostra estado visual e retry, sem renderizar editor vazio.

Estados do detalhe:

- Loading.
- Error/retry.
- Forbidden.
- Not found.
- Content.

## Biblioteca

Contrato preservado:

- `GET /api/clicktv/midias`
- `status = DISPONIVEL`
- `page = 0`
- `size = 100`
- `nome`

Busca usa `InputPesquisa` com debounce único e consulta server-side.

A biblioteca mantém apresentação de seleção rápida de mídia, com ícone, nome, tipo, orientação e ação de adicionar. Não foi transformada em `DataTable`.

Erro da biblioteca é independente: a sequência continua visível e a biblioteca mostra erro com retry.

## Sequência

Representação em itens ordenados preservada.

Preservados:

- Ordenação por `item.ordem`.
- Mover cima/baixo.
- `PUT /api/clicktv/playlists/:playlistId/ordenacao` com `itemIds`.
- Duração editável somente para imagens.
- Validação de duração maior que zero.
- `item.ativo`.
- `PUT /api/clicktv/playlists/:playlistId/itens/:itemId`.
- Remoção com `ConfirmDialogComponent`.
- `DELETE /api/clicktv/playlists/:playlistId/itens/:itemId`.
- Estado de playlist vazia.

Operações continuam persistidas individualmente:

- adicionar
- editar duração
- ativar/desativar
- mover
- remover

Não foi criado autosave global, footer ou botão Salvar.

## Persistência Individual E Falhas

Durante operação pendente, ações da sequência ficam indisponíveis para evitar disparos duplicados.

Em falha de atualização inline, a playlist é recarregada para manter o estado visual coerente com o backend.

HTTP `409` preserva o comportamento:

Mensagem fallback:

`A playlist foi alterada ou a mídia está em conflito. Recarregamos os dados.`

Depois do `409`, o detalhe da playlist é recarregado.

## Dialogs

`ClickTvPlaylistDialogComponent` foi padronizado com `dialog-form-shell.scss`.

Campos preservados:

- `nome`, required, maxlength 160.
- `descrição`, maxlength 1000.
- `orientação`, required, usando `CLICKTV_ORIENTACOES`.
- `ativa`, com `mat-slide-toggle`.

Inputs reutilizados:

- `InputTextoRestrito`
- `InputTextarea`
- `InputOptions`

`ClickTvNameDialogComponent` continua sendo usado para duplicação. Dialogs de Telas não foram refatorados nesta tarefa.

## Permissões

Preservadas:

- `permissionGuard`
- `SHARED_ROUTE_DATA`
- `CLICKTV_VER`
- `CLICKTV_PLAYLISTS_GERENCIAR`

`Nova playlist`, `Editar dados`, `Duplicar`, `Desativar`, adicionar mídia, mover, remover e ativar/desativar itens continuam condicionados a `CLICKTV_PLAYLISTS_GERENCIAR`.

## Contratos HTTP

Preservados:

- `GET /api/clicktv/playlists`
- `POST /api/clicktv/playlists`
- `GET /api/clicktv/playlists/:id`
- `PUT /api/clicktv/playlists/:id`
- `DELETE /api/clicktv/playlists/:id`
- `POST /api/clicktv/playlists/:id/duplicar`
- `GET /api/clicktv/midias`
- `POST /api/clicktv/playlists/:playlistId/itens`
- `PUT /api/clicktv/playlists/:playlistId/itens/:itemId`
- `DELETE /api/clicktv/playlists/:playlistId/itens/:itemId`
- `PUT /api/clicktv/playlists/:playlistId/ordenacao`

## Dívidas Técnicas

- Biblioteca do editor limitada aos primeiros 100 resultados da consulta.
- Separar futuramente os dialogs de Playlists/Mídias/Telas em arquivos próprios sem alterar contratos.
- Avaliar badge compartilhado genérico antes de mover `ATIVA/INATIVA` para `StatusBadge`.

## Testes Focados

`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/clicktv/**/*.spec.ts'`

Resultado: `49 SUCCESS`.

## Validações Finais

`npx tsc --noEmit -p tsconfig.app.json`

Resultado: sucesso.

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `583 SUCCESS`.

`npm run build`

Resultado: sucesso. O build mantém warnings pré-existentes em áreas fora do escopo, incluindo optional chain/nullish coalescing, imports não usados, Sass deprecation/color interpolation e dependências CommonJS `qrcode` e `chance`.

`git diff --check`

Resultado: sucesso.

## Novas Falhas

Novas falhas: `0`.

Validação visual: pendente de revisão manual pelo responsável do produto.
