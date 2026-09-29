# Padronização Frontend - Configurações / Minha assinatura

Projeto: `clickmanager-app`

Branch: `feature/padronizar-minha-assinatura`

SHA base: `a579a9b5b27efdbff7106dee22e4a4664cb05b1a`

Épico: `#79`

## Escopo

Tela migrada:

- `/billing/minha-assinatura`

Componente:

- `MinhaAssinaturaComponent`

Serviços preservados:

- `BillingService`
- `BillingStateService`
- `AuthService`

Contratos HTTP preservados:

- `GET api/billing/assinatura/resumo`
- `GET api/billing/access-status`

Não foram alterados:

- `/billing/pagamento`
- `/billing/blocked`
- `/billing/return`
- `/billing/confirmacao`
- interceptors de billing
- backend

## Base

Antes da criação da branch, `develop`, `origin/develop` e `HEAD` foram confirmados no SHA:

`a579a9b5b27efdbff7106dee22e4a4664cb05b1a`

Foram consultados:

- issue `#79`
- issue `#85`
- issue `#86`
- `docs/frontend-screen-pattern-audit.md`
- `docs/frontend-screen-pattern-foundation.md`
- documentações recentes de migração presentes na `develop`

## Estrutura Final

A tela passou a usar:

- `PageCard` como shell, header e estados.
- `MetricCard` para os quatro indicadores principais.
- `SectionCard` para Informações da assinatura, Recursos do plano e Histórico de pagamentos.
- `DataTable` para o histórico de pagamentos.
- `appDataTableCell` para renderização específica das colunas.
- `appDataTableItem` para apresentação mobile do histórico.

Não foi usado:

- `PageFormState`
- footer de `PageCard`
- Cancelar
- Salvar

A tela é somente consulta.

## Acesso

Preservada a defesa adicional por proprietário dentro do componente.

Usuário não proprietário:

- não chama `resumoAssinatura()`;
- não chama `obterStatus()`;
- exibe estado explícito de acesso restrito dentro do `PageCard`.

Mensagem preservada:

`Somente o proprietário pode visualizar os dados da assinatura.`

## Carregamento E Erro

O carregamento continua usando:

`forkJoin({ resumo, access })`

Após `obterStatus()`, continua sendo chamado:

`billingState.setFromResponse(access)`

Estados explícitos:

- loading;
- restricted;
- error com retry;
- content.

Erro mostra:

`Não foi possível carregar a assinatura.`

O retry executa novamente resumo e status, sem reload da página e sem navegação automática.

Emissões equivalentes de `usuario$` não disparam novas chamadas desnecessárias.

## Alerta De Cobrança

Preservados:

- `mostrarAlertaCobranca`;
- `alertTitle`;
- `alertSubtitle`;
- `urgencyBadge`;
- `dueLabel`;
- `mostrarAcaoRegularizacao`.

Estados preservados:

- Assinatura suspensa;
- Pagamento pendente;
- Cobrança próxima.

A ação `Regularizar agora` permanece no alerta quando aplicável.

Destino preservado:

- `/billing/pagamento`

## Header

O header do `PageCard` usa:

- título: `Minha assinatura`
- subtítulo: `Consulte seu plano, cobrança e histórico de pagamentos.`

A ação do header é preservada para proprietário:

- `TRIAL*` -> `Escolher plano`
- demais -> `Trocar plano`

Destino:

- `/billing/pagamento`

## Visão Geral

Os KPIs locais foram substituídos por `MetricCard`.

Indicadores preservados:

- Status;
- Próxima cobrança;
- Valor;
- Cliente desde.

Formatações preservadas:

- datas em `dd/MM/yyyy`;
- moeda em `pt-BR`;
- moeda usando `resumo.moeda || 'BRL'`.

Informações preservadas:

- Plano;
- Código do plano;
- Periodicidade;
- Início;
- Fim;
- E-mail de cobrança;
- Vencimento.

## Status Da Assinatura

Preservada a lógica conceitual de:

- `statusAssinatura`;
- `situacaoAssinatura`;
- `classeStatus`.

O `StatusBadge` foi avaliado, mas não foi ampliado nesta etapa porque os estados de cobrança/pagamento possuem semântica específica (`CHARGEBACK`, `ESTORNADO`) e a orientação era não contaminar shared com lógica de billing.

## Recursos Do Plano

`beneficiosJson` e `limitesJson` continuam tolerantes a:

- array;
- string JSON;
- objeto JSON para limites;
- JSON inválido.

JSON inválido retorna lista vazia e não quebra a tela.

## Histórico De Pagamentos

O histórico foi migrado de `MatTable` local para `DataTable`.

Não foram criados:

- busca;
- filtros;
- endpoint novo;
- paginação server-side;
- paginação local.

Colunas preservadas:

- Valor;
- Forma;
- Criado;
- Confirmado;
- Status;
- Referência;
- Link.

Forma continua usando:

`resumo.gateway || 'Gateway'`

Ordenação preservada:

1. `PENDENTE` primeiro;
2. depois `criadoEm` decrescente.

Status preservados:

- `PENDENTE` -> `Pendente`
- `APROVADO` -> `Aprovado`
- `RECUSADO` -> `Recusado`
- `CANCELADO` -> `Cancelado`
- `ESTORNADO` -> `Estornado`
- `CHARGEBACK` -> `Chargeback`
- desconhecido -> valor retornado
- vazio -> `—`

Pagamentos pendentes exibem texto estrutural `Cobrança pendente`, além do badge visual.

## Abrir Cobrança

A ação `Abrir cobrança` aparece somente quando:

- `invoiceUrl` existe;
- `status = PENDENTE`.

Pagamentos aprovados ou em outros estados não mostram o link, mesmo quando possuem URL.

`window.open` passou a usar:

`noopener,noreferrer`

sem alterar a URL recebida do backend.

## Estados Zero E Null

Preservado tratamento de:

- `valor = 0`;
- `pagamentos = []`;
- `beneficios = []`;
- `limites = []`;
- `proximaCobrancaEm = null`;
- `fim = null`;
- `confirmadoEm = null`;
- `referenciaExterna = null`.

Valor zero não é tratado como ausência.

## Testes

Foram adicionados testes focados para:

- usuário não proprietário não carregar billing;
- emissões equivalentes do proprietário não duplicarem requests;
- erro com retry;
- tolerância a JSON inválido;
- ordenação de pagamentos com pendentes primeiro;
- link de cobrança somente para pendente;
- abertura externa com `noopener,noreferrer`.

## Validações

`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/billing/minha-assinatura/minha-assinatura.component.spec.ts'`

Resultado: `6 SUCCESS`.

`npx tsc --noEmit -p tsconfig.app.json`

Resultado: sucesso.

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `610 SUCCESS`.

`npm run build`

Resultado: sucesso. Permanecem avisos preexistentes fora do escopo desta tela, incluindo avisos de Sass/Material, dependências CommonJS e importações/optional chains em componentes compartilhados ou telas não alteradas nesta etapa.

Validação visual: pendente de revisão manual pelo responsável do produto.
