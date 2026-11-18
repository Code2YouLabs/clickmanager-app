# UX das automações de Pedidos do ClickWhatsApp

## Base e escopo

Branch `feature/clickwhatsapp-automacoes-ux`, criada a partir de `c4c5b88` da branch `feature/clickwhatsapp-conversas-ux`. A árvore estava limpa. Alterações restritas ao componente de automações, seus testes e este relatório, no `clickmanager-app`. Sem push ou merge.

## Auditoria dos contratos existentes

A rota `/page/clickwhatsapp/automacoes` é apresentada por `ClickWhatsAppPage`, que mantém o PageCard, o cabeçalho e a autorização `configurarAutomacoes`. `AutomacoesPedidoComponent` já reunia a lista e o editor via template. Não foi criado outro painel nem outro serviço HTTP.

O componente usa HttpClient com SILENT_REQUEST e a base `/api/clickwhatsapp/automacoes/pedidos`:

- GET retorna `PainelAutomacoes`: itens, variáveis permitidas, ocorrências recentes e `podeAtivar`.
- PUT `/{tipo}` recebe `ativa`, `modelo` e `revisao`. A resposta confirmada atualiza lista, contador, original e rascunho. Conflitos 409 preservam o rascunho e não repetem gravações.
- POST `/previa` recebe somente `modelo` e retorna `texto` demonstrativo.

Os DTOs publicados permanecem os mesmos. A leitura do código existente de `AutomacaoPedidoService`, do controller e de `TemplatePedido` confirmou que `/previa` valida acesso e renderiza valores demonstrativos, sem enfileirar, ativar ou enviar mensagens. O frontend continua dependendo dessa API para resolver placeholders.

A identidade é acompanhada por AuthService/contextoEnvio; troca de empresa ou ator cancela consultas, prévias e temporizadores, fecha o painel e limpa os dados. Autorizações empresariais e comerciais continuam no backend. `podeAtivar` impede habilitação quando indisponível, permitindo desativar uma automação já ativa. Salvar uma automação ativa mantém a verificação anterior desse contrato.

## Apresentação e reutilização

Removido o SectionCard interno “Configuração por acontecimento”. Preservados PageCard, título, subtítulo e a estrutura da página. As seis linhas usam separadores, descrições curtas, estado textual Ativa/Inativa e Editar. A descrição de entrega menciona entrega ou conclusão confirmada, sem equiparar separação a produção ou saída física a entrega. Nenhum critério de disparo foi alterado.

O contador deriva exclusivamente dos estados confirmados pela API. A atualização usa botão Material com ícone, tooltip e nome acessível “Atualizar automações”. Carregamento bloqueia repetição e preserva os dados anteriores em caso de erro. Com editor aberto, atualização não substitui o rascunho.

Sem ocorrências há uma linha compacta. Com registros permanecem evento, pedido, origem, horário, fase, confirmação, motivo seguro, link autorizado para mensagem e aviso de que enfileirar não confirma entrega. Não há reenvio.

Reutilizados: `openMobileSidePanel`, classes globais de corpo/cabeçalho/rodapé do painel, ConfirmDialog, Toastr e Material (switch, botões, tooltip, textarea, form-field e progress-bar). Os estilos novos têm encapsulamento do próprio componente. Não foram modificados estilos globais ou componentes compartilhados.

## Edição, ativação e concorrência

O painel tem 560 px no desktop e largura total no breakpoint móvel existente de 760 px. O rodapé fixo mantém Cancelar e Salvar. Nenhuma alteração de largura do padrão global.

O switch “Enviar automaticamente” preserva a confirmação existente. `disableToggleValue` é configurado somente neste componente: clicar não muda o estado definitivo antes de a API confirmar. Erro ou cancelamento mantém estado, revisão e contador anteriores. Alterações de texto bloqueiam o switch e mostram orientação para salvar ou descartar primeiro.

Salvar texto mantém a ativação original e usa a revisão original. Ativar/desativar utiliza o texto confirmado. Confirmação e gravação impedem duplicidade e edição concorrente. Salvar é desabilitado sem alteração, com texto vazio, acima de 2000 caracteres ou com placeholders inválidos. O limite de bytes continua sendo validado pelo backend; uma recusa preserva o formulário. Não foi criada uma regra diferente de tamanho de mensagem.

Cancelar, Escape, backdrop e o guard de navegação existente preservam a confirmação de descarte. Fechar ou trocar de contexto cancela a prévia. O rascunho permanece somente em memória.

## Variáveis e prévia

As ações Nome do cliente, Número do pedido e Previsão de entrega usam somente a interseção entre variáveis retornadas pelo backend e os placeholders conhecidos. Não há variáveis inventadas. A API atual fornece a mesma lista para os seis eventos.

A inserção substitui a seleção ou usa o cursor, preserva o restante, devolve foco ao textarea, posiciona o cursor após o token e atualiza contador/dirty. O limite de 2000 considera também o texto selecionado que será substituído. Uma tentativa inválida exibe aviso discreto sem modificar o rascunho.

A prévia tem fundo neutro, bolha alinhada à direita, quebras de linha e identificação Demonstrativa. Não inclui avatar, horário ou ACK fictício.

O debounce é de 500 ms. Digitar novamente cancela o timer ou a requisição anterior. A versão da prévia, o contexto e o texto capturado impedem aplicar resposta obsoleta. A prévia tem carregamento e erro separados do salvamento: o usuário continua digitando durante sua geração. Em falha, texto e prévia anterior permanecem, com indicação de desatualização e Tentar novamente. A resolução usa somente `/previa`, nunca endpoints de envio.

## Verificação

Comandos executados na raiz do app com Node 22.22.3:

```sh
NODE_OPTIONS=--max-old-space-size=4096 NG_BUILD_MAX_WORKERS=1 node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless --include='src/app/pages/clickwhatsapp/**/*.spec.ts'
NODE_OPTIONS=--max-old-space-size=4096 NG_BUILD_MAX_WORKERS=1 node node_modules/@angular/cli/bin/ng.js build --configuration production --output-path=/private/tmp/cw-automacoes-ux-build
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
git diff --check
```

Os testes existentes foram mantidos; asserções de apresentação foram atualizadas para Inativa e erro específico da prévia. Foi adicionada uma suíte com painel Material real, sem substituir o editor por um fake.

Resultado: 63 testes do ClickWhatsApp aprovados. Incluem seis eventos, contador, atualização sem duplicidade e erro preservando dados, permissões, ocorrências, estado confirmado do switch, falha de ativação, dirty, salvar sem ativar, erro de gravação sem perda/duplicidade, cursor no início/meio/fim, seleção, foco, limite, variável proibida, validação, debounce, cancelamento de resposta anterior, quebras de linha, falha/repetição de prévia, descarte por Cancelar/Escape/backdrop e troca de empresa.

TypeScript e diff check aprovados. Build de produção aprovado com avisos fora dos arquivos alterados: deprecações Sass, diagnósticos de templates/imports já existentes e dependências CommonJS. Nenhum aviso refere-se ao componente de automações. As tentativas de build no sandbox encerraram com código 134 sem diagnóstico; a execução local autorizada, com Node 22 e um worker, concluiu normalmente. Nenhuma configuração do projeto foi alterada para contornar as verificações.

## Evidências e limites

A conferência visual usa um servidor estático temporário e Chromium com todas as APIs interceptadas, identidade e dados sintéticos. Fontes e assets visuais são os existentes. Não utiliza conta, credencial ou número reais.

As capturas e os resultados da conferência ficam em:

`/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-automacoes-ux/`

Aprovadas as larguras 1440, 1024, 820, 390 e 360 px, sem overflow horizontal. Em cada largura foram exercitados lista, estados ativa/inativa, abertura do painel, ativação após confirmação, edição, variável, prévia atualizada, falha de prévia com rascunho preservado, repetição, confirmação de salvamento e descarte. O teste comparou texto, posição, dimensões, fonte, padding e fundo do aviso de validade antes e depois do fluxo em cada largura, sem diferença.

Também foi conferido o editor a 360 × 600: rodapé dentro do viewport, nenhum overflow, acionamento de chip por Enter e retorno do foco ao textarea. Registros existentes e acesso restrito foram conferidos com mocks específicos. `verificacoes.json` registra as chamadas simuladas e a ausência de rotas proibidas.

Exemplos de evidências:

- [Listagem desktop](/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-automacoes-ux/lista-1440.png).
- [Editor desktop](/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-automacoes-ux/editor-1440.png).
- [Editor mobile](/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-automacoes-ux/editor-390.png).
- [Viewport reduzido e teclado](/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-automacoes-ux/viewport-reduzido-teclado-360.png).

A validação física do teclado Android/iOS não foi executada; viewport reduzido não substitui aparelho real. A homologação contra backend real não faz parte desta refatoração.

## Preservação

Backend não alterado. Automações reais não executadas. Nenhuma mensagem enviada. Nenhuma chamada remota à Evolution. Nenhuma regra comercial alterada. Sem alterações em banco, migrations, workers, eventos, cobrança, assinatura, `.env` ou produção. Aviso de validade completamente preservado: nenhum arquivo do aviso, serviço ou estilo global foi modificado.
