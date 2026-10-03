# Padronização Frontend - ClickLink / Páginas

Projeto: `clickmanager-app`

Branch: `feature/padronizar-clicklink-paginas`

SHA base: `621dbc3d328e1e5cd36ccc4968e737ba707e1967`

Épico: `#79`

## Baseline

Antes da alteração, a suíte Angular completa foi executada em `develop`:

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `528 SUCCESS`.

## Componentes Reutilizados

- `PageCard` para cabeçalho, ação de voltar, estados de página e rodapé padronizado.
- `PageFormState` para descarte de alterações via Cancelar sem handler local.
- `SectionCard` para as seções do editor.
- `DataTable`, `DataTableCellDirective` e `appDataTableItem` para listagem desktop/mobile de páginas e itens.
- `ListFilterBar` indiretamente pelo `DataTable`, mantendo os estados compartilhados.
- `InputTextoRestrito` e `InputTextarea` nos campos textuais compatíveis.
- `ConfirmDialog` para exclusões.
- Dialogs e preview específicos de ClickLink preservados.

## Shared

Nenhum componente compartilhado foi alterado nesta etapa.

O contrato atual do `PageCard` foi seguido: ações `type: 'submit'` usam o botão padronizado `Salvar` com ícone `save`, enquanto Cancelar é gerado pelo próprio `PageCard` quando recebe `formState`.

## Listagem

`/page/links/paginas` foi migrada de `mat-card + CardHeader + MatTable + menu manual + bloco mobile separado` para `PageCard -> DataTable`.

O endpoint foi preservado:

- `GET /api/links/paginas`

Como o backend retorna array sem paginação e sem busca, a tela mantém `search` desabilitado e `pagination=null`.

As colunas e informações foram preservadas:

- Título
- Endereço público
- Status
- Principal
- Quantidade de links
- Ações

Os estados explícitos agora diferenciam loading inicial, refresh com dados preservados, erro com retry, acesso restrito e vazio. Respostas antigas não sobrescrevem o estado atual.

## Mobile

A listagem mobile usa o mesmo `DataTable` com `appDataTableItem`. Dados, loading, erro, vazio e ações permanecem em um fluxo único, sem duplicar regras de renderização.

## Ações Da Listagem

Foram preservadas as ações:

- Editar
- Compartilhar
- Abrir página publicada
- Publicar
- Tornar principal
- Despublicar
- Excluir

As permissões continuam controlando visibilidade das ações. Ações em execução desabilitam somente a linha afetada via `executandoId`.

## Editor

`/page/links/nova` e `/page/links/:id` usam:

- Header `Voltar` por rota.
- `<form id="clicklink-page-form">`.
- `footerActions` com `type: 'submit'` e `form: 'clicklink-page-form'`.
- Cancelar gerado pelo `PageCard` via `PageFormState.reset()`.
- Sem botão local de cancelar/salvar no corpo.
- Sem submit alternativo nas abas internas.

Em criação, a baseline do Cancelar é capturada depois de carregar a identidade pública e aplicar os defaults, inclusive o título sugerido pelo nome público da empresa.

Em edição, a baseline é capturada após o GET de detalhe e atualizada depois de cada salvamento bem-sucedido.

## Publicação

O fluxo de publicação foi preservado:

- Página sem slug público não publica.
- Se houver alterações no formulário, a tela salva antes de publicar.
- Após salvar antes de publicar, a baseline do Cancelar é atualizada com os dados persistidos.
- Tornar principal exige página publicada.

## Itens

A aba Links foi migrada para `SectionCard + DataTable`.

Foram preservadas as ações:

- Adicionar link
- Editar link
- Ativar/desativar link
- Remover link
- Mover para cima
- Mover para baixo
- Importar sugestões da empresa

As operações de itens continuam sendo salvas individualmente e mantêm o usuário na aba Links.

## Compartilhar E Preview

A aba Compartilhar continua usando `LinksSharePanelComponent`.

Na criação, as abas Links e Compartilhar permanecem acessíveis, mas orientam o usuário a usar o botão Salvar do rodapé compartilhado.

O preview mobile continua disponível por dialog e, na aba Aparência, também por preview inline compacto.

## Permissões

As permissões de ClickLink foram preservadas:

- `LINKS_VER`
- `LINKS_CADASTRAR`
- `LINKS_EDITAR`
- `LINKS_PUBLICAR`
- `LINKS_EXCLUIR`

## Guards

As rotas não foram alteradas. Foram preservados `depositoLegadoGuard`, `permissionGuard`, `featureKey: LINKS` e as permissões declaradas por rota.

## Dívidas

- A listagem de páginas ClickLink continua sem busca e sem paginação porque o endpoint atual retorna lista simples.
- `InputOptions` não foi forçado nos selects/botões de aparência porque os controles Material atuais preservam diretamente os tipos e integrações existentes.
- Dialogs específicos de criação/edição de item permanecem como dialogs, sem `PageCard` e sem `PageFormState`.

## Testes Focados

`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/links/**/*.spec.ts'`

Resultado: `44 SUCCESS`.

## Validações Finais

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `528 SUCCESS`.

`npm run build`

Resultado: sucesso. O build mantém warnings pré-existentes em áreas fora do escopo e dependências CommonJS.

`npx tsc --noEmit -p tsconfig.app.json`

Resultado: sucesso.

`git diff --check`

Resultado: sucesso.

## Novas Falhas

Novas falhas: `0`.

Validação visual: pendente de revisão manual pelo responsável do produto.
