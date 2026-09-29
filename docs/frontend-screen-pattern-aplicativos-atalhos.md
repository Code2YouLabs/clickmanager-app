# Padronização Frontend - Configurações / Aplicativos e atalhos

Projeto: `clickmanager-app`

Branch: `feature/padronizar-aplicativos-atalhos`

SHA base: `9cf93d0c5051cf5ea19d696f4685e9079d54e085`

Épico: `#79`

## Escopo

Tela migrada:

- `/page/config/aplicativos-atalhos`

Componente:

- `AplicativosAtalhosComponent`

Serviço preservado:

- `ConfiguracaoAplicativosService`

Modelos preservados:

- `ConfiguracaoAplicativos`
- `AplicativoEmpresa`
- `AtalhoEmpresa`

Contratos HTTP preservados:

- `GET api/configuracoes/aplicativos`
- `PUT api/configuracoes/aplicativos`

Não foram alterados:

- backend;
- rota `/page/config/aplicativos-atalhos`;
- `permissionGuard`;
- permissão de acesso da rota;
- campos persistidos de atalhos.

## Baseline

Antes das alterações, `develop` e `origin/develop` foram confirmados no mesmo SHA:

`9cf93d0c5051cf5ea19d696f4685e9079d54e085`

Baseline executada antes da alteração:

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `618 SUCCESS`.

Falhas preexistentes: nenhuma.

## Estrutura Final

A tela passou a usar:

- `PageCard` como shell, header, conteúdo e footer;
- `SectionCard` para as seções `Atalhos` e `Aplicativos`;
- `PageFormState` para o ciclo de edição/cancelamento;
- estados explícitos de loading, erro com retry e acesso restrito.

Não foram criados:

- componente novo;
- shell novo;
- footer novo;
- botão local de salvar;
- handler local de cancelar;
- fluxo mobile paralelo.

## PageCard

O header usa:

- título: `Aplicativos e atalhos`;
- subtítulo: `Configure os links de trabalho exibidos como atalhos.`

O footer é do `PageCard`:

- `Cancelar` gerado pelo `PageFormState`;
- `Salvar` via `PageCardAction` submit;
- `form="aplicativos-atalhos-form"`;
- sem botão local de salvar;
- sem handler local de cancelar.

O submit principal acontece apenas por:

`<form id="aplicativos-atalhos-form" [formGroup]="form" (ngSubmit)="salvar()">`

## PageFormState

A tela usa `PageFormState` em modo `edit`.

Fluxo:

- `begin('edit')` antes do GET;
- `loaded()` depois do carregamento;
- `reset()` pelo Cancelar do `PageCard`;
- sem novo GET ao cancelar;
- sem navegação ao cancelar.

Cancelar restaura a estrutura completa do formulário, incluindo itens adicionados ou removidos no `FormArray` de atalhos.

## Aplicativos

A regra de segmento foi centralizada no catálogo de aplicativos.

Catálogo configurável:

- `SMARTCALC` para `TipoEmpresa.GRAFICA`;
- `CALCULADORA_REVESTIMENTO` para `TipoEmpresa.DEPOSITO`.

`SMARTCALC_CONFIG` permanece apenas no tipo legado para compatibilidade com payloads antigos, mas não é item configurável:

- não aparece na tela de aplicativos e atalhos;
- não aparece no launcher do header;
- não é reenviado no payload da tela.

O launcher do header passou a usar a mesma regra central, combinando:

- preferência da empresa;
- módulo habilitado;
- permissão;
- segmento da empresa.

## Calculadora De Materiais

A entrada `Calculadora de Materiais` no menu lateral de Configurações foi auditada.

Resultado:

- rota preservada em `/page/calculadora-materiais`;
- `DEPOSITO_ROUTE_DATA` preservado na rota;
- item do menu restrito a `TipoEmpresa.DEPOSITO`.

## Atalhos

Campos preservados no payload:

- `id`;
- `nome`;
- `url`;
- `novaAba`;
- `ativo`;
- `ordem`.

Não foram criados controles novos para os campos ocultos:

- `ativo`;
- `ordem`.

Regras preservadas ou ajustadas:

- carrega atalhos em ordem crescente;
- novo atalho recebe `última ordem + 1`;
- remoção reordena a lista para `1..N`;
- remover não exibe confirmação;
- erro ao salvar preserva dados digitados;
- erro ao carregar não renderiza formulário vazio.

## Payload

O `PUT` continua enviando o objeto `ConfiguracaoAplicativos`.

Como o endpoint pode ser substitutivo, a tela preserva aplicativos recebidos do backend que não estão visíveis no segmento atual.

Exceção:

- `SMARTCALC_CONFIG` não é reenviado como aplicativo configurável.

## Permissões

Usuários sem permissão de edição:

- visualizam os dados carregados;
- veem a mensagem `Você pode visualizar estas configurações, mas não possui permissão para editar.`;
- ficam com o formulário desabilitado;
- não veem footer de edição;
- não conseguem adicionar, remover ou alternar aplicativos/atalhos.

Erro `403` no carregamento exibe estado explícito de acesso restrito dentro do `PageCard`.

## Cobertura

Foram cobertos por testes:

- catálogo sem `SMARTCALC_CONFIG`;
- segmentação de aplicativos;
- regra usada pelo launcher/header via helper central;
- preferência, módulo, permissão e segmento;
- menu de `Calculadora de Materiais` restrito a Depósito;
- tela com `PageCard`, `SectionCard`, footer submit e `form`;
- loading/error/retry/forbidden;
- formulário read-only;
- cancelamento restaurando estrutura de `FormArray`;
- payload preservando aplicativos invisíveis e removendo `SMARTCALC_CONFIG`;
- ordenação, adição, remoção e reordenação de atalhos;
- baseline após save;
- erro no save preservando dados.

## Validações

`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/models/config/configuracao-aplicativos.model.spec.ts' --include='src/app/pages/config/aplicativos-atalhos/aplicativos-atalhos.component.spec.ts' --include='src/app/layouts/full/vertical/sidebar/sidebar-menu.spec.ts'`

Resultado: `22 SUCCESS`.

`npx tsc --noEmit -p tsconfig.app.json`

Resultado: sucesso.

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `631 SUCCESS`.

`npm run build`

Resultado: sucesso. Permanecem warnings preexistentes fora do escopo desta tela, incluindo optional/nullish chains, imports não utilizados, avisos Sass e dependências CommonJS.

`git diff --check`

Resultado: sucesso.

Validação visual: pendente de revisão manual pelo responsável do produto.
