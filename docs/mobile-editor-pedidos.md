# Editor de Pedidos mobile — piloto de criação

## Escopo e base

Implementação na branch `feature/mobile-fundacao-listagem-pedidos`, sobre `8ba6903`, preservando a fundação e os commits das listagens. Ativação somente quando o breakpoint global é mobile (até 760 px), `tipo === 'pedidos'` e não há ID de registro. Rota piloto: `/page/grafica/comercial/pedidos/novo`.

Não há outro editor ou wizard de preenchimento. FormGroups, cálculos, composição comercial, persistência, dialogs de configuração e regras de conversão permanecem no `ComercialEditorComponent` existente.

## Organização do piloto

| Grupo | Estado inicial | Apresentação e operações |
|---|---|---|
| Cliente | Aberto | `ClienteSelectorCardComponent`, busca e confirmação existentes, Novo cliente e troca. O cabeçalho resume o nome confirmado. Dados cadastrais continuam consultáveis com alinhamento mais compacto. |
| Itens do pedido | Aberto | `ItensPedidoSectionComponent`, Adicionar produto como ação principal e Busca rápida como secundária. Mantém configuração, serviços, acabamentos, quantidades, valores e remoção. Cabeçalho informa a quantidade de linhas adicionadas. |
| Observações | Recolhido | Dois `ObservacoesCardComponent`, distinguindo texto para cliente e texto interno. Mantém os botões de adicionar, editar e confirmar. Sem alertas vazios repetidos. |
| Financeiro e pagamentos | Recolhido | Ajustes em duas colunas, subtotal, pago e saldo. Cabeçalho informa pago/saldo mesmo recolhido. Pagamentos ficam dentro do mesmo grupo, mantendo forma, valor, histórico e cancelamento. |
| Revisão e conclusão | Aberto | Atendente real em linha compacta, orientação contextual para pendências e Cancelar secundário. Total e Salvar ficam no rodapé. |

O estado de cada grupo é independente. Recolher aplica `hidden` e `inert` ao corpo, **sem destruir os componentes e controles**. Reabrir preserva dados e a edição de observações. Não há avanço obrigatório, confirmação nova ou recolhimento automático após preencher. As seções também não são recolhidas quando o tutorial termina.

O subtotal dos itens deixa de ser repetido em uma caixa interna; continua no resumo financeiro. O total é apresentado no rodapé, sem repetir a linha Total no grupo Financeiro. Pago/saldo não são repetidos no histórico de pagamentos. Nenhum cálculo foi reimplementado.

## Contratos compartilhados

- **SectionCard:** `mobileCollapsible`, `mobileExpanded`, `mobileSummary` e `mobileExpandedChange`, todos opt-in. O botão possui `aria-expanded`, `aria-controls` e área mínima de 44 px. Usa `mobilePlain` existente para retirar a moldura interna. Desktop continua com o cabeçalho e corpo originais, mesmo com o grupo recolhido no mobile.
- **Cliente e Itens:** encaminham as opções mobile ao seu SectionCard. Demais consumidores permanecem com os valores padrão. A seleção automática já configurada no editor (`salvarAoSelecionar=true`) foi preservada; não foi introduzida nova confirmação automática. Somente no piloto, os botões do seletor recebem `type="button"` para não submeter o formulário principal.
- **Observações:** `mobileCompact` opt-in usa o SectionCard sem moldura e suprime o alerta vazio. Cada observação mantém seu componente, FormControl e confirmação.
- **Rodapé global:** `MobileTotalBarComponent`, o mesmo do SmartCalc, utiliza a aparência compartilhada `compact`. O contrato experimental `PageCard.mobileStickyFooter` foi removido. No piloto o PageCard não renderiza ações finais; a barra global fornece o único submit associado ao formulário, preservando o handler e alvo do tutorial. Ver [contrato da barra global](mobile-total-bar.md).
- **InputMoeda:** `inputMode` opcional permite teclado decimal no piloto sem alterar máscara, parsing, validação ou valor. Padrão sem atributo adicional, preservando os consumidores existentes.

## Rodapé e validação

Voltar usa o slot contextual existente do PageCard. Há um único Salvar, vinculado a `comercial-editor-form`, com os handlers originais. Cancelar permanece na revisão e chama o comando existente. O disabled por ausência de cliente/itens e o estado de salvamento são preservados; não se exige pagamento para criar o pedido.

O rodapé global fica acima de `--mobile-bottom-nav-height`, respeita safe areas e acompanha a área visível do teclado por `visualViewport`. `ResizeObserver` mede sua altura para reservar espaço de rolagem fora da superfície do cartão. As opções `reserveSpace` e `avoidKeyboard` pertencem à barra global, não ao PageCard. Detalhes apresenta uma revisão consultiva de cliente, quantidade de itens e valores reais, usando o mesmo puxador/expansão do SmartCalc. Não há formulário financeiro duplicado. Não houve alteração no shell ou navegação inferior.

Como Salvar inválido permanece desabilitado, **Revisar pendências** oferece uma ação explícita: abre Cliente ou Itens conforme as regras existentes; direciona o foco à busca ou Adicionar produto e mostra a mensagem correspondente. Uma tentativa de submit também revela a pendência. Para ajustes financeiros inválidos, abre Financeiro, marca os controles existentes como tocados e direciona o foco. Pagamentos incompletos não se tornam uma obrigação de conclusão. Erros de persistência continuam com o tratamento original.

## Tutorial e outros fluxos

Alvos, handlers, checkpoints e persistência do Primeiro Pedido permanecem os mesmos. Quando o alvo atual está em um grupo recolhido, o editor abre o grupo e solicita `TutorialService.refreshTarget(targetId)` depois da atualização do conteúdo. Essa entrada genérica apenas notifica a visibilidade/medida de um alvo já registrado; não avança o tutorial nem registra progresso.

Pedidos existentes continuam com fluxo/status, permissões e persistência individual de cliente, observações, ajustes e pagamentos. Orçamentos mantêm validade, status, documentos, aprovação/conversão e leitura conforme seu estado. Rascunhos mantêm composição e ações de conversão. Esses contextos não ativam o novo layout. Desktop preserva colunas, cards, resumo sticky, controles e ações existentes.

## Arquivos modificados

Relativos à raiz do repositório; as extensões entre chaves representam os arquivos reais alterados:

- `src/app/pages/grafica/comercial/comercial-editor.component.{ts,html,scss}`.
- `src/app/pages/grafica/comercial/comercial-editor-mobile.spec.ts` (novo).
- `src/app/components/page-card/page-card.component.{ts,html,scss,spec.ts}`.
- `src/app/components/section-card/section-card.component.{ts,html,scss,spec.ts}`.
- `src/app/components/cliente-selector-card/cliente-selector-card.component.{ts,html,scss}`.
- `src/app/components/itens-pedido-section/itens-pedido-section.component.{ts,html,scss}`.
- `src/app/components/observacoes-card/observacoes-card.component.{ts,html}`.
- `src/app/components/inputs/input-moeda/input-moeda.component.{ts,html}`.
- `src/app/shared/tutorial/tutorial.service.{ts,spec.ts}`.
- `docs/mobile-editor-pedidos.md` (este relatório).

## Validação original do piloto e pendências

- Baseline antes da implementação: **72/72** testes de editor, Primeiro Pedido, PageCard, SectionCard e Itens aprovados.
- Testes direcionados finais: **86/86** aprovados, incluindo formulário nativo, integração mobile, preservação de campos, cliente, itens, observações, financeiro/pagamentos, validação/foco, submit único, Cancelar, loading, teclado e tutorial.
- Suíte completa final: **1.148/1.148 aprovados**, exit 0, incluindo a retomada de alvo já registrado após revelar a seção e regressões de Orçamentos, Rascunhos e listagens. A falha conhecida do onboarding em 360 px não se reproduziu; não foi corrigida nesta entrega.
- `npm run build:prod`: **sucesso**, exit 0, com os mesmos **38 avisos existentes**. `git diff --check` sem problemas.
- Não foram executados testes visuais nem produzidos screenshots. Validação manual em 360/390/430 px, teclado real, safe areas, fonte ampliada e navegação do tutorial permanece com o responsável pelo projeto.
- A composição nova fica restrita à criação mobile de Pedidos; eventual adoção nos detalhes, Orçamentos ou Rascunhos é futura. Estado de apresentação dos grupos não é persistido ao sair da rota.

Sem alterações em endpoints, serviços comerciais, DTOs, cálculos financeiros, preços, regras de recebimento ou progresso do tutorial. Sem push, PR ou merge.

A troca posterior do rodapé e sua validação estão registradas em [MobileTotalBar global](mobile-total-bar.md).
