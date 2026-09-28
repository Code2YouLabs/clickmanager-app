# Padronização Meu Site / Banners

Base: `02874b545c1dc6546b971e5bc569078a691edada` (`develop == origin/develop`).
Branch: `feature/padronizar-site-banners`.
Repositório: `clickmanager-app` (`app.clickmanager`).

## Baseline

Antes das alterações, a suíte completa da `develop` atual foi executada em ChromeHeadless.

- Comando: `npm test -- --watch=false --browsers=ChromeHeadless`
- Resultado: 464 executados, 464 passaram, 0 falhas.
- Observação: a primeira tentativa dentro do sandbox falhou por `listen EPERM 0.0.0.0:9876`; a execução válida foi feita fora do sandbox.

## Estrutura Anterior

A listagem usava `mat-card`, `CardHeader`, `InputPesquisa`, `MatTable`, `MatPaginator` e uma segunda estrutura mobile com busca, estados e cards próprios. O formulário já usava `PageCard`, `SectionCard`, inputs compartilhados, `SiteBannerImageUpload` e `BannerPreview`, mas mantinha ações locais desktop e `MobileTotalBar` para mobile.

## Estrutura Final

A listagem usa:

- `PageCard`
- `DataTable`
- `appDataTableCell` para células específicas de Banner
- `appDataTableItem` para manter o card mobile específico com a mesma fonte de dados, busca, paginação e estados
- `StatusBadgeComponent` para `ATIVO` e `INATIVO`

O formulário usa:

- `PageCard`
- `PageFormState`
- `form id="site-banner-form"`
- ação `type="submit"` no footer do `PageCard`
- Cancelar canônico do `PageCard`
- `SectionCard`
- `SiteBannerImageUploadComponent`
- `BannerPreviewComponent`

## Componentes Reutilizados

Foram reutilizados `PageCard`, `DataTable`, `DataTableCellDirective`, `DataTableItemDirective`, `StatusBadgeComponent`, `InputTextoRestrito`, `InputTextarea`, `SectionCard` e `ConfirmDialogComponent`.

## Componentes Específicos Preservados

`SiteBannerImageUploadComponent` e `BannerPreviewComponent` permanecem em `pages/site/banners`, pois são específicos do domínio visual de Banner. Não foi criado componente genérico para imagem de célula, card mobile ou preview.

## Componentes Evoluídos

`StatusBadgeComponent` recebeu suporte genérico a `INATIVO`, completando o par já existente `ATIVO` sem regra específica de Banner.

`SiteBannerImageUploadComponent` recebeu `restaurarSelecao()`, uma API explícita para descartar arquivo temporário e restaurar a imagem atual quando o `PageFormState` executa Cancelar.

## Listagem

A listagem desktop foi migrada para `DataTable`, preservando as colunas Imagem, Título, Ordem, Status, Vigência e Ações.

A imagem continua usando `resolveStorageImageUrl(banner, 'CARD', '')`, com `altText`, fallback com ícone, `loading="lazy"` e `decoding="async"`.

A busca continua sendo do backend por `textoPesquisa`, com debounce único no componente compartilhado. O container apenas recebe `searchChange`, zera `pagina` e consulta o backend.

A paginação continua real no backend, com `page`, `size`, `totalElements` e `sort=ordem,asc`. O serviço mantém compatibilidade com resposta paginada ou array.

Estados explícitos adotados: loading inicial, refreshing com dados preservados, error/retry, forbidden, empty, filtered empty e conteúdo. Respostas antigas são descartadas por sequência de requisição.

## Mobile

O fluxo mobile agora usa a projeção `appDataTableItem`; os cards continuam específicos de Banners, mas consomem a mesma lista, busca, paginação e estados do desktop. Foram preservados imagem, título, vigência, ordem, status, edição, ativar/desativar e exclusão. A reordenação continua sem experiência mobile nova, como antes.

## Reordenação

Foram preservadas as ações de mover para cima e mover para baixo com `PATCH /api/site/banners/ordem`. O cálculo de ordem continua considerando página atual, tamanho da página e índice do item.

Dívida técnica: a reordenação permanece limitada à página atual; mover itens entre páginas continua exigindo desenho de contrato backend/frontend fora deste escopo.

## Status E Exclusão

Ativar/desativar continua usando `PATCH /api/site/banners/:id/status` e exige `SITE_BANNERS_EDITAR`.

Exclusão continua usando `ConfirmDialogComponent`, `DELETE /api/site/banners/:id`, feedback e recarga da listagem, com `SITE_BANNERS_EXCLUIR`.

## Formulário

O formulário preserva os campos de conteúdo, aparência e publicação. `Voltar` permanece como navegação para `/page/site/banners`; `Cancelar` agora descarta alterações via `PageFormState` e permanece na tela.

Na criação, a baseline de Cancelar é capturada depois de `carregarProximaOrdem()` resolver a ordem real. Em falha, o fallback `1` passa a ser a baseline. O arquivo temporário e preview local são descartados.

Na edição, a baseline é capturada após o banner ser carregado. Cancelar restaura campos, status, ordem, vigência, aparência, imagem atual e preview original sem novo GET.

O submit segue um único caminho: `ngSubmit` no form e botão `type="submit" form="site-banner-form"` no footer do `PageCard`. `saving`, `savingText` e `actionsDisabled` são usados no `PageCard`.

## Upload E Preview

O upload preserva JPG, PNG, WEBP, preview local, nome, tamanho, validação de tipo, troca/remover seleção e imagem atual em edição. Criação continua exigindo imagem; edição continua com nova imagem opcional.

O preview preserva imagem, título, subtítulo, descrição, CTA, posição do texto, cor do texto, overlay e opacidade.

## Contratos HTTP

Preservados:

- `GET /api/site/banners` com `textoPesquisa`, `page`, `size`, `sort`
- `POST /api/site/banners` com `FormData`
- `PUT /api/site/banners/:id` com `FormData`
- `PATCH /api/site/banners/:id/status`
- `PATCH /api/site/banners/ordem`
- `DELETE /api/site/banners/:id`

`buscarPorId()` continua localizando o banner via `listar()`. Dívida técnica: endpoint individual seria mais adequado, mas não foi introduzido sem contrato backend comprovado.

## Permissões E Rotas

Preservados `depositoLegadoGuard`, `SHARED_ROUTE_DATA` e as permissões `SITE_BANNERS_VER`, `SITE_BANNERS_CADASTRAR`, `SITE_BANNERS_EDITAR` e `SITE_BANNERS_EXCLUIR`.

## Testes Focados

- Comando: `npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/pages/site/banners/**/*.spec.ts' --include='src/app/pages/site/services/site-banner.service.spec.ts' --include='src/app/components/status-badge/status-badge.component.spec.ts'`
- Resultado: 22 executados, 22 passaram.

Cobertura adicionada: carregamento, busca servidor, paginação/sort, array ou resposta paginada, loading/refreshing/error/forbidden, descarte de resposta obsoleta, imagem/vigência, editar, status, excluir, reordenação, criação, edição, próxima ordem, fallback de ordem, imagem obrigatória/opcional, payload, datas, overlay/opacidade, submit único, dupla submissão, Cancelar em criação/edição, restauração de imagem e `INATIVO` no `StatusBadge`.

## Validação Final

- Suíte completa: `npm test -- --watch=false --browsers=ChromeHeadless` — 486 executados, 486 passaram, 0 falhas.
- Build: `NODE_OPTIONS=--max-old-space-size=8192 npm run build` — exit 0.
- TypeScript: `npx tsc --noEmit -p tsconfig.app.json` — exit 0.
- `git diff --check` — OK.
- Novas falhas: 0.

Observação: `npm run build` dentro do sandbox abortou com exit 134 sem erro Angular/TypeScript no log. A validação efetiva foi repetida fora do sandbox com memória ampliada e concluiu com exit 0. O build manteve warnings preexistentes de templates/SCSS/CommonJS fora do escopo de Banners.

Validação visual: pendente de revisão manual pelo responsável do produto.
