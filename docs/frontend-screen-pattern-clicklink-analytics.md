# Padronização Frontend - ClickLink / Analytics

Projeto: `clickmanager-app`

Branch: `feature/padronizar-clicklink-analytics`

SHA base: `d6cdb5f75280a73164525a14269c1c345a711901`

Épico: `#79`

## Baseline

Antes da alteração, a suíte Angular completa foi executada em `develop`:

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `528 SUCCESS`.

## Componentes Reutilizados

- `PageCard` para o cabeçalho e estados gerais da tela.
- `MetricCard` para os indicadores de visualizações, cliques e taxa de clique.
- `SectionCard` para agrupar a área de desempenho dos links.
- `DataTable` e `DataTableCellDirective` para o ranking de links.
- `InputOptions` para seleção da página ClickLink analisada.

## Shared

Nenhum componente compartilhado foi alterado nesta etapa.

A tela usa os componentes compartilhados sem criar componente novo específico ou global.

## Tela

`/page/links/analytics` foi migrada de composição local com cards/tabela manual para `PageCard -> MetricCard -> SectionCard -> DataTable`.

Os endpoints foram preservados:

- `GET /api/links/paginas`
- `GET /api/links/paginas/:paginaId/analytics?periodo=7d|30d`

Os filtros preservam os períodos aceitos pelo backend:

- `7d`
- `30d`

## Estados

A tela diferencia estados de páginas e analytics:

- Loading inicial das páginas.
- Erro ao carregar páginas com retry.
- Acesso restrito para páginas.
- Lista vazia de páginas.
- Loading das métricas da página selecionada.
- Erro ao carregar métricas com retry.
- Acesso restrito para métricas.
- Ranking vazio para período sem cliques.

O carregamento de páginas e métricas usa fluxos separados para manter retry localizado. Respostas antigas de páginas ou analytics não sobrescrevem a seleção atual.

## Ranking

O ranking usa `DataTable` com a mesma fonte de dados em desktop e mobile, sem lista paralela específica.

As colunas exibidas são:

- Link
- Tipo
- Cliques

A coluna percentual não foi mantida na tabela porque a tela padronizada prioriza o ranking por cliques do período.

## Permissões

As permissões de ClickLink foram preservadas:

- `LINKS_VER`

## Guards

As rotas não foram alteradas. Foram preservados `depositoLegadoGuard`, `permissionGuard`, `featureKey: LINKS` e as permissões declaradas por rota.

## Dívidas

- A seleção de página usa as opções retornadas por `GET /api/links/paginas`; não há busca remota porque o contrato atual retorna lista simples.
- O ranking segue sem paginação porque o endpoint de analytics retorna lista agregada do período.

## Testes Focados

`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/links/pages/analytics/links-analytics.component.spec.ts'`

Resultado: `15 SUCCESS`.

## Validações Finais

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `540 SUCCESS`.

`npm run build`

Resultado: sucesso. O build mantém warnings pré-existentes em áreas fora do escopo e dependências CommonJS.

`npx tsc --noEmit -p tsconfig.app.json`

Resultado: sucesso.

`git diff --check`

Resultado: sucesso.

## Novas Falhas

Novas falhas: `0`.

Validação visual: pendente de revisão manual pelo responsável do produto.
