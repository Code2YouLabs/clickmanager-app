# Refinamento final da Visão geral do ClickWhatsApp

## Base e auditoria

Branch `feature/clickwhatsapp-visao-geral-refino`, criada com árvore limpa a partir de `2ec691f`, da branch `feature/clickwhatsapp-visao-geral-ux`. O refinamento preserva a organização aprovada. Backend permanece em `feature/clickwhatsapp-conversas-ux`, HEAD `6346a1f0`, sem alterações.

Foram revisados ClickWhatsAppPage e seus arquivos separados de template, estilos e testes, MetricCardComponent, StatusBadgeComponent, PageCard, DTOs de configuração/resumo, filtros e investigação existentes. Os contratos GET de configuração, resumo e ocorrências e o service HTTP permanecem intactos. As ações e estados continuam vindo do backend.

## Apresentação

Situação do ClickWhatsApp mantém o título, o acesso a Configurações e um estado principal. Descrições curtas são apresentadas quando orientam uma ação, como verificar a conexão ou ativar o recurso. A situação conectada evita repetir uma descrição que já aparece no título.

Os três estados usam o StatusBadgeComponent compartilhado, sem mudanças nesse componente:

- Habilitação empresarial, com Habilitado ou Desativado.
- Estado da conexão, incluindo Conexão desconhecida, sem convertê-la em desconexão.
- Preferência, com Envios permitidos, Envios pausados, Envios indisponíveis ou Envios em quarentena, conforme o DTO.

A disponibilidade do processamento continua distinta da preferência. O tooltip acessível explica essa relação. Os badges possuem contexto acessível por aria-label e as explicações podem ser consultadas com foco de teclado. Em quarentena, a orientação é consultar ocorrências, preservando a distinção em relação a uma pausa comum. Nenhuma ação de retomada ou liberação foi adicionada.

Mensagens, Aceitas, Entregues e Lidas continuam na mesma ordem e com os mesmos dados. MetricCardComponent foi reutilizado sem alterar seu arquivo ou padrão global. A retirada do accentColor local remove a borda lateral azul e usa a borda sutil do estilo padrão compartilhado. Número, label, ícone discreto e semântica cumulativa foram preservados.

Falhas, Na fila agora e Incertas agora permanecem como indicadores operacionais, com as descrições existentes e destaque condicional. Consultar ocorrências continua junto ao título, mesmo sem pendências. O alerta contextual e a investigação mantêm seus contratos e comportamento.

O link isolado Ver mensagens foi removido do rodapé. A rota e a navegação principal para Mensagens continuam disponíveis. O aviso excepcional de solicitação pendente mantém sua recuperação em Mensagens.

## Período e atualização

Hoje, Últimos 7 dias, Últimos 30 dias e Personalizar preservam o seletor Material e seu comportamento. Não há mudança na consulta, limite de 93 dias, fuso de Brasília, fim exclusivo, cancelamento de respostas antigas, loading ou tratamento de erros.

A apresentação permanente passa a ser “Atualizado em DD/MM/AAAA às HH:mm”, usando calculadoEm retornado pela API, sem usar o relógio do navegador como atualização fictícia.

Períodos predefinidos deixam de mostrar o intervalo técnico na página. O botão Consultar limites do período, com nome acessível, oferece os instantes exatos e o fuso por tooltip. Personalizar mantém as datas/horas retornadas visíveis em uma linha compacta e conserva a mesma inspeção dos limites.

Erros não viram zero e resultados anteriores permanecem com o aviso de dados mantidos, conforme a implementação anterior. Autorização, bloqueio de aplicação, ausência de conexão e estados técnicos permanecem independentes.

## Espaçamento e responsividade

Os estilos novos se restringem ao conteúdo da Visão geral, sob a classe condicional painel-visao. O espaço inicial foi reduzido usando os incrementos de 16 px no desktop e 8 px no mobile já empregados pelo projeto. A Situação operacional deixa de reservar padding e separador inferiores redundantes. O espaçamento entre seções, áreas de ação, header mobile e safe areas continuam os existentes.

Os badges usam quebra de linha e limite de largura, sem cards separados. Os quatro KPIs preservam quatro colunas no desktop e duas no mobile. O botão de inspeção tem área de 44 px no mobile. Não foram alterados PageCard, componentes globais, header, sidebar, navegação inferior ou estilos de assinatura.

## Arquivos e componentes

Alterados somente os quatro arquivos de ClickWhatsAppPage (`.ts`, `.html`, `.scss`, `.spec.ts`) e este relatório. Não foi criado componente de KPI ou serviço adicional. Reutilizados PageCard, StatusBadge, MetricCard, MatTooltip, seletor Material, filtros de datas e investigação existentes. Os componentes compartilhados não foram modificados.

Os métodos novos são exclusivamente rótulos de apresentação. Não alteram preferências, autorização, conexão, mensagens ou cálculo de indicadores. Nenhuma chamada HTTP foi acrescentada pelo refinamento.

## Verificação

Com Node 22.22.3 na raiz do app:

```sh
NODE_OPTIONS=--max-old-space-size=4096 NG_BUILD_MAX_WORKERS=1 node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless --include='src/app/pages/clickwhatsapp/**/*.spec.ts'
NODE_OPTIONS=--max-old-space-size=4096 NG_BUILD_MAX_WORKERS=1 node node_modules/@angular/cli/bin/ng.js build --configuration production --output-path=/private/tmp/cw-visao-refino-build-final
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
git diff --check
```

Resultado final: **110 testes aprovados**, incluindo cinco novos casos do refinamento. As expectativas de textos/links substituídos foram atualizadas, preservando os testes funcionais anteriores. Nenhum teste de outro módulo foi alterado.

Os novos testes cobrem três badges e tooltip acessível, atualização efetiva sem intervalo permanente, inspeção dos limites, datas personalizadas, preferência pausada e distinção de quarentena. A suíte existente mantém os quatro KPIs, os três indicadores operacionais, cumulatividade, períodos rápidos e personalizados, limite de 93 dias, concorrência, loading, falhas, permissões, ocorrências, investigação e navegação das demais áreas.

Build de produção, TypeScript e diff check aprovados. Os avisos de compilação permanecem em arquivos fora do escopo, incluindo templates/imports existentes, Sass e dependências CommonJS. Não houve mudança em componentes compartilhados que exigisse alterar seus testes.

## Evidências e pendências

A comparação usa o build anterior da base `2ec691f` e o build refinado, servidos localmente com Chromium e APIs totalmente simuladas. Dados e identidade são fictícios. As capturas abrangem 1440, 1024, 820, 390 e 360 px, incluindo conectado, desconhecido, desativado, pausa, valores/zeros, ocorrências e ausência de alertas, Personalizar, loading, erros e acesso restrito.

A verificação confirma três badges e sete indicadores, ausência do link redundante, ocultação do intervalo para períodos predefinidos, datas visíveis ao personalizar e ausência de overflow horizontal. Texto, posição, dimensões, fonte, padding e fundo do aviso de assinatura são comparados antes/depois, sem diferença. O navegador também percorreu a ordem de foco com Tab e confirmou a abertura visual do tooltip de limites em 1440 e 360 px. `verificacoes.json` registra as comparações e as chamadas simuladas.

Evidências em `/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-visao-geral-refino/`.

- [Antes, desktop](/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-visao-geral-refino/antes-1440.png).
- [Depois, desktop](/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-visao-geral-refino/conectado-1440.png).
- [Depois, mobile](/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-visao-geral-refino/conectado-390.png).

Leitor de tela e teclado físico em Android/iOS permanecem pendentes de validação em aparelhos reais. A navegação Material e os nomes/foco/descrições acessíveis foram preservados. Não foi realizada homologação contra backend ou provedor reais nesta revisão visual.

## Preservação expressa

Nenhum contrato foi alterado. Nenhuma funcionalidade foi removida indevidamente. Mensagens, Automações, Configurações e investigação continuam com seus comportamentos existentes. Nenhuma mensagem foi enviada. Nenhum QR real, conexão ou logout foi executado. Nenhuma chamada remota à Evolution foi realizada. Backend, banco, migrations, `.env`, infraestrutura, workers, automações, mensagens, cobrança e assinaturas não foram alterados. Aviso de validade completamente intacto. Sem push, merge ou deploy.
