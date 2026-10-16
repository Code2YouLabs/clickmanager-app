# Pedidos mobile: título e ação flutuante

Refinamento na branch `feature/mobile-fundacao-listagem-pedidos`. Somente Pedidos adota as novas opções; Orçamentos, Rascunhos e os consumidores antigos mantêm suas apresentações.

## Contratos reutilizáveis

- `PageCard.mobileTitleOnly` (padrão `false`): encaminha `CardHeader.titleOnly` somente até 760 px. O cabeçalho exibe apenas o título, sem subtítulo ou ações; a linha divisória permanece conforme a configuração existente. No desktop os valores originais continuam sendo apresentados.
- `PageCard.mobilePrimaryAction` (padrão `null`): recebe `label`, `icon`, `disabled` e `tutorialTarget`; emite `mobilePrimaryActionClick`. O consumidor continua responsável pela autorização e pela ação real. `null` omite a ação; saving/bloqueios impedem a emissão.
- `MobileFabAction.placement='page'`: variante opt-in do componente existente. Sua apresentação legada permanece como padrão. Foram acrescentados `disabled` e `tutorialTarget`, aplicado no botão real.

Em Pedidos, o PageCard recebe o título já existente e `{ label: configuracao.novo, tutorialTarget: primeiroPedidoTargets.novo }`. O FAB compacto usa `+`, área de toque de 56 px e nome acessível **Novo pedido**, ocupando menos espaço sobre o conteúdo que uma ação estendida. O clique chama o mesmo `novo()` e a mesma rota. Não foi acrescentada nem removida regra de permissão; guards e permissões configuradas permanecem os existentes.

O botão do cabeçalho e o parágrafo explicativo deixam de ser renderizados somente em Pedidos mobile. O alcance da pesquisa continua expresso no campo: **Buscar nesta página** ou **Buscar nos cards carregados**. Busca, filtros, toggle, tabela/lista, Kanban, paginação e estados não foram modificados. No desktop o subtítulo, a ação interna e o parágrafo continuam presentes.

## Posicionamento e conteúdo

O FAB é fixo à direita, com afastamento mínimo de 16 px e respeito à safe area lateral. A posição inferior usa a variável herdada `--mobile-bottom-nav-height` mais 16 px. Na ausência dela, considera 60 px mais `safe-area-inset-bottom`. O botão fica acima da navegação inferior e usa o nível de sobreposição já existente do MobileFabAction, abaixo dos overlays globais.

O PageCard reserva espaço inferior para altura do botão e margens, descontando `--mobile-safe-bottom-space` já fornecido pelo shell. Assim, o conteúdo final pode ser rolado acima do FAB sem duplicar o espaçamento que o shell já garante. O shell e a navegação inferior não foram alterados. O FAB permanece em Lista e Kanban, e não é renderizado no desktop.

O alvo `primeiroPedidoTargets.novo` é transferido para o botão flutuante no mobile. Não há dois botões ativos com o mesmo alvo. Regras de progresso e retomada do tutorial permanecem intactas.

## Arquivos modificados

- `src/app/components/page-card/page-card.component.{ts,html,scss,spec.ts}`
- `src/app/components/card-header/card-header.component.{ts,html}`
- `src/app/components/mobile-fab-action/mobile-fab-action.component.{ts,html,scss,spec.ts}`
- `src/app/pages/grafica/comercial/comercial-list.component.{html,spec.ts}`
- Este documento e o link de atualização no relatório da fundação.

## Validação

- Testes focados: `npm test -- --watch=false --browsers=ChromeHeadless`, com `--include` para PageCard, CardHeader, MobileFabAction e Comercial: **152 passaram**. Cobrem título/subtítulo, projeção legada, bloqueio/visibilidade da ação, ausência do FAB no desktop, rota e alvo do tutorial em Lista e Kanban, além dos contratos existentes de permissão do header e das rotas.
- Suíte completa após o ajuste de compatibilidade: **1.064 passaram de 1.065**; exit 1 somente pela falha preexistente do onboarding em 360 px, já registrada no baseline: “Narrativa do onboarding acomoda stepper, árvore e ações em 360px sem rolagem horizontal” (`Expected 303 to be less than or equal 298`). Nenhuma falha nova.
- `npm run build:prod`: **exit 0**, 38 avisos existentes e nenhum erro. `git diff --check`: sem erros.
- Logs completos: `/tmp/clickmanager-title-fab-tests.log`, `/tmp/clickmanager-title-fab-full-tests.log` e `/tmp/clickmanager-title-fab-build.log`.
- Compatibilidade com os consumidores que constroem `new PageCardComponent()` preservada por dependência opcional; a inscrição do viewport é encerrada ao destruir o componente.
- Nenhum teste visual ou screenshot produzido; avaliação visual final pelo responsável pelo projeto.

## Evolução global posterior

O cabeçalho mínimo passou a ser o padrão global do PageCard, e a ação das três listagens do Comercial passou ao contrato único `primaryAction`. As decisões específicas do piloto acima registram a etapa anterior. Consulte o [padrão global, compatibilidade e exceções](pagecard-mobile-global.md).
