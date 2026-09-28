# Padronização Frontend - Meu Site / Páginas

Projeto: `clickmanager-app`

Branch: `feature/padronizar-site-paginas`

SHA base: `17d512a04cc9c8f770f7189eddc6acfa27dd9ae1`

Épico: `#79`

## Baseline

Antes da alteração, a suíte Angular completa foi executada em `develop`:

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `502 SUCCESS`.

## Componentes Reutilizados

- `PageCard` para cabeçalho, ação de voltar e rodapé padronizado do formulário.
- `PageFormState` para descarte de alterações via Cancelar sem handler local.
- `SectionCard` para seções do formulário de página e conteúdo/blocos.
- `DataTable`, `DataTableCellDirective` e `appDataTableItem` para listagem desktop/mobile de páginas e blocos.
- `ListFilterBar` indiretamente pelo `DataTable`, mantendo busca e estados compartilhados.
- `InputTextoRestrito` e `InputTextarea` nos campos textuais compatíveis.
- `ConfirmDialog` para exclusões.
- `StatusBadge` para status binários Ativo/Inativo.
- `dialog-form-shell.scss` no dialog de blocos.

## Shared Alterado

`PageCardAction` passou a aceitar `label`, `icon`, `pendingLabel`, `color` e `primary` opcionais em ações `type: 'submit'`.

O comportamento padrão permanece preservado: quando a tela não informa nada, o submit continua aparecendo como `Salvar` com ícone `save`. A alteração permite que telas de edição usem `Atualizar` mantendo o submit nativo associado por `form`.

## Listagem

`/page/site/paginas` foi migrada de `mat-card + InputPesquisa + MatTable + MatPaginator` com branch mobile separada para `PageCard -> DataTable`.

A busca segue global e server-side via `textoPesquisa`; a tela reinicia a página para `0` e refaz o GET. A paginação mantém `page`, `size`, `totalElements` e `sort=ordemMenu,asc`. O serviço continua aceitando resposta paginada ou array.

As colunas e informações foram preservadas:

- Título
- Tipo
- Slug/Rota
- Ativa
- Menu
- Home
- Ordem menu
- Ordem Home
- Ações

Os estados explícitos agora diferenciam loading inicial, refresh com dados preservados, erro com retry, acesso restrito, vazio e vazio filtrado. Respostas antigas não sobrescrevem o estado atual.

## Mobile

A listagem mobile usa o mesmo `DataTable` com `appDataTableItem`. Dados, busca, paginação, loading, erro, vazio e ações permanecem em um fluxo único, sem duplicar a árvore de controle.

## PageCard E Footer

`FormPaginaComponent` usa:

- Header `Voltar` por rota.
- `<form id="site-pagina-form">`.
- `footerActions` com `type: 'submit'` e `form: 'site-pagina-form'`.
- Cancelar gerado pelo `PageCard` via `PageFormState.reset()`.
- Sem botão local de cancelar/salvar no corpo.
- Sem `MobileTotalBar`.
- Sem duplicação entre click e `ngSubmit`.

## PageFormState

Criação captura a baseline depois de carregar as próximas ordens assíncronas. Em caso de erro na carga das ordens, `1/1` vira baseline.

Edição captura a baseline após o GET de detalhe. O reset restaura valores sem novo GET e reaplica os estados condicionais:

- HOME mantém `ativa=true` e o controle desabilitado.
- Página de sistema mantém `slug` desabilitado.
- `exibirNaHome=false` mantém campos da Home desabilitados.

## Regras HOME E Sistema

HOME não pode ser desativada, tanto no formulário quanto na listagem.

Páginas de sistema não podem ser excluídas.

Slug de página de sistema não fica editável e o payload preserva o slug atual.

## Menu

Foram preservadas as ações de exibir/ocultar no menu, mover para cima/baixo e chamadas:

- `PATCH /api/site/paginas/:id/menu`
- `PATCH /api/site/paginas/ordem-menu`

A ordenação segue limitada às páginas carregadas na página atual, como já acontecia.

## Home

Foram preservadas as ações de exibir/ocultar na Home, mover para cima/baixo e chamada:

- `PATCH /api/site/paginas/:id/home`
- `PATCH /api/site/paginas/ordem-home`

Campos de resumo da Home são habilitados/desabilitados a partir de `exibirNaHome` sem descartar valores digitados inesperadamente.

## SEO

Campos `seoTitulo` e `seoDescricao` permanecem no formulário, com payload preservado em criação e edição.

## Blocos

`ListarBlocosComponent` foi migrado para `SectionCard + DataTable`, sem paginação porque o endpoint retorna a lista completa.

Foram preservados:

- Preview específico via `BlocoPreviewComponent`.
- Adicionar, editar, ativar/desativar, excluir e reordenar.
- `PATCH /api/site/paginas/:paginaId/blocos/ordem`.
- `PATCH /api/site/paginas/:paginaId/blocos/:blocoId/status`.
- `ConfirmDialog` na exclusão.
- `BlocoImageUploadComponent` como componente específico de conteúdo.

Tipos preservados:

- `TEXTO`
- `IMAGEM`
- `TEXTO_IMAGEM`
- `FAQ`
- `CTA`
- `VIDEO`
- `GALERIA`
- `MAPA`
- `PRODUTOS`
- `CATEGORIAS`
- `MARCAS`

## Dialogs

`FormBlocoComponent` continua como dialog, sem `PageCard` e sem `PageFormState`.

Cancelar fecha o dialog. Salvar mantém validações por tipo, `FAQ` com `FormArray`, upload via `FormData`, parse defensivo de JSON inválido e aviso de GALERIA.

O shell visual compartilhado `dialog-form-shell.scss` foi aplicado.

## Permissões

As permissões de páginas e blocos foram preservadas:

- `SITE_PAGINAS_CADASTRAR`
- `SITE_PAGINAS_EDITAR`
- `SITE_PAGINAS_EXCLUIR`
- `SITE_PAGINA_BLOCOS_VER`
- `SITE_PAGINA_BLOCOS_CADASTRAR`
- `SITE_PAGINA_BLOCOS_EDITAR`
- `SITE_PAGINA_BLOCOS_EXCLUIR`

## Guards

As rotas não foram alteradas. A diferença existente foi preservada:

- `/site/paginas` com `depositoLegadoGuard + permissionGuard`.
- `/site/paginas/nova` e `/site/paginas/editar/:id` com `permissionGuard`.

## Dívidas

- Reordenação de menu/Home/blocos continua baseada somente na lista carregada no cliente. Em páginas paginadas, mover entre páginas diferentes depende de desenho de backend/UX futuro.
- `InputNumerico` e `InputOptions` não foram forçados nos campos atuais porque os controles Material existentes lidam diretamente com `disabled`, `null`, `min` e valores do `mat-select` sem adaptação adicional.
- O build ainda mostra warnings pré-existentes em áreas fora de Meu Site/Páginas, como `pricing`, `pedido`, imports standalone não usados, Sass global e dependências CommonJS.

## Testes Focados

`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/components/page-card/page-card.component.spec.ts' --include='src/app/pages/site/paginas/**/*.spec.ts'`

Resultado: `24 SUCCESS`.

## Suíte Completa

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `516 SUCCESS`.

## Build

`npm run build`

Resultado: sucesso.

## TypeScript

`npx tsc --noEmit -p tsconfig.app.json`

Resultado: sucesso.

## Diff

`git diff --check`

Resultado: sucesso.

## Novas Falhas

Novas falhas: `0`.

Validação visual: pendente de revisão manual pelo responsável do produto.
