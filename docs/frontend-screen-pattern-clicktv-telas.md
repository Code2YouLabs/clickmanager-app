# Padronização Frontend - ClickTV / Telas

Projeto: `clickmanager-app`

Branch: `feature/padronizar-clicktv-telas`

SHA base: `25758c67b8f5906d764be9c999d00fa844f62297`

Épico: `#79`

## Baseline

Antes da alteração, a suíte Angular completa foi executada em `develop`:

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `583 SUCCESS`.

Falhas preexistentes: `0`.

## Estrutura Anterior

`/page/clicktv/telas` usava dois `mat-card`: um para cabeçalho/filtros e outro para a tabela, com `CardHeader`, toolbar local, `MatTable`, `MatPaginator` próprio e estados simples de loading/vazio.

O seletor de playlist padrão era renderizado diretamente na coluna da tabela e as ações ficavam em menu local por linha.

## Estrutura Final

A tela passou a usar:

- `PageCard` como shell único.
- `page-header-actions` para a ação `Vincular tela`.
- `DataTable` para filtros, estados, tabela, item mobile, ações e paginação.
- `ListFilterBar` e `InputPesquisa` indiretamente pelo `DataTable`.

A tela continua sendo listagem com edição contextual por dialog; não foi criado editor em rota.

## Componentes Compartilhados Reutilizados

- `PageCard`
- `DataTable`
- `DataTableCellDirective`
- `appDataTableItem`
- `ListFilterBar`
- `InputPesquisa`
- `ConfirmDialog`
- `dialog-form-shell.scss`
- `InputTextoRestrito`
- `InputOptions`

O badge local de status foi preservado para não ampliar semântica compartilhada sem necessidade nesta etapa.

## Listagem

Contratos preservados:

- `GET /api/clicktv/telas`
- `nome`
- `status`
- `page`
- `size`

Colunas preservadas:

- Tela
- Orientação
- Status
- Playlist padrão
- Última conexão
- Ações

Tela continua mostrando `nome` e `descricaoLocal`. Última conexão continua usando `dd/MM/yyyy HH:mm`, com `Nunca` quando não houver data.

## Filtros Server-Side

Busca por `nome` usa o debounce único do `InputPesquisa` dentro do `DataTable/ListFilterBar`.

Status preserva os valores do backend:

- `AGUARDANDO_ATIVACAO`
- `ONLINE`
- `OFFLINE`
- `DESATIVADA`

Os rótulos exibidos foram normalizados para leitura:

- `Aguardando ativação`
- `Online`
- `Offline`
- `Desativada`

Qualquer mudança em busca ou status faz `page = 0` e recarrega no servidor. Limpar filtros zera busca, status e página, preservando `size`.

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

Erro HTTP não vira `Nenhuma tela encontrada`.

## Playlists Auxiliares

A lista de playlists para o seletor de conteúdo padrão usa consulta independente:

`GET /api/clicktv/playlists?ativa=true&page=0&size=200`

Falha no carregamento de playlists não derruba a tabela. A tela exibe erro inline específico, desabilita os seletores e oferece retry somente para playlists.

## Playlist Padrão

Contrato preservado:

`PATCH /api/clicktv/telas/:id/playlist-padrao`

Payload:

`{ playlistId }`

Selecionar `Sem conteúdo` envia `playlistId = null`.

Telas `DESATIVADA` ficam sem edição de playlist padrão. Alterações duplicadas por tela são bloqueadas enquanto há PATCH pendente. Em erro, o valor visual volta ao anterior, a tela informa falha e recarrega a listagem para manter coerência com o backend.

## Ações Da Listagem

Preservadas:

- Editar.
- Vincular novamente.
- Desvincular.
- Desativar.

Estados preservados:

- `Vincular novamente` desabilitado para `DESATIVADA`.
- `Desvincular` desabilitado para `AGUARDANDO_ATIVACAO` e `DESATIVADA`.
- `Desativar` desabilitado para `DESATIVADA`.

Depois de vincular, editar, desvincular ou desativar, a listagem é recarregada.

## Dialog De Tela

`ClickTvTelaDialogComponent` continua como dialog contextual, sem `PageCard` e sem `PageFormState`.

Foi aplicado `dialog-form-shell.scss` e inputs compartilhados onde compatível:

- `InputTextoRestrito` para nome.
- `InputTextoRestrito` para local.
- `InputOptions` para orientação.

O campo de código de ativação permanece local com `mat-form-field`, validação de exatamente 6 dígitos e normalização para remover caracteres não numéricos.

Payloads preservados:

- Vincular nova tela: inclui `codigo`, `nome`, `descricaoLocal`, `orientacao`.
- Vincular novamente: inclui os mesmos campos e `telaId`.
- Editar: usa dados editáveis da tela, sem exigir código.

## Permissões

Preservadas:

- `CLICKTV_VER`
- `CLICKTV_TELAS_GERENCIAR`

Usuário sem `CLICKTV_TELAS_GERENCIAR` continua podendo visualizar a listagem quando possuir permissão de leitura, mas não vê ação de vincular nem ações de gestão por linha.

## Contratos HTTP

Preservados:

- `GET /api/clicktv/telas`
- `GET /api/clicktv/playlists`
- `POST /api/clicktv/telas/vincular`
- `PUT /api/clicktv/telas/:id`
- `PATCH /api/clicktv/telas/:id/playlist-padrao`
- `POST /api/clicktv/telas/:id/desvincular`
- `DELETE /api/clicktv/telas/:id`

## Código Morto Removido

- `CardHeaderComponent` saiu do componente de Telas.
- Toolbar local da tela deixou de existir.
- `MatTable` e `MatPaginator` próprios foram substituídos pelo `DataTable`.

## Dívidas Técnicas

- Extrair `ClickTvTelaDialogComponent` para arquivo próprio junto com seus testes quando os dialogs de ClickTV forem separados.
- Avaliar futuramente um badge genérico parametrizável antes de ampliar `StatusBadge` com status de telas.

## Testes Focados

`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/clicktv/**/*.spec.ts'`

Resultado: `63 SUCCESS`.

## Validações Finais

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `597 SUCCESS`.

`npm run build`

Resultado: sucesso. O build mantém warnings preexistentes em áreas fora do escopo e dependências CommonJS.

`npx tsc --noEmit -p tsconfig.app.json`

Resultado: sucesso.

`git diff --check`

Resultado: sucesso.

Validação visual: pendente de revisão manual pelo responsável do produto.
