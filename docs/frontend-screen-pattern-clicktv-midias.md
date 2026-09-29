# Padronização Frontend - ClickTV / Mídias

Projeto: `clickmanager-app`

Branch: `feature/padronizar-clicktv-midias`

SHA base: `bb6680b5d81811aaaa3867eeeb984092672bfe92`

Épico: `#79`

## Baseline

Antes da alteração, a suíte Angular completa foi executada em `develop`:

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `540 SUCCESS`.

Falhas preexistentes: `0`.

## Estrutura Anterior

`/page/clicktv/midias` usava `section.clicktv-page`, `mat-card`, `CardHeader`, toolbar própria, grid fora do shell e `MatPaginator` próprio.

Erros de listagem eram tratados por toast, sem estado visual de retry/forbidden. Loading, vazio e conteúdo compartilhavam uma árvore simples, e respostas antigas poderiam sobrescrever a consulta atual.

## Estrutura Final

A tela passou a usar:

- `PageCard` como shell único da página.
- `page-header-actions` para a ação `Enviar mídia`.
- `ListFilterBar` para busca e filtros server-side.
- Grid visual específico de ClickTV para a biblioteca de mídias.
- `MatPaginator` preservado fora de `DataTable`, mantendo paginação real do servidor.

Não foi usado `DataTable` porque Mídias é uma biblioteca visual com preview/thumbnail, tipo, tamanho, resolução, orientação, status e ações. O grid continua sendo a representação adequada.

## Componentes Compartilhados Reutilizados

- `PageCard`
- `ListFilterBar`
- `InputPesquisa` indiretamente pelo `ListFilterBar`
- `ConfirmDialog`
- `dialog-form-shell.scss`
- `InputTextoRestrito`
- `InputNumerico`

`StatusBadge` não foi adotado nesta etapa para não ampliar o mapa compartilhado com status específicos de processamento de mídia. O badge local de mídia foi preservado.

## Filtros Server-Side

O backend continua recebendo:

- `nome`
- `tipo`
- `status`
- `page`
- `size`

Valores preservados:

- Tipo: `IMAGEM`, `VIDEO`
- Status: `PROCESSANDO`, `DISPONIVEL`, `ERRO`

O status `ARQUIVADA` permanece no tipo TypeScript, mas não foi adicionado ao filtro da interface. Essa diferença foi preservada como comportamento atual.

Busca e filtros reiniciam `page = 0` e consultam o servidor. `size` é preservado.

## Paginação

A paginação continua server-side, baseada em:

- `totalElements`
- `page`
- `size`

Opções preservadas:

- `12`
- `24`
- `48`

Não foi criado infinite scroll nem paginação local.

## Estados

A tela agora diferencia:

- Loading inicial.
- Refreshing com grid preservado.
- Erro inicial com retry.
- Erro de atualização com dados preservados.
- Forbidden.
- Empty sem filtros.
- Empty filtrado.
- Conteúdo.

Erro HTTP não é convertido em vazio. Retry de listagem chama somente `carregar()`.

## Concorrência

A listagem usa `switchMap` para cancelar respostas obsoletas. Alterações rápidas de busca, tipo, status ou página não deixam uma resposta antiga sobrescrever a consulta mais recente.

## Upload

Contrato preservado:

- `POST /api/clicktv/midias`
- `multipart/form-data`
- campo `arquivo`
- `nome` opcional
- `duracaoImagem` opcional

`reportProgress`, `HttpEventType.UploadProgress` e `HttpEventType.Response` foram preservados.

Formatos aceitos preservados:

- JPG
- JPEG
- PNG
- WebP
- MP4

O progresso do upload continua separado do loading da listagem e permanece visível fora do dialog.

## Preview

O fluxo de visualização continua usando:

`forkJoin(detalharMidia, utilizacoesMidia)`

O preview só abre após carregar detalhe e utilizações. O dialog preserva imagem, vídeo com `controls`, mensagem para URL indisponível, dados de arquivo, resolução e playlists que utilizam a mídia.

## Renomear

Contrato preservado:

- `PATCH /api/clicktv/midias/:id`
- payload `{ nome }`

O dialog mantém validação `required` e `maxlength 160`. A tela não faz request quando o nome está vazio ou igual ao atual.

## Exclusão

`ConfirmDialog` continua sendo usado. A mensagem preserva exclusão definitiva, remoção das playlists e necessidade de novo upload.

Erro de exclusão mantém a orientação funcional existente sobre vídeos em processamento.

## Dialogs

`ClickTvUploadDialogComponent`, `ClickTvNameDialogComponent` e `ClickTvMidiaPreviewDialogComponent` continuam como dialogs de domínio e não usam `PageCard` nem `PageFormState`.

Foi aplicado `dialog-form-shell.scss` aos dialogs de mídia e usados inputs compartilhados onde compatível.

Os três dialogs de mídia permaneceram em `clicktv-dialogs.component.ts` porque o arquivo também contém dialogs de Playlists e Telas. A extração seletiva para arquivos próprios é uma dívida técnica segura para uma etapa posterior, evitando refatoração transversal nesta tarefa.

## Organização De Arquivos

Mantidos:

- `clicktv-midias.component.ts`
- `clicktv-midias.component.html`
- `clicktv.scss`
- `clicktv-dialogs.component.ts`

Adicionados:

- `clicktv-midias.component.spec.ts`
- `clicktv-dialogs.component.spec.ts`

## Permissões

Preservadas:

- `CLICKTV_VER`
- `CLICKTV_MIDIAS_GERENCIAR`

Usuário com apenas `CLICKTV_VER` consegue listar, filtrar e visualizar mídia. Ações de upload, renomear e excluir continuam condicionadas a `CLICKTV_MIDIAS_GERENCIAR`.

## Contratos HTTP

Preservados:

- `GET /api/clicktv/midias`
- `POST /api/clicktv/midias`
- `GET /api/clicktv/midias/:id`
- `GET /api/clicktv/midias/:id/utilizacoes`
- `PATCH /api/clicktv/midias/:id`
- `DELETE /api/clicktv/midias/:id`

## Código Morto Removido

- `CardHeaderComponent` saiu do componente de Mídias.
- Toolbar local da tela deixou de existir.
- CSS específico de `.clicktv-toolbar` foi removido.

O grid e os badges locais foram preservados por serem específicos da biblioteca visual.

## Dívidas Técnicas

- Separar os três dialogs de Mídias em arquivos próprios sem tocar nos dialogs de Playlists/Telas.
- Investigar se `ARQUIVADA` deve ser exposto no filtro de status.
- Avaliar futuramente um badge genérico parametrizável antes de ampliar `StatusBadge` com status de mídia.

## Testes Focados

`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/clicktv/**/*.spec.ts'`

Resultado: `30 SUCCESS`.

## Validações Finais

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `564 SUCCESS`.

`npm run build`

Resultado: sucesso. O build mantém warnings pré-existentes em áreas fora do escopo e dependências CommonJS.

`npx tsc --noEmit -p tsconfig.app.json`

Resultado: sucesso.

`git diff --check`

Resultado: sucesso.

## Novas Falhas

Novas falhas: `0`.

Validação visual: pendente de revisão manual pelo responsável do produto.
