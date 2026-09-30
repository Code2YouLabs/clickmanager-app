# Padronização Frontend - Central de Ajuda

Projeto: `clickmanager-app`

Branch: `feature/padronizar-central-ajuda`

SHA base: `90e9d7213e616b0c7a92738c435cfe6cd8e5a962`

Épico: `#79`

## Escopo

Tela migrada:

- `/page/ajuda`

Componente:

- `AjudaComponent`

Não foram alterados:

- backend;
- rota `/page/ajuda`;
- `SHARED_ROUTE_DATA`;
- menu global;
- guards de autenticação, segmento, feature ou permissão.

## Baseline

Antes das alterações, `develop` e `origin/develop` foram confirmados no mesmo SHA:

`90e9d7213e616b0c7a92738c435cfe6cd8e5a962`

Baseline executada antes da alteração:

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `671 SUCCESS`.

Falhas preexistentes: nenhuma.

## Estrutura Final

A tela passou a usar:

- `PageCard` como shell;
- ação de header `Falar com o suporte`;
- `InputPesquisa` para busca local;
- `SectionCard` para a área de guias;
- `MatAccordion` preservado para os tópicos;
- estado vazio com `Limpar busca` e link para `/page/suporte`.

Foram removidos:

- implementação desktop/mobile paralela;
- `HostListener` de resize;
- estado `isMobileView`;
- destaque mobile fixo de SmartCalc;
- atalhos manuais duplicados no template.

A responsividade agora é feita por CSS sobre a mesma árvore de conteúdo.

## Conteúdo e Metadados

O conteúdo foi extraído para:

- `src/app/pages/ajuda/ajuda.models.ts`;
- `src/app/pages/ajuda/ajuda.data.ts`.

Cada tópico pode declarar:

- `allowedEmpresaTipos`;
- `featureKey`;
- `requiredPermissions`;
- `atalhoRapido`;
- `ordemAtalho`;
- `palavrasChave`;
- `aliases`.

Os tópicos rápidos são derivados desses metadados, sem lista paralela.

## Segmentação

A tela continua disponível para Gráfica e Depósito via `SHARED_ROUTE_DATA`.

Segmentação aplicada:

- Gráfica: SmartCalc, produtos gráficos, catálogo técnico, acabamentos, pedidos/status, funcionários, folha e onboarding;
- Depósito: catálogo do depósito e orçamentos do depósito;
- Comum: clientes, notificações, assinatura, conta/permissões e dúvidas rápidas.

Depósito não renderiza tópicos de SmartCalc, produção gráfica, acabamentos ou fluxo gráfico de pedidos.

`AuthService.getTipoEmpresa()` é a fonte usada para resolver o segmento.

## Feature Flags

A tela chama `FeatureFlagService.carregar()` para obter módulos opcionais.

Se uma feature aparece explicitamente como `false`, o tópico é ocultado.

Se a feature não aparece no mapa retornado, o tópico permanece visível quando o segmento permite. Isso evita apagar toda a ajuda caso o endpoint de módulos falhe ou não informe uma chave antiga.

## Busca

A busca local normaliza:

- caixa;
- acentos;
- espaços extras.

Ela pesquisa em:

- título;
- descrição;
- grupo;
- passos;
- títulos internos;
- detalhes;
- palavras-chave;
- aliases.

Quando há um único resultado, a seção é expandida.

## Deep Links

Deep links continuam no formato:

- `/page/ajuda#smartcalc`;
- `/page/ajuda#clientes`;
- `/page/ajuda#catalogo`.

O fragmento só expande tópico visível no contexto atual. Fragmentos ocultos por segmento ou feature são ignorados.

Aliases preservam compatibilidade simples, por exemplo `#catalogo` resolve para `catalogo-deposito` no segmento Depósito.

Cliques nos tópicos rápidos atualizam o fragmento da URL.

## Cobertura

Foram cobertos por testes:

- rota compartilhada sem permissão própria;
- uso de `PageCard`, `SectionCard`, `InputPesquisa` e CTA de suporte;
- segmentação de Depósito removendo SmartCalc/conteúdo gráfico;
- feature flag explicitamente desativada;
- tópicos rápidos derivados dos metadados visíveis;
- busca normalizada;
- busca em detalhes e palavras-chave;
- fragmento invisível ignorado;
- alias de fragmento por segmento;
- atualização de fragmento ao abrir tópico;
- estado vazio com limpar busca e suporte.

## Validações

`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/ajuda/ajuda.component.spec.ts'`

Resultado: `11 SUCCESS`.

`npx tsc --noEmit -p tsconfig.app.json`

Resultado: sucesso.

`npm run build`

Resultado: sucesso. Warnings preexistentes do projeto em pricing, pedido, Sass e dependências CommonJS permanecem.

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `682 SUCCESS`.

## Observações

O conteúdo da Central de Ajuda foi reorganizado para ficar segmentável e manutenível. Textos mais operacionais de alguns tópicos foram consolidados; a revisão final de produto pode expandir cada seção sem alterar o componente, apenas editando `ajuda.data.ts`.

Não foi feita validação visual autenticada no navegador nesta etapa.
