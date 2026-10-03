# Padronização Frontend - Dashboard principal da Gráfica

Projeto: `clickmanager-app`

Branch: `feature/padronizar-dashboard-grafica`

SHA base: `90e9d7213e616b0c7a92738c435cfe6cd8e5a962`

Épico: `#79`

## Escopo

Tela migrada:

- `/dashboards/dashboard1`

Componentes ajustados:

- `AppDashboard1Component`
- `AppComparativoPedidosComponent`
- `AppStatusGridComponent`
- `AppReceitaResumoComponent`

Serviço preservado:

- `DashboardService`

Contratos HTTP preservados:

- `GET api/grafica/dashboard/visao-geral`
- `GET api/grafica/dashboard/comparativo`
- `GET api/grafica/dashboard/resumo`
- `GET api/grafica/dashboard/receita-resumo`

Não foram alterados:

- backend;
- rotas do dashboard;
- guard de tipo de empresa;
- endpoints;
- query params do gráfico detalhado;
- ordem canônica dos status de pedidos e orçamentos.

## Baseline

Antes das alterações, `develop` e `origin/develop` foram confirmados no mesmo SHA:

`90e9d7213e616b0c7a92738c435cfe6cd8e5a962`

Baseline executada antes da alteração:

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `671 SUCCESS`.

Falhas preexistentes: nenhuma.

## Estrutura Final

A tela mantém o dashboard como experiência principal e usa:

- `PageCard` como shell único;
- `SectionCard` para blocos de conteúdo;
- `MetricCard` para KPIs;
- ação `Atualizar` no header do `PageCard`;
- ação `Novo pedido` no header somente quando o usuário tem acesso pela mesma regra das rotas;
- grid principal com evolução comercial e atalhos;
- grid secundário com status e receita por forma de pagamento.

Foi removido o `mat-card` interno do comparativo para evitar card dentro de card dentro da `SectionCard`.

## Header E Refresh

O botão `Atualizar` agora dispara:

- atualização da visão geral;
- atualização do comparativo;
- atualização dos status;
- atualização da receita.

O botão fica pendente enquanto qualquer widget ainda estiver em refresh.

Refresh preserva dados carregados anteriormente. Quando uma atualização falha, a tela exibe mensagem recuperável e mantém a última versão válida.

## KPIs

KPIs preservados:

- Receita do mês;
- Pedidos;
- Orçamentos;
- Rascunhos.

Cada KPI só é clicável quando o usuário possui acesso equivalente à rota de destino.

Se o usuário não possui acesso, o KPI continua visível como indicador, mas não é renderizado como botão.

Rotas preservadas:

- Receita: `/dashboards/dashboard1/grafico?tipo=receita`
- Pedidos: `/page/grafica/comercial-beta/pedidos`
- Orçamentos: `/page/grafica/comercial-beta/orcamentos`
- Rascunhos: `/page/grafica/comercial-beta/rascunhos`

## Atalhos

Atalhos preservados e filtrados:

- Novo pedido;
- Rascunhos;
- SmartCalc.

SmartCalc respeita:

- feature flag `SMARTCALC`;
- permissão `SMARTCALC_USAR`.

Os demais atalhos usam a mesma semântica do `permissionGuard`: pelo menos uma permissão declarada na rota.

## Comparativo

O componente preserva:

- filtros de mês A;
- mês B;
- ano;
- modo quantidade/receita;
- gráfico Apex;
- CTA para gráfico detalhado;
- query params `tipo`, `mesA`, `mesB`, `ano`, `modo`.

Estados adicionados:

- loading inicial;
- refreshing;
- erro recuperável com retry.

Concorrência:

- cada request recebe uma geração;
- resposta antiga é ignorada quando outro filtro ou refresh já iniciou request mais recente.

O `HostListener('window:resize')` foi preservado porque o ApexChart precisa de refresh manual após mudanças de layout.

## Status

Status de pedidos preservados:

- `AGUARDANDO_PAGAMENTO`
- `PENDENTE`
- `EM_PRODUCAO`
- `PRONTO`
- `ENTREGUE`

Status de orçamentos preservados:

- `ABERTO`
- `ENVIADO`
- `APROVADO`
- `RECUSADO`
- `VENCIDO`
- `CANCELADO`

Estados adicionados:

- loading inicial;
- refreshing;
- erro recuperável com retry.

Navegação preservada com query param `status`.

## Receita

O widget foi renomeado visualmente para:

- título: `Receita por forma de pagamento`;
- subtítulo: `Acompanhe os recebimentos por período.`

O período padrão deixou de aparecer como `Hoje`, porque o request usa `MES_ATUAL`.

Rótulos atuais:

- Mês atual;
- 30 dias;
- Mês passado;
- Ano.

Contrato preservado:

- query param do gráfico detalhado: `periodo=mes_atual`, `ultimos_30`, `mes_passado` ou `ytd`.

Formas de pagamento preservadas:

- Pix;
- Dinheiro;
- Cartão Crédito;
- Cartão Débito;
- Depósito;
- Boleto.

Empty state de receita zerada foi preservado como dado válido, separado de erro técnico.

## Estados

Estados explícitos da tela:

- loading inicial da visão geral;
- refreshing da visão geral;
- erro inicial bloqueante da visão geral;
- erro de atualização com dados anteriores preservados;
- loading/refreshing/erro por widget.

Não há fallback para dados mockados.

## Testes Adicionados

Arquivos:

- `src/app/pages/dashboards/dashboard1/dashboard1.component.spec.ts`
- `src/app/components/dashboard1/comparativo-pedidos/comparativo-pedidos.component.spec.ts`
- `src/app/components/dashboard1/status-grid/status-grid.component.spec.ts`
- `src/app/components/dashboard1/receita-resumo/receita-resumo.component.spec.ts`

Cobertura:

- permissões/features de atalhos e KPIs;
- refresh coordenado do header;
- preservação de dados em falha de atualização;
- proteção contra resposta antiga;
- contratos de query params;
- ordem canônica dos status;
- correção do rótulo de período da receita.

## Validação

Validação focada executada:

`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/dashboards/dashboard1/dashboard1.component.spec.ts' --include='src/app/components/dashboard1/**/*.spec.ts'`

Resultado: `12 SUCCESS`.

Validação completa executada:

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `683 SUCCESS`.

`npm run build`

Resultado: sucesso, com warnings preexistentes de Angular/Sass/CommonJS.

`npx tsc --noEmit -p tsconfig.app.json`

Resultado: sucesso.

`git diff --check`

Resultado: sucesso.

Validação visual: pendente de revisão manual pelo responsável do produto.
