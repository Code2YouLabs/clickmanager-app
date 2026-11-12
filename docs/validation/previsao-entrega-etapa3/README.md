# Previsão de entrega — central de Notificações, etapa 3

Branch: `feature/previsao-entrega-pedido-etapa-3`, a partir de `edeea7b`. Operação, migration 143, contratos e política completa: repositório irmão, `clickmanager-backend/docs/domains/pedido-previsao-entrega-alertas.md`.

## Integração visual

A central, contador e navegação anteriores foram reutilizados. O modelo de mensagem acrescenta `invalidadaEm`. Mensagens encerradas continuam consultáveis como histórico autorizado, com texto explícito, sem badge Nova, sem ação de abrir e sem consumir o contador de avisos acionáveis nos menus desktop/mobile. O histórico de leitura não é inventado. A prioridade usa os níveis/cores/textos existentes da central.

Ao abrir o link relacionado, a central reconsulta o detalhe e usa apenas o destino atual ainda acionável/autorizado retornado pelo backend. Revogação/indisponibilidade remove conteúdo selecionado e contagem em cache. O servidor filtra autorização antes da contagem e paginação; não se trata de esconder mensagens apenas no navegador.

Novo destino `/page/comercial/pedidos/:id`: reutiliza o editor/detalhe existente, com PEDIDOS_VER e capability PEDIDOS, sem GRAFICA. Voltar retorna à aba Notificações existente na conta do usuário. As rotas gráficas anteriores permanecem disponíveis nos seus fluxos. Não se adicionou uma segunda central ou uma nova política de concessão de permissões.

## Testes e builds

- Build final: `npm run build:prod`, aprovado, com avisos de Sass/CommonJS já existentes.
- Rodada focada final: **72 testes aprovados**, ChromeHeadless, configuração `application-theme`: central, guards do destino, revalidação antes de abrir, invalidação, limpeza de conteúdo revogado, contadores dos menus, shell e editor/retorno à central.
- Baseline comercial, antes das mudanças da etapa 3: **449 testes, 448 aprovados e uma falha assíncrona** `NG0205: Injector has already been destroyed`, pilha `MatAutocompleteTrigger._attachOverlay`/`_openPanelInternal`. Runner atribuiu a `ComercialListComponent Kanban mobile escolhe a etapa e reutiliza validação, PATCH e checkpoint do arraste`.
- Rodada ampliada antes do último ajuste dos contadores: **484 testes, 483 aprovados e a mesma falha assíncrona**, então atribuída a `Detalhes do Pedido mobile: organização e movimentação mantém financeiro e painel de pagamentos do pedido persistido`. Uma rodada intermediária passou 483/483 e outra perdeu conexão com Chrome após 421 testes; o caráter intermitente não foi declarado resolvido. Os dois testes novos do último ajuste dos contadores estão na rodada focada de 72 aprovada.
- Backend: rodada ampliada com 101 testes, 99 aprovados e duas falhas arquiteturais preexistentes, sem erros/ignorados; 22 testes PostgreSQL efetivamente executados. As falhas são `GlobalArchitectureTest.modulosNaoAcessamInfrastructureOuRepositoriesDeOutrosModulos` (8 violações) e `GlobalArchitectureTest.segmentosNaoAcessamInfrastructureOuRepositoriesDeModulosEPlataforma` (21). Mesmas arestas da baseline, sem novas dependências. Resultado não representa suíte inteiramente verde.
- `git diff --check` aprovado nos dois repositórios. Sem alteração de allowlists ou de componentes de autocomplete fora do escopo.

```sh
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/pages/notificacoes/*.spec.ts' --include='src/app/layouts/full/vertical/header/header.component.spec.ts' --include='src/app/layouts/full/full.component.spec.ts' --include='src/app/pages/grafica/comercial/comercial-editor.component.spec.ts'
npm run build:prod
```

## Evidência visual

Chrome real com build local de produção, viewports **1440×1000** e **390×1000**, navegador em Pacific/Honolulu. APIs foram interceptadas com dados fictícios; perfil não proprietário com somente PEDIDOS_VER e capability PEDIDOS, sem GRAFICA e sem NOTIFICACAO_VER. Não houve acesso à empresa real.

Capturas neste diretório: central desktop/mobile, detalhe de alerta mobile, histórico invalidado nas duas larguras e Pedido aberto pelo alerta nas duas larguras. Foram conferidos texto, prioridade, data/hora de previsão em America/Sao_Paulo, ausência de ação em aviso encerrado e abertura do Pedido correto sem GRAFICA. `medidas.json` registra ausência de overflow da página e de ação no aviso invalidado.

Mantidos shell, cores de prioridade, componentes e espaçamentos existentes. A verificação não representa redesign ou aprovação global do shell por checklist de design. Não houve teste em aparelho físico nem auditoria com leitor de tela.

## Homologação e disponibilização

A integração técnica backend foi executada com o serviço canônico real de Pedido, central real, proxies transacionais reais e PostgreSQL descartável, usando Clock e autorização controlados. A documentação operacional contém os passos, os testes e os limites exatos. Isso é distinto das capturas com APIs simuladas: **não foi executada uma sessão ponta a ponta de navegador com login real no backend completo**.

Antes de disponibilizar: ensaiar essa sessão e o changelog no ambiente alvo, revisar perfis customizados, atualizar todas as instâncias/leitores antes de ativar o worker e dimensionar os lotes. Worker ativo por padrão após o ajuste validado localmente; use `PEDIDO_ALERTAS_ENABLED=false` durante implantação gradual ou para suspender emissões. Não houve push, merge, deploy ou envio externo.


## Refinamentos de interface posteriores

- Lista e Kanban recebem faixa lateral de 5px conforme a situação enviada pelo backend. Cards do Kanban também usam contorno suave; ícones, textos, fundo claro, estado neutro e foco permanecem. O mesmo acento é aplicado à listagem mobile. Os componentes genéricos expõem decoração opcional, sem interpretar regras de Pedido.
- Configuração de Pedidos segue o padrão de Servidor de E-mail: PageCard, SectionCard, InputNumerico, InputOptions, PageFormState e MobileTotalBar. Cancelar restaura a base carregada; a API continua recebendo inteiros, inclusive quando o input compartilhado emite texto. Limites e retry preservados.
- Validação: 122 testes de tabela/Kanban/listagem aprovados; 65 testes de configuração/inputs/padrões mobile aprovados; build de produção aprovado e conferência visual desktop/mobile com dados fictícios.
