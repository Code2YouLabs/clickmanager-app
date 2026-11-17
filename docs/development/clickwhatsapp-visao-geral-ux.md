# Visão geral operacional do ClickWhatsApp

## Base e auditoria

Branch `feature/clickwhatsapp-visao-geral-ux`, criada com árvore limpa a partir de `13c965c`, da branch `feature/clickwhatsapp-configuracoes-ux`. Backend conferido em `feature/clickwhatsapp-conversas-ux`, HEAD `6346a1f0`, sem alterações.

A rota `/page/clickwhatsapp` usa a área `visao` de ClickWhatsAppPage. Mensagens, Automações e Configurações continuam usando suas áreas existentes. Foram revisados PageCard, SectionCard, MetricCardComponent, ClickWhatsAppService, os contratos de configuração/resumo/ocorrências, filtros, permissões e testes do domínio. Não foi encontrado AGENTS.md no workspace. Aplicada a orientação de frontend-design para preservar a identidade visual existente.

MetricCardComponent já é o indicador utilizado nos dashboards do ClickManager e aceita apresentação compacta. Foi reutilizado sem alteração. O seletor usa MatButtonToggleGroup, com seleção acessível e estilo Material do projeto. PageCard, aviso de desativação, tooltips, filtros de data existentes, DataTable e os painéis de investigação/detalhe também foram reutilizados.

## Estrutura final

A página mantém o PageCard com título ClickWhatsApp e subtítulo “Acompanhe a comunicação da sua empresa.” O cabeçalho oferece somente Atualizar dados, por ícone com tooltip e nome acessível. Em mobile usa o slot contextual existente `page-mobile-header-actions`, ao lado do título, evitando uma linha de ações separada.

A situação ocupa um bloco compacto com habilitação empresarial, estado da conexão e preferência. A conexão recebe destaque textual e confirmação ABERTA é apresentada como WhatsApp conectado. DESCONHECIDO e falha de verificação são Conexão não confirmada. Não há inferência de disponibilidade do dispatcher a partir da preferência. A desativação reutiliza o aviso do domínio. A aplicação bloqueada é apresentada explicitamente.

Desempenho dos envios apresenta quatro MetricCards compactos, com Mensagens, Aceitas, Entregues e Lidas. São os valores retornados pela API, sem somas, exclusão entre categorias ou transformação das métricas em gráfico. A legenda preserva sua natureza cumulativa.

Situação operacional tem menor destaque e apresenta Falhas, Na fila agora e Incertas agora. Falhas são do período, podendo se sobrepor às confirmações. Fila e incertezas são atuais no escopo autorizado e podem incluir mensagens fora do período. Textos e tooltips comunicam essa diferença. Zero permanece neutro. Falhas históricas não criam um alerta de incidente ativo. Incertezas atuais geram alerta contextual com acesso à investigação.

O card vazio de ocorrências foi removido. Consultar ocorrências permanece como ação discreta na região operacional, inclusive com contagem zero, preservando a única entrada que antes existia nessa página. A lista é carregada somente por ação explícita e mantém paginação, detalhes e investigação do Recorte 9. A ausência de registros é exibida apenas se a pessoa solicitar a consulta.

## Navegação e consultas removidas

Foram removidos da Visão geral Últimas mensagens, tabela, expansão/paginação do histórico e botões de detalhe desse card. O frontend deixou de consultar `/api/clickwhatsapp/mensagens` para preenchê-lo. Também foram removidos os campos, métodos e estilos específicos desse histórico local.

Histórico, pesquisa, conversas, compositor e detalhes continuam em Mensagens, acessível por Ver mensagens e pelo menu. Configurações continua acessível conforme as ações efetivas. Não há conectar, desconectar, habilitar, pausar ou formulário de automação na Visão geral.

Nova mensagem e o FAB foram retirados dessa área. Uma solicitação de envio pendente mantém um aviso que direciona a Mensagens, preservando sua recuperação pelo store existente. Métodos compartilhados de envio e detalhes, usados pelas demais áreas, foram preservados. Nenhum endpoint de histórico foi removido ou alterado.

## Contratos e autorização

O service HTTP existente permanece intacto:

- GET `/api/clickwhatsapp/configuracao` consulta situação e ações efetivas.
- GET `/api/clickwhatsapp/resumo` recebe início, fim e `America/Sao_Paulo`.
- GET `/api/clickwhatsapp/ocorrencias` é solicitado somente ao abrir ou atualizar a consulta explícita.
- Detalhe da ocorrência e investigação continuam utilizando seus contratos anteriores, com autorização do backend e sem novas ações de sucesso forçado ou reenvio.

A consulta do resumo e das ocorrências exige `acoesPermitidas.consultarHistorico`. O acesso às configurações usa a projeção existente de ações permitidas. Não há inferência por role, proprietário ou TipoEmpresa. Concessão empresarial inativa mantém as consultas que o backend autorizar. Sem permissão, indicadores e investigações não são solicitados ou apresentados.

## Períodos, atualização e concorrência

Hoje, Últimos 7 dias, Últimos 30 dias e Personalizar usam um seletor compacto Material. A seleção atual fica evidente. Personalizar abre o formulário existente, mantendo Brasília, fim exclusivo, intervalo positivo e máximo de 93 dias. Cancelar conserva a seleção anterior. A escolha personalizada só passa a ser ativa ao aplicar um período válido.

A alteração solicita somente resumo. A configuração e a investigação não são reiniciadas pela troca do período. A consulta anterior é cancelada e um contador de versão/contexto impede aplicar respostas antigas. Troca de usuário/empresa e destruição da página também cancelam a consulta e limpam os dados.

Atualizar dados bloqueia duplicidade, preserva o intervalo selecionado, recarrega configuração e resumo autorizados e atualiza a lista de ocorrências somente se ela estiver aberta. Não há envio ou mutação técnica nessa ação. A leitura periódica moderada de configuração existente foi mantida, sem adicionar polling de resumo ou reconciliação remota.

O loading de indicadores é localizado. Enquanto não há resultado, nenhum número fictício é apresentado. Erro temporário de resumo preserva os valores e o período do último resultado, com aviso e recuperação. Não converte falha em zero. Ausência de mensagens é uma resposta válida com zero e texto correspondente.

Uma falha temporária de configuração preserva a configuração anterior na Visão geral, marca a conexão como não confirmada e permite manter o resumo autorizado. Erros de autenticação/acesso/conexão inacessível limpam o resultado anterior. Sem configuração inicial autorizada, o frontend não antecipa consulta do resumo. Falha de resumo não impede a exibição da situação da conexão. O comportamento das demais áreas permanece o anterior.

## Arquivos e reutilização

Alterados somente `clickwhatsapp.page.ts`, `clickwhatsapp.page.html`, `clickwhatsapp.page.scss`, `clickwhatsapp.page.spec.ts` e este relatório. Não foi criado serviço duplicado nem componente por indicador. Os arquivos de TypeScript, template, estilos e testes permanecem separados.

SectionCard deixou de ser necessário no template dessa página. PageCard e MetricCard continuam como componentes compartilhados. A investigação reutiliza DataTable, painel lateral e ConfirmDialog existentes. Componentes compartilhados, navegação inferior e estilos globais não foram alterados.

## Verificação

Na raiz do app, usando Node 22.22.3:

```sh
NODE_OPTIONS=--max-old-space-size=4096 NG_BUILD_MAX_WORKERS=1 node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless --include='src/app/pages/clickwhatsapp/**/*.spec.ts'
NODE_OPTIONS=--max-old-space-size=4096 NG_BUILD_MAX_WORKERS=1 node node_modules/@angular/cli/bin/ng.js build --configuration production --output-path=/private/tmp/cw-visao-build-final
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
git diff --check
```

Resultado da suíte focada e regressão do ClickWhatsApp: **105 testes aprovados**, com 16 casos novos. Testes que descreviam a tabela e o histórico antigo foram atualizados para as responsabilidades solicitadas. Permanecem as verificações de envio idempotente, configuração, QR, templates e investigação nas áreas correspondentes. Nenhum teste de outro módulo foi modificado.

Cobertos estado habilitado/desativado, ABERTA/DESCONHECIDO/FECHADA, preferência ativa/pausada, sete valores do backend, zero, cumulatividade, semântica temporal, incertezas e falhas, períodos rápidos/customizados, validação de 93 dias, cancelamento de resposta anterior, atualização sem duplicidade e mantendo período, erros isolados com preservação de dados, loading sem números fictícios, ocorrências e investigação, navegação, ausência de histórico/FAB/Nova mensagem e permissões restritas.

O teste do seletor Material real verifica que Personalizar não substitui a seleção antes de aplicar e que Cancelar mantém o período anterior. A navegação acessível continua em um radiogroup do Material.

Build de produção, TypeScript e diff check aprovados. O build mantém avisos em arquivos fora do escopo, como imports/templates existentes, deprecações Sass e dependências CommonJS. A compilação estrita identificou uma referência de template que foi corrigida para o export do MatButtonToggleGroup antes da validação final.

## Evidências visuais e limites

A conferência usa Chromium e dois servidores estáticos locais. O build anterior corresponde à base `13c965c`. Todas as APIs são interceptadas e usam dados sintéticos. Capturas antes/depois permitem comparar a mesma assinatura, identidade e configuração simuladas.

Evidências em `/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-visao-geral-ux/`.

A validação inclui 1440, 1024, 820, 390 e 360 px. São exercitados conectado, desconhecido, desativado, preferência pausada, valores/zeros, incertezas e ausência de alertas, período personalizado, atualização, loading, falhas de resumo/configuração e restrição de acesso. O navegador verifica ausência de overflow horizontal e compara texto, posição, dimensões, fonte, padding e fundo do aviso de assinatura antes/depois, sem diferença. A captura dos indicadores operacionais e da investigação também foi conferida ao rolar em 390 e 360 px. Falhas isoladas com valores previamente consultados preservam os números e foram exercitadas no navegador. Requisições do histórico antigo são verificadas como ausentes e quaisquer mutações são rejeitadas no teste da página nova. `verificacoes.json` registra as comparações e chamadas simuladas.

- [Antes, desktop](/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-visao-geral-ux/antes-1440.png).
- [Depois, desktop](/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-visao-geral-ux/conectado-1440.png).
- [Situação operacional mobile](/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-visao-geral-ux/operacional-mobile-360.png).
- [Depois, mobile](/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-visao-geral-ux/conectado-390.png).

Não foi executada homologação com backend ou provedor reais. Teclado físico/leitor de tela em Android/iOS permanece pendente. Os controles Material preservam sua navegação e acessibilidade existentes.

## Preservação expressa

Nenhuma funcionalidade existente foi perdida em suas áreas apropriadas. Histórico permanece acessível em Mensagens. Ocorrências e Configurações continuam acessíveis. Nenhuma mensagem real foi enviada. Nenhuma chamada remota à Evolution foi executada. Backend, banco, migrations, `.env`, infraestrutura, workers, automações, templates, máquina de estados, política de INCERTA e cobrança não foram alterados. O aviso de validade permaneceu absolutamente intacto. Sem deploy, merge ou push.
